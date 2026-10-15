"""Tests for Master Patient Index (MPI) matching service."""

import pytest
from app.services.mpi_service import match_or_create_patient, string_similarity


def test_string_similarity():
    """Verify string similarity metrics."""
    assert string_similarity("Jane", "Jane") == 1.0
    assert string_similarity("Jane", "Jayne") > 0.8
    assert string_similarity("Smith", "Smyth") > 0.7
    assert string_similarity("Smith", "Johnson") < 0.3


def test_mpi_exact_identifier_match(app):
    """Verify deterministic match on salted SSN hash."""
    with app.app_context():
        # Match Jane Doe by SSN
        patient, match_type, conf, is_new = match_or_create_patient(
            first_name="Jane",
            last_name="Doe",
            dob="1985-04-12",
            identifier="987-65-4321",
            source_system="Hospital B",
            local_patient_id="HOSP-B-991"
        )
        assert patient.id == "MP-83921"
        assert match_type == "exact_identifier"
        assert conf == 1.0
        assert is_new is False


def test_mpi_exact_demographics_match(app):
    """Verify deterministic match on exact Name + DOB when identifier is missing."""
    with app.app_context():
        patient, match_type, conf, is_new = match_or_create_patient(
            first_name="Jane",
            last_name="Doe",
            dob="1985-04-12",
            identifier=None,
            source_system="Clinic C",
            local_patient_id="CLN-C-442"
        )
        assert patient.id == "MP-83921"
        assert match_type == "exact_demographics"
        assert conf == 0.98
        assert is_new is False


def test_mpi_probabilistic_match(app):
    """Verify probabilistic match on slight typographical variation with same DOB."""
    with app.app_context():
        # "Jayne" instead of "Jane"
        patient, match_type, conf, is_new = match_or_create_patient(
            first_name="Jayne",
            last_name="Doe",
            dob="1985-04-12",
            identifier=None,
            source_system="Urgent Care Z",
            local_patient_id="UC-881"
        )
        assert patient.id == "MP-83921"
        assert match_type == "probabilistic"
        assert conf >= 0.85
        assert is_new is False


def test_mpi_create_new_patient(app):
    """Verify creating a new patient identity when no matching record exists."""
    with app.app_context():
        patient, match_type, conf, is_new = match_or_create_patient(
            first_name="Alice",
            last_name="Wonderland",
            dob="1992-07-04",
            gender="female",
            identifier="555-11-2222",
            source_system="Hospital X",
            local_patient_id="HOSP-X-1"
        )
        assert patient.id.startswith("MP-")
        assert match_type == "new_identity"
        assert conf == 1.0
        assert is_new is True
        assert patient.first_name == "Alice"
        assert patient.last_name == "Wonderland"
