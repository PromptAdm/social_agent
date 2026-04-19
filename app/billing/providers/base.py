"""
PaymentProvider protocol and shared value objects.

Any payment backend (Stripe, Pix, etc.) must satisfy this interface.
The protocol is structural (runtime_checkable) so providers can be plain
classes — no inheritance required.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING, Protocol, runtime_checkable

from sqlalchemy.orm import Session

if TYPE_CHECKING:
    from app.models.subscription import UserSubscription


# ── Value object passed to create_checkout ────────────────────────────────────

@dataclass(frozen=True)
class CheckoutParams:
    user_id:    int
    email:      str
    plan_code:  str
    billing_cycle: str  # "monthly" | "yearly"


# ── Provider contract ─────────────────────────────────────────────────────────

@runtime_checkable
class PaymentProvider(Protocol):
    """
    Interface every payment provider must satisfy.

    Rules:
    - create_checkout: returns a redirect URL for the user to complete payment
    - handle_webhook:  validates the incoming request and mutates DB via the
                       subscription_service; must be atomic (no partial commits)
    - sync_subscription: fetches live state from the provider and overwrites
                         the local UserSubscription row (caller commits)
    - create_portal_session: returns a URL for the customer self-service portal;
                             may raise NotImplementedError for providers that have
                             no portal concept
    """

    def create_checkout(self, params: CheckoutParams, db: Session) -> str:
        """Return a checkout redirect URL."""
        ...

    def handle_webhook(
        self,
        payload: bytes,
        signature: str,
        db: Session,
    ) -> dict:
        """Validate, deduplicate, and process an inbound webhook."""
        ...

    def sync_subscription(
        self,
        provider_subscription_id: str,
        db: Session,
        *,
        customer_id: str | None = None,
        user_id: int | None = None,
    ) -> "UserSubscription | None":
        """Fetch live subscription state and write to DB. Caller commits."""
        ...

    def create_portal_session(self, customer_id: str) -> str:
        """Return a customer self-service portal URL."""
        ...
