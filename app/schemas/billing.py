"""
Schemas Pydantic para o módulo de billing/assinaturas.
Usados nas respostas do router /billing.
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class LimitSet(BaseModel):
    """Limites do plano atual. -1 = ilimitado."""
    brands: int = Field(description="Máximo de brands (-1 = ilimitado)")
    posts_per_month: int = Field(description="Máximo de posts por mês (-1 = ilimitado)")


class UsageSet(BaseModel):
    """Uso atual do usuário no ciclo corrente."""
    brands: int = Field(description="Brands criadas até agora")
    posts_per_month: int = Field(description="Posts criados no mês calendário atual")


class BillingSummary(BaseModel):
    """Resposta completa de GET /billing/summary."""
    plan_code: str
    plan_name: str
    status: str
    trial_ends_at: datetime | None = None
    current_period_end: datetime | None = None
    limits: LimitSet
    usage: UsageSet
    monetization_enabled: bool = Field(
        description="Se false, limites são ignorados — somente informativo"
    )

    model_config = {"from_attributes": True}
