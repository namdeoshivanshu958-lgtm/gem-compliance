import enum
import uuid
from datetime import datetime

from sqlalchemy import Column, String, DateTime, Text, Enum, ForeignKey, Integer, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class ClarificationStatus(str, enum.Enum):
    PENDING = "pending"
    RESPONDED = "responded"
    RESOLVED = "resolved"
    REJECTED = "rejected"


class ClarificationRequest(Base):
    """
    Formal Clarification Request initiated by an evaluation officer.
    The bidder receives a notification, uploads a replacement/additional document
    or textual explanation, and the system stores a new DocumentVersion and re-evaluates.
    """
    __tablename__ = "clarification_requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tender_id = Column(UUID(as_uuid=True), ForeignKey("tenders.id"), nullable=False)
    bidder_id = Column(UUID(as_uuid=True), ForeignKey("bidders.id"), nullable=False)
    requirement_id = Column(UUID(as_uuid=True), ForeignKey("tender_requirements.id"), nullable=True)
    bidder_document_id = Column(UUID(as_uuid=True), ForeignKey("bidder_documents.id"), nullable=True)

    subject = Column(String(255), nullable=False)
    query_text = Column(Text, nullable=False)
    status = Column(Enum(ClarificationStatus), default=ClarificationStatus.PENDING, nullable=False)

    requested_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    requested_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    response_text = Column(Text, nullable=True)
    response_document_id = Column(UUID(as_uuid=True), ForeignKey("bidder_documents.id"), nullable=True)
    responded_at = Column(DateTime, nullable=True)

    resolution_notes = Column(Text, nullable=True)
    resolved_at = Column(DateTime, nullable=True)

    tender = relationship("Tender")
    bidder = relationship("Bidder")
    requirement = relationship("TenderRequirement")


class DocumentVersion(Base):
    """
    Immutable Version History for uploaded bidder documents.
    Whenever a re-upload occurs, the original file is NEVER overwritten.
    A new DocumentVersion record is created with its SHA-256 hash,
    version number (V1, V2, V3...), uploader, and timestamp.
    """
    __tablename__ = "document_versions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    bidder_document_id = Column(UUID(as_uuid=True), ForeignKey("bidder_documents.id"), nullable=False)

    version_number = Column(Integer, default=1, nullable=False)
    file_path = Column(String(1000), nullable=False)
    original_filename = Column(String(500), nullable=False)
    sha256_hash = Column(String(64), nullable=False, index=True)

    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    previous_document_id = Column(UUID(as_uuid=True), ForeignKey("bidder_documents.id"), nullable=True)
    new_document_id = Column(UUID(as_uuid=True), ForeignKey("bidder_documents.id"), nullable=True)
    status = Column(String(50), default="ACTIVE", nullable=False)
    reason = Column(Text, nullable=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    blockchain_tx = Column(String(66), nullable=True)

    document = relationship("BidderDocument", foreign_keys=[bidder_document_id], back_populates="versions")
