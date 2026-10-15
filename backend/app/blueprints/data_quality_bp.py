"""Data quality and cross-source conflict review blueprint."""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.extensions import db
from app.models.data_conflict import DataConflict
from app.models.user import User
from app.services.audit_service import record_audit_event

data_quality_bp = Blueprint("data_quality", __name__)


@data_quality_bp.route("", methods=["GET"])
def get_data_issues():
    """Retrieve all flagged discrepancies and data quality issues across source systems."""
    conflicts = DataConflict.query.order_by(DataConflict.created_at.desc()).all()
    return jsonify({"issues": [c.to_dict() for c in conflicts]}), 200


@data_quality_bp.route("/<int:conflict_id>/resolve", methods=["POST"])
@jwt_required()
def resolve_conflict(conflict_id: int):
    """Mark a clinical conflict as resolved with clinician audit rationale."""
    conflict = DataConflict.query.get(conflict_id)
    if not conflict:
        return jsonify({"message": f"Conflict #{conflict_id} not found."}), 404

    data = request.get_json(silent=True) or {}
    resolution_notes = data.get("notes", "Resolved after cross-system clinical chart review.")

    conflict.resolution_status = "resolved"
    db.session.commit()

    user_id = get_jwt_identity()
    user = User.query.get(int(user_id)) if user_id else None

    if user:
        record_audit_event(
            user_email=user.email,
            role=user.role,
            action="DATA_QUALITY_RESOLVE",
            resource_type="Conflict",
            master_patient_id=conflict.master_patient_id,
            outcome="allowed",
            reason=f"Resolved conflict #{conflict_id} ({conflict.category}): {resolution_notes}"
        )

    return jsonify({"status": "success", "message": f"Conflict #{conflict_id} marked as resolved."}), 200
