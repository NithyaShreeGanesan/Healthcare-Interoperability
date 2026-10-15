"""Authentication and authorization blueprint implementing JWT and RBAC."""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from app.extensions import db
from app.models.user import User
from app.services.audit_service import record_audit_event

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/login", methods=["POST"])
def login():
    """Authenticate user with email and password, returning JWT access token with RBAC claims."""
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"message": "Email and password are required."}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        # Record failed login attempt in audit
        record_audit_event(
            user_email=email,
            role="unauthenticated",
            action="LOGIN_FAILED",
            resource_type="Auth",
            outcome="denied",
            reason="Invalid credentials supplied."
        )
        return jsonify({"message": "Invalid email or password."}), 401

    # Generate JWT with custom identity and role claims
    token = create_access_token(
        identity=str(user.id),
        additional_claims={
            "role": user.role,
            "email": user.email,
            "name": user.name,
            "org": user.org,
            "linked_patient_id": user.linked_patient_id
        }
    )

    # Record successful login audit event
    record_audit_event(
        user_email=user.email,
        role=user.role,
        action="LOGIN",
        resource_type="Auth",
        outcome="allowed",
        reason=f"User authenticated successfully as {user.role} ({user.org})"
    )

    return jsonify({
        "token": token,
        "user": user.to_dict()
    }), 200


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    """Get current authenticated user profile."""
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    if not user:
        return jsonify({"message": "User not found."}), 404
    return jsonify({"user": user.to_dict()}), 200


@auth_bp.route("/register", methods=["POST"])
def register():
    """Register a new user (used for setup and administration)."""
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    role = data.get("role", "clinician")
    name = data.get("name", "Healthcare User")
    org = data.get("org", "Hospital A")
    linked_patient_id = data.get("linked_patient_id")

    if not email or not password:
        return jsonify({"message": "Email and password are required."}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"message": f"User with email '{email}' already exists."}), 409

    user = User(
        email=email,
        role=role,
        name=name,
        org=org,
        linked_patient_id=linked_patient_id
    )
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    return jsonify({"status": "success", "user": user.to_dict()}), 201
