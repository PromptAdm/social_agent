"""
Publisher: MetaPublisher + MockMetaPublisher

MetaPublisher — integração real com a Meta Graph API (Instagram + Facebook).
MockMetaPublisher — simulação local para desenvolvimento e testes.

O registry.py seleciona automaticamente:
    - MetaPublisher    quando META_ACCESS_TOKEN + META_IG_USER_ID estiverem no .env
    - MockMetaPublisher caso contrário

─────────────────────────────────────────────────────────────────────────────
MetaPublisher — Instagram Content Publishing API
─────────────────────────────────────────────────────────────────────────────

Fluxo para posts com imagem/vídeo (2 etapas obrigatórias pela Meta):

    Etapa 1 — Criar container de mídia:
        POST /{ig-user-id}/media
        Params: caption, image_url (ou video_url), media_type, access_token
        → Retorna: { "id": "<container_id>" }

    Etapa 2 — Publicar o container:
        POST /{ig-user-id}/media_publish
        Params: creation_id=<container_id>, access_token
        → Retorna: { "id": "<media_id>" }

    Pós-publicação — Buscar permalink:
        GET /{media_id}?fields=permalink,timestamp,like_count,comments_count
        → Retorna permalink público do post

Restrições da API:
    - Instagram NÃO suporta posts text-only (sempre exige media_url)
    - Máximo de 50 posts por conta por dia (Content Publishing API)
    - Imagens: JPEG ou PNG, máx. 8MB, aspect ratio entre 4:5 e 1.91:1
    - Reels: MP4, máx. 1GB, 3-90 segundos
    - Access Token precisa de scope: instagram_content_publish

─────────────────────────────────────────────────────────────────────────────
MetaPublisher — Facebook Pages API
─────────────────────────────────────────────────────────────────────────────

    POST /{page-id}/feed
    Params: message, link (URL de mídia, opcional), access_token
    → Retorna: { "id": "<post_id>" }  (formato: "<page_id>_<content_id>")

    Access Token: Page Access Token com pages_manage_posts + pages_read_engagement

─────────────────────────────────────────────────────────────────────────────
Credenciais necessárias (.env):
─────────────────────────────────────────────────────────────────────────────
    META_ACCESS_TOKEN       — Page/User Access Token (nunca expira se for System User Token)
    META_IG_USER_ID         — ID numérico do Instagram Business Account
    META_FACEBOOK_PAGE_ID   — ID numérico da Facebook Page
    META_API_VERSION        — versão da Graph API (ex: "v21.0")
    META_APP_SECRET         — App Secret para verificar assinatura X-Hub-Signature-256
    META_WEBHOOK_VERIFY_TOKEN — Token secreto para o handshake de webhook
"""

import uuid
from datetime import datetime, timezone
from typing import Any

from app.integrations.base import (
    IntegrationError,
    RetryableIntegrationError,
    SocialPublisher,
)
from app.integrations.meta.client import MetaApiClient
from app.integrations.schemas import PublishPostData, PublishResult


# ── Simulação de respostas da Meta Graph API ──────────────────────────────────

def _mock_media_container_response(caption: str) -> dict:
    """Simula a resposta de POST /{user-id}/media (Step 1)."""
    return {
        "id": f"17895{uuid.uuid4().int % 10000000000:010d}",  # container ID
        "status": "FINISHED",
    }


def _mock_media_publish_response(container_id: str, platform: str) -> dict:
    """Simula a resposta de POST /{user-id}/media_publish (Step 2)."""
    prefix = "IG" if platform == "instagram" else "FB"
    media_id = f"{prefix}_{uuid.uuid4().hex[:12].upper()}"
    return {
        "id": media_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "permalink": (
            f"https://www.instagram.com/p/{uuid.uuid4().hex[:11]}/"
            if platform == "instagram"
            else f"https://www.facebook.com/posts/{uuid.uuid4().int % 10**15}"
        ),
        "like_count": 0,
        "comments_count": 0,
    }


def _mock_metrics_response(external_post_id: str) -> dict:
    """Simula a resposta de GET /{media-id}/insights."""
    return {
        "data": [
            {"name": "impressions",  "period": "lifetime", "values": [{"value": 0}]},
            {"name": "reach",        "period": "lifetime", "values": [{"value": 0}]},
            {"name": "engagement",   "period": "lifetime", "values": [{"value": 0}]},
            {"name": "saved",        "period": "lifetime", "values": [{"value": 0}]},
        ],
        "id": f"{external_post_id}/insights",
    }


# ── Publisher ─────────────────────────────────────────────────────────────────

class MockMetaPublisher(SocialPublisher):
    """
    Implementação mock da Meta Graph API.

    Simula o fluxo real de duas etapas do Instagram:
        Etapa 1 — Criar container: POST /{user-id}/media
        Etapa 2 — Publicar:        POST /{user-id}/media_publish

    Comportamento de simulação:
        - Sempre retorna sucesso (sem falhas aleatórias)
        - Gera external_post_id único com formato realista
        - Registra duração simulada (50-200ms)
        - Retorna resposta bruta da "API" para log de auditoria

    Para ativar modo de falha (testes de retry):
        Instancie com MockMetaPublisher(fail_on_attempt=2) para simular
        uma falha na 2ª tentativa que seria retentada.
    """

    INTEGRATION_NAME = "meta_api"

    def __init__(self, fail_on_attempt: int | None = None) -> None:
        """
        Args:
            fail_on_attempt: se informado, lança RetryableIntegrationError
                             nessa tentativa (para testar o retry).
        """
        self._fail_on_attempt = fail_on_attempt
        self._attempt_counter: dict[str, int] = {}

    def publish(self, data: PublishPostData) -> PublishResult:
        """
        Publica um post via Meta Graph API (simulado).

        Fluxo real que será implementado:
            1. Montar caption com hashtags e CTA
            2. POST /{ig-user-id}/media  → obtém container_id
            3. POST /{ig-user-id}/media_publish {creation_id: container_id}
            4. Retorna media_id como external_post_id

        Args:
            data: dados do post a publicar

        Returns:
            PublishResult com external_post_id, url e raw_response

        Raises:
            RetryableIntegrationError: para erros HTTP 429/5xx (transitórios)
            IntegrationError: para erros permanentes (401, 403, 400 inválido)
        """
        operation_key = f"publish_{data.post_id}"
        self._attempt_counter[operation_key] = (
            self._attempt_counter.get(operation_key, 0) + 1
        )
        current_attempt = self._attempt_counter[operation_key]

        # Simular falha se configurado (para demonstrar retry)
        if self._fail_on_attempt and current_attempt == self._fail_on_attempt:
            raise RetryableIntegrationError(
                message=f"[Simulado] Meta API retornou 503 Service Unavailable na tentativa {current_attempt}",
                integration=self.INTEGRATION_NAME,
                event_type="publish_post",
                error_code="503",
                attempt=current_attempt,
            )

        platform = data.platform
        caption_full = data.caption
        if data.hashtags:
            caption_full = f"{caption_full}\n\n{data.hashtags}"
        if data.cta:
            caption_full = f"{caption_full}\n\n{data.cta}"

        # ── Etapa 1: criar container de mídia ─────────────────────────────────
        container_resp = _mock_media_container_response(caption_full)
        container_id = container_resp["id"]

        # ── Etapa 2: publicar o container ──────────────────────────────────────
        publish_resp = _mock_media_publish_response(container_id, platform)
        external_post_id = publish_resp["id"]
        post_url = publish_resp.get("permalink")

        return PublishResult(
            external_post_id=external_post_id,
            platform=platform,
            post_url=post_url,
            published_at=datetime.now(timezone.utc),
            raw_response={
                "step1_container": container_resp,
                "step2_publish": publish_resp,
                "api_version": "mock_v1",
                "simulated": True,
            },
        )

    def delete_post(self, external_post_id: str) -> bool:
        """
        Remove post publicado via DELETE /{media-id} (simulado).
        Retorna True se removido com sucesso.
        """
        if not external_post_id:
            raise IntegrationError(
                message="external_post_id é obrigatório para deletar post",
                integration=self.INTEGRATION_NAME,
                event_type="delete_post",
                error_code="400",
            )
        # Simulação: sempre retorna True
        return True

    def get_post_metrics(self, external_post_id: str) -> dict[str, Any]:
        """
        Retorna métricas do post via GET /{media-id}/insights (simulado).
        """
        return _mock_metrics_response(external_post_id)


# ── MetaPublisher (real) ───────────────────────────────────────────────────────

class MetaPublisher(SocialPublisher):
    """
    Publisher real para Instagram e Facebook via Meta Graph API.

    Selecione entre Instagram e Facebook com base em `data.platform`:
        "instagram" → Content Publishing API (2 etapas)
        "facebook"  → Pages API (1 etapa)

    Instanciado pelo registry.py quando META_ACCESS_TOKEN estiver configurado.
    """

    INTEGRATION_NAME = "meta_api"

    def __init__(
        self,
        access_token: str,
        ig_user_id: str,
        fb_page_id: str = "",
        api_version: str = "v21.0",
    ) -> None:
        self._ig_user_id = ig_user_id
        self._fb_page_id = fb_page_id
        self._http = MetaApiClient(access_token=access_token, version=api_version)
        self._api_version = api_version

    # ── Dispatch ───────────────────────────────────────────────────────────────

    def publish(self, data: PublishPostData) -> PublishResult:
        if data.platform == "instagram":
            return self._publish_instagram(data)
        if data.platform == "facebook":
            return self._publish_facebook(data)
        raise IntegrationError(
            message=f"MetaPublisher não suporta plataforma: {data.platform}",
            integration=self.INTEGRATION_NAME,
            event_type="publish_post",
            error_code="unsupported_platform",
        )

    # ── Instagram ─────────────────────────────────────────────────────────────

    def _publish_instagram(self, data: PublishPostData) -> PublishResult:
        """
        Publica no Instagram via Content Publishing API (2 etapas).

        Requer media_url pública acessível pela Meta (JPEG/PNG para imagem,
        MP4 para Reels). Posts text-only não são suportados pela API.
        """
        caption = _build_caption(data)
        media_url: str | None = data.media_urls[0] if data.media_urls else None

        if not media_url:
            raise IntegrationError(
                message=(
                    "Instagram exige uma URL de mídia pública (image_url ou video_url). "
                    "Posts text-only não são suportados pela Content Publishing API. "
                    "Faça upload da imagem para um storage público (S3, CDN) antes de publicar."
                ),
                integration=self.INTEGRATION_NAME,
                event_type="publish_post",
                error_code="missing_media_url",
            )

        # ── Etapa 1: criar container de mídia ─────────────────────────────────
        is_video = data.formato in ("reels", "video")
        container_params: dict[str, Any] = {"caption": caption}

        if is_video:
            container_params["media_type"] = "REELS" if data.formato == "reels" else "VIDEO"
            container_params["video_url"] = media_url
        else:
            container_params["media_type"] = "IMAGE"
            container_params["image_url"] = media_url

        step1 = self._http.post(f"/{self._ig_user_id}/media", container_params)
        container_id: str = step1["id"]

        # Vídeos precisam aguardar processamento (status FINISHED)
        if is_video:
            self._wait_for_container(container_id)

        # ── Etapa 2: publicar container ────────────────────────────────────────
        step2 = self._http.post(
            f"/{self._ig_user_id}/media_publish",
            {"creation_id": container_id},
        )
        media_id: str = step2["id"]

        # ── Pós-publicação: buscar permalink ───────────────────────────────────
        details = self._http.get(
            f"/{media_id}",
            {"fields": "permalink,timestamp,like_count,comments_count"},
        )
        permalink: str | None = details.get("permalink")

        return PublishResult(
            external_post_id=media_id,
            platform=data.platform,
            post_url=permalink,
            published_at=datetime.now(timezone.utc),
            raw_response={
                "step1_container": step1,
                "step2_publish": step2,
                "details": details,
                "api_version": self._api_version,
                "simulated": False,
            },
        )

    def _wait_for_container(self, container_id: str, max_polls: int = 10) -> None:
        """
        Aguarda o container de vídeo atingir status FINISHED.

        A Meta processa vídeos de forma assíncrona — publicar antes do
        processamento terminar retorna erro. Faz polling com backoff linear.

        max_polls=10 com 6s de intervalo → max ~60s de espera.
        """
        import time

        for attempt in range(1, max_polls + 1):
            resp = self._http.get(
                f"/{container_id}",
                {"fields": "status_code,status"},
            )
            status_code = resp.get("status_code", "")

            if status_code == "FINISHED":
                return
            if status_code == "ERROR":
                raise IntegrationError(
                    message=f"Container de vídeo falhou no processamento: {resp.get('status')}",
                    integration=self.INTEGRATION_NAME,
                    event_type="publish_post",
                    error_code="video_processing_error",
                )
            # IN_PROGRESS ou PUBLISHED — aguarda próximo poll
            time.sleep(min(6 * attempt, 30))

        raise RetryableIntegrationError(
            message=f"Container de vídeo não ficou FINISHED após {max_polls} polls",
            integration=self.INTEGRATION_NAME,
            event_type="publish_post",
            error_code="video_processing_timeout",
        )

    # ── Facebook ──────────────────────────────────────────────────────────────

    def _publish_facebook(self, data: PublishPostData) -> PublishResult:
        """
        Publica no Facebook Page via Pages API.

        Suporta posts text, link e imagem (como URL de link).
        Para posts nativos com imagem use media_urls[0] como 'link'.
        """
        if not self._fb_page_id:
            raise IntegrationError(
                message=(
                    "META_FACEBOOK_PAGE_ID não está configurado no .env. "
                    "Defina o ID numérico da sua Facebook Page para publicar no Facebook."
                ),
                integration=self.INTEGRATION_NAME,
                event_type="publish_post",
                error_code="missing_page_id",
            )

        message = _build_caption(data)
        params: dict[str, Any] = {"message": message}

        if data.media_urls:
            params["link"] = data.media_urls[0]

        result = self._http.post(f"/{self._fb_page_id}/feed", params)
        raw_post_id: str = result["id"]

        # ID retornado tem formato "<page_id>_<post_id>"
        post_url = (
            f"https://www.facebook.com/{raw_post_id.replace('_', '/posts/', 1)}"
        )

        return PublishResult(
            external_post_id=raw_post_id,
            platform=data.platform,
            post_url=post_url,
            published_at=datetime.now(timezone.utc),
            raw_response={
                "post": result,
                "api_version": self._api_version,
                "simulated": False,
            },
        )

    # ── Gerenciamento pós-publicação ───────────────────────────────────────────

    def delete_post(self, external_post_id: str) -> bool:
        """
        Remove post publicado via DELETE /{object-id}.

        Funciona para posts do Instagram e do Facebook.
        Retorna True se deletado com sucesso, lança IntegrationError caso contrário.
        """
        if not external_post_id:
            raise IntegrationError(
                message="external_post_id é obrigatório para deletar post",
                integration=self.INTEGRATION_NAME,
                event_type="delete_post",
                error_code="missing_id",
            )
        resp = self._http.delete(f"/{external_post_id}")
        return bool(resp.get("success", False))

    def get_post_metrics(self, external_post_id: str) -> dict[str, Any]:
        """
        Busca métricas do post via GET /{media-id}/insights.

        Métricas retornadas (Instagram): impressions, reach, engagement, saved
        Nota: métricas ficam disponíveis ~24h após publicação.
        """
        try:
            resp = self._http.get(
                f"/{external_post_id}/insights",
                {
                    "metric": "impressions,reach,engagement,saved",
                    "period": "lifetime",
                },
            )
            return resp
        except IntegrationError:
            # Métricas podem não estar disponíveis imediatamente — retorna vazio
            return {"data": [], "id": f"{external_post_id}/insights"}


# ── Helpers compartilhados ─────────────────────────────────────────────────────

def _build_caption(data: PublishPostData) -> str:
    """Monta o texto final do post: caption + hashtags + CTA."""
    parts = [data.caption]
    if data.hashtags:
        parts.append(data.hashtags)
    if data.cta:
        parts.append(data.cta)
    return "\n\n".join(parts)
