"""
SubscriptionService — billing operations backed by the state machine.

Design principles:
  1. All plan resolution goes through state_machine.get_effective_plan().
     Raw sub.plan_code is never used directly for limit decisions.
  2. MONETIZATION_ENABLED=false → check_limit() always passes (feature flag).
  3. Limits of -1 → unlimited, never blocked.
  4. Post count resets automatically:
       - active / past_due  → billing-cycle boundary (current_period_start).
         The reset advances when Stripe fires invoice.paid, which updates
         current_period_start via sync_subscription_from_stripe().
       - free / trialing / expired / cancelled → calendar-month boundary.
         No billing anchor exists for these states, so UTC month-start is used.
  5. check_limit() never raises — returns (bool, msg) so the caller decides.
  6. Usage counts are clamped to ≥ 0; negative values are a data invariant
     violation and should never reach limit checks.

Callers:
  - brands.py / posts.py → plan_limit() dependency → check_limit()
  - billing.py router    → get_billing_summary(), get_user_billing_status()
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.billing.plans import get_limit, get_plan, is_unlimited, public_plans
from app.billing.state_machine import (
    FREE_PLAN_CODE,
    ResolvedSub,
    UserBillingStatus,
    get_effective_plan,
    get_user_billing_status as _sm_billing_status,
    resolve,
)
from app.billing.trial import trial_end_date
from app.core.config import get_settings
from app.models.brand import Brand
from app.models.post import Post
from app.models.subscription import SubscriptionStatus, UserSubscription
from app.schemas.billing import (
    BillingSummary,
    LimitSet,
    PlanDetail,
    PlanFeatures,
    UsageSet,
)

logger   = logging.getLogger(__name__)
settings = get_settings()


# ── Internal helpers ───────────────────────────────────────────────────────────

def _start_of_month() -> datetime:
    now = datetime.now(timezone.utc)
    return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def _usage_reset_boundary(sub: UserSubscription | None) -> datetime:
    """
    Returns the datetime from which posts are counted for the current usage window.

    Paid users (active / past_due) with a Stripe billing anchor use
    current_period_start so their counter aligns with their invoice cycle.
    Every time Stripe renews the subscription it fires invoice.paid →
    sync_subscription_from_stripe() advances current_period_start → the
    window moves forward and usage resets automatically — no cron needed.

    All other states (free, trialing, expired, cancelled) use the first
    instant of the current UTC calendar month as a safe default.
    """
    if sub is not None and sub.current_period_start is not None:
        paid_states = {SubscriptionStatus.ACTIVE.value, SubscriptionStatus.PAST_DUE.value}
        if sub.status in paid_states:
            # Ensure timezone-aware before returning.
            ts = sub.current_period_start
            if ts.tzinfo is None:
                ts = ts.replace(tzinfo=timezone.utc)
            return ts
    return _start_of_month()


def _features_schema(plan_code: str) -> PlanFeatures:
    feat = get_plan(plan_code)["features"]
    return PlanFeatures(
        scheduling      = feat["scheduling"],
        analytics       = feat["analytics"],
        approval        = feat["approval"],
        priority_support= feat["priority_support"],
    )


# ── Create / fetch subscription ────────────────────────────────────────────────

def get_or_create(db: Session, user_id: int) -> UserSubscription:
    """
    Returns the subscription row; creates a legacy-plan row if none exists.

    "legacy" means the user predates billing — they keep unrestricted access.
    New users created via auth_service.register() already get "starter" + trial.
    """
    sub = (
        db.query(UserSubscription)
        .filter(UserSubscription.user_id == user_id)
        .first()
    )
    if sub is not None:
        return sub

    sub = UserSubscription(
        user_id              = user_id,
        plan_code            = "legacy",
        status               = SubscriptionStatus.ACTIVE.value,
        billing_cycle        = "monthly",
        cancel_at_period_end = False,
    )
    db.add(sub)
    try:
        db.commit()
        db.refresh(sub)
    except Exception:
        db.rollback()
        # Race: another request already created the row.
        sub = (
            db.query(UserSubscription)
            .filter(UserSubscription.user_id == user_id)
            .first()
        )
    return sub  # type: ignore[return-value]


# ── Usage ──────────────────────────────────────────────────────────────────────

def get_usage(
    db: Session,
    user_id: int,
    *,
    sub: UserSubscription | None = None,
) -> dict[str, int]:
    """
    Current resource usage. Always available regardless of billing flag.

    Pass `sub` when it is already loaded to avoid a redundant DB query and
    to get the correct billing-cycle-aligned reset boundary for paid users.
    When `sub` is None, the function attempts to load it from the DB so that
    paid users still receive the correct window; if the row does not exist yet
    it falls back to the calendar-month boundary.
    """
    if sub is None:
        sub = (
            db.query(UserSubscription)
            .filter(UserSubscription.user_id == user_id)
            .first()
        )

    boundary = _usage_reset_boundary(sub)

    brand_count: int = (
        db.query(func.count(Brand.id))
        .filter(Brand.owner_id == user_id)
        .scalar()
        or 0
    )
    post_count: int = (
        db.query(func.count(Post.id))
        .join(Brand, Post.brand_id == Brand.id)
        .filter(
            Brand.owner_id == user_id,
            Post.created_at >= boundary,
        )
        .scalar()
        or 0
    )
    return {
        "brands":          max(0, brand_count),
        "posts_per_month": max(0, post_count),
    }


# ── Trial management ───────────────────────────────────────────────────────────

def _flush_expired_trial(db: Session, sub: UserSubscription) -> None:
    """
    If the DB still says TRIALING but the window has passed, advance status
    to EXPIRED.  This is a passive flush — no cron job required.
    """
    if sub.status != SubscriptionStatus.TRIALING.value:
        return
    if sub.trial_ends_at is None or datetime.now(timezone.utc) < sub.trial_ends_at:
        return
    sub.status = SubscriptionStatus.EXPIRED.value
    db.commit()


def start_trial(db: Session, user_id: int) -> UserSubscription:
    """
    Activates the 7-day Professional trial.

    Raises ValueError if:
      - user has already used their trial (has_used_trial=True)
      - user is currently trialing
      - user already has an active paid subscription
    """
    sub = get_or_create(db, user_id)

    if sub.has_used_trial:
        raise ValueError("Trial já utilizado. Cada usuário tem direito a um único trial.")
    if sub.status == SubscriptionStatus.TRIALING.value:
        raise ValueError("Trial já está ativo.")
    if sub.status == SubscriptionStatus.ACTIVE.value and sub.stripe_subscription_id:
        raise ValueError("Usuário já possui uma assinatura ativa.")

    now = datetime.now(timezone.utc)
    sub.status           = SubscriptionStatus.TRIALING.value
    sub.trial_started_at = now
    sub.trial_ends_at    = trial_end_date()
    sub.has_used_trial   = True
    db.commit()
    db.refresh(sub)
    return sub


# ── Limit engine ───────────────────────────────────────────────────────────────

def check_limit(db: Session, user_id: int, resource: str) -> tuple[bool, str | None]:
    """
    Returns (True, None) if the user may create another `resource`.
    Returns (False, message) when the limit is reached.

    Never raises — callers decide how to surface the refusal.
    """
    if not settings.MONETIZATION_ENABLED:
        return (True, None)

    try:
        sub = get_or_create(db, user_id)
        _flush_expired_trial(db, sub)

        plan_code = get_effective_plan(sub)

        if is_unlimited(plan_code, resource):
            return (True, None)

        limit   = get_limit(plan_code, resource)
        usage   = get_usage(db, user_id, sub=sub)
        current = usage.get(resource, 0)

        if current >= limit:
            # For posts: try spending 1 credit before hard-blocking
            if resource == "posts_per_month":
                from app.services.credits_service import check_and_spend_for_post
                ok, credit_msg = check_and_spend_for_post(db, user_id)
                if ok:
                    return (True, None)
                return (False, credit_msg)

            plan_name = get_plan(plan_code)["display_name"]
            label     = {"brands": "marcas", "posts_per_month": "posts este mês"}.get(resource, resource)
            return (
                False,
                f"Limite do plano {plan_name} atingido: "
                f"{current}/{limit} {label}. "
                f"Faça upgrade para continuar.",
            )

        return (True, None)

    except Exception as exc:
        logger.warning("check_limit falhou: user=%s resource=%s err=%s", user_id, resource, exc)
        return (True, None)  # fail-open: never block on internal errors


def can_create_brand(db: Session, user_id: int) -> tuple[bool, str | None]:
    return check_limit(db, user_id, "brands")


def can_create_post(db: Session, user_id: int) -> tuple[bool, str | None]:
    return check_limit(db, user_id, "posts_per_month")


def get_remaining_posts(db: Session, user_id: int) -> int:
    """Returns posts remaining this month. -1 = unlimited."""
    if not settings.MONETIZATION_ENABLED:
        return -1

    sub       = get_or_create(db, user_id)
    plan_code = get_effective_plan(sub)

    if is_unlimited(plan_code, "posts_per_month"):
        return -1

    limit      = get_limit(plan_code, "posts_per_month")
    usage      = get_usage(db, user_id, sub=sub)
    posts_used = max(0, usage.get("posts_per_month", 0))
    return max(0, limit - posts_used)


# ── Billing summary ────────────────────────────────────────────────────────────

def get_billing_summary(db: Session, user_id: int) -> BillingSummary:
    """Full plan + usage + limits + features for the authenticated user."""
    sub = get_or_create(db, user_id)
    _flush_expired_trial(db, sub)

    state     = resolve(sub)
    plan      = get_plan(state.effective_plan_code)
    limits    = plan["limits"]
    usage     = get_usage(db, user_id, sub=sub)

    return BillingSummary(
        plan_code            = sub.plan_code,
        plan_name            = get_plan(sub.plan_code)["display_name"],
        effective_plan_code  = state.effective_plan_code,
        status               = state.resolved_status,
        billing_cycle        = sub.billing_cycle,
        trial_started_at     = sub.trial_started_at,
        trial_ends_at        = sub.trial_ends_at,
        has_used_trial       = sub.has_used_trial,
        is_trial_active      = state.is_trial_active,
        trial_days_left      = state.trial_days_left,
        current_period_start = sub.current_period_start,
        current_period_end   = sub.current_period_end,
        cancel_at_period_end = sub.cancel_at_period_end,
        limits               = LimitSet(
            brands           = limits["brands"],
            posts_per_month  = limits["posts_per_month"],
        ),
        usage                = UsageSet(
            brands           = usage["brands"],
            posts_per_month  = usage["posts_per_month"],
        ),
        features             = _features_schema(state.effective_plan_code),
        monetization_enabled = settings.MONETIZATION_ENABLED,
        stripe_enabled       = settings.STRIPE_ENABLED,
    )


def get_user_billing_status_svc(db: Session, user_id: int) -> UserBillingStatus:
    """Lightweight billing status — use for quick checks, not full summaries."""
    sub   = get_or_create(db, user_id)
    _flush_expired_trial(db, sub)
    usage = get_usage(db, user_id, sub=sub)
    return _sm_billing_status(sub, usage)


# ── Public plans listing ───────────────────────────────────────────────────────

def list_public_plans(current_plan_code: str) -> list[PlanDetail]:
    result = []
    for code, plan in public_plans():
        limits = plan["limits"]
        feat   = plan["features"]
        result.append(PlanDetail(
            code                 = code,
            display_name         = plan["display_name"],
            price_monthly_cents  = plan["price_monthly_cents"],
            price_yearly_cents   = plan["price_yearly_cents"],
            limits               = LimitSet(
                brands           = limits["brands"],
                posts_per_month  = limits["posts_per_month"],
            ),
            features             = PlanFeatures(
                scheduling       = feat["scheduling"],
                analytics        = feat["analytics"],
                approval         = feat["approval"],
                priority_support = feat["priority_support"],
            ),
            is_current           = (code == current_plan_code),
        ))
    return result
