"""
Router: Approval — Módulo 4: Aprovação de Conteúdo
Endpoints para aprovar/rejeitar posts e sugestões de resposta.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_active_user, get_db
from app.models.user import User
from app.schemas.post import PostOut
from app.schemas.reply_suggestion import ReplySuggestionOut
from app.services import approval_service

router = APIRouter(prefix="/approval", tags=["Approval"])


@router.post("/posts/{post_id}/approve", response_model=PostOut)
def approve_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Aprova um post em rascunho."""
    return approval_service.approve_post(db, post_id, approver_id=current_user.id)


@router.post("/posts/{post_id}/reject", response_model=PostOut)
def reject_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Rejeita um post, devolvendo-o ao rascunho."""
    return approval_service.reject_post(db, post_id, user_id=current_user.id)


@router.post("/replies/{suggestion_id}/approve", response_model=ReplySuggestionOut)
def approve_reply(
    suggestion_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Aprova uma sugestão de resposta."""
    return approval_service.approve_reply(db, suggestion_id, approver_id=current_user.id)


@router.post("/replies/{suggestion_id}/reject", response_model=ReplySuggestionOut)
def reject_reply(
    suggestion_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Rejeita uma sugestão de resposta."""
    return approval_service.reject_reply(db, suggestion_id, user_id=current_user.id)
