"""
Service: Publishing — Módulo 5: Agendamento e Publicação

Funções:
    schedule_post   — agendamento de post aprovado
    publish_post    — publicação imediata com integração de plataforma
    list_scheduled  — lista posts agendados

Roteamento de publicação:
    Instagram / Facebook → meta_service.publish_post()  (quando META_ACCESS_TOKEN configurado)
    Instagram / Facebook → registry MockMetaPublisher    (fallback quando sem credenciais)
    Outras plataformas   → registry (publisher registrado ou skip)

    O meta_service fornece:
        - Detecção explícita de token expirado (OAuthException 190)
        - Validação de resposta da API (evita KeyError silencioso em produção)
        - Retorno estruturado MetaPublishResult com flag token_expired

Garantias:
    Falha de integração externa NUNCA impede a publicação interna.
    O post é marcado PUBLISHED independente do resultado da API.
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
    import logging as _logging
    _pub_logger = _logging.getLogger("publishing_service")

    external_post_id: str | None = None
    post_url: str | None = None
    _is_meta_platform = post.platform.value in ("instagram", "facebook")

    if _is_meta_platform:
        # ── Caminho Meta: meta_service isolado (token expiry + response validation) ──
        from app.services import meta_service as _meta_svc

        if _meta_svc.is_configured():
            outcome = _meta_svc.publish_post(db, post)
            external_post_id = outcome.external_post_id
            post_url = outcome.post_url

            if outcome.token_expired:
                # Token expirado: logar CRITICAL para alertar o time de ops.
                # A publicação interna continua (post fica PUBLISHED no sistema).
                # O scheduler irá parar de funcionar até o token ser renovado.
                _pub_logger.critical(
                    "META TOKEN EXPIRADO — post_id=%d platform=%s error_code=%s. "
                    "Acesse developers.facebook.com e gere um novo access token. "
                    "Defina META_ACCESS_TOKEN no .env e reinicie a aplicação.",
                    post.id,
                    post.platform.value,
                    outcome.error_code,
                )
            elif not outcome.success:
                _pub_logger.error(
                    "Falha Meta API — post_id=%d error_code=%s: %s",
                    post.id,
                    outcome.error_code,
                    outcome.error_message,
                )
            # Logs de integração já gravados pelo meta_service — não duplicar

        else:
            # Fallback: registry (MockMetaPublisher quando sem credenciais)
            publisher = registry.get_publisher(post.platform)
            if publisher is not None:
                post_data = PublishPostData(
                    post_id=post.id, brand_id=post.brand_id,
                    platform=post.platform.value, caption=post.caption,
                    hashtags=post.hashtags, cta=post.cta, formato=post.formato.value,
                )
                t_start = time.monotonic()
                try:
                    result, attempts = with_retry(
                        func=lambda: publisher.publish(post_data),
                        config=RetryConfig(max_attempts=3, backoff_seconds=[2, 5, 15]),
                        on_retry=lambda attempt, exc: write_log(
                            db, integration=publisher.INTEGRATION_NAME,
                            event_type="publish_post", status=IntegrationStatus.RETRY,
                            brand_id=post.brand_id, post_id=post.id,
                            error_message=str(exc), error_code=getattr(exc, "error_code", None),
                            attempt_number=attempt,
                        ),
                    )
                    external_post_id = result.external_post_id
                    post_url = result.post_url
                    write_log(
                        db, integration=publisher.INTEGRATION_NAME,
                        event_type="publish_post", status=IntegrationStatus.SUCCESS,
                        brand_id=post.brand_id, post_id=post.id,
                        payload=post_data.model_dump(), response=result.raw_response,
                        external_id=external_post_id, attempt_number=attempts,
                        duration_ms=int((time.monotonic() - t_start) * 1000),
                    )
                except IntegrationError as exc:
                    write_log(
                        db, integration=publisher.INTEGRATION_NAME,
                        event_type="publish_post", status=IntegrationStatus.ERROR,
                        brand_id=post.brand_id, post_id=post.id,
                        error_message=str(exc), error_code=getattr(exc, "error_code", None),
                        attempt_number=getattr(exc, "attempt", 1),
                        duration_ms=int((time.monotonic() - t_start) * 1000),
                    )

    else:
        # ── Outras plataformas: caminho original via registry ─────────────────
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

    # ── Trigger n8n (melhor esforço — todas as plataformas) ───────────────────
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

    # ── Analytics (fire-and-forget, never raises) ──────────────────────────────
    try:
        from app.core import analytics
        analytics.track("post_published", distinct_id=str(user_id or "system"), properties={
            "post_id":  post.id,
            "brand_id": post.brand_id,
            "platform": post.platform.value,
            "formato":  post.formato.value,
            "via_scheduler": user_id is None,
            "has_external_id": bool(post.external_post_id),
        })
    except Exception:
        pass

    return post


def list_scheduled(db: Session, brand_id: int, user_id: int) -> list[Post]:
    return (
        db.query(Post)
        .filter(Post.brand_id == brand_id, Post.status == PostStatus.SCHEDULED)
        .order_by(Post.scheduled_at)
        .all()
    )
