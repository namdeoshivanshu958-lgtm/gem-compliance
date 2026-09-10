"""
Import all models here so that Base.metadata knows about them
when app.database.Base.metadata.create_all() is called.
"""
from app.models.user import User
from app.models.tender import Tender, TenderRequirement
from app.models.bidder import Bidder, BidderDocument
from app.models.document import ExtractedDocumentData
from app.models.verification import VerificationResult
from app.models.compliance import ComplianceResult
from app.models.notification import Notification
from app.models.audit import AuditLog
from app.models.report import Report
from app.models.blockchain import BlockchainBlock, DocumentProof

__all__ = [
    "User",
    "Tender",
    "TenderRequirement",
    "Bidder",
    "BidderDocument",
    "ExtractedDocumentData",
    "VerificationResult",
    "ComplianceResult",
    "Notification",
    "AuditLog",
    "Report",
    "BlockchainBlock",
    "DocumentProof",
]
