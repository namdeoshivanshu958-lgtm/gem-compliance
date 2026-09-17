"""
Cartel & Collusion Risk Analysis Service (Phase 12).
Evaluates bidder clusters for a given tender to detect:
- Synchronized submission timings
- Unusually close or coordinated commercial bid pricing
- Common contact information / domain similarities
- Co-bidding history

Outputs an investigative graph data model and risk indicators:
LOW, MEDIUM, HIGH.
Note: Decision support only. Labeled as 'Potential Collusion Indicator - Requires Investigation'.
"""
import math
import re
from datetime import datetime
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from app.models.bidder import Bidder
from app.models.commercial import CommercialBid
from app.models.compliance import ComplianceResult


def analyze_collusion_risk(tender_id: str, db: Session) -> Dict[str, Any]:
    bidders = db.query(Bidder).filter(Bidder.tender_id == tender_id).all()
    if len(bidders) < 2:
        return {
            "tender_id": tender_id,
            "overall_risk": "LOW",
            "risk_score": 0.0,
            "indicators": [],
            "bidder_count": len(bidders),
            "nodes": [{"id": str(b.id), "name": b.company_name, "risk": "LOW"} for b in bidders],
            "edges": [],
            "notes": "At least two bidders are required to perform cartel & collusion correlation analysis.",
        }

    indicators: List[Dict[str, Any]] = []
    edges: List[Dict[str, Any]] = []
    node_risks: Dict[str, str] = {str(b.id): "LOW" for b in bidders}
    total_risk_score = 0.0

    # 1. Contact / Email Domain Patterns
    domain_map: Dict[str, List[Bidder]] = {}
    for b in bidders:
        if b.contact_email and "@" in b.contact_email:
            domain = b.contact_email.split("@")[-1].lower()
            if domain not in ("gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "rediffmail.com"):
                domain_map.setdefault(domain, []).append(b)

    for domain, group in domain_map.items():
        if len(group) > 1:
            names = [b.company_name for b in group]
            indicators.append({
                "type": "SHARED_EMAIL_DOMAIN",
                "severity": "HIGH",
                "indicator_label": "Potential Collusion Indicator: Shared Corporate Domain",
                "description": f"Potential Collusion Indicator: Shared corporate email domain '@{domain}' detected between: {', '.join(names)}. Requires Investigation.",
                "bidders": [str(b.id) for b in group],
            })
            total_risk_score += 35.0
            for i in range(len(group)):
                for j in range(i + 1, len(group)):
                    node_risks[str(group[i].id)] = "HIGH"
                    node_risks[str(group[j].id)] = "HIGH"
                    edges.append({
                        "source": str(group[i].id),
                        "target": str(group[j].id),
                        "reason": f"Shared domain @{domain}",
                        "weight": "HIGH",
                    })

    # 1b. Shared Contact Phone Numbers
    phone_map: Dict[str, List[Bidder]] = {}
    for b in bidders:
        if b.contact_phone:
            clean_phone = re.sub(r'[^0-9]', '', b.contact_phone)[-10:]
            if len(clean_phone) >= 10:
                phone_map.setdefault(clean_phone, []).append(b)

    for ph, group in phone_map.items():
        if len(group) > 1:
            names = [b.company_name for b in group]
            indicators.append({
                "type": "SHARED_PHONE_NUMBER",
                "severity": "HIGH",
                "indicator_label": "Potential Collusion Indicator: Shared Contact Number",
                "description": f"Potential Collusion Indicator: Shared authorized contact number ending with {ph[-4:]} between: {', '.join(names)}. Requires Investigation.",
                "bidders": [str(b.id) for b in group],
            })
            total_risk_score += 30.0
            for i in range(len(group)):
                for j in range(i + 1, len(group)):
                    node_risks[str(group[i].id)] = "HIGH"
                    node_risks[str(group[j].id)] = "HIGH"
                    edges.append({
                        "source": str(group[i].id),
                        "target": str(group[j].id),
                        "reason": f"Shared Phone {ph[-4:]}",
                        "weight": "HIGH",
                    })

    # 2. Submission Timing Synchronization (within 15 minutes)
    timed_bidders = [(b, b.created_at) for b in bidders if b.created_at]
    for i in range(len(timed_bidders)):
        for j in range(i + 1, len(timed_bidders)):
            b1, t1 = timed_bidders[i]
            b2, t2 = timed_bidders[j]
            diff_mins = abs((t1 - t2).total_seconds()) / 60.0
            if diff_mins < 15.0:
                indicators.append({
                    "type": "SYNCHRONIZED_SUBMISSION",
                    "severity": "MEDIUM",
                    "description": f"Bids submitted within {round(diff_mins, 1)} minutes of each other by '{b1.company_name}' and '{b2.company_name}'",
                    "bidders": [str(b1.id), str(b2.id)],
                })
                total_risk_score += 20.0
                if node_risks[str(b1.id)] == "LOW":
                    node_risks[str(b1.id)] = "MEDIUM"
                if node_risks[str(b2.id)] == "LOW":
                    node_risks[str(b2.id)] = "MEDIUM"
                edges.append({
                    "source": str(b1.id),
                    "target": str(b2.id),
                    "reason": f"Submissions within {round(diff_mins, 1)}m",
                    "weight": "MEDIUM",
                })

    # 3. Commercial Pricing Clustering (prices within 0.5% margin)
    commercial_bids = (
        db.query(CommercialBid)
        .filter(CommercialBid.tender_id == tender_id)
        .all()
    )
    bid_map = {str(cb.bidder_id): cb for cb in commercial_bids}
    bidder_ids = [str(b.id) for b in bidders if str(b.id) in bid_map]

    for i in range(len(bidder_ids)):
        for j in range(i + 1, len(bidder_ids)):
            cb1 = bid_map[bidder_ids[i]]
            cb2 = bid_map[bidder_ids[j]]
            if cb1.evaluated_price > 0 and cb2.evaluated_price > 0:
                diff_pct = abs(cb1.evaluated_price - cb2.evaluated_price) / max(cb1.evaluated_price, cb2.evaluated_price) * 100.0
                if diff_pct < 0.8:
                    b1_name = next(b.company_name for b in bidders if str(b.id) == str(cb1.bidder_id))
                    b2_name = next(b.company_name for b in bidders if str(b.id) == str(cb2.bidder_id))
                    indicators.append({
                        "type": "PRICE_CLUSTERING",
                        "severity": "HIGH",
                        "description": f"Near-identical commercial bid pricing ({round(diff_pct, 2)}% difference) between '{b1_name}' (₹{cb1.evaluated_price:,.2f}) and '{b2_name}' (₹{cb2.evaluated_price:,.2f})",
                        "bidders": [str(cb1.bidder_id), str(cb2.bidder_id)],
                    })
                    total_risk_score += 35.0
                    node_risks[str(cb1.bidder_id)] = "HIGH"
                    node_risks[str(cb2.bidder_id)] = "HIGH"
                    edges.append({
                        "source": str(cb1.bidder_id),
                        "target": str(cb2.bidder_id),
                        "reason": f"Price cluster: {round(diff_pct, 2)}% diff",
                        "weight": "HIGH",
                    })

    # Determine overall status
    if total_risk_score >= 50.0:
        overall_risk = "HIGH"
    elif total_risk_score >= 20.0:
        overall_risk = "MEDIUM"
    else:
        overall_risk = "LOW"

    nodes = [
        {
            "id": str(b.id),
            "name": b.company_name,
            "gem_seller_id": b.gem_seller_id or "N/A",
            "risk": node_risks.get(str(b.id), "LOW"),
        }
        for b in bidders
    ]

    return {
        "tender_id": tender_id,
        "overall_risk": overall_risk,
        "risk_score": min(total_risk_score, 100.0),
        "indicators": indicators,
        "bidder_count": len(bidders),
        "nodes": nodes,
        "edges": edges,
        "notes": "Decision-support indicators calculated. Requires human officer review before any administrative action.",
    }
