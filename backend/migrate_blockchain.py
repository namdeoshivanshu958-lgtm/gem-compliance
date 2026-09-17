"""
Blockchain Migration & Seeder Script.
SIH 2026 - Problem Statement ID 26100 (Ministry of Petroleum & Natural Gas / CPCL).

Creates the `blockchain_blocks` and `document_proofs` tables and anchors
existing tenders, bidder documents, and compliance results into an immutable
cryptographic blockchain ledger.

Run with: python migrate_blockchain.py
"""
import json
import os
from datetime import datetime

from sqlalchemy import inspect

from app.database import Base, engine, SessionLocal
import app.models  # Ensures Base.metadata knows about all models
from app.models.tender import Tender
from app.models.bidder import Bidder, BidderDocument
from app.models.compliance import ComplianceResult
from app.services.blockchain_service import (
    get_or_create_genesis_block,
    mine_block,
    anchor_file_bytes,
    anchor_compliance_evaluation,
    verify_blockchain_ledger,
)


def migrate_and_seed():
    print("Step 1: Creating blockchain tables...")
    Base.metadata.create_all(bind=engine)
    print("Tables created / verified.")

    db = SessionLocal()
    try:
        print("Step 2: Initializing Genesis Block #0...")
        genesis = get_or_create_genesis_block(db)
        print(f"Genesis Block active: Hash={genesis.block_hash[:24]}...")

        # Find existing tenders
        tenders = db.query(Tender).all()
        print(f"Step 3: Found {len(tenders)} existing tenders. Anchoring on-chain...")

        for t in tenders:
            # Check if tender document exists on disk
            tender_bytes = b"MOCK_TENDER_NIT_CONTENT"
            if t.document_path and os.path.exists(t.document_path):
                try:
                    with open(t.document_path, "rb") as f:
                        tender_bytes = f.read()
                except Exception:
                    pass

            anchor_file_bytes(
                db=db,
                filename=f"{t.tender_ref_no.replace('/', '_')}_NIT.pdf",
                doc_type="tender_nit_document",
                file_bytes=tender_bytes,
                entity_type="tender_document",
                entity_id=str(t.id),
                extra_meta={"tender_ref_no": t.tender_ref_no, "title": t.title},
            )

        # Find existing bidders and anchor their documents and compliance results
        bidders = db.query(Bidder).all()
        print(f"Step 4: Found {len(bidders)} bidders. Anchoring documents and evaluations...")

        for bidder in bidders:
            # Anchor documents
            for doc in bidder.documents:
                doc_bytes = b"MOCK_DOCUMENT_CONTENT_" + doc.original_filename.encode("utf-8")
                if doc.file_path and os.path.exists(doc.file_path):
                    try:
                        with open(doc.file_path, "rb") as f:
                            doc_bytes = f.read()
                    except Exception:
                        pass

                anchor_file_bytes(
                    db=db,
                    filename=doc.original_filename,
                    doc_type=doc.document_type.value if hasattr(doc.document_type, "value") else str(doc.document_type),
                    file_bytes=doc_bytes,
                    entity_type="bidder_document",
                    entity_id=str(doc.id),
                    extra_meta={
                        "bidder_id": str(bidder.id),
                        "company_name": bidder.company_name,
                    },
                )

            # Anchor compliance results if evaluated
            compliance = db.query(ComplianceResult).filter(ComplianceResult.bidder_id == bidder.id).first()
            if compliance:
                print(f"  Anchoring compliance verdict for: {bidder.company_name} -> {compliance.overall_status.value.upper()}")
                anchor_compliance_evaluation(
                    db=db,
                    tender_id=str(compliance.tender_id),
                    bidder_id=str(bidder.id),
                    company_name=bidder.company_name,
                    verdict=compliance.overall_status.value,
                    compliance_score=compliance.compliance_score,
                    mandatory_failed=compliance.mandatory_failed,
                    evaluated_by=str(compliance.evaluated_by) if compliance.evaluated_by else "System",
                )

        print("\nStep 5: Verifying overall blockchain cryptographic integrity...")
        integrity = verify_blockchain_ledger(db)
        if integrity["valid"]:
            print(f"SUCCESS: Blockchain ledger is 100% cryptographically intact! ({integrity['total_blocks_checked']} blocks checked).")
        else:
            print(f"WARNING: Ledger check failed: {integrity}")

    finally:
        db.close()


if __name__ == "__main__":
    migrate_and_seed()
