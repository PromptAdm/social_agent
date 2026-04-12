"""
Service: Idea — Módulo 2: Ideias de Conteúdo

Funções:
    create_idea         — cria ideia manual
    list_ideas          — lista com filtros (status, prioridade, formato_sugerido)
    get_idea            — busca por id com ownership check
    update_idea         — atualiza campos
    delete_idea         — remove da base
    generate_ideas      — mock: gera ideias baseadas no nicho/tom da brand
    idea_to_post        — converte ideia em post rascunho
"""

import random
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.brand import Brand
from app.models.idea import Idea, IdeaFormatoSugerido, IdeaPrioridade, IdeaStatus
from app.models.post import Post, PostFormato, PostStatus
from app.schemas.idea import IdeaCreate, IdeaGenerateRequest, IdeaGenerateOut, IdeaOut, IdeaUpdate
from app.schemas.post import PostCreateFromIdea


# ── Helpers ────────────────────────────────────────────────────────────────────

def _assert_brand_ownership(db: Session, brand_id: int, user_id: int) -> Brand:
    brand = db.query(Brand).filter(Brand.id == brand_id, Brand.owner_id == user_id).first()
    if not brand:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Brand não encontrada.")
    return brand


# ── CRUD ───────────────────────────────────────────────────────────────────────

def create_idea(db: Session, payload: IdeaCreate, user_id: int) -> Idea:
    _assert_brand_ownership(db, payload.brand_id, user_id)
    idea = Idea(**payload.model_dump())
    db.add(idea)
    db.commit()
    db.refresh(idea)
    return idea


def list_ideas(
    db: Session,
    brand_id: int,
    user_id: int,
    *,
    idea_status: IdeaStatus | None = None,
    prioridade: IdeaPrioridade | None = None,
    formato_sugerido: IdeaFormatoSugerido | None = None,
) -> list[Idea]:
    _assert_brand_ownership(db, brand_id, user_id)
    query = db.query(Idea).filter(Idea.brand_id == brand_id)
    if idea_status is not None:
        query = query.filter(Idea.status == idea_status)
    if prioridade is not None:
        query = query.filter(Idea.prioridade == prioridade)
    if formato_sugerido is not None:
        query = query.filter(Idea.formato_sugerido == formato_sugerido)
    return query.order_by(Idea.created_at.desc()).all()


def get_idea(db: Session, idea_id: int, user_id: int) -> Idea:
    idea = db.query(Idea).filter(Idea.id == idea_id).first()
    if not idea:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ideia não encontrada.")
    _assert_brand_ownership(db, idea.brand_id, user_id)
    return idea


def update_idea(db: Session, idea_id: int, payload: IdeaUpdate, user_id: int) -> Idea:
    idea = get_idea(db, idea_id, user_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(idea, field, value)
    db.commit()
    db.refresh(idea)
    return idea


def delete_idea(db: Session, idea_id: int, user_id: int) -> None:
    idea = get_idea(db, idea_id, user_id)
    db.delete(idea)
    db.commit()


# ── Geração automática (mock) ──────────────────────────────────────────────────

# Templates de ideias agrupados por formato.
# Placeholders: {niche}, {tema}
_IDEA_TEMPLATES: list[dict] = [
    {
        "title": "5 mitos sobre {niche} que você precisa parar de acreditar",
        "description": "Desmistificar crenças comuns do público-alvo, gerando autoridade e compartilhamentos.",
        "formato_sugerido": IdeaFormatoSugerido.CARROSSEL,
        "prioridade": IdeaPrioridade.ALTA,
    },
    {
        "title": "Como começar em {niche} do zero — guia rápido",
        "description": "Conteúdo educativo para atrair leads no topo do funil.",
        "formato_sugerido": IdeaFormatoSugerido.REELS,
        "prioridade": IdeaPrioridade.MEDIA,
    },
    {
        "title": "Bastidores: um dia trabalhando com {niche}",
        "description": "Humanizar a marca mostrando rotina e processo interno.",
        "formato_sugerido": IdeaFormatoSugerido.STORIES,
        "prioridade": IdeaPrioridade.BAIXA,
    },
    {
        "title": "Resultado real de quem aplicou {niche} na prática",
        "description": "Prova social com depoimento ou case de cliente.",
        "formato_sugerido": IdeaFormatoSugerido.IMAGEM_UNICA,
        "prioridade": IdeaPrioridade.ALTA,
    },
    {
        "title": "Tendências de {niche} para os próximos meses",
        "description": "Conteúdo de autoridade sobre o futuro do segmento.",
        "formato_sugerido": IdeaFormatoSugerido.CARROSSEL,
        "prioridade": IdeaPrioridade.MEDIA,
    },
    {
        "title": "Pergunta para você: qual é o seu maior desafio com {niche}?",
        "description": "Post de engajamento para abrir conversa com a audiência.",
        "formato_sugerido": IdeaFormatoSugerido.TEXTO,
        "prioridade": IdeaPrioridade.BAIXA,
    },
    {
        "title": "Antes e depois: como {niche} transforma resultados",
        "description": "Comparativo visual de transformação. Alta taxa de salvamento.",
        "formato_sugerido": IdeaFormatoSugerido.IMAGEM_UNICA,
        "prioridade": IdeaPrioridade.ALTA,
    },
    {
        "title": "Tutorial rápido: {niche} em 60 segundos",
        "description": "Conteúdo de valor condensado em formato curto para Reels.",
        "formato_sugerido": IdeaFormatoSugerido.REELS,
        "prioridade": IdeaPrioridade.MEDIA,
    },
    {
        "title": "Erro que todo iniciante comete em {niche}",
        "description": "Conteúdo de prevenção que gera identificação e compartilhamento.",
        "formato_sugerido": IdeaFormatoSugerido.CARROSSEL,
        "prioridade": IdeaPrioridade.ALTA,
    },
    {
        "title": "Checklist: tudo que você precisa saber antes de começar com {niche}",
        "description": "Material de referência que gera salvamentos e retorno ao perfil.",
        "formato_sugerido": IdeaFormatoSugerido.CARROSSEL,
        "prioridade": IdeaPrioridade.MEDIA,
    },
    {
        "title": "Live: tirando dúvidas sobre {niche} ao vivo",
        "description": "Interação direta com a audiência para fortalecer comunidade.",
        "formato_sugerido": IdeaFormatoSugerido.LIVE,
        "prioridade": IdeaPrioridade.BAIXA,
    },
    {
        "title": "Nossa história com {niche}: como tudo começou",
        "description": "Conteúdo de marca que conecta emocionalmente com o público.",
        "formato_sugerido": IdeaFormatoSugerido.VIDEO,
        "prioridade": IdeaPrioridade.BAIXA,
    },
]


def generate_ideas(
    db: Session,
    payload: IdeaGenerateRequest,
    user_id: int,
) -> IdeaGenerateOut:
    """
    Gera sugestões de ideias baseadas no nicho e tom de voz da brand.

    Implementação atual: mock baseado em templates pré-definidos.
    Futuramente: chamar LLM (GPT-4o, Gemini, Claude) com contexto da brand.

    As ideias geradas NÃO são salvas automaticamente — o usuário escolhe
    quais confirmar via POST /ideas.
    """
    brand = _assert_brand_ownership(db, payload.brand_id, user_id)

    # Tema para preencher os placeholders
    tema = payload.tema or brand.niche or "seu segmento"

    # Filtrar por formato se solicitado
    pool = _IDEA_TEMPLATES
    if payload.formato_sugerido:
        pool = [t for t in pool if t["formato_sugerido"] == payload.formato_sugerido]
        if not pool:
            pool = _IDEA_TEMPLATES  # fallback sem filtro

    # Selecionar aleatoriamente para variar resultados a cada chamada
    selected = random.sample(pool, min(payload.count, len(pool)))

    now = datetime.now(timezone.utc)

    ideas_out: list[IdeaOut] = []
    for tpl in selected:
        title = tpl["title"].replace("{niche}", tema).replace("{tema}", tema)
        ideas_out.append(
            IdeaOut(
                id=0,  # não salvo ainda
                brand_id=payload.brand_id,
                title=title,
                description=tpl["description"],
                source="mock_generator",
                pillar_id=None,
                prioridade=tpl["prioridade"],
                formato_sugerido=tpl["formato_sugerido"],
                status=IdeaStatus.IDEA,
                created_at=now,
                updated_at=now,
            )
        )

    return IdeaGenerateOut(ideas=ideas_out, generated_count=len(ideas_out))


# ── Conversão Ideia → Post ─────────────────────────────────────────────────────

def idea_to_post(
    db: Session,
    idea_id: int,
    payload: PostCreateFromIdea,
    user_id: int,
) -> Post:
    """
    Cria um Post rascunho a partir de uma Idea existente.

    Regras de herança:
      - caption   → payload.caption ou idea.title
      - formato   → payload.formato ou idea.formato_sugerido (com fallback a IMAGEM_UNICA)
      - pillar_id → herdado da ideia
      - brand_id  → herdado da ideia
    """
    idea = get_idea(db, idea_id, user_id)

    # Mapear formato_sugerido → PostFormato (mesmos valores de string, exceto INDEFINIDO)
    _FORMATO_MAP: dict[IdeaFormatoSugerido, PostFormato] = {
        IdeaFormatoSugerido.CARROSSEL: PostFormato.CARROSSEL,
        IdeaFormatoSugerido.REELS: PostFormato.REELS,
        IdeaFormatoSugerido.IMAGEM_UNICA: PostFormato.IMAGEM_UNICA,
        IdeaFormatoSugerido.STORIES: PostFormato.STORIES,
        IdeaFormatoSugerido.TEXTO: PostFormato.TEXTO,
        IdeaFormatoSugerido.VIDEO: PostFormato.VIDEO,
        IdeaFormatoSugerido.LIVE: PostFormato.LIVE,
        IdeaFormatoSugerido.INDEFINIDO: PostFormato.IMAGEM_UNICA,
    }

    formato = payload.formato or _FORMATO_MAP.get(idea.formato_sugerido, PostFormato.IMAGEM_UNICA)
    caption = payload.caption or idea.title

    post = Post(
        brand_id=idea.brand_id,
        pillar_id=idea.pillar_id,
        idea_id=idea.id,
        caption=caption,
        hashtags=payload.hashtags,
        cta=payload.cta,
        platform=payload.platform,
        formato=formato,
        prioridade=payload.prioridade,
        status=PostStatus.DRAFT,
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return post
