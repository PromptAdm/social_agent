"""subscription_extra_fields

Adiciona campos faltantes à tabela user_subscriptions:
    - billing_cycle          : ciclo de cobrança (monthly / yearly)
    - current_period_start   : início do ciclo atual
    - cancel_at_period_end   : se true, cancela ao fim do período pago

Não altera nenhuma outra tabela.
Rollback: remove as três colunas — sem perda de dados históricos.

Revision ID: 0007_subscription_extra_fields
Revises: 0006_user_subscriptions
Create Date: 2026-04-16 00:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0007_subscription_extra_fields"
down_revision: Union[str, None] = "0006_user_subscriptions"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("user_subscriptions") as batch_op:
        batch_op.add_column(
            sa.Column("billing_cycle", sa.String(10), nullable=False, server_default="monthly")
        )
        batch_op.add_column(
            sa.Column("current_period_start", sa.DateTime(timezone=True), nullable=True)
        )
        batch_op.add_column(
            sa.Column("cancel_at_period_end", sa.Boolean, nullable=False, server_default="0")
        )


def downgrade() -> None:
    with op.batch_alter_table("user_subscriptions") as batch_op:
        batch_op.drop_column("cancel_at_period_end")
        batch_op.drop_column("current_period_start")
        batch_op.drop_column("billing_cycle")
