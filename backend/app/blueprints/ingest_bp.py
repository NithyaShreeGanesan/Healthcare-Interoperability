"""Clinical data ingestion blueprint supporting single intake and FHIR R4 bundles."""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.user import User
from app.services.mpi_service import match_or_create_patient
from app.services.fhir_service import ingest_fhir_bundle
from app.services.audit_service import record_audit_event

ingest_bp = Blueprint("ingest", __name__)


@ingest_bp.route("", methods=["POST"])
@jwt_required(optional=True)
def ingest():
    """Ingest either a raw HL7 FHIR R4 Bundle or single patient demographic intake."""
    data = request.get_json(silent=True) or {}
    source_system = request.headers.get("X-Source-System", data.get("source_system", "Hospital A"))

    # Resolve user context if authenticated
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id)) if user_id else None
    user_email = user.email if user else "system_intake@interop.org"
    user_role = user.role if user else "clinician"

    # Case 1: Ingesting an HL7 FHIR R4 Bundle
    if data.get("resourceType") == "Bundle":
        try:
            result = ingest_fhir_bundle(data, source_system=source_system)
            record_audit_event(
                user_email=user_email,
                role=user_role,
                action="INGEST",
                resource_type="Bundle",
                master_patient_id=result.get("master_patient_id"),
                outcome="allowed",
                reason=f"Ingested FHIR Bundle ({result.get('accepted')} resources) from {source_system}"
            )
            return jsonify(result), 200
        except Exception as e:
            return jsonify({"status": "error", "message": str(e)}), 400

    # Case 2: Ingesting single patient demographic intake
    first_name = data.get("firstName") or data.get("first_name")
    last_name = data.get("lastName") or data.get("last_name")
    dob = data.get("dob") or data.get("birthDate")

    if not first_name or not last_name or not dob:
        return jsonify({
            "status": "error",
            "message": "Missing required fields: firstName, lastName, and dob are required."
        }), 400

    patient, match_type, conf, is_new = match_or_create_patient(
        first_name=first_name,
        last_name=last_name,
        dob=dob,
        gender=data.get("gender"),
        identifier=data.get("ssn") or data.get("identifier"),
        source_system=source_system,
        local_patient_id=data.get("localId") or data.get("local_id"),
        phone=data.get("phone"),
        address=data.get("address"),
        blood_type=data.get("bloodType") or data.get("blood_type"),
        email=data.get("email")
    )

    record_audit_event(
        user_email=user_email,
        role=user_role,
        action="INGEST",
        resource_type="Patient",
        master_patient_id=patient.id,
        outcome="allowed",
        reason=f"Patient intake mapped via {match_type} with confidence {conf} from {source_system}"
    )

    return jsonify({
        "status": "success",
        "master_patient_id": patient.id,
        "fhir_id": f"patient-{patient.id}",
        "match_status": match_type,
        "match_score": conf,
        "message": f"Patient {'registered as new record' if is_new else 'matched to existing record'} in Master Patient Index (MPI)."
    }), 201
