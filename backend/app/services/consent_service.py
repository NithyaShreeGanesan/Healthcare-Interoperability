"""Consent evaluation engine enforcing patient consent directives and break-glass overrides."""

from typing import List, Optional, Tuple, Dict, Any
from app.models.consent import Consent
from app.models.user import User


def evaluate_consent(
    user: User,
    master_patient_id: str,
    requested_resource_types: Optional[List[str]] = None,
    purpose: str = "treatment",
    break_glass: bool = False,
    justification: Optional[str] = None
) -> Tuple[bool, str, List[str]]:
    """Evaluate whether access to patient records is authorized under patient consent or break-glass.

    Returns:
        Tuple of (allowed: bool, reason: str, unconsented_resource_types: list[str]).
    """
    # 1. Emergency Break-Glass Override
    if break_glass:
        if user.role not in ("clinician", "admin"):
            return False, f"Break-glass emergency override is strictly restricted to clinicians (current role: {user.role}).", []
        if not justification or len(justification.strip()) < 10:
            return False, "Break-Glass emergency override requires a detailed clinical justification (minimum 10 characters).", []
        return True, f"EMERGENCY BREAK-GLASS OVERRIDE: {justification.strip()}", []

    # 2. Patient Self-Access
    if user.role == "patient":
        if user.linked_patient_id == master_patient_id:
            return True, "Patient self-access granted.", []
        return False, "Access Denied: Patients are strictly restricted to accessing their own clinical records.", requested_resource_types or []

    # 3. Administrative / Auditor Compliance Access
    if user.role in ("admin", "auditor"):
        return True, f"Authorized by role-based operational permissions ({user.role}).", []

    # 4. Clinician & Payer Consent Directives Check
    active_consents: List[Consent] = Consent.query.filter_by(
        master_patient_id=master_patient_id,
        status="active"
    ).all()

    # Filter to consents matching this grantee and purpose
    matching_consents = []
    user_role_lower = (user.role or "").lower()
    user_org_lower = (user.org or "").lower()

    for c in active_consents:
        if not c.is_active():
            continue
        if not c.allows_purpose(purpose):
            continue

        g_type = (c.grantee_type or "").lower()
        g_id = (c.grantee_id or "").lower()

        is_match = False
        if g_id in ("*", "all"):
            is_match = True
        elif g_type == "role" and g_id == user_role_lower:
            is_match = True
        elif g_type == "organization" and (g_id in user_org_lower or user_org_lower in g_id):
            is_match = True

        if is_match:
            matching_consents.append(c)

    if not matching_consents:
        return (
            False,
            f"Access Denied: Patient has not granted active consent to role '{user.role}' or organization '{user.org}' for purpose '{purpose}'.",
            requested_resource_types or ["All Resources"]
        )

    # Check resource type authorization
    req_types = requested_resource_types if requested_resource_types and len(requested_resource_types) > 0 else ["*"]
    unconsented: List[str] = []

    for req_type in req_types:
        covered = False
        for c in matching_consents:
            if c.allows_resource(req_type):
                covered = True
                break
        if not covered:
            unconsented.append(req_type)

    if unconsented:
        return (
            False,
            f"Access Denied: Patient consent policy does not permit role '{user.role}' to access: {', '.join(unconsented)}.",
            unconsented
        )

    return True, "Authorized by active patient consent directive.", []
