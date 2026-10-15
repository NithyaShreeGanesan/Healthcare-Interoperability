"""Tests for HL7 FHIR R4 ingestion, lineage, and cross-source conflict detection."""

import json
import os
import pytest
from app.services.fhir_service import ingest_fhir_bundle
from app.models.clinical_resource import ClinicalResource
from app.models.data_conflict import DataConflict
from app.utils.fhir_helpers import calculate_freshness


def test_fhir_bundle_ingestion(app):
    """Verify ingestion of a Synthea FHIR R4 Bundle with lineage provenance."""
    sample_bundle = {
        "resourceType": "Bundle",
        "type": "collection",
        "entry": [
            {
                "resource": {
                    "resourceType": "Patient",
                    "id": "HOSP-TEST-01",
                    "name": [{"family": "TestPatient", "given": ["Bob"]}],
                    "birthDate": "1990-05-15",
                    "gender": "male"
                }
            },
            {
                "resource": {
                    "resourceType": "Condition",
                    "id": "COND-TEST-01",
                    "clinicalStatus": {"coding": [{"code": "active"}]},
                    "code": {"coding": [{"code": "J45", "display": "Asthma"}]},
                    "recordedDate": "2026-10-01T10:00:00Z"
                }
            }
        ]
    }

    with app.app_context():
        res = ingest_fhir_bundle(sample_bundle, source_system="Hospital A")
        assert res["status"] == "success"
        assert res["accepted"] == 2
        assert res["source_system"] == "Hospital A"

        # Verify persisted clinical resource has source_system and freshness
        cond = ClinicalResource.query.filter_by(fhir_id="COND-TEST-01").first()
        assert cond is not None
        assert cond.source_system == "Hospital A"
        assert cond.resource_type == "Condition"
        assert cond.display == "Asthma"


def test_conflict_detection_across_systems(app):
    """Verify that contradictory clinical information between source systems creates a flagged conflict."""
    # Bundle 1 from Hospital A: No known drug allergies
    bundle_a = {
        "resourceType": "Bundle",
        "entry": [
            {
                "resource": {
                    "resourceType": "Patient",
                    "id": "PAT-CONF-01",
                    "name": [{"family": "ConflictCase", "given": ["Charles"]}],
                    "birthDate": "1988-02-14"
                }
            },
            {
                "resource": {
                    "resourceType": "AllergyIntolerance",
                    "id": "ALL-HOSP-01",
                    "clinicalStatus": {"coding": [{"code": "resolved"}]},
                    "code": {"coding": [{"code": "NONE", "display": "No Known Drug Allergies"}]}
                }
            }
        ]
    }

    # Bundle 2 from Clinic B: Severe Penicillin allergy
    bundle_b = {
        "resourceType": "Bundle",
        "entry": [
            {
                "resource": {
                    "resourceType": "Patient",
                    "id": "PAT-CONF-01-B",
                    "name": [{"family": "ConflictCase", "given": ["Charles"]}],
                    "birthDate": "1988-02-14"
                }
            },
            {
                "resource": {
                    "resourceType": "AllergyIntolerance",
                    "id": "ALL-CLINIC-02",
                    "clinicalStatus": {"coding": [{"code": "active"}]},
                    "code": {"coding": [{"code": "7980", "display": "Penicillin G Anaphylaxis"}]}
                }
            }
        ]
    }

    with app.app_context():
        ingest_fhir_bundle(bundle_a, source_system="Hospital A")
        ingest_fhir_bundle(bundle_b, source_system="Clinic B")

        # Verify a DataConflict record was created and NOT silently merged
        conflicts = DataConflict.query.filter_by(category="Allergy Intolerance Discrepancy").all()
        assert len(conflicts) >= 1
        conflict = conflicts[0]
        assert conflict.severity == "critical"
        assert conflict.resolution_status == "open"
        assert "Hospital A" in (conflict.source_a, conflict.source_b)
        assert "Clinic B" in (conflict.source_a, conflict.source_b)


def test_freshness_calculation():
    """Verify calculation of freshness indicators."""
    recent_ts = "2026-10-10T12:00:00Z"
    stale_ts = "2025-01-01T12:00:00Z"

    fresh_calc = calculate_freshness(recent_ts)
    assert fresh_calc["status"] in ("fresh", "moderate")

    stale_calc = calculate_freshness(stale_ts)
    assert stale_calc["status"] == "stale"
    assert stale_calc["days_old"] > 180
