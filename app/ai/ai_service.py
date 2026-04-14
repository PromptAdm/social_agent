"""
Service: AI — Camada de Orquestração da Inteligência Artificial

Responsabilidades:
    1. Validar ownership (brand pertence ao usuário)
    2. Carregar contexto do banco (brand, ideia, comentário, métricas)
    3. Montar os dicts de contexto para o provider
    4. Chamar o provider correto (mock ou futuro LLM real)
    5. Persistir resultados relevantes no banco (ex: atualizar classificação do comentário)
    6. Retornar schemas de resposta

O provider é obtido via get_ai_provider() — função que lê AI_PROVIDER do .env
e retorna a instância adequada. Para trocar de mock para real, só muda o .env.
"""

from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.ai.providers.base import AIProvider
from app.ai.providers.mock import MockAIProvider
from app.ai.schemas import (
    AICommentAnalysisOut,
    AIIdeaGenerateOut,
    AIIdeaGenerateRequest,
    AIPostFromIdeaRequest,
    AIPostOut,
    AIReplyOut,
    AIWeeklyReportOut,
    AIWeeklyReportRequest,
)
from app.core.config import get_settings
from app.models.brand import Brand
from app.models.comment import Comment
from app.models.idea import Idea
from app.models.lead import Lead
from app.models.post import Post, PostStatus
from app.models.reply_suggestion import ReplySuggestion, SuggestionStatus


# ── Provider factory ───────────────────────────────────────────────────────────

def get_ai_provider() -> AIProvider:
    """
    Retorna o provedor de IA configurado via AI_PROVIDER no .env.

    Valores suportados:
        mock      → MockAIProvider (padrão, sem custo, sem API key)
        openai    → OpenAIProvider (futuro)
        anthropic → AnthropicProvider (futuro)
    """
    settings = get_settings()
    provider_name = getattr(settings, "AI_PROVIDER", "mock").lower()

    if provider_name == "mock":
        return MockAIProvider()

    if provider_name == "anthropic":
        api_key = getattr(settings, "ANTHROPIC_API_KEY", "")
        if not api_key:
            raise ValueError(
                "AI_PROVIDER=anthropic mas ANTHROPIC_API_KEY não está definida no .env"
            )
        from app.ai.providers.anthropic_provider import AnthropicProvider
        return AnthropicProvider(api_key=api_key)

    # Fallback seguro
    return MockAIProvider()


# ── Helpers ────────────────────────────────────────────────────────────────────

def _get_brand(db: Session, brand_id: int, user_id: int) -> Brand:
    brand = db.query(Brand).filter(Brand.id == brand_id, Brand.owner_id == user_id).first()
    if not brand:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Brand não encontrada.")
    return brand


def _build_brand_context(brand: Brand) -> dict:
    """Monta o dict de contexto da brand para o provider."""
    return {
        "brand_name": brand.name,
        "niche": brand.niche or "geral",
        "tone_of_voice": brand.tone_of_voice or "profissional e amigável",
        "target_audience": brand.target_audience or "público geral",
        "description": brand.description or "",
    }


# ── 1. Gerar Ideias ────────────────────────────────────────────────────────────

def generate_ideas(
    db: Session,
    request: AIIdeaGenerateRequest,
    user_id: int,
    provider: AIProvider | None = None,
) -> AIIdeaGenerateOut:
    """
    Gera ideias de conteúdo enriquecidas usando IA.

    As ideias retornadas NÃO são salvas automaticamente.
    Para persistir, use POST /ideas com os dados desejados.
    """
    brand = _get_brand(db, request.brand_id, user_id)
    brand_context = _build_brand_context(brand)

    # Incorporar tema ao contexto se fornecido
    if request.tema:
        brand_context["niche"] = request.tema

    p = provider or get_ai_provider()
    return p.generate_ideas(request, brand_context)


# ── 2. Ideia → Post ────────────────────────────────────────────────────────────

def idea_to_post(
    db: Session,
    idea_id: int,
    request: AIPostFromIdeaRequest,
    user_id: int,
    provider: AIProvider | None = None,
) -> AIPostOut:
    """
    Transforma uma ideia existente em post completo via IA.

    Herda contexto da ideia (titulo, descricao, formato_sugerido)
    e da brand (niche, tone_of_voice, target_audience).
    Não cria registro no banco — use POST /ideas/{id}/to-post para isso.
    """
    idea = db.query(Idea).filter(Idea.id == idea_id).first()
    if not idea:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ideia não encontrada.")

    brand = _get_brand(db, idea.brand_id, user_id)
    brand_context = _build_brand_context(brand)

    idea_context = {
        "titulo": idea.title,
        "descricao": idea.description or "",
        "formato_sugerido": idea.formato_sugerido.value if idea.formato_sugerido else "imagem_unica",
        "gancho": "",  # preenchido por LLM real futuramente
    }

    p = provider or get_ai_provider()
    return p.idea_to_post(request, idea_context, brand_context)


# ── 3. Analisar Comentário ─────────────────────────────────────────────────────

def analyze_comment(
    db: Session,
    comment_id: int,
    user_id: int,
    provider: AIProvider | None = None,
) -> AICommentAnalysisOut:
    """
    Analisa um comentário via IA: categoria, urgência, sentimento e resposta sugerida.

    Efeito colateral: atualiza comment.classificacao e comment.sentiment no banco
    para manter consistência com os filtros de engajamento.
    """
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comentário não encontrado.")

    # Obter brand via post para validar acesso (comentário → post → brand)
    post = db.query(Post).filter(Post.id == comment.post_id).first()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post não encontrado.")

    brand = _get_brand(db, post.brand_id, user_id)
    brand_context = _build_brand_context(brand)

    comment_context = {
        "body": comment.body,
        "author_username": comment.author_username or "usuário",
        "platform": post.platform.value if post.platform else "instagram",
    }

    p = provider or get_ai_provider()
    result = p.analyze_comment(comment_context, brand_context)

    # Persistir classificação no banco para manter consistência com filtros
    comment.classificacao = result.categoria
    comment.sentiment = result.sentimento
    db.commit()

    return result


# ── 4. Gerar Resposta ──────────────────────────────────────────────────────────

def generate_reply(
    db: Session,
    comment_id: int,
    user_id: int,
    provider: AIProvider | None = None,
) -> AIReplyOut:
    """
    Gera resposta personalizada para um comentário via IA.

    Usa a classificação existente do comentário. Se ainda não classificado,
    realiza a análise automática antes de gerar a resposta.

    Salva a resposta como ReplySuggestion no banco (status: pendente).
    """
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comentário não encontrado.")

    post = db.query(Post).filter(Post.id == comment.post_id).first()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post não encontrado.")

    brand = _get_brand(db, post.brand_id, user_id)
    brand_context = _build_brand_context(brand)

    comment_context = {
        "body": comment.body,
        "author_username": comment.author_username or "usuário",
    }

    p = provider or get_ai_provider()

    # Montar analysis a partir do estado atual do comentário
    analysis = AICommentAnalysisOut(
        categoria=comment.classificacao,
        sentimento=comment.sentiment,
        urgencia="media",   # urgência não está no modelo — valor padrão
        resposta="",
        justificativa="",
        source="persisted",
    )

    result = p.generate_reply(comment_context, analysis, brand_context)

    # Salvar como ReplySuggestion para o fluxo de aprovação
    suggestion = ReplySuggestion(
        comment_id=comment_id,
        body=result.resposta,
        generated_by=f"ai_{result.source}",
        is_ai_generated=True,
        status=SuggestionStatus.PENDING,
    )
    db.add(suggestion)
    db.commit()

    return result


# ── 5. Relatório Semanal ───────────────────────────────────────────────────────

def generate_weekly_report(
    db: Session,
    request: AIWeeklyReportRequest,
    user_id: int,
    provider: AIProvider | None = None,
) -> AIWeeklyReportOut:
    """
    Gera relatório semanal consolidado da brand via IA.

    Coleta métricas dos últimos 7 dias (ou semana de referência) e produz:
    - Destaques do período
    - Performance de posts
    - Resumo de leads
    - Recomendações estratégicas
    - Conclusão executiva
    """
    brand = _get_brand(db, request.brand_id, user_id)
    brand_context = _build_brand_context(brand)

    # Calcular intervalo de datas
    now = datetime.now(timezone.utc)
    if request.week_reference:
        # Parsear ISO week (ex: "2025-W15") → segunda-feira da semana
        try:
            year, week_str = request.week_reference.split("-W")
            week_start = datetime.fromisocalendar(int(year), int(week_str), 1).replace(tzinfo=timezone.utc)
            week_end = week_start + timedelta(days=7)
            periodo = f"Semana {week_str} de {year} ({week_start.strftime('%d/%m')} a {week_end.strftime('%d/%m/%Y')})"
        except (ValueError, AttributeError):
            week_start = now - timedelta(days=7)
            week_end = now
            periodo = f"Últimos 7 dias ({week_start.strftime('%d/%m')} a {now.strftime('%d/%m/%Y')})"
    else:
        week_start = now - timedelta(days=7)
        week_end = now
        periodo = f"Últimos 7 dias ({week_start.strftime('%d/%m')} a {now.strftime('%d/%m/%Y')})"

    # ── Métricas de Posts ──────────────────────────────────────────────────────
    post_counts_raw = (
        db.query(Post.status, func.count(Post.id).label("total"))
        .filter(Post.brand_id == request.brand_id)
        .group_by(Post.status)
        .all()
    )
    posts_by_status = {row.status.value: row.total for row in post_counts_raw}
    total_posts = sum(posts_by_status.values())

    published_in_period = (
        db.query(func.count(Post.id))
        .filter(
            Post.brand_id == request.brand_id,
            Post.status == PostStatus.PUBLISHED,
            Post.published_at >= week_start,
            Post.published_at <= week_end,
        )
        .scalar() or 0
    )

    # ── Métricas de Leads ──────────────────────────────────────────────────────
    lead_counts_raw = (
        db.query(Lead.status, func.count(Lead.id).label("total"))
        .filter(Lead.brand_id == request.brand_id)
        .group_by(Lead.status)
        .all()
    )
    leads_by_status = {row.status.value: row.total for row in lead_counts_raw}
    total_leads = sum(leads_by_status.values())

    new_leads = (
        db.query(func.count(Lead.id))
        .filter(
            Lead.brand_id == request.brand_id,
            Lead.created_at >= week_start,
            Lead.created_at <= week_end,
        )
        .scalar() or 0
    )

    # ── Categorias de Comentários do Período ──────────────────────────────────
    comment_cats_raw = (
        db.query(Comment.classificacao, func.count(Comment.id).label("total"))
        .join(Post, Comment.post_id == Post.id)
        .filter(
            Post.brand_id == request.brand_id,
            Comment.created_at >= week_start,
            Comment.created_at <= week_end,
        )
        .group_by(Comment.classificacao)
        .all()
    )
    top_comment_categories = {row.classificacao.value: row.total for row in comment_cats_raw}

    report_context = {
        "periodo": periodo,
        "total_posts": total_posts,
        "posts_by_status": posts_by_status,
        "published_posts": published_in_period,
        "draft_posts": posts_by_status.get("rascunho", 0),
        "approved_posts": posts_by_status.get("aprovado", 0),
        "total_leads": total_leads,
        "new_leads": new_leads,
        "leads_by_status": leads_by_status,
        "top_comment_categories": top_comment_categories,
    }

    p = provider or get_ai_provider()
    return p.generate_weekly_report(report_context, brand_context)
