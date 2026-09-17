import uuid
from datetime import datetime

from sqlalchemy import Column, String, DateTime, Text, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class OfficialNotice(Base):
    """
    Dynamic Official Notice Bar & Announcements.
    Published by platform administrators, rendered on the government homepage notice ticker.
    """
    __tablename__ = "official_notices"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    category = Column(String(50), default="TENDER_UPDATE", nullable=False)  # TENDER_UPDATE, SYSTEM_MAINTENANCE, POLICY_ALERT, CORRIGENDUM
    priority = Column(String(20), default="NORMAL", nullable=False)         # NORMAL, URGENT, CRITICAL
    is_active = Column(Boolean, default=True, nullable=False)
    published_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=True)

    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
