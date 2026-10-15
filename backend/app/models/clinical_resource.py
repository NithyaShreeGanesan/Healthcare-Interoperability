"""Clinical resource model maintaining provenance, freshness, and FHIR payloads."""

import datetime
import json
from typing import Any, Dict, Optional
from app.extensions import db


class ClinicalResource(db.Model):
    """Clinical record entity storing full FHIR R4 payload and source lineage."""

    __tablename__ = "clinical_resources"

    id = db.Column(db.Integer, primary_key=True)
    master_patient_id = db.Column(db.String(64), db.ForeignKey("master_patients.id"), nullable=False, index=True)
    source_system = db.Column(db.String(100), nullable=False, default="Hospital A")  # 'Hospital A', 'Clinic B', 'Payer C'
    resource_type = db.Column(db.String(60), nullable=False, index=True)  # Condition, Observation, MedicationRequest, AllergyIntolerance
    fhir_id = db.Column(db.String(100), nullable=False)
    code = db.Column(db.String(100), nullable=True)
    display = db.Column(db.String(255), nullable=True)
    status = db.Column(db.String(50), nullable=True, default="active")
    effective_date = db.Column(db.DateTime, nullable=True)
    last_updated = db.Column(db.DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))
    ingested_at = db.Column(db.DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))
    resource_json = db.Column(db.Text, nullable=False)  # Raw HL7 FHIR R4 JSON string

    def get_parsed_fhir(self) -> Dict[str, Any]:
        """Parse raw JSON string into a dictionary."""
        try:
            return json.loads(self.resource_json)
        except Exception:
            return {}

    def to_dict(self) -> Dict[str, Any]:
        """Serialize clinical resource including provenance and freshness lineage."""
        return {
            "id": self.fhir_id,
            "db_id": self.id,
            "master_patient_id": self.master_patient_id,
            "resourceType": self.resource_type,
            "code": self.code,
            "display": self.display,
            "status": self.status,
            "source_system": self.source_system,
            "effective_date": self.effective_date.isoformat() if self.effective_date else None,
            "last_updated": self.last_updated.isoformat() if self.last_updated else None,
            "ingested_at": self.ingested_at.isoformat() if self.ingested_at else None,
            "fhir_payload": self.get_parsed_fhir()
        }
