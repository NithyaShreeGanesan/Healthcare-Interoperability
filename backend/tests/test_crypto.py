"""Tests for cryptographic utilities: bcrypt, Fernet encryption, and salted blind indexing."""

import pytest
from app.utils.crypto import hash_password, verify_password, encrypt_field, decrypt_field, blind_index_hash


def test_password_hashing():
    """Verify password hashing with bcrypt and safe verification."""
    password = "SuperSecretPassword#2026"
    pwd_hash = hash_password(password)

    assert pwd_hash is not None
    assert pwd_hash != password
    assert pwd_hash.startswith("$2b$")

    # Correct password succeeds
    assert verify_password(password, pwd_hash) is True

    # Incorrect password fails
    assert verify_password("WrongPassword123", pwd_hash) is False
    assert verify_password("", pwd_hash) is False


def test_field_level_encryption(app):
    """Verify Fernet field-level encryption for sensitive PHI (e.g., SSN, phone)."""
    with app.app_context():
        phi_data = "987-65-4321"
        encrypted = encrypt_field(phi_data)

        assert encrypted is not None
        assert encrypted != phi_data
        assert len(encrypted) > len(phi_data)

        # Decrypt should match original plaintext
        decrypted = decrypt_field(encrypted)
        assert decrypted == phi_data

        # None handling
        assert encrypt_field(None) is None
        assert decrypt_field(None) is None


def test_blind_index_hash():
    """Verify deterministic salted blind index hashing for exact matching without cleartext SSN."""
    ssn_1 = "987-65-4321"
    ssn_2 = "987654321"  # Same digits without dashes
    ssn_3 = "123-45-6789"  # Different SSN

    hash_1 = blind_index_hash(ssn_1)
    hash_2 = blind_index_hash(ssn_2)
    hash_3 = blind_index_hash(ssn_3)

    assert hash_1 is not None
    assert len(hash_1) == 64  # SHA-256 hex string

    # Same normalized SSN produces matching hash
    assert hash_1 == hash_2

    # Different SSN produces completely different hash
    assert hash_1 != hash_3
