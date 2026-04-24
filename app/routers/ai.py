"""
Router: AI — Camada de Inteligência Artificial
Prefixo: /api/v1/ai

Endpoints:
    POST  /ai/ideas/generate              — Gerar ideias enriquecidas (título + gancho + CTA)
    POST  /ai/ideas/{idea_id}/to-post     — Transformar ideia em post completo (headline + slides)
    POST  /ai/comments/{comment_id}/analyze   — Analisar comentário (categoria + urgência + resposta)
    POST  /ai/comments/{comment_id}/reply     — Gerar resposta personalizada (salva como sugestão)
    POST  /ai/brands/{brand_id}/weekly-report — Relatório semanal com destaques e recomendações

Todos os endpoints requerem autenticação (Bearer token).
O provedor de IA é selecionado pelo .env (AI_PROVIDER=mock|openai|anthropic).
"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.ai import ai_service
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
from app.core.dependencies import get_current_active_user, get_db
from app.models.user import User

router = APIRouter(prefix="/ai", tags=["AI"])


# ── 1. Gerar Ideias ────────────────────────────────────────────────────────────

@router.post(
    "/ideas/generate",
    response_model=AIIdeaGenerateOut,
    status_code=status.HTTP_200_OK,
    summary="Gerar ideias via IA",
    description=(
        "Gera ideias de conteúdo enriquecidas usando o contexto da brand (nicho, tom, público). "
        "Cada ideia inclui **título**, **gancho**, **formato**, **CTA** e **hashtags sugeridas**. "
        "As ideias **não são salvas** automaticamente — use `POST /ideas` para persistir as escolhidas. "
        "\n\n**Provedor atual:** mock (templates contextualizados). "
        "Substitua por `AI_PROVIDER=openai` no `.env` para usar GPT-4o."
    ),
)
def generate_ideas(
    payload: AIIdeaGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> AIIdeaGenerateOut:
    result = ai_service.generate_ideas(db, payload, user_id=current_user.id)
    try:
        from app.core import analytics
        analytics.track("ai_idea_generated", distinct_id=str(current_user.id), properties={
            "brand_id":    payload.brand_id if hasattr(payload, "brand_id") else None,
            "ideas_count": len(result.ideas) if hasattr(result, "ideas") else None,
        })
    except Exception:
        pass
    return result


# ── 2. Ideia → Post ────────────────────────────────────────────────────────────

@router.post(
    "/ideas/{idea_id}/to-post",
    response_model=AIPostOut,
    status_code=status.HTTP_200_OK,
    summary="Transformar ideia em post completo via IA",
    description=(
        "Transforma uma ideia existente em um post completo usando IA. "
        "Retorna **headline**, **legenda**, **CTA**, **slides de carrossel** e **hashtags**. "
        "Para carrossel, os slides são gerados com estrutura lógica (capa → conteúdo → CTA). "
        "\n\nEste endpoint **não cria um Post** no banco — use `POST /ideas/{id}/to-post` "
        "do módulo de Ideias para persistir o post rascunho."
    ),
)
def idea_to_post(
    idea_id: int,
    payload: AIPostFromIdeaRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> AIPostOut:
    return ai_service.idea_to_post(db, idea_id, payload, user_id=current_user.id)


# ── 3. Analisar Comentário ─────────────────────────────────────────────────────

@router.post(
    "/comments/{comment_id}/analyze",
    response_model=AICommentAnalysisOut,
    status_code=status.HTTP_200_OK,
    summary="Analisar comentário via IA",
    description=(
        "Analisa um comentário e retorna: **categoria** (elogio, crítica, dúvida, lead…), "
        "**sentimento**, **urgência** (baixa/média/alta/crítica), **resposta sugerida** "
        "e **justificativa** da classificação. "
        "\n\n**Efeito colateral:** atualiza `classificacao` e `sentiment` do comentário no banco "
        "para manter consistência com os filtros de `/engagement`."
    ),
)
def analyze_comment(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> AICommentAnalysisOut:
    return ai_service.analyze_comment(db, comment_id, user_id=current_user.id)


# ── 4. Gerar Resposta ──────────────────────────────────────────────────────────

@router.post(
    "/comments/{comment_id}/reply",
    response_model=AIReplyOut,
    status_code=status.HTTP_201_CREATED,
    summary="Gerar resposta personalizada via IA",
    description=(
        "Gera uma resposta personalizada para o comentário considerando o **tom de voz da brand**, "
        "a **categoria** do comentário e o **username do autor**. "
        "\n\nRetorna: **resposta** pronta, **tom** (empático/informativo/comercial) e "
        "**comprimento** (curta/média/longa). "
        "\n\n**Efeito colateral:** salva a resposta como `ReplySuggestion` com status `pendente` "
        "para passar pelo fluxo de aprovação em `/engagement`."
    ),
)
def generate_reply(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> AIReplyOut:
    return ai_service.generate_reply(db, comment_id, user_id=current_user.id)


# ── 5. Relatório Semanal ───────────────────────────────────────────────────────

@router.post(
    "/brands/{brand_id}/weekly-report",
    response_model=AIWeeklyReportOut,
    status_code=status.HTTP_200_OK,
    summary="Gerar relatório semanal via IA",
    description=(
        "Gera um relatório semanal consolidado da brand com: "
        "**destaques do período**, **performance de posts**, **resumo de leads**, "
        "**recomendações estratégicas** e **conclusão executiva**. "
        "\n\nUsa os dados reais do banco (posts, leads, comentários dos últimos 7 dias). "
        "Informe `week_reference` no formato `'YYYY-Www'` (ex: `'2025-W15'`) para gerar "
        "o relatório de uma semana específica. Se omitido, usa os últimos 7 dias."
    ),
)
def generate_weekly_report(
    brand_id: int,
    payload: AIWeeklyReportRequest | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> AIWeeklyReportOut:
    request = payload or AIWeeklyReportRequest(brand_id=brand_id)
    request.brand_id = brand_id  # garante que o brand_id da URL prevalece
    return ai_service.generate_weekly_report(db, request, user_id=current_user.id)
