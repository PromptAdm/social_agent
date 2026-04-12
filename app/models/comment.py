"""
Model: Comment
Comentário recebido em um Post publicado (coletado via API da rede social).
Cada comentário pode gerar uma ou mais ReplySuggestion automáticas.

Campos adicionados nesta fase:
    - classificacao : intenção do comentário (elogio, crítica, dúvida, lead…)
"""

import enum
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


# ── Enums ──────────────────────────────────────────────────────────────────────

class CommentSentiment(str, enum.Enum):
    """Polaridade emocional do comentário (análise de sentimento)."""
    POSITIVE = "positivo"
    NEUTRAL = "neutro"
    NEGATIVE = "negativo"
    UNKNOWN = "desconhecido"


class CommentClassificacao(str, enum.Enum):
    """
    Classificação de intenção/tipo do comentário.
    Guia a priorização e o tipo de resposta a ser gerada.
    """
    ELOGIO = "elogio"           # feedback positivo à marca/produto
    CRITICA = "critica"         # reclamação ou feedback negativo
    DUVIDA = "duvida"           # pergunta sobre produto, preço, entrega…
    SUGESTAO = "sugestao"       # sugestão de melhoria
    LEAD_POTENCIAL = "lead_potencial"  # interesse de compra explícito
    SPAM = "spam"               # conteúdo irrelevante ou automatizado
    OUTRO = "outro"             # não se encaixa nas categorias acima


# ── Model ──────────────────────────────────────────────────────────────────────

class Comment(Base):
    __tablename__ = "comments"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    post_id: Mapped[int] = mapped_column(ForeignKey("posts.id"), nullable=False, index=True)

    # ── Dados do comentário externo ────────────────────────────────────────────
    external_comment_id: Mapped[str | None] = mapped_column(
        String(255), nullable=True, unique=True
    )  # ID retornado pela API da rede social
    author_username: Mapped[str | None] = mapped_column(String(255), nullable=True)
    author_external_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    body: Mapped[str] = mapped_column(Text, nullable=False)

    # ── Análise e classificação ────────────────────────────────────────────────
    sentiment: Mapped[CommentSentiment] = mapped_column(
        Enum(CommentSentiment, name="commentsentiment"),
        default=CommentSentiment.UNKNOWN,
        nullable=False,
    )
    classificacao: Mapped[CommentClassificacao] = mapped_column(
        Enum(CommentClassificacao, name="commentclassificacao"),
        default=CommentClassificacao.OUTRO,
        nullable=False,
        index=True,  # facilita filtrar leads_potenciais, dúvidas, etc.
    )

    # ── Estado ─────────────────────────────────────────────────────────────────
    is_replied: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    commented_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # ── Relacionamentos ────────────────────────────────────────────────────────
    post: Mapped["Post"] = relationship(back_populates="comments")  # type: ignore[name-defined]
    reply_suggestions: Mapped[list["ReplySuggestion"]] = relationship(  # type: ignore[name-defined]
        back_populates="comment",
        lazy="select",
        cascade="all, delete-orphan",
    )
