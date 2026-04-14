"""
Schemas Pydantic: Idea
"""

from datetime import datetime

from pydantic import BaseModel, Field

from app.models.idea import IdeaFormatoSugerido, IdeaPrioridade, IdeaStatus


class IdeaBase(BaseModel):
    title: str
    description: str | None = None
    source: str | None = None
    pillar_id: int | None = None
    prioridade: IdeaPrioridade = IdeaPrioridade.MEDIA
    formato_sugerido: IdeaFormatoSugerido = IdeaFormatoSugerido.INDEFINIDO


class IdeaCreate(IdeaBase):
    brand_id: int


class IdeaUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    source: str | None = None
    pillar_id: int | None = None
    status: IdeaStatus | None = None
    prioridade: IdeaPrioridade | None = None
    formato_sugerido: IdeaFormatoSugerido | None = None


class IdeaOut(IdeaBase):
    id: int
    brand_id: int
    status: IdeaStatus
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Geração de Ideias via IA ───────────────────────────────────────────────────

class IdeaGenerateRequest(BaseModel):
    """
    Parâmetros recebidos do frontend para geração automática de ideias.
    Campos alinhados com GenerateIdeasPayload do frontend.
    """
    brand_id:         int
    quantidade:       int = Field(default=5, ge=1, le=20)
    tema:             str | None = None
    objetivo:         str | None = None     # engajamento | educacao | vendas | etc.
    plataforma:       str | None = None     # instagram | linkedin | etc.
    formato:          IdeaFormatoSugerido | None = None
    pillar_id:        int | None = None
    contexto:         str | None = None     # contexto adicional para a IA


class IdeaGenerateOut(BaseModel):
    """Resultado da geração automática de ideias."""
    ideas:           list[IdeaOut]
    generated_count: int
    source:          str = "mock"  # "mock" | "claude"
