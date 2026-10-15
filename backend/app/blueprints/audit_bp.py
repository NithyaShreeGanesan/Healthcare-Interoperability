"""Audit trail blueprint providing access and cryptographic verification."""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.extensions import db
from app.models.audit_log import AuditLog
from app.models.user import User
from app.services.audit_service import verify_audit_chain

audit_bp = Blueprint("audit", __name__)


@audit_bp.route("", methods=["GET"])
@jwt_required(optional=True)
def get_audit_logs():
    """Retrieve audit logs with optional filters."""
    action = request.args.get("action")
    role = request.args.get("role")
    patient_id = request.args.get("master_patient_id")

    query = AuditLog.query
    if action:
        query = query.filter_by(action=action)
    if role:
        query = query.filter_by(role=role)
    if patient_id:
        query = query.filter_by(master_patient_id=patient_id)

    logs = query.order_by(AuditLog.id.desc()).limit(200).all()
    return jsonify({"logs": [l.to_dict() for l in logs]}), 200


@audit_bp.route("/verify", methods=["GET"])
def verify_integrity():
    """Verify cryptographic SHA-256 hash chaining of all audit log entries."""
    is_valid, broken_id, details, total = verify_audit_chain()
    return jsonify({
        "is_valid": is_valid,
        "details": details,
        "total_verified": total,
        "broken_entry_id": broken_id
    }), 200


@audit_bp.route("/simulate-tamper", methods=["POST"])
@jwt_required(optional=True)
def simulate_tamper():
    """Simulate unauthorized database tampering on an audit entry to test cryptographic detection."""
    last_log = AuditLog.query.order_by(AuditLog.id.desc()).first()
    if not last_log:
        return jsonify({"message": "No audit records exist to tamper with."}), 400

    # Modify the record reason directly without recalculating entry_hash
    last_log.reason = f"[TAMPERED] Malicious unauthorized record edit - {last_log.reason}"
    db.session.commit()

    return jsonify({
        "status": "tampered",
        "message": f"Audit entry #{last_log.id} was altered in DB without updating its hash. Run /api/audit-logs/verify to observe detection.",
        "tampered_id": last_log.id
    }), 200
