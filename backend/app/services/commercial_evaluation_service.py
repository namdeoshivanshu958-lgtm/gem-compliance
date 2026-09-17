"""
Commercial Evaluation & L1 Ranking Service (Phase 11).
Evaluates financial bids for a tender independently from technical compliance.
Calculates:
- Evaluated Price = Base Price * (1 + Tax / 100) + Freight
- Technical Compliance Status filter (non-compliant bidders flagged as disqualified)
- Ranking: L1 (lowest evaluated price among compliant bidders), L2, L3...
- Price variance percentage against L1
"""
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from app.models.bidder import Bidder
from app.models.commercial import CommercialBid
from app.models.compliance import ComplianceResult, ComplianceStatus


def evaluate_commercial_bids(tender_id: str, db: Session) -> Dict[str, Any]:
    bids = db.query(CommercialBid).filter(CommercialBid.tender_id == tender_id).all()
    bidders = {str(b.id): b for b in db.query(Bidder).filter(Bidder.tender_id == tender_id).all()}
    compliance_map = {
        str(cr.bidder_id): cr
        for cr in db.query(ComplianceResult).filter(ComplianceResult.tender_id == tender_id).all()
    }

    evaluated_list: List[Dict[str, Any]] = []

    for bid in bids:
        bidder = bidders.get(str(bid.bidder_id))
        if not bidder:
            continue

        cr = compliance_map.get(str(bid.bidder_id))
        is_technically_compliant = False
        compliance_status_str = "NOT_EVALUATED"

        if cr:
            compliance_status_str = (
                cr.overall_status.value
                if hasattr(cr.overall_status, "value")
                else str(cr.overall_status)
            )
            # If overridden with APPROVE or APPROVED_WITH_DEVIATION, consider qualified
            if cr.override_status in ("APPROVE", "APPROVED", "APPROVE_WITH_DEVIATION", "APPROVED_WITH_DEVIATION"):
                is_technically_compliant = True
            elif cr.overall_status == ComplianceStatus.COMPLIANT:
                is_technically_compliant = True

        # Calculate evaluated price with configurable loading and other charges
        tax_amount = bid.base_price * (bid.tax_percentage / 100.0)
        loading = getattr(bid, "applicable_loading", 0.0) or 0.0
        other = getattr(bid, "other_charges", 0.0) or 0.0
        total_price = round(bid.base_price + tax_amount + (bid.freight_charges or 0.0) + loading + other, 2)
        bid.evaluated_price = total_price

        evaluated_list.append({
            "bid_id": str(bid.id),
            "bidder_id": str(bid.bidder_id),
            "company_name": bidder.company_name,
            "gem_seller_id": bidder.gem_seller_id or "N/A",
            "base_price": bid.base_price,
            "tax_percentage": bid.tax_percentage,
            "tax_amount": round(tax_amount, 2),
            "freight_charges": bid.freight_charges or 0.0,
            "applicable_loading": loading,
            "other_charges": other,
            "evaluated_price": total_price,
            "currency": bid.currency or "INR",
            "delivery_timeline_days": bid.delivery_timeline_days,
            "warranty_months": bid.warranty_months,
            "technical_status": compliance_status_str,
            "is_technically_qualified": is_technically_compliant,
            "rank": None,
            "is_l1": False,
            "price_variance_vs_l1_pct": 0.0,
        })

    # Rank technically qualified bids by lowest price
    qualified_bids = [b for b in evaluated_list if b["is_technically_qualified"]]
    qualified_bids.sort(key=lambda x: x["evaluated_price"])

    l1_price = qualified_bids[0]["evaluated_price"] if qualified_bids else None

    for idx, b in enumerate(qualified_bids, 1):
        b["rank"] = idx
        b["is_l1"] = (idx == 1)
        if l1_price and l1_price > 0:
            b["price_variance_vs_l1_pct"] = round(
                ((b["evaluated_price"] - l1_price) / l1_price) * 100.0, 2
            )

        # Update db record
        matching_bid = next((cb for cb in bids if str(cb.id) == b["bid_id"]), None)
        if matching_bid:
            matching_bid.rank = idx
            matching_bid.is_l1 = (idx == 1)

    # Disqualified bids get ranked at the bottom
    disqualified_bids = [b for b in evaluated_list if not b["is_technically_qualified"]]
    for b in disqualified_bids:
        b["rank"] = 999
        b["is_l1"] = False
        if l1_price and l1_price > 0:
            b["price_variance_vs_l1_pct"] = round(
                ((b["evaluated_price"] - l1_price) / l1_price) * 100.0, 2
            )

    db.commit()

    all_sorted = qualified_bids + disqualified_bids

    return {
        "tender_id": tender_id,
        "total_bids": len(all_sorted),
        "qualified_bids_count": len(qualified_bids),
        "disqualified_bids_count": len(disqualified_bids),
        "l1_bidder": qualified_bids[0] if qualified_bids else None,
        "rankings": all_sorted,
    }
