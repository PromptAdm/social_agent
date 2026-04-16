"""
Dependências FastAPI reutilizáveis (injetadas via Depends).

Hierarquia de dependências de autenticação:
    get_db
    └── get_current_user          → qualquer token válido (ativo ou não)
         └── get_current_active_user  → token válido + usuário ativo
              └── require_role(...)   → token válido + ativo + papel específico
              └── require_superuser   → token válido + ativo + is_superuser=True

Cabeçalho esperado em rotas protegidas:
    Authorization: Bearer <access_token>
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

# Header padrão RFC 6750 retornado em respostas 401 — informa o esquema e o realm
_WWW_AUTHENTICATE = {"WWW-Authenticate": 'Bearer realm="social-agent"'}


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
        - Claim 'sub' ausente ou inválido (validado em decode_access_token)
        - Usuário não encontrado no banco
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Não foi possível validar as credenciais.",
        headers=_WWW_AUTHENTICATE,
    )
    try:
        payload = decode_access_token(token)
        # decode_access_token já valida 'sub'; int() pode falhar se vier valor não numérico
        user_id = int(payload["sub"])
    except (JWTError, ValueError, KeyError):
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
    Token válido mas conta inativa → 403 Forbidden (não 401, pois o token é legítimo).
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


# ── Billing / Planos ───────────────────────────────────────────────────────────

def plan_limit(resource: str) -> Callable:
    """
    Fábrica de dependências para verificação de limites de plano.

    Uso em routers de criação (POST):
        @router.post("/", dependencies=[Depends(plan_limit("brands"))])
        @router.post("/", dependencies=[Depends(plan_limit("posts_per_month"))])

    Quando MONETIZATION_ENABLED=false → no-op, nunca bloqueia.
    Quando limite atingido → HTTP 402 Payment Required.

    Não interrompe login, leitura, edição ou exclusão — apenas criação.
    """
    def _check(
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_active_user),
    ) -> None:
        from app.services.subscription_service import check_limit
        allowed, msg = check_limit(db, current_user.id, resource)
        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=msg,
            )

    # Nome único evita que o FastAPI deduplique dependências com o mesmo nome
    _check.__name__ = f"plan_limit_{resource}"
    return _check
