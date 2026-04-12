"""
Service: Post — Módulo 3: Posts de Conteúdo

Funções:
    create_post     — cria post manual
    list_posts      — lista com filtros (status, platform, formato, data)
    get_post        — busca por id com ownership check
    update_post     — atualiza campos (rascunho)
    delete_post     — remove da base
"""

from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.brand import Brand
from app.models.post import Post, PostFormato, PostPrioridade, PostStatus, SocialPlatform
from app.schemas.post import PostCreate, PostUpdate


# ── Helpers ────────────────────────────────────────────────────────────────────

def _assert_brand_ownership(db: Session, brand_id: int, user_id: int) -> None:
    brand = db.query(Brand).filter(Brand.id == brand_id, Brand.owner_id == user_id).first()
    if not brand:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Brand não encontrada.")


# ── CRUD ───────────────────────────────────────────────────────────────────────

def create_post(db: Session, payload: PostCreate, user_id: int) -> Post:
    _assert_brand_ownership(db, payload.brand_id, user_id)
    post = Post(**payload.model_dump())
    db.add(post)
    db.commit()
    db.refresh(post)
    return post


def list_posts(
    db: Session,
    brand_id: int,
    user_id: int,
    *,
    post_status: PostStatus | None = None,
    platform: SocialPlatform | None = None,
    formato: PostFormato | None = None,
    prioridade: PostPrioridade | None = None,
    scheduled_from: datetime | None = None,
    scheduled_to: datetime | None = None,
) -> list[Post]:
    _assert_brand_ownership(db, brand_id, user_id)
    query = db.query(Post).filter(Post.brand_id == brand_id)
    if post_status is not None:
        query = query.filter(Post.status == post_status)
    if platform is not None:
        query = query.filter(Post.platform == platform)
    if formato is not None:
        query = query.filter(Post.formato == formato)
    if prioridade is not None:
        query = query.filter(Post.prioridade == prioridade)
    if scheduled_from is not None:
        query = query.filter(Post.scheduled_at >= scheduled_from)
    if scheduled_to is not None:
        query = query.filter(Post.scheduled_at <= scheduled_to)
    return query.order_by(Post.created_at.desc()).all()


def get_post(db: Session, post_id: int, user_id: int) -> Post:
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post não encontrado.")
    _assert_brand_ownership(db, post.brand_id, user_id)
    return post


def update_post(db: Session, post_id: int, payload: PostUpdate, user_id: int) -> Post:
    post = get_post(db, post_id, user_id)
    if post.status not in (PostStatus.DRAFT,):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Somente posts em rascunho podem ser editados. Use aprovação/agendamento para avançar o status.",
        )
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(post, field, value)
    db.commit()
    db.refresh(post)
    return post


def delete_post(db: Session, post_id: int, user_id: int) -> None:
    post = get_post(db, post_id, user_id)
    if post.status == PostStatus.PUBLISHED:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Posts publicados não podem ser removidos. Use o status 'arquivado'.",
        )
    db.delete(post)
    db.commit()


def duplicate_post(db: Session, post_id: int, user_id: int) -> Post:
    """
    Cria uma cópia exata do post como novo rascunho.

    Campos copiados: caption, hashtags, cta, platform, formato, prioridade,
                     pillar_id, idea_id, brand_id.
    Campos resetados: status=DRAFT, scheduled_at=None, published_at=None,
                      approved_by_id=None, approved_at=None.
    """
    original = get_post(db, post_id, user_id)

    copy = Post(
        brand_id=original.brand_id,
        pillar_id=original.pillar_id,
        idea_id=original.idea_id,
        caption=original.caption,
        hashtags=original.hashtags,
        cta=original.cta,
        platform=original.platform,
        formato=original.formato,
        prioridade=original.prioridade,
        status=PostStatus.DRAFT,
        # scheduled_at, published_at, approved_* ficam None
    )
    db.add(copy)
    db.commit()
    db.refresh(copy)
    return copy
