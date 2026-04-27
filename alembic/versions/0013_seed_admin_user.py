"""seed_admin_user

Garante que o usuário master do sistema exista com credenciais corretas.

Operação: UPSERT idempotente via SQL puro.
  - Se o usuário NÃO existir: INSERT com hash correto, role=admin, is_superuser=True.
  - Se o usuário JÁ existir: UPDATE hash + role + flags (sem criar duplicata).

Nota de dialeto:
  - PostgreSQL: ENUM userrole criado com valores lowercase ('admin', 'editor', …).
    Deve-se usar o VALUE lowercase ao escrever via SQL direto.
  - SQLite: Sem ENUM nativo, a coluna é VARCHAR. O ORM armazena o member NAME
    uppercase ('ADMIN', 'EDITOR', …) neste ambiente (Python 3.12+). Logo, INSERT/UPDATE
    via SQL raw também deve usar uppercase para que o ORM consiga ler o valor.

Revision ID: 0013_seed_admin_user
Revises: 0012_admin_system
Create Date: 2026-04-26 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0013_seed_admin_user"
down_revision: Union[str, None] = "0012_admin_system"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_EMAIL = "prompt.admia@gmail.com"
_FULL_NAME = "Admin Master"

# bcrypt hash de: Am1705123165$  (rounds=12, bcrypt 4.0.1)
# Gerado com: from app.core.security import hash_password; hash_password("Am1705123165$")
_HASH = "$2b$12$.8.tYpKIzanyyhonPGZEN.43.CtLWuZgCOBtZfink/JGbLNRIwsey"


def upgrade() -> None:
    conn = op.get_bind()
    dialect = conn.dialect.name  # "sqlite" ou "postgresql"

    # PostgreSQL: ENUM values são lowercase (definidos em 0002_user_role_last_login).
    # SQLite:     ORM armazena member NAME (uppercase) no Python 3.12+.
    role_value = "admin" if dialect == "postgresql" else "ADMIN"

    # Verifica se usuário já existe
    row = conn.execute(
        sa.text("SELECT id FROM users WHERE email = :email"),
        {"email": _EMAIL},
    ).fetchone()

    if row is None:
        # INSERT — usuário não existe
        conn.execute(
            sa.text("""
                INSERT INTO users
                    (email, hashed_password, full_name, role, is_active, is_superuser,
                     created_at, updated_at)
                VALUES
                    (:email, :pw, :name, :role, TRUE, TRUE,
                     CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """),
            {"email": _EMAIL, "pw": _HASH, "name": _FULL_NAME, "role": role_value},
        )
    else:
        # UPDATE — garante hash, role e flags corretos
        conn.execute(
            sa.text("""
                UPDATE users
                SET hashed_password = :pw,
                    role            = :role,
                    is_active       = TRUE,
                    is_superuser    = TRUE,
                    updated_at      = CURRENT_TIMESTAMP
                WHERE email = :email
            """),
            {"pw": _HASH, "role": role_value, "email": _EMAIL},
        )


def downgrade() -> None:
    # Downgrade não remove o usuário — evita perda acidental de dados.
    pass
