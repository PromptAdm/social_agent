"""
Service: Meta — Publicação e Diagnóstico via Meta Graph API

Camada de serviço isolada para integração com Instagram e Facebook.

─── O que este módulo NÃO é ────────────────────────────────────────────────────
    NÃO é um router — nunca é chamado diretamente por uma rota HTTP.
    NÃO é o publisher de baixo nível — isso fica em integrations/meta/publisher.py.
    NÃO conhece o scheduler — o scheduler chama publishing_service, que chama este.

─── O que este módulo É ────────────────────────────────────────────────────────
    Camada de serviço de alto nível para operações Meta com:
        is_configured()         — verifica credenciais mínimas no .env
        check_token_health()    — valida token via GET /me + GET /debug_token
        publish_post()          — facade unificada (instagram ou facebook)
        publish_instagram()     — publica via Content Publishing API (2 etapas)
        publish_facebook()      — publica via Pages API (1 etapa)

─── Tratamento de token expirado ───────────────────────────────────────────────
    Meta retorna OAuthException quando o token expira/é revogado.
    Este service detecta os códigos específicos e sinaliza token_expired=True
    em MetaPublishResult, permitindo ao caller pausar o scheduler ou alertar
    o admin — sem afetar outros posts ou plataformas.

    Códigos Meta monitorados:
        190  — Invalid OAuth access token  (expirado, revogado, senha alterada)
        102  — Session key invalid
        2500 — Active access token must be used to query current user

─── Validação de resposta ──────────────────────────────────────────────────────
    Toda chamada à API tem validação explícita via _validate_response().
    Campos obrigatórios ausentes geram IntegrationError(code="invalid_response")
    — nunca um KeyError silencioso em produção.

─── Como o scheduler usa este service ─────────────────────────────────────────
    O scheduler chama publishing_service.publish_post(db, post_id).
    publishing_service.publish_post delega para meta_service quando:
        post.platform in (instagram, facebook) AND meta_service.is_configured()

    O scheduler.py não precisa ser modificado.
    A integração é completamente transparente para o loop de agendamento.

─── Dependências ───────────────────────────────────────────────────────────────
    app.core.config              — get_settings()
    app.integrations.base        — IntegrationError, RetryableIntegrationError, with_retry
    app.integrations.meta.client — MetaApiClient (HTTP puro)
    app.models.integration_log   — IntegrationStatus
    app.services.integration_log_service — write_log()
"""

import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Optional

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.integrations.base import (
    IntegrationError,
    RetryableIntegrationError,
    RetryConfig,
    with_retry,
)
from app.integrations.meta.client import MetaApiClient
from app.models.integration_log import IntegrationStatus
from app.services import integration_log_service


# ── Códigos de erro OAuth da Meta Graph API ────────────────────────────────────
# https://developers.facebook.com/docs/graph-api/guides/error-handling/
#
# Esses códigos indicam que o access token é inválido, expirado ou revogado.
# Não tem sentido retenciar — o token precisa ser renovado manualmente.
_TOKEN_ERROR_CODES: frozenset[str] = frozenset({
    "190",   # Invalid OAuth access token (inclui expirado, revogado, etc.)
    "102",   # Session key invalid or no longer valid
    "2500",  # Active access token must be used to query current user
})

# Sub-códigos do OAuthException 190 — mais granulares
_TOKEN_EXPIRED_SUBCODES: frozenset[str] = frozenset({
    "463",   # Access token expired
    "467",   # Access token not authorized for the requested actions
    "458",   # App was removed by the user
    "460",   # Password has been changed
    "461",   # User logged in from a new location
    "462",   # Invalid session (client rotation)
})

_INTEGRATION = "meta_api"


# ── Tipos de resultado ─────────────────────────────────────────────────────────

class TokenHealthStatus(str, Enum):
    VALID        = "valid"
    EXPIRED      = "expired"   # OAuthException 190 — renovar token
    INVALID      = "invalid"   # Outro erro de autenticação
    UNCONFIGURED = "unconfigured"  # META_ACCESS_TOKEN ausente no .env


@dataclass
class TokenHealthResult:
    """
    Resultado da verificação de saúde do token Meta.

    Campos:
        status       : VALID | EXPIRED | INVALID | UNCONFIGURED
        account_id   : ID da conta retornado por GET /me (presente se VALID)
        account_name : Nome da conta (presente se VALID)
        app_id       : ID do app vinculado ao token (se META_APP_ID configurado)
        expires_at   : Data de expiração do token (se disponível via debug_token)
        scopes       : Lista de permissões autorizadas para o token
        error_code   : Código de erro Meta (presente se EXPIRED ou INVALID)
        error_message: Mensagem de erro completa
    """
    status: TokenHealthStatus
    account_id:    Optional[str]      = None
    account_name:  Optional[str]      = None
    app_id:        Optional[str]      = None
    expires_at:    Optional[datetime] = None
    scopes:        list[str]          = field(default_factory=list)
    error_code:    Optional[str]      = None
    error_message: Optional[str]      = None


@dataclass
class MetaPublishResult:
    """
    Resultado de uma tentativa de publicação no Meta (Instagram ou Facebook).

    Em sucesso:
        success=True, external_post_id, post_url, published_at preenchidos.

    Em falha:
        success=False, error_code, error_message preenchidos.
        token_expired=True indica que o token deve ser renovado — o caller
        pode pausar o scheduler para evitar logs de erro em cascata.

    Campos:
        post_id          : ID interno do post no Social Agent
        brand_id         : ID da marca no Social Agent
        platform         : "instagram" | "facebook"
        external_post_id : ID atribuído pela Meta (media_id ou page_post_id)
        post_url         : URL pública do post (permalink)
        token_expired    : True se o erro foi OAuthException 190
        attempts         : Número de tentativas realizadas (inclui retries)
        duration_ms      : Tempo total da operação em milissegundos
        raw_response     : Resposta bruta da API para auditoria
    """
    success:          bool
    post_id:          int
    brand_id:         int
    platform:         str
    external_post_id: Optional[str]      = None
    post_url:         Optional[str]      = None
    published_at:     Optional[datetime] = None
    error_code:       Optional[str]      = None
    error_message:    Optional[str]      = None
    token_expired:    bool               = False
    attempts:         int                = 1
    duration_ms:      int                = 0
    raw_response:     dict               = field(default_factory=dict)


# ── Helpers internos ──────────────────────────────────────────────────────────

def _make_client() -> Optional[MetaApiClient]:
    """Instancia MetaApiClient com as credenciais do .env. Retorna None se não configurado."""
    settings = get_settings()
    if not settings.META_ACCESS_TOKEN:
        return None
    return MetaApiClient(
        access_token=settings.META_ACCESS_TOKEN,
        version=settings.META_API_VERSION,
    )


def _is_token_error(exc: IntegrationError) -> bool:
    """
    Retorna True se a exceção representa um problema com o access token OAuth.

    Verifica o error_code da exceção contra os códigos conhecidos da Meta.
    Não lança exceções — safe to call em qualquer contexto.
    """
    code = str(getattr(exc, "error_code", "") or "")
    return code in _TOKEN_ERROR_CODES


def _build_caption(caption: str, hashtags: Optional[str], cta: Optional[str]) -> str:
    """Monta o texto completo do post: caption + hashtags + CTA separados por linha dupla."""
    parts = [p for p in [caption, hashtags, cta] if p and p.strip()]
    return "\n\n".join(parts)


def _validate_response(resp: Any, required_fields: list[str], step: str) -> None:
    """
    Valida a estrutura de uma resposta da Meta Graph API.

    Garante que `resp` é um dict e que todos os `required_fields` estão presentes
    e não-vazios. Lança IntegrationError com error_code="invalid_response" se falhar.

    Args:
        resp            : valor retornado pela chamada HTTP
        required_fields : lista de chaves obrigatórias
        step            : nome da etapa para contexto no erro (ex: "criar_container")
    """
    if not isinstance(resp, dict):
        raise IntegrationError(
            message=(
                f"[{step}] Resposta inválida da Meta API: "
                f"esperado dict, recebeu {type(resp).__name__}. "
                f"Verifique a versão da API ({get_settings().META_API_VERSION})."
            ),
            integration=_INTEGRATION,
            event_type="publish_post",
            error_code="invalid_response",
        )
    for fname in required_fields:
        val = resp.get(fname)
        if not val or not str(val).strip():
            raise IntegrationError(
                message=(
                    f"[{step}] Campo '{fname}' ausente ou vazio na resposta da Meta. "
                    f"Resposta completa: {resp}"
                ),
                integration=_INTEGRATION,
                event_type="publish_post",
                error_code="invalid_response",
            )


def _wait_for_video_container(
    client: MetaApiClient,
    container_id: str,
    max_polls: int = 12,
) -> None:
    """
    Aguarda o container de vídeo atingir status FINISHED (polling com backoff linear).

    A Meta processa vídeos de forma assíncrona. Publicar antes de FINISHED retorna erro.
    Estratégia: verifica a cada min(6*attempt, 30) segundos → máx ~3min de espera.

    Raises:
        IntegrationError            : container entrou em estado ERROR (não recuperável)
        RetryableIntegrationError   : timeout atingido (scheduler pode retentar no próximo tick)
    """
    for attempt in range(1, max_polls + 1):
        resp = client.get(f"/{container_id}", {"fields": "status_code,status"})
        status_code = resp.get("status_code", "")

        if status_code == "FINISHED":
            return
        if status_code == "ERROR":
            raise IntegrationError(
                message=(
                    f"Container de vídeo id={container_id} falhou no processamento Meta. "
                    f"Status: {resp.get('status')}. Verifique o formato/codificação do arquivo."
                ),
                integration=_INTEGRATION,
                event_type="publish_post",
                error_code="video_processing_error",
            )
        # IN_PROGRESS, PUBLISHED ou vazio — aguarda próximo poll
        time.sleep(min(6 * attempt, 30))

    raise RetryableIntegrationError(
        message=(
            f"Container de vídeo id={container_id} não ficou FINISHED após {max_polls} polls "
            f"(~{sum(min(6 * i, 30) for i in range(1, max_polls))}s). "
            "Verifique o painel Meta ou tente publicar novamente."
        ),
        integration=_INTEGRATION,
        event_type="publish_post",
        error_code="video_processing_timeout",
    )


# ── API pública ───────────────────────────────────────────────────────────────

def is_configured() -> bool:
    """
    Retorna True se as credenciais mínimas para publicação estiverem configuradas.

    Credenciais mínimas: META_ACCESS_TOKEN + META_IG_USER_ID
    (META_FACEBOOK_PAGE_ID é validado separadamente em publish_facebook).

    Uso típico:
        if meta_service.is_configured():
            outcome = meta_service.publish_post(db, post)
        else:
            # usar mock ou pular publicação
    """
    s = get_settings()
    return bool(s.META_ACCESS_TOKEN and s.META_IG_USER_ID)


def check_token_health(db: Session) -> TokenHealthResult:
    """
    Verifica se o access token Meta está válido e com os scopes necessários.

    Fluxo:
        1. GET /me?fields=id,name  — chamada básica para validar autenticação
        2. GET /debug_token        — detalhes de expiração e scopes (requer META_APP_ID)
        3. Persiste resultado em integration_logs para rastreabilidade

    Retorno por cenário:
        Token OK     → status=VALID, account_id e account_name preenchidos
        Código 190   → status=EXPIRED, error_code="190"
        Outro 4xx    → status=INVALID, error_code=<código Meta>
        Não config.  → status=UNCONFIGURED (sem chamada à API)

    Não lança exceções — resultado é sempre um TokenHealthResult.
    """
    settings = get_settings()

    if not is_configured():
        return TokenHealthResult(
            status=TokenHealthStatus.UNCONFIGURED,
            error_message=(
                "META_ACCESS_TOKEN e/ou META_IG_USER_ID não configurados no .env. "
                "Defina essas variáveis para ativar a publicação real no Meta."
            ),
        )

    client = _make_client()
    t_start = time.monotonic()

    try:
        # ── Verificação básica: GET /me ────────────────────────────────────────
        me = client.get("/me", {"fields": "id,name"})
        _validate_response(me, ["id"], step="check_token_me")

        result = TokenHealthResult(
            status=TokenHealthStatus.VALID,
            account_id=str(me["id"]),
            account_name=me.get("name"),
        )

        # ── Verificação detalhada: GET /debug_token ───────────────────────────
        # Requer META_APP_ID + META_APP_SECRET configurados (best-effort)
        if settings.META_APP_ID and settings.META_APP_SECRET:
            try:
                debug_resp = client.get("/debug_token", {
                    "input_token": settings.META_ACCESS_TOKEN,
                    "access_token": f"{settings.META_APP_ID}|{settings.META_APP_SECRET}",
                })
                token_data: dict = debug_resp.get("data", {})
                result.app_id = str(token_data.get("app_id", "")) or None
                result.scopes = token_data.get("scopes", [])
                expires_at_ts = token_data.get("expires_at")
                if expires_at_ts and int(expires_at_ts) > 0:
                    result.expires_at = datetime.fromtimestamp(int(expires_at_ts), tz=timezone.utc)
            except Exception:
                pass  # debug_token é best-effort — não invalida o resultado principal

        duration_ms = int((time.monotonic() - t_start) * 1000)
        integration_log_service.write_log(
            db,
            integration=_INTEGRATION,
            event_type="token_health_check",
            status=IntegrationStatus.SUCCESS,
            response={
                "account_id": result.account_id,
                "account_name": result.account_name,
                "token_status": result.status.value,
                "scopes": result.scopes,
                "expires_at": result.expires_at.isoformat() if result.expires_at else None,
            },
            duration_ms=duration_ms,
        )
        return result

    except IntegrationError as exc:
        duration_ms = int((time.monotonic() - t_start) * 1000)
        code = str(getattr(exc, "error_code", "") or "unknown")

        integration_log_service.write_log(
            db,
            integration=_INTEGRATION,
            event_type="token_health_check",
            status=IntegrationStatus.ERROR,
            error_message=str(exc),
            error_code=code,
            duration_ms=duration_ms,
        )
        return TokenHealthResult(
            status=TokenHealthStatus.EXPIRED if _is_token_error(exc) else TokenHealthStatus.INVALID,
            error_code=code,
            error_message=str(exc),
        )


def publish_instagram(
    db: Session,
    *,
    post_id: int,
    brand_id: int,
    caption: str,
    media_url: str,
    hashtags: Optional[str] = None,
    cta: Optional[str]      = None,
    formato: str            = "imagem_unica",
) -> MetaPublishResult:
    """
    Publica no Instagram via Content Publishing API (fluxo obrigatório de 2 etapas).

    Etapa 1 — Criar container de mídia:
        POST /{ig-user-id}/media {caption, image_url|video_url, media_type}
        → {"id": "<container_id>"}

    Etapa 2 — Publicar o container:
        POST /{ig-user-id}/media_publish {creation_id: <container_id>}
        → {"id": "<media_id>"}

    Pós-publicação — Buscar permalink (best-effort):
        GET /{media_id}?fields=permalink,timestamp
        → permalink público do post

    Para vídeos/reels: aguarda container atingir status FINISHED antes da Etapa 2.

    Args:
        media_url : URL pública da imagem (JPEG/PNG) ou vídeo (MP4) acessível pela Meta.
                    Instagram NÃO aceita posts text-only — media_url é obrigatória.
        formato   : "imagem_unica" | "carrossel" | "reels" | "video" | "stories"

    Returns:
        MetaPublishResult — nunca levanta exceções.
        token_expired=True → o token expirou, ação manual necessária.
    """
    settings = get_settings()
    client = _make_client()
    t_start = time.monotonic()

    if not client:
        return MetaPublishResult(
            success=False, post_id=post_id, brand_id=brand_id, platform="instagram",
            error_code="unconfigured",
            error_message="META_ACCESS_TOKEN não configurado no .env.",
        )

    if not media_url or not media_url.strip():
        return MetaPublishResult(
            success=False, post_id=post_id, brand_id=brand_id, platform="instagram",
            error_code="missing_media_url",
            error_message=(
                "Instagram exige uma URL de mídia pública (image_url ou video_url). "
                "Posts text-only não são suportados pela Content Publishing API. "
                "Faça upload da imagem/vídeo para um storage público antes de publicar."
            ),
        )

    caption_full = _build_caption(caption, hashtags, cta)
    is_video = formato in ("reels", "video")
    retry_cfg = RetryConfig(max_attempts=3, backoff_seconds=[5, 15, 30])

    def _do_publish() -> tuple[str, Optional[str], dict]:
        """
        Executa as 2 etapas + permalink. Retorna (media_id, permalink, raw_response).
        Levanta IntegrationError ou RetryableIntegrationError — tratados por with_retry.
        """
        # ── Etapa 1: criar container de mídia ─────────────────────────────────
        params: dict[str, Any] = {"caption": caption_full}
        if is_video:
            params["media_type"] = "REELS" if formato == "reels" else "VIDEO"
            params["video_url"] = media_url
        else:
            params["media_type"] = "IMAGE"
            params["image_url"] = media_url

        step1 = client.post(f"/{settings.META_IG_USER_ID}/media", params)
        _validate_response(step1, ["id"], step="instagram_criar_container")
        container_id = str(step1["id"])

        # Vídeos: aguarda processamento assíncrono antes de prosseguir
        if is_video:
            _wait_for_video_container(client, container_id)

        # ── Etapa 2: publicar o container ──────────────────────────────────────
        step2 = client.post(
            f"/{settings.META_IG_USER_ID}/media_publish",
            {"creation_id": container_id},
        )
        _validate_response(step2, ["id"], step="instagram_media_publish")
        media_id = str(step2["id"])

        # ── Pós-publicação: buscar permalink (best-effort) ─────────────────────
        permalink: Optional[str] = None
        try:
            details = client.get(f"/{media_id}", {"fields": "permalink,timestamp"})
            permalink = details.get("permalink")
        except Exception:
            pass  # permalink falhou — não é crítico

        raw = {
            "step1_container": step1,
            "step2_publish":   step2,
            "permalink":       permalink,
            "api_version":     settings.META_API_VERSION,
        }
        return media_id, permalink, raw

    try:
        (media_id, permalink, raw), attempts = with_retry(
            func=_do_publish,
            config=retry_cfg,
            on_retry=lambda attempt, exc: integration_log_service.write_log(
                db,
                integration=_INTEGRATION,
                event_type="publish_instagram",
                status=IntegrationStatus.RETRY,
                brand_id=brand_id,
                post_id=post_id,
                error_message=str(exc),
                error_code=getattr(exc, "error_code", None),
                attempt_number=attempt,
            ),
        )
        duration_ms = int((time.monotonic() - t_start) * 1000)

        integration_log_service.write_log(
            db,
            integration=_INTEGRATION,
            event_type="publish_instagram",
            status=IntegrationStatus.SUCCESS,
            brand_id=brand_id,
            post_id=post_id,
            response={"media_id": media_id, "permalink": permalink},
            external_id=media_id,
            attempt_number=attempts,
            duration_ms=duration_ms,
        )
        return MetaPublishResult(
            success=True,
            post_id=post_id,
            brand_id=brand_id,
            platform="instagram",
            external_post_id=media_id,
            post_url=permalink,
            published_at=datetime.now(timezone.utc),
            raw_response=raw,
            attempts=attempts,
            duration_ms=duration_ms,
        )

    except IntegrationError as exc:
        duration_ms = int((time.monotonic() - t_start) * 1000)
        code = str(getattr(exc, "error_code", "") or "unknown")
        attempts_done = getattr(exc, "attempt", 1)

        integration_log_service.write_log(
            db,
            integration=_INTEGRATION,
            event_type="publish_instagram",
            status=IntegrationStatus.ERROR,
            brand_id=brand_id,
            post_id=post_id,
            error_message=str(exc),
            error_code=code,
            attempt_number=attempts_done,
            duration_ms=duration_ms,
        )
        return MetaPublishResult(
            success=False,
            post_id=post_id,
            brand_id=brand_id,
            platform="instagram",
            error_code=code,
            error_message=str(exc),
            token_expired=_is_token_error(exc),
            attempts=attempts_done,
            duration_ms=duration_ms,
        )


def publish_facebook(
    db: Session,
    *,
    post_id: int,
    brand_id: int,
    caption: str,
    hashtags:  Optional[str] = None,
    cta:       Optional[str] = None,
    media_url: Optional[str] = None,
) -> MetaPublishResult:
    """
    Publica no Facebook via Pages API (1 etapa).

    POST /{page-id}/feed {message, link?}
    → {"id": "<page_id>_<post_id>"}

    Args:
        caption   : texto do post
        media_url : URL de link/imagem (opcional — Facebook suporta posts text-only)

    Returns:
        MetaPublishResult — nunca levanta exceções.
        token_expired=True → token Meta expirou.
    """
    settings = get_settings()
    client = _make_client()
    t_start = time.monotonic()

    if not client:
        return MetaPublishResult(
            success=False, post_id=post_id, brand_id=brand_id, platform="facebook",
            error_code="unconfigured",
            error_message="META_ACCESS_TOKEN não configurado no .env.",
        )

    if not settings.META_FACEBOOK_PAGE_ID:
        return MetaPublishResult(
            success=False, post_id=post_id, brand_id=brand_id, platform="facebook",
            error_code="missing_page_id",
            error_message=(
                "META_FACEBOOK_PAGE_ID não configurado no .env. "
                "Defina o ID numérico da Facebook Page para publicar no Facebook."
            ),
        )

    message = _build_caption(caption, hashtags, cta)
    retry_cfg = RetryConfig(max_attempts=3, backoff_seconds=[5, 15, 30])

    def _do_publish() -> tuple[str, str, dict]:
        """Executa a publicação. Retorna (raw_id, post_url, raw_response)."""
        params: dict[str, Any] = {"message": message}
        if media_url:
            params["link"] = media_url

        resp = client.post(f"/{settings.META_FACEBOOK_PAGE_ID}/feed", params)
        _validate_response(resp, ["id"], step="facebook_feed_post")

        raw_id = str(resp["id"])
        # ID retornado tem formato "<page_id>_<content_id>"
        post_url = f"https://www.facebook.com/{raw_id.replace('_', '/posts/', 1)}"
        raw = {"post_id": raw_id, "post_url": post_url, "api_version": settings.META_API_VERSION}
        return raw_id, post_url, raw

    try:
        (raw_id, post_url, raw), attempts = with_retry(
            func=_do_publish,
            config=retry_cfg,
            on_retry=lambda attempt, exc: integration_log_service.write_log(
                db,
                integration=_INTEGRATION,
                event_type="publish_facebook",
                status=IntegrationStatus.RETRY,
                brand_id=brand_id,
                post_id=post_id,
                error_message=str(exc),
                error_code=getattr(exc, "error_code", None),
                attempt_number=attempt,
            ),
        )
        duration_ms = int((time.monotonic() - t_start) * 1000)

        integration_log_service.write_log(
            db,
            integration=_INTEGRATION,
            event_type="publish_facebook",
            status=IntegrationStatus.SUCCESS,
            brand_id=brand_id,
            post_id=post_id,
            response=raw,
            external_id=raw_id,
            attempt_number=attempts,
            duration_ms=duration_ms,
        )
        return MetaPublishResult(
            success=True,
            post_id=post_id,
            brand_id=brand_id,
            platform="facebook",
            external_post_id=raw_id,
            post_url=post_url,
            published_at=datetime.now(timezone.utc),
            raw_response=raw,
            attempts=attempts,
            duration_ms=duration_ms,
        )

    except IntegrationError as exc:
        duration_ms = int((time.monotonic() - t_start) * 1000)
        code = str(getattr(exc, "error_code", "") or "unknown")

        integration_log_service.write_log(
            db,
            integration=_INTEGRATION,
            event_type="publish_facebook",
            status=IntegrationStatus.ERROR,
            brand_id=brand_id,
            post_id=post_id,
            error_message=str(exc),
            error_code=code,
            attempt_number=getattr(exc, "attempt", 1),
            duration_ms=duration_ms,
        )
        return MetaPublishResult(
            success=False,
            post_id=post_id,
            brand_id=brand_id,
            platform="facebook",
            error_code=code,
            error_message=str(exc),
            token_expired=_is_token_error(exc),
            duration_ms=duration_ms,
        )


def publish_post(db: Session, post: Any) -> MetaPublishResult:
    """
    Facade unificada: seleciona instagram ou facebook com base em post.platform.

    Aceita qualquer objeto ORM Post com os atributos:
        post.id, post.brand_id, post.platform (enum ou str)
        post.caption, post.hashtags, post.cta, post.formato (enum ou str)
        post.media_assets (list[MediaAsset] — opcional, usa post.media_assets[0].url)

    Uso no scheduler (transparente — sem alterar scheduler.py):
        Este método é chamado por publishing_service.publish_post() quando:
            - post.platform in (instagram, facebook)
            - meta_service.is_configured() retorna True

    Uso direto (em testes ou scripts):
        from app.services import meta_service
        from app.core.database import SessionLocal

        db = SessionLocal()
        post = db.query(Post).get(42)
        outcome = meta_service.publish_post(db, post)
        if outcome.token_expired:
            print("Token expirado — acesse Meta Developer para renovar.")
        db.close()
    """
    platform = post.platform.value if hasattr(post.platform, "value") else str(post.platform)

    # Extrair URL de mídia do primeiro MediaAsset (se houver)
    media_url: Optional[str] = None
    media_assets = getattr(post, "media_assets", None) or []
    if media_assets:
        first = media_assets[0]
        media_url = getattr(first, "url", None)

    formato_val = post.formato.value if hasattr(post.formato, "value") else str(getattr(post, "formato", "imagem_unica"))

    if platform == "instagram":
        return publish_instagram(
            db,
            post_id=post.id,
            brand_id=post.brand_id,
            caption=post.caption,
            media_url=media_url or "",
            hashtags=getattr(post, "hashtags", None),
            cta=getattr(post, "cta", None),
            formato=formato_val,
        )

    if platform == "facebook":
        return publish_facebook(
            db,
            post_id=post.id,
            brand_id=post.brand_id,
            caption=post.caption,
            hashtags=getattr(post, "hashtags", None),
            cta=getattr(post, "cta", None),
            media_url=media_url,
        )

    return MetaPublishResult(
        success=False,
        post_id=post.id,
        brand_id=post.brand_id,
        platform=platform,
        error_code="unsupported_platform",
        error_message=(
            f"meta_service não suporta a plataforma '{platform}'. "
            "Plataformas suportadas: instagram, facebook."
        ),
    )
