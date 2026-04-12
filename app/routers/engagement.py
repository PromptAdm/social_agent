"""
Router: Engagement — Módulo 6: Gestão de Engajamento
Prefixo: /api/v1/engagement

Endpoints — Comentários:
    POST   /engagement/comments                             — registrar comentário
    GET    /engagement/posts/{post_id}/comments             — listar com filtros
    GET    /engagement/comments/{comment_id}                — detalhar comentário
    PATCH  /engagement/comments/{comment_id}                — atualizar campos
    POST   /engagement/comments/{comment_id}/classify       — reclassificar manualmente
    POST   /engagement/comments/{comment_id}/auto-classify  — classificar por palavras-chave (mock)
    POST   /engagement/comments/{comment_id}/generate-reply — gerar resposta sugerida (mock)

Endpoints — Sugestões de Resposta:
    POST   /engagement/replies                              — criar sugestão manual
    GET    /engagement/comments/{comment_id}/replies        — listar sugestões

Filtros disponíveis em GET /engagement/posts/{post_id}/comments:
    ?classificacao=elogio|critica|duvida|sugestao|lead_potencial|spam|outro
    ?sentiment=positivo|neutro|negativo|desconhecido
    ?is_replied=true|false
"""

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_active_user, get_db
from app.models.comment import CommentClassificacao, CommentSentiment
from app.models.user import User
from app.schemas.comment import CommentClassifyRequest, CommentCreate, CommentOut, CommentUpdate
from app.schemas.reply_suggestion import GenerateReplyOut, ReplySuggestionCreate, ReplySuggestionOut
from app.services import engagement_service

router = APIRouter(prefix="/engagement", tags=["Engagement"])


# ── Comentários — CRUD ─────────────────────────────────────────────────────────

@router.post(
    "/comments",
    response_model=CommentOut,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar comentário",
    description="Registra um comentário recebido em um post (pode vir da API da rede social ou ser adicionado manualmente).",
)
def create_comment(
    payload: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return engagement_service.create_comment(db, payload)


@router.get(
    "/posts/{post_id}/comments",
    response_model=list[CommentOut],
    summary="Listar comentários do post",
    description=(
        "Retorna comentários de um post. "
        "Filtre por `classificacao`, `sentiment` e/ou `is_replied`."
    ),
)
def list_comments(
    post_id: int,
    classificacao: CommentClassificacao | None = None,
    sentiment: CommentSentiment | None = None,
    is_replied: bool | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return engagement_service.list_comments(
        db,
        post_id=post_id,
        classificacao=classificacao,
        sentiment=sentiment,
        is_replied=is_replied,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/comments/{comment_id}",
    response_model=CommentOut,
    summary="Detalhar comentário",
)
def get_comment(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return engagement_service.get_comment(db, comment_id)


@router.patch(
    "/comments/{comment_id}",
    response_model=CommentOut,
    summary="Atualizar comentário",
)
def update_comment(
    comment_id: int,
    payload: CommentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return engagement_service.update_comment(db, comment_id, payload)


# ── Classificação ──────────────────────────────────────────────────────────────

@router.post(
    "/comments/{comment_id}/classify",
    response_model=CommentOut,
    summary="Classificar comentário manualmente",
    description=(
        "Permite definir manualmente `sentiment` e/ou `classificacao`. "
        "Campos omitidos são preservados."
    ),
)
def classify_comment(
    comment_id: int,
    payload: CommentClassifyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return engagement_service.classify_comment(db, comment_id, payload)


@router.post(
    "/comments/{comment_id}/auto-classify",
    response_model=CommentOut,
    summary="Classificar comentário automaticamente",
    description=(
        "Analisa o texto do comentário com regras de palavras-chave (mock) "
        "e define `sentiment` e `classificacao` automaticamente. "
        "Futuramente: modelo de NLP/LLM."
    ),
)
def auto_classify_comment(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return engagement_service.auto_classify_comment(db, comment_id)


# ── Geração de Resposta ────────────────────────────────────────────────────────

@router.post(
    "/comments/{comment_id}/generate-reply",
    response_model=GenerateReplyOut,
    status_code=status.HTTP_201_CREATED,
    summary="Gerar resposta sugerida (mock)",
    description=(
        "Gera automaticamente uma sugestão de resposta baseada na `classificacao` do comentário. "
        "A sugestão é salva com status `pendente` para revisão humana. "
        "Futuramente: geração com IA (GPT-4o / Claude)."
    ),
)
def generate_reply(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return engagement_service.generate_reply(db, comment_id)


# ── Sugestões de Resposta — CRUD ───────────────────────────────────────────────

@router.post(
    "/replies",
    response_model=ReplySuggestionOut,
    status_code=status.HTTP_201_CREATED,
    summary="Criar sugestão de resposta manual",
)
def create_reply_suggestion(
    payload: ReplySuggestionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return engagement_service.create_reply_suggestion(db, payload)


@router.get(
    "/comments/{comment_id}/replies",
    response_model=list[ReplySuggestionOut],
    summary="Listar sugestões de resposta",
)
def list_reply_suggestions(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return engagement_service.list_reply_suggestions(db, comment_id=comment_id)
