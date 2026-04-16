"""
Analytics: PostHog — Rastreamento de eventos server-side

Princípios de design:
    Fire-and-forget  — cada evento roda em daemon thread, NUNCA bloqueia a request
    Fail-silent      — qualquer exceção é absorvida, jamais propaga para o caller
    Zero dependências — usa apenas urllib.request (stdlib)
    Opt-in           — sem POSTHOG_API_KEY no .env, todos os calls são no-op

─── Uso ────────────────────────────────────────────────────────────────────────

    from app.core.analytics import track, identify

    # Em qualquer service — sync ou async, dentro de thread ou event loop
    track("user_logged_in", distinct_id=str(user.id), properties={
        "email": user.email,
        "role":  user.role.value,
    })

    identify(str(user.id), {
        "email":     user.email,
        "full_name": user.full_name,
        "plan":      "free",
    })

─── Eventos padronizados ────────────────────────────────────────────────────────

    Autenticação:
        user_signed_up       distinct_id=user_id   email, role
        user_logged_in       distinct_id=user_id   email, method="json"|"form"

    Posts:
        post_created         distinct_id=user_id   post_id, brand_id, platform, formato
        post_approved        distinct_id=user_id   post_id, brand_id, platform
        post_scheduled       distinct_id=user_id   post_id, brand_id, scheduled_at
        post_published       distinct_id=user_id   post_id, brand_id, platform, simulated=False
        post_publish_failed  distinct_id=user_id   post_id, brand_id, error_code

    Integração:
        integration_error    distinct_id=user_id   integration, event_type, error_code
        token_expired        distinct_id="system"  integration, platform

─── PostHog HTTP Capture API ────────────────────────────────────────────────────
    POST {POSTHOG_HOST}/capture/
    Body: {
        "api_key":     "<phc_xxx>",
        "event":       "<event_name>",
        "distinct_id": "<user_id_or_anonymous>",
        "properties":  { "$lib": "social-agent-backend", ... },
        "timestamp":   "2024-01-01T00:00:00+00:00"
    }
"""

import json
import logging
import threading
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from functools import lru_cache
from typing import Any

logger = logging.getLogger("analytics")

# Timeout para chamada HTTP ao PostHog (não bloqueia mais que isso)
_HTTP_TIMEOUT = 5


# ── Config ────────────────────────────────────────────────────────────────────

@lru_cache(maxsize=1)
def _settings():
    """Carrega settings uma vez (lru_cache evita re-import a cada evento)."""
    from app.core.config import get_settings
    return get_settings()


def is_enabled() -> bool:
    """Retorna True se POSTHOG_API_KEY estiver configurada."""
    return bool(_settings().POSTHOG_API_KEY)


# ── HTTP send (executa em daemon thread) ──────────────────────────────────────

def _send_capture(payload: dict) -> None:
    """
    Envia um payload para a PostHog Capture API.
    Sempre silencioso — exceções são logadas em DEBUG e absorvidas.
    Chamado apenas de dentro de daemon threads.
    """
    settings = _settings()
    url = f"{settings.POSTHOG_HOST.rstrip('/')}/capture/"

    try:
        body = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=body,
            method="POST",
            headers={
                "Content-Type": "application/json",
                "User-Agent": "social-agent-backend/1.0",
            },
        )
        with urllib.request.urlopen(req, timeout=_HTTP_TIMEOUT) as resp:
            _ = resp.read()  # consume body para liberar conexão
    except urllib.error.HTTPError as exc:
        logger.debug("PostHog HTTP %s para %s: %s", exc.code, url, exc.reason)
    except Exception as exc:
        logger.debug("PostHog send falhou (silencioso): %s", exc)


def _fire(payload: dict) -> None:
    """Dispara _send_capture em daemon thread — retorna imediatamente."""
    t = threading.Thread(target=_send_capture, args=(payload,), daemon=True)
    t.start()


# ── API pública ───────────────────────────────────────────────────────────────

def track(
    event: str,
    distinct_id: str,
    properties: dict[str, Any] | None = None,
) -> None:
    """
    Rastreia um evento no PostHog.

    Fire-and-forget — retorna imediatamente, nunca lança exceções.
    No-op se POSTHOG_API_KEY não estiver configurada.

    Args:
        event       : nome do evento (ex: "user_logged_in", "post_published")
        distinct_id : ID único do usuário — use str(user.id) para usuários autenticados
                      ou "anonymous" para eventos sem usuário identificado
        properties  : dict com propriedades adicionais do evento (opcional)
    """
    if not is_enabled():
        return

    try:
        props = {
            "$lib":     "social-agent-backend",
            "$lib_version": "1.0",
            **(properties or {}),
        }
        payload = {
            "api_key":     _settings().POSTHOG_API_KEY,
            "event":       event,
            "distinct_id": str(distinct_id),
            "properties":  props,
            "timestamp":   datetime.now(timezone.utc).isoformat(),
        }
        _fire(payload)
    except Exception as exc:
        # Proteção extra: nunca propaga
        logger.debug("analytics.track erro interno (silencioso): %s", exc)


def identify(
    distinct_id: str,
    user_properties: dict[str, Any] | None = None,
) -> None:
    """
    Associa propriedades a um usuário no PostHog ($identify event).

    Chame após login ou registro para enriquecer o perfil do usuário.
    Fire-and-forget — retorna imediatamente, nunca lança exceções.

    Args:
        distinct_id     : str(user.id)
        user_properties : propriedades do usuário (email, nome, role, plano…)
    """
    if not is_enabled():
        return

    try:
        payload = {
            "api_key":     _settings().POSTHOG_API_KEY,
            "event":       "$identify",
            "distinct_id": str(distinct_id),
            "properties":  {
                "$lib":     "social-agent-backend",
                "$set":     user_properties or {},
            },
            "timestamp":   datetime.now(timezone.utc).isoformat(),
        }
        _fire(payload)
    except Exception as exc:
        logger.debug("analytics.identify erro interno (silencioso): %s", exc)


def track_error(
    error_code: str,
    distinct_id: str = "system",
    properties: dict[str, Any] | None = None,
) -> None:
    """
    Atalho para rastrear erros de integração/sistema.
    Adiciona automaticamente error_code nas propriedades.
    """
    track(
        "integration_error",
        distinct_id=distinct_id,
        properties={"error_code": error_code, **(properties or {})},
    )
