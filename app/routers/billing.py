"""
Router: Billing — plano atual, uso e limites do usuário autenticado.

Endpoints:
    GET /billing/summary  — retorna plano, uso e limites

Não altera estado, não processa pagamentos.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_active_user, get_db
from app.models.user import User
from app.schemas.billing import BillingSummary
from app.services import subscription_service

router = APIRouter(prefix="/billing", tags=["Billing"])


@router.get(
    "/summary",
    response_model=BillingSummary,
    summary="Plano atual, uso e limites",
    description=(
        "Retorna o plano do usuário autenticado, o consumo atual de recursos "
        "limitados (brands e posts no mês) e os limites máximos do plano. "
        "Quando monetization_enabled=false, os limites são exibidos mas não aplicados."
    ),
)
def get_billing_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> BillingSummary:
    return subscription_service.get_billing_summary(db, current_user.id)
