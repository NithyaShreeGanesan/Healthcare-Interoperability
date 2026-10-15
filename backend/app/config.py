"""Configuration management for Healthcare Interoperability Platform.

Loads configuration from environment variables (.env) with strict typing,
safe defaults, and distinct environments for development, testing, and production.
"""

import os
from datetime import timedelta
from typing import Optional
from dotenv import load_dotenv

# Load .env file from backend root if present
basedir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
load_dotenv(os.path.join(basedir, '.env'))


class Config:
    """Base application configuration."""

    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-insecure-secret-key-change-me")
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "dev-insecure-jwt-secret-key-change-me")
    JWT_ACCESS_TOKEN_EXPIRES: timedelta = timedelta(
        seconds=int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES", "86400"))
    )

    # Database configuration: defaults to SQLite for dev/test portability
    # MySQL 8 URI format: mysql+pymysql://user:password@localhost:3306/dbname
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{os.path.join(basedir, 'healthcare_interop.db')}")
    SQLALCHEMY_DATABASE_URI: str = DATABASE_URL
    SQLALCHEMY_TRACK_MODIFICATIONS: bool = False

    # Field-level encryption (Fernet 32-byte urlsafe key)
    FERNET_KEY: str = os.getenv("FERNET_KEY", "6DhFiSGBSCvAru9rHMyBNrE1v83--w-JvqtNKdhYRDY=")

    # HTTPS / TLS settings
    USE_HTTPS: bool = os.getenv("USE_HTTPS", "false").lower() in ("true", "1", "yes")
    SSL_CERT_PATH: Optional[str] = os.getenv("SSL_CERT_PATH", os.path.join(basedir, "scripts", "certs", "cert.pem"))
    SSL_KEY_PATH: Optional[str] = os.getenv("SSL_KEY_PATH", os.path.join(basedir, "scripts", "certs", "key.pem"))


class DevelopmentConfig(Config):
    """Development environment configuration."""
    DEBUG: bool = True
    TESTING: bool = False


class TestingConfig(Config):
    """Testing environment configuration."""
    DEBUG: bool = False
    TESTING: bool = True
    SQLALCHEMY_DATABASE_URI: str = "sqlite:///:memory:"
    JWT_SECRET_KEY: str = "test-jwt-secret-key-for-unit-tests"
    FERNET_KEY: str = "6DhFiSGBSCvAru9rHMyBNrE1v83--w-JvqtNKdhYRDY="


class ProductionConfig(Config):
    """Production environment configuration with enforced security constraints."""
    DEBUG: bool = False
    TESTING: bool = False


config_by_name = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig,
}
