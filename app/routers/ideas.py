"""
Router: Ideas — Módulo 2: Ideias de Conteúdo
Prefixo: /api/v1/ideas

Endpoints:
    POST   /ideas/                          — criar ideia manual
    GET    /ideas/brand/{brand_id}          — listar com filtros
    GET    /ideas/{idea_id}                 — detalhar ideia
    PATCH  /ideas/{idea_id}                 — editar ideia
    DELETE /ideas/{idea_id}                 — remover ideia
    POST   /ideas/generate                  — gerar sugestões automáticas (mock)
    POST   /ideas/{idea_id}/to-post         — converter ideia em post rascunho

Filtros disponíveis em GET /ideas/brand/{brand_id}:
    ?status=ideia|rascunho|arquivado
    ?prioridade=baixa|media|alta
    ?formato_sugerido=carrossel|reels|…
"""

from fastapi import APIRouter, Body, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_active_user, get_db
from app.models.idea import IdeaFormatoSugerido, IdeaPrioridade, IdeaStatus
from app.models.user import User
from app.schemas.idea import (
    IdeaCreate,
    IdeaGenerateOut,
    IdeaGenerateRequest,
    IdeaOut,
    IdeaUpdate,
)
from app.schemas.post import PostCreateFromIdea, PostOut
from app.services import idea_service

router = APIRouter(prefix="/ideas", tags=["Ideas"])


# ── CRUD ───────────────────────────────────────────────────────────────────────

@router.post(
    "/",
    response_model=IdeaOut,
    status_code=status.HTTP_201_CREATED,
    summary="Criar ideia",
)
def create_idea(
    payload: IdeaCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return idea_service.create_idea(db, payload, user_id=current_user.id)


@router.get(
    "/brand/{brand_id}",
    response_model=list[IdeaOut],
    summary="Listar ideias da brand",
    description=(
        "Retorna todas as ideias da brand. "
        "Filtre por `status`, `prioridade` e/ou `formato_sugerido`."
    ),
)
def list_ideas(
    brand_id: int,
    idea_status: IdeaStatus | None = None,
    prioridade: IdeaPrioridade | None = None,
    formato_sugerido: IdeaFormatoSugerido | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return idea_service.list_ideas(
        db,
        brand_id=brand_id,
        user_id=current_user.id,
        idea_status=idea_status,
        prioridade=prioridade,
        formato_sugerido=formato_sugerido,
        limit=limit,
        offset=offset,
    )


@router.get("/{idea_id}", response_model=IdeaOut, summary="Detalhar ideia")
def get_idea(
    idea_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return idea_service.get_idea(db, idea_id, user_id=current_user.id)


@router.patch("/{idea_id}", response_model=IdeaOut, summary="Editar ideia")
def update_idea(
    idea_id: int,
    payload: IdeaUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return idea_service.update_idea(db, idea_id, payload, user_id=current_user.id)


@router.delete("/{idea_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Remover ideia")
def delete_idea(
    idea_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    idea_service.delete_idea(db, idea_id, user_id=current_user.id)


# ── Geração automática ─────────────────────────────────────────────────────────

@router.post(
    "/generate",
    response_model=IdeaGenerateOut,
    summary="Gerar ideias automaticamente (mock)",
    description=(
        "Gera sugestões de ideias baseadas no nicho da brand. "
        "As ideias retornadas **não são salvas** — use POST /ideas para persistir as escolhidas. "
        "Futuramente será integrado com IA (GPT-4o / Claude)."
    ),
)
def generate_ideas(
    payload: IdeaGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return idea_service.generate_ideas(db, payload, user_id=current_user.id)


# ── Conversão Ideia → Post ─────────────────────────────────────────────────────

@router.post(
    "/{idea_id}/to-post",
    response_model=PostOut,
    status_code=status.HTTP_201_CREATED,
    summary="Converter ideia em post",
    description=(
        "Transforma uma ideia existente em um Post rascunho. "
        "O caption herda o título da ideia e o formato herda o formato_sugerido "
        "caso não sejam fornecidos no body."
    ),
)
def idea_to_post(
    idea_id: int,
    payload: PostCreateFromIdea = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    # payload pode ser omitido pelo frontend — usa defaults (platform=instagram, AI gera o resto)
    return idea_service.idea_to_post(
        db, idea_id, payload or PostCreateFromIdea(), user_id=current_user.id
    )
