"""
Model: ContentPillar
Pilares de conteúdo de uma brand (ex: Educação, Bastidores, Vendas, Inspiração).
Organizam a estratégia editorial e guiam a geração de ideias.
"""

from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class ContentPillar(Base):
    __tablename__ = "content_pillars"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    brand_id: Mapped[int] = mapped_column(ForeignKey("brands.id"), nullable=False, index=True)

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    color_hex: Mapped[str] = mapped_column(String(7), nullable=True)   # ex: "#FF5733"

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Relacionamentos
    brand: Mapped["Brand"] = relationship(back_populates="content_pillars")  # type: ignore[name-defined]
    ideas: Mapped[list["Idea"]] = relationship(back_populates="pillar", lazy="select")  # type: ignore[name-defined]
    posts: Mapped[list["Post"]] = relationship(back_populates="pillar", lazy="select")  # type: ignore[name-defined]
