"""
Router: Users
Prefixo: /api/v1/users

Endpoints de administração de usuários (requer papel ADMIN ou superusuário).
O perfil do próprio usuário é gerenciado em /auth/me e /auth/change-password.
"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_active_user, get_db, require_superuser
from app.models.user import User
from app.schemas.user import UserOut
from app.services import user_service

router = APIRouter(prefix="/users", tags=["Users"])


@router.get(
    "/me",
    response_model=UserOut,
    summary="Meu perfil (alias)",
    description="Alias de GET /auth/me — mantido para retrocompatibilidade.",
)
def get_me(current_user: User = Depends(get_current_active_user)) -> User:
    return current_user


@router.patch(
    "/{user_id}/deactivate",
    response_model=UserOut,
    status_code=status.HTTP_200_OK,
    summary="Desativar usuário",
    dependencies=[Depends(require_superuser)],
)
def deactivate_user(
    user_id: int,
    db: Session = Depends(get_db),
) -> User:
    """
    Desativa a conta de um usuário (is_active=False).
    Restrito a superusuários. O registro é preservado.
    """
    return user_service.deactivate_user(db, user_id)


@router.patch(
    "/{user_id}/activate",
    response_model=UserOut,
    status_code=status.HTTP_200_OK,
    summary="Reativar usuário",
    dependencies=[Depends(require_superuser)],
)
def activate_user(
    user_id: int,
    db: Session = Depends(get_db),
) -> User:
    """
    Reativa a conta de um usuário (is_active=True).
    Restrito a superusuários.
    """
    return user_service.activate_user(db, user_id)
