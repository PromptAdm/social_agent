"""connected_accounts table

Revision ID: 0009_connected_accounts
Revises: 0008_credits_and_projects
Create Date: 2026-04-18
"""

from alembic import op
import sqlalchemy as sa

revision = "0009_connected_accounts"
down_revision = "0008_credits_and_projects"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "connected_accounts",
        sa.Column("id",                  sa.Integer(),               primary_key=True),
        sa.Column("user_id",             sa.Integer(),               sa.ForeignKey("users.id",  ondelete="CASCADE"),   nullable=False),
        sa.Column("brand_id",            sa.Integer(),               sa.ForeignKey("brands.id", ondelete="SET NULL"),  nullable=True),
        sa.Column("provider",            sa.String(30),              nullable=False),
        sa.Column("external_account_id", sa.String(255),             nullable=True),
        sa.Column("account_name",        sa.String(255),             nullable=True),
        sa.Column("account_picture_url", sa.String(500),             nullable=True),
        sa.Column("access_token",        sa.Text(),                  nullable=False),
        sa.Column("refresh_token",       sa.Text(),                  nullable=True),
        sa.Column("expires_at",          sa.DateTime(timezone=True), nullable=True),
        sa.Column("scopes",              sa.String(500),             nullable=True),
        sa.Column("metadata_json",       sa.Text(),                  nullable=True),
        sa.Column("is_active",           sa.Boolean(),               nullable=False, server_default="1"),
        sa.Column("created_at",          sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at",          sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_connected_accounts_user_id",  "connected_accounts", ["user_id"])
    op.create_index("ix_connected_accounts_brand_id", "connected_accounts", ["brand_id"])
    op.create_index("ix_connected_accounts_provider", "connected_accounts", ["provider"])
    op.create_unique_constraint(
        "uq_connected_account",
        "connected_accounts",
        ["user_id", "provider", "external_account_id"],
    )


def downgrade() -> None:
    op.drop_table("connected_accounts")
