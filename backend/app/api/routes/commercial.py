"""
Commercial Evaluation & L1 Ranking API Routes (Phase 11).
Independent commercial bid opening and evaluation based on tender requirements.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserRole
from app.models.tender import Tender
from app.models.bidder import Bidder
from app.models.commercial import CommercialBid
from app.core.deps import get_current_user, require_roles
from app.services.commercial_evaluation_service import evaluate_commercial_bids
from app.services.audit_service import log_action

router = APIRouter(prefix="/api/commercial", tags=["commercial"])


class CommercialBidSubmitSchema(BaseModel):
    tender_id: str
    bidder_id: str
    base_price: float
    tax_percentage: Optional[float] = 18.0
    freight_charges: Optional[float] = 0.0
    applicable_loading: Optional[float] = 0.0
    other_charges: Optional[float] = 0.0
    currency: Optional[str] = "INR"
    delivery_timeline_days: Optional[int] = 30
    warranty_months: Optional[int] = 12


@router.post("/bid", status_code=status.HTTP_201_CREATED)
def submit_commercial_bid(
    payload: CommercialBidSubmitSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tender = db.query(Tender).filter(Tender.id == payload.tender_id).first()
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")

    bidder = db.query(Bidder).filter(Bidder.id == payload.bidder_id).first()
    if not bidder:
        raise HTTPException(status_code=404, detail="Bidder not found")

    tax_amt = payload.base_price * ((payload.tax_percentage or 18.0) / 100.0)
    loading = payload.applicable_loading or 0.0
    other = payload.other_charges or 0.0
    total_price = round(payload.base_price + tax_amt + (payload.freight_charges or 0.0) + loading + other, 2)

    existing = db.query(CommercialBid).filter(CommercialBid.bidder_id == payload.bidder_id).first()
    if existing:
        existing.base_price = payload.base_price
        existing.tax_percentage = payload.tax_percentage or 18.0
        existing.freight_charges = payload.freight_charges or 0.0
        existing.applicable_loading = loading
        existing.other_charges = other
        existing.evaluated_price = total_price
        existing.delivery_timeline_days = payload.delivery_timeline_days or 30
        existing.warranty_months = payload.warranty_months or 12
        bid_record = existing
    else:
        bid_record = CommercialBid(
            tender_id=payload.tender_id,
            bidder_id=payload.bidder_id,
            base_price=payload.base_price,
            tax_percentage=payload.tax_percentage or 18.0,
            freight_charges=payload.freight_charges or 0.0,
            applicable_loading=loading,
            other_charges=other,
            evaluated_price=total_price,
            currency=payload.currency or "INR",
            delivery_timeline_days=payload.delivery_timeline_days or 30,
            warranty_months=payload.warranty_months or 12,
        )
        db.add(bid_record)

    db.commit()

    log_action(
        db=db,
        action="SUBMIT_COMMERCIAL_BID",
        user_id=current_user.id,
        entity_type="commercial_bid",
        entity_id=str(bid_record.id),
        details={"bidder": bidder.company_name, "evaluated_price": total_price},
    )

    return {
        "status": "success",
        "evaluated_price": total_price,
        "message": "Commercial bid recorded successfully.",
    }


@router.get("/tender/{tender_id}/evaluation")
def get_tender_commercial_evaluation(
    tender_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        data = evaluate_commercial_bids(tender_id=tender_id, db=db)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
