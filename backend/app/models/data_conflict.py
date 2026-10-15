"""Model for cross-system clinical conflicts and missing data discrepancies."""

import datetime
from typing import Any, Dict, Optional
from app.extensions import db


class DataConflict(db.Model):
    """Tracks cross-source data conflicts and flags without silent merges."""

    __tablename__ = "data_conflicts"

    id = db.Column(db.Integer, primary_key=True)
    master_patient_id = db.Column(db.String(64), db.ForeignKey("master_patients.id"), nullable=False, index=True)
    category = db.Column(db.String(100), nullable=False)  # e.g., 'Blood Type Discrepancy', 'Allergy Conflict'
    source_a = db.Column(db.String(100), nullable=False)  # e.g., 'Hospital A'
    source_b = db.Column(db.String(100), nullable=False)  # e.g., 'Clinic B'
    source_a_val = db.Column(db.Text, nullable=False)
    source_b_val = db.Column(db.Text, nullable=False)
    source_a_date = db.Column(db.DateTime, nullable=True)
    source_b_date = db.Column(db.DateTime, nullable=True)
    severity = db.Column(db.String(20), nullable=False, default="warning")  # critical, warning, info
    resolution_status = db.Column(db.String(30), nullable=False, default="open")  # open, resolved, review_pending
    created_at = db.Column(db.DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))

    def to_dict(self) -> Dict[str, Any]:
        """Serialize data conflict for frontend display."""
        return {
            "id": self.id,
            "master_patient_id": self.master_patient_id,
            "category": self.category,
            "source_a": self.source_a,
            "source_b": self.source_b,
            "source_a_val": self.source_a_val,
            "source_b_val": self.source_b_val,
            "source_a_date": self.source_a_date.isoformat() if self.source_a_date else None,
            "source_b_date": self.source_b_date.isoformat() if self.source_b_date else None,
            "severity": self.severity,
            "resolution_status": self.resolution_status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
