"""
Catálogo de planos do Nezora — fonte única da verdade para limites, preços e features.

Mantido em código (não no banco) para:
  - zero queries extras no hot path
  - rollback instantâneo via deploy
  - diff claro no git quando limites ou preços mudam

Convenções:
  limits -1       → ilimitado
  price em cents  → R$49,00 = 4900 (sem floating-point)
  is_public       → aparece na página de pricing
"""

from __future__ import annotations

from typing import TypedDict


class PlanLimits(TypedDict):
    brands: int           # máximo de brands (-1 = ilimitado)
    posts_per_month: int  # máximo de posts no mês calendário (-1 = ilimitado)


class PlanFeatures(TypedDict):
    scheduling: bool
    analytics: bool
    approval: bool
    priority_support: bool


class PlanDefinition(TypedDict):
    display_name: str
    price_monthly_cents: int
    price_yearly_cents: int
    limits: PlanLimits
    features: PlanFeatures
    is_public: bool


# ── Catálogo ───────────────────────────────────────────────────────────────────

PLANS: dict[str, PlanDefinition] = {

    # ── Free tier — fallback after trial expiry, no payment ───────────────────
    # Restrictive by design: incentive to upgrade, but product still usable.
    "free": {
        "display_name": "Grátis",
        "price_monthly_cents": 0,
        "price_yearly_cents":  0,
        "limits": {
            "brands": 1,
            "posts_per_month": 10,
        },
        "features": {
            "scheduling":       False,
            "analytics":        False,
            "approval":         False,
            "priority_support": False,
        },
        "is_public": False,
    },

    # ── Planos vendidos ────────────────────────────────────────────────────────

    "starter": {
        "display_name": "Starter",
        "price_monthly_cents": 4900,   # R$49/mês
        "price_yearly_cents":  3900,   # R$39/mês anual
        "limits": {
            "brands": 3,
            "posts_per_month": 100,
        },
        "features": {
            "scheduling":       True,
            "analytics":        False,
            "approval":         False,
            "priority_support": False,
        },
        "is_public": True,
    },

    "professional": {
        "display_name": "Professional",
        "price_monthly_cents": 9900,   # R$99/mês
        "price_yearly_cents":  7900,   # R$79/mês anual
        "limits": {
            "brands": 10,
            "posts_per_month": 500,
        },
        "features": {
            "scheduling":       True,
            "analytics":        True,
            "approval":         True,
            "priority_support": False,
        },
        "is_public": True,
    },

    "premium": {
        "display_name": "Premium",
        "price_monthly_cents": 19900,  # R$199/mês
        "price_yearly_cents":  15900,  # R$159/mês anual
        "limits": {
            "brands": -1,
            "posts_per_month": -1,
        },
        "features": {
            "scheduling":       True,
            "analytics":        True,
            "approval":         True,
            "priority_support": True,
        },
        "is_public": True,
    },

    # ── Plano especial: usuários pré-billing — acesso irrestrito preservado ────
    "legacy": {
        "display_name": "Legacy",
        "price_monthly_cents": 0,
        "price_yearly_cents":  0,
        "limits": {
            "brands": -1,
            "posts_per_month": -1,
        },
        "features": {
            "scheduling":       True,
            "analytics":        True,
            "approval":         True,
            "priority_support": False,
        },
        "is_public": False,
    },

    # ── Backward-compat aliases ────────────────────────────────────────────────
    # Resolve to Starter — for rows written before plan codes were standardised.
    "basic": {
        "display_name": "Starter",
        "price_monthly_cents": 4900,
        "price_yearly_cents":  3900,
        "limits": {
            "brands": 3,
            "posts_per_month": 100,
        },
        "features": {
            "scheduling":       True,
            "analytics":        False,
            "approval":         False,
            "priority_support": False,
        },
        "is_public": False,
    },
}

# All plan codes the system recognises.  Anything else is invalid and will
# be coerced to FREE_PLAN_CODE by the state machine.
VALID_PLAN_CODES: frozenset[str] = frozenset(PLANS.keys())

# Fallback for plan catalog lookups (unknown code → safe, unrestricted).
# Note: the state machine has its own fallback (→ "free").
_CATALOG_FALLBACK = "legacy"

# Display order on the pricing page.
PUBLIC_PLAN_ORDER = ["starter", "professional", "premium"]


# ── Helpers ────────────────────────────────────────────────────────────────────

def get_plan(plan_code: str) -> PlanDefinition:
    """Returns plan definition; falls back to legacy for unknown codes."""
    return PLANS.get(plan_code, PLANS[_CATALOG_FALLBACK])


def get_limit(plan_code: str, resource: str) -> int:
    """-1 = ilimitado."""
    return get_plan(plan_code)["limits"].get(resource, -1)


def is_unlimited(plan_code: str, resource: str) -> bool:
    return get_limit(plan_code, resource) == -1


def has_feature(plan_code: str, feature: str) -> bool:
    return bool(get_plan(plan_code)["features"].get(feature, False))


def public_plans() -> list[tuple[str, PlanDefinition]]:
    return [(code, PLANS[code]) for code in PUBLIC_PLAN_ORDER]
