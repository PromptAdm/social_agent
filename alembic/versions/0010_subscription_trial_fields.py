"""subscription trial fields

Revision ID: 0010_subscription_trial_fields
Revises: 0009_connected_accounts
Create Date: 2026-04-19
"""

from alembic import op
import sqlalchemy as sa

revision = "0010_subscription_trial_fields"
down_revision = "0009_connected_accounts"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "user_subscriptions",
        sa.Column("trial_started_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "user_subscriptions",
        sa.Column("has_used_trial", sa.Boolean(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_column("user_subscriptions", "has_used_trial")
    op.drop_column("user_subscriptions", "trial_started_at")
