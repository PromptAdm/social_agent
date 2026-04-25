from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class AdminAuditLog(Base):
    __tablename__ = "admin_audit_logs"

    id:             Mapped[int]       = mapped_column(Integer, primary_key=True)
    actor_user_id:  Mapped[int | None]  = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    target_user_id: Mapped[int | None]  = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    action_type:    Mapped[str]       = mapped_column(String(80),  nullable=False, index=True)
    old_value:      Mapped[str | None]  = mapped_column(Text,        nullable=True)
    new_value:      Mapped[str | None]  = mapped_column(Text,        nullable=True)
    notes:          Mapped[str | None]  = mapped_column(String(500), nullable=True)
    created_at:     Mapped[datetime]  = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    actor:  Mapped["User | None"] = relationship("User", foreign_keys=[actor_user_id],  lazy="raise")  # type: ignore[name-defined]
    target: Mapped["User | None"] = relationship("User", foreign_keys=[target_user_id], lazy="raise")  # type: ignore[name-defined]
