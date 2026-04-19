"""stripe_webhook_events idempotency table

Revision ID: 0011_stripe_webhook_events
Revises: 0010_subscription_trial_fields
Create Date: 2026-04-19
"""

from alembic import op
import sqlalchemy as sa

revision = "0011_stripe_webhook_events"
down_revision = "0010_subscription_trial_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "stripe_webhook_events",
        sa.Column("id",              sa.Integer(),               primary_key=True),
        sa.Column("stripe_event_id", sa.String(100),             nullable=False),
        sa.Column("event_type",      sa.String(100),             nullable=False),
        sa.Column("processed_at",    sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.UniqueConstraint("stripe_event_id", name="uq_stripe_webhook_event_id"),
    )
    op.create_index(
        "ix_stripe_webhook_events_stripe_event_id",
        "stripe_webhook_events",
        ["stripe_event_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_table("stripe_webhook_events")
