"""
Router: Approval — Módulo 4: Aprovação de Conteúdo
Endpoints para aprovar/rejeitar sugestões de resposta.

Nota: aprovação/rejeição de posts está em POST /posts/{id}/approve|reject
(router posts.py), que valida ownership antes de agir.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import feature_gate, get_current_active_user, get_db
from app.models.user import User
from app.schemas.reply_suggestion import ReplySuggestionOut
from app.services import approval_service

router = APIRouter(
    prefix="/approval",
    tags=["Approval"],
    dependencies=[Depends(feature_gate("approval"))],
)


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
