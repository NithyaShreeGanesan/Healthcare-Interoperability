"""Tamper-evident audit logging service using SHA-256 cryptographic hash chaining."""

import datetime
from typing import Any, Dict, List, Optional, Tuple
from flask import request
from app.extensions import db
from app.models.audit_log import AuditLog, GENESIS_HASH


def record_audit_event(
    user_email: str,
    role: str,
    action: str,
    resource_type: str,
    outcome: str,
    master_patient_id: Optional[str] = None,
    reason: Optional[str] = None,
    ip: Optional[str] = None
) -> AuditLog:
    """Record an immutable, tamper-evident audit log chained to the previous entry hash.

    Args:
        user_email: Email of the requesting user.
        role: Security role of user (clinician, patient, payer, admin, auditor).
        action: Gated action (LOGIN, READ, INGEST, CONSENT_GRANT, REVOKE, BREAK_GLASS, ACCESS_BLOCKED).
        resource_type: Resource types accessed or acted upon.
        outcome: Access outcome ('allowed' or 'denied').
        master_patient_id: Target master patient identifier if applicable.
        reason: Justification, consent policy reason, or denial rationale.
        ip: Client IP address (inferred from request if None).

    Returns:
        The newly persisted and cryptographically hashed AuditLog entry.
    """
    if not ip and request:
        ip = request.headers.get("X-Forwarded-For", request.remote_addr or "127.0.0.1")

    # Retrieve latest audit entry to establish cryptographic chain
    last_log = AuditLog.query.order_by(AuditLog.id.desc()).first()
    prev_hash = last_log.entry_hash if last_log else GENESIS_HASH

    # Compute ts once as a UTC datetime truncated to whole seconds (microsecond=0, tzinfo stripped)
    now_utc = datetime.datetime.now(datetime.timezone.utc)
    ts_canonical = now_utc.replace(tzinfo=None, microsecond=0)

    entry = AuditLog(
        ts=ts_canonical,
        user_email=user_email,
        role=role,
        action=action,
        resource_type=resource_type,
        master_patient_id=master_patient_id,
        outcome=outcome,
        reason=reason,
        ip=ip or "127.0.0.1",
        prev_hash=prev_hash,
        entry_hash="TEMP_PENDING_COMPUTATION"
    )

    # Compute entry SHA-256 hash using canonical function
    entry.entry_hash = entry.compute_hash()

    db.session.add(entry)
    db.session.commit()
    return entry


def verify_audit_chain() -> Tuple[bool, Optional[int], str, int]:
    """Verify cryptographic integrity of the entire audit log chain.

    Returns:
        Tuple of (is_valid: bool, broken_entry_id: Optional[int], details: str, total_checked: int).
    """
    logs: List[AuditLog] = AuditLog.query.order_by(AuditLog.id.asc()).all()
    if not logs:
        return True, None, "Audit log is empty; genesis chain valid.", 0

    expected_prev = GENESIS_HASH
    for entry in logs:
        # 1. Verify link to previous entry hash
        if entry.prev_hash != expected_prev:
            return (
                False,
                entry.id,
                f"Hash chain broken at entry #{entry.id}. Expected prev_hash {expected_prev[:12]}..., found {entry.prev_hash[:12]}...",
                len(logs)
            )

        # 2. Recompute SHA-256 hash to verify payload was not altered
        recomputed = entry.compute_hash()
        if entry.entry_hash != recomputed:
            return (
                False,
                entry.id,
                f"Tampering detected at entry #{entry.id}. Computed hash {recomputed[:12]}... does not match recorded entry_hash {entry.entry_hash[:12]}...",
                len(logs)
            )

        expected_prev = entry.entry_hash

    return True, None, f"Audit chain verified successfully across all {len(logs)} entries.", len(logs)
