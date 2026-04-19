"""
SubscriptionService — lógica central de billing/planos.

Regras de negócio:
  1. Usuários sem linha na tabela → recebem "legacy" (ilimitado) na criação lazy.
  2. Quando MONETIZATION_ENABLED=false → check_limit() sempre retorna (True, None).
  3. Limites -1 → ilimitado, nunca bloqueia.
  4. Contagem de posts usa o mês calendário corrente (UTC).
  5. Nunca lança exceção ao verificar limites — retorna (bool, msg) para o caller decidir.

Ponto único de acoplamento com billing:
  - brands.py / posts.py usam plan_limit() dependency de core/dependencies.py
  - dependency chama check_limit() daqui
  - nada mais importa este módulo fora de billing + routers/billing
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.billing.plans import get_limit, get_plan, is_unlimited, public_plans
from app.billing.trial import effective_plan_code, trial_end_date
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

logger = logging.getLogger(__name__)
settings = get_settings()


# ── Helpers internos ───────────────────────────────────────────────────────────

def _start_of_month() -> datetime:
    """Primeiro instante do mês calendário corrente em UTC."""
    now = datetime.now(timezone.utc)
    return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def _features_schema(plan_code: str) -> PlanFeatures:
    feat = get_plan(plan_code)["features"]
    return PlanFeatures(
        scheduling=feat["scheduling"],
        analytics=feat["analytics"],
        approval=feat["approval"],
        priority_support=feat["priority_support"],
    )


# ── Criar / obter assinatura ───────────────────────────────────────────────────

def get_or_create(db: Session, user_id: int) -> UserSubscription:
    """
    Retorna a assinatura do usuário; cria com plan_code="legacy" se não existir.

    "legacy" = usuário existia antes do billing → acesso irrestrito preservado.
    Novos usuários criados após MONETIZATION_ENABLED=true devem receber "starter"
    (responsabilidade do auth_service.register).
    """
    sub = (
        db.query(UserSubscription)
        .filter(UserSubscription.user_id == user_id)
        .first()
    )
    if sub is None:
        # Legacy plan for users who existed before billing was introduced.
        # New users created via register() already get "starter" + trial.
        sub = UserSubscription(
            user_id=user_id,
            plan_code="legacy",
            status="active",
            billing_cycle="monthly",
            cancel_at_period_end=False,
        )
        db.add(sub)
        try:
            db.commit()
            db.refresh(sub)
        except Exception:
            db.rollback()
            # Race condition: outra thread criou antes — re-busca
            sub = (
                db.query(UserSubscription)
                .filter(UserSubscription.user_id == user_id)
                .first()
            )
    return sub


# ── Uso atual ──────────────────────────────────────────────────────────────────

def get_usage(db: Session, user_id: int) -> dict[str, int]:
    """
    Retorna o uso atual do usuário para recursos limitados.
    Independente de MONETIZATION_ENABLED — sempre disponível para exibição.
    """
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
            Post.created_at >= _start_of_month(),
        )
        .scalar()
        or 0
    )

    return {
        "brands": brand_count,
        "posts_per_month": post_count,
    }


# ── Verificação de limite ──────────────────────────────────────────────────────

def check_limit(db: Session, user_id: int, resource: str) -> tuple[bool, str | None]:
    """
    Verifica se o usuário pode criar mais de `resource`.

    Retorna:
        (True, None)         → permitido
        (False, "mensagem")  → bloqueado, mensagem amigável para o frontend

    Nunca lança exceção — o caller decide como responder ao False.
    """
    if not settings.MONETIZATION_ENABLED:
        return (True, None)

    try:
        sub = get_or_create(db, user_id)
        _expire_trial_if_needed(db, sub)

        plan_code = effective_plan_code(sub.plan_code, sub.status, sub.trial_ends_at)

        if is_unlimited(plan_code, resource):
            return (True, None)

        limit = get_limit(plan_code, resource)
        usage = get_usage(db, user_id)
        current = usage.get(resource, 0)

        if current >= limit:
            plan_name = get_plan(plan_code)["display_name"]
            resource_label = {
                "brands": "marcas",
                "posts_per_month": "posts este mês",
            }.get(resource, resource)
            return (
                False,
                f"Limite do plano {plan_name} atingido: "
                f"{current}/{limit} {resource_label}. "
                f"Faça upgrade para continuar.",
            )

        return (True, None)

    except Exception as exc:
        logger.warning("check_limit falhou: user=%s resource=%s err=%s", user_id, resource, exc)
        return (True, None)  # fail-open


# ── Trial ─────────────────────────────────────────────────────────────────────

def _expire_trial_if_needed(db: Session, sub: UserSubscription) -> None:
    """Passively expire trial when the period is over. No-op if not trialing."""
    if sub.status != SubscriptionStatus.TRIALING.value:
        return
    if sub.trial_ends_at is None or datetime.now(timezone.utc) < sub.trial_ends_at:
        return
    sub.status = SubscriptionStatus.ACTIVE.value
    db.commit()


def start_trial(db: Session, user_id: int) -> UserSubscription:
    """
    Activates the 7-day Professional trial for a user.

    Raises ValueError if:
      - The user has already used their trial.
      - The user is currently trialing.
    """
    sub = get_or_create(db, user_id)

    if sub.has_used_trial:
        raise ValueError("Trial já utilizado. Cada usuário tem direito a um único trial.")

    if sub.status == SubscriptionStatus.TRIALING.value:
        raise ValueError("Trial já está ativo.")

    now = datetime.now(timezone.utc)
    sub.status = SubscriptionStatus.TRIALING.value
    sub.trial_started_at = now
    sub.trial_ends_at = trial_end_date()
    sub.has_used_trial = True
    db.commit()
    db.refresh(sub)
    return sub


# ── Convenience wrappers ───────────────────────────────────────────────────────

def can_create_brand(db: Session, user_id: int) -> tuple[bool, str | None]:
    return check_limit(db, user_id, "brands")


def can_create_post(db: Session, user_id: int) -> tuple[bool, str | None]:
    return check_limit(db, user_id, "posts_per_month")


def get_remaining_posts(db: Session, user_id: int) -> int:
    """Returns remaining posts for the month. -1 = unlimited."""
    if not settings.MONETIZATION_ENABLED:
        return -1
    sub = get_or_create(db, user_id)
    plan_code = effective_plan_code(sub.plan_code, sub.status, sub.trial_ends_at)
    if is_unlimited(plan_code, "posts_per_month"):
        return -1
    limit = get_limit(plan_code, "posts_per_month")
    usage = get_usage(db, user_id)
    return max(0, limit - usage.get("posts_per_month", 0))


# ── Resumo completo ────────────────────────────────────────────────────────────

def get_billing_summary(db: Session, user_id: int) -> BillingSummary:
    """Retorna plano + uso + limites + features do usuário."""
    sub = get_or_create(db, user_id)
    _expire_trial_if_needed(db, sub)

    active_plan_code = effective_plan_code(sub.plan_code, sub.status, sub.trial_ends_at)
    plan = get_plan(active_plan_code)
    limits = plan["limits"]
    usage = get_usage(db, user_id)

    return BillingSummary(
        plan_code=sub.plan_code,
        plan_name=get_plan(sub.plan_code)["display_name"],
        status=sub.status,
        billing_cycle=getattr(sub, "billing_cycle", "monthly"),
        trial_started_at=sub.trial_started_at,
        trial_ends_at=sub.trial_ends_at,
        has_used_trial=sub.has_used_trial,
        is_trial_active=sub.is_trial_active,
        current_period_start=getattr(sub, "current_period_start", None),
        current_period_end=sub.current_period_end,
        cancel_at_period_end=getattr(sub, "cancel_at_period_end", False),
        limits=LimitSet(
            brands=limits["brands"],
            posts_per_month=limits["posts_per_month"],
        ),
        usage=UsageSet(
            brands=usage["brands"],
            posts_per_month=usage["posts_per_month"],
        ),
        features=_features_schema(active_plan_code),
        monetization_enabled=settings.MONETIZATION_ENABLED,
        stripe_enabled=settings.STRIPE_ENABLED,
    )


# ── Listagem de planos públicos ────────────────────────────────────────────────

def list_public_plans(current_plan_code: str) -> list[PlanDetail]:
    """
    Retorna os planos visíveis na pricing page, marcando qual é o plano atual.
    """
    result = []
    for code, plan in public_plans():
        limits = plan["limits"]
        feat = plan["features"]
        result.append(PlanDetail(
            code=code,
            display_name=plan["display_name"],
            price_monthly_cents=plan["price_monthly_cents"],
            price_yearly_cents=plan["price_yearly_cents"],
            limits=LimitSet(
                brands=limits["brands"],
                posts_per_month=limits["posts_per_month"],
            ),
            features=PlanFeatures(
                scheduling=feat["scheduling"],
                analytics=feat["analytics"],
                approval=feat["approval"],
                priority_support=feat["priority_support"],
            ),
            is_current=(code == current_plan_code),
        ))
    return result
