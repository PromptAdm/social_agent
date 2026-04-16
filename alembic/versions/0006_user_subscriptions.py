"""user_subscriptions

Cria a tabela user_subscriptions para o sistema de billing/planos.

Não altera nenhuma tabela existente.
Relacionamento: users.id → user_subscriptions.user_id (CASCADE DELETE).

Rollback seguro: drop da tabela user_subscriptions, sem efeito colateral.

Revision ID: 0006_user_subscriptions
Revises: 0005_scheduler_tables
Create Date: 2026-04-16 00:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0006_user_subscriptions"
down_revision: Union[str, None] = "0005_scheduler_tables"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "user_subscriptions",
        sa.Column("id",         sa.Integer,                  primary_key=True),
        sa.Column("user_id",    sa.Integer,
                  sa.ForeignKey("users.id", ondelete="CASCADE"),
                  nullable=False),
        sa.Column("plan_code",  sa.String(30),               nullable=False, server_default="free"),
        sa.Column("status",     sa.String(20),               nullable=False, server_default="active"),
        sa.Column("trial_ends_at",       sa.DateTime(timezone=True), nullable=True),
        sa.Column("current_period_end",  sa.DateTime(timezone=True), nullable=True),
        sa.Column("stripe_customer_id",      sa.String(100), nullable=True),
        sa.Column("stripe_subscription_id",  sa.String(100), nullable=True),
        sa.Column("stripe_price_id",         sa.String(100), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True),  nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True),  nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_user_subscriptions_user_id", "user_subscriptions", ["user_id"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_user_subscriptions_user_id", table_name="user_subscriptions")
    op.drop_table("user_subscriptions")
