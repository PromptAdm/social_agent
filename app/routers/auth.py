"""
Router: Auth
Prefixo: /api/v1/auth

Rotas implementadas:
    POST /auth/register         — cria nova conta (JSON)
    POST /auth/login            — autentica via JSON, retorna par de tokens + user
    POST /auth/token            — autentica via form OAuth2 (compatibilidade Swagger)
    POST /auth/refresh          — renova tokens usando refresh_token
    GET  /auth/me               — retorna perfil do usuário autenticado
    PATCH /auth/me              — atualiza perfil (full_name / senha)
    POST /auth/change-password  — troca senha com confirmação da atual

Segurança:
    - Senhas nunca trafegam em respostas
    - Mensagem unificada para e-mail/senha inválidos (anti-enumeração)
    - Tokens separados por tipo ('access' vs 'refresh') para evitar uso cruzado
    - last_login_at atualizado em todo login bem-sucedido
"""

from fastapi import APIRouter, Depends, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_active_user, get_db
from app.models.user import User
from app.schemas.token import LoginRequest, RefreshRequest, Token, TokenResponse
from app.schemas.user import UserChangePassword, UserCreate, UserOut, UserUpdate
from app.services import auth_service, user_service

router = APIRouter(prefix="/auth", tags=["Auth"])


# ── Registro ───────────────────────────────────────────────────────────────────

@router.post(
    "/register",
    response_model=UserOut,
    status_code=status.HTTP_201_CREATED,
    summary="Criar nova conta",
    response_description="Dados do usuário criado (sem senha)",
)
def register(
    payload: UserCreate,
    db: Session = Depends(get_db),
) -> User:
    """
    Cria uma nova conta no sistema.

    Regras de senha:
    - Mínimo 8 caracteres
    - Pelo menos 1 letra maiúscula
    - Pelo menos 1 letra minúscula
    - Pelo menos 1 número

    Retorna os dados públicos do usuário criado. Não faz login automático.
    """
    return auth_service.register(db, payload)


# ── Login JSON (rota principal para frontends) ─────────────────────────────────

@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Autenticar (JSON)",
    response_description="Par de tokens + dados do usuário",
)
def login(
    payload: LoginRequest,
    db: Session = Depends(get_db),
) -> TokenResponse:
    """
    Autentica com e-mail e senha via JSON body.

    Retorna:
    - **access_token**: JWT de curta duração (usar no header Authorization)
    - **refresh_token**: JWT de longa duração (7 dias) para renovar o access
    - **expires_in**: segundos até o access_token expirar
    - **user**: dados públicos do usuário (evita chamada extra ao /me)

    Registra `last_login_at` a cada autenticação bem-sucedida.
    """
    return auth_service.login_json(db, payload)


# ── Login OAuth2 (compatibilidade Swagger / OAuth2 clients) ───────────────────

@router.post(
    "/token",
    response_model=Token,
    summary="Autenticar (OAuth2 form — Swagger)",
    include_in_schema=True,
)
def login_oauth2(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
) -> Token:
    """
    Autenticação via `application/x-www-form-urlencoded`.
    Mantida para compatibilidade com o Swagger UI e clientes OAuth2 padrão.
    Para frontends, prefira `POST /auth/login` (JSON).
    """
    return auth_service.login_form(db, form_data.username, form_data.password)


# ── Renovação de tokens ────────────────────────────────────────────────────────

@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Renovar tokens",
    response_description="Novo par de tokens + dados do usuário",
)
def refresh(
    payload: RefreshRequest,
    db: Session = Depends(get_db),
) -> TokenResponse:
    """
    Renova o par de tokens usando um `refresh_token` válido.

    O cliente deve chamar este endpoint antes ou quando o `access_token` expirar,
    sem exigir que o usuário faça login novamente.

    Retorna um **novo** par access_token + refresh_token.
    """
    return auth_service.refresh_tokens(db, payload.refresh_token)


# ── Perfil do usuário autenticado ──────────────────────────────────────────────

@router.get(
    "/me",
    response_model=UserOut,
    summary="Meu perfil",
    response_description="Dados públicos do usuário autenticado",
)
def me(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """
    Retorna os dados do usuário autenticado pelo token.

    Requer header: `Authorization: Bearer <access_token>`
    """
    return current_user


@router.patch(
    "/me",
    response_model=UserOut,
    summary="Atualizar perfil",
    response_description="Dados atualizados do usuário",
)
def update_me(
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> User:
    """
    Atualiza `full_name` e/ou `password` do usuário autenticado.
    Campos não enviados são preservados (partial update).
    """
    return user_service.update_user(db, current_user.id, payload)


# ── Troca de senha ─────────────────────────────────────────────────────────────

@router.post(
    "/change-password",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Trocar senha",
)
def change_password(
    payload: UserChangePassword,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> None:
    """
    Troca a senha do usuário autenticado.

    Requer confirmação da senha atual para evitar troca não autorizada
    caso o token tenha sido comprometido em uma sessão ativa.
    """
    auth_service.change_password(db, current_user, payload)
