"""user_role_and_last_login

Adiciona ao model User:
    - role        : papel do usuário no sistema (enum UserRole)
    - last_login_at : timestamp do último login bem-sucedido

Revision ID: 0002_user_role_last_login
Revises: 0001_initial_schema
Create Date: 2026-04-11 00:01:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002_user_role_last_login"
down_revision: Union[str, None] = "0001_initial_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Cria o tipo ENUM userrole (somente PostgreSQL; SQLite usa VARCHAR)
    userrole_enum = sa.Enum(
        "admin", "editor", "aprovador", "viewer",
        name="userrole",
    )
    if op.get_bind().dialect.name == "postgresql":
        userrole_enum.create(op.get_bind(), checkfirst=True)

    # Adiciona coluna role com default 'editor'
    op.add_column(
        "users",
        sa.Column(
            "role",
            sa.Enum("admin", "editor", "aprovador", "viewer", name="userrole"),
            nullable=False,
            server_default="editor",
        ),
    )

    # Adiciona coluna last_login_at (nullable — null = nunca fez login)
    op.add_column(
        "users",
        sa.Column(
            "last_login_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "last_login_at")
    op.drop_column("users", "role")
    if op.get_bind().dialect.name == "postgresql":
        sa.Enum(name="userrole").drop(op.get_bind(), checkfirst=True)
