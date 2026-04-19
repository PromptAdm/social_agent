"""
Model ORM: UserSubscription

Uma linha por usuário. Criada automaticamente (lazy) na primeira consulta
ao /billing/summary ou na primeira verificação de limite.

Usuários existentes recebem plan_code="legacy" (acesso irrestrito).
"""

from __future__ import annotations

import enum
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class SubscriptionStatus(str, enum.Enum):
    FREE      = "free"       # no subscription, trial not started or not available
    ACTIVE    = "active"     # paid, within billing period
    TRIALING  = "trialing"   # inside active trial window
    PAST_DUE  = "past_due"   # payment failed — grace period, still full access
    CANCELLED = "cancelled"  # subscription cancelled (may still be within period)
    EXPIRED   = "expired"    # trial ended with no paid subscription


class UserSubscription(Base):
    __tablename__ = "user_subscriptions"
    __table_args__ = (
        UniqueConstraint("user_id", name="uq_user_subscriptions_user_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    # ── Relação com usuário ────────────────────────────────────────────────────
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # ── Plano e status ─────────────────────────────────────────────────────────
    plan_code: Mapped[str] = mapped_column(
        String(30), nullable=False, default="free"
    )
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=SubscriptionStatus.FREE.value
    )

    # ── Ciclo de cobrança ──────────────────────────────────────────────────────
    billing_cycle: Mapped[str] = mapped_column(
        String(10), nullable=False, default="monthly"  # monthly | yearly
    )

    # ── Trial ──────────────────────────────────────────────────────────────────
    trial_started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    has_used_trial: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )

    # ── Datas de ciclo ─────────────────────────────────────────────────────────
    trial_ends_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    current_period_start: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    current_period_end: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    cancel_at_period_end: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )

    # ── Stripe ─────────────────────────────────────────────────────────────────
    stripe_customer_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    stripe_subscription_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    stripe_price_id: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # ── Timestamps ─────────────────────────────────────────────────────────────
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # ── Relacionamento ORM ─────────────────────────────────────────────────────
    user: Mapped["User"] = relationship(  # type: ignore[name-defined]
        "User", back_populates="subscription", lazy="raise"
    )

    # ── Computed properties ────────────────────────────────────────────────────

    @property
    def plan_name(self) -> str:
        from app.billing.plans import get_plan
        return get_plan(self.plan_code)["display_name"]

    @property
    def is_trial_active(self) -> bool:
        """True only when status is TRIALING *and* the window has not expired."""
        if self.status != SubscriptionStatus.TRIALING.value:
            return False
        if self.trial_ends_at is None:
            return False
        return datetime.now(timezone.utc) < self.trial_ends_at

    def __repr__(self) -> str:
        return (
            f"<UserSubscription user_id={self.user_id} "
            f"plan={self.plan_code} status={self.status}>"
        )
