"""
Service: User
Operações sobre o model User (perfil, busca, ativação).
"""

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.user import User
from app.schemas.user import UserUpdate


# ── Leitura ───────────────────────────────────────────────────────────────────

def get_user_by_id(db: Session, user_id: int) -> User | None:
    """Retorna o User pelo ID ou None se não existir."""
    return db.query(User).filter(User.id == user_id).first()


def get_user_by_email(db: Session, email: str) -> User | None:
    """Retorna o User pelo e-mail ou None se não existir."""
    return db.query(User).filter(User.email == email).first()


def get_user_or_404(db: Session, user_id: int) -> User:
    """Retorna o User pelo ID ou lança 404."""
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado.",
        )
    return user


# ── Escrita ───────────────────────────────────────────────────────────────────

def update_user(db: Session, user_id: int, payload: UserUpdate) -> User:
    """
    Atualiza dados do perfil do usuário (full_name e/ou senha).
    Campos não enviados no payload são preservados (partial update).
    """
    user = get_user_or_404(db, user_id)
    update_data = payload.model_dump(exclude_unset=True)

    # Converte 'password' → 'hashed_password' antes de atribuir
    if "password" in update_data:
        update_data["hashed_password"] = hash_password(update_data.pop("password"))

    for field, value in update_data.items():
        setattr(user, field, value)

    db.commit()
    db.refresh(user)
    return user


def deactivate_user(db: Session, user_id: int) -> User:
    """
    Desativa a conta de um usuário (is_active=False).
    Não remove o registro — o histórico é preservado.
    Lança 404 se o usuário não existir.
    """
    user = get_user_or_404(db, user_id)
    user.is_active = False
    db.commit()
    db.refresh(user)
    return user


def activate_user(db: Session, user_id: int) -> User:
    """
    Reativa a conta de um usuário (is_active=True).
    Lança 404 se o usuário não existir.
    """
    user = get_user_or_404(db, user_id)
    user.is_active = True
    db.commit()
    db.refresh(user)
    return user
