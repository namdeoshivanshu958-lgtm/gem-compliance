"""
Public Unauthenticated API Routes (Phase 13 & 22).
Zero-login endpoints for vigilance officers (CPCL / CVC), bidders, and public auditors:
- /api/public/verify/{query_str:path} -> Query document hash, compliance ID, or proof ID.
- /api/public/tenders -> List active public tenders without exposing sensitive bidder data.
- /api/public/stats -> High-level public transparency stats.
"""
from typing import Any, Dict, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.tender import Tender, TenderStatus
from app.models.blockchain import BlockchainBlock, DocumentProof
from app.schemas.blockchain import PublicVerificationOut
from app.services.blockchain_service import public_verify_query

router = APIRouter(prefix="/api/public", tags=["public"])


@router.get("/verify/{query_str:path}", response_model=PublicVerificationOut)
def public_verify_endpoint(query_str: str, db: Session = Depends(get_db)):
    """
    Zero-login Public Verification Endpoint.
    Searches by SHA-256 hash, Compliance ID, Proof ID, Block number, or EVM transaction hash.
    Strictly returns safe public verification metadata without leaking confidential bidder data.
    """
    res = public_verify_query(db, query_str)
    return PublicVerificationOut(
        found=res["found"],
        query=res["query"],
        item_type=res.get("item_type"),
        title=res.get("title"),
        status=res.get("status"),
        block_number=res.get("block_number"),
        tx_hash=res.get("tx_hash"),
        sha256_hash=res.get("sha256_hash"),
        previous_hash=res.get("previous_hash"),
        anchored_at=res.get("anchored_at"),
        issuer=res.get("issuer"),
        details=res.get("details"),
        tamper_detected=res.get("tamper_detected", False),
    )


@router.get("/tenders")
def list_public_tenders(db: Session = Depends(get_db)):
    """Public list of active tenders with requirement counts."""
    tenders = db.query(Tender).filter(Tender.status != TenderStatus.DRAFT).order_by(Tender.created_at.desc()).all()
    return [
        {
            "id": str(t.id),
            "tender_ref_no": t.tender_ref_no,
            "title": t.title,
            "organization": t.organization,
            "department": t.department,
            "category": getattr(t, "category", "Equipment"),
            "procurement_mode": getattr(t, "procurement_mode", "L1"),
            "status": t.status.value if hasattr(t.status, "value") else str(t.status),
            "deadline": t.deadline.isoformat() if t.deadline else None,
            "estimated_value": getattr(t, "estimated_value", None),
            "requirements_count": len(t.requirements),
        }
        for t in tenders
    ]


@router.get("/stats")
def get_public_transparency_stats(db: Session = Depends(get_db)):
    """Public aggregated statistics on procurement and blockchain ledger."""
    total_tenders = db.query(Tender).count()
    total_proofs = db.query(DocumentProof).count()
    total_blocks = db.query(BlockchainBlock).count()
    return {
        "active_tenders_count": total_tenders,
        "anchored_document_proofs": total_proofs,
        "blockchain_ledger_blocks": total_blocks,
        "demonstration_notice": "SIH 2026 Demonstration Prototype (PS 26100)",
    }
