"""Master Patient Index (MPI) and demographic identity models."""

import datetime
from typing import Any, Dict, Optional
from app.extensions import db
from app.utils.crypto import encrypt_field, decrypt_field


class MasterPatient(db.Model):
    """Unified Master Patient record resolved across all source systems."""

    __tablename__ = "master_patients"

    id = db.Column(db.String(64), primary_key=True)  # e.g., 'MP-83921'
    first_name = db.Column(db.String(100), nullable=False, index=True)
    last_name = db.Column(db.String(100), nullable=False, index=True)
    dob = db.Column(db.String(20), nullable=False, index=True)  # YYYY-MM-DD
    gender = db.Column(db.String(20), nullable=True)
    blood_type = db.Column(db.String(10), nullable=True)
    email = db.Column(db.String(120), nullable=True)

    # Deterministic blind index for matching (salted SHA-256 of SSN / National ID)
    identifier_hash = db.Column(db.String(64), nullable=True, index=True)

    # Fernet field-level encrypted sensitive demographics
    identifier_encrypted = db.Column(db.Text, nullable=True)
    phone_encrypted = db.Column(db.Text, nullable=True)
    address_encrypted = db.Column(db.Text, nullable=True)

    created_at = db.Column(db.DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.datetime.now(datetime.timezone.utc),
        onupdate=lambda: datetime.datetime.now(datetime.timezone.utc),
    )

    # Relationships
    local_mappings = db.relationship("LocalPatientMapping", backref="master_patient", cascade="all, delete-orphan", lazy="dynamic")
    consents = db.relationship("Consent", backref="master_patient", cascade="all, delete-orphan", lazy="dynamic")
    clinical_resources = db.relationship("ClinicalResource", backref="master_patient", cascade="all, delete-orphan", lazy="dynamic")

    def set_sensitive_data(
        self,
        identifier: Optional[str] = None,
        phone: Optional[str] = None,
        address: Optional[str] = None
    ) -> None:
        """Encrypt and store sensitive fields."""
        if identifier:
            self.identifier_encrypted = encrypt_field(identifier)
        if phone:
            self.phone_encrypted = encrypt_field(phone)
        if address:
            self.address_encrypted = encrypt_field(address)

    def get_decrypted_phone(self) -> Optional[str]:
        """Decrypt phone number."""
        return decrypt_field(self.phone_encrypted)

    def get_decrypted_address(self) -> Optional[str]:
        """Decrypt address."""
        return decrypt_field(self.address_encrypted)

    def to_dict(self, include_sensitive: bool = False) -> Dict[str, Any]:
        """Serialize Master Patient to dictionary representation."""
        data = {
            "id": self.id,
            "master_patient_id": self.id,
            "firstName": self.first_name,
            "lastName": self.last_name,
            "dob": self.dob,
            "gender": self.gender,
            "blood_type": self.blood_type,
            "email": self.email,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_sensitive:
            data["phone"] = self.get_decrypted_phone()
            data["address"] = self.get_decrypted_address()
        return data


class LocalPatientMapping(db.Model):
    """Maps a source system's local patient identifier to the unified Master Patient."""

    __tablename__ = "local_patient_mappings"

    id = db.Column(db.Integer, primary_key=True)
    master_patient_id = db.Column(db.String(64), db.ForeignKey("master_patients.id"), nullable=False, index=True)
    source_system = db.Column(db.String(100), nullable=False)  # 'Hospital A', 'Clinic B', 'Payer C'
    local_patient_id = db.Column(db.String(100), nullable=False, index=True)
    match_confidence = db.Column(db.Float, nullable=False, default=1.0)
    match_type = db.Column(db.String(50), nullable=False, default="exact_identifier")  # exact_identifier, deterministic, probabilistic
    created_at = db.Column(db.DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))

    def to_dict(self) -> Dict[str, Any]:
        """Serialize local mapping."""
        return {
            "id": self.id,
            "master_patient_id": self.master_patient_id,
            "source_system": self.source_system,
            "local_patient_id": self.local_patient_id,
            "match_confidence": self.match_confidence,
            "match_type": self.match_type,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
