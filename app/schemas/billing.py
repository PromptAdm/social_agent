"""
Pydantic schemas for the /billing router.
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


# ── Shared sub-models ─────────────────────────────────────────────────────────

class LimitSet(BaseModel):
    """Plan limits. -1 = unlimited."""
    brands:          int = Field(description="Max brands (-1 = unlimited)")
    posts_per_month: int = Field(description="Max posts per calendar month (-1 = unlimited)")


class UsageSet(BaseModel):
    """Current usage for the authenticated user."""
    brands:          int
    posts_per_month: int


class PlanFeatures(BaseModel):
    scheduling:       bool
    analytics:        bool
    approval:         bool
    priority_support: bool


# ── Plan listing ──────────────────────────────────────────────────────────────

class PlanDetail(BaseModel):
    """Single plan entry in GET /billing/plans."""
    code:                str
    display_name:        str
    price_monthly_cents: int = Field(description="Monthly price in BRL cents")
    price_yearly_cents:  int = Field(description="Price per month on annual plan (BRL cents)")
    limits:              LimitSet
    features:            PlanFeatures
    is_current:          bool = False


# ── Billing summary ───────────────────────────────────────────────────────────

class BillingSummary(BaseModel):
    """Full response for GET /billing/summary."""
    # Stored plan (what's in the DB)
    plan_code:            str
    plan_name:            str
    # Resolved plan (what limits actually apply right now)
    effective_plan_code:  str = Field(
        description="The plan code whose limits are enforced (may differ from plan_code during trial)"
    )
    # Status
    status:               str
    billing_cycle:        str = "monthly"
    # Trial
    trial_started_at:     datetime | None = None
    trial_ends_at:        datetime | None = None
    has_used_trial:       bool = False
    is_trial_active:      bool = False
    trial_days_left:      int | None = None
    # Billing period
    current_period_start: datetime | None = None
    current_period_end:   datetime | None = None
    cancel_at_period_end: bool = False
    # Limits and usage
    limits:               LimitSet
    usage:                UsageSet
    features:             PlanFeatures
    # Flags
    monetization_enabled: bool = Field(description="When false, limits are informational only")
    stripe_enabled:       bool = False

    model_config = {"from_attributes": True}


# ── Lightweight billing status ────────────────────────────────────────────────

class BillingStatus(BaseModel):
    """
    Lightweight response for GET /billing/status.

    Returns the resolved state without a full plan comparison table.
    Designed for quick checks (e.g., showing remaining posts in a sidebar).

    Example:
        {
            "plan":             "Professional",
            "plan_code":        "professional",
            "status":           "trialing",
            "remaining_posts":  42,
            "trial_days_left":  3
        }
    """
    plan:            str
    plan_code:       str
    status:          str
    remaining_posts: int        = Field(description="-1 = unlimited")
    trial_days_left: int | None = None


# ── Trial ─────────────────────────────────────────────────────────────────────

class TrialStartResponse(BaseModel):
    trial_started_at: datetime
    trial_ends_at:    datetime
    plan_code:        str
    status:           str


# ── Checkout ─────────────────────────────────────────────────────────────────

class CheckoutRequest(BaseModel):
    plan_code:                 str = Field(description="starter | professional | premium")
    billing_cycle:             str = Field(default="monthly", description="monthly | yearly")
    payment_method_preference: str = Field(
        default="card",
        description="card (Stripe) | pix (not yet available)",
    )


class CheckoutResponse(BaseModel):
    checkout_url: str


class PortalResponse(BaseModel):
    portal_url: str
