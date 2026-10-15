"""Pytest test configuration and fixtures."""

import os
import sys
import pytest
from flask_jwt_extended import create_access_token

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import create_app
from app.config import TestingConfig
from app.extensions import db
from app.models.user import User
from app.models.patient import MasterPatient, LocalPatientMapping
from app.models.consent import Consent
from app.models.clinical_resource import ClinicalResource
from app.models.data_conflict import DataConflict
from app.models.audit_log import AuditLog
from app.utils.crypto import blind_index_hash, encrypt_field
from app.services.audit_service import record_audit_event
import datetime


@pytest.fixture
def app():
    """Create test application configured with an in-memory database."""
    test_app = create_app(config_class=TestingConfig)
    with test_app.app_context():
        db.create_all()
        _seed_test_data()
        yield test_app
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    """Test client fixture."""
    return app.test_client()


def _seed_test_data():
    """Seed baseline test records."""
    now = datetime.datetime.now(datetime.timezone.utc)

    # Users
    clinician = User(email="dr.smith@metrohealth.org", role="clinician", name="Dr. Sarah Smith", org="Hospital A")
    clinician.set_password("Clinician@123")

    patient = User(email="jane.doe@patient.org", role="patient", name="Jane Doe", org="Patient Portal", linked_patient_id="MP-83921")
    patient.set_password("Patient@123")

    payer = User(email="payer.claims@bluecross.org", role="payer", name="Mark Evans", org="BlueCross Payer C")
    payer.set_password("Payer@123")

    admin = User(email="admin@interop.org", role="admin", name="System Admin", org="Interop Foundation")
    admin.set_password("Admin@123")

    auditor = User(email="compliance@healthaudit.gov", role="auditor", name="Elena Rostova", org="OCR Federal Audit")
    auditor.set_password("Auditor@123")

    db.session.add_all([clinician, patient, payer, admin, auditor])

    # Master Patient
    jane_mp = MasterPatient(
        id="MP-83921",
        first_name="Jane",
        last_name="Doe",
        dob="1985-04-12",
        gender="female",
        blood_type="O-Positive",
        email="jane.doe@patient.org",
        identifier_hash=blind_index_hash("987-65-4321"),
        identifier_encrypted=encrypt_field("987-65-4321"),
        phone_encrypted=encrypt_field("555-234-5678"),
        address_encrypted=encrypt_field("742 Evergreen Terrace")
    )
    john_mp = MasterPatient(
        id="MP-10492",
        first_name="Johnathan",
        last_name="Appleseed",
        dob="1972-11-20",
        gender="male",
        blood_type="A-Positive",
        email="john@example.com",
        identifier_hash=blind_index_hash("123-45-6789"),
        identifier_encrypted=encrypt_field("123-45-6789")
    )
    db.session.add_all([jane_mp, john_mp])
    db.session.flush()

    # Consents
    # 1. Clinician has full access
    c1 = Consent(
        id="CNS-101",
        master_patient_id="MP-83921",
        grantee_type="role",
        grantee_id="clinician",
        grantee_display="All Clinicians",
        purpose="treatment",
        status="active",
        valid_from=now - datetime.timedelta(days=10),
        valid_to=now + datetime.timedelta(days=170)
    )
    c1.resource_types = ["*"]

    # 2. Payer has restricted access: Condition & MedicationRequest ONLY
    c2 = Consent(
        id="CNS-102",
        master_patient_id="MP-83921",
        grantee_type="role",
        grantee_id="payer",
        grantee_display="BlueCross Payer C",
        purpose="payment",
        status="active",
        valid_from=now - datetime.timedelta(days=10),
        valid_to=now + datetime.timedelta(days=170)
    )
    c2.resource_types = ["Condition", "MedicationRequest"]

    db.session.add_all([c1, c2])

    # Clinical records
    res1 = ClinicalResource(
        master_patient_id="MP-83921",
        source_system="Hospital A",
        resource_type="Condition",
        fhir_id="cond-01",
        code="I10",
        display="Essential hypertension",
        status="active",
        effective_date=now - datetime.timedelta(days=5),
        last_updated=now - datetime.timedelta(days=5),
        resource_json='{"resourceType": "Condition", "id": "cond-01"}'
    )
    res2 = ClinicalResource(
        master_patient_id="MP-83921",
        source_system="Clinic B",
        resource_type="Observation",
        fhir_id="obs-01",
        code="8480-6",
        display="Systolic blood pressure",
        status="final",
        effective_date=now - datetime.timedelta(days=5),
        last_updated=now - datetime.timedelta(days=5),
        resource_json='{"resourceType": "Observation", "id": "obs-01"}'
    )
    db.session.add_all([res1, res2])

    # Initial Audit Log
    record_audit_event(
        user_email="system@interop.org",
        role="system",
        action="INIT",
        resource_type="System",
        outcome="allowed",
        reason="Test suite initialized"
    )

    db.session.commit()


@pytest.fixture
def auth_tokens(app):
    """Generate JWT tokens for each seeded role."""
    with app.app_context():
        clinician = User.query.filter_by(role="clinician").first()
        patient = User.query.filter_by(role="patient").first()
        payer = User.query.filter_by(role="payer").first()
        admin = User.query.filter_by(role="admin").first()
        auditor = User.query.filter_by(role="auditor").first()

        tokens = {}
        for role, u in [("clinician", clinician), ("patient", patient), ("payer", payer), ("admin", admin), ("auditor", auditor)]:
            tok = create_access_token(
                identity=str(u.id),
                additional_claims={"role": u.role, "email": u.email, "org": u.org, "linked_patient_id": u.linked_patient_id}
            )
            tokens[role] = {"Authorization": f"Bearer {tok}"}

        return tokens
