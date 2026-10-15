"""Clinical record query blueprint strictly gated by Auth -> RBAC -> Consent -> Audit Log."""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.extensions import db
from app.models.user import User
from app.models.patient import MasterPatient
from app.models.clinical_resource import ClinicalResource
from app.services.consent_service import evaluate_consent
from app.services.audit_service import record_audit_event
from app.utils.fhir_helpers import calculate_freshness

records_bp = Blueprint("records", __name__)


@records_bp.route("/request", methods=["POST"])
@jwt_required()
def request_records():
    """Execute a clinical record request strictly guarded by the 4-Stage Security Gate.

    Security Gate Pipeline:
    1. Authentication (JWT verified by decorator)
    2. RBAC check on requesting user role
    3. Patient Consent Verification (active policy check or emergency break-glass)
    4. Cryptographic Tamper-Evident Audit Log
    """
    user_id = get_jwt_identity()
    user = db.session.get(User, int(user_id)) if user_id else None
    if not user:
        return jsonify({"message": "User session invalid or expired."}), 401

    data = request.get_json(silent=True) or {}
    master_patient_id = data.get("master_patient_id")
    patient_name = (data.get("patientName") or "").strip()
    dob = (data.get("dob") or "").strip()
    resource_types = data.get("resourceTypes") or []
    purpose = data.get("purpose") or "treatment"
    break_glass = bool(data.get("breakGlass", False))
    justification = (data.get("justification") or "").strip()

    # RBAC Patient Boundary Gate: Patients are strictly confined to their own linked record
    if user.role == "patient":
        if master_patient_id and master_patient_id != user.linked_patient_id:
            record_audit_event(
                user_email=user.email,
                role=user.role,
                action="ACCESS_BLOCKED",
                resource_type=", ".join(resource_types) if resource_types else "ALL",
                master_patient_id=master_patient_id,
                outcome="denied",
                reason="Access Denied: Patients are strictly restricted to accessing their own clinical records."
            )
            return jsonify({
                "message": "Access Denied: Read blocked by Patient Consent Policy.",
                "reason": "Access Denied: Patients are strictly restricted to accessing their own clinical records.",
                "status": 403,
                "consentStatus": "no_consent"
            }), 403

        # Default patient query to their own linked ID if not provided
        if not master_patient_id:
            master_patient_id = user.linked_patient_id

    # Step 1: Find target patient
    patient = None
    if master_patient_id:
        patient = db.session.get(MasterPatient, master_patient_id)

    if not patient and patient_name:
        name_parts = patient_name.split()
        if len(name_parts) >= 2:
            fn, ln = name_parts[0], name_parts[-1]
            q = MasterPatient.query.filter(
                MasterPatient.first_name.ilike(f"%{fn}%"),
                MasterPatient.last_name.ilike(f"%{ln}%")
            )
            if dob:
                q = q.filter_by(dob=dob)
            patient = q.first()
        else:
            q = MasterPatient.query.filter(
                (MasterPatient.first_name.ilike(f"%{patient_name}%")) |
                (MasterPatient.last_name.ilike(f"%{patient_name}%"))
            )
            if dob:
                q = q.filter_by(dob=dob)
            patient = q.first()

    # Fallback to first registered patient only when no query identifier was provided
    if not patient and not master_patient_id and not patient_name:
        patient = MasterPatient.query.first()

    if not patient:
        return jsonify({"message": "No matching patient found in Master Patient Index."}), 404

    target_mp_id = patient.id

    # Step 2 & 3: Evaluate Consent & RBAC & Break-Glass Gate
    allowed, reason, unconsented = evaluate_consent(
        user=user,
        master_patient_id=target_mp_id,
        requested_resource_types=resource_types,
        purpose=purpose,
        break_glass=break_glass,
        justification=justification
    )

    if not allowed:
        # Stage 4: Record Blocked Audit Log
        record_audit_event(
            user_email=user.email,
            role=user.role,
            action="ACCESS_BLOCKED",
            resource_type=", ".join(resource_types) if resource_types else "ALL",
            master_patient_id=target_mp_id,
            outcome="denied",
            reason=reason
        )
        return jsonify({
            "message": "Access Denied: Read blocked by Patient Consent Policy.",
            "reason": reason,
            "status": 403,
            "consentStatus": "no_consent",
            "unconsented_resources": unconsented
        }), 403

    # Step 4: Record Audit Event (READ or BREAK_GLASS)
    action_type = "BREAK_GLASS" if break_glass else "READ"
    record_audit_event(
        user_email=user.email,
        role=user.role,
        action=action_type,
        resource_type=", ".join(resource_types) if resource_types else "ALL",
        master_patient_id=target_mp_id,
        outcome="allowed",
        reason=reason
    )

    # Step 5: Query clinical resources with lineage and calculate freshness
    res_query = ClinicalResource.query.filter_by(master_patient_id=target_mp_id)
    if resource_types and len(resource_types) > 0 and "*" not in resource_types:
        res_query = res_query.filter(ClinicalResource.resource_type.in_(resource_types))

    db_records = res_query.order_by(ClinicalResource.effective_date.desc()).all()

    formatted_records = []
    for r in db_records:
        rec_dict = r.to_dict()
        rec_dict["freshness"] = calculate_freshness(rec_dict.get("last_updated"))
        formatted_records.append(rec_dict)

    return jsonify({
        "master_patient_id": target_mp_id,
        "patient": patient.to_dict(include_sensitive=(user.role in ("clinician", "admin") or user.linked_patient_id == target_mp_id)),
        "records": formatted_records,
        "break_glass_active": break_glass,
        "gate_status": {
            "authenticated": True,
            "role_permitted": True,
            "consent_verified": True,
            "audit_logged": True
        }
    }), 200
