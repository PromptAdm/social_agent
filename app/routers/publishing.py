"""
Router: Publishing — Módulo 5: Agendamento e Publicação

Nota: agendar (POST /{id}/schedule) e publicar (POST /{id}/publish) estão em
posts.py para manter ownership check e rota canônica num único lugar.
Este router expõe apenas consultas de publicação.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_active_user, get_db
from app.models.user import User
from app.schemas.post import PostOut
from app.services import publishing_service

router = APIRouter(prefix="/publishing", tags=["Publishing"])


@router.get("/scheduled", response_model=list[PostOut])
def list_scheduled(
    brand_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Lista todos os posts agendados de uma brand."""
    return publishing_service.list_scheduled(db, brand_id=brand_id, user_id=current_user.id)
