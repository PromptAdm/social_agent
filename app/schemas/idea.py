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


# ── Geração de Ideias (mock) ───────────────────────────────────────────────────

class IdeaGenerateRequest(BaseModel):
    """Parâmetros para geração automática de ideias (mock/IA futura)."""
    brand_id: int
    count: int = Field(default=5, ge=1, le=20, description="Quantidade de ideias a gerar")
    tema: str | None = Field(
        default=None,
        description="Tema ou palavra-chave para guiar a geração (ex: 'nutrição', 'treino em casa')",
    )
    formato_sugerido: IdeaFormatoSugerido | None = Field(
        default=None,
        description="Restringir geração a um formato específico",
    )


class IdeaGenerateOut(BaseModel):
    """Resultado da geração automática de ideias."""
    ideas: list[IdeaOut]
    generated_count: int
    source: str = "mock"  # futuramente: "gpt-4o", "gemini", etc.
