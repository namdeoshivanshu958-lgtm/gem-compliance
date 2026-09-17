"""
Risk Intelligence API Routes (Phase 7, 10 & 22).
Consolidates Document Integrity / Tampering Risk Analysis and
Cartel / Collusion Risk Correlation Analysis into clean endpoints:
- /api/risk/tender/{tender_id}
- /api/risk/bidder/{bidder_id}
"""
from typing import Any, Dict, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserRole
from app.models.tender import Tender
from app.models.bidder import Bidder, BidderDocument
from app.core.deps import get_current_user, require_roles
from app.services.collusion_service import analyze_collusion_risk
from app.services.document_tampering_service import analyze_document_tampering

router = APIRouter(prefix="/api/risk", tags=["risk"])


@router.get("/tender/{tender_id}")
def get_tender_risk_overview(
    tender_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.EVALUATOR)),
):
    """
    Returns aggregated risk indicators for a tender:
    1. Cartel & Collusion correlation graph & potential indicators.
    2. Summary of document integrity and tampering alerts across all bidders.
    """
    tender = db.query(Tender).filter(Tender.id == tender_id).first()
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")

    collusion_report = analyze_collusion_risk(tender_id=tender_id, db=db)

    bidders = db.query(Bidder).filter(Bidder.tender_id == tender_id).all()
    high_risk_docs = []
    for b in bidders:
        for d in b.documents:
            if getattr(d, "tampering_risk", "LOW") in ("HIGH", "MEDIUM"):
                high_risk_docs.append({
                    "document_id": str(d.id),
                    "bidder_id": str(b.id),
                    "bidder_name": b.company_name,
                    "filename": d.original_filename,
                    "document_type": d.document_type.value if hasattr(d.document_type, "value") else str(d.document_type),
                    "tampering_risk": d.tampering_risk,
                    "quality_status": getattr(d, "quality_status", "READABLE"),
                    "indicators": d.tampering_indicators,
                })

    return {
        "tender_id": tender_id,
        "tender_ref_no": tender.tender_ref_no,
        "collusion_analysis": collusion_report,
        "flagged_documents": high_risk_docs,
        "total_flagged_documents_count": len(high_risk_docs),
        "disclaimer": "All risk findings are automated decision-support indicators. Requires human evaluator verification.",
    }


@router.get("/bidder/{bidder_id}")
def get_bidder_risk_detail(
    bidder_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns document-by-document tampering and integrity evaluation for a specific bidder."""
    bidder = db.query(Bidder).filter(Bidder.id == bidder_id).first()
    if not bidder:
        raise HTTPException(status_code=404, detail="Bidder not found")

    docs_analysis = []
    for d in bidder.documents:
        analysis = analyze_document_tampering(d, d.extracted_data, bidder)
        docs_analysis.append({
            "document_id": str(d.id),
            "filename": d.original_filename,
            "document_type": d.document_type.value if hasattr(d.document_type, "value") else str(d.document_type),
            "version": getattr(d, "current_version", 1),
            "tampering_risk": analysis["tampering_risk"],
            "quality_status": analysis["quality_status"],
            "indicators": analysis["tampering_indicators"],
            "needs_review": analysis["needs_review"],
        })

    return {
        "bidder_id": bidder_id,
        "bidder_name": bidder.company_name,
        "documents": docs_analysis,
    }
