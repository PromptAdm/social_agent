"""
Definições de planos — fonte única da verdade para limites.

Mantido em código (não no banco) para:
  - zero queries extras no hot path
  - rollback instantâneo via deploy
  - diff claro no git quando limites mudam

Campos de limits:
  -1 → ilimitado
   N → máximo N unidades

Planos ativos:
  free         → usuários novos sem assinatura
  basic        → tier de entrada pago
  professional → tier intermediário pago
  premium      → tier topo ilimitado
  legacy       → usuários existentes antes do billing (acesso irrestrito preservado)
"""

from __future__ import annotations

from typing import TypedDict


class PlanLimits(TypedDict):
    brands: int           # máximo de brands que o usuário pode criar
    posts_per_month: int  # máximo de posts criados no mês calendário


class PlanDefinition(TypedDict):
    display_name: str
    limits: PlanLimits


# ── Catálogo de planos ─────────────────────────────────────────────────────────

PLANS: dict[str, PlanDefinition] = {
    "free": {
        "display_name": "Free",
        "limits": {
            "brands": 1,
            "posts_per_month": 10,
        },
    },
    "basic": {
        "display_name": "Basic",
        "limits": {
            "brands": 3,
            "posts_per_month": 50,
        },
    },
    "professional": {
        "display_name": "Professional",
        "limits": {
            "brands": 10,
            "posts_per_month": 200,
        },
    },
    "premium": {
        "display_name": "Premium",
        "limits": {
            "brands": -1,
            "posts_per_month": -1,
        },
    },
    # Plano especial: usuários que existiam antes do sistema de billing.
    # Recebe acesso irrestrito — nunca será bloqueado por limites.
    "legacy": {
        "display_name": "Legacy",
        "limits": {
            "brands": -1,
            "posts_per_month": -1,
        },
    },
}

# Plano padrão para usuários sem registro de assinatura
_FALLBACK_PLAN = "legacy"


def get_plan(plan_code: str) -> PlanDefinition:
    """Retorna a definição do plano; cai no legacy se código desconhecido."""
    return PLANS.get(plan_code, PLANS[_FALLBACK_PLAN])


def get_limit(plan_code: str, resource: str) -> int:
    """
    Retorna o limite numérico de um recurso para o plano.
    -1 = ilimitado.
    """
    return get_plan(plan_code)["limits"].get(resource, -1)


def is_unlimited(plan_code: str, resource: str) -> bool:
    return get_limit(plan_code, resource) == -1
