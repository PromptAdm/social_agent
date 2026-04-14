"""
Router: Integrations + Webhooks
Prefixo: /api/v1

Endpoints de gerenciamento de integrações:
    GET  /integrations/status/{brand_id}          — saúde de todas as integrações
    GET  /integrations/logs/{brand_id}             — histórico de logs auditáveis
    POST /integrations/test/publish/{post_id}      — teste de publicação (usa publisher ativo)
    GET  /integrations/n8n/events                  — documentação dos eventos n8n disponíveis

Endpoints de webhook inbound (Meta → Social Agent):
    GET  /webhooks/meta                            — verificação de webhook (Meta handshake)
    POST /webhooks/meta                            — recebe eventos da Meta (comentários, likes, DMs)
    POST /webhooks/n8n                             — recebe callbacks de workflows n8n

Segurança de webhooks inbound:
    - Meta GET:  verificação via hub.verify_token
    - Meta POST: verificação de assinatura HMAC-SHA256 via X-Hub-Signature-256
                 (ativa quando META_APP_SECRET estiver configurado)
    - Todos os payloads inbound são logados para auditoria
"""

import hashlib
import hmac
import time
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, status
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.dependencies import get_current_active_user, get_db
from app.integrations import registry
from app.integrations.base import IntegrationError, RetryConfig, with_retry
from app.integrations.n8n.client import N8N_EVENT_DOCS
from app.integrations.schemas import (
    IntegrationHealthOut,
    IntegrationLogOut,
    IntegrationStatusOut,
    MetaWebhookPayload,
    N8nCallbackPayload,
    PublishPostData,
)
from app.models.integration_log import IntegrationStatus
from app.models.post import PostStatus
from app.models.user import User
from app.schemas.post import PostOut
from app.services import integration_log_service, post_service

router = APIRouter(tags=["Integrations"])


# ── Helpers ────────────────────────────────────────────────────────────────────

def _get_verify_token() -> str:
    """Retorna o token de verificação de webhook Meta configurado no .env."""
    settings = get_settings()
    return getattr(settings, "META_WEBHOOK_VERIFY_TOKEN", "social_agent_verify_token")


# ── Gerenciamento de integrações ───────────────────────────────────────────────

@router.get(
    "/integrations/status/{brand_id}",
    response_model=IntegrationHealthOut,
    summary="Saúde das integrações",
    description=(
        "Retorna o status de saúde de todas as integrações configuradas para a brand:\n\n"
        "- **social_publishers**: publishers registrados (Meta, LinkedIn, etc.)\n"
        "- **n8n**: status do client de automação\n"
        "- **overall_healthy**: `true` se todas sem erros recentes\n\n"
        "Inclui estatísticas de tentativas e últimos erros a partir dos logs persistidos."
    ),
)
def get_integration_status(
    brand_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> IntegrationHealthOut:
    stats = integration_log_service.get_integration_stats(db, brand_id)
    registered_platforms = registry.list_registered_platforms()

    publisher_statuses = []
    for platform in registered_platforms:
        platform_stats = stats.get("meta_api", {})
        provider_label = registry.get_provider_label("meta_api")
        publisher_statuses.append(IntegrationStatusOut(
            name=platform,
            provider=provider_label,
            is_active=True,
            last_attempt_at=platform_stats.get("last_attempt_at"),
            last_status=platform_stats.get("last_status"),
            total_attempts=platform_stats.get("total_attempts", 0),
            total_errors=platform_stats.get("total_errors", 0),
        ))

    n8n_stats = stats.get("n8n", {})
    n8n_status = IntegrationStatusOut(
        name="n8n",
        provider="mock_n8n",
        is_active=True,
        last_attempt_at=n8n_stats.get("last_attempt_at"),
        last_status=n8n_stats.get("last_status"),
        total_attempts=n8n_stats.get("total_attempts", 0),
        total_errors=n8n_stats.get("total_errors", 0),
    )

    overall = all(s.total_errors == 0 for s in publisher_statuses) and n8n_status.total_errors == 0

    return IntegrationHealthOut(
        social_publishers=publisher_statuses,
        n8n=n8n_status,
        overall_healthy=overall,
        checked_at=datetime.now(timezone.utc),
    )


@router.get(
    "/integrations/logs/{brand_id}",
    response_model=list[IntegrationLogOut],
    summary="Histórico de logs de integração",
    description=(
        "Retorna o histórico auditável de todas as tentativas de integração da brand.\n\n"
        "Filtre por `integration` (meta_api, n8n, webhook_inbound) e/ou `status` "
        "(sucesso, erro, retry, pendente).\n\n"
        "Útil para diagnosticar falhas de publicação ou triggers n8n que não dispararam."
    ),
)
def list_integration_logs(
    brand_id: int,
    integration: str | None = Query(default=None, description="Filtrar por integração: meta_api | n8n | webhook_inbound"),
    log_status: IntegrationStatus | None = Query(default=None, alias="status"),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> list[IntegrationLogOut]:
    logs = integration_log_service.list_logs(
        db, brand_id, integration=integration, status=log_status, limit=limit
    )
    return [IntegrationLogOut.model_validate(log) for log in logs]


@router.get(
    "/integrations/n8n/events",
    response_model=dict,
    summary="Documentação dos eventos n8n",
    description=(
        "Retorna a documentação de todos os eventos disponíveis para automação via n8n.\n\n"
        "Cada evento lista: descrição, campos do payload e automações sugeridas.\n\n"
        "Use esses eventos ao configurar os nós Webhook no n8n."
    ),
)
def get_n8n_events() -> dict:
    return {
        "events": N8N_EVENT_DOCS,
        "note": (
            "Configure as URLs dos webhooks no .env: "
            "N8N_WEBHOOK_POST_PUBLISHED, N8N_WEBHOOK_LEAD_CREATED, etc."
        ),
    }


# ── Teste de publicação ────────────────────────────────────────────────────────

@router.post(
    "/integrations/test/publish/{post_id}",
    response_model=PostOut,
    summary="Testar publicação de post (simulado)",
    description=(
        "Executa o fluxo completo de publicação de forma simulada:\n\n"
        "1. Valida que o post está em status `aprovado` ou `agendado`\n"
        "2. Chama o publisher da plataforma (Meta mock)\n"
        "3. Grava `external_post_id` no post\n"
        "4. Registra log de integração com duração simulada\n"
        "5. Dispara trigger n8n `post.published`\n\n"
        "**Não altera status do post** — use `POST /posts/{id}/publish` para o fluxo real."
    ),
)
def test_publish(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> PostOut:
    post = post_service.get_post(db, post_id, user_id=current_user.id)

    if post.status not in (PostStatus.APPROVED, PostStatus.SCHEDULED, PostStatus.DRAFT):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Post no status '{post.status.value}' não pode ser testado. Use aprovado, agendado ou rascunho.",
        )

    publisher = registry.get_publisher(post.platform)
    if not publisher:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Plataforma '{post.platform.value}' não tem publisher registrado ainda.",
        )

    post_data = PublishPostData(
        post_id=post.id,
        brand_id=post.brand_id,
        platform=post.platform.value,
        caption=post.caption,
        hashtags=post.hashtags,
        cta=post.cta,
        formato=post.formato.value,
    )

    retry_config = RetryConfig(max_attempts=3, backoff_seconds=[1, 3, 5])
    t_start = time.monotonic()

    try:
        result, attempts = with_retry(
            func=lambda: publisher.publish(post_data),
            config=retry_config,
            on_retry=lambda attempt, exc: integration_log_service.write_log(
                db,
                integration=publisher.INTEGRATION_NAME,
                event_type="publish_post",
                status=IntegrationStatus.RETRY,
                brand_id=post.brand_id,
                post_id=post.id,
                error_message=str(exc),
                error_code=getattr(exc, "error_code", None),
                attempt_number=attempt,
            ),
        )

        duration_ms = int((time.monotonic() - t_start) * 1000)

        integration_log_service.write_log(
            db,
            integration=publisher.INTEGRATION_NAME,
            event_type="test_publish",
            status=IntegrationStatus.SUCCESS,
            brand_id=post.brand_id,
            post_id=post.id,
            payload=post_data.model_dump(),
            response=result.raw_response,
            external_id=result.external_post_id,
            attempt_number=attempts,
            duration_ms=duration_ms,
        )

        # Disparar n8n
        n8n = registry.get_n8n_client()
        try:
            n8n.trigger("post.published", {
                "brand_id": post.brand_id,
                "post_id": post.id,
                "platform": post.platform.value,
                "external_post_id": result.external_post_id,
                "post_url": result.post_url,
                "caption_excerpt": post.caption[:80],
                "simulated": True,
            })
        except Exception:
            pass  # n8n é melhor esforço — não bloqueia o teste

    except IntegrationError as exc:
        duration_ms = int((time.monotonic() - t_start) * 1000)
        integration_log_service.write_log(
            db,
            integration=publisher.INTEGRATION_NAME,
            event_type="test_publish",
            status=IntegrationStatus.ERROR,
            brand_id=post.brand_id,
            post_id=post.id,
            error_message=str(exc),
            error_code=getattr(exc, "error_code", None),
            attempt_number=getattr(exc, "attempt", 1),
            duration_ms=duration_ms,
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Falha na integração após {getattr(exc, 'attempt', 1)} tentativas: {exc}",
        )

    return PostOut.model_validate(post)


# ── Webhooks Inbound ───────────────────────────────────────────────────────────

@router.get(
    "/webhooks/meta",
    summary="Verificação de webhook Meta (handshake)",
    description=(
        "Endpoint de verificação exigido pelo Meta ao cadastrar um webhook.\n\n"
        "O Meta envia uma requisição GET com:\n"
        "- `hub.mode=subscribe`\n"
        "- `hub.verify_token=<seu token secreto>`\n"
        "- `hub.challenge=<valor aleatório>`\n\n"
        "Se o token conferir, devolvemos o `hub.challenge` como plain text.\n\n"
        "Configure `META_WEBHOOK_VERIFY_TOKEN` no `.env` e use o mesmo valor no painel de developers.facebook.com."
    ),
    response_description="Retorna o hub.challenge como plain text se o token for válido",
)
def meta_webhook_verify(
    hub_mode: str = Query(alias="hub.mode", default=""),
    hub_verify_token: str = Query(alias="hub.verify_token", default=""),
    hub_challenge: str = Query(alias="hub.challenge", default=""),
):
    expected_token = _get_verify_token()

    if hub_mode == "subscribe" and hub_verify_token == expected_token:
        # Retornar o challenge como plain text (exigência do Meta)
        return PlainTextResponse(content=hub_challenge)

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Token de verificação inválido ou modo incorreto.",
    )


@router.post(
    "/webhooks/meta",
    status_code=status.HTTP_200_OK,
    response_model=dict,
    summary="Receber eventos webhook do Meta",
    description=(
        "Recebe notificações de eventos do Meta (Instagram e Facebook).\n\n"
        "Eventos suportados pelo Meta:\n"
        "- Novo comentário em post publicado\n"
        "- Reação em post\n"
        "- Nova mensagem direta (DM)\n"
        "- Menção em story\n\n"
        "O payload é logado como `webhook_inbound` para auditoria.\n"
        "Em produção: verificar assinatura X-Hub-Signature-256 antes de processar."
    ),
)
async def meta_webhook_receive(
    request: Request,
    db: Session = Depends(get_db),
    x_hub_signature_256: str | None = Header(default=None, alias="X-Hub-Signature-256"),
):
    """
    Recebe e registra eventos inbound do Meta.

    Verificação HMAC-SHA256:
        Ativa quando META_APP_SECRET estiver configurado no .env.
        Valida a assinatura X-Hub-Signature-256 enviada pelo Meta.
        Rejeita requisições sem assinatura válida com HTTP 403.

    O Meta exige resposta 200 imediata — processamento assíncrono em produção.
    """
    raw_body = await request.body()

    # ── Verificação de assinatura HMAC ─────────────────────────────────────────
    _settings = get_settings()
    app_secret = getattr(_settings, "META_APP_SECRET", "")
    if app_secret:
        if not x_hub_signature_256:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Header X-Hub-Signature-256 ausente.",
            )
        expected_sig = (
            "sha256="
            + hmac.new(
                app_secret.encode(),
                raw_body,
                hashlib.sha256,
            ).hexdigest()
        )
        if not hmac.compare_digest(x_hub_signature_256, expected_sig):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Assinatura X-Hub-Signature-256 inválida.",
            )

    try:
        body = request._json = __import__("json").loads(raw_body)
    except Exception:
        body = {}

    integration_log_service.write_log(
        db,
        integration="webhook_inbound",
        event_type="meta_event",
        status=IntegrationStatus.SUCCESS,
        payload=body,
        response={"acknowledged": True},
    )

    # O Meta exige resposta 200 imediata — processamento assíncrono em produção
    return {"status": "received"}


@router.post(
    "/webhooks/n8n",
    status_code=status.HTTP_200_OK,
    response_model=dict,
    summary="Receber callback de workflow n8n",
    description=(
        "Recebe callbacks de workflows n8n após execução.\n\n"
        "Use este endpoint como 'Respond to Webhook' no nó final do workflow n8n "
        "para que o Social Agent saiba quando uma automação foi concluída.\n\n"
        "O payload é validado e logado para auditoria."
    ),
)
def n8n_callback(
    payload: N8nCallbackPayload,
    db: Session = Depends(get_db),
):
    log_status = (
        IntegrationStatus.SUCCESS
        if payload.status == "success"
        else IntegrationStatus.ERROR
    )

    integration_log_service.write_log(
        db,
        integration="n8n",
        event_type="workflow_callback",
        status=log_status,
        payload=payload.model_dump(mode="json"),
        external_id=payload.execution_id,
        error_message=None if payload.status == "success" else payload.data.get("error"),
    )

    return {
        "status": "acknowledged",
        "execution_id": payload.execution_id,
        "received_at": datetime.now(timezone.utc).isoformat(),
    }
