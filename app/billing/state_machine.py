"""
Subscription state machine — single source of truth for plan resolution.

Every billing decision flows through here.  Nothing else should contain
plan-resolution logic.

Public API:
    get_effective_plan(sub)     → str         which plan's limits apply right now
    resolve(sub)                → ResolvedSub  full resolved snapshot (no DB)
    get_user_billing_status(sub, usage) → UserBillingStatus  lightweight summary

State transition rules
──────────────────────
  ACTIVE    → stored plan_code          (paid, in period)
  PAST_DUE  → stored plan_code          (grace period, full access preserved)
  TRIALING  + trial window open  → TRIAL_PLAN_CODE ("professional")
  TRIALING  + trial window closed → free  (stale DB — expiry not yet flushed)
  CANCELLED + still in period    → stored plan_code  (access until period end)
  CANCELLED + past period        → free
  FREE / EXPIRED / unknown       → free

Safety invariants enforced here (not assumed from the DB):
  - Unknown plan codes     → coerced to "free"
  - Negative usage counts  → clamped to 0
  - Trial + ACTIVE overlap → ACTIVE wins (paid beats trial)
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from app.billing.plans import VALID_PLAN_CODES, get_limit, get_plan, is_unlimited
from app.billing.trial import TRIAL_PLAN_CODE, is_trial_expired

if TYPE_CHECKING:
    from app.models.subscription import UserSubscription

FREE_PLAN_CODE = "free"


# ── Internal helpers ───────────────────────────────────────────────────────────

def _now() -> datetime:
    return datetime.now(timezone.utc)


def _validate_plan_code(code: str) -> str:
    """Coerce unknown/corrupted plan codes to free instead of crashing."""
    return code if code in VALID_PLAN_CODES else FREE_PLAN_CODE


def _period_still_active(current_period_end: datetime | None) -> bool:
    if current_period_end is None:
        return False
    return _now() < current_period_end


def _safe_count(raw: int | None) -> int:
    """Clamp negative or None usage values to 0."""
    return max(0, raw or 0)


# ── Core: plan resolution ──────────────────────────────────────────────────────

def get_effective_plan(sub: UserSubscription) -> str:
    """
    Returns the plan code whose limits should be enforced right now.

    This is the single function every limit check must call.
    It is pure (no DB, no side-effects) and safe to call in hot paths.
    """
    from app.models.subscription import SubscriptionStatus

    status    = sub.status
    plan_code = _validate_plan_code(sub.plan_code)

    # ── 1. Paid subscription (active or grace period) ─────────────────────────
    if status == SubscriptionStatus.ACTIVE.value:
        return plan_code

    if status == SubscriptionStatus.PAST_DUE.value:
        # Grace period: do not lock out immediately on failed payment.
        return plan_code

    # ── 2. Trial ──────────────────────────────────────────────────────────────
    if status == SubscriptionStatus.TRIALING.value:
        if not is_trial_expired(sub.trial_ends_at):
            return TRIAL_PLAN_CODE
        # Trial expired but DB hasn't been flushed yet — treat as free.
        return FREE_PLAN_CODE

    # ── 3. Cancelled — may still be within the paid billing period ────────────
    if status == SubscriptionStatus.CANCELLED.value:
        if _period_still_active(sub.current_period_end):
            return plan_code
        return FREE_PLAN_CODE

    # ── 4. Free / expired / any other value → free ────────────────────────────
    return FREE_PLAN_CODE


# ── Resolved snapshot ──────────────────────────────────────────────────────────

@dataclass(frozen=True)
class ResolvedSub:
    """
    A fully-consistent, stale-proof snapshot of the subscription.
    Computed once per request; never read from DB again after this.

    Use this instead of raw sub.* fields in business logic.
    """
    resolved_status: str         # the "true" status (differs from DB when stale)
    effective_plan_code: str     # plan to enforce for all limit checks
    is_trial_active: bool
    trial_days_left: int | None  # None when not trialing


def resolve(sub: UserSubscription) -> ResolvedSub:
    """
    Builds a ResolvedSub from a UserSubscription row.

    Detects stale DB state (e.g. status=TRIALING but window already closed)
    and corrects it in the returned object without touching the DB.
    """
    from app.models.subscription import SubscriptionStatus

    effective_plan = get_effective_plan(sub)
    status         = sub.status

    # ── Trial state ───────────────────────────────────────────────────────────
    if status == SubscriptionStatus.TRIALING.value:
        if is_trial_expired(sub.trial_ends_at):
            # Stale: DB still says TRIALING but the window has closed.
            return ResolvedSub(
                resolved_status   = SubscriptionStatus.EXPIRED.value,
                effective_plan_code = FREE_PLAN_CODE,
                is_trial_active   = False,
                trial_days_left   = None,
            )
        # Active trial.
        ends_at   = sub.trial_ends_at  # not None — is_trial_expired would have caught it
        delta     = ends_at - _now()   # type: ignore[operator]
        days_left = max(0, math.ceil(delta.total_seconds() / 86_400))
        return ResolvedSub(
            resolved_status     = SubscriptionStatus.TRIALING.value,
            effective_plan_code = effective_plan,
            is_trial_active     = True,
            trial_days_left     = days_left,
        )

    # ── Cancelled but still in paid period ───────────────────────────────────
    if (
        status == SubscriptionStatus.CANCELLED.value
        and _period_still_active(sub.current_period_end)
    ):
        return ResolvedSub(
            resolved_status     = SubscriptionStatus.ACTIVE.value,
            effective_plan_code = effective_plan,
            is_trial_active     = False,
            trial_days_left     = None,
        )

    # ── All other states ──────────────────────────────────────────────────────
    return ResolvedSub(
        resolved_status     = status,
        effective_plan_code = effective_plan,
        is_trial_active     = False,
        trial_days_left     = None,
    )


# ── UserBillingStatus — lightweight public summary ────────────────────────────

@dataclass(frozen=True)
class UserBillingStatus:
    """
    The view sent to callers who need a quick billing summary.

    Example:
        {
            "plan":             "Professional",
            "plan_code":        "professional",
            "status":           "trialing",
            "remaining_posts":  42,
            "trial_days_left":  3,
        }
    """
    plan:             str
    plan_code:        str
    status:           str
    remaining_posts:  int        # -1 = unlimited
    trial_days_left:  int | None


def get_user_billing_status(
    sub: UserSubscription,
    usage: dict[str, int],
) -> UserBillingStatus:
    """
    Builds UserBillingStatus from a resolved subscription + current usage.

    usage must come from get_usage(); this function never touches the DB.
    """
    state    = resolve(sub)
    plan_def = get_plan(state.effective_plan_code)

    posts_used = _safe_count(usage.get("posts_per_month"))

    if is_unlimited(state.effective_plan_code, "posts_per_month"):
        remaining_posts = -1
    else:
        limit           = get_limit(state.effective_plan_code, "posts_per_month")
        remaining_posts = max(0, limit - posts_used)

    return UserBillingStatus(
        plan            = plan_def["display_name"],
        plan_code       = state.effective_plan_code,
        status          = state.resolved_status,
        remaining_posts = remaining_posts,
        trial_days_left = state.trial_days_left,
    )
