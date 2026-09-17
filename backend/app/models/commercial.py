import uuid
from datetime import datetime

from sqlalchemy import Column, String, DateTime, Float, Boolean, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class CommercialBid(Base):
    """
    Commercial / Financial Bid component for L1 Evaluation.
    Kept separate from technical compliance.
    Stores quoted price, applicable taxes, freight, and calculated evaluated price.
    """
    __tablename__ = "commercial_bids"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tender_id = Column(UUID(as_uuid=True), ForeignKey("tenders.id"), nullable=False)
    bidder_id = Column(UUID(as_uuid=True), ForeignKey("bidders.id"), nullable=False, unique=True)

    base_price = Column(Float, nullable=False)           # in INR
    tax_percentage = Column(Float, default=18.0)         # GST %
    freight_charges = Column(Float, default=0.0)         # logistics
    applicable_loading = Column(Float, default=0.0)      # delivery / payment terms loading
    other_charges = Column(Float, default=0.0)           # tender defined adjustments
    evaluated_price = Column(Float, nullable=False)      # total evaluated price
    currency = Column(String(10), default="INR", nullable=False)

    rank = Column(Integer, nullable=True)                # 1 for L1, 2 for L2, etc.
    is_l1 = Column(Boolean, default=False, nullable=False)
    delivery_timeline_days = Column(Integer, default=30)
    warranty_months = Column(Integer, default=12)

    submitted_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    tender = relationship("Tender")
    bidder = relationship("Bidder")
