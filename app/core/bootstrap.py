"""
Startup bootstrap — idempotent DB mutations that must be true at every deploy.

Called once from the FastAPI lifespan (before first request).
Safe to run on every startup — all operations are upserts or no-ops.
"""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)

SUPER_ADMIN_EMAIL = "prompt.admia@gmail.com"
DEMOTE_EMAIL      = "angelo.msk8+1@example.com"


def run(db_session_factory) -> None:
    """
    Ensures critical access rules are enforced in the database.

    1. prompt.admia@gmail.com → is_superuser=True
    2. angelo.msk8+1@example.com → is_superuser=False (if exists)
    """
    from app.models.user import User

    db = db_session_factory()
    try:
        changed = False

        super_admin = db.query(User).filter(User.email == SUPER_ADMIN_EMAIL).first()
        if super_admin and not super_admin.is_superuser:
            super_admin.is_superuser = True
            changed = True
            logger.info("[bootstrap] Promoted %s to superuser", SUPER_ADMIN_EMAIL)
        elif not super_admin:
            logger.warning("[bootstrap] Super admin account %s not found in DB — create it first", SUPER_ADMIN_EMAIL)

        demote = db.query(User).filter(User.email == DEMOTE_EMAIL).first()
        if demote and demote.is_superuser:
            demote.is_superuser = False
            changed = True
            logger.info("[bootstrap] Revoked superuser from %s", DEMOTE_EMAIL)

        if changed:
            db.commit()
        else:
            logger.debug("[bootstrap] No access changes needed")

    except Exception:
        db.rollback()
        logger.exception("[bootstrap] Failed to apply access rules — continuing startup")
    finally:
        db.close()
