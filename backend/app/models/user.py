"""User model with bcrypt password hashing and Role-Based Access Control (RBAC)."""

import datetime
from typing import Any, Dict, Optional
from app.extensions import db
from app.utils.crypto import hash_password, verify_password


class User(db.Model):
    """User account entity supporting RBAC and patient linkage."""

    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(50), nullable=False, default="clinician")  # clinician, patient, payer, admin, auditor
    name = db.Column(db.String(120), nullable=False)
    org = db.Column(db.String(120), nullable=False, default="Hospital A")
    linked_patient_id = db.Column(db.String(64), nullable=True)  # Populated when role == 'patient'
    created_at = db.Column(db.DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))

    def set_password(self, password: str) -> None:
        """Hash and set user password."""
        self.password_hash = hash_password(password)

    def check_password(self, password: str) -> bool:
        """Verify password against stored hash."""
        return verify_password(password, self.password_hash)

    def to_dict(self) -> Dict[str, Any]:
        """Serialize user to safe public dictionary (excludes password_hash)."""
        return {
            "id": self.id,
            "email": self.email,
            "role": self.role,
            "name": self.name,
            "org": self.org,
            "linked_patient_id": self.linked_patient_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
