"""Cryptographic and security utilities for field-level encryption, hashing, and passwords."""

import base64
import hashlib
from typing import Optional, Union
import bcrypt
from cryptography.fernet import Fernet, InvalidToken
from flask import current_app


def hash_password(plain_password: str) -> str:
    """Hash a password securely using bcrypt with work factor 12.

    Args:
        plain_password: The plaintext password string.

    Returns:
        The utf-8 encoded bcrypt hash string.
    """
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(plain_password.encode('utf-8'), salt)
    return hashed.decode('utf-8')


def verify_password(plain_password: str, password_hash: str) -> bool:
    """Verify a plaintext password against a stored bcrypt hash.

    Args:
        plain_password: The plaintext password candidate.
        password_hash: The stored bcrypt hash string.

    Returns:
        True if password matches, False otherwise.
    """
    if not plain_password or not password_hash:
        return False
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), password_hash.encode('utf-8'))
    except Exception:
        return False


def get_fernet() -> Fernet:
    """Retrieve or initialize the Fernet symmetric encryption cipher.

    Returns:
        A Fernet instance configured with the current app's FERNET_KEY.
    """
    key = current_app.config.get("FERNET_KEY")
    if not key:
        raise ValueError("FERNET_KEY is not configured in application settings.")
    if isinstance(key, str):
        key_bytes = key.encode('utf-8')
    else:
        key_bytes = key
    return Fernet(key_bytes)


def encrypt_field(value: Optional[str]) -> Optional[str]:
    """Encrypt a sensitive string (e.g., SSN, phone, address) with Fernet field-level encryption.

    Args:
        value: Plaintext string to encrypt.

    Returns:
        Encrypted base64 string, or None if input was None.
    """
    if value is None:
        return None
    fernet = get_fernet()
    encrypted_bytes = fernet.encrypt(value.encode('utf-8'))
    return encrypted_bytes.decode('utf-8')


def decrypt_field(encrypted_val: Optional[str]) -> Optional[str]:
    """Decrypt a Fernet-encrypted ciphertext string back to plaintext.

    Args:
        encrypted_val: Ciphertext string to decrypt.

    Returns:
        Decrypted plaintext string, or None if input was None.
    """
    if encrypted_val is None:
        return None
    try:
        fernet = get_fernet()
        decrypted_bytes = fernet.decrypt(encrypted_val.encode('utf-8'))
        return decrypted_bytes.decode('utf-8')
    except (InvalidToken, Exception):
        return "[ENCRYPTED_UNREADABLE]"


def blind_index_hash(value: Optional[str], salt_suffix: str = "mpi_hash_salt") -> Optional[str]:
    """Compute a deterministic salted SHA-256 hash for exact blind indexing and matching.

    Allows exact lookups (e.g., matching a patient by SSN across hospitals)
    without storing or decrypting the raw identifier in cleartext.

    Args:
        value: Identifier string (e.g., SSN or National ID).
        salt_suffix: Salt modifier to prevent rainbow table attacks.

    Returns:
        Hex-encoded SHA-256 hash, or None if input was None.
    """
    if not value:
        return None
    normalized = "".join(ch for ch in value if ch.isalnum()).upper()
    salted = f"{normalized}:{salt_suffix}"
    return hashlib.sha256(salted.encode('utf-8')).hexdigest()
