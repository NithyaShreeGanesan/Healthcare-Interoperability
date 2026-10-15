"""Patient consent management blueprint enforcing FHIR Consent specifications."""

import datetime
import random
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.extensions import db
from app.models.consent import Consent
from app.models.user import User
from app.services.audit_service import record_audit_event

consent_bp = Blueprint("consent", __name__)


@consent_bp.route("", methods=["GET"])
@jwt_required(optional=True)
def list_consents():
    """List active and historical consent directives."""
    master_patient_id = request.args.get("master_patient_id")

    query = Consent.query
    if master_patient_id:
        query = query.filter_by(master_patient_id=master_patient_id)

    consents = query.order_by(Consent.created_at.desc()).all()
    return jsonify({"consents": [c.to_dict() for c in consents]}), 200


@consent_bp.route("", methods=["POST"])
@jwt_required(optional=True)
def create_consent():
    """Create a new consent directive authorized by the patient or clinician."""
    data = request.get_json(silent=True) or {}

    master_patient_id = data.get("master_patient_id")
    grantee_type = data.get("grantee_type") or "role"
    grantee_id = data.get("grantee_id") or "clinician"
    grantee_display = data.get("grantee_display") or grantee_id
    resource_types = data.get("resource_types") or []
    purpose = data.get("purpose") or "treatment"

    if not master_patient_id:
        return jsonify({"message": "master_patient_id is required."}), 400

    # Parse valid_to
    valid_to_str = data.get("valid_to")
    if valid_to_str:
        try:
            valid_to = datetime.datetime.fromisoformat(valid_to_str.replace("Z", "+00:00"))
        except Exception:
            valid_to = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=180)
    else:
        valid_to = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=180)

    consent_id = f"CNS-{random.randint(100, 999)}"
    now = datetime.datetime.now(datetime.timezone.utc)

    consent = Consent(
        id=consent_id,
        master_patient_id=master_patient_id,
        grantee_type=grantee_type,
        grantee_id=grantee_id,
        grantee_display=grantee_display,
        purpose=purpose,
        status="active",
        valid_from=now,
        valid_to=valid_to,
        created_at=now
    )
    consent.resource_types = resource_types

    db.session.add(consent)
    db.session.commit()

    # User context for audit
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id)) if user_id else None
    user_email = user.email if user else "patient_portal@interop.org"
    user_role = user.role if user else "patient"

    record_audit_event(
        user_email=user_email,
        role=user_role,
        action="CONSENT_GRANT",
        resource_type="Consent",
        master_patient_id=master_patient_id,
        outcome="allowed",
        reason=f"Patient granted consent {consent_id} to {grantee_display} for {purpose}"
    )

    return jsonify({"status": "success", "consent": consent.to_dict()}), 201


@consent_bp.route("/<consent_id>", methods=["DELETE"])
@jwt_required(optional=True)
def revoke_consent(consent_id: str):
    """Revoke an existing consent directive."""
    consent = Consent.query.get(consent_id)
    if not consent:
        return jsonify({"message": f"Consent {consent_id} not found."}), 404

    consent.revoke()
    db.session.commit()

    # User context for audit
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id)) if user_id else None
    user_email = user.email if user else "patient_portal@interop.org"
    user_role = user.role if user else "patient"

    record_audit_event(
        user_email=user_email,
        role=user_role,
        action="REVOKE",
        resource_type="Consent",
        master_patient_id=consent.master_patient_id,
        outcome="allowed",
        reason=f"Consent directive {consent_id} revoked by user"
    )

    return jsonify({"status": "success", "message": f"Consent {consent_id} revoked successfully"}), 200
