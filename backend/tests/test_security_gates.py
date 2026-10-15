"""Tests for the 4-Stage Security Gate: Auth -> RBAC -> Consent -> Audit Log."""

import pytest
from app.models.audit_log import AuditLog


def test_unauthenticated_request_blocked(client):
    """Stage 1: Verify unauthenticated requests are strictly rejected with 401."""
    res = client.post("/api/records/request", json={"master_patient_id": "MP-83921"})
    assert res.status_code == 401


def test_clinician_read_with_active_consent(client, auth_tokens):
    """Stages 1-4: Verify clinician read succeeds under active consent and is logged."""
    headers = auth_tokens["clinician"]
    payload = {
        "master_patient_id": "MP-83921",
        "resourceTypes": ["Condition", "Observation"],
        "purpose": "treatment"
    }
    res = client.post("/api/records/request", json=payload, headers=headers)
    assert res.status_code == 200
    data = res.get_json()
    assert data["master_patient_id"] == "MP-83921"
    assert len(data["records"]) == 2
    assert data["break_glass_active"] is False

    # Verify audit log was recorded
    last_audit = AuditLog.query.order_by(AuditLog.id.desc()).first()
    assert last_audit.action == "READ"
    assert last_audit.outcome == "allowed"
    assert last_audit.master_patient_id == "MP-83921"


def test_payer_read_blocked_by_consent_gate(client, auth_tokens):
    """Stage 3: Verify payer request for unconsented Observation is blocked with 403."""
    headers = auth_tokens["payer"]
    # Payer only has consent for Condition & MedicationRequest, NOT Observation
    payload = {
        "master_patient_id": "MP-83921",
        "resourceTypes": ["Observation"],
        "purpose": "payment"
    }
    res = client.post("/api/records/request", json=payload, headers=headers)
    assert res.status_code == 403
    data = res.get_json()
    assert data["consentStatus"] == "no_consent"
    assert "Access Denied" in data["message"]

    # Verify ACCESS_BLOCKED audit entry was created
    last_audit = AuditLog.query.order_by(AuditLog.id.desc()).first()
    assert last_audit.action == "ACCESS_BLOCKED"
    assert last_audit.outcome == "denied"
    assert last_audit.role == "payer"


def test_break_glass_emergency_override(client, auth_tokens):
    """Stage 3 Override: Verify emergency break-glass permits access with audit tracking."""
    headers = auth_tokens["clinician"]
    payload = {
        "master_patient_id": "MP-83921",
        "resourceTypes": ["Observation"],
        "purpose": "emergency",
        "breakGlass": True,
        "justification": "Patient unconscious in trauma bay; immediate lab review required."
    }
    res = client.post("/api/records/request", json=payload, headers=headers)
    assert res.status_code == 200
    data = res.get_json()
    assert data["break_glass_active"] is True
    assert len(data["records"]) > 0

    # Verify BREAK_GLASS audit entry was created
    last_audit = AuditLog.query.order_by(AuditLog.id.desc()).first()
    assert last_audit.action == "BREAK_GLASS"
    assert last_audit.outcome == "allowed"
    assert "EMERGENCY BREAK-GLASS" in last_audit.reason


def test_break_glass_rejected_short_justification(client, auth_tokens):
    """Stage 3 Override: Break-glass must fail if clinical justification is inadequate."""
    headers = auth_tokens["clinician"]
    payload = {
        "master_patient_id": "MP-83921",
        "resourceTypes": ["Observation"],
        "breakGlass": True,
        "justification": "Urgent"  # Too short (<10 chars)
    }
    res = client.post("/api/records/request", json=payload, headers=headers)
    assert res.status_code == 403
    assert "detailed clinical justification" in res.get_json()["reason"]


def test_patient_self_access_rules(client, auth_tokens):
    """Stage 2 & 3: Patients can access their own record, but not other patients'."""
    patient_headers = auth_tokens["patient"]

    # Own record (Jane Doe MP-83921)
    res_own = client.post("/api/records/request", json={"master_patient_id": "MP-83921"}, headers=patient_headers)
    assert res_own.status_code == 200

    # Other patient record (e.g., MP-99999)
    res_other = client.post("/api/records/request", json={"master_patient_id": "MP-99999"}, headers=patient_headers)
    assert res_other.status_code == 403
