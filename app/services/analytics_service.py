"""
Service: Analytics — Módulo 8: Analytics e Relatórios

Funções:
    create_snapshot  — registra snapshot manual de métricas
    list_snapshots   — lista snapshots com filtro por plataforma
    get_summary      — resumo consolidado: posts por status, leads por status, último snapshot
"""

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.analytics_snapshot import AnalyticsSnapshot
from app.models.brand import Brand
from app.models.lead import Lead, LeadStatus
from app.models.post import Post, PostStatus
from app.schemas.analytics_snapshot import AnalyticsSnapshotCreate, AnalyticsSnapshotOut


# ── Helpers ────────────────────────────────────────────────────────────────────

def _assert_brand_ownership(db: Session, brand_id: int, user_id: int) -> Brand:
    brand = db.query(Brand).filter(Brand.id == brand_id, Brand.owner_id == user_id).first()
    if not brand:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Brand não encontrada.")
    return brand


# ── Snapshots ──────────────────────────────────────────────────────────────────

def create_snapshot(db: Session, payload: AnalyticsSnapshotCreate, user_id: int) -> AnalyticsSnapshot:
    _assert_brand_ownership(db, payload.brand_id, user_id)
    snapshot = AnalyticsSnapshot(**payload.model_dump())
    db.add(snapshot)
    db.commit()
    db.refresh(snapshot)
    return snapshot


def list_snapshots(
    db: Session,
    brand_id: int,
    platform: str | None,
    user_id: int,
) -> list[AnalyticsSnapshot]:
    _assert_brand_ownership(db, brand_id, user_id)
    query = db.query(AnalyticsSnapshot).filter(AnalyticsSnapshot.brand_id == brand_id)
    if platform:
        query = query.filter(AnalyticsSnapshot.platform == platform)
    return query.order_by(AnalyticsSnapshot.snapshot_date.desc()).all()


# ── Resumo consolidado ─────────────────────────────────────────────────────────

def get_summary(db: Session, brand_id: int, user_id: int) -> dict:
    """
    Retorna um painel consolidado da brand:
      - Contagem de posts por status
      - Contagem de leads por status
      - Último snapshot de métricas por plataforma
    """
    brand = _assert_brand_ownership(db, brand_id, user_id)

    # ── Posts por status ───────────────────────────────────────────────────────
    post_counts_raw = (
        db.query(Post.status, func.count(Post.id).label("total"))
        .filter(Post.brand_id == brand_id)
        .group_by(Post.status)
        .all()
    )
    posts_by_status = {row.status.value: row.total for row in post_counts_raw}
    total_posts = sum(posts_by_status.values())

    # ── Leads por status ───────────────────────────────────────────────────────
    lead_counts_raw = (
        db.query(Lead.status, func.count(Lead.id).label("total"))
        .filter(Lead.brand_id == brand_id)
        .group_by(Lead.status)
        .all()
    )
    leads_by_status = {row.status.value: row.total for row in lead_counts_raw}
    total_leads = sum(leads_by_status.values())

    # ── Último snapshot por plataforma ─────────────────────────────────────────
    # Subconsulta: max(snapshot_date) por plataforma
    latest_dates_subq = (
        db.query(
            AnalyticsSnapshot.platform,
            func.max(AnalyticsSnapshot.snapshot_date).label("max_date"),
        )
        .filter(AnalyticsSnapshot.brand_id == brand_id)
        .group_by(AnalyticsSnapshot.platform)
        .subquery()
    )
    latest_snapshots = (
        db.query(AnalyticsSnapshot)
        .join(
            latest_dates_subq,
            (AnalyticsSnapshot.platform == latest_dates_subq.c.platform)
            & (AnalyticsSnapshot.snapshot_date == latest_dates_subq.c.max_date),
        )
        .filter(AnalyticsSnapshot.brand_id == brand_id)
        .all()
    )

    return {
        "brand_id": brand_id,
        "brand_name": brand.name,
        "posts": {
            "total": total_posts,
            "by_status": posts_by_status,
        },
        "leads": {
            "total": total_leads,
            "by_status": leads_by_status,
        },
        "latest_snapshots": [
            AnalyticsSnapshotOut.model_validate(s) for s in latest_snapshots
        ],
    }
