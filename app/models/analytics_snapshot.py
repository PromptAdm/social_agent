"""
Model: AnalyticsSnapshot
Snapshot periódico de métricas de uma brand em uma plataforma.
Captura dados como seguidores, alcance, engajamento e impressões.
"""

from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class AnalyticsSnapshot(Base):
    __tablename__ = "analytics_snapshots"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    brand_id: Mapped[int] = mapped_column(ForeignKey("brands.id"), nullable=False, index=True)

    platform: Mapped[str] = mapped_column(String(50), nullable=False)
    snapshot_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)

    # Métricas de audiência
    followers_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    following_count: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Métricas de conteúdo (período do snapshot)
    posts_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    impressions: Mapped[int | None] = mapped_column(Integer, nullable=True)
    reach: Mapped[int | None] = mapped_column(Integer, nullable=True)
    profile_views: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Métricas de engajamento
    likes_total: Mapped[int | None] = mapped_column(Integer, nullable=True)
    comments_total: Mapped[int | None] = mapped_column(Integer, nullable=True)
    shares_total: Mapped[int | None] = mapped_column(Integer, nullable=True)
    saves_total: Mapped[int | None] = mapped_column(Integer, nullable=True)
    engagement_rate: Mapped[float | None] = mapped_column(Float, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Relacionamentos
    brand: Mapped["Brand"] = relationship(back_populates="analytics_snapshots")  # type: ignore[name-defined]
