"""
Service: ConnectedAccount CRUD + token management.

All read operations return decrypted tokens.
All write operations encrypt tokens before persisting.
"""

import json
from datetime import datetime, timezone

from sqlalchemy import and_
from sqlalchemy.orm import Session

from app.core.encryption import decrypt_token, encrypt_token
from app.models.connected_account import ConnectedAccount

# Ordered list of MVP providers — defines display order in the UI
ACTIVE_PROVIDERS = ["instagram", "facebook", "whatsapp", "twitter"]


# ── Read ───────────────────────────────────────────────────────────────────────

def get_accounts_for_user(
    db:       Session,
    user_id:  int,
    brand_id: int | None = None,
) -> list[ConnectedAccount]:
    """Return all active connected accounts for a user, optionally filtered by brand."""
    filters = [
        ConnectedAccount.user_id  == user_id,
        ConnectedAccount.is_active == True,
    ]
    if brand_id is not None:
        filters.append(ConnectedAccount.brand_id == brand_id)
    return db.query(ConnectedAccount).filter(and_(*filters)).all()


def get_account(
    db:         Session,
    account_id: int,
    user_id:    int,
) -> ConnectedAccount | None:
    return db.query(ConnectedAccount).filter(
        ConnectedAccount.id      == account_id,
        ConnectedAccount.user_id == user_id,
        ConnectedAccount.is_active == True,
    ).first()


def get_account_by_provider(
    db:       Session,
    user_id:  int,
    provider: str,
    brand_id: int | None = None,
) -> ConnectedAccount | None:
    """Return the first active account for a specific provider."""
    filters = [
        ConnectedAccount.user_id   == user_id,
        ConnectedAccount.provider  == provider,
        ConnectedAccount.is_active == True,
    ]
    if brand_id is not None:
        filters.append(ConnectedAccount.brand_id == brand_id)
    return db.query(ConnectedAccount).filter(and_(*filters)).first()


def get_decrypted_access_token(account: ConnectedAccount) -> str:
    return decrypt_token(account.access_token)


def get_decrypted_refresh_token(account: ConnectedAccount) -> str | None:
    if account.refresh_token:
        return decrypt_token(account.refresh_token)
    return None


# ── Write ──────────────────────────────────────────────────────────────────────

def upsert_account(
    db:                  Session,
    user_id:             int,
    provider:            str,
    external_account_id: str,
    account_name:        str,
    access_token:        str,
    *,
    brand_id:            int | None = None,
    account_picture_url: str | None = None,
    refresh_token:       str | None = None,
    expires_at:          datetime | None = None,
    scopes:              str | None = None,
    metadata:            dict | None = None,
) -> ConnectedAccount:
    """
    Insert or update a connected account.

    Uses (user_id, provider, external_account_id) as the upsert key.
    Tokens are encrypted before writing.
    """
    existing = db.query(ConnectedAccount).filter(
        ConnectedAccount.user_id             == user_id,
        ConnectedAccount.provider            == provider,
        ConnectedAccount.external_account_id == external_account_id,
    ).first()

    encrypted_access  = encrypt_token(access_token)
    encrypted_refresh = encrypt_token(refresh_token) if refresh_token else None

    if existing:
        existing.account_name        = account_name
        existing.account_picture_url = account_picture_url
        existing.access_token        = encrypted_access
        existing.refresh_token       = encrypted_refresh
        existing.expires_at          = expires_at
        existing.scopes              = scopes
        existing.metadata_json       = json.dumps(metadata) if metadata else None
        existing.is_active           = True
        existing.updated_at          = datetime.now(timezone.utc)
        if brand_id is not None:
            existing.brand_id = brand_id
        db.commit()
        db.refresh(existing)
        return existing

    account = ConnectedAccount(
        user_id             = user_id,
        brand_id            = brand_id,
        provider            = provider,
        external_account_id = external_account_id,
        account_name        = account_name,
        account_picture_url = account_picture_url,
        access_token        = encrypted_access,
        refresh_token       = encrypted_refresh,
        expires_at          = expires_at,
        scopes              = scopes,
        metadata_json       = json.dumps(metadata) if metadata else None,
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    return account


def update_tokens(
    db:            Session,
    account:       ConnectedAccount,
    access_token:  str,
    refresh_token: str | None = None,
    expires_at:    datetime | None = None,
) -> ConnectedAccount:
    """Update the access (and optionally refresh) token on an existing account."""
    account.access_token  = encrypt_token(access_token)
    account.expires_at    = expires_at
    account.updated_at    = datetime.now(timezone.utc)
    if refresh_token:
        account.refresh_token = encrypt_token(refresh_token)
    db.commit()
    db.refresh(account)
    return account


def disconnect_account(db: Session, account: ConnectedAccount) -> None:
    """Soft-delete: mark account inactive and wipe tokens."""
    account.is_active     = False
    account.access_token  = encrypt_token("revoked")
    account.refresh_token = None
    account.updated_at    = datetime.now(timezone.utc)
    db.commit()


# ── Status summary ─────────────────────────────────────────────────────────────

def get_provider_status_summary(
    db:       Session,
    user_id:  int,
    brand_id: int | None = None,
) -> dict[str, dict]:
    """
    Return a dict mapping each active provider to its connection status.

    Shape:
        {
            "instagram": {"connected": True, "account_name": "My Brand", ...},
            "facebook":  {"connected": False},
            ...
        }
    """
    accounts = get_accounts_for_user(db, user_id, brand_id)
    by_provider: dict[str, ConnectedAccount] = {a.provider: a for a in accounts}

    result: dict[str, dict] = {}
    for provider in ACTIVE_PROVIDERS:
        acct = by_provider.get(provider)
        if acct:
            result[provider] = {
                "connected":           True,
                "account_id":          acct.id,
                "account_name":        acct.account_name,
                "account_picture_url": acct.account_picture_url,
                "external_account_id": acct.external_account_id,
                "expires_at":          acct.expires_at.isoformat() if acct.expires_at else None,
                "scopes":              acct.scopes,
                "connected_at":        acct.created_at.isoformat(),
                "updated_at":          acct.updated_at.isoformat(),
            }
        else:
            result[provider] = {"connected": False}

    return result
