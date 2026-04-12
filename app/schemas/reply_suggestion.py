"""
Schemas Pydantic: ReplySuggestion
"""

from datetime import datetime

from pydantic import BaseModel

from app.models.reply_suggestion import SuggestionStatus


class ReplySuggestionBase(BaseModel):
    body: str
    generated_by: str | None = None
    is_ai_generated: bool = False


class ReplySuggestionCreate(ReplySuggestionBase):
    comment_id: int


class ReplySuggestionUpdate(BaseModel):
    body: str | None = None
    status: SuggestionStatus | None = None


class ReplySuggestionOut(ReplySuggestionBase):
    id: int
    comment_id: int
    status: SuggestionStatus
    approved_by_id: int | None
    published_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Geração automática de resposta ─────────────────────────────────────────────

class GenerateReplyOut(BaseModel):
    """Resultado da geração automática de resposta sugerida para um comentário."""
    suggestion: ReplySuggestionOut
    source: str = "mock"  # futuramente: "gpt-4o", etc.
