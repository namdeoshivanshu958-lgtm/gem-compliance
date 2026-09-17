"""
Demo data seeder — SIH 2026, PS 26100 (Day 6 stabilization).

Creates one fully-processed demo tender with three bidders that land on the
three verdicts the judges need to see:

  1. COMPLIANT TRADERS PRIVATE LIMITED   -> COMPLIANT
  2. STRUGGLING SUPPLIES LLP             -> NON_COMPLIANT  (GST cancelled, mandatory)
  3. RELIABLE ENGINEERING WORKS          -> NEEDS_REVIEW   (turnover doc missing / low confidence)

This intentionally bypasses the live Gemini calls (tender requirement
extraction + bidder document extraction) and instead writes the SAME rows
those AI stages would have produced, then runs the REAL, unmodified
verification_service and compliance_engine against them — so what you see
in the UI after running this script is the actual rule engine deciding the
verdicts, not a hand-faked result.

ALL data below is fictional. GSTIN/PAN/CIN values match app/services/
mock_verification_data.py — Anthropic did not verify these against, and they
do not represent, any real government registry.

Run with:  python seed_demo_data.py
Safe to re-run: clears any previous demo tender/bidders it created first.
"""
import json
import uuid
from datetime import datetime, timedelta

from app.database import SessionLocal
from app.models.user import User, UserRole
from app.models.tender import (
    Tender, TenderRequirement, TenderStatus, ProcessingStatus,
    RequirementCategory, VerificationType,
)
from app.models.bidder import (
    Bidder, BidderDocument, BidderDocumentType, DocumentProcessingStatus,
    BidderConsistencyStatus,
)
from app.models.document import ExtractedDocumentData
from app.models.verification import VerificationResult
from app.models.compliance import ComplianceResult
from app.models.notice import OfficialNotice
from app.models.commercial import CommercialBid
from app.models.clarification import ClarificationRequest, ClarificationStatus
from app.core.security import hash_password
from app.services.verification_service import verification_service
from app.services.compliance_engine import compliance_engine
from app.services.bidder_consistency_service import analyze_bidder
from app.services.blockchain_service import anchor_file_bytes, verify_blockchain_ledger
from app.services.commercial_evaluation_service import evaluate_commercial_bids

DEMO_TENDER_REF = "GEM/2026/B/6541278"


def _mk_requirement(tender_id, seq, **kw):
    defaults = dict(
        id=uuid.uuid4(), tender_id=tender_id, sequence_no=seq,
        extracted_by_ai=True, needs_review=False, confidence=0.9,
        created_at=datetime.utcnow(),
    )
    defaults.update(kw)
    return TenderRequirement(**defaults)


def _mk_document(bidder_id, doc_type, filename, **kw):
    defaults = dict(
        id=uuid.uuid4(), bidder_id=bidder_id, document_type=doc_type,
        file_path=f"./uploads/demo/{filename}", original_filename=filename,
        file_kind="pdf", uploaded_at=datetime.utcnow(),
        processing_status=DocumentProcessingStatus.COMPLETED,
        extraction_method="pymupdf", page_count=1,
    )
    defaults.update(kw)
    return BidderDocument(**defaults)


def _mk_extracted(document_id, fields, **kw):
    defaults = dict(
        id=uuid.uuid4(), bidder_document_id=document_id,
        structured_fields=json.dumps(fields), missing_fields=[],
        is_readable=True, needs_review=False, type_mismatch=False,
        confidence=0.92, page_number=1, extracted_at=datetime.utcnow(),
    )
    defaults.update(kw)
    return ExtractedDocumentData(**defaults)


def seed():
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.email == "admin@cpcl.gem").first()
        if not admin:
            raise SystemExit("Run init_db.py first (no admin user found).")

        # --- clean slate: remove any previous demo tender ---
        existing = db.query(Tender).filter(Tender.tender_ref_no == DEMO_TENDER_REF).first()
        if existing:
            print(f"Removing previous demo tender {DEMO_TENDER_REF}...")
            old_bidder_ids = [b.id for b in existing.bidders]
            old_req_ids = [r.id for r in existing.requirements]
            if old_req_ids:
                db.query(VerificationResult).filter(
                    VerificationResult.requirement_id.in_(old_req_ids)
                ).delete(synchronize_session=False)
            if old_bidder_ids:
                from app.models.notification import Notification
                db.query(Notification).filter(Notification.bidder_id.in_(old_bidder_ids)).delete(synchronize_session=False)
                db.query(CommercialBid).filter(CommercialBid.bidder_id.in_(old_bidder_ids)).delete(synchronize_session=False)
                db.query(ClarificationRequest).filter(ClarificationRequest.bidder_id.in_(old_bidder_ids)).delete(synchronize_session=False)
                db.query(ComplianceResult).filter(
                    ComplianceResult.bidder_id.in_(old_bidder_ids)
                ).delete(synchronize_session=False)
            db.delete(existing)
            db.commit()

        print("Creating demo tender...")
        tender = Tender(
            id=uuid.uuid4(),
            tender_ref_no=DEMO_TENDER_REF,
            title="Supply, Installation and Commissioning of Laptops",
            department="Information Technology Division",
            organization="Chennai Petroleum Corporation Limited (CPCL)",
            description=(
                "GeM tender for supply of 250 business-grade laptops with 3-year "
                "onsite warranty for CPCL Manali Refinery IT infrastructure upgrade."
            ),
            status=TenderStatus.UNDER_EVALUATION,
            tender_date=datetime.utcnow() - timedelta(days=21),
            deadline=datetime.utcnow() + timedelta(days=9),
            document_path="./sample-data/sample_tender_GEM_2026_B_6541278.pdf",
            extraction_method="pymupdf",
            page_count=5,
            processing_status=ProcessingStatus.COMPLETED,
            procurement_mode="L1",
            category="Equipment",
            estimated_value=50000000.0,
            created_by=admin.id,
        )
        db.add(tender)
        db.flush()

        # --- Requirements (mirrors what Gemini would extract from the sample PDF) ---
        reqs = [
            _mk_requirement(
                tender.id, 1, category=RequirementCategory.GST, title="Valid & Active GST Registration",
                description="Bidder must hold a valid, Active GST registration in India.",
                clause_reference="Clause 3.1", mandatory=True,
                required_documents=["GST Registration Certificate"],
                verification_type=VerificationType.DATABASE_CHECK,
                evidence="The bidder shall furnish a valid GST registration certificate; the GSTIN must be Active as on the date of bid submission.",
                page_number=2,
            ),
            _mk_requirement(
                tender.id, 2, category=RequirementCategory.PAN, title="Valid PAN of the Bidder",
                description="Bidder must possess a valid Permanent Account Number (PAN).",
                clause_reference="Clause 3.2", mandatory=True,
                required_documents=["PAN Card"],
                verification_type=VerificationType.DATABASE_CHECK,
                evidence="Bidders shall submit a copy of their PAN card as proof of identity for tax purposes.",
                page_number=2,
            ),
            _mk_requirement(
                tender.id, 3, category=RequirementCategory.TURNOVER, title="Minimum Annual Turnover",
                description="Bidder must have a minimum average annual turnover of Rs. 2 crore over the last 3 financial years.",
                clause_reference="Clause 4.1", mandatory=True,
                minimum_value=20000000, currency="INR", period="last 3 financial years",
                required_documents=["Audited Financial Statements", "Turnover Certificate from CA"],
                verification_type=VerificationType.THRESHOLD,
                evidence="The bidder must have a minimum average annual turnover of Rs. 2 crore during the last three (3) financial years, certified by a practicing Chartered Accountant.",
                page_number=3,
            ),
            _mk_requirement(
                tender.id, 4, category=RequirementCategory.COMPANY_REGISTRATION, title="Company Registration / Incorporation",
                description="Bidder firm must be legally registered/incorporated in India.",
                clause_reference="Clause 3.3", mandatory=True,
                required_documents=["Certificate of Incorporation"],
                verification_type=VerificationType.DOCUMENT,
                evidence="The bidder must be a legally registered entity in India, evidenced by a Certificate of Incorporation or equivalent registration document.",
                page_number=2,
            ),
            _mk_requirement(
                tender.id, 5, category=RequirementCategory.UDYAM_MSME, title="MSME / Udyam Registration (if applicable)",
                description="MSME bidders claiming EMD exemption/preference must submit a valid Udyam registration.",
                clause_reference="Clause 5.4", mandatory=False,
                required_documents=["Udyam Registration Certificate"],
                verification_type=VerificationType.DATABASE_CHECK,
                evidence="MSME bidders seeking EMD exemption or purchase preference must submit a valid Udyam Registration Certificate.",
                page_number=4, confidence=0.81,
            ),
            _mk_requirement(
                tender.id, 6, category=RequirementCategory.BLACKLIST_DEBARMENT, title="Not Blacklisted / Debarred",
                description="Bidder must not be currently blacklisted or debarred by any Government/PSU/GeM.",
                clause_reference="Clause 3.6", mandatory=True,
                required_documents=[],
                verification_type=VerificationType.DATABASE_CHECK,
                evidence="Bidders who are currently blacklisted or debarred by any Central/State Government department, PSU, or on the GeM platform are not eligible to participate.",
                page_number=2,
            ),
        ]
        db.add_all(reqs)
        db.flush()
        req_by_cat = {r.category.value: r for r in reqs}

        # =================================================================
        # Bidder 1 — COMPLIANT TRADERS PRIVATE LIMITED -> expected COMPLIANT
        # =================================================================
        b1 = Bidder(
            id=uuid.uuid4(), tender_id=tender.id,
            company_name="Compliant Traders Private Limited",
            gem_seller_id="GEM-SLR-2019-0004521",
            contact_email="tenders@compliant-traders.example.in",
            contact_phone="+91-9840012345",
            created_by=admin.id,
        )
        db.add(b1)
        db.flush()

        b1_docs = [
            (BidderDocumentType.GST, "GST_Certificate.pdf", {
                "company_name": "COMPLIANT TRADERS PRIVATE LIMITED", "gstin": "33AAACC1206D1ZM",
                "status": "Active", "registration_date": "2019-07-01",
            }, "gst"),
            (BidderDocumentType.PAN, "PAN_Card.pdf", {
                "company_name": "COMPLIANT TRADERS PRIVATE LIMITED", "pan": "AAACC1206D", "status": "Valid",
            }, "pan"),
            (BidderDocumentType.COMPANY_REGISTRATION, "Certificate_of_Incorporation.pdf", {
                "company_name": "COMPLIANT TRADERS PRIVATE LIMITED", "cin": "U29100TN2015PTC098765",
                "registration_date": "2015-09-14", "registered_address": "Guindy Industrial Estate, Chennai",
            }, "company_registration"),
            (BidderDocumentType.TURNOVER_CERTIFICATE, "Turnover_Certificate_CA.pdf", {
                "company_name": "COMPLIANT TRADERS PRIVATE LIMITED", "turnover_amount": 45000000,
                "currency": "INR", "period": "FY 2022-23", "certifying_authority": "R. Krishnan & Co, Chartered Accountants",
            }, "turnover_certificate"),
            (BidderDocumentType.UDYAM_MSME, "Udyam_Registration_Certificate.pdf", {
                "company_name": "COMPLIANT TRADERS PRIVATE LIMITED", "udyam_registration_number": "UDYAM-TN-03-0012345",
                "enterprise_category": "Small", "registration_date": "2021-02-11",
            }, "udyam_msme"),
        ]
        for doc_type, filename, fields, detected in b1_docs:
            doc = _mk_document(b1.id, doc_type, filename)
            db.add(doc)
            db.flush()
            db.add(_mk_extracted(doc.id, fields, detected_document_type=detected, confidence=0.95))

        # =================================================================
        # Bidder 2 — STRUGGLING SUPPLIES LLP -> expected NON_COMPLIANT
        # (mandatory GST requirement fails: registry status = Cancelled)
        # =================================================================
        b2 = Bidder(
            id=uuid.uuid4(), tender_id=tender.id,
            company_name="Struggling Supplies LLP",
            gem_seller_id="GEM-SLR-2018-0009981",
            contact_email="accounts@strugglingsupplies.example.in",
            contact_phone="+91-9884456789",
            created_by=admin.id,
        )
        db.add(b2)
        db.flush()

        b2_docs = [
            (BidderDocumentType.GST, "GST_Certificate.pdf", {
                "company_name": "STRUGGLING SUPPLIES LLP", "gstin": "07AABCU9603R1ZM",
                "status": "Cancelled", "registration_date": "2018-03-10",
            }, "gst"),
            (BidderDocumentType.PAN, "PAN_Card.pdf", {
                "company_name": "STRUGGLING SUPPLIES LLP", "pan": "AABCU9603R", "status": "Valid",
            }, "pan"),
            (BidderDocumentType.COMPANY_REGISTRATION, "Certificate_of_Incorporation.pdf", {
                "company_name": "STRUGGLING SUPPLIES LLP", "cin": "U27100MH2010PLC112233",
                "registration_date": "2010-04-02", "registered_address": "MIDC Andheri, Mumbai",
            }, "company_registration"),
            (BidderDocumentType.TURNOVER_CERTIFICATE, "Turnover_Certificate_CA.pdf", {
                "company_name": "STRUGGLING SUPPLIES LLP", "turnover_amount": 8500000,
                "currency": "INR", "period": "FY 2022-23", "certifying_authority": "M. Iyer & Associates",
            }, "turnover_certificate"),
        ]
        for doc_type, filename, fields, detected in b2_docs:
            doc = _mk_document(b2.id, doc_type, filename)
            db.add(doc)
            db.flush()
            db.add(_mk_extracted(doc.id, fields, detected_document_type=detected, confidence=0.93))

        # =================================================================
        # Bidder 3 — RELIABLE ENGINEERING WORKS -> expected NEEDS_REVIEW
        # (GST/PAN clean, but turnover certificate was illegible/low-confidence
        #  and Udyam number wasn't found in the mock registry -> manual review)
        # =================================================================
        b3 = Bidder(
            id=uuid.uuid4(), tender_id=tender.id,
            company_name="Reliable Engineering Works",
            gem_seller_id="GEM-SLR-2020-0002214",
            contact_email="info@reliableeng.example.in",
            contact_phone="+91-9791122334",
            created_by=admin.id,
        )
        db.add(b3)
        db.flush()

        rew_gst_doc = _mk_document(b3.id, BidderDocumentType.GST, "GST_Certificate.pdf")
        db.add(rew_gst_doc)
        db.flush()
        db.add(_mk_extracted(rew_gst_doc.id, {
            "company_name": "RELIABLE ENGINEERING WORKS", "gstin": "27AAAPL2356Q1Z7",
            "status": "Active", "registration_date": "2020-01-15",
        }, detected_document_type="gst", confidence=0.94))

        rew_pan_doc = _mk_document(b3.id, BidderDocumentType.PAN, "PAN_Card.pdf")
        db.add(rew_pan_doc)
        db.flush()
        db.add(_mk_extracted(rew_pan_doc.id, {
            "company_name": "RELIABLE ENGINEERING WORKS", "pan": "AAAPL2356Q", "status": "Valid",
        }, detected_document_type="pan", confidence=0.94))

        rew_reg_doc = _mk_document(b3.id, BidderDocumentType.COMPANY_REGISTRATION, "Partnership_Deed.pdf")
        db.add(rew_reg_doc)
        db.flush()
        db.add(_mk_extracted(rew_reg_doc.id, {
            "company_name": "RELIABLE ENGINEERING WORKS", "cin": None,
            "registration_date": "2020-01-10", "registered_address": "Ambattur Industrial Estate, Chennai",
        }, detected_document_type="company_registration", confidence=0.88, missing_fields=["cin"]))

        # Turnover doc uploaded but scan quality was poor -> low confidence,
        # forces NEEDS_REVIEW under compliance_engine's MIN_TRUSTED_CONFIDENCE rule.
        rew_turnover_doc = _mk_document(b3.id, BidderDocumentType.TURNOVER_CERTIFICATE, "Turnover_Certificate_Scan.pdf")
        db.add(rew_turnover_doc)
        db.flush()
        db.add(_mk_extracted(
            rew_turnover_doc.id,
            {"company_name": "RELIABLE ENGINEERING WORKS", "turnover_amount": 26000000,
             "currency": "INR", "period": "FY 2022-23", "certifying_authority": None},
            detected_document_type="turnover_certificate", confidence=0.38,
            needs_review=True, missing_fields=["certifying_authority"],
            evidence="Turnover figure partially legible from a poor-quality phone-camera scan; certifying authority stamp illegible.",
        ))

        db.commit()

        # --- Run the REAL pipeline stages (rule engine, not re-mocked) ---
        print("Running bidder consistency analysis...")
        for bidder in (b1, b2, b3):
            analyze_bidder(str(bidder.id), db=db)

        print("Running verification checks (mock registries)...")
        for bidder in (b1, b2, b3):
            verification_service.verify_bidder_against_tender(str(bidder.id), db=db, user_id=str(admin.id))

        print("Running compliance engine (with cryptographic blockchain anchoring)...")
        for bidder in (b1, b2, b3):
            result = compliance_engine.evaluate_bidder(str(tender.id), str(bidder.id), db=db, user_id=str(admin.id))
            cr = result["compliance_result"]
            print(f"  {bidder.company_name}: {cr.overall_status.value.upper()} "
                  f"(score {cr.compliance_score}%, mandatory_failed={cr.mandatory_failed})")

        # Anchor documents into blockchain proof registry
        print("Anchoring bidder documents onto blockchain ledger...")
        for bidder in (b1, b2, b3):
            for doc in bidder.documents:
                mock_file = f"PDF_CONTENT_{doc.original_filename}".encode("utf-8")
                anchor_file_bytes(
                    db=db,
                    filename=doc.original_filename,
                    doc_type=doc.document_type.value,
                    file_bytes=mock_file,
                    entity_type="bidder_document",
                    entity_id=str(doc.id),
                    extra_meta={"bidder_id": str(bidder.id), "company_name": bidder.company_name},
                )

        print("\nVerifying Blockchain Ledger Integrity...")
        integrity = verify_blockchain_ledger(db)
        print(f"  Ledger Status: {'100% INTACT & VALID' if integrity['valid'] else 'TAMPER DETECTED'}")
        print(f"  Blocks Verified: {integrity['total_blocks_checked']}")

        # --- Seed Evaluation Officer & Vendor Portal User Accounts ---
        print("\nSeeding user accounts for role-based portal access...")
        officer_user = db.query(User).filter(User.email == "officer@cpcl.gem").first()
        if not officer_user:
            officer_user = User(
                id=uuid.uuid4(),
                full_name="Senior Procurement Officer",
                email="officer@cpcl.gem",
                hashed_password=hash_password("Officer@123"),
                role=UserRole.EVALUATOR,
                organization_name="Chennai Petroleum Corporation Limited",
                is_active=True,
            )
            db.add(officer_user)
            print("  Created Officer Account: officer@cpcl.gem / Officer@123")

        vendor_user = db.query(User).filter(User.email == "vendor@cpcl.gem").first()
        if not vendor_user:
            vendor_user = User(
                id=uuid.uuid4(),
                full_name="Authorized Bidder Representative",
                email="vendor@cpcl.gem",
                hashed_password=hash_password("Vendor@123"),
                role=UserRole.BIDDER,
                organization_name="Compliant Traders Private Limited",
                phone="+91-9840012345",
                is_active=True,
            )
            db.add(vendor_user)
            print("  Created Vendor Account: vendor@cpcl.gem / Vendor@123")

        # --- Seed Commercial / Financial Bids for L1 Evaluation ---
        print("\nSeeding commercial bids for tender L1 evaluation...")
        db.query(CommercialBid).filter(CommercialBid.tender_id == tender.id).delete()

        cb1 = CommercialBid(
            tender_id=tender.id,
            bidder_id=b1.id,
            base_price=41101694.92,
            tax_percentage=18.0,
            freight_charges=0.0,
            evaluated_price=48500000.0,  # 4.85 Crore total -> L1
            delivery_timeline_days=25,
            warranty_months=36,
        )
        cb2 = CommercialBid(
            tender_id=tender.id,
            bidder_id=b2.id,
            base_price=40254237.29,
            tax_percentage=18.0,
            freight_charges=0.0,
            evaluated_price=47500000.0,  # 4.75 Crore but disqualified on GST
            delivery_timeline_days=30,
            warranty_months=36,
        )
        cb3 = CommercialBid(
            tender_id=tender.id,
            bidder_id=b3.id,
            base_price=43220338.98,
            tax_percentage=18.0,
            freight_charges=0.0,
            evaluated_price=51000000.0,  # 5.10 Crore -> L2
            delivery_timeline_days=35,
            warranty_months=36,
        )
        db.add_all([cb1, cb2, cb3])
        db.commit()

        # Run commercial evaluation
        commercial_results = evaluate_commercial_bids(str(tender.id), db=db)
        print(f"  Commercial L1 Bidder: {commercial_results.get('l1_bidder', {}).get('company_name', 'None')}")

        # --- Seed Official Notices for Government Homepage ---
        print("\nSeeding dynamic official notices...")
        db.query(OfficialNotice).delete()
        n1 = OfficialNotice(
            title="Tender GEM/2026/B/6541278 Technical Evaluation in Progress",
            content="Technical compliance verification under deterministic rule engine is underway. Bidders with clarification notices must respond within 72 hours.",
            category="TENDER_UPDATE",
            priority="NORMAL",
        )
        n2 = OfficialNotice(
            title="CPCL Green Procurement Policy & Make in India Compliance",
            content="Mandatory 50% Local Content Class-I preference applies under MoP&NG procurement guidelines.",
            category="POLICY_ALERT",
            priority="URGENT",
        )
        db.add_all([n1, n2])

        # --- Seed Sample Clarification on Reliable Engineering's Turnover Doc ---
        print("\nSeeding demo clarification request...")
        db.query(ClarificationRequest).filter(ClarificationRequest.tender_id == tender.id).delete()
        clarification_req = ClarificationRequest(
            tender_id=tender.id,
            bidder_id=b3.id,
            bidder_document_id=rew_turnover_doc.id,
            subject="Clarification on Illegible Turnover Certificate",
            query_text="The uploaded turnover certificate Scan (Turnover_Certificate_Scan.pdf) has low resolution and missing UDIN. Please upload a clear chartered accountant certified copy.",
            status=ClarificationStatus.PENDING,
            requested_by=admin.id,
            requested_at=datetime.utcnow() - timedelta(hours=6),
        )
        db.add(clarification_req)

        # Update tampering risk flags for b3's turnover document
        rew_turnover_doc.tampering_risk = "MEDIUM"
        rew_turnover_doc.quality_status = "LOW_RESOLUTION"
        rew_turnover_doc.tampering_indicators = json.dumps([
            "Extracted text density low (< 100 chars)",
            "AI confidence below trust threshold (38%)",
            "Certifying authority stamp illegible",
        ])

        db.commit()

        print("\n=== Demo dataset ready ===")
        print(f"Tender ref: {DEMO_TENDER_REF}  (id={tender.id})")
        print("Portal Access Accounts:")
        print("  1. Administrator: admin@cpcl.gem / Admin@123")
        print("  2. Procurement Officer: officer@cpcl.gem / Officer@123")
        print("  3. Vendor / Bidder: vendor@cpcl.gem / Vendor@123")

    finally:
        db.close()


if __name__ == "__main__":
    seed()
