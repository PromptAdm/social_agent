from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_active_user, get_db
from app.models.user import User
from app.schemas.credits import CreditBalanceOut, CreditLogsPage, CreditLogOut
from app.services import credit_service

router = APIRouter(prefix="/credits", tags=["credits"])


@router.get("/balance", response_model=CreditBalanceOut)
def get_my_balance(
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_active_user),
) -> CreditBalanceOut:
    credit = credit_service.get_balance(db, current_user.id)
    return CreditBalanceOut.model_validate(credit)


@router.get("/logs", response_model=CreditLogsPage)
def get_my_logs(
    limit:        int     = Query(default=50, ge=1, le=200),
    offset:       int     = Query(default=0,  ge=0),
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_active_user),
) -> CreditLogsPage:
    logs, total = credit_service.get_logs(db, current_user.id, limit=limit, offset=offset)
    return CreditLogsPage(
        logs=[CreditLogOut.model_validate(l) for l in logs],
        total=total,
        offset=offset,
        limit=limit,
    )
