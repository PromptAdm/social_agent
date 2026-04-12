"""
Service: Publishing — Módulo 5: Agendamento e Publicação
Lógica de agendamento e disparo de posts.
A integração real com APIs das redes sociais será implementada nas próximas fases.
"""

from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

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


def publish_post(db: Session, post_id: int, user_id: int) -> Post:
    """
    Publica o post imediatamente.
    TODO: integrar com a API da plataforma social e gravar external_post_id.
    """
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post não encontrado.")
    if post.status not in (PostStatus.APPROVED, PostStatus.SCHEDULED):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Post precisa estar aprovado ou agendado para ser publicado.",
        )
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
