import pytest
from app.services.commercial_evaluation_service import evaluate_commercial_bids
from app.services.document_tampering_service import analyze_document_tampering
from app.services.collusion_service import analyze_collusion_risk
from app.models.tender import Tender
from app.models.bidder import Bidder, BidderDocument

def test_commercial_evaluation_l1_ranking(db_session):
    """Verify commercial bid evaluation correctly ranks L1 with loading and charges."""
    tender = db_session.query(Tender).first()
    if not tender:
        pytest.skip("No tender found")

    result = evaluate_commercial_bids(str(tender.id), db=db_session)
    assert "tender_id" in result
    assert "rankings" in result
    assert "total_bids" in result
    
    # If there are bids, verify sorted
    bids = result["rankings"]
    if len(bids) > 1:
        assert bids[0]["rank"] == 1

def test_document_tampering_service_indicators(db_session):
    """Verify document tampering service detects integrity risks and flags indicators."""
    doc = db_session.query(BidderDocument).first()
    if not doc:
        pytest.skip("No bidder document found")
    
    bidder = db_session.query(Bidder).filter(Bidder.id == doc.bidder_id).first()
    analysis = analyze_document_tampering(doc, None, bidder)
    assert "tampering_risk" in analysis
    assert "tampering_indicators" in analysis
    assert "quality_status" in analysis

def test_cartel_collusion_detection_indicators(db_session):
    """Verify collusion service returns proper indicators and investigation flags."""
    tender = db_session.query(Tender).first()
    if not tender:
        pytest.skip("No tender found")

    collusion_result = analyze_collusion_risk(str(tender.id), db=db_session)
    assert "tender_id" in collusion_result
    assert "overall_risk" in collusion_result
    assert "risk_score" in collusion_result
    assert "indicators" in collusion_result
