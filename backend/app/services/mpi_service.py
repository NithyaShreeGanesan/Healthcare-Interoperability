"""Master Patient Index (MPI) matching service supporting deterministic and probabilistic linkage."""

import difflib
import random
from typing import Any, Dict, List, Optional, Tuple
from app.extensions import db
from app.models.patient import MasterPatient, LocalPatientMapping
from app.utils.crypto import blind_index_hash, encrypt_field


def string_similarity(s1: str, s2: str) -> float:
    """Calculate normalized character sequence similarity ratio between 0.0 and 1.0."""
    if not s1 or not s2:
        return 0.0
    s1_norm = s1.lower().strip()
    s2_norm = s2.lower().strip()
    if s1_norm == s2_norm:
        return 1.0
    return difflib.SequenceMatcher(None, s1_norm, s2_norm).ratio()


def generate_master_patient_id() -> str:
    """Generate a unique random Master Patient ID (e.g. MP-84920)."""
    while True:
        candidate = f"MP-{random.randint(10000, 99999)}"
        if not db.session.get(MasterPatient, candidate):
            return candidate


def match_or_create_patient(
    first_name: str,
    last_name: str,
    dob: str,
    gender: Optional[str] = None,
    identifier: Optional[str] = None,
    source_system: str = "Hospital A",
    local_patient_id: Optional[str] = None,
    phone: Optional[str] = None,
    address: Optional[str] = None,
    blood_type: Optional[str] = None,
    email: Optional[str] = None
) -> Tuple[MasterPatient, str, float, bool]:
    """Execute MPI matching against registered patients.

    Returns:
        Tuple of (MasterPatient, match_type: str, confidence_score: float, is_new: bool).
    """
    id_hash = blind_index_hash(identifier) if identifier else None

    # Step 1: Check existing LocalPatientMapping for this specific source system & local_id
    if local_patient_id:
        existing_mapping = LocalPatientMapping.query.filter_by(
            source_system=source_system,
            local_patient_id=local_patient_id
        ).first()
        if existing_mapping and existing_mapping.master_patient:
            return existing_mapping.master_patient, "source_mapping", 1.0, False

    # Step 2: Deterministic match on salted identifier hash (e.g., SSN / National ID)
    if id_hash:
        matched_by_id = MasterPatient.query.filter_by(identifier_hash=id_hash).first()
        if matched_by_id:
            _record_mapping(matched_by_id.id, source_system, local_patient_id, 1.0, "exact_identifier")
            return matched_by_id, "exact_identifier", 1.0, False

    # Step 3: Exact demographic match on first name, last name, and date of birth
    exact_candidates: List[MasterPatient] = MasterPatient.query.filter_by(dob=dob).all()
    fn_clean = first_name.strip().lower()
    ln_clean = last_name.strip().lower()

    for cand in exact_candidates:
        if cand.first_name.strip().lower() == fn_clean and cand.last_name.strip().lower() == ln_clean:
            _record_mapping(cand.id, source_system, local_patient_id, 0.98, "exact_demographics")
            return cand, "exact_demographics", 0.98, False

    # Step 4: Probabilistic matching (phonetic/Levenshtein similarity with same DOB)
    best_candidate: Optional[MasterPatient] = None
    best_score = 0.0

    for cand in exact_candidates:
        fn_score = string_similarity(cand.first_name, first_name)
        ln_score = string_similarity(cand.last_name, last_name)
        # Weighted score: last name has slightly higher weight than first name
        avg_score = (fn_score * 0.45) + (ln_score * 0.55)

        if avg_score > best_score:
            best_score = avg_score
            best_candidate = cand

    if best_candidate and best_score >= 0.85:
        _record_mapping(best_candidate.id, source_system, local_patient_id, round(best_score, 2), "probabilistic")
        return best_candidate, "probabilistic", round(best_score, 2), False

    # Step 5: No matching record found — create new Master Patient identity
    new_mp_id = generate_master_patient_id()
    new_patient = MasterPatient(
        id=new_mp_id,
        first_name=first_name.strip(),
        last_name=last_name.strip(),
        dob=dob.strip(),
        gender=gender,
        blood_type=blood_type,
        email=email,
        identifier_hash=id_hash,
        identifier_encrypted=encrypt_field(identifier) if identifier else None,
        phone_encrypted=encrypt_field(phone) if phone else None,
        address_encrypted=encrypt_field(address) if address else None,
    )
    db.session.add(new_patient)
    db.session.flush()

    _record_mapping(new_mp_id, source_system, local_patient_id or new_mp_id, 1.0, "new_identity")
    db.session.commit()

    return new_patient, "new_identity", 1.0, True


def _record_mapping(
    master_patient_id: str,
    source_system: str,
    local_patient_id: Optional[str],
    confidence: float,
    match_type: str
) -> None:
    """Helper to ensure a local identifier mapping exists."""
    if not local_patient_id:
        local_patient_id = master_patient_id

    existing = LocalPatientMapping.query.filter_by(
        master_patient_id=master_patient_id,
        source_system=source_system,
        local_patient_id=local_patient_id
    ).first()

    if not existing:
        mapping = LocalPatientMapping(
            master_patient_id=master_patient_id,
            source_system=source_system,
            local_patient_id=local_patient_id,
            match_confidence=confidence,
            match_type=match_type
        )
        db.session.add(mapping)
        db.session.commit()
