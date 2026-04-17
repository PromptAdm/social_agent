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
    scheduling: bool        # agendamento de posts
    analytics: bool         # relatórios e analytics avançados
    approval: bool          # fluxo de aprovação de conteúdo
    priority_support: bool  # suporte prioritário


class PlanDefinition(TypedDict):
    display_name: str
    price_monthly_cents: int   # preço mensal em centavos (0 = gratuito)
    price_yearly_cents: int    # preço por mês quando pago anualmente
    limits: PlanLimits
    features: PlanFeatures
    is_public: bool            # exibido na página de pricing


# ── Catálogo ───────────────────────────────────────────────────────────────────

PLANS: dict[str, PlanDefinition] = {
    # ── Planos vendidos ────────────────────────────────────────────────────────

    "starter": {
        "display_name": "Starter",
        "price_monthly_cents": 4900,   # R$49/mês
        "price_yearly_cents":  3900,   # R$39/mês se pago anualmente
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

    # ── Plano especial: usuários existentes antes do billing ───────────────────
    # Acesso irrestrito preservado — nunca bloqueado por limites ou features.
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

    # ── Aliases de backward compatibility (códigos antigos no banco) ───────────
    # Usuários com plan_code="free" ou "basic" recebem o mesmo acesso que "starter".
    "free": {
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
        "is_public": False,  # alias — não exibido na pricing page
    },
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
        "is_public": False,  # alias — não exibido na pricing page
    },
}

# Plano fallback quando o código não é reconhecido
_FALLBACK_PLAN = "legacy"

# Ordem de exibição na pricing page
PUBLIC_PLAN_ORDER = ["starter", "professional", "premium"]


# ── Helpers ────────────────────────────────────────────────────────────────────

def get_plan(plan_code: str) -> PlanDefinition:
    """Retorna a definição do plano; cai no legacy se código desconhecido."""
    return PLANS.get(plan_code, PLANS[_FALLBACK_PLAN])


def get_limit(plan_code: str, resource: str) -> int:
    """-1 = ilimitado."""
    return get_plan(plan_code)["limits"].get(resource, -1)


def is_unlimited(plan_code: str, resource: str) -> bool:
    return get_limit(plan_code, resource) == -1


def has_feature(plan_code: str, feature: str) -> bool:
    """Retorna True se o plano inclui a feature. Desconhecido → False."""
    return bool(get_plan(plan_code)["features"].get(feature, False))


def public_plans() -> list[tuple[str, PlanDefinition]]:
    """Retorna os planos públicos na ordem de exibição."""
    return [(code, PLANS[code]) for code in PUBLIC_PLAN_ORDER]
