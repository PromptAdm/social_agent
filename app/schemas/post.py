"""
Schemas Pydantic: Post
"""

from datetime import datetime

from pydantic import BaseModel

from app.models.post import PostFormato, PostPrioridade, PostStatus, SocialPlatform


class PostBase(BaseModel):
    caption: str
    hashtags: str | None = None
    cta: str | None = None
    platform: SocialPlatform
    formato: PostFormato = PostFormato.IMAGEM_UNICA
    prioridade: PostPrioridade = PostPrioridade.MEDIA
    pillar_id: int | None = None
    idea_id: int | None = None


class PostCreate(PostBase):
    brand_id: int


class PostUpdate(BaseModel):
    caption: str | None = None
    hashtags: str | None = None
    cta: str | None = None
    platform: SocialPlatform | None = None
    formato: PostFormato | None = None
    prioridade: PostPrioridade | None = None
    pillar_id: int | None = None
    idea_id: int | None = None
    status: PostStatus | None = None
    scheduled_at: datetime | None = None


class PostOut(PostBase):
    id: int
    brand_id: int
    status: PostStatus
    scheduled_at: datetime | None
    published_at: datetime | None
    approved_by_id: int | None
    approved_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Criação a partir de Ideia ──────────────────────────────────────────────────

class PostCreateFromIdea(BaseModel):
    """
    Parâmetros para converter uma Idea existente em Post.
    Campos omitidos herdam valores da ideia ou são gerados por IA.
    platform é opcional — padrão instagram (frontend chama sem body).
    """
    platform: SocialPlatform = SocialPlatform.INSTAGRAM
    caption: str | None = None       # se omitido, IA gera a partir da ideia
    hashtags: str | None = None      # se omitido, IA gera
    cta: str | None = None           # se omitido, IA gera
    formato: PostFormato | None = None  # se omitido, herda de idea.formato_sugerido
    prioridade: PostPrioridade = PostPrioridade.MEDIA


# ── Agendamento ────────────────────────────────────────────────────────────────

class PostScheduleRequest(BaseModel):
    """Body para agendar um post aprovado."""
    scheduled_at: datetime
