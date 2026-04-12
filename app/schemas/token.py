"""
Schemas Pydantic: Token (autenticação JWT)

TokenResponse — resposta completa de login/refresh:
    - access_token  : JWT de curta duração para chamadas de API
    - refresh_token : JWT de longa duração para renovação do access_token
    - expires_in    : segundos até a expiração do access_token
    - user          : dados públicos do usuário autenticado

LoginRequest — payload JSON para POST /auth/login:
    Alternativa ao OAuth2PasswordRequestForm para clientes que enviam JSON.
"""

from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    """Payload JSON para o endpoint POST /auth/login."""

    email: EmailStr
    password: str


class Token(BaseModel):
    """Schema mínimo compatível com OAuth2 (usado pelo Swagger /auth/token)."""

    access_token: str
    token_type: str = "bearer"


class TokenResponse(BaseModel):
    """Resposta completa de autenticação (login e refresh)."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int                 # segundos até expirar o access_token

    # Dados do usuário incluídos para evitar uma chamada extra ao /me
    user: "UserOut"                 # forward reference resolvida abaixo


class RefreshRequest(BaseModel):
    """Payload para renovação de access_token via refresh_token."""

    refresh_token: str


class TokenPayload(BaseModel):
    """Conteúdo decodificado de qualquer JWT do sistema."""

    sub: str | None = None          # user_id como string
    type: str | None = None         # "access" | "refresh"
    exp: int | None = None


# Resolve forward reference após importação de UserOut
from app.schemas.user import UserOut  # noqa: E402

TokenResponse.model_rebuild()
