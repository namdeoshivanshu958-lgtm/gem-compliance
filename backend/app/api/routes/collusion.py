"""
Cartel, Collusion & Document Risk Analysis API Routes (Phase 8 & 12).
Decision-support risk metrics:
- Bidder relationship & collusion correlation analysis
- Document tampering risk breakdown for bidders
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserRole
from app.models.bidder import Bidder, BidderDocument
from app.core.deps import get_current_user, require_roles
from app.services.collusion_service import analyze_collusion_risk
from app.services.document_tampering_service import analyze_document_tampering

router = APIRouter(prefix="/api/risk", tags=["risk"])


@router.get("/collusion/{tender_id}")
def get_tender_collusion_analysis(
    tender_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.EVALUATOR)),
):
    try:
        return analyze_collusion_risk(tender_id=tender_id, db=db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/documents/{bidder_id}")
def get_bidder_document_risks(
    bidder_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    bidder = db.query(Bidder).filter(Bidder.id == bidder_id).first()
    if not bidder:
        raise HTTPException(status_code=404, detail="Bidder not found")

    docs = db.query(BidderDocument).filter(BidderDocument.bidder_id == bidder_id).all()
    results = []

    for d in docs:
        analysis = analyze_document_tampering(d, d.extracted_data, bidder)
        # Update cached fields
        d.tampering_risk = analysis["tampering_risk"]
        d.quality_status = analysis["quality_status"]
        results.append({
            "document_id": str(d.id),
            "original_filename": d.original_filename,
            "document_type": d.document_type.value,
            "current_version": d.current_version or 1,
            "tampering_risk": analysis["tampering_risk"],
            "quality_status": analysis["quality_status"],
            "tampering_indicators": analysis["tampering_indicators"],
            "needs_review": analysis["needs_review"],
        })

    db.commit()
    return {
        "bidder_id": bidder_id,
        "bidder_name": bidder.company_name,
        "documents": results,
    }
