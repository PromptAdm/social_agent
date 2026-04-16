"""scheduler_tables

Cria três tabelas para o sistema de agendamento confiável em produção:
    - scheduler_lock          : lock distribuído (previne execução duplicada entre workers)
    - scheduler_executions    : log persistido de cada ciclo do scheduler
    - scheduler_post_attempts : histórico de tentativas por post (cap de retries)

Insere a linha inicial do lock (id=1) para que o primeiro UPDATE funcione.

Revision ID: 0005_scheduler_tables
Revises: 0004_integration_log
Create Date: 2026-04-15 00:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0005_scheduler_tables"
down_revision: Union[str, None] = "0004_integration_log"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── scheduler_lock ────────────────────────────────────────────────────────
    op.create_table(
        "scheduler_lock",
        sa.Column("id",         sa.Integer,                  primary_key=True),
        sa.Column("locked_by",  sa.String(150),              nullable=True),
        sa.Column("locked_at",  sa.DateTime(timezone=True),  nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True),  nullable=True),
    )
    # Linha única — sempre id=1. O UPDATE condicional depende desta linha existir.
    op.execute("INSERT INTO scheduler_lock (id) VALUES (1)")

    # ── scheduler_executions ──────────────────────────────────────────────────
    op.create_table(
        "scheduler_executions",
        sa.Column("id",              sa.Integer,                 primary_key=True),
        sa.Column("ran_at",          sa.DateTime(timezone=True), nullable=False),
        sa.Column("worker_id",       sa.String(150),             nullable=True),
        sa.Column("lock_acquired",   sa.Boolean,                 nullable=False, server_default="1"),
        sa.Column("due_count",       sa.Integer,                 nullable=False, server_default="0"),
        sa.Column("published_count", sa.Integer,                 nullable=False, server_default="0"),
        sa.Column("failed_count",    sa.Integer,                 nullable=False, server_default="0"),
        sa.Column("skipped_count",   sa.Integer,                 nullable=False, server_default="0"),
        sa.Column("errors_json",     sa.Text,                    nullable=True),
        sa.Column("duration_ms",     sa.Integer,                 nullable=False, server_default="0"),
        sa.Column("created_at",      sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_scheduler_executions_ran_at", "scheduler_executions", ["ran_at"])

    # ── scheduler_post_attempts ───────────────────────────────────────────────
    op.create_table(
        "scheduler_post_attempts",
        sa.Column("id",             sa.Integer,                 primary_key=True),
        sa.Column("post_id",        sa.Integer,
                  sa.ForeignKey("posts.id", ondelete="SET NULL"), nullable=True),
        sa.Column("status",         sa.String(20),              nullable=False),
        sa.Column("error_message",  sa.Text,                    nullable=True),
        sa.Column("attempt_number", sa.Integer,                 nullable=False, server_default="1"),
        sa.Column("worker_id",      sa.String(150),             nullable=True),
        sa.Column("attempted_at",   sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_scheduler_post_attempts_post_id",     "scheduler_post_attempts", ["post_id"])
    op.create_index("ix_scheduler_post_attempts_attempted_at","scheduler_post_attempts", ["attempted_at"])


def downgrade() -> None:
    op.drop_index("ix_scheduler_post_attempts_attempted_at", table_name="scheduler_post_attempts")
    op.drop_index("ix_scheduler_post_attempts_post_id",      table_name="scheduler_post_attempts")
    op.drop_table("scheduler_post_attempts")

    op.drop_index("ix_scheduler_executions_ran_at", table_name="scheduler_executions")
    op.drop_table("scheduler_executions")

    op.drop_table("scheduler_lock")
