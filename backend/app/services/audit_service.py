"""Tiny helper for writing AuditLog rows consistently across services.

Also implements a lightweight, blockchain-inspired hash chain over the
audit log: every new entry stores a SHA-256 hash of its own data plus the
previous entry's hash. Because each hash depends on the one before it,
editing or deleting any past row breaks the chain from that point onward -
this is exactly the "tamper-evident, append-only ledger" property that
makes blockchains useful for audit trails, without needing a distributed
network or consensus (there's a single trusted database here, so a full
multi-node blockchain would be unnecessary overhead).
"""
import hashlib
import json
from datetime import datetime
from typing import Any, Dict, Optional

from app.models.audit import AuditLog

# Hash used as the "previous_hash" of the very first audit entry ever
# written (there is nothing before it to point to).
GENESIS_HASH = "0" * 64


def _compute_hash(
    previous_hash: str,
    user_id: Optional[str],
    action: str,
    entity_type: Optional[str],
    entity_id: Optional[str],
    details: Optional[str],
    created_at: datetime,
) -> str:
    """Deterministically hash one audit entry's fields together with the
    previous entry's hash, so the result changes if ANY of them change."""
    payload = "|".join([
        previous_hash,
        str(user_id) if user_id else "",
        action or "",
        entity_type or "",
        entity_id or "",
        details or "",
        created_at.isoformat(),
    ])
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def log_action(
    db,
    action: str,
    entity_type: str,
    entity_id: str,
    user_id: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
) -> None:
    details_json = json.dumps(details) if details is not None else None
    created_at = datetime.utcnow()

    last_entry = (
        db.query(AuditLog)
        .order_by(AuditLog.created_at.desc(), AuditLog.id.desc())
        .first()
    )
    previous_hash = last_entry.record_hash if last_entry and last_entry.record_hash else GENESIS_HASH

    record_hash = _compute_hash(
        previous_hash, user_id, action, entity_type, entity_id, details_json, created_at
    )

    entry = AuditLog(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id),
        details=details_json,
        created_at=created_at,
        previous_hash=previous_hash,
        record_hash=record_hash,
    )
    db.add(entry)
    db.commit()


def verify_chain_integrity(db) -> Dict[str, Any]:
    """Walk the entire audit log in order and recompute each entry's hash
    to confirm nothing was edited, deleted, or reordered after the fact.

    Returns a summary dict with `valid`, `total_checked`, and - if broken -
    which entry is the first one that doesn't match what its hash proves
    it should be.
    """
    entries = (
        db.query(AuditLog)
        .order_by(AuditLog.created_at.asc(), AuditLog.id.asc())
        .all()
    )

    expected_previous_hash = GENESIS_HASH
    for entry in entries:
        if entry.previous_hash is None or entry.record_hash is None:
            # Entry predates the hash-chain feature being enabled.
            expected_previous_hash = entry.record_hash or expected_previous_hash
            continue

        if entry.previous_hash != expected_previous_hash:
            return {
                "valid": False,
                "total_checked": len(entries),
                "broken_at_entry_id": str(entry.id),
                "reason": "previous_hash does not match the prior entry's record_hash - "
                          "a row may have been inserted, deleted, or reordered.",
            }

        recomputed = _compute_hash(
            entry.previous_hash,
            entry.user_id,
            entry.action,
            entry.entity_type,
            entry.entity_id,
            entry.details,
            entry.created_at,
        )
        if recomputed != entry.record_hash:
            return {
                "valid": False,
                "total_checked": len(entries),
                "broken_at_entry_id": str(entry.id),
                "reason": "record_hash does not match the entry's own data - "
                          "this row was edited after it was written.",
            }

        expected_previous_hash = entry.record_hash

    return {"valid": True, "total_checked": len(entries)}
