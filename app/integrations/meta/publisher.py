"""
Publisher: MockMetaPublisher

Simula a Meta Graph API para Instagram e Facebook.
Implementa o fluxo real de publicação em duas etapas:
    1. Criar container de mídia  (POST /{user-id}/media)
    2. Publicar o container      (POST /{user-id}/media_publish)

Como substituir pelo publisher real:
    1. Criar MetaPublisher(SocialPublisher) neste mesmo pacote
    2. Instanciar com access_token e ig_user_id do .env
    3. Usar httpx para fazer as chamadas HTTP reais
    4. Registrar em app/integrations/registry.py no lugar do MockMetaPublisher

Credenciais necessárias para fase real (.env):
    META_ACCESS_TOKEN      — Page/User Access Token com instagram_content_publish
    META_IG_USER_ID        — ID numérico do Instagram Business Account
    META_FACEBOOK_PAGE_ID  — ID da Facebook Page (para posts no Facebook)
    META_API_VERSION       — Ex: "v19.0"
    META_WEBHOOK_VERIFY_TOKEN — Token secreto para verificação de webhooks inbound
"""

import uuid
from datetime import datetime, timezone
from typing import Any

from app.integrations.base import (
    IntegrationError,
    RetryableIntegrationError,
    SocialPublisher,
)
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
