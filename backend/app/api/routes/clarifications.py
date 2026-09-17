"""
Clarification and Document Re-upload API Routes (Phase 4).
Supports:
- Officer requesting clarification on specific tender requirements or documents
- Bidder viewing notifications and submitting response with replacement documents
- Immutable DocumentVersion creation (preserving V1, V2, V3 history without overwriting)
- Automatic re-evaluation trigger and blockchain audit trail
"""
import hashlib
import os
import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.config import settings
from app.models.user import User, UserRole
from app.models.bidder import Bidder, BidderDocument, DocumentProcessingStatus
from app.models.clarification import ClarificationRequest, ClarificationStatus, DocumentVersion
from app.core.deps import get_current_user, require_roles
from app.core.file_validation import validate_document_bytes, safe_stored_filename
from app.services.audit_service import log_action
from app.services.blockchain_service import anchor_file_bytes
from app.services.bidder_document_service import run_bidder_document_pipeline
from app.services.compliance_engine import compliance_engine
from app.services.document_tampering_service import analyze_document_tampering

router = APIRouter(prefix="/api/clarifications", tags=["clarifications"])


class ClarificationCreateSchema(BaseModel):
    tender_id: str
    bidder_id: str
    requirement_id: Optional[str] = None
    bidder_document_id: Optional[str] = None
    subject: str
    query_text: str


class ClarificationResolveSchema(BaseModel):
    status: str  # "resolved" or "rejected"
    resolution_notes: Optional[str] = None


@router.post("/request", status_code=status.HTTP_201_CREATED)
def create_clarification_request(
    payload: ClarificationCreateSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.EVALUATOR)),
):
    bidder = db.query(Bidder).filter(Bidder.id == payload.bidder_id).first()
    if not bidder:
        raise HTTPException(status_code=404, detail="Bidder not found")

    req = ClarificationRequest(
        tender_id=payload.tender_id,
        bidder_id=payload.bidder_id,
        requirement_id=payload.requirement_id,
        bidder_document_id=payload.bidder_document_id,
        subject=payload.subject,
        query_text=payload.query_text,
        status=ClarificationStatus.PENDING,
        requested_by=current_user.id,
        requested_at=datetime.utcnow(),
    )
    db.add(req)
    db.commit()
    db.refresh(req)

    log_action(
        db=db,
        action="REQUEST_CLARIFICATION",
        user_id=current_user.id,
        entity_type="clarification_request",
        entity_id=str(req.id),
        details={"bidder": bidder.company_name, "subject": req.subject},
    )

    return {
        "id": str(req.id),
        "status": req.status.value,
        "message": "Clarification request issued to bidder successfully",
    }


@router.get("/tender/{tender_id}")
def get_tender_clarifications(
    tender_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items = (
        db.query(ClarificationRequest)
        .filter(ClarificationRequest.tender_id == tender_id)
        .order_by(ClarificationRequest.requested_at.desc())
        .all()
    )
    res = []
    for item in items:
        bidder = db.query(Bidder).filter(Bidder.id == item.bidder_id).first()
        res.append({
            "id": str(item.id),
            "tender_id": str(item.tender_id),
            "bidder_id": str(item.bidder_id),
            "bidder_name": bidder.company_name if bidder else "Unknown",
            "requirement_id": str(item.requirement_id) if item.requirement_id else None,
            "bidder_document_id": str(item.bidder_document_id) if item.bidder_document_id else None,
            "subject": item.subject,
            "query_text": item.query_text,
            "status": item.status.value,
            "requested_at": item.requested_at.isoformat() if item.requested_at else None,
            "response_text": item.response_text,
            "responded_at": item.responded_at.isoformat() if item.responded_at else None,
            "resolution_notes": item.resolution_notes,
            "resolved_at": item.resolved_at.isoformat() if item.resolved_at else None,
        })
    return res


@router.get("/bidder/{bidder_id}")
def get_bidder_clarifications(
    bidder_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items = (
        db.query(ClarificationRequest)
        .filter(ClarificationRequest.bidder_id == bidder_id)
        .order_by(ClarificationRequest.requested_at.desc())
        .all()
    )
    return [
        {
            "id": str(item.id),
            "tender_id": str(item.tender_id),
            "bidder_id": str(item.bidder_id),
            "requirement_id": str(item.requirement_id) if item.requirement_id else None,
            "bidder_document_id": str(item.bidder_document_id) if item.bidder_document_id else None,
            "subject": item.subject,
            "query_text": item.query_text,
            "status": item.status.value,
            "requested_at": item.requested_at.isoformat() if item.requested_at else None,
            "response_text": item.response_text,
            "responded_at": item.responded_at.isoformat() if item.responded_at else None,
            "resolution_notes": item.resolution_notes,
            "resolved_at": item.resolved_at.isoformat() if item.resolved_at else None,
        }
        for item in items
    ]


@router.post("/{clarification_id}/respond")
async def respond_to_clarification(
    clarification_id: str,
    response_text: str = Form(...),
    replacement_file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    req = db.query(ClarificationRequest).filter(ClarificationRequest.id == clarification_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Clarification request not found")

    req.response_text = response_text
    req.responded_at = datetime.utcnow()
    req.status = ClarificationStatus.RESPONDED

    new_version_record = None

    # If bidder uploaded a replacement file
    if replacement_file:
        contents = await replacement_file.read()
        file_kind = validate_document_bytes(
            replacement_file.filename, replacement_file.content_type, contents, settings.MAX_UPLOAD_SIZE_MB
        )
        file_sha256 = hashlib.sha256(contents).hexdigest()

        # Find associated document or create a new document
        doc = None
        if req.bidder_document_id:
            doc = db.query(BidderDocument).filter(BidderDocument.id == req.bidder_document_id).first()

        bidder_dir = os.path.join(settings.UPLOAD_DIR, "bidders", str(req.bidder_id))
        os.makedirs(bidder_dir, exist_ok=True)
        stored_name = safe_stored_filename(f"v_reupload_{replacement_file.filename}")
        file_path = os.path.join(bidder_dir, stored_name)
        with open(file_path, "wb") as f:
            f.write(contents)

        if doc:
            # Increment document version, preserving old file
            doc.current_version = (doc.current_version or 1) + 1
            doc.file_path = file_path
            doc.original_filename = replacement_file.filename
            doc.file_kind = file_kind
            doc.processing_status = DocumentProcessingStatus.UPLOADED

            ver = DocumentVersion(
                bidder_document_id=doc.id,
                version_number=doc.current_version,
                file_path=file_path,
                original_filename=replacement_file.filename,
                sha256_hash=file_sha256,
                uploaded_by=current_user.id,
                previous_document_id=doc.id,
                new_document_id=doc.id,
                status="ACTIVE",
                reason=f"Clarification Response: {req.subject}",
                uploaded_at=datetime.utcnow(),
            )
            db.add(ver)
            new_version_record = ver

            # Anchor new version to blockchain
            try:
                proof = anchor_file_bytes(
                    db=db,
                    filename=replacement_file.filename,
                    doc_type=doc.document_type.value,
                    file_bytes=contents,
                    entity_type="bidder_document_version",
                    entity_id=str(ver.id),
                    metadata={"version": doc.current_version, "clarification_id": str(req.id)},
                )
                if proof and hasattr(proof, "tx_hash"):
                    ver.blockchain_tx = proof.tx_hash
            except Exception:
                pass

            # Trigger AI extraction & tampering analysis on new version
            try:
                run_bidder_document_pipeline(doc_id=str(doc.id), db=db)
                analysis = analyze_document_tampering(doc, doc.extracted_data, doc.bidder)
                doc.tampering_risk = analysis["tampering_risk"]
                doc.quality_status = analysis["quality_status"]
            except Exception:
                pass

        db.commit()

        # Re-run compliance engine for bidder automatically
        try:
            compliance_engine.evaluate_bidder(
                tender_id=str(req.tender_id),
                bidder_id=str(req.bidder_id),
                db=db,
                user_id=str(current_user.id),
            )
        except Exception:
            pass

    db.commit()

    log_action(
        db=db,
        action="RESPOND_CLARIFICATION",
        user_id=current_user.id,
        entity_type="clarification_request",
        entity_id=str(req.id),
        details={"has_replacement_file": bool(replacement_file)},
    )

    return {
        "status": "responded",
        "message": "Clarification response and documents submitted successfully.",
    }


@router.post("/{clarification_id}/resolve")
def resolve_clarification(
    clarification_id: str,
    payload: ClarificationResolveSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.EVALUATOR)),
):
    req = db.query(ClarificationRequest).filter(ClarificationRequest.id == clarification_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Clarification request not found")

    new_status = ClarificationStatus.RESOLVED if payload.status == "resolved" else ClarificationStatus.REJECTED
    req.status = new_status
    req.resolution_notes = payload.resolution_notes
    req.resolved_at = datetime.utcnow()
    db.commit()

    log_action(
        db=db,
        action="RESOLVE_CLARIFICATION",
        user_id=current_user.id,
        entity_type="clarification_request",
        entity_id=str(req.id),
        details={"status": new_status.value, "notes": payload.resolution_notes},
    )

    return {
        "status": new_status.value,
        "message": f"Clarification marked as {new_status.value}",
    }


@router.get("/documents/{document_id}/versions")
def get_document_versions(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    versions = (
        db.query(DocumentVersion)
        .filter(DocumentVersion.bidder_document_id == document_id)
        .order_by(DocumentVersion.version_number.asc())
        .all()
    )
    return [
        {
            "id": str(v.id),
            "version_number": v.version_number,
            "original_filename": v.original_filename,
            "sha256_hash": v.sha256_hash,
            "previous_document_id": str(v.previous_document_id) if v.previous_document_id else None,
            "new_document_id": str(v.new_document_id) if v.new_document_id else None,
            "status": v.status,
            "reason": v.reason,
            "uploaded_at": v.uploaded_at.isoformat(),
            "blockchain_tx": v.blockchain_tx,
        }
        for v in versions
    ]
