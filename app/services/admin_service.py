"""
Admin Analytics Service
Queries the database for platform-wide KPIs and chart data.
All queries are read-only — no side effects.

Access: superuser only (enforced at the router level).
"""

from collections import defaultdict
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.connected_account import ConnectedAccount
from app.models.credits import CreditLog
from app.models.post import Post
from app.models.subscription import SubscriptionStatus, UserSubscription
from app.models.user import User

# Monthly revenue estimate per active plan (USD)
_PLAN_MRR: dict[str, float] = {
    "starter":      29.0,
    "professional": 79.0,
    "premium":     149.0,
}


def _month_key(dt: datetime) -> str:
    return dt.strftime("%Y-%m")


def _last_n_months(n: int, now: datetime) -> list[str]:
    keys = []
    for i in range(n - 1, -1, -1):
        d = now.replace(day=1) - timedelta(days=i * 28)
        keys.append(_month_key(d))
    return list(dict.fromkeys(keys))  # deduplicate while preserving order


def get_analytics(db: Session) -> dict:
    now         = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    thirty_ago  = now - timedelta(days=30)
    six_months  = now - timedelta(days=185)

    # ── KPIs ──────────────────────────────────────────────────────────────────────

    total_users = db.scalar(select(func.count(User.id))) or 0

    active_users = db.scalar(
        select(func.count(User.id)).where(User.last_login_at >= thirty_ago)
    ) or 0

    new_users_this_month = db.scalar(
        select(func.count(User.id)).where(User.created_at >= month_start)
    ) or 0

    total_posts = db.scalar(select(func.count(Post.id))) or 0

    published_posts = db.scalar(
        select(func.count(Post.id)).where(Post.status == "publicado")
    ) or 0

    scheduled_posts = db.scalar(
        select(func.count(Post.id)).where(Post.status == "agendado")
    ) or 0

    images_generated = db.scalar(
        select(func.count(CreditLog.id))
        .where(CreditLog.operation_type == "image_generation")
        .where(CreditLog.amount < 0)
    ) or 0

    active_subs = db.execute(
        select(UserSubscription.plan_code, func.count(UserSubscription.id))
        .where(UserSubscription.status.in_([
            SubscriptionStatus.ACTIVE.value,
            SubscriptionStatus.TRIALING.value,
        ]))
        .group_by(UserSubscription.plan_code)
    ).all()

    total_active_subs = sum(row[1] for row in active_subs)
    mrr_estimate = sum(_PLAN_MRR.get(row[0], 0) * row[1] for row in active_subs)

    cancelled_this_month = db.scalar(
        select(func.count(UserSubscription.id))
        .where(UserSubscription.status == SubscriptionStatus.CANCELLED.value)
    ) or 0

    churn_rate = round(
        (cancelled_this_month / max(total_users, 1)) * 100, 1
    )

    # ── Plan distribution ─────────────────────────────────────────────────────────

    all_plan_rows = db.execute(
        select(UserSubscription.plan_code, func.count(UserSubscription.id))
        .group_by(UserSubscription.plan_code)
        .order_by(func.count(UserSubscription.id).desc())
    ).all()

    plan_distribution = [
        {"plan": row[0] or "free", "count": row[1]}
        for row in all_plan_rows
    ]

    # ── Funnel ────────────────────────────────────────────────────────────────────

    instagram_connected = db.scalar(
        select(func.count(func.distinct(ConnectedAccount.user_id)))
        .where(ConnectedAccount.provider == "instagram")
        .where(ConnectedAccount.is_active == True)  # noqa: E712
    ) or 0

    users_with_posts = db.scalar(
        select(func.count(func.distinct(Post.brand_id)))
    ) or 0

    subscribed_users = total_active_subs

    funnel = {
        "signup":              {"label": "Signups",              "count": total_users},
        "instagram_connected": {"label": "Instagram Connected",  "count": instagram_connected},
        "first_post":          {"label": "First Post Created",   "count": users_with_posts},
        "subscribed":          {"label": "Paid Subscription",    "count": subscribed_users},
    }

    # ── Monthly charts (last 6 months, Python-side aggregation) ──────────────────

    months_keys = _last_n_months(6, now)

    # New users per month
    recent_users = db.execute(
        select(User.created_at)
        .where(User.created_at >= six_months)
    ).scalars().all()

    users_by_month: dict[str, int] = defaultdict(int)
    for dt in recent_users:
        users_by_month[_month_key(dt)] += 1

    new_users_chart = [
        {"month": m, "count": users_by_month.get(m, 0)}
        for m in months_keys
    ]

    # Posts generated per month
    recent_posts = db.execute(
        select(Post.created_at)
        .where(Post.created_at >= six_months)
    ).scalars().all()

    posts_by_month: dict[str, int] = defaultdict(int)
    for dt in recent_posts:
        posts_by_month[_month_key(dt)] += 1

    posts_chart = [
        {"month": m, "count": posts_by_month.get(m, 0)}
        for m in months_keys
    ]

    # Images generated per month
    recent_images = db.execute(
        select(CreditLog.created_at)
        .where(CreditLog.operation_type == "image_generation")
        .where(CreditLog.amount < 0)
        .where(CreditLog.created_at >= six_months)
    ).scalars().all()

    images_by_month: dict[str, int] = defaultdict(int)
    for dt in recent_images:
        images_by_month[_month_key(dt)] += 1

    images_chart = [
        {"month": m, "count": images_by_month.get(m, 0)}
        for m in months_keys
    ]

    # Active users per day (last 30 days) — users who logged in each day
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
            "total_users":          total_users,
            "active_users":         active_users,
            "new_users_this_month": new_users_this_month,
            "active_subscriptions": total_active_subs,
            "mrr_estimate":         mrr_estimate,
            "churn_rate":           churn_rate,
            "total_posts_generated": total_posts,
            "total_posts_published": published_posts,
            "total_posts_scheduled": scheduled_posts,
            "total_images_generated": images_generated,
        },
        "charts": {
            "new_users_per_month":    new_users_chart,
            "posts_per_month":        posts_chart,
            "images_per_month":       images_chart,
            "active_users_per_day":   active_users_chart,
        },
        "plan_distribution": plan_distribution,
        "funnel":            funnel,
    }
