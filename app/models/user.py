"""
Model: User
Representa o usuário autenticado do sistema.

Papéis disponíveis (role):
    admin   — acesso total, pode gerenciar usuários
    editor  — cria e edita conteúdo, não pode aprovar
    aprovador — aprova/rejeita posts e respostas
    viewer  — somente leitura

Campos adicionados nesta fase:
    - role          : papel do usuário no sistema
    - last_login_at : data/hora do último login bem-sucedido
"""

import enum
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Enum, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    EDITOR = "editor"
    APROVADOR = "aprovador"
    VIEWER = "viewer"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # ── Controle de acesso ─────────────────────────────────────────────────────
    # create_type=False: Alembic gerencia a criação/remoção do tipo ENUM no banco;
    # sem isso, metadata.create_all() tentaria criar "userrole" e conflitaria com
    # o tipo já criado pela migration 0002.
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="userrole", create_type=False),
        default=UserRole.EDITOR,
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # ── Auditoria ──────────────────────────────────────────────────────────────
    last_login_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # ── Relacionamentos ────────────────────────────────────────────────────────
    brands: Mapped[list["Brand"]] = relationship(  # type: ignore[name-defined]
        back_populates="owner", lazy="select"
    )
    subscription: Mapped["UserSubscription | None"] = relationship(  # type: ignore[name-defined]
        "UserSubscription", back_populates="user", uselist=False, lazy="raise"
    )
