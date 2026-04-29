"""social_connections table

Revision ID: 0014_social_connections
Revises: 0013_seed_admin_user
Create Date: 2026-04-28

Cria a tabela social_connections para armazenar conexões OAuth Meta
(Facebook + Instagram) com permissões básicas.
"""

from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "0014_social_connections"
down_revision: Union[str, None] = "0013_seed_admin_user"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "social_connections",
        sa.Column("id",                   sa.Integer(),     nullable=False),
        sa.Column("user_id",              sa.Integer(),     nullable=False),
        sa.Column("provider",             sa.String(30),    nullable=False, server_default="meta"),
        sa.Column("facebook_page_id",     sa.String(100),   nullable=True),
        sa.Column("facebook_page_name",   sa.String(255),   nullable=True),
        sa.Column("instagram_account_id", sa.String(100),   nullable=True),
        sa.Column("access_token",         sa.Text(),        nullable=False),
        sa.Column("status",               sa.String(20),    nullable=False, server_default="connected"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index(
        "ix_social_connections_id",
        "social_connections",
        ["id"],
    )
    op.create_index(
        "ix_social_connections_user_provider",
        "social_connections",
        ["user_id", "provider"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("ix_social_connections_user_provider", table_name="social_connections")
    op.drop_index("ix_social_connections_id",            table_name="social_connections")
    op.drop_table("social_connections")
