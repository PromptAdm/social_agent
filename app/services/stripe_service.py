"""
Stripe Service — production-safe checkout, sync, and webhook handling.
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

logger = logging.getLogger(__name__)


# ── Settings / client ──────────────────────────────────────────────────────────

def _settings():
    return get_settings()


def _client() -> stripe.StripeClient:
    settings = _settings()
    return stripe.StripeClient(settings.STRIPE_SECRET_KEY)


# ── Pure helpers ───────────────────────────────────────────────────────────────

def _dt(ts: int | None) -> datetime | None:
    return None if ts is None else datetime.fromtimestamp(ts, tz=timezone.utc)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _normalize_plan_code(plan_code: str) -> str:
    return (plan_code or "").strip().lower()


def _normalize_billing_cycle(billing_cycle: str) -> str:
    value = (billing_cycle or "").strip().lower()
    if value in {"annual", "annually", "year", "yearly"}:
        return "yearly"
    return "monthly" if value not in {"monthly", "yearly"} else value


def _resolve_price_id(plan_code: str, billing_cycle: str) -> str:
    settings = _settings()
    normalized_plan = _normalize_plan_code(plan_code)
    normalized_cycle = _normalize_billing_cycle(billing_cycle)

    price_map: dict[tuple[str, str], str] = {
        ("starter", "monthly"): (settings.STRIPE_PRICE_STARTER_MONTHLY or "").strip(),
        ("starter", "yearly"): (settings.STRIPE_PRICE_STARTER_YEARLY or "").strip(),
        ("professional", "monthly"): (settings.STRIPE_PRICE_PROFESSIONAL_MONTHLY or "").strip(),
        ("professional", "yearly"): (settings.STRIPE_PRICE_PROFESSIONAL_YEARLY or "").strip(),
        ("premium", "monthly"): (settings.STRIPE_PRICE_PREMIUM_MONTHLY or "").strip(),
        ("premium", "yearly"): (settings.STRIPE_PRICE_PREMIUM_YEARLY or "").strip(),
    }

    price_id = price_map.get((normalized_plan, normalized_cycle), "")

    print("=== STRIPE PRICE RESOLUTION DEBUG ===")
    print(f"raw plan_code={plan_code!r}")
    print(f"raw billing_cycle={billing_cycle!r}")
    print(f"normalized plan_code={normalized_plan!r}")
    print(f"normalized billing_cycle={normalized_cycle!r}")
    print(f"resolved price_id={price_id!r}")
    print("=====================================")

    if not price_id:
        raise ValueError(
            f"Stripe Price ID not configured for {normalized_plan}/{normalized_cycle}. "
            "Set STRIPE_PRICE_* in .env."
        )

    logger.info(
        "[stripe] resolved price_id plan=%s/%s price_id=%s",
        normalized_plan,
        normalized_cycle,
        price_id,
    )
    return price_id


def _validate_price_exists(price_id: str) -> None:
    client = _client()
    try:
        price = client.v1.prices.retrieve(price_id)
        print("=== STRIPE PRICE VALIDATION DEBUG ===")
        print(f"validated price_id={price_id!r}")
        print(f"stripe returned price.id={getattr(price, 'id', None)!r}")
        print(f"stripe returned active={getattr(price, 'active', None)!r}")
        print("=====================================")
        logger.info("[stripe] validated price exists price_id=%s", price_id)
    except stripe.InvalidRequestError as exc:
        logger.exception("[stripe] price validation failed price_id=%s", price_id)
        raise ValueError(
            f"Stripe price does not exist or is inaccessible for this API key: {price_id}"
        ) from exc


def _price_id_to_plan_code(price_id: str) -> str | None:
    settings = _settings()

    if not price_id:
        return None

    mapping = {
        (settings.STRIPE_PRICE_STARTER_MONTHLY or "").strip(): "starter",
        (settings.STRIPE_PRICE_STARTER_YEARLY or "").strip(): "starter",
        (settings.STRIPE_PRICE_PROFESSIONAL_MONTHLY or "").strip(): "professional",
        (settings.STRIPE_PRICE_PROFESSIONAL_YEARLY or "").strip(): "professional",
        (settings.STRIPE_PRICE_PREMIUM_MONTHLY or "").strip(): "premium",
        (settings.STRIPE_PRICE_PREMIUM_YEARLY or "").strip(): "premium",
    }
    return mapping.get(price_id)


def _map_stripe_status(stripe_status: str) -> str:
    return {
        "active": SubscriptionStatus.ACTIVE.value,
        "trialing": SubscriptionStatus.TRIALING.value,
        "past_due": SubscriptionStatus.PAST_DUE.value,
        "canceled": SubscriptionStatus.CANCELLED.value,
        "incomplete": SubscriptionStatus.PAST_DUE.value,
        "incomplete_expired": SubscriptionStatus.CANCELLED.value,
        "unpaid": SubscriptionStatus.PAST_DUE.value,
        "paused": SubscriptionStatus.PAST_DUE.value,
    }.get(stripe_status, SubscriptionStatus.PAST_DUE.value)


def _detect_billing_cycle(stripe_sub: object) -> str:
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
    client = _client()

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

    plan_code = sub.plan_code
    try:
        price_id = stripe_sub.items.data[0].price.id
        mapped = _price_id_to_plan_code(price_id)
        if mapped:
            plan_code = mapped
        else:
            logger.warning(
                "[stripe] sync — unknown price_id=%s for stripe_sub_id=%s; keeping plan_code=%s",
                price_id,
                stripe_subscription_id,
                plan_code,
            )
    except (AttributeError, IndexError):
        logger.warning(
            "[stripe] sync — no price in subscription items stripe_sub_id=%s",
            stripe_subscription_id,
        )

    mapped_status = _map_stripe_status(stripe_sub.status)

    sub.stripe_subscription_id = stripe_subscription_id
    sub.stripe_customer_id = stripe_sub.customer
    sub.plan_code = plan_code
    sub.status = mapped_status
    sub.billing_cycle = _detect_billing_cycle(stripe_sub)
    sub.current_period_start = _dt(stripe_sub.current_period_start)
    sub.current_period_end = _dt(stripe_sub.current_period_end)
    sub.cancel_at_period_end = bool(stripe_sub.cancel_at_period_end)

    stripe_trial_start = getattr(stripe_sub, "trial_start", None)
    stripe_trial_end = getattr(stripe_sub, "trial_end", None)

    if stripe_trial_start is not None:
        sub.trial_started_at = _dt(stripe_trial_start)
        sub.trial_ends_at = _dt(stripe_trial_end)
        if not sub.has_used_trial:
            sub.has_used_trial = True
            logger.info(
                "[stripe] sync — trial detected stripe_sub_id=%s user=%s "
                "trial_start=%s trial_end=%s",
                stripe_subscription_id,
                sub.user_id,
                sub.trial_started_at,
                sub.trial_ends_at,
            )

    logger.info(
        "[stripe] sync done stripe_sub_id=%s user=%s plan=%s status=%s "
        "trial_active=%s period_end=%s",
        stripe_subscription_id,
        sub.user_id,
        plan_code,
        mapped_status,
        mapped_status == SubscriptionStatus.TRIALING.value,
        sub.current_period_end,
    )
    return sub


# ── Idempotency ────────────────────────────────────────────────────────────────

def _claim_event(db: Session, event_id: str, event_type: str) -> bool:
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
    settings = _settings()

    event = stripe.Webhook.construct_event(
        payload,
        stripe_signature,
        settings.STRIPE_WEBHOOK_SECRET,
    )

    event_id = event["id"]
    event_type = event["type"]
    data = event["data"]["object"]

    logger.info("[stripe] received event_id=%s type=%s", event_id, event_type)

    if not _claim_event(db, event_id, event_type):
        logger.info("[stripe] ignored event_id=%s type=%s reason=duplicate", event_id, event_type)
        return {"received": True, "idempotent": True}

    handlers = {
        "checkout.session.completed": _on_checkout_completed,
        "customer.subscription.created": _on_subscription_sync,
        "customer.subscription.updated": _on_subscription_sync,
        "invoice.paid": _on_invoice_paid,
        "customer.subscription.deleted": _on_subscription_deleted,
    }

    handler = handlers.get(event_type)
    if handler is None:
        logger.info("[stripe] unhandled event_id=%s type=%s", event_id, event_type)
        db.commit()
        return {"received": True}

    try:
        handler(data, db, event_id=event_id)
        db.commit()
        logger.info("[stripe] processed event_id=%s type=%s", event_id, event_type)
    except Exception:
        db.rollback()
        logger.exception("[stripe] failed event_id=%s type=%s — rolled back", event_id, event_type)
        raise

    return {"received": True}


# ── Event handlers ─────────────────────────────────────────────────────────────

def _on_checkout_completed(session: dict, db: Session, *, event_id: str) -> None:
    metadata = session.get("metadata") or {}
    user_id_str = metadata.get("user_id", "")
    stripe_sub_id = session.get("subscription")
    customer_id = session.get("customer")

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
            event_id,
            user_id_str,
        )
        return

    if not stripe_sub_id:
        logger.error(
            "[stripe] checkout.completed event_id=%s user=%s — no subscription ID in session",
            event_id,
            user_id,
        )
        return

    logger.info(
        "[stripe] checkout.completed event_id=%s user=%s stripe_sub=%s",
        event_id,
        user_id,
        stripe_sub_id,
    )

    sub = _find_by_user_id(db, user_id)
    if sub and customer_id and not sub.stripe_customer_id:
        sub.stripe_customer_id = customer_id
        db.flush()

    result = sync_subscription_from_stripe(
        stripe_sub_id,
        db,
        customer_id=customer_id,
        user_id=user_id,
    )
    if result is None:
        logger.error(
            "[stripe] checkout.completed event_id=%s — sync returned None for stripe_sub=%s",
            event_id,
            stripe_sub_id,
        )


def _on_subscription_sync(subscription: dict, db: Session, *, event_id: str) -> None:
    stripe_sub_id = subscription.get("id")
    customer_id = subscription.get("customer")

    if not stripe_sub_id:
        logger.error("[stripe] subscription event_id=%s — missing subscription id", event_id)
        return

    logger.info(
        "[stripe] subscription.sync event_id=%s stripe_sub=%s customer=%s",
        event_id,
        stripe_sub_id,
        customer_id,
    )

    result = sync_subscription_from_stripe(
        stripe_sub_id,
        db,
        customer_id=customer_id,
    )
    if result is None:
        logger.error(
            "[stripe] subscription.sync event_id=%s — no local row for stripe_sub=%s",
            event_id,
            stripe_sub_id,
        )


def _on_invoice_paid(invoice: dict, db: Session, *, event_id: str) -> None:
    stripe_sub_id = invoice.get("subscription")
    customer_id = invoice.get("customer")

    if not stripe_sub_id:
        logger.info("[stripe] invoice.paid event_id=%s — no subscription, skipping", event_id)
        return

    logger.info(
        "[stripe] invoice.paid event_id=%s stripe_sub=%s customer=%s",
        event_id,
        stripe_sub_id,
        customer_id,
    )

    result = sync_subscription_from_stripe(
        stripe_sub_id,
        db,
        customer_id=customer_id,
    )
    if result is None:
        logger.error(
            "[stripe] invoice.paid event_id=%s — sync returned None for stripe_sub=%s",
            event_id,
            stripe_sub_id,
        )


def _on_subscription_deleted(subscription: dict, db: Session, *, event_id: str) -> None:
    stripe_sub_id = subscription.get("id")
    customer_id = subscription.get("customer")

    if not stripe_sub_id:
        logger.error("[stripe] subscription.deleted event_id=%s — missing id", event_id)
        return

    logger.info(
        "[stripe] subscription.deleted event_id=%s stripe_sub=%s customer=%s",
        event_id,
        stripe_sub_id,
        customer_id,
    )

    sub = sync_subscription_from_stripe(
        stripe_sub_id,
        db,
        customer_id=customer_id,
    )

    if sub is None:
        sub = _resolve_local_sub(db, stripe_sub_id=stripe_sub_id, customer_id=customer_id)
        if sub:
            sub.status = SubscriptionStatus.CANCELLED.value
            sub.stripe_subscription_id = None
            sub.cancel_at_period_end = False
            logger.warning(
                "[stripe] subscription.deleted event_id=%s — sync failed, fallback cancel applied user=%s",
                event_id,
                sub.user_id,
            )
        else:
            logger.error(
                "[stripe] subscription.deleted event_id=%s — no local row found for stripe_sub=%s",
                event_id,
                stripe_sub_id,
            )


# ── Customer ───────────────────────────────────────────────────────────────────

def get_or_create_customer(email: str, user_id: int, sub: UserSubscription) -> str:
    if sub.stripe_customer_id:
        return sub.stripe_customer_id

    client = _client()
    customer = client.v1.customers.create(params={
        "email": email,
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
    from app.billing.trial import TRIAL_DAYS
    from app.services.subscription_service import get_or_create as _get_sub

    settings = _settings()

    normalized_plan = _normalize_plan_code(plan_code)
    normalized_cycle = _normalize_billing_cycle(billing_cycle)

    print("=== STRIPE CHECKOUT INPUT DEBUG ===")
    print(f"user_id={user_id!r}")
    print(f"email={email!r}")
    print(f"plan_code_raw={plan_code!r}")
    print(f"billing_cycle_raw={billing_cycle!r}")
    print(f"plan_code_normalized={normalized_plan!r}")
    print(f"billing_cycle_normalized={normalized_cycle!r}")
    print(f"stripe_key_prefix={settings.STRIPE_SECRET_KEY[:20]!r}")
    print("===================================")

    sub = _get_sub(db, user_id)
    customer_id = get_or_create_customer(email, user_id, sub)

    if sub.stripe_customer_id != customer_id:
        sub.stripe_customer_id = customer_id
        db.commit()

    apply_trial = not sub.has_used_trial
    price_id = _resolve_price_id(normalized_plan, normalized_cycle)
    _validate_price_exists(price_id)

    print("=== STRIPE CHECKOUT SESSION DEBUG ===")
    print(f"customer_id={customer_id!r}")
    print(f"apply_trial={apply_trial!r}")
    print(f"price_id={price_id!r}")
    print(f"frontend_url={getattr(settings, 'FRONTEND_URL', None)!r}")
    print("=====================================")

    logger.info(
        "[stripe] creating checkout user=%s plan=%s/%s price_id=%s trial=%s customer=%s",
        user_id,
        normalized_plan,
        normalized_cycle,
        price_id,
        apply_trial,
        customer_id,
    )

    client = _client()

    subscription_data: dict = {
        "metadata": {
            "user_id": str(user_id),
            "plan_code": normalized_plan,
            "billing_cycle": normalized_cycle,
        },
    }
    if apply_trial:
        subscription_data["trial_period_days"] = TRIAL_DAYS

    session = client.v1.checkout.sessions.create(params={
        "customer": customer_id,
        "mode": "subscription",
        "line_items": [{"price": price_id, "quantity": 1}],
        "success_url": (
            f"{settings.FRONTEND_URL}/billing"
            f"?success=true&plan={normalized_plan}"
        ),
        "cancel_url": f"{settings.FRONTEND_URL}/billing?canceled=true",
        "metadata": {
            "user_id": str(user_id),
            "plan_code": normalized_plan,
            "billing_cycle": normalized_cycle,
        },
        "subscription_data": subscription_data,
    })

    print("=== STRIPE CHECKOUT CREATED ===")
    print(f"session_id={session.id!r}")
    print(f"url={session.url!r}")
    print("================================")

    logger.info(
        "[stripe] checkout session created user=%s plan=%s/%s price_id=%s trial=%s session=%s url=%s",
        user_id,
        normalized_plan,
        normalized_cycle,
        price_id,
        apply_trial,
        session.id,
        session.url,
    )
    return session.url  # type: ignore[return-value]


# ── Customer Portal ────────────────────────────────────────────────────────────

def create_portal_session(stripe_customer_id: str) -> str:
    settings = _settings()
    client = _client()
    session = client.v1.billing_portal.sessions.create(params={
        "customer": stripe_customer_id,
        "return_url": f"{settings.FRONTEND_URL}/billing",
    })
    return session.url  # type: ignore[return-value]