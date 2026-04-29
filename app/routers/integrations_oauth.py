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
from app.services import social_connection_service as sc_svc

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


class MetaStatusOut(BaseModel):
    connected:            bool
    facebook_page_id:     str | None = None
    facebook_page_name:   str | None = None
    instagram_account_id: str | None = None
    connected_at:         str | None = None


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


# ── GET /integrations/healthz ─────────────────────────────────────────────────
# Endpoint público (sem autenticação) — confirma que o router está registrado.
# Acesse GET /api/v1/integrations/healthz para verificar em produção.

@router.get(
    "/integrations/healthz",
    include_in_schema=False,
)
def integrations_healthz() -> dict:
    """Confirma que o router integrations_oauth está registrado e respondendo."""
    return {
        "status": "ok",
        "router": "integrations_oauth",
        "routes": [
            "GET  /api/v1/integrations/healthz",
            "GET  /api/v1/integrations/status",
            "GET  /api/v1/integrations/accounts",
            "GET  /api/v1/integrations/connect/{provider}",
            "GET  /api/v1/integrations/meta/callback",
            "GET  /api/v1/integrations/twitter/callback",
            "DELETE /api/v1/integrations/accounts/{account_id}",
        ],
    }


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
        redirect_uri = settings.META_REDIRECT_URI
        url = meta_oauth.build_auth_url(settings.META_APP_ID, redirect_uri, state)
        logger.info(
            "[connect_provider/meta] app_id=%s redirect_uri=%s scopes=%s oauth_url=%s",
            settings.META_APP_ID, redirect_uri, meta_oauth.SCOPES, url,
        )
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


# ── GET /integrations/meta/connect ───────────────────────────────────────────

@router.get(
    "/integrations/meta/connect",
    response_model=OAuthRedirectOut,
    summary="Iniciar OAuth Meta (Facebook + Instagram básico)",
)
def meta_connect(
    brand_id:     int | None = Query(default=None),
    db:           Session    = Depends(get_db),
    current_user: User       = Depends(get_current_active_user),
) -> OAuthRedirectOut:
    settings = get_settings()
    if not settings.META_APP_ID or not settings.META_APP_SECRET:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Meta App ID / Secret não configurados. Contate o administrador.",
        )
    state = _create_state(current_user.id, brand_id, "meta")
    redirect_uri = settings.META_REDIRECT_URI
    url = meta_oauth.build_auth_url(settings.META_APP_ID, redirect_uri, state)
    logger.info(
        "[meta_connect] user_id=%s META_REDIRECT_URI=%s scopes=%s oauth_url=%s",
        current_user.id, redirect_uri, meta_oauth.SCOPES, url,
    )
    return OAuthRedirectOut(redirect_url=url)


# ── GET /integrations/meta/status ────────────────────────────────────────────

@router.get(
    "/integrations/meta/status",
    response_model=MetaStatusOut,
    summary="Status da conexão Meta do usuário atual",
)
def meta_status(
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_active_user),
) -> MetaStatusOut:
    conn = sc_svc.get_meta_connection(db, current_user.id)
    if not conn:
        return MetaStatusOut(connected=False)
    return MetaStatusOut(
        connected            = True,
        facebook_page_id     = conn.facebook_page_id,
        facebook_page_name   = conn.facebook_page_name,
        instagram_account_id = conn.instagram_account_id,
        connected_at         = conn.created_at.isoformat() if conn.created_at else None,
    )


# ── GET /integrations/meta/callback ──────────────────────────────────────────

@router.get(
    "/integrations/meta/callback",
    summary="Callback OAuth Meta (Instagram / Facebook)",
    include_in_schema=False,
)
def meta_callback(
    code:              str | None = Query(default=None),
    state:             str | None = Query(default=None),
    error:             str | None = Query(default=None),
    error_code:        str | None = Query(default=None),
    error_description: str | None = Query(default=None),
    db:                Session    = Depends(get_db),
):
    settings = get_settings()

    if error:
        logger.error(
            "[meta_callback] Meta retornou erro OAuth — error=%s error_code=%s error_description=%s",
            error,
            error_code,
            error_description,
        )
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

    redirect_uri = settings.META_REDIRECT_URI

    try:
        logger.info("[meta_callback] user_id=%s META_REDIRECT_URI=%s", user_id, redirect_uri)

        # 1. Exchange code for user access token
        token_data = meta_oauth.exchange_code_for_token(
            code, settings.META_APP_ID, settings.META_APP_SECRET, redirect_uri
        )
        user_token = token_data["access_token"]
        logger.info("[meta_callback] token exchange OK")

        # 2. Fetch Facebook Pages (includes instagram_business_account when linked)
        pages = meta_oauth.get_user_pages(user_token)
        logger.info("[meta_callback] pages found=%d ids=%s", len(pages), [p.get("id") for p in pages])

        # 3. Pick first page; prefer one with instagram_business_account
        page_with_ig = next(
            (p for p in pages if p.get("instagram_business_account")), None
        )
        chosen_page = page_with_ig or (pages[0] if pages else None)

        facebook_page_id     = chosen_page["id"]   if chosen_page else None
        facebook_page_name   = chosen_page.get("name") if chosen_page else None
        instagram_account_id = (
            chosen_page["instagram_business_account"]["id"]
            if chosen_page and chosen_page.get("instagram_business_account")
            else None
        )

        logger.info(
            "[meta_callback] page_id=%s page_name=%s ig_account_id=%s",
            facebook_page_id, facebook_page_name, instagram_account_id,
        )

        # 4. Persist to social_connections (upsert — one row per user/provider)
        sc_svc.upsert_meta_connection(
            db,
            user_id              = user_id,
            facebook_page_id     = facebook_page_id,
            facebook_page_name   = facebook_page_name,
            instagram_account_id = instagram_account_id,
            access_token         = user_token,
        )
        logger.info("[meta_callback] social_connections upserted for user_id=%s", user_id)

        try:
            from app.core import analytics
            analytics.track("meta_connected", distinct_id=str(user_id), properties={
                "facebook_page_id":     facebook_page_id,
                "instagram_account_id": instagram_account_id,
                "brand_id":             brand_id,
            })
        except Exception:
            pass

        account_label = facebook_page_name or "Meta"
        return RedirectResponse(
            _frontend_redirect(
                f"/integrations?connected=meta&account={account_label}"
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
