"""
Service: Publishing — Módulo 5: Agendamento e Publicação

Funções:
    schedule_post   — agendamento de post aprovado
    publish_post    — publicação imediata com integração de plataforma
    list_scheduled  — lista posts agendados

Integração na publicação:
    1. Chama o publisher da plataforma (Meta, LinkedIn, etc.)
    2. Grava external_post_id no post
    3. Persiste log de integração (sucesso, erro, retry)
    4. Dispara trigger n8n "post.published"
    5. Sempre conclui a publicação internamente — integração é melhor esforço.
       Falha de API externa gera log de erro mas não impede publicação no sistema.
"""

import time
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.integration_log import IntegrationStatus
from app.models.post import Post, PostStatus


def schedule_post(db: Session, post_id: int, scheduled_at: datetime, user_id: int) -> Post:
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post não encontrado.")
    if post.status != PostStatus.APPROVED:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Somente posts aprovados podem ser agendados.",
        )
    post.status = PostStatus.SCHEDULED
    post.scheduled_at = scheduled_at
    db.commit()
    db.refresh(post)
    return post


def publish_post(db: Session, post_id: int, user_id: int | None = None) -> Post:
    """
    Publica o post imediatamente.

    Fluxo completo:
        1. Validar status do post (aprovado ou agendado)
        2. Chamar publisher da plataforma via camada de integração
        3. Em sucesso: gravar external_post_id + logar
        4. Em erro de integração: logar, mas continuar publicação internamente
        5. Disparar trigger n8n "post.published" (melhor esforço)
        6. Atualizar status → PUBLISHED + published_at
    """
    from app.integrations import registry
    from app.integrations.base import IntegrationError, RetryConfig, with_retry
    from app.integrations.schemas import PublishPostData
    from app.services.integration_log_service import write_log

    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post não encontrado.")
    if post.status not in (PostStatus.APPROVED, PostStatus.SCHEDULED):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Post precisa estar aprovado ou agendado para ser publicado.",
        )

    # ── Integração com plataforma social ──────────────────────────────────────
    publisher = registry.get_publisher(post.platform)

    if publisher is not None:
        post_data = PublishPostData(
            post_id=post.id,
            brand_id=post.brand_id,
            platform=post.platform.value,
            caption=post.caption,
            hashtags=post.hashtags,
            cta=post.cta,
            formato=post.formato.value,
        )

        retry_config = RetryConfig(max_attempts=3, backoff_seconds=[2, 5, 15])
        t_start = time.monotonic()
        external_post_id: str | None = None
        post_url: str | None = None

        try:
            result, attempts = with_retry(
                func=lambda: publisher.publish(post_data),
                config=retry_config,
                on_retry=lambda attempt, exc: write_log(
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
            external_post_id = result.external_post_id
            post_url = result.post_url

            write_log(
                db,
                integration=publisher.INTEGRATION_NAME,
                event_type="publish_post",
                status=IntegrationStatus.SUCCESS,
                brand_id=post.brand_id,
                post_id=post.id,
                payload=post_data.model_dump(),
                response=result.raw_response,
                external_id=external_post_id,
                attempt_number=attempts,
                duration_ms=duration_ms,
            )

        except IntegrationError as exc:
            # Falha de integração: logar mas não impedir publicação interna
            duration_ms = int((time.monotonic() - t_start) * 1000)
            write_log(
                db,
                integration=publisher.INTEGRATION_NAME,
                event_type="publish_post",
                status=IntegrationStatus.ERROR,
                brand_id=post.brand_id,
                post_id=post.id,
                error_message=str(exc),
                error_code=getattr(exc, "error_code", None),
                attempt_number=getattr(exc, "attempt", 1),
                duration_ms=duration_ms,
            )
            # Continua — publicação interna não depende da API externa

        # ── Trigger n8n (melhor esforço) ───────────────────────────────────────
        try:
            n8n = registry.get_n8n_client()
            n8n_result = n8n.trigger("post.published", {
                "brand_id": post.brand_id,
                "post_id": post.id,
                "platform": post.platform.value,
                "external_post_id": external_post_id,
                "post_url": post_url,
                "caption_excerpt": post.caption[:80],
            })
            write_log(
                db,
                integration="n8n",
                event_type="post.published",
                status=IntegrationStatus.SUCCESS,
                brand_id=post.brand_id,
                post_id=post.id,
                external_id=n8n_result.execution_id,
            )
        except Exception as exc:
            write_log(
                db,
                integration="n8n",
                event_type="post.published",
                status=IntegrationStatus.ERROR,
                brand_id=post.brand_id,
                post_id=post.id,
                error_message=str(exc),
            )

        # Persistir external_post_id se obtido com sucesso
        if external_post_id:
            post.external_post_id = external_post_id

    # ── Publicar internamente (sempre) ─────────────────────────────────────────
    post.status = PostStatus.PUBLISHED
    post.published_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(post)
    return post


def list_scheduled(db: Session, brand_id: int, user_id: int) -> list[Post]:
    return (
        db.query(Post)
        .filter(Post.brand_id == brand_id, Post.status == PostStatus.SCHEDULED)
        .order_by(Post.scheduled_at)
        .all()
    )
