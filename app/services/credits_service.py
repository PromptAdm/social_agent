"""
CreditsService — saldo e transações de créditos avulsos.

Créditos são debitos/créditos atômicos com log imutável.
Regras de negócio:
  1. Saldo nunca fica negativo — spend_credits retorna False se insuficiente.
  2. Toda mutação é acompanhada por CreditLog.
  3. get_or_create garante exatamente uma linha por usuário (upsert-safe).
  4. check_and_spend_for_post: consome 1 crédito quando limite do plano foi atingido.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.credits import CreditLog, UserCredit

logger = logging.getLogger(__name__)


# ── Internal helpers ────────────────────────────────────────────────────────────

def _now() -> datetime:
    return datetime.now(timezone.utc)


# ── Read ────────────────────────────────────────────────────────────────────────

def get_or_create(db: Session, user_id: int) -> UserCredit:
    """Returns the credit row, creating it with balance=0 if absent."""
    row = db.query(UserCredit).filter(UserCredit.user_id == user_id).first()
    if row is not None:
        return row

    row = UserCredit(user_id=user_id, balance=0, lifetime_earned=0)
    db.add(row)
    try:
        db.commit()
        db.refresh(row)
    except IntegrityError:
        db.rollback()
        row = db.query(UserCredit).filter(UserCredit.user_id == user_id).first()
    return row  # type: ignore[return-value]


def get_balance(db: Session, user_id: int) -> int:
    row = db.query(UserCredit).filter(UserCredit.user_id == user_id).first()
    return row.balance if row else 0


# ── Write ───────────────────────────────────────────────────────────────────────

def add_credits(
    db: Session,
    user_id: int,
    amount: int,
    description: str,
    *,
    operation_type: str = "purchase",
    stripe_session_id: str | None = None,
) -> CreditLog:
    """
    Adds `amount` credits to the user's balance and logs the transaction.
    Commits atomically.

    :param operation_type: purchase | refund | admin_adjustment | initial_grant
    :param stripe_session_id: stored as reference for audit trail
    """
    if amount <= 0:
        raise ValueError(f"add_credits requires amount > 0, got {amount}")

    row = get_or_create(db, user_id)
    row.balance += amount
    row.lifetime_earned += max(0, amount)

    log = CreditLog(
        user_id        = user_id,
        amount         = amount,
        operation_type = operation_type,
        description    = description,
        reference_id   = None,
        reference_type = "stripe_session" if stripe_session_id else None,
    )
    if stripe_session_id:
        log.description = f"{description} [session: {stripe_session_id}]"

    db.add(log)
    db.commit()
    db.refresh(row)
    logger.info(
        "[credits] add user=%s amount=%d op=%s balance_after=%d",
        user_id, amount, operation_type, row.balance,
    )
    return log


def spend_credits(
    db: Session,
    user_id: int,
    amount: int,
    description: str,
    *,
    operation_type: str = "usage",
) -> bool:
    """
    Debits `amount` credits from the user's balance.
    Returns True on success, False if balance is insufficient.
    Does NOT commit — caller must commit after verifying the action succeeded.
    """
    if amount <= 0:
        raise ValueError(f"spend_credits requires amount > 0, got {amount}")

    row = get_or_create(db, user_id)
    if row.balance < amount:
        logger.info(
            "[credits] spend refused user=%s amount=%d balance=%d (insufficient)",
            user_id, amount, row.balance,
        )
        return False

    row.balance -= amount
    log = CreditLog(
        user_id        = user_id,
        amount         = -amount,
        operation_type = operation_type,
        description    = description,
    )
    db.add(log)
    logger.info(
        "[credits] spend user=%s amount=%d op=%s balance_after=%d",
        user_id, amount, operation_type, row.balance,
    )
    return True


def check_and_spend_for_post(db: Session, user_id: int) -> tuple[bool, str | None]:
    """
    Attempts to spend 1 credit so the user can create a post beyond their
    monthly plan limit.  Returns (True, None) on success, (False, msg) when
    the balance is also exhausted.

    The caller must commit after a successful action to persist the debit.
    """
    balance = get_balance(db, user_id)
    if balance <= 0:
        return (
            False,
            "Limite mensal atingido e saldo de créditos esgotado. "
            "Compre créditos ou faça upgrade do seu plano.",
        )

    ok = spend_credits(db, user_id, 1, "Post extra além do limite do plano")
    if ok:
        return (True, None)
    return (False, "Créditos insuficientes. Compre mais créditos ou faça upgrade.")
