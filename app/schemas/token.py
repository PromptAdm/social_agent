"""
Schemas Pydantic: Token (autenticação JWT)

TokenResponse — resposta completa de login/refresh:
    - access_token              : JWT de curta duração para chamadas de API
    - refresh_token             : JWT de longa duração para renovação do access_token
    - token_type                : sempre "bearer" (Literal — nunca aceita outro valor)
    - expires_in                : segundos até a expiração do access_token
    - refresh_token_expires_in  : segundos até a expiração do refresh_token
    - user                      : dados públicos do usuário autenticado

LoginRequest — payload JSON para POST /auth/login:
    Alternativa ao OAuth2PasswordRequestForm para clientes que enviam JSON.
"""

from typing import Literal

from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    """Payload JSON para o endpoint POST /auth/login."""

    email: EmailStr
    password: str


class Token(BaseModel):
    """Schema mínimo compatível com OAuth2 (usado pelo Swagger /auth/token)."""

    access_token: str
    token_type: Literal["bearer"] = "bearer"


class TokenResponse(BaseModel):
    """Resposta completa de autenticação (login e refresh)."""

    access_token: str
    refresh_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int                          # segundos até expirar o access_token
    refresh_token_expires_in: int            # segundos até expirar o refresh_token

    # Dados do usuário incluídos para evitar uma chamada extra ao /me
    user: "UserOut"                          # forward reference resolvida abaixo


class RefreshRequest(BaseModel):
    """Payload para renovação de access_token via refresh_token."""

    refresh_token: str


class LogoutRequest(BaseModel):
    """
    Payload de logout.
    refresh_token é opcional agora, mas será obrigatório quando a blacklist
    de tokens for implementada (invalidação server-side no logout).
    """

    refresh_token: str | None = None


class TokenPayload(BaseModel):
    """Conteúdo decodificado de qualquer JWT do sistema."""

    sub: str | None = None          # user_id como string
    type: str | None = None         # "access" | "refresh"
    exp: int | None = None
    jti: str | None = None          # ID único — viabiliza blacklist futura


# Resolve forward reference após importação de UserOut
from app.schemas.user import UserOut  # noqa: E402

TokenResponse.model_rebuild()
