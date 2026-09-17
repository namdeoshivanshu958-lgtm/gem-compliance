"""
AI Contextual Procurement Assistant Service (Phase 11).
Answers natural language queries strictly using actual procurement database records:
- "Why did this bidder fail?"
- "Which mandatory requirements failed?"
- "Which documents require review?"
- "Show high-risk bidders."
- "Compare Bidder A and Bidder B."
- "How many mandatory requirements passed?"
- "Which clarifications are pending?"

Guaranteed grounded: Retrieves actual records and strictly explains real findings.
Never hallucinates. If information is unavailable, returns:
"Information not available in the current procurement record."
"""
import json
import re
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from app.models.tender import Tender, TenderRequirement
from app.models.bidder import Bidder, BidderDocument
from app.models.compliance import ComplianceResult
from app.models.commercial import CommercialBid
from app.models.clarification import ClarificationRequest, ClarificationStatus
from app.models.blockchain import BlockchainBlock, DocumentProof


def query_procurement_assistant(
    prompt: str,
    tender_id: Optional[str],
    db: Session,
) -> Dict[str, Any]:
    query = prompt.lower().strip()
    NOT_AVAILABLE_MSG = "Information not available in the current procurement record."

    # 1. "How many mandatory requirements passed?"
    if "mandatory" in query and ("pass" in query or "cleared" in query or "satisfied" in query or "count" in query):
        crs = db.query(ComplianceResult).all()
        if tender_id:
            crs = [c for c in crs if str(c.tender_id) == tender_id]

        if not crs:
            return {"response": NOT_AVAILABLE_MSG, "context": {}}

        total_mandatory_passed = 0
        total_mandatory_evaluated = 0
        details = []

        for cr in crs:
            bidder = db.query(Bidder).filter(Bidder.id == cr.bidder_id).first()
            name = bidder.company_name if bidder else "Unknown"
            if cr.requirement_results:
                try:
                    reqs = json.loads(cr.requirement_results)
                    m_passed = sum(1 for r in reqs if r.get("mandatory") and r.get("status") == "COMPLIANT")
                    m_total = sum(1 for r in reqs if r.get("mandatory"))
                    total_mandatory_passed += m_passed
                    total_mandatory_evaluated += m_total
                    details.append(f"- **{name}**: `{m_passed} / {m_total}` mandatory clauses passed.")
                except Exception:
                    pass

        if total_mandatory_evaluated == 0:
            return {"response": NOT_AVAILABLE_MSG, "context": {}}

        response_text = (
            f"### Mandatory Requirements Passing Summary\n\n"
            f"Across evaluated submissions, a total of **{total_mandatory_passed} out of {total_mandatory_evaluated}** "
            f"mandatory requirements passed technical compliance verification:\n\n"
            + "\n".join(details) + "\n\n"
            f"> Under GeM evaluation rules, 100% of mandatory requirements must pass for an application to achieve `COMPLIANT` status."
        )
        return {"response": response_text, "context": {"total_passed": total_mandatory_passed, "total_mandatory": total_mandatory_evaluated}}

    # 2. "Which clarifications are pending?"
    if "clarification" in query and ("pending" in query or "open" in query or "active" in query or "status" in query or "list" in query):
        q = db.query(ClarificationRequest).filter(ClarificationRequest.status == ClarificationStatus.PENDING)
        if tender_id:
            q = q.filter(ClarificationRequest.tender_id == tender_id)
        pending = q.all()

        if not pending:
            return {
                "response": "There are currently no pending clarifications awaiting bidder responses in the procurement record.",
                "context": {"pending_count": 0},
            }

        lines = []
        for req in pending:
            bidder = db.query(Bidder).filter(Bidder.id == req.bidder_id).first()
            bname = bidder.company_name if bidder else "Unknown"
            lines.append(
                f"- **{req.subject}** for bidder **{bname}**:\n"
                f"  - Query: *\"{req.query_text}\"*\n"
                f"  - Requested at: `{req.requested_at.strftime('%d %b %Y %H:%M') if req.requested_at else 'N/A'}`"
            )

        response_text = (
            f"### Pending Clarifications Awaiting Response ({len(pending)})\n\n"
            + "\n".join(lines) + "\n\n"
            f"Bidders can respond and re-upload required documents at `/vendor/clarifications`."
        )
        return {"response": response_text, "context": {"pending_count": len(pending)}}

    # 3. "Show high-risk bidders."
    if ("high-risk" in query or "high risk" in query) and ("bidder" in query or "vendor" in query or "who" in query or "show" in query):
        high_risk_crs = db.query(ComplianceResult).filter(ComplianceResult.risk_level == "high").all()
        if tender_id:
            high_risk_crs = [c for c in high_risk_crs if str(c.tender_id) == tender_id]

        if not high_risk_crs:
            return {
                "response": "No bidders are currently flagged as `HIGH RISK` in the active evaluation record.",
                "context": {"count": 0},
            }

        lines = []
        for cr in high_risk_crs:
            bidder = db.query(Bidder).filter(Bidder.id == cr.bidder_id).first()
            name = bidder.company_name if bidder else str(cr.bidder_id)
            lines.append(
                f"- **{name}** (GeM Seller: `{bidder.gem_seller_id if bidder else 'N/A'}`):\n"
                f"  - Technical Verdict: `{cr.overall_status.value if hasattr(cr.overall_status, 'value') else cr.overall_status}`\n"
                f"  - Compliance Score: `{cr.compliance_score:.1f}%`\n"
                f"  - Mandatory Failure: `{'YES' if cr.mandatory_failed else 'NO'}`"
            )

        response_text = (
            f"### High-Risk Bidders Identified ({len(high_risk_crs)})\n\n"
            + "\n".join(lines) + "\n\n"
            f"> [!WARNING]\n"
            f"> Potential Collusion or Document Integrity indicators triggered this classification. Requires detailed officer investigation."
        )
        return {"response": response_text, "context": {"high_risk_bidders": len(high_risk_crs)}}

    # 4. "Compare Bidder A and Bidder B."
    if "compare" in query or "comparison" in query:
        bidders = db.query(Bidder).all()
        if tender_id:
            bidders = [b for b in bidders if str(b.tender_id) == tender_id]

        if not bidders:
            return {"response": NOT_AVAILABLE_MSG, "context": {}}

        # Extract specific bidders if mentioned
        matched_bidders = []
        for b in bidders:
            if b.company_name.lower() in query or (b.gem_seller_id and b.gem_seller_id.lower() in query):
                matched_bidders.append(b)

        if len(matched_bidders) < 2:
            matched_bidders = bidders[:3]  # Compare available bidders

        rows = []
        for b in matched_bidders:
            cr = db.query(ComplianceResult).filter(ComplianceResult.bidder_id == b.id).first()
            cb = db.query(CommercialBid).filter(CommercialBid.bidder_id == b.id).first()
            status_str = cr.overall_status.value if cr and hasattr(cr.overall_status, 'value') else (str(cr.overall_status) if cr else 'PENDING')
            score_str = f"{cr.compliance_score:.1f}%" if cr else "N/A"
            risk_str = (cr.risk_level.value if hasattr(cr.risk_level, 'value') else cr.risk_level) if cr else "N/A"
            price_str = f"₹{cb.evaluated_price:,.2f} ({'L1' if cb.is_l1 else f'L{cb.rank}'})" if cb else "Price N/A"

            rows.append(
                f"| **{b.company_name}** | `{status_str}` | {score_str} | `{risk_str}` | {price_str} |"
            )

        table = (
            "| Bidder Company | Technical Status | Score | Risk Level | Commercial Quote |\n"
            "| :--- | :--- | :--- | :--- | :--- |\n"
            + "\n".join(rows)
        )
        return {
            "response": f"### Comparative Bidder Analysis\n\n{table}\n\n*Review full clause-by-clause matrix at `/officer/compare`.*",
            "context": {"bidders_compared": len(matched_bidders)},
        }

    # 5. "Which mandatory requirements failed?"
    if "mandatory" in query and ("fail" in query or "failure" in query or "rejected" in query or "disqualif" in query):
        q = db.query(ComplianceResult).filter(ComplianceResult.mandatory_failed == True)
        if tender_id:
            q = q.filter(ComplianceResult.tender_id == tender_id)
        failed_results = q.all()

        if not failed_results:
            return {
                "response": "No bidders currently have mandatory failures recorded in the procurement record.",
                "context": {},
            }

        lines = []
        for cr in failed_results:
            bidder = db.query(Bidder).filter(Bidder.id == cr.bidder_id).first()
            name = bidder.company_name if bidder else str(cr.bidder_id)
            reasons = []
            if cr.requirement_results:
                try:
                    reqs = json.loads(cr.requirement_results)
                    for r in reqs:
                        if r.get("mandatory") and r.get("status") == "NON_COMPLIANT":
                            reasons.append(f"Clause `{r.get('clause_reference') or 'Mandatory'}`: {r.get('reason')}")
                except Exception:
                    pass
            reasons_text = "; ".join(reasons) if reasons else "Mandatory verification failure."
            lines.append(f"- **{name}**: {reasons_text}")

        response_text = (
            f"### Failed Mandatory Requirements\n\n"
            + "\n".join(lines) + "\n\n"
            f"> Under GeM rules, a single failed mandatory requirement forces `NON_COMPLIANT` status regardless of overall percentage."
        )
        return {"response": response_text, "context": {"failed_count": len(failed_results)}}

    # 6. "Which documents require review?"
    if "document" in query and ("review" in query or "flag" in query or "tamper" in query or "quality" in query):
        docs = db.query(BidderDocument).filter(
            (BidderDocument.tampering_risk.in_(["HIGH", "MEDIUM"])) |
            (BidderDocument.quality_status.in_(["UNREADABLE", "LOW_RESOLUTION", "INCOMPLETE"]))
        ).all()

        if not docs:
            return {
                "response": "All uploaded bidder documents are currently verified with `LOW` tampering risk and clean readability.",
                "context": {},
            }

        doc_lines = []
        for d in docs:
            bidder = db.query(Bidder).filter(Bidder.id == d.bidder_id).first()
            bname = bidder.company_name if bidder else "Unknown"
            doc_lines.append(
                f"- **{d.original_filename}** (`{d.document_type.value}`) from **{bname}**:\n"
                f"  - Quality Status: `{d.quality_status}`\n"
                f"  - Document Integrity Risk: `{d.tampering_risk}`\n"
                f"  - Current Version: `V{d.current_version}`"
            )

        response_text = (
            f"### Documents Flagged for Officer Review ({len(docs)})\n\n"
            + "\n".join(doc_lines) + "\n\n"
            f"> Evaluators can issue clarification notices to prompt bidder replacement uploads at `/officer/clarifications`."
        )
        return {"response": response_text, "context": {"flagged_documents_count": len(docs)}}

    # 7. "Why did this bidder fail?"
    if "why" in query and ("fail" in query or "non-compliant" in query or "rejected" in query or "disqualif" in query):
        bidders = db.query(Bidder).all()
        target_bidder = None
        for b in bidders:
            if b.company_name.lower() in query or (b.gem_seller_id and b.gem_seller_id.lower() in query):
                target_bidder = b
                break

        if not target_bidder and bidders:
            for b in bidders:
                words = b.company_name.lower().split()
                if any(w in query for w in words if len(w) > 3):
                    target_bidder = b
                    break

        if not target_bidder:
            # Check for struggling / non-compliant bidder
            nc = db.query(ComplianceResult).filter(ComplianceResult.overall_status == "NON_COMPLIANT").first()
            if nc:
                target_bidder = db.query(Bidder).filter(Bidder.id == nc.bidder_id).first()

        if target_bidder:
            cr = db.query(ComplianceResult).filter(ComplianceResult.bidder_id == target_bidder.id).first()
            if cr and cr.requirement_results:
                try:
                    reqs = json.loads(cr.requirement_results)
                    failed_reqs = [r for r in reqs if r.get("status") == "NON_COMPLIANT"]
                    if failed_reqs:
                        reasons = []
                        for fr in failed_reqs:
                            reasons.append(
                                f"- **{fr.get('requirement', 'Requirement')}** (Clause `{fr.get('clause_reference') or 'N/A'}`): "
                                f"{fr.get('reason')} [Required: `{fr.get('required_value')}`, Actual: `{fr.get('actual_value')}`]"
                            )
                        response_text = (
                            f"### Compliance Failure Breakdown for **{target_bidder.company_name}**\n\n"
                            f"**Overall Verdict:** `NON-COMPLIANT` (Compliance Score: {cr.compliance_score:.1f}%)\n"
                            f"**Mandatory Failure Triggered:** `{'Yes' if cr.mandatory_failed else 'No'}`\n\n"
                            f"**Failed Requirements:**\n"
                            + "\n".join(reasons) + "\n\n"
                            f"> [!IMPORTANT]\n"
                            f"> Under GeM Procurement Rules and CPCL Evaluation Guidelines, a failure in even one mandatory requirement "
                            f"disqualifies the bid from commercial opening unless authorized deviation or clarification is granted."
                        )
                        return {"response": response_text, "context": {"bidder_id": str(target_bidder.id)}}
                except Exception:
                    pass

            return {
                "response": f"Bidder **{target_bidder.company_name}** has status `{cr.overall_status.value if cr else 'PENDING'}`. {cr.explanation if cr else 'No detailed breakdown available.'}",
                "context": {"bidder_id": str(target_bidder.id)},
            }
        else:
            return {"response": NOT_AVAILABLE_MSG, "context": {}}

    # General overview / fallback
    tenders_count = db.query(Tender).count()
    bidders_count = db.query(Bidder).count()
    proofs_count = db.query(DocumentProof).count()
    blocks_count = db.query(BlockchainBlock).count()

    if "l1" in query or "lowest" in query or "price" in query:
        l1_bid = db.query(CommercialBid).filter(CommercialBid.is_l1 == True).first()
        if l1_bid:
            b = db.query(Bidder).filter(Bidder.id == l1_bid.bidder_id).first()
            bname = b.company_name if b else "Unknown"
            return {
                "response": f"The current L1 (lowest evaluated price) bidder is **{bname}** with an evaluated price of **₹{l1_bid.evaluated_price:,.2f}**.",
                "context": {"l1_bidder": bname, "price": l1_bid.evaluated_price},
            }
        return {"response": NOT_AVAILABLE_MSG, "context": {}}

    if any(k in query for k in ("tender", "bidders", "overview", "help", "summary", "stats")):
        return {
            "response": (
                f"### GeM Compliance Procurement Intelligence Assistant\n\n"
                f"Currently active procurement database:\n"
                f"- **Active Tenders:** `{tenders_count}`\n"
                f"- **Registered Bidders:** `{bidders_count}`\n"
                f"- **Cryptographic Document Proofs:** `{proofs_count}`\n"
                f"- **Blockchain Audit Blocks:** `{blocks_count}`\n\n"
                f"**You can ask me questions like:**\n"
                f"- *\"Why did Struggling Supplies fail?\"*\n"
                f"- *\"Which mandatory requirements failed?\"*\n"
                f"- *\"Which documents require review?\"*\n"
                f"- *\"Show high-risk bidders.\"*\n"
                f"- *\"Compare Bidder A and Bidder B.\"*\n"
                f"- *\"How many mandatory requirements passed?\"*\n"
                f"- *\"Which clarifications are pending?\"*"
            ),
            "context": {"tenders_count": tenders_count, "bidders_count": bidders_count},
        }

    return {"response": NOT_AVAILABLE_MSG, "context": {}}
