"""Blueprint registrations for the Healthcare Interoperability Platform."""

from app.blueprints.auth_bp import auth_bp
from app.blueprints.ingest_bp import ingest_bp
from app.blueprints.consent_bp import consent_bp
from app.blueprints.records_bp import records_bp
from app.blueprints.data_quality_bp import data_quality_bp
from app.blueprints.audit_bp import audit_bp
from app.blueprints.health_bp import health_bp

__all__ = [
    "auth_bp",
    "ingest_bp",
    "consent_bp",
    "records_bp",
    "data_quality_bp",
    "audit_bp",
    "health_bp",
]
