"""credits and projects tables

Revision ID: 0008_credits_and_projects
Revises: 0007_subscription_extra_fields
Create Date: 2026-04-17
"""

from alembic import op
import sqlalchemy as sa

revision = "0008_credits_and_projects"
down_revision = "0007_subscription_extra_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── user_credits ──────────────────────────────────────────────────────────
    op.create_table(
        "user_credits",
        sa.Column("id",              sa.Integer(),                     primary_key=True),
        sa.Column("user_id",         sa.Integer(),                     sa.ForeignKey("users.id"), nullable=False),
        sa.Column("balance",         sa.Integer(),                     nullable=False, server_default="0"),
        sa.Column("lifetime_earned", sa.Integer(),                     nullable=False, server_default="0"),
        sa.Column("updated_at",      sa.DateTime(timezone=True),       server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_user_credits_user_id", "user_credits", ["user_id"], unique=True)

    # ── credit_logs ───────────────────────────────────────────────────────────
    op.create_table(
        "credit_logs",
        sa.Column("id",             sa.Integer(),                primary_key=True),
        sa.Column("user_id",        sa.Integer(),                sa.ForeignKey("users.id"), nullable=False),
        sa.Column("amount",         sa.Integer(),                nullable=False),
        sa.Column("operation_type", sa.String(50),               nullable=False),
        sa.Column("reference_id",   sa.Integer(),                nullable=True),
        sa.Column("reference_type", sa.String(20),               nullable=True),
        sa.Column("description",    sa.String(255),              nullable=True),
        sa.Column("created_at",     sa.DateTime(timezone=True),  server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_credit_logs_user_id", "credit_logs", ["user_id"], unique=False)

    # ── image_projects ────────────────────────────────────────────────────────
    op.create_table(
        "image_projects",
        sa.Column("id",              sa.Integer(),                primary_key=True),
        sa.Column("user_id",         sa.Integer(),                sa.ForeignKey("users.id"), nullable=False),
        sa.Column("brand_id",        sa.Integer(),                sa.ForeignKey("brands.id"), nullable=True),
        sa.Column("title",           sa.String(255),              nullable=True),
        sa.Column("status",          sa.String(20),               nullable=False, server_default="pending"),
        sa.Column("input_type",      sa.String(20),               nullable=False),
        sa.Column("input_prompt",    sa.Text(),                   nullable=True),
        sa.Column("input_file_path", sa.String(500),              nullable=True),
        sa.Column("credits_cost",    sa.Integer(),                nullable=False, server_default="0"),
        sa.Column("error_message",   sa.Text(),                   nullable=True),
        sa.Column("created_at",      sa.DateTime(timezone=True),  server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at",      sa.DateTime(timezone=True),  server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_image_projects_user_id", "image_projects", ["user_id"], unique=False)

    # ── video_projects ────────────────────────────────────────────────────────
    op.create_table(
        "video_projects",
        sa.Column("id",              sa.Integer(),                primary_key=True),
        sa.Column("user_id",         sa.Integer(),                sa.ForeignKey("users.id"), nullable=False),
        sa.Column("brand_id",        sa.Integer(),                sa.ForeignKey("brands.id"), nullable=True),
        sa.Column("title",           sa.String(255),              nullable=True),
        sa.Column("status",          sa.String(20),               nullable=False, server_default="pending"),
        sa.Column("input_file_path", sa.String(500),              nullable=True),
        sa.Column("input_file_name", sa.String(255),              nullable=True),
        sa.Column("input_file_size", sa.Integer(),                nullable=True),
        sa.Column("language",        sa.String(10),               nullable=False, server_default="pt"),
        sa.Column("credits_cost",    sa.Integer(),                nullable=False, server_default="0"),
        sa.Column("error_message",   sa.Text(),                   nullable=True),
        sa.Column("created_at",      sa.DateTime(timezone=True),  server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at",      sa.DateTime(timezone=True),  server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_video_projects_user_id", "video_projects", ["user_id"], unique=False)

    # ── generation_results ────────────────────────────────────────────────────
    op.create_table(
        "generation_results",
        sa.Column("id",            sa.Integer(),                primary_key=True),
        sa.Column("project_type",  sa.String(20),               nullable=False),
        sa.Column("project_id",    sa.Integer(),                nullable=False),
        sa.Column("result_type",   sa.String(30),               nullable=False),
        sa.Column("file_path",     sa.String(500),              nullable=True),
        sa.Column("file_url",      sa.String(500),              nullable=True),
        sa.Column("metadata_json", sa.Text(),                   nullable=True),
        sa.Column("created_at",    sa.DateTime(timezone=True),  server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_generation_results_project", "generation_results", ["project_type", "project_id"], unique=False)


def downgrade() -> None:
    op.drop_table("generation_results")
    op.drop_table("video_projects")
    op.drop_table("image_projects")
    op.drop_table("credit_logs")
    op.drop_table("user_credits")
