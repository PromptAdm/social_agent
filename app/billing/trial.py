"""
Trial logic — pure functions, no DB access.

Rules:
  - 7 days, once per user, Professional limits during trial
  - Backend-controlled: frontend never decides trial eligibility
  - Trial expiry is passive (checked on access), not event-driven

Plan resolution during trial lives in app.billing.state_machine.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

TRIAL_DAYS = 7
TRIAL_PLAN_CODE = "professional"  # limits applied during an active trial


def trial_end_date() -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=TRIAL_DAYS)


def is_trial_expired(trial_ends_at: datetime | None) -> bool:
    if trial_ends_at is None:
        return True
    return datetime.now(timezone.utc) >= trial_ends_at
