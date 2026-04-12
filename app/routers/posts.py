"""
Router: Posts — Módulo 3: Posts de Conteúdo
Prefixo: /api/v1/posts

Fluxo de status:
    rascunho → [aprovar] → aprovado → [agendar] → agendado → [publicar] → publicado
                         ↘ [rejeitar] → rascunho

Endpoints CRUD:
    POST   /posts/                          — criar post manual
    GET    /posts/brand/{brand_id}          — listar com filtros
    GET    /posts/{post_id}                 — detalhar post
    PATCH  /posts/{post_id}                 — editar rascunho
    DELETE /posts/{post_id}                 — remover (não publicados)

Endpoints de ação (workflow):
    POST   /posts/{post_id}/approve         — aprovar (rascunho → aprovado)
    POST   /posts/{post_id}/reject          — rejeitar (qualquer → rascunho)
    POST   /posts/{post_id}/schedule        — agendar (aprovado → agendado)
    POST   /posts/{post_id}/publish         — publicar imediatamente (aprovado/agendado → publicado)

Filtros disponíveis em GET /posts/brand/{brand_id}:
    ?post_status=rascunho|aprovado|agendado|publicado|arquivado
    ?platform=instagram|linkedin|twitter|facebook|tiktok
    ?formato=carrossel|reels|imagem_unica|stories|texto|video|live
    ?prioridade=baixa|media|alta|urgente
    ?scheduled_from=<ISO 8601>
    ?scheduled_to=<ISO 8601>
"""

from datetime import datetime

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_active_user, get_db
from app.models.post import PostFormato, PostPrioridade, PostStatus, SocialPlatform
from app.models.user import User
from app.schemas.post import PostCreate, PostOut, PostScheduleRequest, PostUpdate
from app.services import approval_service, post_service, publishing_service

router = APIRouter(prefix="/posts", tags=["Posts"])


# ── CRUD ───────────────────────────────────────────────────────────────────────

@router.post(
    "/",
    response_model=PostOut,
    status_code=status.HTTP_201_CREATED,
    summary="Criar post",
)
def create_post(
    payload: PostCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return post_service.create_post(db, payload, user_id=current_user.id)


@router.get(
    "/brand/{brand_id}",
    response_model=list[PostOut],
    summary="Listar posts da brand",
    description=(
        "Retorna posts da brand com filtros opcionais por status, plataforma, "
        "formato, prioridade e intervalo de data de agendamento."
    ),
)
def list_posts(
    brand_id: int,
    post_status: PostStatus | None = None,
    platform: SocialPlatform | None = None,
    formato: PostFormato | None = None,
    prioridade: PostPrioridade | None = None,
    scheduled_from: datetime | None = None,
    scheduled_to: datetime | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return post_service.list_posts(
        db,
        brand_id=brand_id,
        user_id=current_user.id,
        post_status=post_status,
        platform=platform,
        formato=formato,
        prioridade=prioridade,
        scheduled_from=scheduled_from,
        scheduled_to=scheduled_to,
    )


@router.get("/{post_id}", response_model=PostOut, summary="Detalhar post")
def get_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return post_service.get_post(db, post_id, user_id=current_user.id)


@router.patch(
    "/{post_id}",
    response_model=PostOut,
    summary="Editar rascunho",
    description="Edita campos de um post em rascunho. Posts aprovados/agendados/publicados não podem ser editados.",
)
def update_post(
    post_id: int,
    payload: PostUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return post_service.update_post(db, post_id, payload, user_id=current_user.id)


@router.delete(
    "/{post_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remover post",
    description="Remove um post. Posts publicados não podem ser removidos.",
)
def delete_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    post_service.delete_post(db, post_id, user_id=current_user.id)


# ── Workflow de aprovação ──────────────────────────────────────────────────────

@router.post(
    "/{post_id}/approve",
    response_model=PostOut,
    summary="Aprovar post",
    description="Avança o post de `rascunho` para `aprovado`. Registra quem aprovou e quando.",
)
def approve_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    # Valida ownership antes de aprovar
    post_service.get_post(db, post_id, user_id=current_user.id)
    return approval_service.approve_post(db, post_id, approver_id=current_user.id)


@router.post(
    "/{post_id}/reject",
    response_model=PostOut,
    summary="Rejeitar post",
    description="Devolve o post ao status `rascunho`, limpando dados de aprovação.",
)
def reject_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    post_service.get_post(db, post_id, user_id=current_user.id)
    return approval_service.reject_post(db, post_id, user_id=current_user.id)


# ── Workflow de agendamento e publicação ───────────────────────────────────────

@router.post(
    "/{post_id}/schedule",
    response_model=PostOut,
    summary="Agendar post",
    description="Agenda um post `aprovado` para publicação futura. Requer `scheduled_at` no body.",
)
def schedule_post(
    post_id: int,
    payload: PostScheduleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    post_service.get_post(db, post_id, user_id=current_user.id)
    return publishing_service.schedule_post(
        db, post_id, scheduled_at=payload.scheduled_at, user_id=current_user.id
    )


@router.post(
    "/{post_id}/publish",
    response_model=PostOut,
    summary="Publicar post",
    description=(
        "Publica o post imediatamente. "
        "Aceita posts `aprovados` ou `agendados`. "
        "Grava `published_at` com o horário atual."
    ),
)
def publish_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    post_service.get_post(db, post_id, user_id=current_user.id)
    return publishing_service.publish_post(db, post_id, user_id=current_user.id)


@router.post(
    "/{post_id}/duplicate",
    response_model=PostOut,
    status_code=status.HTTP_201_CREATED,
    summary="Duplicar post",
    description=(
        "Cria uma cópia do post como novo rascunho, preservando caption, "
        "hashtags, CTA, plataforma, formato e prioridade. "
        "Funciona para posts em qualquer status."
    ),
)
def duplicate_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return post_service.duplicate_post(db, post_id, user_id=current_user.id)
