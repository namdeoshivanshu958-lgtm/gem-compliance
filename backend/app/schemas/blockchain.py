from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict


class BlockchainTransaction(BaseModel):
    tx_id: str
    tx_hash: str
    timestamp: str
    action: str
    entity_type: str
    entity_id: str
    title: str
    details: Optional[Dict[str, Any]] = None
    fingerprint: Optional[str] = None
    signature: Optional[str] = None


class BlockchainBlockOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    block_number: int
    timestamp: datetime
    previous_hash: str
    block_hash: str
    merkle_root: str
    nonce: int
    transaction_count: int
    transactions: List[BlockchainTransaction]
    smart_contract_tx: Optional[str] = None
    miner_address: str
    is_tampered: bool = False
    tamper_note: Optional[str] = None


class BlockchainStatsOut(BaseModel):
    total_blocks: int
    total_transactions: int
    latest_block_number: int
    latest_block_hash: str
    is_chain_valid: bool
    verified_at: datetime
    smart_contract_address: str
    network_name: str
    consensus_algorithm: str


class IntegrityVerificationResult(BaseModel):
    valid: bool
    total_blocks_checked: int
    broken_at_block: Optional[int] = None
    broken_block_hash: Optional[str] = None
    expected_hash: Optional[str] = None
    reason: Optional[str] = None
    verified_at: datetime


class DocumentProofOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    document_name: str
    document_type: str
    sha256_hash: str
    entity_type: str
    entity_id: str
    file_size_bytes: int
    block_number: int
    tx_hash: str
    anchored_at: datetime
    status: str
    metadata: Optional[Dict[str, Any]] = None


class PublicVerificationOut(BaseModel):
    found: bool
    query: str
    item_type: Optional[str] = None  # 'document' | 'compliance_verdict' | 'block' | 'transaction'
    title: Optional[str] = None
    status: Optional[str] = None  # 'VERIFIED' | 'TAMPERED' | 'NOT_FOUND'
    block_number: Optional[int] = None
    tx_hash: Optional[str] = None
    sha256_hash: Optional[str] = None
    previous_hash: Optional[str] = None
    anchored_at: Optional[datetime] = None
    issuer: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    tamper_detected: bool = False
