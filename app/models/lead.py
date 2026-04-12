"""
Model: Lead
Lead captado via interações nas redes sociais (comentários, DMs, menções).
Associado a uma brand para segmentação e acompanhamento.
"""

import enum
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class LeadStatus(str, enum.Enum):
    NEW = "novo"
    CONTACTED = "contatado"
    QUALIFIED = "qualificado"
    CONVERTED = "convertido"
    LOST = "perdido"


class LeadSource(str, enum.Enum):
    COMMENT = "comentario"
    DM = "mensagem_direta"
    MENTION = "mencao"
    STORY_REPLY = "resposta_story"
    MANUAL = "manual"


class Lead(Base):
    __tablename__ = "leads"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    brand_id: Mapped[int] = mapped_column(ForeignKey("brands.id"), nullable=False, index=True)

    username: Mapped[str | None] = mapped_column(String(255), nullable=True)
    full_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    platform: Mapped[str | None] = mapped_column(String(50), nullable=True)
    external_user_id: Mapped[str | None] = mapped_column(String(255), nullable=True)

    source: Mapped[LeadSource] = mapped_column(Enum(LeadSource), default=LeadSource.MANUAL)
    status: Mapped[LeadStatus] = mapped_column(Enum(LeadStatus), default=LeadStatus.NEW, index=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relacionamentos
    brand: Mapped["Brand"] = relationship(back_populates="leads")  # type: ignore[name-defined]
