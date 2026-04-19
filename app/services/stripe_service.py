"""
Stripe Service — production-safe checkout, sync, and webhook handling.

Architecture
────────────
                  Stripe API
                      │
        ┌─────────────┴──────────────┐
        │                            │
  checkout session            webhook event
        │                            │
   create_checkout_session   handle_webhook()
        │                            │
        │               ┌────────────┴────────────┐
        │          idempotency            dispatch to handler
        │          guard                           │
        │               │                          ▼
        │            already?          sync_subscription_from_stripe()
        │            yes → 200               │
        │            no  → continue          │
        │                                    ▼
        └───────────────────────────> UserSubscription (DB)

Idempotency
───────────
Every processed event ID (evt_xxx) is stored in stripe_webhook_events.
The INSERT and the subscription mutation share one DB transaction:
  • success  → both committed atomically
  • failure  → both rolled back; Stripe retries safely

Sync strategy
─────────────
For create/update/paid events we NEVER trust the event payload alone.
We call sync_subscription_from_stripe() which fetches the live subscription
object from the Stripe API and overwrites all subscription fields in one shot.
Stripe is always the source of truth.

Logging
───────
All log lines follow:   [stripe] <verb> event_id=... type=... [extra fields]
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

import stripe
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.stripe_event import StripeWebhookEvent
from app.models.subscription import SubscriptionStatus, UserSubscription

logger   = logging.getLogger(__name__)
settings = get_settings()


# ── Stripe client ──────────────────────────────────────────────────────────────

def _client() -> stripe.StripeClient:
    return stripe.StripeClient(settings.STRIPE_SECRET_KEY)


# ── Pure helpers ───────────────────────────────────────────────────────────────

def _dt(ts: int | None) -> datetime | None:
    return None if ts is None else datetime.fromtimestamp(ts, tz=timezone.utc)


def _now() -> datetime:
    return datetime.now(timezone.utc)


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
            f"Stripe Price ID not configured for {plan_code}/{billing_cycle}. "
            "Set STRIPE_PRICE_* in .env."
        )
    return price_id


def _price_id_to_plan_code(price_id: str) -> str | None:
    """Maps a Stripe Price ID back to our internal plan_code. Returns None if unknown."""
    if not price_id:
        return None
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
    """
    Maps Stripe subscription status → our SubscriptionStatus value.

    Unknown statuses default to PAST_DUE (cautious — don't silently grant active).
    """
    return {
        "active":             SubscriptionStatus.ACTIVE.value,
        "trialing":           SubscriptionStatus.TRIALING.value,
        "past_due":           SubscriptionStatus.PAST_DUE.value,
        "canceled":           SubscriptionStatus.CANCELLED.value,
        "incomplete":         SubscriptionStatus.PAST_DUE.value,
        "incomplete_expired": SubscriptionStatus.CANCELLED.value,
        "unpaid":             SubscriptionStatus.PAST_DUE.value,
        "paused":             SubscriptionStatus.PAST_DUE.value,
    }.get(stripe_status, SubscriptionStatus.PAST_DUE.value)   # safe fallback


def _detect_billing_cycle(stripe_sub: object) -> str:
    """Extracts 'monthly' or 'yearly' from a Stripe Subscription object."""
    try:
        interval = stripe_sub.items.data[0].price.recurring.interval  # type: ignore[union-attr]
        return "yearly" if interval == "year" else "monthly"
    except (AttributeError, IndexError):
        return "monthly"


# ── DB lookups ─────────────────────────────────────────────────────────────────

def _find_by_customer(db: Session, customer_id: str) -> UserSubscription | None:
    return (
        db.query(UserSubscription)
        .filter(UserSubscription.stripe_customer_id == customer_id)
        .first()
    )


def _find_by_stripe_sub_id(db: Session, stripe_sub_id: str) -> UserSubscription | None:
    return (
        db.query(UserSubscription)
        .filter(UserSubscription.stripe_subscription_id == stripe_sub_id)
        .first()
    )


def _find_by_user_id(db: Session, user_id: int) -> UserSubscription | None:
    return (
        db.query(UserSubscription)
        .filter(UserSubscription.user_id == user_id)
        .first()
    )


def _resolve_local_sub(
    db: Session,
    *,
    stripe_sub_id: str | None = None,
    customer_id: str | None = None,
    user_id: int | None = None,
) -> UserSubscription | None:
    """
    Finds the local subscription row using any available identifier.
    Tries in order: stripe_subscription_id → customer_id → user_id.
    """
    if stripe_sub_id:
        sub = _find_by_stripe_sub_id(db, stripe_sub_id)
        if sub:
            return sub
    if customer_id:
        sub = _find_by_customer(db, customer_id)
        if sub:
            return sub
    if user_id:
        sub = _find_by_user_id(db, user_id)
        if sub:
            return sub
    return None


# ── Core: sync from Stripe ─────────────────────────────────────────────────────

def sync_subscription_from_stripe(
    stripe_subscription_id: str,
    db: Session,
    *,
    customer_id: str | None = None,
    user_id: int | None = None,
) -> UserSubscription | None:
    """
    Fetches the live subscription from the Stripe API and overwrites all
    relevant fields in the local UserSubscription row.

    Stripe is always the source of truth.  Never call this with stale event data.

    Returns the updated UserSubscription, or None if no local row was found.
    The caller is responsible for calling db.commit().
    """
    client = _client()

    # Fetch live from Stripe with items expanded so we can resolve plan code.
    try:
        stripe_sub = client.v1.subscriptions.retrieve(
            stripe_subscription_id,
            params={"expand": ["items.data.price"]},
        )
    except stripe.InvalidRequestError:
        logger.error(
            "[stripe] sync failed — subscription not found in Stripe stripe_sub_id=%s",
            stripe_subscription_id,
        )
        return None

    # Resolve local row
    sub = _resolve_local_sub(
        db,
        stripe_sub_id=stripe_subscription_id,
        customer_id=customer_id or stripe_sub.customer,
        user_id=user_id,
    )
    if sub is None:
        logger.error(
            "[stripe] sync failed — no local row for stripe_sub_id=%s customer=%s user_id=%s",
            stripe_subscription_id,
            customer_id or stripe_sub.customer,
            user_id,
        )
        return None

    # Determine plan code from the subscription's price
    plan_code = sub.plan_code  # keep current as fallback
    try:
        price_id = stripe_sub.items.data[0].price.id
        mapped   = _price_id_to_plan_code(price_id)
        if mapped:
            plan_code = mapped
        else:
            logger.warning(
                "[stripe] sync — unknown price_id=%s for stripe_sub_id=%s; keeping plan_code=%s",
                price_id, stripe_subscription_id, plan_code,
            )
    except (AttributeError, IndexError):
        logger.warning(
            "[stripe] sync — no price in subscription items stripe_sub_id=%s", stripe_subscription_id
        )

    # Write all fields from the live Stripe object
    sub.stripe_subscription_id = stripe_subscription_id
    sub.stripe_customer_id     = stripe_sub.customer
    sub.plan_code              = plan_code
    sub.status                 = _map_stripe_status(stripe_sub.status)
    sub.billing_cycle          = _detect_billing_cycle(stripe_sub)
    sub.current_period_start   = _dt(stripe_sub.current_period_start)
    sub.current_period_end     = _dt(stripe_sub.current_period_end)
    sub.cancel_at_period_end   = bool(stripe_sub.cancel_at_period_end)

    logger.info(
        "[stripe] sync done stripe_sub_id=%s user=%s plan=%s status=%s period_end=%s",
        stripe_subscription_id,
        sub.user_id,
        plan_code,
        sub.status,
        sub.current_period_end,
    )
    return sub


# ── Idempotency ────────────────────────────────────────────────────────────────

def _claim_event(db: Session, event_id: str, event_type: str) -> bool:
    """
    Tries to INSERT the event_id into stripe_webhook_events.

    Returns True  if this event is new and should be processed.
    Returns False if it was already processed (duplicate delivery).

    Uses flush() to detect the unique constraint violation immediately,
    without committing — the caller commits with the subscription mutation.
    """
    row = StripeWebhookEvent(
        stripe_event_id=event_id,
        event_type=event_type,
        processed_at=_now(),
    )
    db.add(row)
    try:
        db.flush()
        return True
    except IntegrityError:
        db.rollback()
        return False


# ── Webhook dispatcher ─────────────────────────────────────────────────────────

def handle_webhook(payload: bytes, stripe_signature: str, db: Session) -> dict:
    """
    Entry point for POST /billing/webhook.

    1. Validates the Stripe-Signature header.
    2. Checks idempotency — ignores already-processed events.
    3. Dispatches to the correct handler.
    4. Commits idempotency row + subscription mutation atomically.
    5. On any error: rolls back so Stripe can retry safely.

    Raises stripe.SignatureVerificationError on bad signatures (→ 400 to caller).
    Re-raises other exceptions after rollback (→ 500 to caller → Stripe retries).
    """
    event = stripe.Webhook.construct_event(
        payload, stripe_signature, settings.STRIPE_WEBHOOK_SECRET
    )

    event_id   = event["id"]
    event_type = event["type"]
    data       = event["data"]["object"]

    logger.info("[stripe] received event_id=%s type=%s", event_id, event_type)

    # ── Idempotency guard ──────────────────────────────────────────────────────
    if not _claim_event(db, event_id, event_type):
        logger.info("[stripe] ignored event_id=%s type=%s reason=duplicate", event_id, event_type)
        return {"received": True, "idempotent": True}

    # ── Dispatch ───────────────────────────────────────────────────────────────
    handlers = {
        "checkout.session.completed":    _on_checkout_completed,
        "customer.subscription.created": _on_subscription_sync,
        "customer.subscription.updated": _on_subscription_sync,
        "invoice.paid":                  _on_invoice_paid,
        "customer.subscription.deleted": _on_subscription_deleted,
    }

    handler = handlers.get(event_type)
    if handler is None:
        logger.info("[stripe] unhandled event_id=%s type=%s", event_id, event_type)
        db.commit()   # commit the idempotency row so we don't re-process
        return {"received": True}

    try:
        handler(data, db, event_id=event_id)
        db.commit()   # atomically commits idempotency row + subscription mutation
        logger.info("[stripe] processed event_id=%s type=%s", event_id, event_type)
    except Exception:
        db.rollback()  # rolls back idempotency row too → Stripe will retry
        logger.exception("[stripe] failed event_id=%s type=%s — rolled back", event_id, event_type)
        raise

    return {"received": True}


# ── Event handlers ─────────────────────────────────────────────────────────────
# Each handler mutates the session but does NOT commit.
# The commit is done by handle_webhook() to ensure atomicity with the
# idempotency row.  Handlers also do NOT re-raise — they let exceptions
# bubble up to handle_webhook() which rolls back.

def _on_checkout_completed(session: dict, db: Session, *, event_id: str) -> None:
    """
    Fired when a Checkout Session completes and the subscription is created.

    1. Extracts user_id and stripe_subscription_id from session metadata.
    2. Links the local subscription row to the Stripe customer + subscription.
    3. Calls sync_subscription_from_stripe() to pull the definitive state.
    """
    metadata    = session.get("metadata") or {}
    user_id_str = metadata.get("user_id", "")
    stripe_sub_id = session.get("subscription")
    customer_id   = session.get("customer")

    if not user_id_str:
        logger.error(
            "[stripe] checkout.completed event_id=%s — missing user_id in metadata",
            event_id,
        )
        return

    try:
        user_id = int(user_id_str)
    except ValueError:
        logger.error(
            "[stripe] checkout.completed event_id=%s — invalid user_id=%s",
            event_id, user_id_str,
        )
        return

    if not stripe_sub_id:
        logger.error(
            "[stripe] checkout.completed event_id=%s user=%s — no subscription ID in session",
            event_id, user_id,
        )
        return

    logger.info(
        "[stripe] checkout.completed event_id=%s user=%s stripe_sub=%s",
        event_id, user_id, stripe_sub_id,
    )

    # Pre-link customer so sync can find the row even before it has a sub_id.
    sub = _find_by_user_id(db, user_id)
    if sub and customer_id and not sub.stripe_customer_id:
        sub.stripe_customer_id = customer_id
        db.flush()

    # Full sync from Stripe — this sets plan, status, period, etc.
    result = sync_subscription_from_stripe(
        stripe_sub_id, db, customer_id=customer_id, user_id=user_id
    )
    if result is None:
        logger.error(
            "[stripe] checkout.completed event_id=%s — sync returned None for stripe_sub=%s",
            event_id, stripe_sub_id,
        )


def _on_subscription_sync(subscription: dict, db: Session, *, event_id: str) -> None:
    """
    Handles subscription.created and subscription.updated.
    Always syncs from the Stripe API — never trusts the event payload alone.
    """
    stripe_sub_id = subscription.get("id")
    customer_id   = subscription.get("customer")

    if not stripe_sub_id:
        logger.error("[stripe] subscription event_id=%s — missing subscription id", event_id)
        return

    logger.info(
        "[stripe] subscription.sync event_id=%s stripe_sub=%s customer=%s",
        event_id, stripe_sub_id, customer_id,
    )

    result = sync_subscription_from_stripe(
        stripe_sub_id, db, customer_id=customer_id
    )
    if result is None:
        logger.error(
            "[stripe] subscription.sync event_id=%s — no local row for stripe_sub=%s",
            event_id, stripe_sub_id,
        )


def _on_invoice_paid(invoice: dict, db: Session, *, event_id: str) -> None:
    """
    Fired on successful payment.  Syncs the linked subscription to ensure
    status=active and period dates are current.
    """
    stripe_sub_id = invoice.get("subscription")
    customer_id   = invoice.get("customer")

    if not stripe_sub_id:
        # One-off invoice with no subscription — nothing to sync.
        logger.info("[stripe] invoice.paid event_id=%s — no subscription, skipping", event_id)
        return

    logger.info(
        "[stripe] invoice.paid event_id=%s stripe_sub=%s customer=%s",
        event_id, stripe_sub_id, customer_id,
    )

    result = sync_subscription_from_stripe(
        stripe_sub_id, db, customer_id=customer_id
    )
    if result is None:
        logger.error(
            "[stripe] invoice.paid event_id=%s — sync returned None for stripe_sub=%s",
            event_id, stripe_sub_id,
        )


def _on_subscription_deleted(subscription: dict, db: Session, *, event_id: str) -> None:
    """
    Fired when a subscription is cancelled and the period has ended.

    We sync from Stripe (the subscription still exists with status=canceled)
    to get the exact period_end timestamp, then mark the local row accordingly.
    """
    stripe_sub_id = subscription.get("id")
    customer_id   = subscription.get("customer")

    if not stripe_sub_id:
        logger.error("[stripe] subscription.deleted event_id=%s — missing id", event_id)
        return

    logger.info(
        "[stripe] subscription.deleted event_id=%s stripe_sub=%s customer=%s",
        event_id, stripe_sub_id, customer_id,
    )

    # Sync to get the final state (status will be "canceled" → CANCELLED).
    sub = sync_subscription_from_stripe(
        stripe_sub_id, db, customer_id=customer_id
    )

    if sub is None:
        # Last-resort: find and mark cancelled without a full sync.
        sub = _resolve_local_sub(db, stripe_sub_id=stripe_sub_id, customer_id=customer_id)
        if sub:
            sub.status                 = SubscriptionStatus.CANCELLED.value
            sub.stripe_subscription_id = None
            sub.cancel_at_period_end   = False
            logger.warning(
                "[stripe] subscription.deleted event_id=%s — sync failed, fallback cancel applied user=%s",
                event_id, sub.user_id,
            )
        else:
            logger.error(
                "[stripe] subscription.deleted event_id=%s — no local row found for stripe_sub=%s",
                event_id, stripe_sub_id,
            )


# ── Customer ───────────────────────────────────────────────────────────────────

def get_or_create_customer(email: str, user_id: int, sub: UserSubscription) -> str:
    """Returns stripe_customer_id, creating one in Stripe if needed."""
    if sub.stripe_customer_id:
        return sub.stripe_customer_id

    client   = _client()
    customer = client.v1.customers.create(params={
        "email":    email,
        "metadata": {"user_id": str(user_id)},
    })
    logger.info("[stripe] customer created user=%s customer=%s", user_id, customer.id)
    return customer.id


# ── Checkout Session ───────────────────────────────────────────────────────────

def create_checkout_session(
    user_id: int,
    email: str,
    plan_code: str,
    billing_cycle: str,
    db: Session,
) -> str:
    """Creates a Stripe Checkout Session and returns the redirect URL."""
    from app.services.subscription_service import get_or_create as _get_sub

    sub         = _get_sub(db, user_id)
    customer_id = get_or_create_customer(email, user_id, sub)

    if sub.stripe_customer_id != customer_id:
        sub.stripe_customer_id = customer_id
        db.commit()

    price_id = _resolve_price_id(plan_code, billing_cycle)
    client   = _client()

    session = client.v1.checkout.sessions.create(params={
        "customer":   customer_id,
        "mode":       "subscription",
        "line_items": [{"price": price_id, "quantity": 1}],
        "success_url": (
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
    """Returns a Stripe Customer Portal URL for subscription management."""
    client  = _client()
    session = client.v1.billing_portal.sessions.create(params={
        "customer":   stripe_customer_id,
        "return_url": f"{settings.FRONTEND_URL}/billing",
    })
    return session.url  # type: ignore[return-value]
