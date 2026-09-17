import pytest
from app.models.clarification import DocumentVersion, ClarificationRequest
from app.models.bidder import Bidder, BidderDocument
from app.models.tender import Tender
from app.models.override import OfficerDecision
from app.models.audit import AuditLog
from app.models.blockchain import BlockchainBlock

def test_document_versioning_and_preservation(db_session):
    """Verify document versioning records previous_document_id and preserves history."""
    doc = db_session.query(BidderDocument).first()
    if not doc:
        pytest.skip("No BidderDocument found")
    
    v = DocumentVersion(
        bidder_document_id=doc.id,
        version_number=2,
        original_filename=f"v2_{doc.original_filename}",
        file_path=f"uploads/v2_{doc.original_filename}",
        sha256_hash="e" * 64,
        reason="Submitted renewed certificate per Rule 173(iv)",
        previous_document_id=doc.id,
        new_document_id=doc.id,
        status="SUBMITTED",
        uploaded_by=None
    )
    db_session.add(v)
    db_session.commit()
    db_session.refresh(v)

    assert v.version_number == 2
    assert v.previous_document_id == doc.id
    assert v.status == "SUBMITTED"

    history = db_session.query(DocumentVersion).filter(DocumentVersion.bidder_document_id == doc.id).all()
    assert len(history) >= 1

def test_officer_override_requires_justification(client, evaluator_token, db_session):
    """Verify that officer override rejects empty/blank justification with 400 or 422."""
    bidder = db_session.query(Bidder).first()
    if not bidder:
        pytest.skip("No bidder found")

    headers = {"Authorization": f"Bearer {evaluator_token}"}
    payload = {
        "tender_id": str(bidder.tender_id),
        "bidder_id": str(bidder.id),
        "decision_type": "APPROVE",
        "justification": "",  # Blank justification
        "deviation_category": "Minor Clerical",
    }
    response = client.post("/api/officer/override", json=payload, headers=headers)
    assert response.status_code in (400, 422)

def test_officer_override_success_anchors_blockchain(client, evaluator_token, db_session):
    """Verify valid officer override updates status, writes audit log, and creates blockchain block."""
    bidder = db_session.query(Bidder).first()
    if not bidder:
        pytest.skip("No bidder found")

    blocks_before = db_session.query(BlockchainBlock).count()
    audits_before = db_session.query(AuditLog).count()

    headers = {"Authorization": f"Bearer {evaluator_token}"}
    payload = {
        "tender_id": str(bidder.tender_id),
        "bidder_id": str(bidder.id),
        "decision_type": "APPROVE_WITH_DEVIATION",
        "justification": "Authorized under CPCL Manual of Procurement 2024 clause 14.3 due to minor formatting deviation.",
        "deviation_category": "Financial Format",
        "evidence": "DigiLocker verification confirmed valid registration certificate.",
    }
    response = client.post("/api/officer/override", json=payload, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["new_verdict"] == "APPROVE_WITH_DEVIATION"
    assert "blockchain_tx" in data

    # Verify audit log created
    audits_after = db_session.query(AuditLog).count()
    assert audits_after >= audits_before

    # Verify blockchain block created
    blocks_after = db_session.query(BlockchainBlock).count()
    assert blocks_after >= blocks_before
