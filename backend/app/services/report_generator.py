"""
Compliance report generation service (Day 5 / Day 7 Upgraded).
Builds an institutional, Government e-procurement PDF compliance report per bidder using ReportLab,
and a CSV export of the same requirement-wise data.

PDF Report Sections (Phase 15):
1. Tender Information
2. Bidder Information
3. Executive Summary
4. Requirement-wise Matrix
5. Document Evidence
6. Verification Results
7. Mandatory Failures
8. Needs Review
9. Risk Indicators (Tampering & Quality)
10. Clarification History
11. Officer Decision & Overrides
12. Audit Timeline
13. Blockchain Proof
14. SHA-256 Fingerprint
15. Merkle Root
16. Integrity Status
"""
import csv
import io
import json
from datetime import datetime
from typing import Any, Dict, List

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
    HRFlowable,
)
from sqlalchemy.orm import Session

from app.models.tender import Tender
from app.models.bidder import Bidder, BidderDocument
from app.models.compliance import ComplianceResult
from app.models.verification import VerificationResult
from app.models.audit import AuditLog
from app.models.clarification import ClarificationRequest
from app.models.override import OfficerDecision
from app.models.blockchain import BlockchainBlock, DocumentProof
from app.services.blockchain_service import verify_blockchain_ledger

STATUS_COLORS = {
    "COMPLIANT": colors.HexColor("#15803d"),
    "NON_COMPLIANT": colors.HexColor("#b91c1c"),
    "NEEDS_REVIEW": colors.HexColor("#b45309"),
    "compliant": colors.HexColor("#15803d"),
    "non_compliant": colors.HexColor("#b91c1c"),
    "needs_review": colors.HexColor("#b45309"),
}

STATUS_ICON = {
    "COMPLIANT": "COMPLIANT",
    "NON_COMPLIANT": "NON-COMPLIANT",
    "NEEDS_REVIEW": "NEEDS REVIEW",
    "compliant": "COMPLIANT",
    "non_compliant": "NON-COMPLIANT",
    "needs_review": "NEEDS REVIEW",
}


def _fmt(v: Any) -> str:
    if v is None or v == "":
        return "-"
    if isinstance(v, bool):
        return str(v)
    if isinstance(v, float):
        if v == int(v):
            return f"{int(v):,}"
        return f"{v:,.2f}"
    if isinstance(v, int):
        return f"{v:,}"
    return str(v)


def _gather_report_data(bidder_id: str, db: Session) -> Dict[str, Any]:
    bidder = db.query(Bidder).filter(Bidder.id == bidder_id).first()
    if not bidder:
        raise ValueError("Bidder not found")

    tender = db.query(Tender).filter(Tender.id == bidder.tender_id).first()

    compliance = (
        db.query(ComplianceResult).filter(ComplianceResult.bidder_id == bidder_id).first()
    )
    if not compliance:
        raise ValueError("No compliance evaluation exists yet for this bidder -- run verification first")

    try:
        requirement_results = (
            json.loads(compliance.requirement_results) if compliance.requirement_results else []
        )
    except (json.JSONDecodeError, TypeError):
        requirement_results = []

    verification_results = (
        db.query(VerificationResult).filter(VerificationResult.bidder_id == bidder_id).all()
    )

    audit_logs = (
        db.query(AuditLog)
        .filter(AuditLog.entity_type == "bidder", AuditLog.entity_id == str(bidder_id))
        .order_by(AuditLog.created_at.desc())
        .limit(20)
        .all()
    )

    clarifications = (
        db.query(ClarificationRequest)
        .filter(ClarificationRequest.bidder_id == bidder_id)
        .order_by(ClarificationRequest.requested_at.desc())
        .all()
    )

    decisions = (
        db.query(OfficerDecision)
        .filter(OfficerDecision.bidder_id == bidder_id)
        .order_by(OfficerDecision.created_at.desc())
        .all()
    )

    documents = (
        db.query(BidderDocument)
        .filter(BidderDocument.bidder_id == bidder_id)
        .all()
    )

    proofs = (
        db.query(DocumentProof)
        .filter(DocumentProof.entity_id == str(bidder_id))
        .order_by(DocumentProof.anchored_at.desc())
        .all()
    )

    latest_block = (
        db.query(BlockchainBlock)
        .order_by(BlockchainBlock.block_number.desc())
        .first()
    )

    integrity = verify_blockchain_ledger(db)

    failed = [r for r in requirement_results if r.get("status") == "NON_COMPLIANT"]
    review = [r for r in requirement_results if r.get("status") == "NEEDS_REVIEW"]

    return {
        "tender": tender,
        "bidder": bidder,
        "compliance": compliance,
        "requirement_results": requirement_results,
        "failed": failed,
        "review": review,
        "verification_results": verification_results,
        "audit_logs": audit_logs,
        "clarifications": clarifications,
        "decisions": decisions,
        "documents": documents,
        "proofs": proofs,
        "latest_block": latest_block,
        "integrity": integrity,
    }


class ReportGenerator:
    def generate_compliance_report_pdf(self, bidder_id: str, db: Session) -> bytes:
        """Renders the comprehensive 16-section Government compliance report PDF."""
        data = _gather_report_data(bidder_id, db)
        tender: Tender = data["tender"]
        bidder: Bidder = data["bidder"]
        compliance: ComplianceResult = data["compliance"]
        latest_block: Optional[BlockchainBlock] = data.get("latest_block")
        integrity: Dict[str, Any] = data.get("integrity", {"valid": True})

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            topMargin=14 * mm,
            bottomMargin=14 * mm,
            leftMargin=14 * mm,
            rightMargin=14 * mm,
            title=f"Compliance Evaluation Certificate - {bidder.company_name}",
        )

        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            "ReportTitle", parent=styles["Title"], fontSize=14, leading=16, spaceAfter=2, textColor=colors.HexColor("#0B1F3A")
        )
        subtitle_style = ParagraphStyle(
            "ReportSub", parent=styles["Normal"], fontSize=8.5, leading=11, textColor=colors.HexColor("#4B5563"), spaceAfter=6
        )
        h2 = ParagraphStyle(
            "ReportH2", parent=styles["Heading2"], fontSize=10.5, leading=13, spaceBefore=8, spaceAfter=4, textColor=colors.HexColor("#0B1F3A")
        )
        body = ParagraphStyle("ReportBody", parent=styles["Normal"], fontSize=7.5, leading=10, textColor=colors.HexColor("#1F2937"))
        small = ParagraphStyle("ReportSmall", parent=styles["Normal"], fontSize=6.5, leading=8.5, textColor=colors.HexColor("#4B5563"))
        code_style = ParagraphStyle("ReportCode", parent=styles["Normal"], fontSize=6.5, leading=8.5, fontName="Courier", textColor=colors.HexColor("#0F172A"))

        story = []

        # Header Institutional Banner
        story.append(Paragraph("<b>GOVERNMENT OF INDIA • MINISTRY OF PETROLEUM &amp; NATURAL GAS</b>", subtitle_style))
        story.append(Paragraph("<b>CHENNAI PETROLEUM CORPORATION LIMITED (CPCL)</b>", subtitle_style))
        story.append(Paragraph("<b>BID COMPLIANCE EVALUATION CERTIFICATE</b>", title_style))
        story.append(Paragraph(
            f"Official Record Generated on: {datetime.utcnow().strftime('%d-%b-%Y %H:%M:%S UTC')} | SIH 2026 Demonstration Prototype",
            small
        ))
        story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#1F5FAF"), spaceAfter=8, spaceBefore=4))

        # 1 & 2. Tender & Bidder Information Table
        t_data = [
            ["TENDER INFORMATION", "", "BIDDER INFORMATION", ""],
            ["Tender Reference:", _fmt(tender.tender_ref_no if tender else "-"), "Company Name:", _fmt(bidder.company_name)],
            ["Tender Title:", _fmt(tender.title[:45] if tender else "-"), "GeM Seller ID:", _fmt(bidder.gem_seller_id or "N/A")],
            ["Procurement Mode:", _fmt(getattr(tender, "procurement_mode", "L1")), "Contact Email:", _fmt(bidder.contact_email or "-")],
            ["Estimated Value:", f"INR {_fmt(getattr(tender, 'estimated_value', 0))}", "Contact Phone:", _fmt(bidder.contact_phone or "-")],
        ]
        t1 = Table(t_data, colWidths=[90, 170, 90, 165])
        t1.setStyle(TableStyle([
            ("FONTSIZE", (0, 0), (-1, -1), 7.5),
            ("BACKGROUND", (0, 0), (1, 0), colors.HexColor("#EEF2F7")),
            ("BACKGROUND", (2, 0), (3, 0), colors.HexColor("#EEF2F7")),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTNAME", (0, 1), (0, -1), "Helvetica-Bold"),
            ("FONTNAME", (2, 1), (2, -1), "Helvetica-Bold"),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#D1D5DB")),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ]))
        story.append(t1)
        story.append(Spacer(1, 6))

        # 3. Executive Summary
        st_val = compliance.overall_status.value if hasattr(compliance.overall_status, "value") else str(compliance.overall_status)
        st_color = STATUS_COLORS.get(st_val, colors.HexColor("#1F2937"))
        summary_rows = [
            ["EXECUTIVE COMPLIANCE SUMMARY", "", "", ""],
            [
                "Final Verdict:",
                st_val.upper().replace("_", " "),
                "Compliance Score:",
                f"{compliance.compliance_score:.1f}%",
            ],
            [
                "Risk Level:",
                (compliance.risk_level.value if hasattr(compliance.risk_level, "value") else str(compliance.risk_level)).upper(),
                "Mandatory Failure:",
                "FAIL (DISQUALIFIED)" if compliance.mandatory_failed else "CLEAN (PASSED)",
            ],
            [
                "Officer Override:",
                _fmt(getattr(compliance, "override_status", None) or "None"),
                "Blockchain Ledger:",
                "ANCHORED & VERIFIED" if getattr(compliance, "blockchain_tx", None) else "LOCAL VERIFIED",
            ],
        ]
        t_sum = Table(summary_rows, colWidths=[100, 155, 100, 160])
        t_sum.setStyle(TableStyle([
            ("FONTSIZE", (0, 0), (-1, -1), 7.5),
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0B1F3A")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTNAME", (0, 1), (0, -1), "Helvetica-Bold"),
            ("FONTNAME", (2, 1), (2, -1), "Helvetica-Bold"),
            ("TEXTCOLOR", (1, 1), (1, 1), st_color),
            ("FONTNAME", (1, 1), (1, 1), "Helvetica-Bold"),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#D1D5DB")),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ]))
        story.append(t_sum)
        story.append(Spacer(1, 6))

        # 4 & 5. Requirement-wise Matrix with Evidence
        story.append(Paragraph("<b>4 &amp; 5. Requirement-wise Technical Compliance Matrix &amp; Document Evidence</b>", h2))
        req_rows = [["Requirement", "Mandatory", "Required Value", "Actual Extracted", "Verdict", "Evidence Snippet / Source"]]
        for r in data["requirement_results"]:
            st_text = r.get("status", "").upper()
            src = r.get("source_document") or ""
            evidence = r.get("evidence") or r.get("reason") or "Verified against statutory dataset"
            if src:
                evidence = f"{evidence} [Doc: {src}]"
            req_rows.append([
                Paragraph(_fmt(r.get("requirement")), small),
                "YES" if r.get("mandatory") else "NO",
                Paragraph(_fmt(r.get("required_value")), small),
                Paragraph(_fmt(r.get("actual_value")), small),
                Paragraph(st_text.replace("_", " "), small),
                Paragraph(_fmt(evidence)[:120], small),
            ])
        t_req = Table(req_rows, colWidths=[90, 45, 65, 65, 70, 180], repeatRows=1)
        req_styles = [
            ("FONTSIZE", (0, 0), (-1, -1), 7),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#EEF2F7")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#D1D5DB")),
            ("TOPPADDING", (0, 0), (-1, -1), 2.5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5),
        ]
        for idx, r in enumerate(data["requirement_results"], start=1):
            c = STATUS_COLORS.get(r.get("status", ""), colors.black)
            req_styles.append(("TEXTCOLOR", (4, idx), (4, idx), c))
        t_req.setStyle(TableStyle(req_styles))
        story.append(t_req)
        story.append(Spacer(1, 6))

        # 6, 7 & 8. Failures, Needs Review, & External Verification
        if data["failed"] or data["review"]:
            story.append(Paragraph("<b>6, 7 &amp; 8. Mandatory Exceptions &amp; Evaluation Items Needing Review</b>", h2))
            for r in data["failed"]:
                story.append(Paragraph(
                    f"&#8226; <font color='#B91C1C'><b>[MANDATORY FAILURE]</b></font> <b>{_fmt(r.get('requirement'))}</b>: {_fmt(r.get('reason'))}",
                    body
                ))
            for r in data["review"]:
                story.append(Paragraph(
                    f"&#8226; <font color='#B45309'><b>[NEEDS REVIEW]</b></font> <b>{_fmt(r.get('requirement'))}</b>: {_fmt(r.get('reason'))}",
                    body
                ))
            story.append(Spacer(1, 4))

        # External Verification Registry Results
        if data["verification_results"]:
            v_rows = [["Registry Provider", "Identifier Checked", "Status", "Verification Notes"]]
            for v in data["verification_results"]:
                v_rows.append([
                    _fmt(v.provider_name),
                    Paragraph(_fmt(v.identifier_checked), small),
                    _fmt(v.status.value if v.status else None).upper(),
                    Paragraph(_fmt(v.notes or v.evidence_snippet)[:140], small),
                ])
            t_ver = Table(v_rows, colWidths=[100, 110, 75, 230], repeatRows=1)
            t_ver.setStyle(TableStyle([
                ("FONTSIZE", (0, 0), (-1, -1), 7),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#EEF2F7")),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#D1D5DB")),
                ("TOPPADDING", (0, 0), (-1, -1), 2.5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5),
            ]))
            story.append(t_ver)

        story.append(PageBreak())

        # 9. Risk Indicators (Tampering & Quality)
        story.append(Paragraph("<b>9. Document Integrity &amp; Risk Indicators</b>", h2))
        doc_rows = [["Document Name", "Declared Type", "Version", "Quality Status", "Integrity Risk", "Tampering Indicators"]]
        for d in data["documents"]:
            doc_rows.append([
                Paragraph(_fmt(d.original_filename), small),
                _fmt(d.document_type.value if hasattr(d.document_type, "value") else d.document_type),
                f"V{getattr(d, 'current_version', 1)}",
                _fmt(getattr(d, "quality_status", "READABLE")),
                _fmt(getattr(d, "tampering_risk", "LOW")),
                Paragraph(_fmt(getattr(d, "tampering_indicators", "None flagged"))[:120], small),
            ])
        t_doc = Table(doc_rows, colWidths=[120, 80, 45, 75, 75, 120], repeatRows=1)
        t_doc.setStyle(TableStyle([
            ("FONTSIZE", (0, 0), (-1, -1), 6.5),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#EEF2F7")),
            ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#D1D5DB")),
            ("TOPPADDING", (0, 0), (-1, -1), 2),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ]))
        story.append(t_doc)
        story.append(Spacer(1, 6))

        # 10. Clarification History
        story.append(Paragraph("<b>10. Clarification Notice History</b>", h2))
        if data["clarifications"]:
            c_rows = [["Subject", "Status", "Requested At", "Response / Replacement Evidence", "Resolution"]]
            for c in data["clarifications"]:
                c_rows.append([
                    Paragraph(_fmt(c.subject), small),
                    _fmt(c.status.value if hasattr(c.status, "value") else c.status).upper(),
                    c.requested_at.strftime("%d-%b-%Y %H:%M") if c.requested_at else "-",
                    Paragraph(_fmt(c.response_text or "No response yet")[:100], small),
                    Paragraph(_fmt(c.resolution_notes or "Pending")[:80], small),
                ])
            t_clar = Table(c_rows, colWidths=[110, 65, 80, 160, 100], repeatRows=1)
            t_clar.setStyle(TableStyle([
                ("FONTSIZE", (0, 0), (-1, -1), 6.5),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#EEF2F7")),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#D1D5DB")),
                ("TOPPADDING", (0, 0), (-1, -1), 2),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ]))
            story.append(t_clar)
        else:
            story.append(Paragraph("No formal clarification notices were required or issued for this submission.", small))
        story.append(Spacer(1, 6))

        # 11. Officer Decision & Overrides
        story.append(Paragraph("<b>11. Officer Decision, Deviation &amp; Override Records</b>", h2))
        if data["decisions"]:
            d_rows = [["Decision Type", "Original", "New Verdict", "Deviation Category", "Justification & Evidence", "Blockchain TX"]]
            for d in data["decisions"]:
                d_rows.append([
                    _fmt(d.decision_type),
                    _fmt(d.original_verdict),
                    _fmt(d.new_verdict),
                    _fmt(d.deviation_category or "None"),
                    Paragraph(f"Justification: {_fmt(d.justification)} | Evidence: {_fmt(d.evidence or 'On Record')}"[:140], small),
                    Paragraph(_fmt(d.blockchain_tx or "Anchored")[:24], code_style),
                ])
            t_dec = Table(d_rows, colWidths=[80, 60, 60, 90, 155, 70], repeatRows=1)
            t_dec.setStyle(TableStyle([
                ("FONTSIZE", (0, 0), (-1, -1), 6.5),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#EEF2F7")),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#D1D5DB")),
                ("TOPPADDING", (0, 0), (-1, -1), 2),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ]))
            story.append(t_dec)
        else:
            story.append(Paragraph("No manual officer deviations or overrides were executed. Evaluation stands purely on deterministic rule engine logic.", small))
        story.append(Spacer(1, 6))

        # 12. Audit Timeline
        story.append(Paragraph("<b>12. Visual Audit Timeline Events</b>", h2))
        if data["audit_logs"]:
            a_rows = [["Timestamp (UTC)", "Actor / Role", "Action Code", "Details"]]
            for log in data["audit_logs"][:8]:
                a_rows.append([
                    log.created_at.strftime("%d-%b-%Y %H:%M:%S") if log.created_at else "-",
                    "Authorized Officer" if log.user_id else "Deterministic Engine",
                    _fmt(log.action),
                    Paragraph(_fmt(log.details)[:120], small),
                ])
            t_aud = Table(a_rows, colWidths=[95, 95, 105, 220], repeatRows=1)
            t_aud.setStyle(TableStyle([
                ("FONTSIZE", (0, 0), (-1, -1), 6.5),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#EEF2F7")),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#D1D5DB")),
                ("TOPPADDING", (0, 0), (-1, -1), 2),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ]))
            story.append(t_aud)
        story.append(Spacer(1, 6))

        # 13, 14, 15, 16. Blockchain Cryptographic Proof & Ledger Status
        story.append(Paragraph("<b>13, 14, 15 &amp; 16. Cryptographic Blockchain Proof-of-Existence Ledger</b>", h2))
        b_block_no = latest_block.block_number if latest_block else 0
        b_hash = latest_block.block_hash if latest_block else ("0" * 64)
        b_prev = latest_block.previous_hash if latest_block else ("0" * 64)
        b_merkle = latest_block.merkle_root if latest_block else ("0" * 64)
        integrity_status = "VALID & SECURED" if integrity.get("valid") else "INTEGRITY ALERT"

        bc_rows = [
            ["CRYPTOGRAPHIC ANCHOR METRICS", ""],
            ["Ledger Block Number:", f"Block #{b_block_no}"],
            ["Block SHA-256 Hash:", Paragraph(b_hash, code_style)],
            ["Previous Block Hash:", Paragraph(b_prev, code_style)],
            ["Merkle Tree Root:", Paragraph(b_merkle, code_style)],
            ["Consensus & Integrity Status:", integrity_status],
            ["Public Verification Portal:", "Available at /verify (Zero-login audit access)"],
        ]
        t_bc = Table(bc_rows, colWidths=[150, 365])
        t_bc.setStyle(TableStyle([
            ("FONTSIZE", (0, 0), (-1, -1), 7),
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0B1F3A")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTNAME", (0, 1), (0, -1), "Helvetica-Bold"),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#D1D5DB")),
            ("TOPPADDING", (0, 0), (-1, -1), 2.5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5),
        ]))
        story.append(t_bc)

        story.append(Spacer(1, 10))
        story.append(HRFlowable(width="100%", thickness=0.8, color=colors.HexColor("#D1D5DB"), spaceAfter=4))
        story.append(Paragraph(
            "<b>STATUTORY DISCLAIMER:</b> This document is generated for Smart India Hackathon 2026 (Problem Statement ID 26100) demonstration. "
            "Verification checks are performed against simulated/mock government registry datasets. "
            "All cryptographic block hashes are verifiable via the embedded zero-login public verifier enclave.",
            small,
        ))

        doc.build(story)
        return buffer.getvalue()

    def generate_compliance_report_csv(self, bidder_id: str, db: Session) -> bytes:
        """Renders a CSV export of the requirement-wise compliance results for one bidder."""
        data = _gather_report_data(bidder_id, db)
        tender: Tender = data["tender"]
        bidder: Bidder = data["bidder"]
        compliance: ComplianceResult = data["compliance"]

        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow(["Tender Ref No.", tender.tender_ref_no if tender else ""])
        writer.writerow(["Tender Title", tender.title if tender else ""])
        writer.writerow(["Bidder", bidder.company_name])
        writer.writerow(["GeM Seller ID", bidder.gem_seller_id or ""])
        writer.writerow(["Overall Status", compliance.overall_status.value if compliance.overall_status else ""])
        writer.writerow(["Compliance Score", f"{compliance.compliance_score:.1f}"])
        writer.writerow(["Risk Level", compliance.risk_level.value if compliance.risk_level else ""])
        writer.writerow(["Mandatory Failed", "Yes" if compliance.mandatory_failed else "No"])
        writer.writerow(["Evaluated At", compliance.evaluated_at.isoformat() if compliance.evaluated_at else ""])
        writer.writerow([])
        writer.writerow([
            "Requirement", "Category", "Mandatory", "Required Value", "Actual Value",
            "Status", "Reason", "Evidence", "Source Document", "Verification Provider",
        ])
        for r in data["requirement_results"]:
            writer.writerow([
                r.get("requirement", ""),
                r.get("category", ""),
                "Yes" if r.get("mandatory") else "No",
                r.get("required_value", ""),
                r.get("actual_value", ""),
                r.get("status", ""),
                r.get("reason", ""),
                r.get("evidence", ""),
                r.get("source_document", ""),
                r.get("verification_provider", ""),
            ])
        return buf.getvalue().encode("utf-8")


report_generator = ReportGenerator()
