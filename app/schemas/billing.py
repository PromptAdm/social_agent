"""
Schemas Pydantic para o módulo de billing/assinaturas.
Usados nas respostas do router /billing.
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


# ── Limites e uso ─────────────────────────────────────────────────────────────

class LimitSet(BaseModel):
    """Limites do plano. -1 = ilimitado."""
    brands: int = Field(description="Máximo de brands (-1 = ilimitado)")
    posts_per_month: int = Field(description="Máximo de posts por mês (-1 = ilimitado)")


class UsageSet(BaseModel):
    """Uso atual do usuário no ciclo corrente."""
    brands: int = Field(description="Brands criadas até agora")
    posts_per_month: int = Field(description="Posts criados no mês calendário atual")


# ── Features ──────────────────────────────────────────────────────────────────

class PlanFeatures(BaseModel):
    """Features incluídas no plano."""
    scheduling:       bool
    analytics:        bool
    approval:         bool
    priority_support: bool


# ── Plano (para listagem pública) ─────────────────────────────────────────────

class PlanDetail(BaseModel):
    """Detalhe de um plano — usado em GET /billing/plans."""
    code:                 str
    display_name:         str
    price_monthly_cents:  int = Field(description="Preço mensal em centavos")
    price_yearly_cents:   int = Field(description="Preço por mês no plano anual (em centavos)")
    limits:               LimitSet
    features:             PlanFeatures
    is_current:           bool = False  # preenchido dinamicamente pelo endpoint


# ── Resumo do usuário ─────────────────────────────────────────────────────────

class BillingSummary(BaseModel):
    """Resposta completa de GET /billing/summary."""
    plan_code:            str
    plan_name:            str
    status:               str
    billing_cycle:        str = "monthly"          # monthly | yearly
    trial_started_at:     datetime | None = None
    trial_ends_at:        datetime | None = None
    has_used_trial:       bool = False
    is_trial_active:      bool = False
    current_period_start: datetime | None = None
    current_period_end:   datetime | None = None
    cancel_at_period_end: bool = False
    limits:               LimitSet
    usage:                UsageSet
    features:             PlanFeatures
    monetization_enabled: bool = Field(
        description="Se false, limites são ignorados — somente informativo"
    )
    stripe_enabled: bool = Field(
        default=False,
        description="Se true, botões de upgrade redirecionam para o Stripe"
    )

    model_config = {"from_attributes": True}


class TrialStartResponse(BaseModel):
    """Resposta de POST /billing/trial/start."""
    trial_started_at: datetime
    trial_ends_at:    datetime
    plan_code:        str
    status:           str
