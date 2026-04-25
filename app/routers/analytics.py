"""
Router: Analytics — Módulo 8: Analytics e Relatórios
Endpoints para criação e consulta de snapshots de métricas.
"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import feature_gate, get_current_active_user, get_db
from app.models.user import User
from app.schemas.analytics_snapshot import AnalyticsSnapshotCreate, AnalyticsSnapshotOut
from app.services import analytics_service

router = APIRouter(
    prefix="/analytics",
    tags=["Analytics"],
    dependencies=[Depends(feature_gate("analytics"))],
)


@router.post("/snapshots", response_model=AnalyticsSnapshotOut, status_code=status.HTTP_201_CREATED)
def create_snapshot(
    payload: AnalyticsSnapshotCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Registra um snapshot manual de métricas."""
    return analytics_service.create_snapshot(db, payload, user_id=current_user.id)


@router.get("/brand/{brand_id}", response_model=list[AnalyticsSnapshotOut])
def list_snapshots(
    brand_id: int,
    platform: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Lista snapshots de uma brand, opcionalmente filtrado por plataforma."""
    return analytics_service.list_snapshots(db, brand_id=brand_id, platform=platform, user_id=current_user.id)


@router.get("/brand/{brand_id}/summary", response_model=dict)
def get_summary(
    brand_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Retorna um resumo consolidado das métricas mais recentes da brand."""
    return analytics_service.get_summary(db, brand_id=brand_id, user_id=current_user.id)
