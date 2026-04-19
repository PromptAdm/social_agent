"""
StripeWebhookEvent — idempotency table for Stripe webhook delivery.

One row per successfully-processed Stripe event ID (evt_xxx).
Before processing any event the handler inserts this row; a unique constraint
violation means the event was already handled and the request is a duplicate.

The insert and all subscription mutations share a single DB transaction:
  - On success  → both commit together.
  - On failure  → both roll back, so Stripe can safely retry.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import DateTime, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class StripeWebhookEvent(Base):
    __tablename__ = "stripe_webhook_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    # Stripe event ID (evt_xxxx) — unique constraint enforces idempotency.
    stripe_event_id: Mapped[str] = mapped_column(
        String(100), nullable=False, unique=True, index=True
    )

    event_type: Mapped[str] = mapped_column(String(100), nullable=False)

    processed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    def __repr__(self) -> str:
        return f"<StripeWebhookEvent id={self.stripe_event_id} type={self.event_type}>"
