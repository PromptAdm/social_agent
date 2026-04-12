"""integration_log_table

Cria a tabela integration_logs para auditoria de todas as integrações
externas (Meta API, n8n, webhooks inbound).

Revision ID: 0004_integration_log
Revises: 0003_brand_config_fields
Create Date: 2026-04-12 00:01:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0004_integration_log"
down_revision: Union[str, None] = "0003_brand_config_fields"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    integrationstatus_enum = sa.Enum(
        "pendente", "sucesso", "erro", "retry",
        name="integrationstatus",
    )
    if op.get_bind().dialect.name == "postgresql":
        integrationstatus_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "integration_logs",
        sa.Column("id", sa.Integer, primary_key=True),

        # Contexto
        sa.Column("brand_id", sa.Integer, sa.ForeignKey("brands.id", ondelete="SET NULL"), nullable=True),
        sa.Column("post_id",  sa.Integer, sa.ForeignKey("posts.id",  ondelete="SET NULL"), nullable=True),

        # Identificação
        sa.Column("integration",  sa.String(50),  nullable=False),
        sa.Column("event_type",   sa.String(100), nullable=False),

        # Resultado
        sa.Column("status",         sa.Enum("pendente", "sucesso", "erro", "retry", name="integrationstatus"), nullable=False, server_default="pendente"),
        sa.Column("attempt_number", sa.Integer, nullable=False, server_default="1"),
        sa.Column("duration_ms",    sa.Integer, nullable=True),

        # Dados
        sa.Column("payload",       sa.Text, nullable=True),
        sa.Column("response",      sa.Text, nullable=True),
        sa.Column("error_message", sa.Text, nullable=True),
        sa.Column("error_code",    sa.String(50), nullable=True),
        sa.Column("external_id",   sa.String(255), nullable=True),

        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_index("ix_integration_logs_brand_id",   "integration_logs", ["brand_id"])
    op.create_index("ix_integration_logs_post_id",    "integration_logs", ["post_id"])
    op.create_index("ix_integration_logs_integration","integration_logs", ["integration"])
    op.create_index("ix_integration_logs_status",     "integration_logs", ["status"])
    op.create_index("ix_integration_logs_created_at", "integration_logs", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_integration_logs_created_at",  table_name="integration_logs")
    op.drop_index("ix_integration_logs_status",      table_name="integration_logs")
    op.drop_index("ix_integration_logs_integration", table_name="integration_logs")
    op.drop_index("ix_integration_logs_post_id",     table_name="integration_logs")
    op.drop_index("ix_integration_logs_brand_id",    table_name="integration_logs")
    op.drop_table("integration_logs")
    if op.get_bind().dialect.name == "postgresql":
        sa.Enum(name="integrationstatus").drop(op.get_bind(), checkfirst=True)
