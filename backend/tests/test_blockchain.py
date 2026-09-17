import pytest
import hashlib
from app.services.blockchain_service import (
    compute_merkle_root,
    compute_block_hash,
    verify_blockchain_ledger,
    get_or_create_genesis_block,
    mine_block,
    GENESIS_PREV_HASH,
)
from app.models.blockchain import BlockchainBlock

def test_merkle_root_consistency():
    """Verify that identical transaction hashes always produce the same Merkle root."""
    txs = [
        hashlib.sha256(b"tx_1_gst_verify").hexdigest(),
        hashlib.sha256(b"tx_2_pan_verify").hexdigest(),
        hashlib.sha256(b"tx_3_turnover_verify").hexdigest(),
    ]
    root1 = compute_merkle_root(txs)
    root2 = compute_merkle_root(txs)
    assert root1 == root2
    assert len(root1) == 64

def test_merkle_root_empty():
    """Verify Merkle root handles empty transaction list gracefully."""
    root = compute_merkle_root([])
    assert len(root) == 64
    assert root == hashlib.sha256(b"EMPTY_TRANSACTION_BLOCK").hexdigest()

def test_compute_block_hash_validity():
    """Verify SHA-256 block hash computation format and determinism."""
    b_hash = compute_block_hash(
        block_number=1,
        previous_hash=GENESIS_PREV_HASH,
        merkle_root="a" * 64,
        timestamp_iso="2026-01-01T00:00:00",
        nonce=123456
    )
    assert len(b_hash) == 64
    # Recomputing manually
    expected = hashlib.sha256(f"1|{GENESIS_PREV_HASH}|{'a'*64}|2026-01-01T00:00:00|123456".encode()).hexdigest()
    assert b_hash == expected

def test_genesis_block_initialization(db_session):
    """Verify genesis block exists and has block number 0."""
    genesis = get_or_create_genesis_block(db_session)
    assert genesis.block_number == 0
    assert genesis.previous_hash == GENESIS_PREV_HASH
    assert len(genesis.block_hash) == 64
    assert len(genesis.merkle_root) == 64

def test_blockchain_ledger_integrity(db_session):
    """Verify the entire active blockchain passes cryptographic validation."""
    result = verify_blockchain_ledger(db_session)
    assert result["valid"] is True
    assert result["total_blocks_checked"] >= 1

def test_public_verify_endpoint(client, db_session):
    """Verify public verification API validates valid blockchain block."""
    genesis = get_or_create_genesis_block(db_session)
    response = client.get(f"/api/public/verify/{genesis.block_hash}")
    assert response.status_code == 200
    data = response.json()
    assert data["found"] is True

def test_public_verify_nonexistent_hash(client):
    """Verify public verification endpoint returns false for forged hash."""
    fake_hash = "f" * 64
    response = client.get(f"/api/public/verify/{fake_hash}")
    assert response.status_code == 200
    data = response.json()
    assert data["found"] is False
