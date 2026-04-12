"""
Router: Publishing — Módulo 5: Agendamento e Publicação
Endpoints para agendar e publicar posts.
"""

from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_active_user, get_db
from app.models.user import User
from app.schemas.post import PostOut
from app.services import publishing_service

router = APIRouter(prefix="/publishing", tags=["Publishing"])


@router.post("/posts/{post_id}/schedule", response_model=PostOut)
def schedule_post(
    post_id: int,
    scheduled_at: datetime,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Agenda um post aprovado para publicação futura."""
    return publishing_service.schedule_post(db, post_id, scheduled_at, user_id=current_user.id)


@router.post("/posts/{post_id}/publish", response_model=PostOut)
def publish_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Publica um post imediatamente (aprovado ou agendado)."""
    return publishing_service.publish_post(db, post_id, user_id=current_user.id)


@router.get("/scheduled", response_model=list[PostOut])
def list_scheduled(
    brand_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Lista todos os posts agendados de uma brand."""
    return publishing_service.list_scheduled(db, brand_id=brand_id, user_id=current_user.id)
