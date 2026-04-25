from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class FeatureOverride(Base):
    """Per-user feature override — super admin can grant/revoke features independently of plan."""

    __tablename__ = "feature_overrides"
    __table_args__ = (
        UniqueConstraint("user_id", "feature", name="uq_feature_override_user_feature"),
    )

    id:          Mapped[int]            = mapped_column(Integer, primary_key=True)
    user_id:     Mapped[int]            = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    feature:     Mapped[str]            = mapped_column(String(80),  nullable=False)
    enabled:     Mapped[bool]           = mapped_column(Boolean,     nullable=False, default=True)
    reason:      Mapped[str | None]     = mapped_column(String(255), nullable=True)
    granted_by:  Mapped[int | None]     = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    expires_at:  Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at:  Mapped[datetime]       = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    user:       Mapped["User"] = relationship("User", foreign_keys=[user_id],    lazy="raise")  # type: ignore[name-defined]
    granted_by_user: Mapped["User | None"] = relationship("User", foreign_keys=[granted_by], lazy="raise")  # type: ignore[name-defined]

    @property
    def is_active(self) -> bool:
        if not self.enabled:
            return False
        if self.expires_at is None:
            return True
        return datetime.now(timezone.utc) < self.expires_at
