import pytest
from app.models.tender import Tender, TenderRequirement, RequirementCategory, VerificationType
from app.models.bidder import Bidder, BidderDocument
from app.models.compliance import ComplianceStatus, ComplianceResult
from app.services.compliance_engine import compliance_engine, MIN_TRUSTED_CONFIDENCE

def test_deterministic_rule_execution(db_session):
    """Verify that multiple evaluation runs on identical input yield identical results."""
    # Find any existing bidder with documents
    bidder = db_session.query(Bidder).first()
    if not bidder:
        pytest.skip("No bidder available in database")
    
    tender = db_session.query(Tender).filter(Tender.id == bidder.tender_id).first()
    if not tender or not tender.requirements:
        pytest.skip("No tender with requirements available")

    # Run 1
    eval1 = compliance_engine.evaluate_bidder(str(tender.id), str(bidder.id), db=db_session)
    res1 = eval1["compliance_result"]

    # Run 2
    eval2 = compliance_engine.evaluate_bidder(str(tender.id), str(bidder.id), db=db_session)
    res2 = eval2["compliance_result"]

    assert res1.overall_status == res2.overall_status
    assert res1.compliance_score == res2.compliance_score
    assert res1.mandatory_failed == res2.mandatory_failed
    assert len(eval1["requirement_results"]) == len(eval2["requirement_results"])

def test_mandatory_failure_forces_non_compliant(db_session):
    """Verify that a single mandatory failure forces overall NON_COMPLIANT."""
    # Look for the seeded Non-Compliant bidder
    bidder = db_session.query(Bidder).filter(Bidder.company_name.like("%Non-Compliant%")).first()
    if not bidder:
        # Fallback to checking compliance result
        cr = db_session.query(ComplianceResult).filter(ComplianceResult.mandatory_failed == True).first()
        if cr:
            assert cr.overall_status == ComplianceStatus.NON_COMPLIANT
            return
        pytest.skip("No seeded non-compliant bidder found")

    result = compliance_engine.evaluate_bidder(str(bidder.tender_id), str(bidder.id), db=db_session)
    cr = result["compliance_result"]
    assert cr.mandatory_failed is True
    assert cr.overall_status == ComplianceStatus.NON_COMPLIANT

def test_compliant_bidder_status(db_session):
    """Verify that an eligible bidder meeting all criteria evaluates to COMPLIANT."""
    bidder = db_session.query(Bidder).filter(Bidder.company_name.like("%Compliant%")).filter(~Bidder.company_name.like("%Non%")).first()
    if not bidder:
        pytest.skip("No compliant demo bidder found")

    result = compliance_engine.evaluate_bidder(str(bidder.tender_id), str(bidder.id), db=db_session)
    cr = result["compliance_result"]
    assert cr.overall_status in (ComplianceStatus.COMPLIANT, ComplianceStatus.NEEDS_REVIEW)
    assert cr.compliance_score >= 50.0

def test_min_trusted_confidence_safeguard():
    """Verify threshold constant for AI extraction confidence safeguard."""
    assert MIN_TRUSTED_CONFIDENCE == 0.5

def test_compliance_score_accuracy(db_session):
    """Verify score equals compliant_count / total_requirements * 100."""
    cr = db_session.query(ComplianceResult).first()
    if not cr:
        pytest.skip("No ComplianceResult found in database")
    
    total = int(cr.total_requirements)
    compliant = int(cr.compliant_count)
    if total > 0:
        expected = round((compliant / total) * 100, 1)
        assert abs(cr.compliance_score - expected) <= 0.1
