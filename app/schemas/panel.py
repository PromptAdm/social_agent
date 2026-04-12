"""
Schemas Pydantic: Panel (Painel Web)

Schemas otimizados para consumo direto pelo frontend.
Cada endpoint de painel retorna um único objeto rico com todos os dados
necessários para renderizar aquela tela, evitando múltiplas chamadas.

Endpoints correspondentes (prefixo /api/v1/panel):
    GET /panel/dashboard/{brand_id}   → PanelDashboardOut
    GET /panel/content/{brand_id}     → PanelContentOut
    GET /panel/engagement/{brand_id}  → PanelEngagementOut
"""

from datetime import datetime

from pydantic import BaseModel

from app.models.comment import CommentClassificacao, CommentSentiment
from app.models.post import PostFormato, PostPrioridade, PostStatus, SocialPlatform
from app.schemas.reply_suggestion import ReplySuggestionOut


# ── Dashboard ─────────────────────────────────────────────────────────────────

class PostStats(BaseModel):
    """Contagens de posts por status para o dashboard."""
    total: int
    por_status: dict[str, int]          # {"rascunho": 3, "aprovado": 2, ...}
    pendentes_aprovacao: int            # posts no status "aprovado" aguardando agendamento
    agendados: int                      # posts no status "agendado"


class EngagementStats(BaseModel):
    """Contagens de engajamento para o dashboard."""
    total_comentarios: int
    sem_resposta: int                   # is_replied = False
    leads_potenciais: int               # classificacao = LEAD_POTENCIAL
    criticas_pendentes: int             # classificacao = CRITICA e is_replied = False


class LeadStats(BaseModel):
    """Contagens de leads para o dashboard."""
    total: int
    novos_ultimos_7_dias: int
    por_status: dict[str, int]          # {"novo": 5, "em_contato": 3, ...}


class PanelDashboardOut(BaseModel):
    """Resposta consolidada do dashboard — uma chamada, todos os dados."""
    brand_id: int
    brand_name: str
    posts: PostStats
    engagement: EngagementStats
    leads: LeadStats
    generated_at: datetime


# ── Content Panel ──────────────────────────────────────────────────────────────

class PanelPostOut(BaseModel):
    """
    Post enriquecido para o painel de conteúdo.
    Inclui contagem de comentários e lista de ações disponíveis
    conforme o status atual do post.
    """
    id: int
    caption: str
    caption_excerpt: str                # primeiros 120 caracteres para listagem
    hashtags: str | None
    cta: str | None
    platform: SocialPlatform
    formato: PostFormato
    status: PostStatus
    prioridade: PostPrioridade
    scheduled_at: datetime | None
    published_at: datetime | None
    approved_by_id: int | None
    approved_at: datetime | None
    comment_count: int
    idea_title: str | None             # título da ideia de origem (se vinculada)
    available_actions: list[str]       # ações permitidas: edit/approve/reject/schedule/publish/duplicate
    created_at: datetime
    updated_at: datetime


class PanelContentOut(BaseModel):
    """Lista de posts enriquecidos para o painel de conteúdo."""
    brand_id: int
    total: int
    posts: list[PanelPostOut]


# ── Engagement Panel ───────────────────────────────────────────────────────────

class PanelCommentOut(BaseModel):
    """
    Comentário enriquecido com contexto do post e sugestões de resposta.
    Inclui urgência calculada a partir da classificação para priorização visual.
    """
    id: int
    body: str
    author_username: str | None
    classificacao: CommentClassificacao
    sentiment: CommentSentiment
    urgencia: str                       # "baixa" | "media" | "alta" | "critica"
    is_replied: bool
    post_id: int
    post_caption_excerpt: str          # primeiros 80 chars do caption do post
    post_platform: SocialPlatform
    reply_suggestions: list[ReplySuggestionOut]
    created_at: datetime


class PanelEngagementOut(BaseModel):
    """Lista de comentários enriquecidos para o painel de engajamento."""
    brand_id: int
    total: int
    sem_resposta: int
    comments: list[PanelCommentOut]
