"""
Router: OAuth Integration Flows
Prefix: /api/v1

Endpoints:
    GET  /integrations/status                             — aggregated connection status for all active providers
    GET  /integrations/accounts                           — list connected accounts for current user
    GET  /integrations/connect/{provider}                 — obtain OAuth redirect URL
    GET  /integrations/{provider}/callback                — OAuth callback (called by provider, redirects to frontend)
    DELETE /integrations/accounts/{account_id}            — disconnect (soft-delete) an account

Supported providers (Phase 1 + 2):
    meta (instagram + facebook) — Facebook Login, shared token flow
    twitter                     — OAuth 2.0 PKCE
    whatsapp                    — Phase 2 (disabled until WHATSAPP_ENABLED=true)

State parameter:
    A short-lived (10 min) signed JWT carrying user_id, brand_id, provider, and
    for Twitter the PKCE code_verifier. Prevents CSRF without a server-side session.
"""

import json
import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse
from jose import JWTError, jwt
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.dependencies import get_current_active_user, get_db
from app.integrations.meta import oauth as meta_oauth
from app.integrations.twitter import oauth as twitter_oauth
from app.models.user import User
from app.services import connected_account_service as svc

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Integrations OAuth"])

_STATE_EXPIRE_MINUTES = 10


# ── Pydantic output schemas ───────────────────────────────────────────────────

class ConnectedAccountOut(BaseModel):
    id:                  int
    provider:            str
    external_account_id: str | None
    account_name:        str | None
    account_picture_url: str | None
    scopes:              str | None
    is_active:           bool
    expires_at:          datetime | None
    created_at:          datetime
    updated_at:          datetime

    model_config = {"from_attributes": True}


class OAuthRedirectOut(BaseModel):
    redirect_url: str


class ProviderStatusOut(BaseModel):
    provider:            str
    connected:           bool
    account_id:          int | None = None
    account_name:        str | None = None
    account_picture_url: str | None = None
    external_account_id: str | None = None
    expires_at:          str | None = None
    scopes:              str | None = None
    connected_at:        str | None = None
    updated_at:          str | None = None


class IntegrationStatusOut(BaseModel):
    providers: list[ProviderStatusOut]


# ── State JWT helpers ─────────────────────────────────────────────────────────

def _create_state(user_id: int, brand_id: int | None, provider: str, **extra: object) -> str:
    settings = get_settings()
    payload = {
        "sub":      str(user_id),
        "brand_id": brand_id,
        "provider": provider,
        "exp":      datetime.now(timezone.utc) + timedelta(minutes=_STATE_EXPIRE_MINUTES),
        **extra,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")


def _decode_state(state: str) -> dict:
    settings = get_settings()
    try:
        return jwt.decode(state, settings.SECRET_KEY, algorithms=["HS256"])
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"OAuth state inválido ou expirado. Tente novamente.",
        ) from exc


def _frontend_redirect(path: str) -> str:
    settings = get_settings()
    base = getattr(settings, "FRONTEND_URL", "http://localhost:3000").rstrip("/")
    return base + path


# ── GET /integrations/status ──────────────────────────────────────────────────

@router.get(
    "/integrations/status",
    response_model=IntegrationStatusOut,
    summary="Status de conexão de todos os providers ativos",
)
def get_integration_status(
    brand_id:     int | None = Query(default=None),
    db:           Session    = Depends(get_db),
    current_user: User       = Depends(get_current_active_user),
) -> IntegrationStatusOut:
    summary = svc.get_provider_status_summary(db, current_user.id, brand_id)
    providers = [
        ProviderStatusOut(provider=p, **data)
        for p, data in summary.items()
    ]
    return IntegrationStatusOut(providers=providers)


# ── GET /integrations/accounts ────────────────────────────────────────────────

@router.get(
    "/integrations/accounts",
    response_model=list[ConnectedAccountOut],
    summary="Listar contas conectadas do usuário",
)
def list_accounts(
    brand_id:     int | None = Query(default=None),
    db:           Session    = Depends(get_db),
    current_user: User       = Depends(get_current_active_user),
) -> list[ConnectedAccountOut]:
    accounts = svc.get_accounts_for_user(db, current_user.id, brand_id)
    return [ConnectedAccountOut.model_validate(a) for a in accounts]


# ── GET /integrations/connect/{provider} ──────────────────────────────────────

@router.get(
    "/integrations/connect/{provider}",
    response_model=OAuthRedirectOut,
    summary="Iniciar fluxo OAuth para um provider",
    description=(
        "Retorna a URL de autorização OAuth do provider. "
        "O frontend deve redirecionar o navegador para essa URL."
    ),
)
def connect_provider(
    provider:     str,
    brand_id:     int | None = Query(default=None),
    db:           Session    = Depends(get_db),
    current_user: User       = Depends(get_current_active_user),
) -> OAuthRedirectOut:
    settings = get_settings()

    if provider in ("instagram", "facebook"):
        if not settings.META_APP_ID or not settings.META_APP_SECRET:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Meta App ID / Secret não configurados. Contate o administrador.",
            )
        state = _create_state(current_user.id, brand_id, provider)
        redirect_uri = getattr(settings, "META_REDIRECT_URI", "") or (
            f"http://localhost:8000/api/v1/integrations/meta/callback"
        )
        url = meta_oauth.build_auth_url(settings.META_APP_ID, redirect_uri, state)
        return OAuthRedirectOut(redirect_url=url)

    if provider == "twitter":
        if not settings.TWITTER_CLIENT_ID or not settings.TWITTER_CLIENT_SECRET:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Twitter Client ID / Secret não configurados. Contate o administrador.",
            )
        code_verifier, code_challenge = twitter_oauth.generate_pkce_pair()
        state = _create_state(
            current_user.id, brand_id, provider, pkce_verifier=code_verifier
        )
        redirect_uri = getattr(settings, "TWITTER_REDIRECT_URI", "") or (
            "http://localhost:8000/api/v1/integrations/twitter/callback"
        )
        url = twitter_oauth.build_auth_url(
            settings.TWITTER_CLIENT_ID, redirect_uri, state, code_challenge
        )
        return OAuthRedirectOut(redirect_url=url)

    if provider == "whatsapp":
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="WhatsApp está em fase 2. Em breve disponível.",
        )

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Provider '{provider}' não reconhecido. Use: instagram, facebook, twitter, whatsapp.",
    )


# ── GET /integrations/meta/callback ──────────────────────────────────────────

@router.get(
    "/integrations/meta/callback",
    summary="Callback OAuth Meta (Instagram / Facebook)",
    include_in_schema=False,
)
def meta_callback(
    code:  str | None = Query(default=None),
    state: str | None = Query(default=None),
    error: str | None = Query(default=None),
    db:    Session    = Depends(get_db),
):
    settings = get_settings()

    if error:
        logger.warning("Meta OAuth error: %s", error)
        return RedirectResponse(
            _frontend_redirect(f"/integrations?oauth_error={error}"),
            status_code=302,
        )

    if not code or not state:
        return RedirectResponse(
            _frontend_redirect("/integrations?oauth_error=missing_params"),
            status_code=302,
        )

    try:
        state_data = _decode_state(state)
    except HTTPException:
        return RedirectResponse(
            _frontend_redirect("/integrations?oauth_error=invalid_state"),
            status_code=302,
        )

    user_id  = int(state_data["sub"])
    brand_id = state_data.get("brand_id")
    provider = state_data.get("provider", "instagram")  # instagram | facebook

    redirect_uri = getattr(settings, "META_REDIRECT_URI", "") or (
        "http://localhost:8000/api/v1/integrations/meta/callback"
    )

    try:
        logger.info("[meta_callback] user_id=%s provider=%s redirect_uri=%s", user_id, provider, redirect_uri)

        # 1. Exchange code for short-lived token
        short = meta_oauth.exchange_code_for_short_lived_token(
            code, settings.META_APP_ID, settings.META_APP_SECRET, redirect_uri
        )
        logger.info("[meta_callback] short-lived token OK, keys=%s", list(short.keys()))

        # 2. Exchange for long-lived user token (60 days)
        long = meta_oauth.exchange_for_long_lived_token(
            short["access_token"], settings.META_APP_ID, settings.META_APP_SECRET
        )
        logger.info("[meta_callback] long-lived token OK, expires_in=%s", long.get("expires_in"))

        user_token = long["access_token"]
        token_expires_seconds = long.get("expires_in")
        expires_at = (
            datetime.now(timezone.utc) + timedelta(seconds=token_expires_seconds)
            if token_expires_seconds else None
        )

        # 3. Fetch user's Facebook Pages
        pages = meta_oauth.get_user_pages(user_token)
        logger.info("[meta_callback] pages found: %d — names=%s", len(pages), [p.get("name") for p in pages])

        if not pages:
            logger.warning("[meta_callback] no pages found for user_id=%s", user_id)
            return RedirectResponse(
                _frontend_redirect("/integrations?oauth_error=no_pages_found"),
                status_code=302,
            )

        connected_providers: list[str] = []

        for page in pages:
            page_token = page["access_token"]
            page_id    = page["id"]
            page_name  = page["name"]
            page_pic   = page.get("picture", {}).get("data", {}).get("url")

            # Store Facebook Page connection
            if provider in ("facebook", "instagram"):
                svc.upsert_account(
                    db,
                    user_id             = user_id,
                    provider            = "facebook",
                    external_account_id = page_id,
                    account_name        = page_name,
                    access_token        = page_token,
                    brand_id            = brand_id,
                    account_picture_url = page_pic,
                    scopes              = meta_oauth.SCOPES,
                    metadata            = {"page_id": page_id, "user_token_expires_at": expires_at.isoformat() if expires_at else None},
                )
                logger.info("[meta_callback] facebook persisted page_id=%s page_name=%s", page_id, page_name)
                if "facebook" not in connected_providers:
                    connected_providers.append("facebook")

            # Check for linked Instagram Business Account
            try:
                ig_account = meta_oauth.get_instagram_account_for_page(page_id, page_token)
                logger.info("[meta_callback] ig_account for page %s: %s", page_id, ig_account)
            except Exception as exc:
                logger.warning("[meta_callback] could not fetch IG account for page %s: %s", page_id, exc)
                ig_account = None

            if ig_account:
                svc.upsert_account(
                    db,
                    user_id             = user_id,
                    provider            = "instagram",
                    external_account_id = ig_account["id"],
                    account_name        = ig_account.get("username") or ig_account.get("name") or page_name,
                    access_token        = page_token,
                    brand_id            = brand_id,
                    account_picture_url = ig_account.get("profile_picture_url"),
                    scopes              = meta_oauth.SCOPES,
                    metadata            = {
                        "ig_user_id":       ig_account["id"],
                        "fb_page_id":       page_id,
                        "fb_page_name":     page_name,
                        "followers_count":  ig_account.get("followers_count"),
                    },
                )
                logger.info("[meta_callback] instagram persisted ig_id=%s username=%s", ig_account["id"], ig_account.get("username"))
                if "instagram" not in connected_providers:
                    connected_providers.append("instagram")
            else:
                logger.warning("[meta_callback] no IG business account linked to page %s", page_id)

        connected_str = ",".join(connected_providers) or "facebook"
        first_name    = pages[0]["name"] if pages else "conta"
        logger.info("[meta_callback] SUCCESS connected_providers=%s redirecting to frontend", connected_providers)
        try:
            from app.core import analytics
            for provider_name in connected_providers:
                event = "instagram_connected" if provider_name == "instagram" else "social_account_connected"
                analytics.track(event, distinct_id=str(user_id), properties={
                    "provider": provider_name,
                    "brand_id": brand_id,
                })
        except Exception:
            pass
        return RedirectResponse(
            _frontend_redirect(
                f"/integrations?connected={connected_str}&account={first_name}"
            ),
            status_code=302,
        )

    except Exception as exc:
        logger.exception("[meta_callback] FAILED — %s", exc)
        safe = str(exc)[:120].replace("&", "%26")
        return RedirectResponse(
            _frontend_redirect(f"/integrations?oauth_error={safe}"),
            status_code=302,
        )


# ── GET /integrations/twitter/callback ───────────────────────────────────────

@router.get(
    "/integrations/twitter/callback",
    summary="Callback OAuth X / Twitter",
    include_in_schema=False,
)
def twitter_callback(
    code:  str | None = Query(default=None),
    state: str | None = Query(default=None),
    error: str | None = Query(default=None),
    db:    Session    = Depends(get_db),
):
    settings = get_settings()

    if error:
        logger.warning("Twitter OAuth error: %s", error)
        return RedirectResponse(
            _frontend_redirect(f"/integrations?oauth_error={error}"),
            status_code=302,
        )

    if not code or not state:
        return RedirectResponse(
            _frontend_redirect("/integrations?oauth_error=missing_params"),
            status_code=302,
        )

    try:
        state_data = _decode_state(state)
    except HTTPException:
        return RedirectResponse(
            _frontend_redirect("/integrations?oauth_error=invalid_state"),
            status_code=302,
        )

    user_id       = int(state_data["sub"])
    brand_id      = state_data.get("brand_id")
    code_verifier = state_data.get("pkce_verifier", "")

    redirect_uri = getattr(settings, "TWITTER_REDIRECT_URI", "") or (
        "http://localhost:8000/api/v1/integrations/twitter/callback"
    )

    try:
        tokens = twitter_oauth.exchange_code_for_token(
            code,
            code_verifier,
            settings.TWITTER_CLIENT_ID,
            settings.TWITTER_CLIENT_SECRET,
            redirect_uri,
        )
        access_token  = tokens["access_token"]
        refresh_token = tokens.get("refresh_token")
        expires_in    = tokens.get("expires_in")
        expires_at    = (
            datetime.now(timezone.utc) + timedelta(seconds=expires_in)
            if expires_in else None
        )
        scope = tokens.get("scope", twitter_oauth.SCOPES)

        user_info = twitter_oauth.get_user_info(access_token)
        twitter_id   = user_info.get("id", "")
        twitter_name = user_info.get("name") or user_info.get("username", "")
        twitter_pic  = user_info.get("profile_image_url")

        svc.upsert_account(
            db,
            user_id             = user_id,
            provider            = "twitter",
            external_account_id = twitter_id,
            account_name        = twitter_name,
            access_token        = access_token,
            brand_id            = brand_id,
            account_picture_url = twitter_pic,
            refresh_token       = refresh_token,
            expires_at          = expires_at,
            scopes              = scope,
            metadata            = {"username": user_info.get("username")},
        )

        try:
            from app.core import analytics
            analytics.track("social_account_connected", distinct_id=str(user_id), properties={
                "provider": "twitter",
                "brand_id": brand_id,
            })
        except Exception:
            pass
        return RedirectResponse(
            _frontend_redirect(f"/integrations?connected=twitter&account={twitter_name}"),
            status_code=302,
        )

    except Exception as exc:
        logger.exception("Twitter OAuth callback failed")
        safe = str(exc)[:120].replace("&", "%26")
        return RedirectResponse(
            _frontend_redirect(f"/integrations?oauth_error={safe}"),
            status_code=302,
        )


# ── DELETE /integrations/accounts/{account_id} ───────────────────────────────

@router.delete(
    "/integrations/accounts/{account_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Desconectar uma conta integrada",
)
def disconnect_account(
    account_id:   int,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_active_user),
) -> None:
    account = svc.get_account(db, account_id, current_user.id)
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conta não encontrada.",
        )
    svc.disconnect_account(db, account)
