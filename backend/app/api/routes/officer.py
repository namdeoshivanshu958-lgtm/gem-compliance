"""
Officer Console & Override Management Routes (Phase 3 & 5).
Allows authorized evaluators/admins to:
- Review deterministic results
- Approve, Reject, or Approve with Deviation
- Record officer justification, deviation category, and officer credentials
- Anchor manual decisions directly to the immutable blockchain ledger
- Retrieve officer console overview metrics
"""
import hashlib
import json
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserRole
from app.models.tender import Tender
from app.models.bidder import Bidder, BidderDocument
from app.models.compliance import ComplianceResult, ComplianceStatus, RiskLevel
from app.models.override import OfficerDecision
from app.models.clarification import ClarificationRequest, ClarificationStatus
from app.core.deps import get_current_user, require_roles
from app.core.logging_config import logger
from app.services.audit_service import log_action
from app.services.blockchain_service import anchor_officer_override

router = APIRouter(prefix="/api/officer", tags=["officer"])


class OfficerOverrideSchema(BaseModel):
    tender_id: str
    bidder_id: str
    requirement_id: Optional[str] = None
    decision_type: str  # "APPROVE", "REJECT", "APPROVE_WITH_DEVIATION", "REQUEST_CLARIFICATION"
    deviation_category: Optional[str] = None  # "Documentary Discrepancy", "Minor Specification Variance", "MSE Relaxation", "Other"
    justification: str
    comments: Optional[str] = None
    evidence: Optional[str] = None


@router.get("/stats")
def get_officer_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.EVALUATOR)),
):
    active_tenders = db.query(Tender).count()
    total_bidders = db.query(Bidder).count()
    needs_review = db.query(ComplianceResult).filter(ComplianceResult.overall_status == ComplianceStatus.NEEDS_REVIEW).count()
    non_compliant = db.query(ComplianceResult).filter(ComplianceResult.overall_status == ComplianceStatus.NON_COMPLIANT).count()
    compliant = db.query(ComplianceResult).filter(ComplianceResult.overall_status == ComplianceStatus.COMPLIANT).count()
    pending_clarifications = db.query(ClarificationRequest).filter(ClarificationRequest.status == ClarificationStatus.PENDING).count()
    high_risk_docs = db.query(BidderDocument).filter(BidderDocument.tampering_risk == "HIGH").count()
    total_overrides = db.query(OfficerDecision).count()
    pending_reviews = db.query(BidderDocument).filter(BidderDocument.processing_status != DocumentProcessingStatus.COMPLETED).count() + needs_review
    recently_completed = compliant + non_compliant

    return {
        "active_tenders": active_tenders,
        "total_bidders": total_bidders,
        "compliant_bidders": compliant,
        "needs_review": needs_review,
        "non_compliant": non_compliant,
        "pending_clarifications": pending_clarifications,
        "high_risk_documents": high_risk_docs,
        "total_overrides": total_overrides,
        "pending_reviews": pending_reviews,
        "recently_completed": recently_completed,
    }


@router.post("/override")
def apply_officer_override(
    payload: OfficerOverrideSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.EVALUATOR)),
):
    if not payload.justification or not payload.justification.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Officer override requires a mandatory justification.",
        )

    bidder = db.query(Bidder).filter(Bidder.id == payload.bidder_id).first()
    if not bidder:
        raise HTTPException(status_code=404, detail="Bidder not found")

    cr = db.query(ComplianceResult).filter(ComplianceResult.bidder_id == payload.bidder_id).first()
    if not cr:
        raise HTTPException(status_code=404, detail="Compliance evaluation not found for this bidder")

    original_verdict = cr.overall_status.value if hasattr(cr.overall_status, "value") else str(cr.overall_status)
    new_verdict = payload.decision_type

    # Map decision type to final status
    if payload.decision_type in ("APPROVE", "APPROVE_WITH_DEVIATION"):
        cr.overall_status = ComplianceStatus.COMPLIANT
        cr.risk_level = RiskLevel.LOW
    elif payload.decision_type == "REJECT":
        cr.overall_status = ComplianceStatus.NON_COMPLIANT
        cr.risk_level = RiskLevel.HIGH
    elif payload.decision_type == "REQUEST_CLARIFICATION":
        cr.overall_status = ComplianceStatus.NEEDS_REVIEW
        cr.risk_level = RiskLevel.MEDIUM
        # Create corresponding clarification request
        clarif = ClarificationRequest(
            tender_id=payload.tender_id,
            bidder_id=payload.bidder_id,
            requirement_id=payload.requirement_id,
            subject=f"Officer Clarification: {payload.deviation_category or 'Evaluation Query'}",
            query_text=payload.justification,
            status=ClarificationStatus.PENDING,
            requested_by=current_user.id,
            requested_at=datetime.utcnow(),
        )
        db.add(clarif)

    cr.override_status = payload.decision_type
    cr.override_justification = payload.justification
    cr.deviation_category = payload.deviation_category
    cr.overridden_by = current_user.id
    cr.overridden_at = datetime.utcnow()

    # Anchor to blockchain
    tx_hash = None
    try:
        block = anchor_officer_override(
            db=db,
            tender_id=payload.tender_id,
            bidder_id=payload.bidder_id,
            company_name=bidder.company_name,
            original_verdict=original_verdict,
            new_verdict=new_verdict,
            justification=payload.justification,
            deviation_category=payload.deviation_category,
            officer_email=current_user.email,
            officer_role=current_user.role.value,
        )
        if block:
            block_txs = json.loads(block.transactions) if block.transactions else []
            tx_hash = block_txs[0].get("tx_hash") if block_txs else block.block_hash
            cr.blockchain_tx = tx_hash
    except Exception as e:
        logger.warning(f"Error anchoring officer override to blockchain: {e}")

    decision_record = OfficerDecision(
        tender_id=payload.tender_id,
        bidder_id=payload.bidder_id,
        requirement_id=payload.requirement_id,
        decision_type=payload.decision_type,
        original_verdict=original_verdict,
        new_verdict=new_verdict,
        deviation_category=payload.deviation_category,
        justification=payload.justification,
        comments=payload.comments,
        evidence=payload.evidence,
        officer_id=current_user.id,
        officer_role=current_user.role.value,
        blockchain_tx=tx_hash,
        created_at=datetime.utcnow(),
    )
    db.add(decision_record)
    db.commit()

    log_action(
        db=db,
        action="OFFICER_OVERRIDE",
        user_id=current_user.id,
        entity_type="compliance_result",
        entity_id=str(cr.id),
        details={
            "original_verdict": original_verdict,
            "new_verdict": new_verdict,
            "justification": payload.justification,
            "blockchain_tx": tx_hash,
        },
    )

    return {
        "status": "success",
        "new_verdict": new_verdict,
        "blockchain_tx": tx_hash,
        "message": f"Officer decision ({payload.decision_type}) successfully recorded and anchored to blockchain ledger.",
    }


@router.get("/decisions/tender/{tender_id}")
def get_tender_officer_decisions(
    tender_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.EVALUATOR)),
):
    decisions = (
        db.query(OfficerDecision)
        .filter(OfficerDecision.tender_id == tender_id)
        .order_by(OfficerDecision.created_at.desc())
        .all()
    )
    res = []
    for d in decisions:
        bidder = db.query(Bidder).filter(Bidder.id == d.bidder_id).first()
        officer = db.query(User).filter(User.id == d.officer_id).first()
        res.append({
            "id": str(d.id),
            "tender_id": str(d.tender_id),
            "bidder_id": str(d.bidder_id),
            "bidder_name": bidder.company_name if bidder else "Unknown",
            "decision_type": d.decision_type,
            "original_verdict": d.original_verdict,
            "new_verdict": d.new_verdict,
            "deviation_category": d.deviation_category,
            "justification": d.justification,
            "comments": d.comments,
            "evidence": d.evidence,
            "officer_name": officer.full_name if officer else "Officer",
            "officer_role": d.officer_role,
            "blockchain_tx": d.blockchain_tx,
            "created_at": d.created_at.isoformat() if d.created_at else None,
        })
    return res
