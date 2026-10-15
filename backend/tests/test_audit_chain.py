"""Tests for tamper-evident SHA-256 cryptographic audit chaining."""

import pytest
from app.extensions import db
from app.models.audit_log import AuditLog
from app.services.audit_service import record_audit_event, verify_audit_chain


def test_audit_chain_validity(app):
    """Verify clean audit chain validates successfully."""
    with app.app_context():
        # Add 3 audit entries
        record_audit_event("user1@example.com", "clinician", "LOGIN", "Auth", "allowed", reason="Login")
        record_audit_event("user1@example.com", "clinician", "READ", "Patient", "allowed", master_patient_id="MP-83921", reason="Chart review")
        record_audit_event("user2@example.com", "payer", "ACCESS_BLOCKED", "Observation", "denied", reason="No consent")

        is_valid, broken_id, details, total = verify_audit_chain()
        assert is_valid is True
        assert broken_id is None
        assert total >= 4


def test_audit_chain_tamper_detection(app):
    """Verify that unauthorized modification of any audit entry breaks the cryptographic chain."""
    with app.app_context():
        record_audit_event("user1@example.com", "clinician", "READ", "Patient", "allowed", master_patient_id="MP-83921", reason="Initial chart review")
        record_audit_event("user2@example.com", "payer", "READ", "Medication", "allowed", master_patient_id="MP-83921", reason="Payment review")

        # Now simulate attacker tampering with the database: alter the reason on an entry without updating entry_hash
        target_entry = AuditLog.query.order_by(AuditLog.id.desc()).offset(1).first()
        target_id = target_entry.id
        target_entry.reason = "ALTERED REASON: Malicious unauthorized chart access covered up"
        db.session.commit()

        # Run cryptographic verification
        is_valid, broken_id, details, total = verify_audit_chain()
        assert is_valid is False
        assert broken_id == target_id
        assert "Tampering detected" in details
