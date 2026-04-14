"""
Service: Idea — Módulo 2: Ideias de Conteúdo

Funções:
    create_idea         — cria ideia manual
    list_ideas          — lista com filtros (status, prioridade, formato_sugerido)
    get_idea            — busca por id com ownership check
    update_idea         — atualiza campos
    delete_idea         — remove da base
    generate_ideas      — gera ideias via IA (ou mock) e salva no banco
    idea_to_post        — converte ideia em post rascunho com conteúdo gerado por IA
"""

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.brand import Brand
from app.models.idea import Idea, IdeaFormatoSugerido, IdeaPrioridade, IdeaStatus
from app.models.post import Post, PostFormato, PostStatus, SocialPlatform
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
    limit: int = 50,
    offset: int = 0,
) -> list[Idea]:
    _assert_brand_ownership(db, brand_id, user_id)
    query = db.query(Idea).filter(Idea.brand_id == brand_id)
    if idea_status is not None:
        query = query.filter(Idea.status == idea_status)
    if prioridade is not None:
        query = query.filter(Idea.prioridade == prioridade)
    if formato_sugerido is not None:
        query = query.filter(Idea.formato_sugerido == formato_sugerido)
    return query.order_by(Idea.created_at.desc()).offset(offset).limit(limit).all()


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


# ── Geração via IA ─────────────────────────────────────────────────────────────

def generate_ideas(
    db: Session,
    payload: IdeaGenerateRequest,
    user_id: int,
) -> IdeaGenerateOut:
    """
    Gera ideias de conteúdo usando IA (ou mock) e persiste no banco.

    Fluxo:
        1. Chama ai_service.generate_ideas() com o provider configurado
        2. Para cada AIIdeaOut gerada, cria um registro Idea no banco
        3. Retorna IdeaGenerateOut com as ideias salvas (IDs reais)

    O gancho é embutido na descrição para enriquecer o conteúdo exibido
    no frontend sem alterar o schema do banco.
    """
    from app.ai import ai_service
    from app.ai.schemas import AIIdeaGenerateRequest

    brand = _assert_brand_ownership(db, payload.brand_id, user_id)

    # Mapear para o request interno do AI service
    ai_request = AIIdeaGenerateRequest(
        brand_id=payload.brand_id,
        quantidade=payload.quantidade,
        tema=payload.tema,
        objetivo=payload.objetivo,
        plataforma=payload.plataforma,
        formato_sugerido=payload.formato,
        contexto=payload.contexto,
    )

    brand_context = {
        "brand_name":      brand.name,
        "niche":           brand.niche or payload.tema or "geral",
        "tone_of_voice":   brand.tone_of_voice or "profissional e amigável",
        "target_audience": getattr(brand, "target_audience", None) or "público geral",
        "description":     brand.description or "",
    }

    # Sobrescrever niche com tema se fornecido (mais específico)
    if payload.tema:
        brand_context["niche"] = payload.tema

    ai_result = ai_service.generate_ideas(db, ai_request, user_id)

    # Persistir ideias no banco com IDs reais
    saved_ideas: list[Idea] = []
    for ai_idea in ai_result.ideas:
        # Combinar gancho + descrição para enriquecer o campo description
        description_parts = []
        if ai_idea.gancho:
            description_parts.append(ai_idea.gancho)
        if ai_idea.descricao:
            description_parts.append(ai_idea.descricao)

        idea = Idea(
            brand_id=payload.brand_id,
            pillar_id=payload.pillar_id,
            title=ai_idea.titulo,
            description="\n\n".join(description_parts) if description_parts else None,
            source=ai_result.source,           # "mock" ou "claude"
            formato_sugerido=ai_idea.formato,
            prioridade=IdeaPrioridade.MEDIA,
            status=IdeaStatus.IDEA,
        )
        db.add(idea)
        saved_ideas.append(idea)

    db.commit()

    # Refresh para pegar os IDs gerados pelo banco
    for idea in saved_ideas:
        db.refresh(idea)

    ideas_out = [IdeaOut.model_validate(i) for i in saved_ideas]

    return IdeaGenerateOut(
        ideas=ideas_out,
        generated_count=len(ideas_out),
        source=ai_result.source,
    )


# ── Conversão Ideia → Post ─────────────────────────────────────────────────────

_FORMATO_MAP: dict[IdeaFormatoSugerido, PostFormato] = {
    IdeaFormatoSugerido.CARROSSEL:    PostFormato.CARROSSEL,
    IdeaFormatoSugerido.REELS:        PostFormato.REELS,
    IdeaFormatoSugerido.IMAGEM_UNICA: PostFormato.IMAGEM_UNICA,
    IdeaFormatoSugerido.STORIES:      PostFormato.STORIES,
    IdeaFormatoSugerido.TEXTO:        PostFormato.TEXTO,
    IdeaFormatoSugerido.VIDEO:        PostFormato.VIDEO,
    IdeaFormatoSugerido.LIVE:         PostFormato.LIVE,
    IdeaFormatoSugerido.INDEFINIDO:   PostFormato.IMAGEM_UNICA,
}


def idea_to_post(
    db: Session,
    idea_id: int,
    payload: PostCreateFromIdea,
    user_id: int,
) -> Post:
    """
    Transforma uma Idea em Post rascunho com conteúdo gerado por IA.

    Quando AI_PROVIDER=anthropic:
        - Claude gera caption, hashtags e CTA baseados na ideia e contexto da marca
    Quando AI_PROVIDER=mock:
        - Usa conteúdo mock estruturado (sem chamada externa)

    O Post resultante sempre começa como rascunho (status=draft).
    """
    from app.ai import ai_service
    from app.ai.schemas import AIPostFromIdeaRequest

    idea = get_idea(db, idea_id, user_id)
    brand = _assert_brand_ownership(db, idea.brand_id, user_id)

    formato = payload.formato or _FORMATO_MAP.get(idea.formato_sugerido, PostFormato.IMAGEM_UNICA)
    platform = payload.platform or SocialPlatform.INSTAGRAM

    # Usar IA para gerar conteúdo do post
    ai_request = AIPostFromIdeaRequest(
        platform=platform,
        num_slides=5,
        extra_context=None,
    )

    brand_context = {
        "brand_name":      brand.name,
        "niche":           brand.niche or "geral",
        "tone_of_voice":   brand.tone_of_voice or "profissional e amigável",
        "target_audience": getattr(brand, "target_audience", None) or "público geral",
        "description":     brand.description or "",
    }

    idea_context = {
        "titulo":           idea.title,
        "descricao":        idea.description or "",
        "formato_sugerido": idea.formato_sugerido.value if idea.formato_sugerido else "imagem_unica",
        "gancho":           "",
    }

    ai_post = ai_service.idea_to_post(db, idea_id, ai_request, user_id)

    # Montar caption: usa override do payload ou conteúdo gerado pela IA
    caption   = payload.caption   or ai_post.legenda or idea.title
    hashtags  = payload.hashtags  or " ".join(ai_post.hashtags) if ai_post.hashtags else None
    cta       = payload.cta       or ai_post.cta or None

    post = Post(
        brand_id=idea.brand_id,
        pillar_id=idea.pillar_id,
        idea_id=idea.id,
        caption=caption,
        hashtags=hashtags,
        cta=cta,
        platform=platform,
        formato=formato,
        prioridade=payload.prioridade,
        status=PostStatus.DRAFT,
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return post
