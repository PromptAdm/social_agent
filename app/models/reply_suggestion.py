"""
Model: ReplySuggestion
Sugestão de resposta gerada (manualmente ou via IA) para um Comment.
Pode ser aprovada e publicada como resposta oficial.
"""

import enum
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class SuggestionStatus(str, enum.Enum):
    PENDING = "pendente"
    APPROVED = "aprovado"
    REJECTED = "rejeitado"
    PUBLISHED = "publicado"


class ReplySuggestion(Base):
    __tablename__ = "reply_suggestions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    comment_id: Mapped[int] = mapped_column(ForeignKey("comments.id"), nullable=False, index=True)

    body: Mapped[str] = mapped_column(Text, nullable=False)
    generated_by: Mapped[str | None] = mapped_column(Text, nullable=True)  # ex: "gpt-4o", "manual"
    status: Mapped[SuggestionStatus] = mapped_column(
        Enum(SuggestionStatus), default=SuggestionStatus.PENDING
    )
    is_ai_generated: Mapped[bool] = mapped_column(Boolean, default=False)

    approved_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Relacionamentos
    comment: Mapped["Comment"] = relationship(back_populates="reply_suggestions")  # type: ignore[name-defined]
