"""
Schemas Pydantic: User

Validações aplicadas em UserCreate:
    - senha mínima de 8 caracteres
    - pelo menos 1 letra maiúscula
    - pelo menos 1 letra minúscula
    - pelo menos 1 dígito numérico
"""

import re
from datetime import datetime

from pydantic import BaseModel, EmailStr, field_validator

from app.models.user import UserRole


# ── Schemas de leitura/escrita ─────────────────────────────────────────────────

class UserBase(BaseModel):
    email: EmailStr
    full_name: str | None = None


class UserCreate(UserBase):
    """Payload de registro. Aplica regras de complexidade de senha."""

    password: str

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        errors: list[str] = []
        if len(v) < 8:
            errors.append("mínimo de 8 caracteres")
        if not re.search(r"[A-Z]", v):
            errors.append("pelo menos 1 letra maiúscula")
        if not re.search(r"[a-z]", v):
            errors.append("pelo menos 1 letra minúscula")
        if not re.search(r"\d", v):
            errors.append("pelo menos 1 número")
        if errors:
            raise ValueError("Senha fraca — requisitos: " + ", ".join(errors))
        return v


class UserUpdate(BaseModel):
    """Atualização parcial do perfil do usuário autenticado."""

    full_name: str | None = None
    password: str | None = None

    @field_validator("password", mode="before")
    @classmethod
    def password_strength(cls, v: str | None) -> str | None:
        if v is None:
            return v
        errors: list[str] = []
        if len(v) < 8:
            errors.append("mínimo de 8 caracteres")
        if not re.search(r"[A-Z]", v):
            errors.append("pelo menos 1 letra maiúscula")
        if not re.search(r"[a-z]", v):
            errors.append("pelo menos 1 letra minúscula")
        if not re.search(r"\d", v):
            errors.append("pelo menos 1 número")
        if errors:
            raise ValueError("Senha fraca — requisitos: " + ", ".join(errors))
        return v


class UserChangePassword(BaseModel):
    """Troca de senha com confirmação da senha atual."""

    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        errors: list[str] = []
        if len(v) < 8:
            errors.append("mínimo de 8 caracteres")
        if not re.search(r"[A-Z]", v):
            errors.append("pelo menos 1 letra maiúscula")
        if not re.search(r"[a-z]", v):
            errors.append("pelo menos 1 letra minúscula")
        if not re.search(r"\d", v):
            errors.append("pelo menos 1 número")
        if errors:
            raise ValueError("Senha fraca — requisitos: " + ", ".join(errors))
        return v


# ── Schemas de saída ───────────────────────────────────────────────────────────

class UserOut(UserBase):
    """Representação pública do usuário (sem dados sensíveis)."""

    id: int
    role: UserRole
    is_active: bool
    is_superuser: bool
    last_login_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
