"""
Gerencia o saldo de créditos por usuário.

Operações atômicas — todas as escritas usam flush() antes de retornar
para garantir consistência dentro da mesma transação do SQLAlchemy.
"""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from fastapi import HTTPException, status

from app.core.config import get_settings
from app.models.credits import CreditLog, UserCredit

settings = get_settings()

# ── Tipos de operação ─────────────────────────────────────────────────────────

INITIAL_GRANT   = "initial_grant"
PURCHASE        = "purchase"
REFUND          = "refund"
IMAGE_GENERATION = "image_generation"
VIDEO_SUBTITLE  = "video_subtitle"


# ── Helpers internos ──────────────────────────────────────────────────────────

def _get_or_create(db: Session, user_id: int) -> UserCredit:
    credit = db.scalar(select(UserCredit).where(UserCredit.user_id == user_id))
    if credit is None:
        credit = UserCredit(user_id=user_id, balance=0, lifetime_earned=0)
        db.add(credit)
        db.flush()
    return credit


def _append_log(
    db: Session,
    user_id: int,
    amount: int,
    operation_type: str,
    reference_id: int | None = None,
    reference_type: str | None = None,
    description: str | None = None,
) -> None:
    db.add(CreditLog(
        user_id=user_id,
        amount=amount,
        operation_type=operation_type,
        reference_id=reference_id,
        reference_type=reference_type,
        description=description,
    ))


# ── API pública ───────────────────────────────────────────────────────────────

def get_balance(db: Session, user_id: int) -> UserCredit:
    """Retorna saldo atual, criando registro com grant inicial se necessário."""
    credit = _get_or_create(db, user_id)
    if credit.balance == 0 and credit.lifetime_earned == 0:
        _earn(db, credit, user_id, settings.CREDITS_INITIAL_GRANT, INITIAL_GRANT,
              description="Créditos iniciais ao criar conta")
        db.commit()
        db.refresh(credit)
    return credit


def earn(
    db: Session,
    user_id: int,
    amount: int,
    operation_type: str = PURCHASE,
    reference_id: int | None = None,
    reference_type: str | None = None,
    description: str | None = None,
) -> UserCredit:
    credit = _get_or_create(db, user_id)
    _earn(db, credit, user_id, amount, operation_type, reference_id, reference_type, description)
    db.commit()
    db.refresh(credit)
    if operation_type == PURCHASE:
        try:
            from app.core import analytics
            analytics.track("extra_credit_granted", distinct_id=str(user_id), properties={
                "amount":        amount,
                "balance_after": credit.balance,
                "description":   description,
            })
        except Exception:
            pass
    return credit


def spend(
    db: Session,
    user_id: int,
    amount: int,
    operation_type: str,
    reference_id: int | None = None,
    reference_type: str | None = None,
    description: str | None = None,
) -> UserCredit:
    """Debita créditos. Lança 402 se saldo insuficiente."""
    credit = _get_or_create(db, user_id)
    if credit.balance < amount:
        try:
            from app.core import analytics
            analytics.track("credit_limit_reached", distinct_id=str(user_id), properties={
                "balance":        credit.balance,
                "required":       amount,
                "operation_type": operation_type,
            })
        except Exception:
            pass
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"Créditos insuficientes. Saldo atual: {credit.balance}, necessário: {amount}.",
        )
    credit.balance -= amount
    _append_log(db, user_id, -amount, operation_type, reference_id, reference_type, description)
    db.flush()
    try:
        from app.core import analytics
        analytics.track("credit_used", distinct_id=str(user_id), properties={
            "amount":         amount,
            "operation_type": operation_type,
            "balance_after":  credit.balance,
        })
    except Exception:
        pass
    return credit


def can_afford(db: Session, user_id: int, amount: int) -> bool:
    credit = db.scalar(select(UserCredit).where(UserCredit.user_id == user_id))
    if credit is None:
        return amount <= settings.CREDITS_INITIAL_GRANT
    return credit.balance >= amount


def get_logs(db: Session, user_id: int, limit: int = 50, offset: int = 0) -> tuple[list[CreditLog], int]:
    total = db.scalar(
        select(func.count()).select_from(CreditLog).where(CreditLog.user_id == user_id)
    ) or 0
    logs = db.scalars(
        select(CreditLog)
        .where(CreditLog.user_id == user_id)
        .order_by(CreditLog.created_at.desc())
        .limit(limit)
        .offset(offset)
    ).all()
    return list(logs), total


# ── Privado ───────────────────────────────────────────────────────────────────

def _earn(
    db: Session,
    credit: UserCredit,
    user_id: int,
    amount: int,
    operation_type: str,
    reference_id: int | None = None,
    reference_type: str | None = None,
    description: str | None = None,
) -> None:
    credit.balance         += amount
    credit.lifetime_earned += amount
    _append_log(db, user_id, amount, operation_type, reference_id, reference_type, description)
    db.flush()
