"""
Router: Panel — Painel Web
Prefixo: /api/v1/panel

Endpoints otimizados para consumo direto pelo frontend.
Cada endpoint consolida múltiplas fontes de dados em uma única resposta,
eliminando a necessidade de múltiplas chamadas da UI.

Endpoints:
    GET  /panel/dashboard/{brand_id}           — widget de contagens (posts + comentários + leads)
    GET  /panel/content/{brand_id}             — lista de posts enriquecidos com ações disponíveis
    GET  /panel/engagement/{brand_id}          — comentários classificados com sugestões de resposta

Filtros:
    /panel/content?post_status=rascunho|aprovado|agendado|publicado|arquivado
    /panel/engagement?only_unanswered=true

Fluxo real suportado pelos endpoints existentes:
    1. Gerar ideias       → POST /ai/ideas/generate  ou  POST /ideas/generate
    2. Transformar        → POST /ideas/{id}/to-post  ou  POST /ai/ideas/{id}/to-post
    3. Revisar rascunho   → PATCH /posts/{id}
    4. Aprovar            → POST /posts/{id}/approve
    5. Agendar            → POST /posts/{id}/schedule
    6. Publicar           → POST /posts/{id}/publish
    7. Responder comments → POST /ai/comments/{id}/reply  ou  POST /engagement/comments/{id}/generate-reply
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_active_user, get_db
from app.models.post import PostStatus
from app.models.user import User
from app.schemas.panel import PanelContentOut, PanelDashboardOut, PanelEngagementOut
from app.services import panel_service

router = APIRouter(prefix="/panel", tags=["Panel"])


# ── Dashboard ──────────────────────────────────────────────────────────────────

@router.get(
    "/dashboard/{brand_id}",
    response_model=PanelDashboardOut,
    summary="Dashboard — contagens consolidadas",
    description=(
        "Retorna em **uma única chamada** todos os dados necessários para o dashboard:\n\n"
        "- **Posts**: total e contagem por status (rascunho, aprovado, agendado, publicado)\n"
        "- **Engajamento**: total de comentários, sem resposta, leads potenciais, críticas pendentes\n"
        "- **Leads**: total, novos nos últimos 7 dias e distribuição por status\n\n"
        "Ideal para o widget de visão geral da marca no painel de controle."
    ),
)
def get_dashboard(
    brand_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> PanelDashboardOut:
    return panel_service.get_dashboard(db, brand_id, user_id=current_user.id)


# ── Content Panel ──────────────────────────────────────────────────────────────

@router.get(
    "/content/{brand_id}",
    response_model=PanelContentOut,
    summary="Painel de conteúdo — posts enriquecidos",
    description=(
        "Retorna a lista de posts da brand com dados enriquecidos para o painel de conteúdo:\n\n"
        "- `caption_excerpt`: prévia do caption (120 caracteres)\n"
        "- `comment_count`: número de comentários recebidos\n"
        "- `idea_title`: título da ideia de origem (se vinculada)\n"
        "- `available_actions`: ações permitidas no status atual — "
        "`edit`, `approve`, `reject`, `schedule`, `publish`, `duplicate`\n\n"
        "Filtre por `post_status` para exibir apenas posts em um estado específico."
    ),
)
def get_content(
    brand_id: int,
    post_status: PostStatus | None = Query(
        default=None,
        description="Filtrar por status: rascunho | aprovado | agendado | publicado | arquivado",
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> PanelContentOut:
    return panel_service.get_content(
        db, brand_id, user_id=current_user.id, post_status=post_status
    )


# ── Engagement Panel ───────────────────────────────────────────────────────────

@router.get(
    "/engagement/{brand_id}",
    response_model=PanelEngagementOut,
    summary="Painel de engajamento — comentários classificados",
    description=(
        "Retorna comentários dos posts da brand com dados enriquecidos:\n\n"
        "- `classificacao`: categoria do comentário (elogio, crítica, dúvida, lead, spam…)\n"
        "- `urgencia`: nível de prioridade calculado — `baixa` | `media` | `alta` | `critica`\n"
        "- `post_caption_excerpt`: prévia do post ao qual o comentário pertence\n"
        "- `reply_suggestions`: sugestões de resposta geradas (pendentes e aprovadas)\n\n"
        "Use `?only_unanswered=true` para exibir apenas comentários sem resposta."
    ),
)
def get_engagement(
    brand_id: int,
    only_unanswered: bool = Query(
        default=False,
        description="Se true, retorna apenas comentários que ainda não foram respondidos",
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> PanelEngagementOut:
    return panel_service.get_engagement(
        db, brand_id, user_id=current_user.id, only_unanswered=only_unanswered
    )
