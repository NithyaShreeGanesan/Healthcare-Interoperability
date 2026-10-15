"""System health and diagnostic blueprint."""

import datetime
from flask import Blueprint, jsonify
from sqlalchemy import text
from app.extensions import db

health_bp = Blueprint("health", __name__)


@health_bp.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint validating API and database connectivity."""
    db_status = "up"
    try:
        db.session.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"down ({str(e)})"

    return jsonify({
        "status": "ok" if db_status == "up" else "degraded",
        "db": db_status,
        "standard": "HL7 FHIR R4",
        "platform": "Consent-based Healthcare Interoperability Platform",
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }), 200
