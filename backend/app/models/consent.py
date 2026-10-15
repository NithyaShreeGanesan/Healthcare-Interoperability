"""Consent directive model enforcing patient data sharing permissions."""

import datetime
import json
from typing import Any, Dict, List, Optional
from app.extensions import db


class Consent(db.Model):
    """Patient consent policy authorizing specific actors to access clinical resources."""

    __tablename__ = "consents"

    id = db.Column(db.String(64), primary_key=True)  # e.g., 'CNS-101'
    master_patient_id = db.Column(db.String(64), db.ForeignKey("master_patients.id"), nullable=False, index=True)
    grantee_type = db.Column(db.String(50), nullable=False)  # 'role', 'organization', 'practitioner'
    grantee_id = db.Column(db.String(100), nullable=False)  # 'clinician', 'payer', 'Hospital A'
    grantee_display = db.Column(db.String(150), nullable=False)
    resource_types_json = db.Column(db.Text, nullable=False, default="[]")  # JSON string array e.g. '["Condition", "Observation"]'
    purpose = db.Column(db.String(50), nullable=False, default="treatment")  # treatment, payment, operations, research
    status = db.Column(db.String(20), nullable=False, default="active")  # active, revoked, expired
    valid_from = db.Column(db.DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))
    valid_to = db.Column(db.DateTime, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))
    revoked_at = db.Column(db.DateTime, nullable=True)

    @property
    def resource_types(self) -> List[str]:
        """Deserialize JSON resource types list."""
        try:
            return json.loads(self.resource_types_json or "[]")
        except Exception:
            return []

    @resource_types.setter
    def resource_types(self, value: List[str]) -> None:
        """Serialize resource types list to JSON."""
        self.resource_types_json = json.dumps(value if isinstance(value, list) else [])

    def is_active(self) -> bool:
        """Check if consent is active and within valid time bounds."""
        if self.status != "active":
            return False
        now = datetime.datetime.now(datetime.timezone.utc)
        valid_from = self.valid_from
        valid_to = self.valid_to
        if valid_from and valid_from.tzinfo is None:
            valid_from = valid_from.replace(tzinfo=datetime.timezone.utc)
        if valid_to and valid_to.tzinfo is None:
            valid_to = valid_to.replace(tzinfo=datetime.timezone.utc)

        if valid_from and now < valid_from:
            return False
        if valid_to and now > valid_to:
            return False
        return True

    def allows_resource(self, resource_type: str) -> bool:
        """Check if this consent covers the requested resource type."""
        types = self.resource_types
        return "*" in types or resource_type in types or len(types) == 0

    def allows_purpose(self, req_purpose: str) -> bool:
        """Check if this consent covers the requested purpose."""
        if not self.purpose or self.purpose == "*" or self.purpose == "all":
            return True
        return self.purpose.lower() == req_purpose.lower()

    def revoke(self) -> None:
        """Revoke this consent directive."""
        self.status = "revoked"
        self.revoked_at = datetime.datetime.now(datetime.timezone.utc)

    def to_dict(self) -> Dict[str, Any]:
        """Serialize consent to frontend-friendly dictionary."""
        return {
            "id": self.id,
            "master_patient_id": self.master_patient_id,
            "grantee_type": self.grantee_type,
            "grantee_id": self.grantee_id,
            "grantee_display": self.grantee_display,
            "resource_types": self.resource_types,
            "purpose": self.purpose,
            "status": self.status,
            "valid_from": self.valid_from.isoformat() if self.valid_from else None,
            "valid_to": self.valid_to.isoformat() if self.valid_to else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "revoked_at": self.revoked_at.isoformat() if self.revoked_at else None,
        }

    def to_fhir_consent(self) -> Dict[str, Any]:
        """Convert consent record into standard HL7 FHIR R4 Consent resource JSON."""
        return {
            "resourceType": "Consent",
            "id": self.id,
            "status": self.status,
            "scope": {
                "coding": [
                    {
                        "system": "http://terminology.hl7.org/CodeSystem/consentscope",
                        "code": "patient-privacy",
                        "display": "Privacy Consent"
                    }
                ]
            },
            "category": [
                {
                    "coding": [
                        {
                            "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
                            "code": "INFA",
                            "display": "information access"
                        }
                    ]
                }
            ],
            "patient": {
                "reference": f"Patient/{self.master_patient_id}",
                "display": f"Master Patient {self.master_patient_id}"
            },
            "dateTime": self.created_at.isoformat() if self.created_at else None,
            "provision": {
                "type": "permit" if self.status == "active" else "deny",
                "period": {
                    "start": self.valid_from.isoformat() if self.valid_from else None,
                    "end": self.valid_to.isoformat() if self.valid_to else None
                },
                "actor": [
                    {
                        "role": {
                            "coding": [{"code": self.grantee_type, "display": self.grantee_display}]
                        },
                        "reference": {"display": self.grantee_id}
                    }
                ],
                "purpose": [
                    {
                        "system": "http://terminology.hl7.org/CodeSystem/v3-ActReason",
                        "code": self.purpose
                    }
                ],
                "class": [
                    {"code": rt, "display": rt} for rt in self.resource_types
                ]
            }
        }
