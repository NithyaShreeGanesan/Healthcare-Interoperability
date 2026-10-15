"""FHIR R4 Ingestion and parsing engine with terminology normalization and provenance."""

import datetime
import json
from typing import Any, Dict, List, Optional, Tuple
from app.extensions import db
from app.models.clinical_resource import ClinicalResource
from app.models.patient import MasterPatient
from app.services.mpi_service import match_or_create_patient
from app.services.conflict_detector import detect_and_record_conflicts
from app.utils.fhir_helpers import extract_resource_summary, validate_fhir_resource


def ingest_fhir_bundle(
    bundle_dict: Dict[str, Any],
    source_system: str = "Hospital A"
) -> Dict[str, Any]:
    """Ingest a complete HL7 FHIR R4 Bundle into the MPI and Clinical Data repository.

    Args:
        bundle_dict: Raw JSON dictionary of FHIR R4 Bundle.
        source_system: Identifier of source system submitting the bundle.

    Returns:
        Ingestion summary with accepted/rejected counts, resolved master_patient_id, and batch stats.
    """
    if bundle_dict.get("resourceType") != "Bundle":
        raise ValueError("Invalid payload: root element must have resourceType: 'Bundle'.")

    entries = bundle_dict.get("entry", [])
    if not entries:
        return {
            "status": "success",
            "message": "Empty bundle processed.",
            "total_resources": 0,
            "accepted": 0,
            "rejected": 0,
            "source_system": source_system
        }

    # Step 1: Identify and resolve Patient resource first if present
    patient_res = None
    other_entries = []
    for entry in entries:
        res = entry.get("resource", {})
        if res.get("resourceType") == "Patient":
            patient_res = res
        else:
            other_entries.append(res)

    master_patient: Optional[MasterPatient] = None
    match_status = "unmatched"

    if patient_res:
        name_obj = patient_res.get("name", [{}])[0]
        given_names = name_obj.get("given", ["Unknown"])
        first_name = given_names[0] if isinstance(given_names, list) and given_names else "Unknown"
        last_name = name_obj.get("family", "Unknown")
        dob = patient_res.get("birthDate", "1980-01-01")
        gender = patient_res.get("gender")

        # Extract identifier (SSN or local MRN)
        identifier_val = None
        for ident in patient_res.get("identifier", []):
            if ident.get("value"):
                identifier_val = ident.get("value")
                break

        master_patient, match_type, conf, is_new = match_or_create_patient(
            first_name=first_name,
            last_name=last_name,
            dob=dob,
            gender=gender,
            identifier=identifier_val,
            source_system=source_system,
            local_patient_id=patient_res.get("id"),
            blood_type=patient_res.get("extension", [{}])[0].get("valueString") if patient_res.get("extension") else None
        )
        match_status = f"{match_type} (conf: {conf})"

    accepted_count = 1 if patient_res else 0
    rejected_count = 0
    rejected_errors = []

    # Step 2: Ingest other clinical resources linked to this patient
    mp_id = master_patient.id if master_patient else "MP-UNKNOWN"

    for res in other_entries:
        is_valid, errs = validate_fhir_resource(res)
        if not is_valid:
            rejected_count += 1
            rejected_errors.append({"resourceType": res.get("resourceType"), "errors": errs})
            continue

        summary = extract_resource_summary(res)
        res_type = summary["resourceType"]
        fhir_id = summary["id"]

        # Parse effective date
        eff_dt = None
        try:
            eff_dt = datetime.datetime.fromisoformat(summary["effective_date"].replace("Z", "+00:00"))
        except Exception:
            eff_dt = datetime.datetime.now(datetime.timezone.utc)

        # Ingested timestamp
        now = datetime.datetime.now(datetime.timezone.utc)

        # Check for existing record to update or insert
        existing = ClinicalResource.query.filter_by(
            master_patient_id=mp_id,
            source_system=source_system,
            fhir_id=fhir_id
        ).first()

        if existing:
            existing.code = summary["code"]
            existing.display = summary["display"]
            existing.status = summary["status"]
            existing.effective_date = eff_dt
            existing.last_updated = now
            existing.resource_json = json.dumps(res)
        else:
            new_res = ClinicalResource(
                master_patient_id=mp_id,
                source_system=source_system,
                resource_type=res_type,
                fhir_id=fhir_id,
                code=summary["code"],
                display=summary["display"],
                status=summary["status"],
                effective_date=eff_dt,
                last_updated=now,
                ingested_at=now,
                resource_json=json.dumps(res)
            )
            db.session.add(new_res)

        accepted_count += 1

    db.session.commit()

    # Step 3: Trigger cross-system conflict detection
    if master_patient:
        detect_and_record_conflicts(master_patient.id)

    return {
        "status": "success",
        "message": f"Ingested {accepted_count} resources into Master Patient Index ({mp_id}).",
        "master_patient_id": mp_id,
        "match_status": match_status,
        "total_resources": len(entries),
        "accepted": accepted_count,
        "rejected": rejected_count,
        "rejected_errors": rejected_errors,
        "source_system": source_system,
        "batch_id": f"BATCH-{int(datetime.datetime.now().timestamp())}"
    }
