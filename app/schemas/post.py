"""
Schemas Pydantic: Post
"""

from datetime import datetime, timezone

from pydantic import BaseModel, field_validator

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
    # FIX [POST-01]: 'status' removido — alterações de status devem passar pelos
    # endpoints de workflow (/approve, /reject, /schedule, /publish) para garantir
    # que campos de auditoria (approved_by_id, approved_at, etc.) sejam preenchidos.


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
    # FIX [POST-02]: expõe external_post_id após publicação para que o cliente
    # não precise fazer GET no post e inspecionar campos extras.
    external_post_id: str | None = None

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

    # FIX [POST-03]: valida que scheduled_at está no futuro para evitar
    # publicação imediata não intencional de posts "agendados" no passado.
    @field_validator("scheduled_at")
    @classmethod
    def must_be_future(cls, v: datetime) -> datetime:
        now = datetime.now(timezone.utc)
        # Normaliza para timezone-aware antes de comparar
        if v.tzinfo is None:
            v = v.replace(tzinfo=timezone.utc)
        if v <= now:
            raise ValueError("scheduled_at deve ser uma data futura.")
        return v
