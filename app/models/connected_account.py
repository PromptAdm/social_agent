"""
ConnectedAccount — persists per-user OAuth tokens for social providers.

One row per (user_id, provider, external_account_id) triple.
Tokens are stored encrypted via app.core.encryption.
"""

from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from app.core.database import Base


class ConnectedAccount(Base):
    __tablename__ = "connected_accounts"

    id                  = Column(Integer,               primary_key=True)
    user_id             = Column(Integer,               ForeignKey("users.id",   ondelete="CASCADE"), nullable=False)
    brand_id            = Column(Integer,               ForeignKey("brands.id",  ondelete="SET NULL"), nullable=True)

    # Provider identity
    provider            = Column(String(30),            nullable=False)   # instagram | facebook | whatsapp | twitter
    external_account_id = Column(String(255),           nullable=True)    # IG user id / FB page id / WA phone id / Twitter user id
    account_name        = Column(String(255),           nullable=True)    # human-readable name
    account_picture_url = Column(String(500),           nullable=True)

    # Tokens (Fernet-encrypted at rest)
    access_token        = Column(Text,                  nullable=False)
    refresh_token       = Column(Text,                  nullable=True)
    expires_at          = Column(DateTime(timezone=True), nullable=True)  # None = never expires

    # Metadata
    scopes              = Column(String(500),           nullable=True)    # space-separated OAuth scopes
    metadata_json       = Column(Text,                  nullable=True)    # JSON blob for provider-specific extras

    is_active           = Column(Boolean,               nullable=False, default=True)
    created_at          = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at          = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc),
                                 onupdate=lambda: datetime.now(timezone.utc))

    # Relationships (no back_populates to avoid modifying existing models)
    user  = relationship("User",  foreign_keys=[user_id],  lazy="select")
    brand = relationship("Brand", foreign_keys=[brand_id], lazy="select")

    __table_args__ = (
        UniqueConstraint("user_id", "provider", "external_account_id", name="uq_connected_account"),
        Index("ix_connected_accounts_user_id",  "user_id"),
        Index("ix_connected_accounts_brand_id", "brand_id"),
        Index("ix_connected_accounts_provider", "provider"),
    )
