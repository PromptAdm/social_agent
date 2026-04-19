"""
Token encryption using Fernet symmetric encryption.

Tokens stored in connected_accounts are encrypted at rest. The Fernet key is
either set explicitly via ENCRYPTION_KEY in .env or derived deterministically
from the app's SECRET_KEY using PBKDF2-HMAC-SHA256.

Generate a standalone key for production:
    python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
"""

import base64
import hashlib
from functools import lru_cache

from cryptography.fernet import Fernet


@lru_cache(maxsize=1)
def _get_fernet() -> Fernet:
    from app.core.config import get_settings
    settings = get_settings()

    if getattr(settings, "ENCRYPTION_KEY", ""):
        key = settings.ENCRYPTION_KEY.encode()
    else:
        # Derive a stable 32-byte key from SECRET_KEY
        dk = hashlib.pbkdf2_hmac(
            "sha256",
            settings.SECRET_KEY.encode(),
            b"social_agent_token_encryption_v1",
            iterations=100_000,
        )
        key = base64.urlsafe_b64encode(dk[:32])

    return Fernet(key)


def encrypt_token(plaintext: str) -> str:
    """Encrypt a token string for storage. Returns a base64 string."""
    return _get_fernet().encrypt(plaintext.encode()).decode()


def decrypt_token(ciphertext: str) -> str:
    """Decrypt a previously encrypted token string."""
    return _get_fernet().decrypt(ciphertext.encode()).decode()
