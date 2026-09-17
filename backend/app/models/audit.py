import uuid
from datetime import datetime

from sqlalchemy import Column, String, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    action = Column(String(255), nullable=False)
    entity_type = Column(String(100), nullable=True)
    entity_id = Column(String(100), nullable=True)
    details = Column(Text, nullable=True)
    ip_address = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # --- Tamper-evident hash chain (blockchain-inspired) ---
    # previous_hash links this entry to the one written before it, and
    # record_hash is the SHA-256 of this entry's own data + previous_hash.
    # Recomputing record_hash later and comparing it to the stored value
    # is how we detect if any row was edited after the fact.
    previous_hash = Column(String(64), nullable=True)
    record_hash = Column(String(64), nullable=True)
