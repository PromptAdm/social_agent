"""brand_config_fields

Adiciona ao model Brand:
    - posting_frequency : frequência de publicação planejada (texto livre)
    - cta_default       : call-to-action padrão da marca

Revision ID: 0003_brand_config_fields
Revises: 0002_user_role_last_login
Create Date: 2026-04-12 00:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0003_brand_config_fields"
down_revision: Union[str, None] = "0002_user_role_last_login"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Frequência de publicação (ex: "diaria", "3x por semana", "semanal")
    op.add_column(
        "brands",
        sa.Column("posting_frequency", sa.String(100), nullable=True),
    )

    # CTA padrão da marca (ex: "Link na bio!", "Arraste para ver →")
    op.add_column(
        "brands",
        sa.Column("cta_default", sa.Text, nullable=True),
    )


def downgrade() -> None:
    op.drop_column("brands", "cta_default")
    op.drop_column("brands", "posting_frequency")
