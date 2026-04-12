"""
Model: Post
Conteúdo pronto para publicação em uma rede social.

Fluxo de status:
    rascunho → aprovado → agendado → publicado → arquivado

Campos adicionados nesta fase:
    - formato     : tipo de publicação (carrossel, reels, imagem única…)
    - cta         : call-to-action do post (texto livre)
    - prioridade  : urgência editorial (baixa → urgente)
"""

import enum
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


# ── Enums ──────────────────────────────────────────────────────────────────────

class PostStatus(str, enum.Enum):
    DRAFT = "rascunho"
    APPROVED = "aprovado"
    SCHEDULED = "agendado"
    PUBLISHED = "publicado"
    ARCHIVED = "arquivado"


class SocialPlatform(str, enum.Enum):
    INSTAGRAM = "instagram"
    LINKEDIN = "linkedin"
    TWITTER = "twitter"
    FACEBOOK = "facebook"
    TIKTOK = "tiktok"


class PostFormato(str, enum.Enum):
    """Formato visual/editorial do post na plataforma."""
    CARROSSEL = "carrossel"
    REELS = "reels"
    IMAGEM_UNICA = "imagem_unica"
    STORIES = "stories"
    TEXTO = "texto"
    VIDEO = "video"
    LIVE = "live"


class PostPrioridade(str, enum.Enum):
    """Prioridade editorial do post na fila de publicação."""
    BAIXA = "baixa"
    MEDIA = "media"
    ALTA = "alta"
    URGENTE = "urgente"


# ── Model ──────────────────────────────────────────────────────���───────────────

class Post(Base):
    __tablename__ = "posts"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    brand_id: Mapped[int] = mapped_column(ForeignKey("brands.id"), nullable=False, index=True)
    pillar_id: Mapped[int | None] = mapped_column(ForeignKey("content_pillars.id"), nullable=True)
    idea_id: Mapped[int | None] = mapped_column(ForeignKey("ideas.id"), nullable=True)

    # ── Conteúdo ───────────────────────────────────────────��───────────────────
    caption: Mapped[str] = mapped_column(Text, nullable=False)
    hashtags: Mapped[str | None] = mapped_column(Text, nullable=True)   # separados por espaço
    cta: Mapped[str | None] = mapped_column(Text, nullable=True)        # "Arrasta pra ver", "Link na bio"…

    # ── Classificação ────────────────────���────────────────────────────���────────
    platform: Mapped[SocialPlatform] = mapped_column(
        Enum(SocialPlatform, name="socialplatform"), nullable=False
    )
    formato: Mapped[PostFormato] = mapped_column(
        Enum(PostFormato, name="postformato"),
        default=PostFormato.IMAGEM_UNICA,
        nullable=False,
    )
    prioridade: Mapped[PostPrioridade] = mapped_column(
        Enum(PostPrioridade, name="postprioridade"),
        default=PostPrioridade.MEDIA,
        nullable=False,
    )
    status: Mapped[PostStatus] = mapped_column(
        Enum(PostStatus, name="poststatus"),
        default=PostStatus.DRAFT,
        nullable=False,
        index=True,
    )

    # ── Datas de ciclo de vida ────────────────────────��────────────────────────
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    external_post_id: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )  # ID retornado pela API da rede social

    # ── Aprovação ─────────────────────────────────────────────────��────────────
    approved_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # ── Relacionamentos ────────────────────────────────────────────────────────
    brand: Mapped["Brand"] = relationship(back_populates="posts")  # type: ignore[name-defined]
    pillar: Mapped["ContentPillar"] = relationship(back_populates="posts")  # type: ignore[name-defined]
    idea: Mapped["Idea"] = relationship(back_populates="posts")  # type: ignore[name-defined]
    media_assets: Mapped[list["MediaAsset"]] = relationship(  # type: ignore[name-defined]
        back_populates="post",
        lazy="select",
        cascade="all, delete-orphan",
        order_by="MediaAsset.order",
    )
    comments: Mapped[list["Comment"]] = relationship(  # type: ignore[name-defined]
        back_populates="post",
        lazy="select",
        cascade="all, delete-orphan",
    )
