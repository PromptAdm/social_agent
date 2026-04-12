"""
Model: Idea
Ideia de conteúdo associada a uma brand e opcionalmente a um pilar.
Estado inicial antes de virar um Post.

Campos adicionados nesta fase:
    - prioridade       : urgência da ideia na backlog editorial
    - formato_sugerido : formato de post recomendado para esta ideia
"""

import enum
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


# ── Enums ──────────────────────────────────────────────────────────────────────

class IdeaStatus(str, enum.Enum):
    IDEA = "ideia"
    DRAFT = "rascunho"
    ARCHIVED = "arquivado"


class IdeaPrioridade(str, enum.Enum):
    """Urgência editorial da ideia na backlog."""
    BAIXA = "baixa"
    MEDIA = "media"
    ALTA = "alta"


class IdeaFormatoSugerido(str, enum.Enum):
    """Formato de publicação sugerido ao transformar esta ideia em Post."""
    CARROSSEL = "carrossel"
    REELS = "reels"
    IMAGEM_UNICA = "imagem_unica"
    STORIES = "stories"
    TEXTO = "texto"
    VIDEO = "video"
    LIVE = "live"
    INDEFINIDO = "indefinido"


# ── Model ──────────────────────────────────────────────────────────────────────

class Idea(Base):
    __tablename__ = "ideas"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    brand_id: Mapped[int] = mapped_column(ForeignKey("brands.id"), nullable=False, index=True)
    pillar_id: Mapped[int | None] = mapped_column(ForeignKey("content_pillars.id"), nullable=True)

    # ── Conteúdo ───────────────────────────────────────────────────────────────
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    source: Mapped[str | None] = mapped_column(
        String(100), nullable=True
    )  # ex: "manual", "ai_generated", "trend"

    # ── Classificação ──────────────────────────────────────────────────────────
    status: Mapped[IdeaStatus] = mapped_column(
        Enum(IdeaStatus, name="ideastatus"),
        default=IdeaStatus.IDEA,
        nullable=False,
        index=True,
    )
    prioridade: Mapped[IdeaPrioridade] = mapped_column(
        Enum(IdeaPrioridade, name="ideaprioridade"),
        default=IdeaPrioridade.MEDIA,
        nullable=False,
    )
    formato_sugerido: Mapped[IdeaFormatoSugerido] = mapped_column(
        Enum(IdeaFormatoSugerido, name="ideaformatosugerido"),
        default=IdeaFormatoSugerido.INDEFINIDO,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # ── Relacionamentos ────────────────────────────────────────────────────────
    brand: Mapped["Brand"] = relationship(back_populates="ideas")  # type: ignore[name-defined]
    pillar: Mapped["ContentPillar"] = relationship(back_populates="ideas")  # type: ignore[name-defined]
    posts: Mapped[list["Post"]] = relationship(back_populates="idea", lazy="select")  # type: ignore[name-defined]
