import uuid
from datetime import datetime

from sqlalchemy import Column, String, DateTime, Text, Integer, Boolean, BigInteger
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class BlockchainBlock(Base):
    """
    Cryptographic Block in the immutable procurement ledger.
    Each block bundles multiple audit/document/compliance transactions,
    computes a Merkle Tree root, and links to the previous block via SHA-256.
    """
    __tablename__ = "blockchain_blocks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    block_number = Column(Integer, unique=True, nullable=False, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    previous_hash = Column(String(64), nullable=False)
    block_hash = Column(String(64), unique=True, nullable=False, index=True)
    merkle_root = Column(String(64), nullable=False)
    nonce = Column(BigInteger, default=0, nullable=False)
    transaction_count = Column(Integer, default=0, nullable=False)
    transactions = Column(Text, nullable=False)  # JSON-serialized list of transactions
    smart_contract_tx = Column(String(66), nullable=True)  # EVM 0x... transaction hash
    miner_address = Column(String(42), default="0xCPCL_GeM_Compliance_Node_01", nullable=False)
    is_tampered = Column(Boolean, default=False, nullable=False)
    tamper_note = Column(String(255), nullable=True)


class DocumentProof(Base):
    """
    Cryptographic SHA-256 fingerprint for uploaded bidder and tender documents.
    Provides non-repudiation and Proof-of-Existence (PoE) on the blockchain.
    """
    __tablename__ = "document_proofs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_name = Column(String(500), nullable=False)
    document_type = Column(String(100), nullable=False)
    sha256_hash = Column(String(64), unique=True, nullable=False, index=True)
    entity_type = Column(String(50), nullable=False)  # 'bidder_document' | 'tender_document' | 'compliance_verdict'
    entity_id = Column(String(100), nullable=False)
    file_size_bytes = Column(BigInteger, default=0, nullable=False)
    block_number = Column(Integer, nullable=False)
    tx_hash = Column(String(66), nullable=False)
    anchored_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    status = Column(String(50), default="ANCHORED", nullable=False)
    metadata_json = Column(Text, nullable=True)
