"""
Service: Panel — Painel Web

Funções de agregação otimizadas para consumo pelo frontend.
Cada função consolida múltiplas queries em um único objeto de resposta,
eliminando a necessidade de múltiplas chamadas da UI.

Funções:
    get_dashboard   — contagens agregadas (posts, comentários, leads)
    get_content     — posts enriquecidos com comment_count e available_actions
    get_engagement  — comentários enriquecidos com contexto do post e sugestões
"""

from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.brand import Brand
from app.models.comment import Comment, CommentClassificacao
from app.models.idea import Idea
from app.models.lead import Lead
from app.models.post import Post, PostStatus
from app.models.reply_suggestion import ReplySuggestion
from app.schemas.panel import (
    EngagementStats,
    LeadStats,
    PanelCommentOut,
    PanelContentOut,
    PanelDashboardOut,
    PanelEngagementOut,
    PanelPostOut,
    PostStats,
)
from app.schemas.reply_suggestion import ReplySuggestionOut


# ── Helpers ────────────────────────────────────────────────────────────────────

def _assert_ownership(db: Session, brand_id: int, user_id: int) -> Brand:
    brand = db.query(Brand).filter(Brand.id == brand_id, Brand.owner_id == user_id).first()
    if not brand:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Brand não encontrada.")
    return brand


# Urgência calculada a partir da classificação do comentário
_URGENCY_MAP: dict[CommentClassificacao, str] = {
    CommentClassificacao.LEAD_POTENCIAL: "alta",
    CommentClassificacao.CRITICA:        "alta",
    CommentClassificacao.DUVIDA:         "media",
    CommentClassificacao.SUGESTAO:       "baixa",
    CommentClassificacao.ELOGIO:         "baixa",
    CommentClassificacao.SPAM:           "baixa",
    CommentClassificacao.OUTRO:          "baixa",
}

# Ações disponíveis por status do post
_ACTIONS_BY_STATUS: dict[PostStatus, list[str]] = {
    PostStatus.DRAFT:      ["edit", "approve", "reject", "duplicate"],
    PostStatus.APPROVED:   ["reject", "schedule", "publish", "duplicate"],
    PostStatus.SCHEDULED:  ["publish", "duplicate"],
    PostStatus.PUBLISHED:  ["duplicate"],
    PostStatus.ARCHIVED:   ["duplicate"],
}


# ── 1. Dashboard ───────────────────────────────────────────────────────────────

def get_dashboard(db: Session, brand_id: int, user_id: int) -> PanelDashboardOut:
    """
    Retorna contagens agregadas para o dashboard principal.
    Uma única chamada fornece dados para os 3 widgets: Posts, Engajamento, Leads.
    """
    brand = _assert_ownership(db, brand_id, user_id)

    # ── Posts por status (uma query com GROUP BY) ──────────────────────────────
    post_rows = (
        db.query(Post.status, func.count(Post.id).label("total"))
        .filter(Post.brand_id == brand_id)
        .group_by(Post.status)
        .all()
    )
    por_status: dict[str, int] = {row.status.value: row.total for row in post_rows}
    total_posts = sum(por_status.values())

    post_stats = PostStats(
        total=total_posts,
        por_status=por_status,
        pendentes_aprovacao=por_status.get(PostStatus.APPROVED.value, 0),
        agendados=por_status.get(PostStatus.SCHEDULED.value, 0),
    )

    # ── Comentários (join com posts para filtrar por brand) ────────────────────
    base_comment_q = (
        db.query(Comment)
        .join(Post, Comment.post_id == Post.id)
        .filter(Post.brand_id == brand_id)
    )

    total_comments = base_comment_q.with_entities(func.count(Comment.id)).scalar() or 0
    sem_resposta = (
        base_comment_q
        .filter(Comment.is_replied == False)  # noqa: E712
        .with_entities(func.count(Comment.id))
        .scalar() or 0
    )
    leads_potenciais = (
        base_comment_q
        .filter(Comment.classificacao == CommentClassificacao.LEAD_POTENCIAL)
        .with_entities(func.count(Comment.id))
        .scalar() or 0
    )
    criticas_pendentes = (
        base_comment_q
        .filter(
            Comment.classificacao == CommentClassificacao.CRITICA,
            Comment.is_replied == False,  # noqa: E712
        )
        .with_entities(func.count(Comment.id))
        .scalar() or 0
    )

    engagement_stats = EngagementStats(
        total_comentarios=total_comments,
        sem_resposta=sem_resposta,
        leads_potenciais=leads_potenciais,
        criticas_pendentes=criticas_pendentes,
    )

    # ── Leads por status ───────────────────────────────────────────────────────
    lead_rows = (
        db.query(Lead.status, func.count(Lead.id).label("total"))
        .filter(Lead.brand_id == brand_id)
        .group_by(Lead.status)
        .all()
    )
    leads_por_status: dict[str, int] = {row.status.value: row.total for row in lead_rows}
    total_leads = sum(leads_por_status.values())

    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    novos_7_dias = (
        db.query(func.count(Lead.id))
        .filter(Lead.brand_id == brand_id, Lead.created_at >= week_ago)
        .scalar() or 0
    )

    lead_stats = LeadStats(
        total=total_leads,
        novos_ultimos_7_dias=novos_7_dias,
        por_status=leads_por_status,
    )

    return PanelDashboardOut(
        brand_id=brand_id,
        brand_name=brand.name,
        posts=post_stats,
        engagement=engagement_stats,
        leads=lead_stats,
        generated_at=datetime.now(timezone.utc),
    )


# ── 2. Content Panel ───────────────────────────────────────────────────────────

def get_content(
    db: Session,
    brand_id: int,
    user_id: int,
    *,
    post_status: PostStatus | None = None,
) -> PanelContentOut:
    """
    Retorna posts enriquecidos com comment_count, idea_title e available_actions.
    Otimizado: comment counts em query separada com GROUP BY (não N+1).
    """
    _assert_ownership(db, brand_id, user_id)

    # Buscar posts (com filtro opcional de status)
    query = db.query(Post).filter(Post.brand_id == brand_id)
    if post_status is not None:
        query = query.filter(Post.status == post_status)
    posts = query.order_by(Post.created_at.desc()).all()

    if not posts:
        return PanelContentOut(brand_id=brand_id, total=0, posts=[])

    post_ids = [p.id for p in posts]

    # Comment count por post_id em uma única query
    comment_count_rows = (
        db.query(Comment.post_id, func.count(Comment.id).label("cnt"))
        .filter(Comment.post_id.in_(post_ids))
        .group_by(Comment.post_id)
        .all()
    )
    comment_counts: dict[int, int] = {row.post_id: row.cnt for row in comment_count_rows}

    # Idea titles para os idea_ids referenciados
    idea_ids = [p.idea_id for p in posts if p.idea_id is not None]
    idea_titles: dict[int, str] = {}
    if idea_ids:
        idea_rows = db.query(Idea.id, Idea.title).filter(Idea.id.in_(idea_ids)).all()
        idea_titles = {row.id: row.title for row in idea_rows}

    panel_posts: list[PanelPostOut] = []
    for post in posts:
        excerpt = post.caption[:120] + "…" if len(post.caption) > 120 else post.caption
        panel_posts.append(PanelPostOut(
            id=post.id,
            caption=post.caption,
            caption_excerpt=excerpt,
            hashtags=post.hashtags,
            cta=post.cta,
            platform=post.platform,
            formato=post.formato,
            status=post.status,
            prioridade=post.prioridade,
            scheduled_at=post.scheduled_at,
            published_at=post.published_at,
            approved_by_id=post.approved_by_id,
            approved_at=post.approved_at,
            comment_count=comment_counts.get(post.id, 0),
            idea_title=idea_titles.get(post.idea_id) if post.idea_id else None,
            available_actions=_ACTIONS_BY_STATUS.get(post.status, ["duplicate"]),
            created_at=post.created_at,
            updated_at=post.updated_at,
        ))

    return PanelContentOut(brand_id=brand_id, total=len(panel_posts), posts=panel_posts)


# ── 3. Engagement Panel ────────────────────────────────────────────────────────

def get_engagement(
    db: Session,
    brand_id: int,
    user_id: int,
    *,
    only_unanswered: bool = False,
) -> PanelEngagementOut:
    """
    Retorna comentários enriquecidos com contexto do post e sugestões de resposta.
    Urgência é calculada a partir da classificação para facilitar priorização visual.
    Otimizado: reply suggestions carregadas em query única (não N+1).
    """
    _assert_ownership(db, brand_id, user_id)

    # Buscar comentários com join nos posts da brand
    comment_query = (
        db.query(Comment, Post.caption.label("post_caption"), Post.platform.label("post_platform"))
        .join(Post, Comment.post_id == Post.id)
        .filter(Post.brand_id == brand_id)
    )
    if only_unanswered:
        comment_query = comment_query.filter(Comment.is_replied == False)  # noqa: E712

    rows = comment_query.order_by(Comment.created_at.desc()).all()

    if not rows:
        return PanelEngagementOut(brand_id=brand_id, total=0, sem_resposta=0, comments=[])

    comment_ids = [row.Comment.id for row in rows]

    # Carregar todas as reply suggestions em uma única query
    suggestion_rows = (
        db.query(ReplySuggestion)
        .filter(ReplySuggestion.comment_id.in_(comment_ids))
        .order_by(ReplySuggestion.created_at.desc())
        .all()
    )
    # Agrupar por comment_id
    suggestions_by_comment: dict[int, list[ReplySuggestion]] = {}
    for s in suggestion_rows:
        suggestions_by_comment.setdefault(s.comment_id, []).append(s)

    panel_comments: list[PanelCommentOut] = []
    sem_resposta = 0

    for row in rows:
        comment = row.Comment
        post_caption = row.post_caption or ""
        post_platform = row.post_platform

        post_excerpt = post_caption[:80] + "…" if len(post_caption) > 80 else post_caption
        urgencia = _URGENCY_MAP.get(comment.classificacao, "baixa")

        if not comment.is_replied:
            sem_resposta += 1

        suggestions = suggestions_by_comment.get(comment.id, [])

        panel_comments.append(PanelCommentOut(
            id=comment.id,
            body=comment.body,
            author_username=comment.author_username,
            classificacao=comment.classificacao,
            sentiment=comment.sentiment,
            urgencia=urgencia,
            is_replied=comment.is_replied,
            post_id=comment.post_id,
            post_caption_excerpt=post_excerpt,
            post_platform=post_platform,
            reply_suggestions=[
                ReplySuggestionOut.model_validate(s) for s in suggestions
            ],
            created_at=comment.created_at,
        ))

    return PanelEngagementOut(
        brand_id=brand_id,
        total=len(panel_comments),
        sem_resposta=sem_resposta,
        comments=panel_comments,
    )
