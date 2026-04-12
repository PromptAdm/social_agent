"""
Schemas Pydantic: Comment
"""

from datetime import datetime

from pydantic import BaseModel

from app.models.comment import CommentClassificacao, CommentSentiment


class CommentBase(BaseModel):
    body: str
    author_username: str | None = None
    sentiment: CommentSentiment = CommentSentiment.UNKNOWN
    classificacao: CommentClassificacao = CommentClassificacao.OUTRO


class CommentCreate(CommentBase):
    post_id: int
    external_comment_id: str | None = None
    author_external_id: str | None = None
    commented_at: datetime | None = None


class CommentUpdate(BaseModel):
    sentiment: CommentSentiment | None = None
    classificacao: CommentClassificacao | None = None
    is_replied: bool | None = None


class CommentOut(CommentBase):
    id: int
    post_id: int
    external_comment_id: str | None
    is_replied: bool
    commented_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Classificação manual ───────────────────────────────────────────────────────

class CommentClassifyRequest(BaseModel):
    """
    Permite reclassificar manualmente sentiment e/ou classificacao de um comentário.
    Campos omitidos são preservados.
    """
    sentiment: CommentSentiment | None = None
    classificacao: CommentClassificacao | None = None
