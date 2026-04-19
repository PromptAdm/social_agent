"""
Trial logic — pure functions, no DB access.

Rules:
  - 7 days, once per user, Professional limits during trial
  - Backend-controlled: frontend never decides trial eligibility
  - Trial expiry is passive (checked on access), not event-driven
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

TRIAL_DAYS = 7
TRIAL_PLAN_CODE = "professional"


def trial_end_date() -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=TRIAL_DAYS)


def is_trial_expired(trial_ends_at: datetime | None) -> bool:
    if trial_ends_at is None:
        return True
    return datetime.now(timezone.utc) >= trial_ends_at


def effective_plan_code(plan_code: str, status: str, trial_ends_at: datetime | None) -> str:
    """
    Returns the plan code to use for limit checks.
    During an active trial, Professional limits apply regardless of stored plan_code.
    """
    from app.models.subscription import SubscriptionStatus
    if (
        status == SubscriptionStatus.TRIALING.value
        and not is_trial_expired(trial_ends_at)
    ):
        return TRIAL_PLAN_CODE
    return plan_code
