"""
Router: ContentPillars — Módulo 1: Estratégia da Marca (pilares editoriais)
"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_active_user, get_db
from app.models.user import User
from app.schemas.content_pillar import ContentPillarCreate, ContentPillarOut, ContentPillarUpdate
from app.services import content_pillar_service

router = APIRouter(prefix="/content-pillars", tags=["Content Pillars"])


@router.post("/", response_model=ContentPillarOut, status_code=status.HTTP_201_CREATED)
def create_pillar(
    payload: ContentPillarCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return content_pillar_service.create_pillar(db, payload, user_id=current_user.id)


@router.get("/brand/{brand_id}", response_model=list[ContentPillarOut])
def list_pillars(
    brand_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return content_pillar_service.list_pillars(db, brand_id=brand_id, user_id=current_user.id)


@router.patch("/{pillar_id}", response_model=ContentPillarOut)
def update_pillar(
    pillar_id: int,
    payload: ContentPillarUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return content_pillar_service.update_pillar(db, pillar_id, payload, user_id=current_user.id)


@router.delete("/{pillar_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_pillar(
    pillar_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    content_pillar_service.delete_pillar(db, pillar_id, user_id=current_user.id)
