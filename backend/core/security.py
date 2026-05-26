"""
Credential encryption/decryption. Passwords and tokens must always be
stored encrypted and decrypted only at the moment of use.
Never log decrypted values.
"""
import base64
import hashlib

from cryptography.fernet import Fernet

from core.config import settings


def _cipher() -> Fernet:
    key_bytes = hashlib.sha256(settings.ENCRYPTION_KEY.encode()).digest()
    return Fernet(base64.urlsafe_b64encode(key_bytes))


def encrypt(plaintext: str) -> str:
    return _cipher().encrypt(plaintext.encode()).decode()


def decrypt(ciphertext: str) -> str:
    try:
        return _cipher().decrypt(ciphertext.encode()).decode()
    except Exception:
        return ciphertext  # plaintext passthrough — not yet encrypted
