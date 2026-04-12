"""
Service: Approval — Módulo 4: Aprovação de Conteúdo
Transições de status para posts e sugestões de resposta.
"""

from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.post import Post, PostStatus
from app.models.reply_suggestion import ReplySuggestion, SuggestionStatus


def approve_post(db: Session, post_id: int, approver_id: int) -> Post:
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post não encontrado.")
    if post.status != PostStatus.DRAFT:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Somente posts em rascunho podem ser aprovados.",
        )
    post.status = PostStatus.APPROVED
    post.approved_by_id = approver_id
    post.approved_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(post)
    return post


def reject_post(db: Session, post_id: int, user_id: int) -> Post:
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post não encontrado.")
    post.status = PostStatus.DRAFT
    post.approved_by_id = None
    post.approved_at = None
    db.commit()
    db.refresh(post)
    return post


def approve_reply(db: Session, suggestion_id: int, approver_id: int) -> ReplySuggestion:
    suggestion = db.query(ReplySuggestion).filter(ReplySuggestion.id == suggestion_id).first()
    if not suggestion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sugestão não encontrada.")
    suggestion.status = SuggestionStatus.APPROVED
    suggestion.approved_by_id = approver_id
    db.commit()
    db.refresh(suggestion)
    return suggestion


def reject_reply(db: Session, suggestion_id: int, user_id: int) -> ReplySuggestion:
    suggestion = db.query(ReplySuggestion).filter(ReplySuggestion.id == suggestion_id).first()
    if not suggestion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sugestão não encontrada.")
    suggestion.status = SuggestionStatus.REJECTED
    db.commit()
    db.refresh(suggestion)
    return suggestion
