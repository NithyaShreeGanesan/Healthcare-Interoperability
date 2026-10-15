"""Database initialization and synthetic seeding script for development and testing."""

import datetime
import json
import os
import sys

# Ensure backend directory is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import create_app
from app.extensions import db
from app.models.user import User
from app.models.patient import MasterPatient, LocalPatientMapping
from app.models.consent import Consent
from app.models.clinical_resource import ClinicalResource
from app.models.data_conflict import DataConflict
from app.models.audit_log import AuditLog
from app.services.audit_service import record_audit_event
from app.utils.crypto import blind_index_hash, encrypt_field


def seed_database():
    """Populate the database with initial users, patients, consents, clinical records, and audit trail."""
    print("Beginning database initialization and seeding...")
    db.drop_all()
    db.create_all()

    now = datetime.datetime.now(datetime.timezone.utc)

    # 1. Seed RBAC Users
    print("Seeding RBAC user accounts...")
    users_data = [
        {
            "email": "dr.smith@metrohealth.org",
            "password": "Clinician@123",
            "role": "clinician",
            "name": "Dr. Sarah Smith, MD",
            "org": "Hospital A",
            "linked_patient_id": None
        },
        {
            "email": "jane.doe@patient.org",
            "password": "Patient@123",
            "role": "patient",
            "name": "Jane Doe",
            "org": "Patient Portal",
            "linked_patient_id": "MP-83921"
        },
        {
            "email": "payer.claims@bluecross.org",
            "password": "Payer@123",
            "role": "payer",
            "name": "Mark Evans (Claims Examiner)",
            "org": "BlueCross Payer C",
            "linked_patient_id": None
        },
        {
            "email": "compliance@healthaudit.gov",
            "password": "Auditor@123",
            "role": "auditor",
            "name": "Elena Rostova (Compliance Inspector)",
            "org": "OCR Federal Audit",
            "linked_patient_id": None
        },
        {
            "email": "admin@interop.org",
            "password": "Admin@123",
            "role": "admin",
            "name": "System Administrator",
            "org": "Interop Platform Foundation",
            "linked_patient_id": None
        }
    ]

    for u_info in users_data:
        user = User(
            email=u_info["email"],
            role=u_info["role"],
            name=u_info["name"],
            org=u_info["org"],
            linked_patient_id=u_info["linked_patient_id"]
        )
        user.set_password(u_info["password"])
        db.session.add(user)

    db.session.commit()

    # 2. Seed Master Patients (MPI)
    print("Seeding Master Patient Index (MPI)...")
    jane = MasterPatient(
        id="MP-83921",
        first_name="Jane",
        last_name="Doe",
        dob="1985-04-12",
        gender="female",
        blood_type="O-Positive",
        email="jane.doe@patient.org",
        identifier_hash=blind_index_hash("987-65-4321"),
        identifier_encrypted=encrypt_field("987-65-4321"),
        phone_encrypted=encrypt_field("+1 (555) 234-5678"),
        address_encrypted=encrypt_field("742 Evergreen Terrace, Springfield, OR 97477")
    )

    john = MasterPatient(
        id="MP-10492",
        first_name="Johnathan",
        last_name="Appleseed",
        dob="1972-11-20",
        gender="male",
        blood_type="A-Positive",
        email="john.appleseed@example.com",
        identifier_hash=blind_index_hash("123-45-6789"),
        identifier_encrypted=encrypt_field("123-45-6789"),
        phone_encrypted=encrypt_field("+1 (555) 876-5432"),
        address_encrypted=encrypt_field("100 Pine Street, Seattle, WA 98101")
    )

    db.session.add_all([jane, john])
    db.session.commit()

    # 3. Seed Local Patient Source Mappings
    print("Seeding cross-source system local patient mappings...")
    mappings = [
        LocalPatientMapping(master_patient_id="MP-83921", source_system="Hospital A", local_patient_id="HOSP-A-90123", match_confidence=1.0, match_type="exact_identifier"),
        LocalPatientMapping(master_patient_id="MP-83921", source_system="Clinic B", local_patient_id="CLN-B-55410", match_confidence=0.98, match_type="exact_demographics"),
        LocalPatientMapping(master_patient_id="MP-83921", source_system="Payer C", local_patient_id="PAY-C-77192", match_confidence=1.0, match_type="exact_identifier"),
        LocalPatientMapping(master_patient_id="MP-10492", source_system="Hospital A", local_patient_id="HOSP-A-11029", match_confidence=1.0, match_type="exact_identifier"),
    ]
    db.session.add_all(mappings)
    db.session.commit()

    # 4. Seed Consents
    print("Seeding patient consent directives...")
    c1 = Consent(
        id="CNS-101",
        master_patient_id="MP-83921",
        grantee_type="role",
        grantee_id="clinician",
        grantee_display="All Licensed Healthcare Clinicians",
        purpose="treatment",
        status="active",
        valid_from=now - datetime.timedelta(days=30),
        valid_to=now + datetime.timedelta(days=150),
        created_at=now - datetime.timedelta(days=30)
    )
    c1.resource_types = ["*"]

    # Restricted consent for Payer C: only Condition & MedicationRequest, no Observation or AllergyIntolerance
    c2 = Consent(
        id="CNS-102",
        master_patient_id="MP-83921",
        grantee_type="role",
        grantee_id="payer",
        grantee_display="BlueCross Payer C Claims Examiner",
        purpose="payment",
        status="active",
        valid_from=now - datetime.timedelta(days=15),
        valid_to=now + datetime.timedelta(days=165),
        created_at=now - datetime.timedelta(days=15)
    )
    c2.resource_types = ["Condition", "MedicationRequest"]

    # Historical revoked consent
    c3 = Consent(
        id="CNS-103",
        master_patient_id="MP-83921",
        grantee_type="organization",
        grantee_id="Research Institute X",
        grantee_display="Genomic Research Consortium",
        purpose="research",
        status="revoked",
        valid_from=now - datetime.timedelta(days=90),
        valid_to=now + datetime.timedelta(days=90),
        created_at=now - datetime.timedelta(days=90),
        revoked_at=now - datetime.timedelta(days=10)
    )
    c3.resource_types = ["Observation", "DiagnosticReport"]

    db.session.add_all([c1, c2, c3])
    db.session.commit()

    # 5. Seed Clinical Resources across Hospital A, Clinic B, Payer C
    print("Seeding disparate source clinical resources (Hospital A, Clinic B, Payer C)...")
    res_list = [
        # Hospital A resources
        ClinicalResource(
            master_patient_id="MP-83921",
            source_system="Hospital A",
            resource_type="Condition",
            fhir_id="cond-hosp-001",
            code="I10",
            display="Essential (primary) hypertension",
            status="active",
            effective_date=now - datetime.timedelta(days=14),
            last_updated=now - datetime.timedelta(days=14),
            ingested_at=now - datetime.timedelta(days=14),
            resource_json=json.dumps({
                "resourceType": "Condition",
                "id": "cond-hosp-001",
                "clinicalStatus": {"coding": [{"system": "http://terminology.hl7.org/CodeSystem/condition-clinical", "code": "active"}]},
                "code": {"coding": [{"system": "http://hl7.org/fhir/sid/icd-10-cm", "code": "I10", "display": "Essential (primary) hypertension"}]},
                "subject": {"reference": "Patient/MP-83921"},
                "recordedDate": (now - datetime.timedelta(days=14)).isoformat(),
                "meta": {"source": "Hospital A", "lastUpdated": (now - datetime.timedelta(days=14)).isoformat()}
            })
        ),
        ClinicalResource(
            master_patient_id="MP-83921",
            source_system="Hospital A",
            resource_type="Observation",
            fhir_id="obs-hosp-002",
            code="8480-6",
            display="Systolic blood pressure (138 mmHg)",
            status="final",
            effective_date=now - datetime.timedelta(days=14),
            last_updated=now - datetime.timedelta(days=14),
            ingested_at=now - datetime.timedelta(days=14),
            resource_json=json.dumps({
                "resourceType": "Observation",
                "id": "obs-hosp-002",
                "status": "final",
                "code": {"coding": [{"system": "http://loinc.org", "code": "8480-6", "display": "Systolic blood pressure"}]},
                "subject": {"reference": "Patient/MP-83921"},
                "valueQuantity": {"value": 138, "unit": "mmHg"},
                "effectiveDateTime": (now - datetime.timedelta(days=14)).isoformat(),
                "meta": {"source": "Hospital A", "lastUpdated": (now - datetime.timedelta(days=14)).isoformat()}
            })
        ),
        # Clinic B resources
        ClinicalResource(
            master_patient_id="MP-83921",
            source_system="Clinic B",
            resource_type="AllergyIntolerance",
            fhir_id="all-clnb-001",
            code="7980",
            display="Severe Penicillin Anaphylaxis",
            status="active",
            effective_date=now - datetime.timedelta(days=60),
            last_updated=now - datetime.timedelta(days=60),
            ingested_at=now - datetime.timedelta(days=60),
            resource_json=json.dumps({
                "resourceType": "AllergyIntolerance",
                "id": "all-clnb-001",
                "clinicalStatus": {"coding": [{"code": "active"}]},
                "code": {"coding": [{"system": "http://www.nlm.nih.gov/research/umls/rxnorm", "code": "7980", "display": "Severe Penicillin Anaphylaxis"}]},
                "criticality": "high",
                "subject": {"reference": "Patient/MP-83921"},
                "recordedDate": (now - datetime.timedelta(days=60)).isoformat(),
                "meta": {"source": "Clinic B", "lastUpdated": (now - datetime.timedelta(days=60)).isoformat()}
            })
        ),
        ClinicalResource(
            master_patient_id="MP-83921",
            source_system="Clinic B",
            resource_type="Observation",
            fhir_id="obs-clnb-003",
            code="1558-6",
            display="Fasting Blood Glucose (95 mg/dL)",
            status="final",
            effective_date=now - datetime.timedelta(days=210),  # Stale (>180d)
            last_updated=now - datetime.timedelta(days=210),
            ingested_at=now - datetime.timedelta(days=210),
            resource_json=json.dumps({
                "resourceType": "Observation",
                "id": "obs-clnb-003",
                "status": "final",
                "code": {"coding": [{"system": "http://loinc.org", "code": "1558-6", "display": "Fasting Blood Glucose"}]},
                "valueQuantity": {"value": 95, "unit": "mg/dL"},
                "effectiveDateTime": (now - datetime.timedelta(days=210)).isoformat(),
                "meta": {"source": "Clinic B", "lastUpdated": (now - datetime.timedelta(days=210)).isoformat()}
            })
        ),
        # Payer C claims resource
        ClinicalResource(
            master_patient_id="MP-83921",
            source_system="Payer C",
            resource_type="MedicationRequest",
            fhir_id="med-payc-001",
            code="866514",
            display="Metformin hydrochloride 500 MG Oral Tablet",
            status="active",
            effective_date=now - datetime.timedelta(days=20),
            last_updated=now - datetime.timedelta(days=20),
            ingested_at=now - datetime.timedelta(days=20),
            resource_json=json.dumps({
                "resourceType": "MedicationRequest",
                "id": "med-payc-001",
                "status": "active",
                "medicationCodeableConcept": {"coding": [{"system": "http://www.nlm.nih.gov/research/umls/rxnorm", "code": "866514", "display": "Metformin hydrochloride 500 MG Oral Tablet"}]},
                "subject": {"reference": "Patient/MP-83921"},
                "authoredOn": (now - datetime.timedelta(days=20)).isoformat(),
                "meta": {"source": "Payer C", "lastUpdated": (now - datetime.timedelta(days=20)).isoformat()}
            })
        ),
    ]
    db.session.add_all(res_list)
    db.session.commit()

    # 6. Seed Flagged Cross-System Data Conflicts (Never silently merged!)
    print("Seeding flagged cross-system clinical conflicts...")
    conflict = DataConflict(
        master_patient_id="MP-83921",
        category="Allergy Intolerance Discrepancy",
        source_a="Clinic B",
        source_b="Hospital A",
        source_a_val="Severe Penicillin Anaphylaxis (Active RxNorm 7980)",
        source_b_val="No Known Drug Allergies (NKDA) recorded in chart",
        source_a_date=now - datetime.timedelta(days=60),
        source_b_date=now - datetime.timedelta(days=14),
        severity="critical",
        resolution_status="open"
    )
    db.session.add(conflict)
    db.session.commit()

    # 7. Seed Initial Tamper-Evident Audit Trail
    print("Initializing tamper-evident cryptographic audit chain...")
    record_audit_event(
        user_email="dr.smith@metrohealth.org",
        role="clinician",
        action="LOGIN",
        resource_type="Auth",
        outcome="allowed",
        reason="Clinician login via MFA"
    )
    record_audit_event(
        user_email="dr.smith@metrohealth.org",
        role="clinician",
        action="READ",
        resource_type="Patient, Condition, Observation",
        master_patient_id="MP-83921",
        outcome="allowed",
        reason="Routine clinical pre-op assessment under active patient consent directive CNS-101"
    )
    record_audit_event(
        user_email="payer.claims@bluecross.org",
        role="payer",
        action="ACCESS_BLOCKED",
        resource_type="Observation, AllergyIntolerance",
        master_patient_id="MP-83921",
        outcome="denied",
        reason="Access Denied: Patient has not consented to share clinical diagnostic observations with payer"
    )

    print("Database seeding completed successfully.")


if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        seed_database()
