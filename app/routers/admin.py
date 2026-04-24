"""
Admin Router — superuser-only endpoints.
Prefix: /api/v1/admin

All endpoints require is_superuser=True.
Normal users receive 403 regardless of their role.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, require_superuser
from app.models.user import User
from app.services import admin_service

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get(
    "/analytics",
    summary="Platform-wide analytics — superuser only",
    description=(
        "Returns KPIs, monthly charts, plan distribution, and conversion funnel "
        "sourced directly from the database. Requires `is_superuser=True`."
    ),
)
def get_admin_analytics(
    db: Session = Depends(get_db),
    _: User = Depends(require_superuser),
) -> dict:
    return admin_service.get_analytics(db)
