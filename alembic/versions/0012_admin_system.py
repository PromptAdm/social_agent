"""admin_system: audit_logs, feature_overrides, superuser bootstrap

Revision ID: 0012_admin_system
Revises: 0011_stripe_webhook_events
Create Date: 2026-04-24
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import text

revision = "0012_admin_system"
down_revision = "0011_stripe_webhook_events"
branch_labels = None
depends_on = None

SUPER_ADMIN_EMAIL = "prompt.admia@gmail.com"
DEMOTE_EMAIL      = "angelo.msk8+1@example.com"


def upgrade() -> None:
    # ── 1. admin_audit_logs ────────────────────────────────────────────────────
    op.create_table(
        "admin_audit_logs",
        sa.Column("id",             sa.Integer(),               primary_key=True),
        sa.Column("actor_user_id",  sa.Integer(),               sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("target_user_id", sa.Integer(),               sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("action_type",    sa.String(80),              nullable=False),
        sa.Column("old_value",      sa.Text(),                  nullable=True),
        sa.Column("new_value",      sa.Text(),                  nullable=True),
        sa.Column("notes",          sa.String(500),             nullable=True),
        sa.Column("created_at",     sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_admin_audit_logs_actor",  "admin_audit_logs", ["actor_user_id"])
    op.create_index("ix_admin_audit_logs_target", "admin_audit_logs", ["target_user_id"])
    op.create_index("ix_admin_audit_logs_action", "admin_audit_logs", ["action_type"])

    # ── 2. feature_overrides ───────────────────────────────────────────────────
    op.create_table(
        "feature_overrides",
        sa.Column("id",              sa.Integer(),               primary_key=True),
        sa.Column("user_id",         sa.Integer(),               sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("feature",         sa.String(80),              nullable=False),
        sa.Column("enabled",         sa.Boolean(),               nullable=False, server_default="true"),
        sa.Column("reason",          sa.String(255),             nullable=True),
        sa.Column("granted_by",      sa.Integer(),               sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("expires_at",      sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at",      sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.UniqueConstraint("user_id", "feature", name="uq_feature_override_user_feature"),
    )
    op.create_index("ix_feature_overrides_user_id", "feature_overrides", ["user_id"])

    # ── 3. Bootstrap superuser + demote test account ───────────────────────────
    bind = op.get_bind()
    bind.execute(text(
        "UPDATE users SET is_superuser = TRUE WHERE email = :email"
    ), {"email": SUPER_ADMIN_EMAIL})

    bind.execute(text(
        "UPDATE users SET is_superuser = FALSE WHERE email = :email"
    ), {"email": DEMOTE_EMAIL})


def downgrade() -> None:
    bind = op.get_bind()
    bind.execute(text(
        "UPDATE users SET is_superuser = FALSE WHERE email = :email"
    ), {"email": SUPER_ADMIN_EMAIL})

    op.drop_table("feature_overrides")
    op.drop_table("admin_audit_logs")
