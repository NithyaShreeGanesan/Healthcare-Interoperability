"""Audit log model with SHA-256 cryptographic tamper-evident hash chaining."""

import datetime
import hashlib
from typing import Any, Dict, Optional
from app.extensions import db

GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000"


def compute_canonical_audit_hash(
    prev_hash: Optional[str],
    ts: Optional[datetime.datetime],
    user_email: Optional[str],
    role: Optional[str],
    action: Optional[str],
    resource_type: Optional[str],
    master_patient_id: Optional[str],
    outcome: Optional[str],
    reason: Optional[str],
    ip: Optional[str]
) -> str:
    """Compute canonical deterministic SHA-256 hash for audit entry."""
    if ts is not None:
        ts_str = ts.strftime("%Y-%m-%dT%H:%M:%S")
    else:
        ts_str = ""

    fields = [
        str(prev_hash or ""),
        ts_str,
        str(user_email or ""),
        str(role or ""),
        str(action or ""),
        str(resource_type or ""),
        str(master_patient_id or ""),
        str(outcome or ""),
        str(reason or ""),
        str(ip or "")
    ]
    canonical = "|".join(fields)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


class AuditLog(db.Model):
    """Immutable audit trail with cryptographic hash chaining to detect tampering."""

    __tablename__ = "audit_logs"

    id = db.Column(db.Integer, primary_key=True)
    ts = db.Column(db.DateTime, nullable=False)
    user_email = db.Column(db.String(120), nullable=False)
    role = db.Column(db.String(50), nullable=False)
    action = db.Column(db.String(50), nullable=False)  # 'LOGIN', 'READ', 'INGEST', 'CONSENT_GRANT', 'REVOKE', 'BREAK_GLASS', 'ACCESS_BLOCKED'
    resource_type = db.Column(db.String(100), nullable=False)
    master_patient_id = db.Column(db.String(64), nullable=True)
    outcome = db.Column(db.String(20), nullable=False)  # 'allowed', 'denied'
    reason = db.Column(db.Text, nullable=True)
    ip = db.Column(db.String(50), nullable=True, default="127.0.0.1")
    prev_hash = db.Column(db.String(64), nullable=False, default=GENESIS_HASH)
    entry_hash = db.Column(db.String(64), nullable=False)

    def compute_hash(self) -> str:
        """Calculate the deterministic SHA-256 hash of this audit log entry chained to prev_hash."""
        return compute_canonical_audit_hash(
            prev_hash=self.prev_hash,
            ts=self.ts,
            user_email=self.user_email,
            role=self.role,
            action=self.action,
            resource_type=self.resource_type,
            master_patient_id=self.master_patient_id,
            outcome=self.outcome,
            reason=self.reason,
            ip=self.ip
        )

    def to_dict(self) -> Dict[str, Any]:
        """Serialize audit log entry."""
        return {
            "id": self.id,
            "ts": self.ts.strftime("%Y-%m-%dT%H:%M:%SZ") if self.ts else None,
            "user_email": self.user_email,
            "role": self.role,
            "action": self.action,
            "resource_type": self.resource_type,
            "master_patient_id": self.master_patient_id,
            "outcome": self.outcome,
            "reason": self.reason,
            "ip": self.ip,
            "prev_hash": self.prev_hash,
            "entry_hash": self.entry_hash,
        }
