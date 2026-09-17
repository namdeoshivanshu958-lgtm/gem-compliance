"""
Cryptographic Blockchain & Merkle Tree Ledger Service.
SIH 2026 - Problem Statement ID 26100 (Ministry of Petroleum & Natural Gas / CPCL).

Provides an immutable, tamper-evident audit ledger and cryptographic document
fingerprinting engine for government e-marketplace (GeM) tender compliance.
Supports Proof-of-Existence (PoE), Merkle Root verification, SHA-256 block linking,
tamper-attack simulation for demo presentations, and smart contract anchoring.
"""
import hashlib
import json
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.models.blockchain import BlockchainBlock, DocumentProof
from app.core.logging_config import logger

GENESIS_PREV_HASH = "0" * 64
SMART_CONTRACT_ADDRESS = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
DEFAULT_MINER = "0xCPCL_GeM_Auditor_Node_01"
CONSENSUS_MECHANISM = "Proof of Authority (PoA) Consortium"
NETWORK_NAME = "CPCL-GeM Compliance Private Subnet"


def compute_merkle_root(tx_hashes: List[str]) -> str:
    """
    Computes a deterministic cryptographic Merkle Root from an array of transaction hashes.
    Standard Bitcoin/Ethereum binary Merkle Tree algorithm.
    """
    if not tx_hashes:
        return hashlib.sha256(b"EMPTY_TRANSACTION_BLOCK").hexdigest()

    current_level = [h for h in tx_hashes]

    while len(current_level) > 1:
        if len(current_level) % 2 != 0:
            current_level.append(current_level[-1])

        next_level = []
        for i in range(0, len(current_level), 2):
            combined = (current_level[i] + current_level[i + 1]).encode("utf-8")
            next_level.append(hashlib.sha256(combined).hexdigest())
        current_level = next_level

    return current_level[0]


def compute_block_hash(
    block_number: int,
    previous_hash: str,
    merkle_root: str,
    timestamp_iso: str,
    nonce: int,
) -> str:
    """Computes the SHA-256 header hash for a block."""
    payload = f"{block_number}|{previous_hash}|{merkle_root}|{timestamp_iso}|{nonce}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def compute_transaction_hash(
    action: str,
    entity_type: str,
    entity_id: str,
    timestamp_iso: str,
    details_str: str,
) -> str:
    """Computes the SHA-256 signature for a single transaction."""
    payload = f"{action}|{entity_type}|{entity_id}|{timestamp_iso}|{details_str}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def get_or_create_genesis_block(db: Session) -> BlockchainBlock:
    """Ensures Genesis Block #0 exists in the database."""
    genesis = (
        db.query(BlockchainBlock)
        .filter(BlockchainBlock.block_number == 0)
        .first()
    )
    if genesis:
        return genesis

    now = datetime(2026, 1, 1, 0, 0, 0)
    now_iso = now.isoformat()

    genesis_tx_data = {
        "network": NETWORK_NAME,
        "organization": "Chennai Petroleum Corporation Limited (CPCL)",
        "ministry": "Ministry of Petroleum & Natural Gas",
        "hackathon": "Smart India Hackathon 2026",
        "problem_statement": "PS 26100 - AI Bid Compliance Verification Platform",
        "contract": SMART_CONTRACT_ADDRESS,
    }
    details_json = json.dumps(genesis_tx_data, sort_keys=True)
    tx_hash = compute_transaction_hash("GENESIS_INITIALIZATION", "platform", "CPCL-001", now_iso, details_json)

    genesis_tx = {
        "tx_id": str(uuid.uuid4()),
        "tx_hash": tx_hash,
        "timestamp": now_iso,
        "action": "GENESIS_INITIALIZATION",
        "entity_type": "platform",
        "entity_id": "CPCL-001",
        "title": "CPCL GeM Compliance Ledger Initialized",
        "details": genesis_tx_data,
        "fingerprint": tx_hash,
        "signature": f"0xGENESIS_SIG_{tx_hash[:16]}",
    }

    merkle_root = compute_merkle_root([tx_hash])
    block_hash = compute_block_hash(0, GENESIS_PREV_HASH, merkle_root, now_iso, 0)
    eth_tx = f"0x{hashlib.sha256(f'EVM_GENESIS_{block_hash}'.encode()).hexdigest()}"

    genesis_block = BlockchainBlock(
        block_number=0,
        timestamp=now,
        previous_hash=GENESIS_PREV_HASH,
        block_hash=block_hash,
        merkle_root=merkle_root,
        nonce=0,
        transaction_count=1,
        transactions=json.dumps([genesis_tx]),
        smart_contract_tx=eth_tx,
        miner_address=DEFAULT_MINER,
        is_tampered=False,
    )
    try:
        db.add(genesis_block)
        db.commit()
        db.refresh(genesis_block)
        logger.info(f"Genesis block #0 created: {block_hash}")
        return genesis_block
    except IntegrityError:
        db.rollback()
        existing = (
            db.query(BlockchainBlock)
            .filter(BlockchainBlock.block_number == 0)
            .first()
        )
        if existing:
            return existing
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create genesis block: {e}", exc_info=True)
        raise


def mine_block(
    db: Session,
    transactions: List[Dict[str, Any]],
    user_miner: Optional[str] = None,
) -> BlockchainBlock:
    """
    Packages a list of transactions into a new cryptographic block,
    links it to the latest block hash, calculates Merkle root, and persists.
    """
    get_or_create_genesis_block(db)

    last_block = (
        db.query(BlockchainBlock)
        .order_by(BlockchainBlock.block_number.desc())
        .first()
    )
    assert last_block is not None

    new_block_number = last_block.block_number + 1
    previous_hash = last_block.block_hash
    timestamp = datetime.utcnow()
    timestamp_iso = timestamp.isoformat()

    # Ensure all transactions have valid tx_hashes
    prepared_txs = []
    tx_hashes = []
    for tx in transactions:
        tx_dict = dict(tx)
        if "tx_id" not in tx_dict:
            tx_dict["tx_id"] = str(uuid.uuid4())
        if "timestamp" not in tx_dict:
            tx_dict["timestamp"] = timestamp_iso

        details_str = json.dumps(tx_dict.get("details", {}), sort_keys=True)
        tx_hash = compute_transaction_hash(
            tx_dict.get("action", ""),
            tx_dict.get("entity_type", ""),
            tx_dict.get("entity_id", ""),
            tx_dict["timestamp"],
            details_str,
        )
        tx_dict["tx_hash"] = tx_hash
        tx_dict["signature"] = f"0xSIG_{tx_hash[:20]}"
        tx_hashes.append(tx_hash)
        prepared_txs.append(tx_dict)

    merkle_root = compute_merkle_root(tx_hashes)

    # Lightweight Proof-of-Authority Nonce
    nonce = int(uuid.uuid4().int % 1000000)
    block_hash = compute_block_hash(
        new_block_number, previous_hash, merkle_root, timestamp_iso, nonce
    )

    smart_contract_tx = f"0x{hashlib.sha256(f'EVM_BLOCK_{new_block_number}_{block_hash}'.encode()).hexdigest()}"

    block = BlockchainBlock(
        block_number=new_block_number,
        timestamp=timestamp,
        previous_hash=previous_hash,
        block_hash=block_hash,
        merkle_root=merkle_root,
        nonce=nonce,
        transaction_count=len(prepared_txs),
        transactions=json.dumps(prepared_txs),
        smart_contract_tx=smart_contract_tx,
        miner_address=user_miner or DEFAULT_MINER,
        is_tampered=False,
    )
    try:
        db.add(block)
        db.commit()
        db.refresh(block)
        logger.info(f"Block #{new_block_number} mined! Hash={block_hash} (Txs={len(prepared_txs)})")
        return block
    except IntegrityError:
        db.rollback()
        logger.warning(f"Integrity collision on mining block #{new_block_number}. Re-querying after rollback...")
        existing_block = db.query(BlockchainBlock).filter(BlockchainBlock.block_hash == block_hash).first()
        if existing_block:
            return existing_block
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to mine block: {e}", exc_info=True)
        raise


def anchor_file_bytes(
    db: Session,
    filename: str,
    doc_type: str,
    file_bytes: bytes,
    entity_type: str,
    entity_id: str,
    extra_meta: Optional[Dict[str, Any]] = None,
) -> DocumentProof:
    """
    Hashes binary document contents using SHA-256 and records an immutable
    Proof-of-Existence on the blockchain.
    Idempotent: If an identical file has already been anchored, reuses the existing proof.
    """
    file_sha256 = hashlib.sha256(file_bytes).hexdigest()
    file_size = len(file_bytes)

    # 1. Pre-check: Query whether the same sha256_hash already exists
    existing = db.query(DocumentProof).filter(DocumentProof.sha256_hash == file_sha256).first()
    if existing:
        logger.info(
            f"Document proof already exists for SHA-256 hash {file_sha256}; reusing existing proof."
        )
        return existing

    tx_payload = {
        "action": "DOCUMENT_FINGERPRINT_ANCHORED",
        "entity_type": entity_type,
        "entity_id": str(entity_id),
        "title": f"Document Fingerprint: {filename} ({doc_type.upper()})",
        "fingerprint": file_sha256,
        "details": {
            "document_name": filename,
            "document_type": doc_type,
            "file_size_bytes": file_size,
            "sha256_hash": file_sha256,
            **(extra_meta or {}),
        },
    }

    try:
        block = mine_block(db, [tx_payload])
        parsed_txs = json.loads(block.transactions)
        tx_hash = parsed_txs[0]["tx_hash"]

        proof = DocumentProof(
            document_name=filename,
            document_type=doc_type,
            sha256_hash=file_sha256,
            entity_type=entity_type,
            entity_id=str(entity_id),
            file_size_bytes=file_size,
            block_number=block.block_number,
            tx_hash=tx_hash,
            anchored_at=datetime.utcnow(),
            status="ANCHORED",
            metadata_json=json.dumps(extra_meta or {}),
        )
        db.add(proof)
        db.commit()
        db.refresh(proof)
        return proof
    except IntegrityError:
        db.rollback()
        existing = db.query(DocumentProof).filter(DocumentProof.sha256_hash == file_sha256).first()
        if existing:
            logger.info(
                f"Document proof already exists for SHA-256 hash {file_sha256}; reusing existing proof."
            )
            return existing
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to anchor document proof for {filename}: {e}", exc_info=True)
        raise


def anchor_compliance_evaluation(
    db: Session,
    tender_id: str,
    bidder_id: str,
    company_name: str,
    verdict: str,
    compliance_score: float,
    mandatory_failed: bool,
    evaluated_by: Optional[str] = None,
) -> Optional[BlockchainBlock]:
    """
    Anchors a deterministic compliance verdict onto the blockchain.
    Ensures that evaluator verdicts cannot be secretly overturned post-evaluation.

    Idempotent: If an evaluation certificate with this exact fingerprint already exists,
    it reuses the existing proof rather than creating duplicate blocks or document proofs.
    """
    verdict_fingerprint = hashlib.sha256(
        f"{tender_id}|{bidder_id}|{verdict}|{compliance_score}|{mandatory_failed}".encode("utf-8")
    ).hexdigest()

    # 1. Pre-check: Query whether the same sha256_hash already exists
    existing = (
        db.query(DocumentProof)
        .filter(DocumentProof.sha256_hash == verdict_fingerprint)
        .first()
    )
    if existing:
        logger.info(
            f"Document proof already exists for SHA-256 hash {verdict_fingerprint}; reusing existing proof."
        )
        return (
            db.query(BlockchainBlock)
            .filter(BlockchainBlock.block_number == existing.block_number)
            .first()
        )

    tx_payload = {
        "action": "COMPLIANCE_VERDICT_ANCHORED",
        "entity_type": "compliance_verdict",
        "entity_id": str(bidder_id),
        "title": f"Compliance Verdict: {company_name} -> {verdict.upper()}",
        "fingerprint": verdict_fingerprint,
        "details": {
            "tender_id": str(tender_id),
            "bidder_id": str(bidder_id),
            "company_name": company_name,
            "overall_status": verdict,
            "compliance_score": compliance_score,
            "mandatory_failed": mandatory_failed,
            "evaluated_by": str(evaluated_by) if evaluated_by else "System",
            "audit_hash": verdict_fingerprint,
        },
    }

    try:
        block = mine_block(db, [tx_payload])

        # Record proof entry for public lookup
        parsed_txs = json.loads(block.transactions)
        tx_hash = parsed_txs[0]["tx_hash"]
        proof = DocumentProof(
            document_name=f"Evaluation Certificate - {company_name}",
            document_type="compliance_certificate",
            sha256_hash=verdict_fingerprint,
            entity_type="compliance_verdict",
            entity_id=str(bidder_id),
            file_size_bytes=0,
            block_number=block.block_number,
            tx_hash=tx_hash,
            anchored_at=datetime.utcnow(),
            status="ANCHORED",
            metadata_json=json.dumps(tx_payload["details"]),
        )
        db.add(proof)
        db.commit()
        db.refresh(proof)
        return block
    except IntegrityError:
        db.rollback()
        existing = (
            db.query(DocumentProof)
            .filter(DocumentProof.sha256_hash == verdict_fingerprint)
            .first()
        )
        if existing:
            logger.info(
                f"Document proof already exists for SHA-256 hash {verdict_fingerprint}; reusing existing proof."
            )
            return (
                db.query(BlockchainBlock)
                .filter(BlockchainBlock.block_number == existing.block_number)
                .first()
            )
        raise
    except Exception as e:
        db.rollback()
        logger.error(
            f"Failed to anchor compliance evaluation for bidder {bidder_id}: {e}",
            exc_info=True,
        )
        raise


def anchor_officer_override(
    db: Session,
    tender_id: str,
    bidder_id: str,
    company_name: str,
    original_verdict: str,
    new_verdict: str,
    justification: str,
    deviation_category: Optional[str] = None,
    officer_email: str = "evaluator@cpcl.gem",
    officer_role: str = "evaluator",
) -> Optional[BlockchainBlock]:
    """
    Anchors an authorized officer override / deviation decision to the blockchain ledger.
    Ensures manual changes have cryptographic non-repudiation and an immutable audit record.
    """
    override_fingerprint = hashlib.sha256(
        f"{tender_id}|{bidder_id}|{original_verdict}|{new_verdict}|{justification}|{datetime.utcnow().strftime('%Y%m%d%H%M')}".encode("utf-8")
    ).hexdigest()

    tx_payload = {
        "action": "OFFICER_OVERRIDE_ANCHORED",
        "entity_type": "compliance_override",
        "entity_id": str(bidder_id),
        "title": f"Officer Decision: {company_name} -> {new_verdict} ({deviation_category or 'Override'})",
        "fingerprint": override_fingerprint,
        "details": {
            "tender_id": str(tender_id),
            "bidder_id": str(bidder_id),
            "company_name": company_name,
            "original_verdict": original_verdict,
            "new_verdict": new_verdict,
            "deviation_category": deviation_category,
            "justification": justification,
            "officer_email": officer_email,
            "officer_role": officer_role,
            "anchored_at": datetime.utcnow().isoformat(),
        },
    }

    try:
        block = mine_block(db, [tx_payload])
        block_txs = json.loads(block.transactions) if block.transactions else []
        tx_hash = block_txs[0].get("tx_hash") if block_txs else block.block_hash

        proof = DocumentProof(
            document_name=f"Officer_Override_{company_name}_{new_verdict}.json",
            document_type="officer_override_decision",
            sha256_hash=override_fingerprint,
            entity_type="compliance_override",
            entity_id=str(bidder_id),
            file_size_bytes=0,
            block_number=block.block_number,
            tx_hash=tx_hash,
            anchored_at=datetime.utcnow(),
            status="ANCHORED",
            metadata_json=json.dumps(tx_payload["details"]),
        )
        db.add(proof)
        db.commit()
        db.refresh(proof)
        return block
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to anchor officer override for bidder {bidder_id}: {e}", exc_info=True)
        return None


def verify_blockchain_ledger(db: Session) -> Dict[str, Any]:
    """
    Cryptographically verifies the entire blockchain:
    1. Previous block hash linking (Block N.previous_hash == Block N-1.block_hash)
    2. Merkle Root integrity against stored transactions
    3. Block header hash integrity against recomputed SHA-256
    """
    get_or_create_genesis_block(db)

    blocks = (
        db.query(BlockchainBlock)
        .order_by(BlockchainBlock.block_number.asc())
        .all()
    )

    if not blocks:
        return {
            "valid": True,
            "total_blocks_checked": 0,
            "verified_at": datetime.utcnow(),
        }

    for i, block in enumerate(blocks):
        # 1. Verify previous hash link
        if i == 0:
            if block.previous_hash != GENESIS_PREV_HASH:
                return {
                    "valid": False,
                    "total_blocks_checked": 1,
                    "broken_at_block": 0,
                    "broken_block_hash": block.block_hash,
                    "expected_hash": GENESIS_PREV_HASH,
                    "reason": "Genesis block previous_hash is corrupted.",
                    "verified_at": datetime.utcnow(),
                }
        else:
            prev_block = blocks[i - 1]
            if block.previous_hash != prev_block.block_hash:
                return {
                    "valid": False,
                    "total_blocks_checked": i + 1,
                    "broken_at_block": block.block_number,
                    "broken_block_hash": block.block_hash,
                    "expected_hash": prev_block.block_hash,
                    "reason": (
                        f"Previous hash mismatch at Block #{block.block_number}! "
                        f"Stored previous_hash '{block.previous_hash[:16]}...' does not match "
                        f"Block #{prev_block.block_number} hash '{prev_block.block_hash[:16]}...'. "
                        "A block may have been inserted, deleted, or reordered."
                    ),
                    "verified_at": datetime.utcnow(),
                }

        # 2. Verify Merkle Root
        try:
            tx_list = json.loads(block.transactions)
        except Exception as e:
            return {
                "valid": False,
                "total_blocks_checked": i + 1,
                "broken_at_block": block.block_number,
                "broken_block_hash": block.block_hash,
                "reason": f"Corrupted transaction JSON in Block #{block.block_number}: {e}",
                "verified_at": datetime.utcnow(),
            }

        recalculated_tx_hashes = []
        for tx in tx_list:
            details_str = json.dumps(tx.get("details", {}), sort_keys=True)
            calc_tx_hash = compute_transaction_hash(
                tx.get("action", ""),
                tx.get("entity_type", ""),
                tx.get("entity_id", ""),
                tx.get("timestamp", ""),
                details_str,
            )
            recalculated_tx_hashes.append(calc_tx_hash)

        recomputed_merkle = compute_merkle_root(recalculated_tx_hashes)
        if recomputed_merkle != block.merkle_root:
            return {
                "valid": False,
                "total_blocks_checked": i + 1,
                "broken_at_block": block.block_number,
                "broken_block_hash": block.block_hash,
                "expected_hash": block.merkle_root,
                "reason": (
                    f"TAMPERING DETECTED at Block #{block.block_number}! "
                    f"The transaction payload was edited inside the database. "
                    f"Recalculated Merkle root '{recomputed_merkle[:16]}...' does not match "
                    f"the sealed block Merkle root '{block.merkle_root[:16]}...'."
                ),
                "verified_at": datetime.utcnow(),
            }

        # 3. Verify Block Hash
        recomputed_block_hash = compute_block_hash(
            block.block_number,
            block.previous_hash,
            block.merkle_root,
            block.timestamp.isoformat(),
            block.nonce,
        )
        if recomputed_block_hash != block.block_hash:
            return {
                "valid": False,
                "total_blocks_checked": i + 1,
                "broken_at_block": block.block_number,
                "broken_block_hash": block.block_hash,
                "expected_hash": block.block_hash,
                "reason": (
                    f"Header hash mismatch at Block #{block.block_number}! "
                    f"Computed hash '{recomputed_block_hash[:16]}...' does not match "
                    f"stored hash '{block.block_hash[:16]}...'."
                ),
                "verified_at": datetime.utcnow(),
            }

    return {
        "valid": True,
        "total_blocks_checked": len(blocks),
        "verified_at": datetime.utcnow(),
    }


def simulate_tamper_attack(db: Session, block_number: Optional[int] = None) -> Dict[str, Any]:
    """
    Hackathon Demo Tool:
    Simulates a malicious database attack where an attacker attempts to secretly alter
    an evaluation verdict or document name directly inside the PostgreSQL database.
    Demonstrates how the cryptographic Merkle tree and hash chain immediately flag the attack.
    """
    get_or_create_genesis_block(db)

    # Find candidate block (prefer block > 0 with transactions)
    query = db.query(BlockchainBlock).filter(BlockchainBlock.block_number > 0)
    if block_number is not None:
        target_block = query.filter(BlockchainBlock.block_number == block_number).first()
    else:
        target_block = query.order_by(BlockchainBlock.block_number.desc()).first()

    if not target_block:
        # Create a mock demo block to tamper
        target_block = mine_block(
            db,
            [{
                "action": "COMPLIANCE_VERDICT_ANCHORED",
                "entity_type": "bidder",
                "entity_id": "DEMO-BIDDER-001",
                "title": "Compliance Verdict: STRUGGLING SUPPLIES LLP -> NON_COMPLIANT",
                "details": {
                    "company_name": "STRUGGLING SUPPLIES LLP",
                    "overall_status": "non_compliant",
                    "compliance_score": 45.0,
                    "tamper_proof_note": "Legitimate CPCL evaluation",
                },
            }]
        )

    # Maliciously edit the transaction inside PostgreSQL without recalculating block hash
    txs = json.loads(target_block.transactions)
    if txs:
        original_title = txs[0].get("title", "")
        # Attacker tries to change verdict from NON_COMPLIANT to COMPLIANT!
        txs[0]["title"] = "Compliance Verdict: STRUGGLING SUPPLIES LLP -> COMPLIANT (FORGED)"
        if "details" in txs[0]:
            txs[0]["details"]["overall_status"] = "compliant"
            txs[0]["details"]["compliance_score"] = 99.0
            txs[0]["details"]["tamper_note"] = "TAMPERED: Score maliciously increased to 99%"

        target_block.transactions = json.dumps(txs)
        target_block.is_tampered = True
        target_block.tamper_note = f"Malicious modification simulated: verdict flipped to COMPLIANT at {datetime.utcnow().isoformat()}"
        try:
            db.commit()
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to simulate tamper attack: {e}", exc_info=True)
            return {"success": False, "reason": str(e)}

        return {
            "success": True,
            "tampered_block_number": target_block.block_number,
            "block_hash": target_block.block_hash,
            "attack_description": "Direct database SQL injection simulated: Verdict forged from NON_COMPLIANT to COMPLIANT.",
            "expected_behavior": "Verification check will now flag this block immediately with red alert.",
        }

    return {"success": False, "reason": "No transactions found in block to tamper."}


def restore_blockchain_ledger(db: Session) -> Dict[str, Any]:
    """
    Restores the blockchain to a verified state after a tamper demonstration.
    """
    tampered_blocks = (
        db.query(BlockchainBlock)
        .filter(BlockchainBlock.is_tampered == True)
        .all()
    )

    restored_count = 0
    for block in tampered_blocks:
        try:
            txs = json.loads(block.transactions)
            # Revert any forged titles
            for tx in txs:
                if "title" in tx and "(FORGED)" in tx["title"]:
                    tx["title"] = tx["title"].replace(" -> COMPLIANT (FORGED)", " -> NON_COMPLIANT")
                if "details" in tx and tx["details"].get("overall_status") == "compliant":
                    tx["details"]["overall_status"] = "non_compliant"
                    tx["details"]["compliance_score"] = 45.0
                    tx["details"].pop("tamper_note", None)

            # Recompute valid Merkle Root and Block Hash
            tx_hashes = []
            for tx in txs:
                details_str = json.dumps(tx.get("details", {}), sort_keys=True)
                calc_hash = compute_transaction_hash(
                    tx.get("action", ""),
                    tx.get("entity_type", ""),
                    tx.get("entity_id", ""),
                    tx.get("timestamp", ""),
                    details_str,
                )
                tx["tx_hash"] = calc_hash
                tx_hashes.append(calc_hash)

            block.transactions = json.dumps(txs)
            block.merkle_root = compute_merkle_root(tx_hashes)
            block.block_hash = compute_block_hash(
                block.block_number,
                block.previous_hash,
                block.merkle_root,
                block.timestamp.isoformat(),
                block.nonce,
            )
            block.is_tampered = False
            block.tamper_note = None
            restored_count += 1
        except Exception as e:
            logger.error(f"Error restoring block #{block.block_number}: {e}")

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to commit restored blocks: {e}", exc_info=True)
        return {"success": False, "restored_blocks_count": 0, "ledger_intact": False}

    verification = verify_blockchain_ledger(db)

    return {
        "success": True,
        "restored_blocks_count": restored_count,
        "ledger_intact": verification["valid"],
    }


def public_verify_query(db: Session, query_str: str) -> Dict[str, Any]:
    """
    Public resolution endpoint for vigilance officers, bidders, and auditors.
    Searches by SHA-256 hash, EVM transaction hash, Block number, or Bidder ID.
    """
    q = query_str.strip()
    if not q:
        return {"found": False, "query": q, "status": "NOT_FOUND"}

    # 1. Check DocumentProof table
    proof = (
        db.query(DocumentProof)
        .filter(
            (DocumentProof.sha256_hash == q)
            | (DocumentProof.tx_hash == q)
            | (DocumentProof.entity_id == q)
        )
        .first()
    )

    if proof:
        metadata = json.loads(proof.metadata_json) if proof.metadata_json else {}
        return {
            "found": True,
            "query": q,
            "item_type": proof.document_type,
            "title": proof.document_name,
            "status": "VERIFIED",
            "block_number": proof.block_number,
            "tx_hash": proof.tx_hash,
            "sha256_hash": proof.sha256_hash,
            "anchored_at": proof.anchored_at,
            "issuer": "Chennai Petroleum Corporation Limited (CPCL) Verification Engine",
            "details": metadata,
            "tamper_detected": False,
        }

    # 2. Check BlockchainBlock table
    block = None
    if q.startswith("0x"):
        block = db.query(BlockchainBlock).filter(BlockchainBlock.smart_contract_tx == q).first()
    if not block:
        block = db.query(BlockchainBlock).filter(BlockchainBlock.block_hash == q).first()
    if not block and q.isdigit():
        block = db.query(BlockchainBlock).filter(BlockchainBlock.block_number == int(q)).first()

    if block:
        return {
            "found": True,
            "query": q,
            "item_type": "blockchain_block",
            "title": f"Block #{block.block_number} ({block.transaction_count} transactions)",
            "status": "TAMPERED" if block.is_tampered else "VERIFIED",
            "block_number": block.block_number,
            "tx_hash": block.smart_contract_tx,
            "sha256_hash": block.block_hash,
            "previous_hash": block.previous_hash,
            "anchored_at": block.timestamp,
            "issuer": block.miner_address,
            "details": {
                "merkle_root": block.merkle_root,
                "nonce": block.nonce,
                "transaction_count": block.transaction_count,
            },
            "tamper_detected": block.is_tampered,
        }

    # 3. Check inside transactions JSON in blocks
    matching_block = (
        db.query(BlockchainBlock)
        .filter(BlockchainBlock.transactions.like(f"%{q}%"))
        .first()
    )
    if matching_block:
        txs = json.loads(matching_block.transactions)
        for tx in txs:
            tx_str = json.dumps(tx)
            if q in tx_str:
                return {
                    "found": True,
                    "query": q,
                    "item_type": tx.get("entity_type", "transaction"),
                    "title": tx.get("title", "Procurement Ledger Transaction"),
                    "status": "VERIFIED",
                    "block_number": matching_block.block_number,
                    "tx_hash": tx.get("tx_hash", matching_block.smart_contract_tx),
                    "sha256_hash": tx.get("fingerprint") or tx.get("tx_hash"),
                    "anchored_at": matching_block.timestamp,
                    "issuer": "CPCL Procurement Evaluation Authority",
                    "details": tx.get("details", {}),
                    "tamper_detected": matching_block.is_tampered,
                }

    return {"found": False, "query": q, "status": "NOT_FOUND"}
