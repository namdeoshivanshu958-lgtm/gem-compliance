"""
Document Quality and Tampering Risk Intelligence Service (Phase 8).
Analyzes uploaded bidder documents for:
- Quality (readability, page completeness, low resolution)
- Temporal anomalies (expired certificates, future dates)
- Consistency discrepancies (company name / GSTIN / PAN mismatches)
- Metadata anomalies
- Digital tampering risk indicators

Provides decision support: LOW, MEDIUM, or HIGH risk.
High-risk documents automatically trigger needs_review = True.
"""
import json
import re
from datetime import datetime
from typing import Any, Dict, List, Optional

from app.models.bidder import Bidder, BidderDocument
from app.models.document import ExtractedDocumentData


def analyze_document_tampering(
    document: BidderDocument,
    extracted_data: Optional[ExtractedDocumentData],
    bidder: Optional[Bidder],
) -> Dict[str, Any]:
    """
    Evaluates document integrity and potential tampering risk indicators.
    Returns: LOW, MEDIUM, or HIGH risk.
    Wording: 'Document Integrity Risk' / 'Potential Tampering Indicator'
    NEVER claims 'Fraud confirmed'.
    HIGH risk triggers needs_review = True.
    """
    indicators: List[str] = []
    risk_level = "LOW"
    quality_status = "READABLE"

    # 1. Readability & Text Quality
    text = document.extracted_text or ""
    text_len = len(text.strip())

    if text_len < 30:
        indicators.append("Potential Tampering Indicator: Unreadable scan or missing text content (< 30 characters)")
        quality_status = "UNREADABLE"
        risk_level = "HIGH"
    elif text_len < 100:
        indicators.append("Document Integrity Risk: Low text density extracted (< 100 characters); verify scan clarity")
        quality_status = "LOW_RESOLUTION"
        if risk_level == "LOW":
            risk_level = "MEDIUM"

    # 2. Page Count Analysis
    if document.page_count is not None and document.page_count <= 0:
        indicators.append("Potential Tampering Indicator: Document has 0 readable pages or missing pages")
        quality_status = "INCOMPLETE"
        risk_level = "HIGH"

    # 3. AI Extraction Confidence Check
    if extracted_data:
        if extracted_data.type_mismatch:
            indicators.append(
                f"Document Integrity Risk: Declared document type '{document.document_type.value}' differs from AI detected type '{extracted_data.detected_document_type}'"
            )
            if risk_level == "LOW":
                risk_level = "MEDIUM"

        if extracted_data.confidence is not None and extracted_data.confidence < 0.45:
            indicators.append(
                f"Document Integrity Risk: Low AI extraction confidence ({round(extracted_data.confidence * 100, 1)}%); potential OCR distortion or alteration"
            )
            if risk_level == "LOW":
                risk_level = "MEDIUM"

        # Check structured fields for cross-consistency
        if extracted_data.structured_fields and bidder:
            try:
                fields = json.loads(extracted_data.structured_fields)

                # Check company name match if present
                doc_company = fields.get("company_name")
                if doc_company and bidder.company_name:
                    clean_doc = re.sub(r'[^a-zA-Z0-9]', '', str(doc_company).lower())
                    clean_bid = re.sub(r'[^a-zA-Z0-9]', '', str(bidder.company_name).lower())
                    if clean_doc and clean_bid and clean_doc not in clean_bid and clean_bid not in clean_doc:
                        indicators.append(
                            f"Potential Tampering Indicator: Company name on document ('{doc_company}') does not match registered bidder ('{bidder.company_name}')"
                        )
                        risk_level = "HIGH"

                # Check GSTIN structure if document is GST
                gstin = fields.get("gstin")
                if gstin:
                    gstin_clean = str(gstin).strip().upper()
                    if not re.match(r'^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$', gstin_clean):
                        indicators.append(f"Document Integrity Risk: Extracted GSTIN '{gstin_clean}' does not conform to standard 15-character statutory format")
                        if risk_level == "LOW":
                            risk_level = "MEDIUM"

                # Check PAN structure if document is PAN
                pan = fields.get("pan")
                if pan:
                    pan_clean = str(pan).strip().upper()
                    if not re.match(r'^[A-Z]{5}[0-9]{4}[A-Z]{1}$', pan_clean):
                        indicators.append(f"Document Integrity Risk: Extracted PAN '{pan_clean}' does not conform to standard 10-character statutory format")
                        if risk_level == "LOW":
                            risk_level = "MEDIUM"

                # Cross-check: If both PAN and GSTIN are present or extracted from other docs, verify GSTIN embeds PAN
                if gstin and pan:
                    gstin_str = str(gstin).strip().upper()
                    pan_str = str(pan).strip().upper()
                    if len(gstin_str) == 15 and len(pan_str) == 10:
                        embedded_pan = gstin_str[2:12]
                        if embedded_pan != pan_str:
                            indicators.append(
                                f"Potential Tampering Indicator: Certificate number mismatch: PAN embedded in GSTIN ('{embedded_pan}') differs from PAN card ('{pan_str}')"
                            )
                            risk_level = "HIGH"

                # Check certificate expiration date
                valid_until = fields.get("valid_until") or fields.get("expiry_date")
                if valid_until:
                    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"):
                        try:
                            exp_date = datetime.strptime(str(valid_until).strip(), fmt)
                            if exp_date < datetime.utcnow():
                                indicators.append(f"Potential Tampering Indicator: Expired certificate (validity ended on {valid_until})")
                                risk_level = "HIGH"
                            break
                        except ValueError:
                            pass

                # Check for inconsistent dates (e.g., issue date in future)
                issue_date = fields.get("issue_date") or fields.get("registration_date")
                if issue_date:
                    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"):
                        try:
                            iss_dt = datetime.strptime(str(issue_date).strip(), fmt)
                            if iss_dt > datetime.utcnow():
                                indicators.append(f"Potential Tampering Indicator: Inconsistent dates: Issue date is in the future ({issue_date})")
                                risk_level = "HIGH"
                            break
                        except ValueError:
                            pass

            except (json.JSONDecodeError, TypeError):
                pass

    # 4. Duplicate document check across bidder's uploaded documents
    if bidder and hasattr(bidder, "documents") and bidder.documents:
        for other_doc in bidder.documents:
            if str(other_doc.id) != str(document.id):
                if other_doc.original_filename == document.original_filename and other_doc.file_path != document.file_path:
                    indicators.append(f"Document Integrity Risk: Duplicate document filename detected ('{document.original_filename}')")
                    if risk_level == "LOW":
                        risk_level = "MEDIUM"

    # Final Risk determination
    if len(indicators) >= 2 and risk_level != "HIGH":
        risk_level = "HIGH"
    elif len(indicators) >= 1 and risk_level == "LOW":
        risk_level = "MEDIUM"

    return {
        "tampering_risk": risk_level,
        "quality_status": quality_status,
        "tampering_indicators": indicators,
        "needs_review": risk_level in ("MEDIUM", "HIGH"),
        "verdict_label": f"Document Integrity Risk: {risk_level}",
    }
