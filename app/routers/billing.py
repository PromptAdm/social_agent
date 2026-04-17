"""
Router: Billing — plano atual, uso, limites e listagem de planos.

Endpoints:
    GET /billing/summary  — plano atual + uso + limites + features
    GET /billing/plans    — lista todos os planos públicos (com is_current)
    GET /billing/usage    — só o uso atual (brands e posts do mês)

Não altera estado. Não processa pagamentos.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_active_user, get_db
from app.models.user import User
from app.schemas.billing import BillingSummary, PlanDetail, UsageSet
from app.services import subscription_service

router = APIRouter(prefix="/billing", tags=["Billing"])


@router.get(
    "/summary",
    response_model=BillingSummary,
    summary="Plano atual, uso, limites e features",
)
def get_billing_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> BillingSummary:
    """
    Retorna o plano do usuário autenticado, uso atual de recursos,
    limites máximos e features disponíveis.
    Quando monetization_enabled=false, os limites são exibidos mas não aplicados.
    """
    return subscription_service.get_billing_summary(db, current_user.id)


@router.get(
    "/plans",
    response_model=list[PlanDetail],
    summary="Lista os planos disponíveis",
)
def list_plans(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> list[PlanDetail]:
    """
    Retorna os planos públicos (Starter, Professional, Premium)
    com preços, limites e features. O plano atual do usuário é marcado com is_current=true.
    """
    summary = subscription_service.get_billing_summary(db, current_user.id)
    return subscription_service.list_public_plans(summary.plan_code)


@router.get(
    "/usage",
    response_model=UsageSet,
    summary="Uso atual de recursos",
)
def get_usage(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> UsageSet:
    """
    Retorna apenas o uso atual: brands criadas e posts criados no mês.
    Útil para polling leve sem recarregar o plano completo.
    """
    usage = subscription_service.get_usage(db, current_user.id)
    return UsageSet(
        brands=usage["brands"],
        posts_per_month=usage["posts_per_month"],
    )
