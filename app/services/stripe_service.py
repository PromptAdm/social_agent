"""
Stripe Service — checkout sessions, webhooks, and subscription lifecycle.

Guards:
  - All public functions are no-ops (return None / skip) when STRIPE_ENABLED=false.
  - Webhook always validates X-Stripe-Signature before touching the DB.
  - STRIPE_SECRET_KEY is never logged (covered by SensitiveDataFilter).
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

import stripe
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.subscription import SubscriptionStatus, UserSubscription

logger = logging.getLogger(__name__)
settings = get_settings()


# ── Internal helpers ───────────────────────────────────────────────────────────

def _stripe_client() -> stripe.StripeClient:
    return stripe.StripeClient(settings.STRIPE_SECRET_KEY)


def _resolve_price_id(plan_code: str, billing_cycle: str) -> str:
    price_map: dict[tuple[str, str], str] = {
        ("starter",      "monthly"): settings.STRIPE_PRICE_STARTER_MONTHLY,
        ("starter",      "yearly"):  settings.STRIPE_PRICE_STARTER_YEARLY,
        ("professional", "monthly"): settings.STRIPE_PRICE_PROFESSIONAL_MONTHLY,
        ("professional", "yearly"):  settings.STRIPE_PRICE_PROFESSIONAL_YEARLY,
        ("premium",      "monthly"): settings.STRIPE_PRICE_PREMIUM_MONTHLY,
        ("premium",      "yearly"):  settings.STRIPE_PRICE_PREMIUM_YEARLY,
    }
    price_id = price_map.get((plan_code, billing_cycle), "")
    if not price_id:
        raise ValueError(
            f"Stripe Price ID não configurado para {plan_code}/{billing_cycle}. "
            "Preencha STRIPE_PRICE_* no .env."
        )
    return price_id


def _dt(ts: int | None) -> datetime | None:
    if ts is None:
        return None
    return datetime.fromtimestamp(ts, tz=timezone.utc)


# ── Customer ───────────────────────────────────────────────────────────────────

def get_or_create_customer(email: str, user_id: int, sub: UserSubscription) -> str:
    """Returns stripe_customer_id, creating the customer in Stripe if needed."""
    if sub.stripe_customer_id:
        return sub.stripe_customer_id

    client = _stripe_client()
    customer = client.customers.create(params={
        "email": email,
        "metadata": {"user_id": str(user_id)},
    })
    return customer.id


# ── Checkout Session ───────────────────────────────────────────────────────────

def create_checkout_session(
    user_id: int,
    email: str,
    plan_code: str,
    billing_cycle: str,
    db: Session,
) -> str:
    """
    Creates a Stripe Checkout Session and returns the redirect URL.
    Persists stripe_customer_id to the subscription row if newly created.
    """
    from app.services.subscription_service import get_or_create as get_sub

    sub = get_sub(db, user_id)
    customer_id = get_or_create_customer(email, user_id, sub)

    # Persist customer id if just created
    if sub.stripe_customer_id != customer_id:
        sub.stripe_customer_id = customer_id
        db.commit()

    price_id = _resolve_price_id(plan_code, billing_cycle)
    client   = _stripe_client()

    session = client.checkout.sessions.create(params={
        "customer":          customer_id,
        "mode":              "subscription",
        "line_items":        [{"price": price_id, "quantity": 1}],
        "success_url":       (
            f"{settings.FRONTEND_URL}/billing"
            f"?success=true&plan={plan_code}"
        ),
        "cancel_url":        f"{settings.FRONTEND_URL}/billing?canceled=true",
        "metadata": {
            "user_id":       str(user_id),
            "plan_code":     plan_code,
            "billing_cycle": billing_cycle,
        },
        "subscription_data": {
            "metadata": {
                "user_id":       str(user_id),
                "plan_code":     plan_code,
                "billing_cycle": billing_cycle,
            },
        },
    })

    logger.info(
        "[stripe] checkout session created user=%s plan=%s/%s session=%s",
        user_id, plan_code, billing_cycle, session.id,
    )
    return session.url  # type: ignore[return-value]


# ── Customer Portal ────────────────────────────────────────────────────────────

def create_portal_session(stripe_customer_id: str) -> str:
    """Returns a Customer Portal session URL for subscription management."""
    client  = _stripe_client()
    session = client.billing_portal.sessions.create(params={
        "customer":   stripe_customer_id,
        "return_url": f"{settings.FRONTEND_URL}/billing",
    })
    return session.url  # type: ignore[return-value]


# ── Webhook ────────────────────────────────────────────────────────────────────

def handle_webhook(payload: bytes, stripe_signature: str, db: Session) -> dict:
    """
    Validates the Stripe signature and dispatches the event.
    Returns {"received": True} on success.
    Raises stripe.SignatureVerificationError if the signature is invalid.
    """
    event = stripe.Webhook.construct_event(
        payload, stripe_signature, settings.STRIPE_WEBHOOK_SECRET
    )

    etype = event["type"]
    data  = event["data"]["object"]

    logger.info("[stripe_webhook] received event=%s id=%s", etype, event["id"])

    handlers = {
        "checkout.session.completed":    _on_checkout_completed,
        "customer.subscription.created": _on_subscription_upsert,
        "customer.subscription.updated": _on_subscription_upsert,
        "invoice.paid":                  _on_invoice_paid,
        "customer.subscription.deleted": _on_subscription_deleted,
    }

    handler = handlers.get(etype)
    if handler:
        try:
            handler(data, db)
        except Exception:
            logger.exception("[stripe_webhook] handler failed for %s", etype)
            raise

    return {"received": True}


# ── Event handlers ─────────────────────────────────────────────────────────────

def _find_sub_by_customer(db: Session, customer_id: str) -> UserSubscription | None:
    return (
        db.query(UserSubscription)
        .filter(UserSubscription.stripe_customer_id == customer_id)
        .first()
    )


def _on_checkout_completed(session: dict, db: Session) -> None:
    user_id    = int(session.get("metadata", {}).get("user_id", 0))
    plan_code  = session.get("metadata", {}).get("plan_code", "starter")
    customer_id = session.get("customer")
    sub_id     = session.get("subscription")

    if not user_id:
        logger.warning("[stripe_webhook] checkout.session.completed missing user_id")
        return

    sub = (
        db.query(UserSubscription)
        .filter(UserSubscription.user_id == user_id)
        .first()
    )
    if not sub:
        logger.warning("[stripe_webhook] no subscription row for user_id=%s", user_id)
        return

    sub.plan_code              = plan_code
    sub.status                 = SubscriptionStatus.ACTIVE.value
    sub.stripe_customer_id     = customer_id
    sub.stripe_subscription_id = sub_id
    db.commit()

    logger.info(
        "[stripe_webhook] checkout.completed user=%s plan=%s sub=%s",
        user_id, plan_code, sub_id,
    )


def _on_subscription_upsert(subscription: dict, db: Session) -> None:
    customer_id = subscription.get("customer")
    sub_id      = subscription.get("id")
    status      = subscription.get("status", "active")
    price_id    = None

    items = subscription.get("items", {}).get("data", [])
    if items:
        price_id = items[0].get("price", {}).get("id")

    plan_code = _price_id_to_plan_code(price_id) if price_id else None

    # Period
    period_start = _dt(subscription.get("current_period_start"))
    period_end   = _dt(subscription.get("current_period_end"))

    sub = _find_sub_by_customer(db, customer_id)
    if not sub:
        logger.warning("[stripe_webhook] subscription upsert: no row for customer=%s", customer_id)
        return

    sub.stripe_subscription_id = sub_id
    sub.status                  = _map_stripe_status(status)
    sub.current_period_start    = period_start
    sub.current_period_end      = period_end
    sub.cancel_at_period_end    = subscription.get("cancel_at_period_end", False)
    if plan_code:
        sub.plan_code = plan_code

    db.commit()
    logger.info(
        "[stripe_webhook] subscription upsert customer=%s status=%s plan=%s",
        customer_id, status, plan_code,
    )


def _on_invoice_paid(invoice: dict, db: Session) -> None:
    customer_id = invoice.get("customer")
    sub_id      = invoice.get("subscription")

    sub = _find_sub_by_customer(db, customer_id)
    if not sub:
        return

    sub.status                  = SubscriptionStatus.ACTIVE.value
    sub.stripe_subscription_id  = sub_id or sub.stripe_subscription_id
    db.commit()

    logger.info("[stripe_webhook] invoice.paid customer=%s", customer_id)


def _on_subscription_deleted(subscription: dict, db: Session) -> None:
    customer_id = subscription.get("customer")

    sub = _find_sub_by_customer(db, customer_id)
    if not sub:
        return

    sub.status              = SubscriptionStatus.CANCELLED.value
    sub.stripe_subscription_id = None
    sub.cancel_at_period_end   = False
    db.commit()

    logger.info("[stripe_webhook] subscription deleted customer=%s", customer_id)


# ── Price ID ↔ plan code mapping ──────────────────────────────────────────────

def _price_id_to_plan_code(price_id: str) -> str | None:
    mapping = {
        settings.STRIPE_PRICE_STARTER_MONTHLY:      "starter",
        settings.STRIPE_PRICE_STARTER_YEARLY:        "starter",
        settings.STRIPE_PRICE_PROFESSIONAL_MONTHLY: "professional",
        settings.STRIPE_PRICE_PROFESSIONAL_YEARLY:   "professional",
        settings.STRIPE_PRICE_PREMIUM_MONTHLY:       "premium",
        settings.STRIPE_PRICE_PREMIUM_YEARLY:        "premium",
    }
    return mapping.get(price_id)


def _map_stripe_status(stripe_status: str) -> str:
    return {
        "active":           SubscriptionStatus.ACTIVE.value,
        "trialing":         SubscriptionStatus.TRIALING.value,
        "past_due":         SubscriptionStatus.PAST_DUE.value,
        "canceled":         SubscriptionStatus.CANCELLED.value,
        "incomplete":       SubscriptionStatus.PAST_DUE.value,
        "incomplete_expired": SubscriptionStatus.CANCELLED.value,
        "unpaid":           SubscriptionStatus.PAST_DUE.value,
        "paused":           SubscriptionStatus.PAST_DUE.value,
    }.get(stripe_status, SubscriptionStatus.ACTIVE.value)
