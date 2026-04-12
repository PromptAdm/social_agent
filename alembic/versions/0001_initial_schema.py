"""initial_schema

Cria todas as tabelas do Social Agent do zero.

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-04-11 00:00:00.000000

Tabelas criadas (ordem respeitando FKs):
    1. users
    2. brands
    3. content_pillars
    4. ideas
    5. posts
    6. media_assets
    7. comments
    8. reply_suggestions
    9. leads
    10. analytics_snapshots
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# ── Metadados da revisão ───────────────────────────────────────────────────────
revision: str = "0001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# ── Helpers ───────────────────────────────────────────────────────────────────

def _create_enum(name: str, *values: str) -> sa.Enum:
    """Cria um tipo ENUM nativo PostgreSQL, reutilizável nas colunas."""
    return sa.Enum(*values, name=name)


# ── upgrade ───────────────────────────────────────────────────────────────────

def upgrade() -> None:
    # ── Tipos ENUM (criados antes das tabelas) ─────────────────────────────────
    ideastatus_enum = _create_enum("ideastatus", "ideia", "rascunho", "arquivado")
    ideaprioridade_enum = _create_enum("ideaprioridade", "baixa", "media", "alta")
    ideaformato_enum = _create_enum(
        "ideaformatosugerido",
        "carrossel", "reels", "imagem_unica", "stories", "texto", "video", "live", "indefinido",
    )
    poststatus_enum = _create_enum(
        "poststatus", "rascunho", "aprovado", "agendado", "publicado", "arquivado"
    )
    socialplatform_enum = _create_enum(
        "socialplatform", "instagram", "linkedin", "twitter", "facebook", "tiktok"
    )
    postformato_enum = _create_enum(
        "postformato", "carrossel", "reels", "imagem_unica", "stories", "texto", "video", "live"
    )
    postprioridade_enum = _create_enum("postprioridade", "baixa", "media", "alta", "urgente")
    assettype_enum = _create_enum("assettype", "image", "video", "audio", "document")
    commentsentiment_enum = _create_enum(
        "commentsentiment", "positivo", "neutro", "negativo", "desconhecido"
    )
    commentclassificacao_enum = _create_enum(
        "commentclassificacao",
        "elogio", "critica", "duvida", "sugestao", "lead_potencial", "spam", "outro",
    )
    suggestionstatus_enum = _create_enum(
        "suggestionstatus", "pendente", "aprovado", "rejeitado", "publicado"
    )
    leadstatus_enum = _create_enum(
        "leadstatus", "novo", "contatado", "qualificado", "convertido", "perdido"
    )
    leadsource_enum = _create_enum(
        "leadsource",
        "comentario", "mensagem_direta", "mencao", "resposta_story", "manual",
    )

    # ENUM types são nativos apenas no PostgreSQL; SQLite usa VARCHAR
    if op.get_bind().dialect.name == "postgresql":
        for e in (
            ideastatus_enum, ideaprioridade_enum, ideaformato_enum,
            poststatus_enum, socialplatform_enum, postformato_enum, postprioridade_enum,
            assettype_enum, commentsentiment_enum, commentclassificacao_enum,
            suggestionstatus_enum, leadstatus_enum, leadsource_enum,
        ):
            e.create(op.get_bind(), checkfirst=True)

    # ── 1. users ───────────────────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("is_superuser", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_users_id", "users", ["id"])
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    # ── 2. brands ──────────────────────────────────────────────────────────────
    op.create_table(
        "brands",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("owner_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("niche", sa.String(255), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("tone_of_voice", sa.Text(), nullable=True),
        sa.Column("target_audience", sa.Text(), nullable=True),
        sa.Column("logo_url", sa.String(500), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_brands_id", "brands", ["id"])
    op.create_index("ix_brands_owner_id", "brands", ["owner_id"])

    # ── 3. content_pillars ─────────────────────────────────────────────────────
    op.create_table(
        "content_pillars",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("brand_id", sa.Integer(), sa.ForeignKey("brands.id"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("color_hex", sa.String(7), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_content_pillars_id", "content_pillars", ["id"])
    op.create_index("ix_content_pillars_brand_id", "content_pillars", ["brand_id"])

    # ── 4. ideas ───────────────────────────────────────────────────────────────
    op.create_table(
        "ideas",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("brand_id", sa.Integer(), sa.ForeignKey("brands.id"), nullable=False),
        sa.Column(
            "pillar_id",
            sa.Integer(),
            sa.ForeignKey("content_pillars.id"),
            nullable=True,
        ),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("source", sa.String(100), nullable=True),
        sa.Column(
            "status",
            sa.Enum("ideia", "rascunho", "arquivado", name="ideastatus"),
            nullable=False,
            server_default="ideia",
        ),
        sa.Column(
            "prioridade",
            sa.Enum("baixa", "media", "alta", name="ideaprioridade"),
            nullable=False,
            server_default="media",
        ),
        sa.Column(
            "formato_sugerido",
            sa.Enum(
                "carrossel", "reels", "imagem_unica", "stories",
                "texto", "video", "live", "indefinido",
                name="ideaformatosugerido",
            ),
            nullable=False,
            server_default="indefinido",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_ideas_id", "ideas", ["id"])
    op.create_index("ix_ideas_brand_id", "ideas", ["brand_id"])
    op.create_index("ix_ideas_status", "ideas", ["status"])

    # ── 5. posts ───────────────────────────────────────────────────────────────
    op.create_table(
        "posts",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("brand_id", sa.Integer(), sa.ForeignKey("brands.id"), nullable=False),
        sa.Column(
            "pillar_id",
            sa.Integer(),
            sa.ForeignKey("content_pillars.id"),
            nullable=True,
        ),
        sa.Column("idea_id", sa.Integer(), sa.ForeignKey("ideas.id"), nullable=True),
        sa.Column("caption", sa.Text(), nullable=False),
        sa.Column("hashtags", sa.Text(), nullable=True),
        sa.Column("cta", sa.Text(), nullable=True),
        sa.Column(
            "platform",
            sa.Enum("instagram", "linkedin", "twitter", "facebook", "tiktok", name="socialplatform"),
            nullable=False,
        ),
        sa.Column(
            "formato",
            sa.Enum(
                "carrossel", "reels", "imagem_unica", "stories",
                "texto", "video", "live",
                name="postformato",
            ),
            nullable=False,
            server_default="imagem_unica",
        ),
        sa.Column(
            "prioridade",
            sa.Enum("baixa", "media", "alta", "urgente", name="postprioridade"),
            nullable=False,
            server_default="media",
        ),
        sa.Column(
            "status",
            sa.Enum("rascunho", "aprovado", "agendado", "publicado", "arquivado", name="poststatus"),
            nullable=False,
            server_default="rascunho",
        ),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("external_post_id", sa.String(255), nullable=True),
        sa.Column(
            "approved_by_id",
            sa.Integer(),
            sa.ForeignKey("users.id"),
            nullable=True,
        ),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_posts_id", "posts", ["id"])
    op.create_index("ix_posts_brand_id", "posts", ["brand_id"])
    op.create_index("ix_posts_status", "posts", ["status"])

    # ── 6. media_assets ────────────────────────────────────────────────────────
    op.create_table(
        "media_assets",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("post_id", sa.Integer(), sa.ForeignKey("posts.id"), nullable=False),
        sa.Column("url", sa.String(1000), nullable=False),
        sa.Column(
            "asset_type",
            sa.Enum("image", "video", "audio", "document", name="assettype"),
            nullable=False,
        ),
        sa.Column("filename", sa.String(255), nullable=True),
        sa.Column("size_bytes", sa.Integer(), nullable=True),
        sa.Column("mime_type", sa.String(100), nullable=True),
        sa.Column("order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_media_assets_id", "media_assets", ["id"])
    op.create_index("ix_media_assets_post_id", "media_assets", ["post_id"])

    # ── 7. comments ────────────────────────────────────────────────────────────
    op.create_table(
        "comments",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("post_id", sa.Integer(), sa.ForeignKey("posts.id"), nullable=False),
        sa.Column("external_comment_id", sa.String(255), nullable=True, unique=True),
        sa.Column("author_username", sa.String(255), nullable=True),
        sa.Column("author_external_id", sa.String(255), nullable=True),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column(
            "sentiment",
            sa.Enum("positivo", "neutro", "negativo", "desconhecido", name="commentsentiment"),
            nullable=False,
            server_default="desconhecido",
        ),
        sa.Column(
            "classificacao",
            sa.Enum(
                "elogio", "critica", "duvida", "sugestao",
                "lead_potencial", "spam", "outro",
                name="commentclassificacao",
            ),
            nullable=False,
            server_default="outro",
        ),
        sa.Column("is_replied", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("commented_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_comments_id", "comments", ["id"])
    op.create_index("ix_comments_post_id", "comments", ["post_id"])
    op.create_index("ix_comments_classificacao", "comments", ["classificacao"])

    # ── 8. reply_suggestions ───────────────────────────────────────────────────
    op.create_table(
        "reply_suggestions",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "comment_id", sa.Integer(), sa.ForeignKey("comments.id"), nullable=False
        ),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("generated_by", sa.Text(), nullable=True),
        sa.Column(
            "status",
            sa.Enum("pendente", "aprovado", "rejeitado", "publicado", name="suggestionstatus"),
            nullable=False,
            server_default="pendente",
        ),
        sa.Column("is_ai_generated", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column(
            "approved_by_id",
            sa.Integer(),
            sa.ForeignKey("users.id"),
            nullable=True,
        ),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_reply_suggestions_id", "reply_suggestions", ["id"])
    op.create_index("ix_reply_suggestions_comment_id", "reply_suggestions", ["comment_id"])

    # ── 9. leads ───────────────────────────────────────────────────────────────
    op.create_table(
        "leads",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("brand_id", sa.Integer(), sa.ForeignKey("brands.id"), nullable=False),
        sa.Column("username", sa.String(255), nullable=True),
        sa.Column("full_name", sa.String(255), nullable=True),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("phone", sa.String(50), nullable=True),
        sa.Column("platform", sa.String(50), nullable=True),
        sa.Column("external_user_id", sa.String(255), nullable=True),
        sa.Column(
            "source",
            sa.Enum(
                "comentario", "mensagem_direta", "mencao", "resposta_story", "manual",
                name="leadsource",
            ),
            nullable=False,
            server_default="manual",
        ),
        sa.Column(
            "status",
            sa.Enum("novo", "contatado", "qualificado", "convertido", "perdido", name="leadstatus"),
            nullable=False,
            server_default="novo",
        ),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_leads_id", "leads", ["id"])
    op.create_index("ix_leads_brand_id", "leads", ["brand_id"])
    op.create_index("ix_leads_status", "leads", ["status"])

    # ── 10. analytics_snapshots ────────────────────────────────────────────────
    op.create_table(
        "analytics_snapshots",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("brand_id", sa.Integer(), sa.ForeignKey("brands.id"), nullable=False),
        sa.Column("platform", sa.String(50), nullable=False),
        sa.Column("snapshot_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("followers_count", sa.Integer(), nullable=True),
        sa.Column("following_count", sa.Integer(), nullable=True),
        sa.Column("posts_count", sa.Integer(), nullable=True),
        sa.Column("impressions", sa.Integer(), nullable=True),
        sa.Column("reach", sa.Integer(), nullable=True),
        sa.Column("profile_views", sa.Integer(), nullable=True),
        sa.Column("likes_total", sa.Integer(), nullable=True),
        sa.Column("comments_total", sa.Integer(), nullable=True),
        sa.Column("shares_total", sa.Integer(), nullable=True),
        sa.Column("saves_total", sa.Integer(), nullable=True),
        sa.Column("engagement_rate", sa.Float(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_analytics_snapshots_id", "analytics_snapshots", ["id"])
    op.create_index("ix_analytics_snapshots_brand_id", "analytics_snapshots", ["brand_id"])
    op.create_index("ix_analytics_snapshots_snapshot_date", "analytics_snapshots", ["snapshot_date"])


# ── downgrade ─────────────────────────────────────────────────────────────────

def downgrade() -> None:
    # Drop tabelas na ordem inversa (respeitar FKs)
    op.drop_table("analytics_snapshots")
    op.drop_table("leads")
    op.drop_table("reply_suggestions")
    op.drop_table("comments")
    op.drop_table("media_assets")
    op.drop_table("posts")
    op.drop_table("ideas")
    op.drop_table("content_pillars")
    op.drop_table("brands")
    op.drop_table("users")

    # Drop tipos ENUM (somente PostgreSQL)
    if op.get_bind().dialect.name == "postgresql":
        for name in (
            "leadsource", "leadstatus",
            "suggestionstatus",
            "commentclassificacao", "commentsentiment",
            "assettype",
            "postprioridade", "postformato", "socialplatform", "poststatus",
            "ideaformatosugerido", "ideaprioridade", "ideastatus",
        ):
            sa.Enum(name=name).drop(op.get_bind(), checkfirst=True)
