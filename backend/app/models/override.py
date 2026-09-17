import uuid
from datetime import datetime

from sqlalchemy import Column, String, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class OfficerDecision(Base):
    """
    Immutable Officer Override & Deviation record.
    Tracks every manual evaluation change, justification, deviation category,
    and associated blockchain transaction hash.
    """
    __tablename__ = "officer_decisions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tender_id = Column(UUID(as_uuid=True), ForeignKey("tenders.id"), nullable=False)
    bidder_id = Column(UUID(as_uuid=True), ForeignKey("bidders.id"), nullable=False)
    requirement_id = Column(UUID(as_uuid=True), ForeignKey("tender_requirements.id"), nullable=True)

    decision_type = Column(String(50), nullable=False)  # "APPROVE", "REJECT", "APPROVE_WITH_DEVIATION", "REQUEST_CLARIFICATION"
    original_verdict = Column(String(50), nullable=False)
    new_verdict = Column(String(50), nullable=False)

    deviation_category = Column(String(100), nullable=True)  # "Documentary Discrepancy", "Minor Specification Variance", "Relaxation under MSE policy", "Other"
    justification = Column(Text, nullable=False)
    comments = Column(Text, nullable=True)
    evidence = Column(Text, nullable=True)

    officer_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    officer_role = Column(String(50), default="evaluator", nullable=False)

    blockchain_tx = Column(String(66), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    tender = relationship("Tender")
    bidder = relationship("Bidder")
    officer = relationship("User")
