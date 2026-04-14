"""
Dependências FastAPI reutilizáveis (injetadas via Depends).

Hierarquia de dependências de autenticação:
    get_db
    └── get_current_user          → qualquer token válido (ativo ou não)
         └── get_current_active_user  → token válido + usuário ativo
              └── require_role(...)   → token válido + ativo + papel específico
              └── require_superuser   → token válido + ativo + is_superuser=True
"""

from typing import Callable, Generator

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.core.security import decode_access_token
from app.models.user import User, UserRole

# URL usada pelo Swagger para o fluxo OAuth2 (POST /auth/token)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token")


# ── Sessão de banco ────────────────────────────────────────────────────────────

def get_db() -> Generator[Session, None, None]:
    """
    Fornece uma sessão de banco de dados por request.
    Garante rollback em caso de exceção e fechamento ao final.
    Uso: db: Session = Depends(get_db)
    """
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


# ── Extração do usuário pelo token ─────────────────────────────────────────────

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    Decodifica o JWT do header Authorization e retorna o User correspondente.
    Não verifica is_active — use get_current_active_user para isso.

    Lança 401 se:
        - Token ausente, inválido ou expirado
        - Claim 'sub' ausente ou não numérico
        - Usuário não encontrado no banco
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Não foi possível validar as credenciais.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_access_token(token)
        user_id_str: str | None = payload.get("sub")
        if not user_id_str:
            raise credentials_exception
        user_id = int(user_id_str)
    except (JWTError, ValueError):
        raise credentials_exception

    # Import local para evitar circular import (models ↔ dependencies)
    from app.services.user_service import get_user_by_id

    user = get_user_by_id(db, user_id)
    if user is None:
        raise credentials_exception
    return user


def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Garante que o usuário autenticado está ativo (is_active=True).
    Lança 403 se a conta estiver desativada.
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Conta desativada. Entre em contato com o suporte.",
        )
    return current_user


# ── Verificação de papéis (RBAC) ───────────────────────────────────────────────

def require_role(*roles: UserRole) -> Callable:
    """
    Fábrica de dependências para controle de acesso baseado em papel (RBAC).

    Uso no router:
        @router.delete("/{id}", dependencies=[Depends(require_role(UserRole.ADMIN))])

    Superusuários sempre têm acesso independente do papel.
    """
    def _check(current_user: User = Depends(get_current_active_user)) -> User:
        if current_user.is_superuser:
            return current_user
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Acesso negado. Requer papel: "
                    f"{', '.join(r.value for r in roles)}."
                ),
            )
        return current_user

    return _check


def require_superuser(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """
    Restringe o endpoint a superusuários (is_superuser=True).
    Lança 403 para qualquer outro papel, mesmo admin.
    """
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso restrito a superusuários.",
        )
    return current_user
