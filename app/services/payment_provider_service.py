"""
PaymentProviderService — provider-agnostic facade for all billing operations.

The billing router should call this module; it must NEVER import
stripe_service (or any other provider SDK) directly.

Responsibilities:
  - Route checkout creation to the correct provider via payment_method_preference
  - Route webhook handling to the correct provider via provider_name
  - Expose sync_subscription and create_portal_session in a provider-neutral way

Provider selection:
  payment_method_preference / provider_name:
    "card" → StripeProvider  (live)
    "pix"  → PixProvider     (stub — raises NotImplementedError until implemented)
"""

from __future__ import annotations

import logging

from sqlalchemy.orm import Session

from app.billing.providers.base import CheckoutParams
from app.billing.providers.registry import get_provider

logger = logging.getLogger(__name__)


def create_checkout(
    *,
    user_id: int,
    email: str,
    plan_code: str,
    billing_cycle: str,
    payment_method_preference: str,
    db: Session,
) -> str:
    """
    Creates a checkout session via the selected provider and returns a
    redirect URL.

    Raises ValueError for unknown preferences (→ 400) or unsupported
    provider operations (e.g. Pix not yet live → 503).
    """
    provider = get_provider(payment_method_preference)
    params   = CheckoutParams(
        user_id=user_id,
        email=email,
        plan_code=plan_code,
        billing_cycle=billing_cycle,
    )
    logger.info(
        "[payment] create_checkout user=%s plan=%s/%s provider=%s",
        user_id, plan_code, billing_cycle, payment_method_preference,
    )
    return provider.create_checkout(params, db)


def handle_webhook(
    payload: bytes,
    signature: str,
    db: Session,
    *,
    provider_name: str = "card",
) -> dict:
    """
    Validates and processes an inbound webhook from the given provider.

    provider_name must match the source of the request (derived from the
    webhook endpoint path, e.g. /billing/webhook → "card",
    /billing/webhook/pix → "pix").

    Re-raises provider signature errors so the router can return 400.
    """
    provider = get_provider(provider_name)
    logger.info("[payment] handle_webhook provider=%s", provider_name)
    return provider.handle_webhook(payload, signature, db)


def sync_subscription(
    provider_subscription_id: str,
    db: Session,
    *,
    provider_name: str = "card",
    customer_id: str | None = None,
    user_id: int | None = None,
):
    """
    Fetches live subscription state from the provider and writes to DB.
    Caller is responsible for committing.
    """
    provider = get_provider(provider_name)
    return provider.sync_subscription(
        provider_subscription_id,
        db,
        customer_id=customer_id,
        user_id=user_id,
    )


def create_portal_session(
    customer_id: str,
    *,
    provider_name: str = "card",
) -> str:
    """
    Returns a customer self-service portal URL for the given provider.

    Raises NotImplementedError for providers without a portal (e.g. Pix).
    """
    provider = get_provider(provider_name)
    return provider.create_portal_session(customer_id)
