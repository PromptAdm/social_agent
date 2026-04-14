"""
Utilitários de segurança do Social Agent.

Responsabilidades:
    - Hashing de senhas com bcrypt
    - Criação e decodificação de JWT (access_token e refresh_token)
    - Separação de tipo de token via claim "type" para evitar uso cruzado

Claims incluídos em todos os tokens:
    sub  — user_id (string) — identifica o sujeito
    type — "access" | "refresh" — impede uso cruzado entre tipos
    exp  — timestamp de expiração
    iat  — timestamp de emissão (útil para auditoria)
    jti  — ID único do token (UUID-like) — viabiliza blacklist/revogação futura

Fluxo de tokens:
    1. Login  → access_token (curto: ACCESS_TOKEN_EXPIRE_MINUTES)
                + refresh_token (longo: REFRESH_TOKEN_EXPIRE_DAYS)
    2. Chamadas de API → Authorization: Bearer <access_token>
    3. Expirou? → POST /auth/refresh com { refresh_token } → novo par de tokens
"""

import secrets as _secrets
from datetime import datetime, timedelta, timezone
from enum import Enum

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import get_settings

settings = get_settings()

# ── Configuração de hashing ────────────────────────────────────────────────────

# bcrypt com fator de custo padrão (12 rounds) — seguro e amplamente suportado
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ── Tipos de token ─────────────────────────────────────────────────────────────

class TokenType(str, Enum):
    ACCESS = "access"
    REFRESH = "refresh"


# ── Hashing ────────────────────────────────────────────────────────────────────

def hash_password(plain_password: str) -> str:
    """Retorna o hash bcrypt da senha em texto puro."""
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifica se a senha em texto puro corresponde ao hash armazenado.
    Usa comparação em tempo constante (sem timing attack).
    """
    return pwd_context.verify(plain_password, hashed_password)


# ── Criação de tokens ──────────────────────────────────────────────────────────

def _build_token(
    subject: str | int,
    token_type: TokenType,
    expires_delta: timedelta,
) -> str:
    """
    Constrói e assina um JWT com o subject, tipo e expiração fornecidos.

    Claims de segurança:
        type — impede que refresh_token seja usado como access_token e vice-versa
        jti  — ID único por token; viabiliza blacklist futura sem invalidar todos
               os tokens do usuário (ex: logout seletivo, rotação de refresh)
    """
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(subject),
        "type": token_type.value,
        "exp": now + expires_delta,
        "iat": now,
        "jti": _secrets.token_urlsafe(16),  # 128 bits de entropia — único por emissão
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_access_token(
    subject: str | int,
    expires_delta: timedelta | None = None,
) -> str:
    """
    Gera um JWT de acesso (curta duração).

    :param subject:       identificador do usuário (geralmente o user_id).
    :param expires_delta: expiração customizada; usa ACCESS_TOKEN_EXPIRE_MINUTES se None.
    """
    delta = expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return _build_token(subject, TokenType.ACCESS, delta)


def create_refresh_token(
    subject: str | int,
    expires_delta: timedelta | None = None,
) -> str:
    """
    Gera um JWT de refresh (longa duração — REFRESH_TOKEN_EXPIRE_DAYS por padrão).
    Deve ser armazenado de forma segura no cliente (httpOnly cookie ou storage seguro).

    :param subject:       identificador do usuário.
    :param expires_delta: expiração customizada; usa settings.REFRESH_TOKEN_EXPIRE_DAYS se None.
    """
    delta = expires_delta or timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    return _build_token(subject, TokenType.REFRESH, delta)


def create_token_pair(subject: str | int) -> tuple[str, str]:
    """
    Cria e retorna (access_token, refresh_token) de uma só vez.
    Conveniente para login e renovação de tokens.
    """
    return (
        create_access_token(subject),
        create_refresh_token(subject),
    )


# ── Decodificação e validação ──────────────────────────────────────────────────

def decode_token(token: str, expected_type: TokenType) -> dict:
    """
    Decodifica e valida um JWT verificando:
        - Assinatura (SECRET_KEY)
        - Expiração (exp)
        - Tipo correto (claim 'type' == expected_type)
        - Presença do claim 'sub' (identifica o usuário)

    Lança JWTError se qualquer verificação falhar.
    """
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])

    token_type = payload.get("type")
    if token_type != expected_type.value:
        raise JWTError(
            f"Tipo de token incorreto: esperado '{expected_type.value}', recebido '{token_type}'"
        )

    # sub é obrigatório — sem ele não há como identificar o usuário
    if not payload.get("sub"):
        raise JWTError("Token sem identificador de sujeito (sub).")

    return payload


def decode_access_token(token: str) -> dict:
    """Atalho para decodificar access_token com validação de tipo."""
    return decode_token(token, TokenType.ACCESS)


def decode_refresh_token(token: str) -> dict:
    """Atalho para decodificar refresh_token com validação de tipo."""
    return decode_token(token, TokenType.REFRESH)


def access_token_expires_in() -> int:
    """Retorna o tempo de expiração do access_token em segundos."""
    return settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60


def refresh_token_expires_in() -> int:
    """Retorna o tempo de expiração do refresh_token em segundos."""
    return settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600
