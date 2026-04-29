"""
SocialConnection — persiste conexões OAuth Meta (Facebook + Instagram) por usuário.

Uma linha por usuário/provider. Upsert na reconexão.
access_token nunca é exposto ao frontend.
"""

from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import relationship

from app.core.database import Base


class SocialConnection(Base):
    __tablename__ = "social_connections"

    id                   = Column(Integer, primary_key=True, index=True)
    user_id              = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Provider — "meta" por enquanto; extensível para "twitter", "linkedin", etc.
    provider             = Column(String(30), nullable=False, default="meta")

    # Dados da Facebook Page
    facebook_page_id     = Column(String(100), nullable=True)
    facebook_page_name   = Column(String(255), nullable=True)

    # Instagram Business Account vinculada à page (pode ser nulo se a page não tiver IG)
    instagram_account_id = Column(String(100), nullable=True)

    # Token de acesso — armazenado apenas no backend, NUNCA retornado ao frontend
    access_token         = Column(Text, nullable=False)

    # Estado da conexão
    status               = Column(String(20), nullable=False, default="connected")

    created_at           = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at           = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    user = relationship("User", foreign_keys=[user_id], lazy="select")

    __table_args__ = (
        # Garante uma linha por (usuário, provider)
        Index("ix_social_connections_user_provider", "user_id", "provider", unique=True),
    )
