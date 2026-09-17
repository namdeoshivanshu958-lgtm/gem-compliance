"""
Blockchain & Immutable Procurement Ledger API Routes.
SIH 2026 - Problem Statement ID 26100 (Ministry of Petroleum & Natural Gas / CPCL).
"""
import json
import math
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserRole
from app.models.blockchain import BlockchainBlock, DocumentProof
from app.schemas.blockchain import (
    BlockchainBlockOut,
    BlockchainStatsOut,
    BlockchainTransaction,
    IntegrityVerificationResult,
    DocumentProofOut,
    PublicVerificationOut,
)
from app.core.deps import require_roles, get_current_user
from app.services.blockchain_service import (
    get_or_create_genesis_block,
    verify_blockchain_ledger,
    simulate_tamper_attack,
    restore_blockchain_ledger,
    public_verify_query,
    SMART_CONTRACT_ADDRESS,
    NETWORK_NAME,
    CONSENSUS_MECHANISM,
)

router = APIRouter(prefix="/api/blockchain", tags=["blockchain"])


@router.get("/stats", response_model=BlockchainStatsOut)
def get_blockchain_stats(db: Session = Depends(get_db)):
    """Summary metrics of the tamper-proof procurement blockchain."""
    get_or_create_genesis_block(db)
    blocks = db.query(BlockchainBlock).order_by(BlockchainBlock.block_number.asc()).all()
    total_blocks = len(blocks)
    total_txs = sum(b.transaction_count for b in blocks)
    latest_block = blocks[-1] if blocks else None

    # Fast check of integrity
    integrity = verify_blockchain_ledger(db)

    return BlockchainStatsOut(
        total_blocks=total_blocks,
        total_transactions=total_txs,
        latest_block_number=latest_block.block_number if latest_block else 0,
        latest_block_hash=latest_block.block_hash if latest_block else "0" * 64,
        is_chain_valid=integrity["valid"],
        verified_at=integrity.get("verified_at", datetime.utcnow()),
        smart_contract_address=SMART_CONTRACT_ADDRESS,
        network_name=NETWORK_NAME,
        consensus_algorithm=CONSENSUS_MECHANISM,
    )


@router.get("/blocks")
def list_blocks(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """Paginated list of all blocks with deserialized transactions and Merkle roots."""
    get_or_create_genesis_block(db)
    q = db.query(BlockchainBlock).order_by(BlockchainBlock.block_number.desc())
    total = q.count()
    rows = q.offset((page - 1) * page_size).limit(page_size).all()

    items = []
    for b in rows:
        try:
            tx_data = json.loads(b.transactions)
        except Exception:
            tx_data = []

        items.append({
            "id": str(b.id),
            "block_number": b.block_number,
            "timestamp": b.timestamp,
            "previous_hash": b.previous_hash,
            "block_hash": b.block_hash,
            "merkle_root": b.merkle_root,
            "nonce": b.nonce,
            "transaction_count": b.transaction_count,
            "transactions": tx_data,
            "smart_contract_tx": b.smart_contract_tx,
            "miner_address": b.miner_address,
            "is_tampered": b.is_tampered,
            "tamper_note": b.tamper_note,
        })

    return {
        "items": items,
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": max(1, math.ceil(total / page_size)),
    }


@router.get("/blocks/{block_number}")
def get_block_detail(block_number: int, db: Session = Depends(get_db)):
    """Retrieve deep details of a specific block by its height."""
    block = db.query(BlockchainBlock).filter(BlockchainBlock.block_number == block_number).first()
    if not block:
        raise HTTPException(status_code=404, detail=f"Block #{block_number} not found")

    try:
        txs = json.loads(block.transactions)
    except Exception:
        txs = []

    return {
        "id": str(block.id),
        "block_number": block.block_number,
        "timestamp": block.timestamp,
        "previous_hash": block.previous_hash,
        "block_hash": block.block_hash,
        "merkle_root": block.merkle_root,
        "nonce": block.nonce,
        "transaction_count": block.transaction_count,
        "transactions": txs,
        "smart_contract_tx": block.smart_contract_tx,
        "miner_address": block.miner_address,
        "is_tampered": block.is_tampered,
        "tamper_note": block.tamper_note,
    }


@router.get("/verify", response_model=IntegrityVerificationResult)
def verify_ledger(db: Session = Depends(get_db)):
    """
    Runs an exhaustive cryptographic verification across the entire blockchain:
    - Verifies block linkage (Block N -> Block N-1)
    - Verifies Merkle Root for all transaction sets
    - Recomputes block headers to prove no silent record updates occurred
    """
    result = verify_blockchain_ledger(db)
    return IntegrityVerificationResult(
        valid=result["valid"],
        total_blocks_checked=result["total_blocks_checked"],
        broken_at_block=result.get("broken_at_block"),
        broken_block_hash=result.get("broken_block_hash"),
        expected_hash=result.get("expected_hash"),
        reason=result.get("reason"),
        verified_at=result.get("verified_at", datetime.utcnow()),
    )


@router.post("/simulate-tamper")
def tamper_simulation(
    block_number: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    """
    Judge Presentation Mode: Simulates a direct SQL injection / database tamper attack.
    Alters a sealed record's verdict without computing cryptographic proofs.
    """
    res = simulate_tamper_attack(db, block_number)
    return res


@router.post("/restore")
def restore_ledger(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    """Restores the blockchain ledger to a clean, verified state after a demo attack."""
    return restore_blockchain_ledger(db)


@router.get("/proofs")
def list_document_proofs(
    query: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """List of all cryptographic SHA-256 document proofs anchored on-chain."""
    q = db.query(DocumentProof)
    if query:
        q = q.filter(
            (DocumentProof.document_name.ilike(f"%{query}%"))
            | (DocumentProof.sha256_hash.ilike(f"%{query}%"))
            | (DocumentProof.entity_id.ilike(f"%{query}%"))
        )
    total = q.count()
    rows = q.order_by(DocumentProof.anchored_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    items = []
    for r in rows:
        meta = json.loads(r.metadata_json) if r.metadata_json else {}
        items.append({
            "id": str(r.id),
            "document_name": r.document_name,
            "document_type": r.document_type,
            "sha256_hash": r.sha256_hash,
            "entity_type": r.entity_type,
            "entity_id": r.entity_id,
            "file_size_bytes": r.file_size_bytes,
            "block_number": r.block_number,
            "tx_hash": r.tx_hash,
            "anchored_at": r.anchored_at,
            "status": r.status,
            "metadata": meta,
        })

    return {
        "items": items,
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": max(1, math.ceil(total / page_size)),
    }


@router.get("/public-verify/{query_str:path}", response_model=PublicVerificationOut)
def public_verify(query_str: str, db: Session = Depends(get_db)):
    """
    Public verification endpoint (NO authentication required).
    Allows vigilance officers, bidders, and public auditors to verify any document,
    evaluation certificate, or transaction hash against the blockchain.
    """
    res = public_verify_query(db, query_str)
    return PublicVerificationOut(
        found=res["found"],
        query=res["query"],
        item_type=res.get("item_type"),
        title=res.get("title"),
        status=res.get("status"),
        block_number=res.get("block_number"),
        tx_hash=res.get("tx_hash"),
        sha256_hash=res.get("sha256_hash"),
        previous_hash=res.get("previous_hash"),
        anchored_at=res.get("anchored_at"),
        issuer=res.get("issuer"),
        details=res.get("details"),
        tamper_detected=res.get("tamper_detected", False),
    )
