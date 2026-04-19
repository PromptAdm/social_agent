"""
StripeProvider — thin adapter over app.services.stripe_service.

All real logic lives in stripe_service.py.  This class exists solely to
satisfy the PaymentProvider protocol so the router and facade never need to
import stripe_service directly.
"""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.billing.providers.base import CheckoutParams


class StripeProvider:
    """Delegates every operation to stripe_service."""

    def create_checkout(self, params: CheckoutParams, db: Session) -> str:
        from app.services.stripe_service import create_checkout_session
        return create_checkout_session(
            user_id=params.user_id,
            email=params.email,
            plan_code=params.plan_code,
            billing_cycle=params.billing_cycle,
            db=db,
        )

    def handle_webhook(
        self,
        payload: bytes,
        signature: str,
        db: Session,
    ) -> dict:
        from app.services.stripe_service import handle_webhook
        return handle_webhook(payload, signature, db)

    def sync_subscription(
        self,
        provider_subscription_id: str,
        db: Session,
        *,
        customer_id: str | None = None,
        user_id: int | None = None,
    ):
        from app.services.stripe_service import sync_subscription_from_stripe
        return sync_subscription_from_stripe(
            provider_subscription_id,
            db,
            customer_id=customer_id,
            user_id=user_id,
        )

    def create_portal_session(self, customer_id: str) -> str:
        from app.services.stripe_service import create_portal_session
        return create_portal_session(customer_id)
