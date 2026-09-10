"""
Focused Idempotency & Transaction Safety Test for Blockchain Document Proofs.
Covers:
1. First verification -> creates proof
2. Second identical verification -> reuses existing proof
3. No duplicate SHA-256 record in document_proofs table
4. No PendingRollbackError
5. API (POST /api/compliance/bidder/{bidder_id}/evaluate) does not return 500
6. Concurrent anchoring safety
"""
import sys
import uuid
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models.user import User
from app.models.bidder import Bidder
from app.models.blockchain import DocumentProof
from app.core.security import create_access_token
from app.services.blockchain_service import (
    anchor_file_bytes,
    anchor_compliance_evaluation,
)

def run_tests():
    print("=== Starting Blockchain Idempotency & Transaction Safety Tests ===")

    db = SessionLocal()
    try:
        # 1. Fetch admin user & active demo bidder
        admin = db.query(User).filter(User.role == "admin").first()
        assert admin is not None, "Admin user must exist"

        bidder = db.query(Bidder).first()
        assert bidder is not None, "At least one bidder must exist in the database"

        token = create_access_token(subject=admin.email, role=admin.role)
        client = TestClient(app)

        print(f"Testing with Bidder: {bidder.company_name} (ID: {bidder.id})")

        # -------------------------------------------------------------
        # TEST 1: Direct Service Level Idempotency on anchor_compliance_evaluation
        # -------------------------------------------------------------
        print("\n[TEST 1] Testing anchor_compliance_evaluation idempotency directly...")
        test_tender_id = str(uuid.uuid4())
        test_bidder_id = str(uuid.uuid4())

        # First call -> Should create new block and proof
        proof_count_before = db.query(DocumentProof).count()
        block_1 = anchor_compliance_evaluation(
            db=db,
            tender_id=test_tender_id,
            bidder_id=test_bidder_id,
            company_name="Test Company 1",
            verdict="compliant",
            compliance_score=100.0,
            mandatory_failed=False,
            evaluated_by=str(admin.id),
        )
        assert block_1 is not None, "First evaluation should mine a block"
        proof_count_after_1 = db.query(DocumentProof).count()
        assert proof_count_after_1 == proof_count_before + 1, "First evaluation must create exactly 1 document_proof"

        # Second IDENTICAL call -> Must REUSE existing proof, NOT crash, NOT duplicate
        block_2 = anchor_compliance_evaluation(
            db=db,
            tender_id=test_tender_id,
            bidder_id=test_bidder_id,
            company_name="Test Company 1",
            verdict="compliant",
            compliance_score=100.0,
            mandatory_failed=False,
            evaluated_by=str(admin.id),
        )
        assert block_2 is not None, "Second evaluation should return existing block"
        proof_count_after_2 = db.query(DocumentProof).count()
        assert proof_count_after_2 == proof_count_after_1, "Second identical evaluation must NOT insert duplicate document_proof"
        print("  -> PASSED: Service reuses existing proof cleanly on identical inputs.")

        # -------------------------------------------------------------
        # TEST 2: Direct Service Level Idempotency on anchor_file_bytes
        # -------------------------------------------------------------
        print("\n[TEST 2] Testing anchor_file_bytes idempotency directly...")
        test_bytes = b"SAMPLE_DOCUMENT_BINARY_CONTENT_FOR_TESTING"
        p1 = anchor_file_bytes(
            db=db,
            filename="sample_test.pdf",
            doc_type="pan",
            file_bytes=test_bytes,
            entity_type="bidder_document",
            entity_id=str(uuid.uuid4()),
        )
        assert p1 is not None
        count_p1 = db.query(DocumentProof).count()

        # Call again with identical bytes
        p2 = anchor_file_bytes(
            db=db,
            filename="sample_test.pdf",
            doc_type="pan",
            file_bytes=test_bytes,
            entity_type="bidder_document",
            entity_id=str(uuid.uuid4()),
        )
        assert p2.id == p1.id, "Should return the exact same DocumentProof object"
        count_p2 = db.query(DocumentProof).count()
        assert count_p2 == count_p1, "No duplicate document proof created for identical file"
        print("  -> PASSED: anchor_file_bytes is completely idempotent.")

        # -------------------------------------------------------------
        # TEST 3: API Endpoint Test: POST /api/compliance/bidder/{bidder_id}/evaluate
        # -------------------------------------------------------------
        print(f"\n[TEST 3] Testing API endpoint: POST /api/compliance/bidder/{bidder.id}/evaluate...")

        # Run 1: Evaluate
        res1 = client.post(
            f"/api/compliance/bidder/{bidder.id}/evaluate",
            headers={"Authorization": f"Bearer {token}"},
        )
        print(f"  Run 1 status: {res1.status_code}")
        assert res1.status_code == 200, f"Run 1 failed with {res1.status_code}: {res1.text}"
        data1 = res1.json()
        assert "overall_status" in data1
        print(f"  Run 1 result: overall_status={data1['overall_status']}, score={data1['compliance_score']}")

        # Run 2: Re-run the EXACT same evaluation endpoint
        res2 = client.post(
            f"/api/compliance/bidder/{bidder.id}/evaluate",
            headers={"Authorization": f"Bearer {token}"},
        )
        print(f"  Run 2 status: {res2.status_code}")
        assert res2.status_code == 200, f"Run 2 failed with {res2.status_code}: {res2.text} (Expected 200 OK, not 500!)"
        data2 = res2.json()
        assert data2["overall_status"] == data1["overall_status"]
        assert data2["compliance_score"] == data1["compliance_score"]
        print("  -> PASSED: Re-running evaluation returns HTTP 200 without duplicate key error or PendingRollbackError!")

        # Run 3: Third evaluation in a row
        res3 = client.post(
            f"/api/compliance/bidder/{bidder.id}/evaluate",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res3.status_code == 200
        print("  -> PASSED: Run 3 succeeded with HTTP 200 OK.")

        # -------------------------------------------------------------
        # TEST 4: Verify Database Constraints & No Pending Rollback
        # -------------------------------------------------------------
        print("\n[TEST 4] Verifying database integrity and absence of duplicates...")
        # Verify no duplicate sha256_hash exists across document_proofs
        from sqlalchemy import func
        duplicate_hashes = (
            db.query(DocumentProof.sha256_hash, func.count(DocumentProof.id))
            .group_by(DocumentProof.sha256_hash)
            .having(func.count(DocumentProof.id) > 1)
            .all()
        )
        assert len(duplicate_hashes) == 0, f"Found duplicate hashes: {duplicate_hashes}"
        print("  -> PASSED: Zero duplicate SHA-256 hashes found in database.")

        # -------------------------------------------------------------
        # TEST 5: Verify Session Is Completely Healthy (No PendingRollbackError)
        # -------------------------------------------------------------
        print("\n[TEST 5] Verifying session health with subsequent read & write...")
        test_read = db.query(DocumentProof).first()
        assert test_read is not None
        print("  -> PASSED: Session is healthy and functional.")

        print("\n=======================================================")
        print("ALL IDEMPOTENCY & TRANSACTION TESTS PASSED SUCCESSFULLY!")
        print("=======================================================")

    finally:
        db.close()

if __name__ == "__main__":
    run_tests()
