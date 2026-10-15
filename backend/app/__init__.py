"""Application factory for Healthcare Interoperability Platform (PS-013)."""

import os
from typing import Optional, Type
from flask import Flask, jsonify
from app.config import Config, config_by_name
from app.extensions import db, jwt, cors
from app.blueprints import (
    auth_bp,
    ingest_bp,
    consent_bp,
    records_bp,
    data_quality_bp,
    audit_bp,
    health_bp,
)


def create_app(config_class: Optional[Type[Config]] = None) -> Flask:
    """Create and configure an instance of the Flask application.

    Args:
        config_class: Application configuration class (defaults to environment setting).

    Returns:
        Configured Flask application instance.
    """
    app = Flask(__name__)

    if config_class is None:
        env_name = os.getenv("FLASK_ENV", "development").lower()
        config_class = config_by_name.get(env_name, Config)

    app.config.from_object(config_class)

    # Initialize extensions
    db.init_app(app)
    jwt.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

    # Register JWT error handlers for clean JSON API responses
    @jwt.unauthorized_loader
    def unauthorized_callback(callback):
        return jsonify({
            "status": 401,
            "message": "Authorization header missing or invalid. Bearer token required."
        }), 401

    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({
            "status": 401,
            "message": "JWT access token has expired. Please log in again."
        }), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(callback):
        return jsonify({
            "status": 401,
            "message": "Signature verification failed or JWT token is malformed."
        }), 401

    # Register standard JSON error handlers
    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({"status": 400, "message": str(error)}), 400

    @app.errorhandler(403)
    def forbidden(error):
        return jsonify({"status": 403, "message": "Access Denied: Read gated by RBAC or patient consent."}), 403

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({"status": 404, "message": "Requested endpoint not found."}), 404

    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({"status": 500, "message": "An internal server error occurred."}), 500

    # Register blueprints
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(ingest_bp, url_prefix="/api/ingest")
    app.register_blueprint(consent_bp, url_prefix="/api/consents")
    app.register_blueprint(records_bp, url_prefix="/api/records")
    app.register_blueprint(data_quality_bp, url_prefix="/api/data-issues")
    app.register_blueprint(audit_bp, url_prefix="/api/audit-logs")
    app.register_blueprint(health_bp, url_prefix="/api")

    # Automatically create tables if using SQLite for dev ease
    with app.app_context():
        db.create_all()

    return app
