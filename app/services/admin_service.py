"""
Admin Service — super-admin-only platform operations.

All functions assume the caller has already validated is_superuser=True.
All mutations are logged to admin_audit_logs.
"""

from __future__ import annotations

import json
import logging
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.admin_audit_log import AdminAuditLog
from app.models.connected_account import ConnectedAccount
from app.models.credits import CreditLog, UserCredit
from app.models.feature_override import FeatureOverride
from app.models.post import Post
from app.models.brand import Brand
from app.models.subscription import SubscriptionStatus, UserSubscription
from app.models.stripe_event import StripeWebhookEvent
from app.models.user import User

logger = logging.getLogger(__name__)

# ── Revenue constants (BRL cents / month per plan) ─────────────────────────────
_PLAN_MRR_CENTS: dict[str, int] = {
    "starter":      2900,
    "professional": 7900,
    "premium":     14900,
}

# ── Internal helpers ───────────────────────────────────────────────────────────

def _month_key(dt: datetime) -> str:
    return dt.strftime("%Y-%m")


def _last_n_months(n: int, now: datetime) -> list[str]:
    keys = []
    for i in range(n - 1, -1, -1):
        d = now.replace(day=1) - timedelta(days=i * 28)
        keys.append(_month_key(d))
    return list(dict.fromkeys(keys))


def _log(
    db: Session,
    *,
    actor_id: int | None,
    target_id: int | None,
    action: str,
    old_value: Any = None,
    new_value: Any = None,
    notes: str | None = None,
) -> None:
    entry = AdminAuditLog(
        actor_user_id  = actor_id,
        target_user_id = target_id,
        action_type    = action,
        old_value      = json.dumps(old_value) if old_value is not None else None,
        new_value      = json.dumps(new_value) if new_value is not None else None,
        notes          = notes,
    )
    db.add(entry)


# ── Analytics / Dashboard ──────────────────────────────────────────────────────

def get_analytics(db: Session) -> dict:
    now         = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    thirty_ago  = now - timedelta(days=30)
    six_months  = now - timedelta(days=185)

    # Basic counts
    total_users = db.scalar(select(func.count(User.id))) or 0
    active_users = db.scalar(
        select(func.count(User.id)).where(User.last_login_at >= thirty_ago)
    ) or 0
    new_users_this_month = db.scalar(
        select(func.count(User.id)).where(User.created_at >= month_start)
    ) or 0

    # Posts
    total_posts     = db.scalar(select(func.count(Post.id))) or 0
    published_posts = db.scalar(select(func.count(Post.id)).where(Post.status == "publicado")) or 0
    scheduled_posts = db.scalar(select(func.count(Post.id)).where(Post.status == "agendado")) or 0

    # Images
    images_generated = db.scalar(
        select(func.count(CreditLog.id))
        .where(CreditLog.operation_type == "image_generation")
        .where(CreditLog.amount < 0)
    ) or 0

    # Subscriptions
    active_subs_rows = db.execute(
        select(UserSubscription.plan_code, func.count(UserSubscription.id))
        .where(UserSubscription.status.in_([
            SubscriptionStatus.ACTIVE.value,
            SubscriptionStatus.TRIALING.value,
        ]))
        .group_by(UserSubscription.plan_code)
    ).all()

    total_active_subs = sum(r[1] for r in active_subs_rows)
    mrr_cents   = sum(_PLAN_MRR_CENTS.get(r[0], 0) * r[1] for r in active_subs_rows
                      if r[0] not in ("trialing",))
    mrr_estimate = mrr_cents / 100.0

    # ARR
    arr_estimate = mrr_estimate * 12

    # Trial users
    trial_users = db.scalar(
        select(func.count(UserSubscription.id))
        .where(UserSubscription.status == SubscriptionStatus.TRIALING.value)
    ) or 0

    # Trial → Paid conversion (users who had a trial and now are ACTIVE)
    trial_converted = db.scalar(
        select(func.count(UserSubscription.id))
        .where(UserSubscription.status == SubscriptionStatus.ACTIVE.value)
        .where(UserSubscription.has_used_trial == True)  # noqa: E712
    ) or 0
    trial_total = db.scalar(
        select(func.count(UserSubscription.id))
        .where(UserSubscription.has_used_trial == True)  # noqa: E712
    ) or 0
    trial_conversion_rate = round((trial_converted / max(trial_total, 1)) * 100, 1)

    # Monthly churn
    cancelled_this_month = db.scalar(
        select(func.count(UserSubscription.id))
        .where(UserSubscription.status == SubscriptionStatus.CANCELLED.value)
    ) or 0
    churn_rate = round((cancelled_this_month / max(total_active_subs, 1)) * 100, 1)

    # Credits this month
    credits_sold_this_month = db.scalar(
        select(func.coalesce(func.sum(CreditLog.amount), 0))
        .where(CreditLog.operation_type == "purchase")
        .where(CreditLog.created_at >= month_start)
    ) or 0
    credits_consumed_this_month = abs(db.scalar(
        select(func.coalesce(func.sum(CreditLog.amount), 0))
        .where(CreditLog.amount < 0)
        .where(CreditLog.created_at >= month_start)
    ) or 0)

    # ARPU
    paying_users = db.scalar(
        select(func.count(UserSubscription.id))
        .where(UserSubscription.status == SubscriptionStatus.ACTIVE.value)
        .where(UserSubscription.stripe_subscription_id.isnot(None))
    ) or 0
    arpu = round(mrr_estimate / max(paying_users, 1), 2)

    # Plan distribution
    all_plan_rows = db.execute(
        select(UserSubscription.plan_code, func.count(UserSubscription.id))
        .group_by(UserSubscription.plan_code)
        .order_by(func.count(UserSubscription.id).desc())
    ).all()
    plan_distribution = [{"plan": r[0] or "free", "count": r[1]} for r in all_plan_rows]

    # Funnel
    instagram_connected = db.scalar(
        select(func.count(func.distinct(ConnectedAccount.user_id)))
        .where(ConnectedAccount.provider == "instagram")
        .where(ConnectedAccount.is_active == True)  # noqa: E712
    ) or 0
    users_with_posts = db.scalar(select(func.count(func.distinct(Post.brand_id)))) or 0
    funnel = {
        "signup":              {"label": "Signups",              "count": total_users},
        "instagram_connected": {"label": "Instagram Connected",  "count": instagram_connected},
        "first_post":          {"label": "First Post Created",   "count": users_with_posts},
        "subscribed":          {"label": "Paid Subscription",    "count": total_active_subs},
    }

    # Monthly charts
    months_keys = _last_n_months(6, now)

    recent_users = db.execute(
        select(User.created_at).where(User.created_at >= six_months)
    ).scalars().all()
    users_by_month: dict[str, int] = defaultdict(int)
    for dt in recent_users:
        users_by_month[_month_key(dt)] += 1
    new_users_chart = [{"month": m, "count": users_by_month.get(m, 0)} for m in months_keys]

    recent_posts = db.execute(
        select(Post.created_at).where(Post.created_at >= six_months)
    ).scalars().all()
    posts_by_month: dict[str, int] = defaultdict(int)
    for dt in recent_posts:
        posts_by_month[_month_key(dt)] += 1
    posts_chart = [{"month": m, "count": posts_by_month.get(m, 0)} for m in months_keys]

    recent_images = db.execute(
        select(CreditLog.created_at)
        .where(CreditLog.operation_type == "image_generation")
        .where(CreditLog.amount < 0)
        .where(CreditLog.created_at >= six_months)
    ).scalars().all()
    images_by_month: dict[str, int] = defaultdict(int)
    for dt in recent_images:
        images_by_month[_month_key(dt)] += 1
    images_chart = [{"month": m, "count": images_by_month.get(m, 0)} for m in months_keys]

    recent_logins = db.execute(
        select(User.last_login_at)
        .where(User.last_login_at >= thirty_ago)
        .where(User.last_login_at.isnot(None))
    ).scalars().all()
    logins_by_day: dict[str, int] = defaultdict(int)
    for dt in recent_logins:
        logins_by_day[dt.strftime("%Y-%m-%d")] += 1
    active_users_chart = [
        {"day": dt.strftime("%Y-%m-%d"), "count": logins_by_day.get(dt.strftime("%Y-%m-%d"), 0)}
        for dt in (now - timedelta(days=i) for i in range(29, -1, -1))
    ]

    return {
        "kpis": {
            "total_users":                total_users,
            "active_users":               active_users,
            "new_users_this_month":       new_users_this_month,
            "active_subscriptions":       total_active_subs,
            "trial_users":                trial_users,
            "trial_conversion_rate":      trial_conversion_rate,
            "mrr_estimate":               mrr_estimate,
            "arr_estimate":               arr_estimate,
            "churn_rate":                 churn_rate,
            "credits_sold_this_month":    credits_sold_this_month,
            "credits_consumed_this_month": credits_consumed_this_month,
            "arpu":                       arpu,
            "total_posts_generated":      total_posts,
            "total_posts_published":      published_posts,
            "total_posts_scheduled":      scheduled_posts,
            "total_images_generated":     images_generated,
        },
        "charts": {
            "new_users_per_month":  new_users_chart,
            "posts_per_month":      posts_chart,
            "images_per_month":     images_chart,
            "active_users_per_day": active_users_chart,
        },
        "plan_distribution": plan_distribution,
        "funnel":            funnel,
    }


# ── Customer management ────────────────────────────────────────────────────────

def list_customers(
    db: Session,
    *,
    search: str | None = None,
    plan_filter: str | None = None,
    status_filter: str | None = None,
    trial_filter: bool | None = None,
    limit: int = 50,
    offset: int = 0,
) -> dict:
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    q = (
        db.query(User)
        .outerjoin(UserSubscription, UserSubscription.user_id == User.id)
    )

    if search:
        like = f"%{search}%"
        q = q.filter(
            (User.email.ilike(like)) | (User.full_name.ilike(like))
        )
    if plan_filter:
        q = q.filter(UserSubscription.plan_code == plan_filter)
    if status_filter:
        q = q.filter(UserSubscription.status == status_filter)
    if trial_filter is True:
        q = q.filter(UserSubscription.status == SubscriptionStatus.TRIALING.value)
    elif trial_filter is False:
        q = q.filter(UserSubscription.status != SubscriptionStatus.TRIALING.value)

    total = q.count()
    users = q.order_by(User.created_at.desc()).offset(offset).limit(limit).all()

    rows = []
    for user in users:
        sub = db.query(UserSubscription).filter(UserSubscription.user_id == user.id).first()
        credit = db.query(UserCredit).filter(UserCredit.user_id == user.id).first()
        brand_count = db.query(func.count(Brand.id)).filter(Brand.owner_id == user.id).scalar() or 0
        posts_this_month = (
            db.query(func.count(Post.id))
            .join(Brand, Post.brand_id == Brand.id)
            .filter(Brand.owner_id == user.id, Post.created_at >= month_start)
            .scalar()
        ) or 0

        rows.append({
            "id":              user.id,
            "email":           user.email,
            "full_name":       user.full_name,
            "role":            user.role.value if user.role else None,
            "is_superuser":    user.is_superuser,
            "is_active":       user.is_active,
            "plan_code":       sub.plan_code if sub else "free",
            "stripe_status":   sub.status if sub else None,
            "is_trial_active": bool(sub and sub.status == SubscriptionStatus.TRIALING.value and sub.trial_ends_at and now < sub.trial_ends_at),
            "trial_ends_at":   sub.trial_ends_at.isoformat() if sub and sub.trial_ends_at else None,
            "stripe_customer_id":     sub.stripe_customer_id if sub else None,
            "stripe_subscription_id": sub.stripe_subscription_id if sub else None,
            "current_period_end":     sub.current_period_end.isoformat() if sub and sub.current_period_end else None,
            "credits_balance": credit.balance if credit else 0,
            "brands_count":    brand_count,
            "posts_this_month": posts_this_month,
            "last_login_at":   user.last_login_at.isoformat() if user.last_login_at else None,
            "created_at":      user.created_at.isoformat(),
        })

    return {"total": total, "offset": offset, "limit": limit, "customers": rows}


def get_customer_detail(db: Session, user_id: int) -> dict:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return {}

    sub    = db.query(UserSubscription).filter(UserSubscription.user_id == user_id).first()
    credit = db.query(UserCredit).filter(UserCredit.user_id == user_id).first()

    overrides = (
        db.query(FeatureOverride)
        .filter(FeatureOverride.user_id == user_id)
        .all()
    )

    audit_logs = (
        db.query(AdminAuditLog)
        .filter(AdminAuditLog.target_user_id == user_id)
        .order_by(AdminAuditLog.created_at.desc())
        .limit(20)
        .all()
    )

    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    brand_count = db.query(func.count(Brand.id)).filter(Brand.owner_id == user_id).scalar() or 0
    posts_this_month = (
        db.query(func.count(Post.id))
        .join(Brand, Post.brand_id == Brand.id)
        .filter(Brand.owner_id == user_id, Post.created_at >= month_start)
        .scalar()
    ) or 0

    return {
        "user": {
            "id":           user.id,
            "email":        user.email,
            "full_name":    user.full_name,
            "role":         user.role.value if user.role else None,
            "is_superuser": user.is_superuser,
            "is_active":    user.is_active,
            "last_login_at": user.last_login_at.isoformat() if user.last_login_at else None,
            "created_at":   user.created_at.isoformat(),
        },
        "subscription": {
            "plan_code":              sub.plan_code if sub else "free",
            "status":                 sub.status if sub else None,
            "billing_cycle":          sub.billing_cycle if sub else None,
            "is_trial_active":        bool(sub and sub.status == SubscriptionStatus.TRIALING.value and sub.trial_ends_at and now < sub.trial_ends_at),
            "trial_ends_at":          sub.trial_ends_at.isoformat() if sub and sub.trial_ends_at else None,
            "has_used_trial":         sub.has_used_trial if sub else False,
            "current_period_end":     sub.current_period_end.isoformat() if sub and sub.current_period_end else None,
            "cancel_at_period_end":   sub.cancel_at_period_end if sub else False,
            "stripe_customer_id":     sub.stripe_customer_id if sub else None,
            "stripe_subscription_id": sub.stripe_subscription_id if sub else None,
        },
        "credits": {
            "balance":         credit.balance if credit else 0,
            "lifetime_earned": credit.lifetime_earned if credit else 0,
        },
        "usage": {
            "brands_count":    brand_count,
            "posts_this_month": posts_this_month,
        },
        "feature_overrides": [
            {
                "feature":    o.feature,
                "enabled":    o.enabled,
                "reason":     o.reason,
                "expires_at": o.expires_at.isoformat() if o.expires_at else None,
                "is_active":  o.is_active,
            }
            for o in overrides
        ],
        "recent_audit_logs": [
            {
                "action_type": a.action_type,
                "old_value":   a.old_value,
                "new_value":   a.new_value,
                "notes":       a.notes,
                "created_at":  a.created_at.isoformat(),
            }
            for a in audit_logs
        ],
    }


def suspend_user(db: Session, user_id: int, actor_id: int) -> None:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise ValueError(f"User {user_id} not found")
    if user.is_superuser:
        raise ValueError("Cannot suspend a superuser account")
    _log(db, actor_id=actor_id, target_id=user_id, action="suspend_user",
         old_value={"is_active": user.is_active}, new_value={"is_active": False})
    user.is_active = False
    db.commit()


def reactivate_user(db: Session, user_id: int, actor_id: int) -> None:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise ValueError(f"User {user_id} not found")
    _log(db, actor_id=actor_id, target_id=user_id, action="reactivate_user",
         old_value={"is_active": user.is_active}, new_value={"is_active": True})
    user.is_active = True
    db.commit()


def reset_trial(db: Session, user_id: int, actor_id: int) -> None:
    sub = db.query(UserSubscription).filter(UserSubscription.user_id == user_id).first()
    if not sub:
        raise ValueError(f"No subscription found for user {user_id}")
    from app.billing.trial import trial_end_date
    _log(db, actor_id=actor_id, target_id=user_id, action="reset_trial",
         old_value={"has_used_trial": sub.has_used_trial, "status": sub.status},
         new_value={"has_used_trial": True, "status": "trialing"})
    sub.has_used_trial   = True
    sub.status           = SubscriptionStatus.TRIALING.value
    sub.trial_started_at = datetime.now(timezone.utc)
    sub.trial_ends_at    = trial_end_date()
    db.commit()


def change_plan(db: Session, user_id: int, actor_id: int, new_plan: str) -> None:
    sub = db.query(UserSubscription).filter(UserSubscription.user_id == user_id).first()
    if not sub:
        raise ValueError(f"No subscription found for user {user_id}")
    _log(db, actor_id=actor_id, target_id=user_id, action="change_plan",
         old_value={"plan_code": sub.plan_code}, new_value={"plan_code": new_plan})
    sub.plan_code = new_plan
    db.commit()


def adjust_credits(db: Session, user_id: int, actor_id: int, amount: int, reason: str) -> None:
    if amount == 0:
        raise ValueError("Amount must be non-zero")
    from app.services.credits_service import get_or_create
    credit = get_or_create(db, user_id)
    old_balance = credit.balance
    credit.balance = max(0, credit.balance + amount)
    if amount > 0:
        credit.lifetime_earned += amount
    from app.models.credits import CreditLog
    log = CreditLog(
        user_id        = user_id,
        amount         = amount,
        operation_type = "admin_adjustment",
        description    = f"Admin adjustment by user {actor_id}: {reason}",
    )
    db.add(log)
    _log(db, actor_id=actor_id, target_id=user_id, action="adjust_credits",
         old_value={"balance": old_balance}, new_value={"balance": credit.balance},
         notes=reason)
    db.commit()


def impersonate_user(db: Session, user_id: int, actor_id: int) -> dict:
    """Returns a short-lived access token for the target user."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise ValueError(f"User {user_id} not found")
    if user.is_superuser:
        raise ValueError("Cannot impersonate a superuser account")

    from app.core.security import create_token_pair
    access_token, _ = create_token_pair(user_id)
    _log(db, actor_id=actor_id, target_id=user_id, action="impersonate",
         notes=f"Impersonation token generated for user {user_id}")
    db.commit()
    return {"access_token": access_token, "user_id": user_id, "email": user.email}


# ── Feature overrides ──────────────────────────────────────────────────────────

ALLOWED_FEATURES = {"analytics", "approval", "scheduling", "priority_support",
                    "image_generation", "video_subtitle", "beta_access"}


def list_feature_overrides(db: Session, user_id: int | None = None) -> list[dict]:
    q = db.query(FeatureOverride)
    if user_id:
        q = q.filter(FeatureOverride.user_id == user_id)
    overrides = q.order_by(FeatureOverride.created_at.desc()).all()
    return [
        {
            "id":         o.id,
            "user_id":    o.user_id,
            "feature":    o.feature,
            "enabled":    o.enabled,
            "reason":     o.reason,
            "expires_at": o.expires_at.isoformat() if o.expires_at else None,
            "is_active":  o.is_active,
            "created_at": o.created_at.isoformat(),
        }
        for o in overrides
    ]


def set_feature_override(
    db: Session,
    *,
    actor_id: int,
    user_id: int,
    feature: str,
    enabled: bool,
    reason: str | None = None,
    expires_at: datetime | None = None,
) -> dict:
    if feature not in ALLOWED_FEATURES:
        raise ValueError(f"Unknown feature: {feature!r}. Allowed: {sorted(ALLOWED_FEATURES)}")

    override = (
        db.query(FeatureOverride)
        .filter(FeatureOverride.user_id == user_id, FeatureOverride.feature == feature)
        .first()
    )
    if override:
        old = {"enabled": override.enabled, "reason": override.reason}
        override.enabled    = enabled
        override.reason     = reason
        override.granted_by = actor_id
        override.expires_at = expires_at
    else:
        old = None
        override = FeatureOverride(
            user_id    = user_id,
            feature    = feature,
            enabled    = enabled,
            reason     = reason,
            granted_by = actor_id,
            expires_at = expires_at,
        )
        db.add(override)

    _log(db, actor_id=actor_id, target_id=user_id,
         action="set_feature_override",
         old_value=old,
         new_value={"feature": feature, "enabled": enabled, "reason": reason})
    db.commit()
    db.refresh(override)
    return {
        "user_id":    override.user_id,
        "feature":    override.feature,
        "enabled":    override.enabled,
        "reason":     override.reason,
        "expires_at": override.expires_at.isoformat() if override.expires_at else None,
        "is_active":  override.is_active,
    }


def delete_feature_override(db: Session, *, actor_id: int, user_id: int, feature: str) -> None:
    override = (
        db.query(FeatureOverride)
        .filter(FeatureOverride.user_id == user_id, FeatureOverride.feature == feature)
        .first()
    )
    if not override:
        raise ValueError(f"No override found for user {user_id} feature {feature}")
    _log(db, actor_id=actor_id, target_id=user_id, action="delete_feature_override",
         old_value={"feature": feature, "enabled": override.enabled})
    db.delete(override)
    db.commit()


# ── Billing ops ────────────────────────────────────────────────────────────────

def list_billing_subscriptions(
    db: Session,
    *,
    status_filter: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> dict:
    q = db.query(UserSubscription).join(User, UserSubscription.user_id == User.id)
    if status_filter:
        q = q.filter(UserSubscription.status == status_filter)

    total = q.count()
    subs  = q.order_by(UserSubscription.updated_at.desc()).offset(offset).limit(limit).all()

    rows = []
    for sub in subs:
        user = db.query(User).filter(User.id == sub.user_id).first()
        rows.append({
            "user_id":                sub.user_id,
            "email":                  user.email if user else None,
            "full_name":              user.full_name if user else None,
            "plan_code":              sub.plan_code,
            "status":                 sub.status,
            "billing_cycle":          sub.billing_cycle,
            "stripe_customer_id":     sub.stripe_customer_id,
            "stripe_subscription_id": sub.stripe_subscription_id,
            "current_period_end":     sub.current_period_end.isoformat() if sub.current_period_end else None,
            "trial_ends_at":          sub.trial_ends_at.isoformat() if sub.trial_ends_at else None,
            "cancel_at_period_end":   sub.cancel_at_period_end,
            "updated_at":             sub.updated_at.isoformat(),
        })

    return {"total": total, "offset": offset, "limit": limit, "subscriptions": rows}


def list_webhook_logs(db: Session, limit: int = 100, offset: int = 0) -> dict:
    total = db.query(func.count(StripeWebhookEvent.id)).scalar() or 0
    events = (
        db.query(StripeWebhookEvent)
        .order_by(StripeWebhookEvent.processed_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return {
        "total": total,
        "offset": offset,
        "limit": limit,
        "events": [
            {
                "id":             e.id,
                "stripe_event_id": e.stripe_event_id,
                "event_type":     e.event_type,
                "processed_at":   e.processed_at.isoformat(),
            }
            for e in events
        ],
    }


def list_credit_purchases(db: Session, limit: int = 50, offset: int = 0) -> dict:
    q = db.query(CreditLog).filter(CreditLog.operation_type == "purchase")
    total = q.count()
    logs  = q.order_by(CreditLog.created_at.desc()).offset(offset).limit(limit).all()
    return {
        "total": total,
        "offset": offset,
        "limit": limit,
        "purchases": [
            {
                "id":          l.id,
                "user_id":     l.user_id,
                "amount":      l.amount,
                "description": l.description,
                "created_at":  l.created_at.isoformat(),
            }
            for l in logs
        ],
    }


# ── Audit logs ─────────────────────────────────────────────────────────────────

def list_audit_logs(
    db: Session,
    *,
    actor_id: int | None = None,
    target_id: int | None = None,
    action_filter: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> dict:
    q = db.query(AdminAuditLog)
    if actor_id:
        q = q.filter(AdminAuditLog.actor_user_id == actor_id)
    if target_id:
        q = q.filter(AdminAuditLog.target_user_id == target_id)
    if action_filter:
        q = q.filter(AdminAuditLog.action_type == action_filter)

    total = q.count()
    logs  = q.order_by(AdminAuditLog.created_at.desc()).offset(offset).limit(limit).all()

    return {
        "total": total,
        "offset": offset,
        "limit": limit,
        "logs": [
            {
                "id":             l.id,
                "actor_user_id":  l.actor_user_id,
                "target_user_id": l.target_user_id,
                "action_type":    l.action_type,
                "old_value":      l.old_value,
                "new_value":      l.new_value,
                "notes":          l.notes,
                "created_at":     l.created_at.isoformat(),
            }
            for l in logs
        ],
    }
