"""FHIR R4 formatting, validation, and lineage extraction utilities."""

import datetime
from typing import Any, Dict, List, Optional, Tuple


def calculate_freshness(iso_date_str: Optional[str]) -> Dict[str, Any]:
    """Calculate freshness metrics from an ISO 8601 timestamp.

    Args:
        iso_date_str: Timestamp string (e.g., '2026-08-10T12:00:00Z').

    Returns:
        Dictionary containing days_old, label ('fresh', 'moderate', 'stale'), and display.
    """
    if not iso_date_str:
        return {"days_old": 999, "status": "stale", "label": "Unknown Date"}

    try:
        cleaned = iso_date_str.replace("Z", "+00:00")
        if "T" in cleaned:
            dt = datetime.datetime.fromisoformat(cleaned)
        else:
            dt = datetime.datetime.fromisoformat(f"{cleaned}T00:00:00+00:00")

        now = datetime.datetime.now(datetime.timezone.utc)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=datetime.timezone.utc)

        days = max(0, (now - dt).days)
        if days <= 30:
            status = "fresh"
            label = f"{days}d ago (Fresh)"
        elif days <= 180:
            status = "moderate"
            label = f"{days}d ago (Recent)"
        else:
            status = "stale"
            label = f"{days}d ago (Stale > 180d)"

        return {"days_old": days, "status": status, "label": label, "timestamp": iso_date_str}
    except Exception:
        return {"days_old": 999, "status": "stale", "label": "Invalid Date", "timestamp": iso_date_str}


def validate_fhir_resource(resource: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """Validate basic HL7 FHIR R4 resource structure.

    Args:
        resource: Resource JSON dictionary.

    Returns:
        Tuple of (is_valid: bool, errors: list[str]).
    """
    errors: List[str] = []
    if not isinstance(resource, dict):
        return False, ["Resource must be a valid JSON object."]

    resource_type = resource.get("resourceType")
    if not resource_type:
        errors.append("Missing required field: 'resourceType'.")

    # Common required fields per standard FHIR R4
    if resource_type == "Patient":
        if "name" not in resource and "identifier" not in resource:
            errors.append("Patient resource must contain at least 'name' or 'identifier'.")
    elif resource_type in ("Condition", "Observation", "AllergyIntolerance", "MedicationRequest"):
        if "code" not in resource and "medicationCodeableConcept" not in resource:
            errors.append(f"{resource_type} should include a coded concept ('code').")

    return len(errors) == 0, errors


def extract_resource_summary(resource: Dict[str, Any]) -> Dict[str, Any]:
    """Extract standard searchable and displayable summary properties from a FHIR resource.

    Args:
        resource: FHIR R4 resource dictionary.

    Returns:
        Extracted summary dictionary.
    """
    res_type = resource.get("resourceType", "Resource")
    fhir_id = resource.get("id", "unknown-id")
    status = resource.get("status", resource.get("clinicalStatus", {}).get("coding", [{}])[0].get("code", "active"))

    # Extract primary code and display
    code_val = "N/A"
    display_val = "Unspecified Resource"

    code_obj = resource.get("code") or resource.get("medicationCodeableConcept")
    if isinstance(code_obj, dict):
        coding = code_obj.get("coding", [])
        if coding and isinstance(coding, list):
            code_val = coding[0].get("code", "N/A")
            display_val = coding[0].get("display", code_obj.get("text", display_val))
        elif code_obj.get("text"):
            display_val = code_obj.get("text")

    # Effective or recorded date
    effective_date = (
        resource.get("effectiveDateTime")
        or resource.get("recordedDate")
        or resource.get("authoredOn")
        or resource.get("onsetDateTime")
        or datetime.datetime.now(datetime.timezone.utc).isoformat()
    )

    # Lineage and freshness
    meta = resource.get("meta", {})
    last_updated = meta.get("lastUpdated") or effective_date
    source_system = meta.get("source", "Hospital A")
    if source_system.startswith("#"):
        source_system = source_system[1:]

    return {
        "resourceType": res_type,
        "id": fhir_id,
        "code": code_val,
        "display": display_val,
        "status": status,
        "effective_date": effective_date,
        "last_updated": last_updated,
        "source_system": source_system
    }
