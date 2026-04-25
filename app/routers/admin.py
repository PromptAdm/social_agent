"""
Admin Router — superuser-only endpoints.
Prefix: /api/v1/admin

All endpoints require is_superuser=True (enforced by require_superuser dependency).
"""

from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, require_superuser
from app.models.user import User
from app.services import admin_service

router = APIRouter(prefix="/admin", tags=["Admin"])


# ── Schemas ────────────────────────────────────────────────────────────────────

class ChangePlanRequest(BaseModel):
    plan_code: str

class AdjustCreditsRequest(BaseModel):
    amount: int
    reason: str

class FeatureOverrideRequest(BaseModel):
    feature:    str
    enabled:    bool
    reason:     str | None = None
    expires_at: datetime | None = None


# ── Dashboard analytics ────────────────────────────────────────────────────────

@router.get("/analytics", summary="Platform analytics — superuser only")
def get_admin_analytics(
    db:  Session = Depends(get_db),
    _:   User    = Depends(require_superuser),
) -> dict:
    return admin_service.get_analytics(db)


# ── Customer management ────────────────────────────────────────────────────────

@router.get("/customers", summary="List all customers with filters")
def list_customers(
    search:        str | None = Query(None, description="Search by email or name"),
    plan:          str | None = Query(None, description="Filter by plan_code"),
    sub_status:    str | None = Query(None, description="Filter by subscription status"),
    trial:         bool | None = Query(None, description="Filter trial users"),
    limit:         int        = Query(50, ge=1, le=200),
    offset:        int        = Query(0, ge=0),
    db:  Session  = Depends(get_db),
    _:   User     = Depends(require_superuser),
) -> dict:
    return admin_service.list_customers(
        db,
        search=search,
        plan_filter=plan,
        status_filter=sub_status,
        trial_filter=trial,
        limit=limit,
        offset=offset,
    )


@router.get("/customers/{user_id}", summary="Customer detail")
def get_customer(
    user_id: int,
    db:  Session = Depends(get_db),
    _:   User    = Depends(require_superuser),
) -> dict:
    detail = admin_service.get_customer_detail(db, user_id)
    if not detail:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return detail


@router.post("/customers/{user_id}/suspend", summary="Suspend user account")
def suspend_user(
    user_id:    int,
    db:         Session = Depends(get_db),
    actor:      User    = Depends(require_superuser),
) -> dict:
    try:
        admin_service.suspend_user(db, user_id, actor_id=actor.id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {"success": True, "user_id": user_id, "action": "suspended"}


@router.post("/customers/{user_id}/reactivate", summary="Reactivate suspended user")
def reactivate_user(
    user_id:    int,
    db:         Session = Depends(get_db),
    actor:      User    = Depends(require_superuser),
) -> dict:
    try:
        admin_service.reactivate_user(db, user_id, actor_id=actor.id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {"success": True, "user_id": user_id, "action": "reactivated"}


@router.post("/customers/{user_id}/reset-trial", summary="Reset trial for user")
def reset_trial(
    user_id:    int,
    db:         Session = Depends(get_db),
    actor:      User    = Depends(require_superuser),
) -> dict:
    try:
        admin_service.reset_trial(db, user_id, actor_id=actor.id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {"success": True, "user_id": user_id, "action": "trial_reset"}


@router.post("/customers/{user_id}/change-plan", summary="Change user plan manually")
def change_plan(
    user_id:    int,
    body:       ChangePlanRequest,
    db:         Session = Depends(get_db),
    actor:      User    = Depends(require_superuser),
) -> dict:
    try:
        admin_service.change_plan(db, user_id, actor_id=actor.id, new_plan=body.plan_code)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {"success": True, "user_id": user_id, "plan_code": body.plan_code}


@router.post("/customers/{user_id}/credits", summary="Add or remove credits")
def adjust_credits(
    user_id:    int,
    body:       AdjustCreditsRequest,
    db:         Session = Depends(get_db),
    actor:      User    = Depends(require_superuser),
) -> dict:
    try:
        admin_service.adjust_credits(db, user_id, actor_id=actor.id,
                                     amount=body.amount, reason=body.reason)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {"success": True, "user_id": user_id, "amount": body.amount}


@router.post("/customers/{user_id}/impersonate", summary="Generate impersonation token")
def impersonate_user(
    user_id:    int,
    db:         Session = Depends(get_db),
    actor:      User    = Depends(require_superuser),
) -> dict:
    try:
        return admin_service.impersonate_user(db, user_id, actor_id=actor.id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


# ── Feature overrides ──────────────────────────────────────────────────────────

@router.get("/feature-overrides", summary="List all feature overrides")
def list_feature_overrides(
    user_id: int | None = Query(None),
    db:      Session    = Depends(get_db),
    _:       User       = Depends(require_superuser),
) -> list[dict]:
    return admin_service.list_feature_overrides(db, user_id=user_id)


@router.post("/feature-overrides/{user_id}", summary="Set feature override for user")
def set_feature_override(
    user_id:    int,
    body:       FeatureOverrideRequest,
    db:         Session = Depends(get_db),
    actor:      User    = Depends(require_superuser),
) -> dict:
    try:
        return admin_service.set_feature_override(
            db,
            actor_id   = actor.id,
            user_id    = user_id,
            feature    = body.feature,
            enabled    = body.enabled,
            reason     = body.reason,
            expires_at = body.expires_at,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.delete("/feature-overrides/{user_id}/{feature}", summary="Remove feature override")
def delete_feature_override(
    user_id:    int,
    feature:    str,
    db:         Session = Depends(get_db),
    actor:      User    = Depends(require_superuser),
) -> dict:
    try:
        admin_service.delete_feature_override(db, actor_id=actor.id,
                                              user_id=user_id, feature=feature)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return {"success": True}


# ── Billing operations ─────────────────────────────────────────────────────────

@router.get("/billing/subscriptions", summary="List all subscriptions")
def list_subscriptions(
    sub_status: str | None = Query(None, alias="status"),
    limit:      int        = Query(50, ge=1, le=200),
    offset:     int        = Query(0, ge=0),
    db:         Session    = Depends(get_db),
    _:          User       = Depends(require_superuser),
) -> dict:
    return admin_service.list_billing_subscriptions(
        db, status_filter=sub_status, limit=limit, offset=offset
    )


@router.get("/billing/webhook-logs", summary="Stripe webhook event log")
def list_webhook_logs(
    limit:  int     = Query(100, ge=1, le=500),
    offset: int     = Query(0, ge=0),
    db:     Session = Depends(get_db),
    _:      User    = Depends(require_superuser),
) -> dict:
    return admin_service.list_webhook_logs(db, limit=limit, offset=offset)


@router.get("/billing/credit-purchases", summary="Credit purchase history")
def list_credit_purchases(
    limit:  int     = Query(50, ge=1, le=200),
    offset: int     = Query(0, ge=0),
    db:     Session = Depends(get_db),
    _:      User    = Depends(require_superuser),
) -> dict:
    return admin_service.list_credit_purchases(db, limit=limit, offset=offset)


# ── Audit logs ─────────────────────────────────────────────────────────────────

@router.get("/audit-logs", summary="Admin audit log")
def list_audit_logs(
    actor_id:  int | None  = Query(None),
    target_id: int | None  = Query(None),
    action:    str | None  = Query(None),
    limit:     int         = Query(100, ge=1, le=500),
    offset:    int         = Query(0, ge=0),
    db:        Session     = Depends(get_db),
    _:         User        = Depends(require_superuser),
) -> dict:
    return admin_service.list_audit_logs(
        db,
        actor_id      = actor_id,
        target_id     = target_id,
        action_filter = action,
        limit         = limit,
        offset        = offset,
    )
