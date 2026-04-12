"""
Model: Brand
Representa uma marca/empresa gerenciada pelo Social Agent.
Cada brand pertence a um User e possui seus próprios pilares, posts e leads.
"""

from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Brand(Base):
    __tablename__ = "brands"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    niche: Mapped[str] = mapped_column(String(255), nullable=True)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    tone_of_voice: Mapped[str] = mapped_column(Text, nullable=True)   # ex: "informal, direto, inspiracional"
    target_audience: Mapped[str] = mapped_column(Text, nullable=True)
    logo_url: Mapped[str] = mapped_column(String(500), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relacionamentos
    owner: Mapped["User"] = relationship(back_populates="brands")  # type: ignore[name-defined]
    content_pillars: Mapped[list["ContentPillar"]] = relationship(back_populates="brand", lazy="select")  # type: ignore[name-defined]
    ideas: Mapped[list["Idea"]] = relationship(back_populates="brand", lazy="select")  # type: ignore[name-defined]
    posts: Mapped[list["Post"]] = relationship(back_populates="brand", lazy="select")  # type: ignore[name-defined]
    leads: Mapped[list["Lead"]] = relationship(back_populates="brand", lazy="select")  # type: ignore[name-defined]
    analytics_snapshots: Mapped[list["AnalyticsSnapshot"]] = relationship(back_populates="brand", lazy="select")  # type: ignore[name-defined]
