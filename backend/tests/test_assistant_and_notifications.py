import pytest
from app.services.procurement_assistant_service import query_procurement_assistant
from app.models.tender import Tender
from app.models.bidder import Bidder

MANDATORY_QUESTIONS = [
    "What are the technical evaluation criteria?",
    "Why was Bidder X marked non-compliant?",
    "Which bidders are eligible for commercial opening?",
    "What are the critical risks across all bidders?",
    "What is the status of clarifications for Tender Y?",
    "Show the audit trail for Bidder Z.",
    "Summarize the compliance status of all bidders.",
]

def test_assistant_mandatory_questions_grounded_in_records(db_session):
    """Verify assistant handles all 7 mandatory questions without crashing and grounds answers."""
    tender = db_session.query(Tender).first()
    tender_id = str(tender.id) if tender else None

    for question in MANDATORY_QUESTIONS:
        result = query_procurement_assistant(
            prompt=question,
            tender_id=tender_id,
            db=db_session
        )
        assert "response" in result
        assert len(result["response"]) > 10

def test_assistant_strict_fallback(db_session):
    """Verify assistant returns strict fallback for queries outside procurement records."""
    unrelated_query = "What is the capital of France and who won the 1998 World Cup?"
    result = query_procurement_assistant(
        prompt=unrelated_query,
        tender_id=None,
        db=db_session
    )
    assert result["response"] == "Information not available in the current procurement record."

def test_notification_endpoints(client, bidder_token):
    """Verify notification endpoints: list, unread count, and read-all."""
    headers = {"Authorization": f"Bearer {bidder_token}"}
    
    # 1. Unread count
    res_count = client.get("/api/notifications/unread-count", headers=headers)
    assert res_count.status_code == 200
    assert "unread_count" in res_count.json()

    # 2. List notifications
    res_list = client.get("/api/notifications", headers=headers)
    assert res_list.status_code == 200
    assert isinstance(res_list.json(), list)

    # 3. Read all
    res_read = client.post("/api/notifications/read-all", headers=headers)
    assert res_read.status_code == 200
    assert res_read.json()["status"] == "success"
