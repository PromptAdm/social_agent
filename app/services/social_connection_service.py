"""
SocialConnectionService — CRUD para a tabela social_connections.
"""

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.social_connection import SocialConnection


def get_meta_connection(db: Session, user_id: int) -> SocialConnection | None:
    """Retorna a conexão Meta ativa do usuário, ou None se não existir."""
    return (
        db.query(SocialConnection)
        .filter(
            SocialConnection.user_id == user_id,
            SocialConnection.provider == "meta",
            SocialConnection.status == "connected",
        )
        .first()
    )


def upsert_meta_connection(
    db: Session,
    *,
    user_id: int,
    facebook_page_id: str | None,
    facebook_page_name: str | None,
    instagram_account_id: str | None,
    access_token: str,
) -> SocialConnection:
    """
    Cria ou atualiza a conexão Meta do usuário.
    Sempre atualiza o access_token e os dados da página.
    """
    conn = (
        db.query(SocialConnection)
        .filter(
            SocialConnection.user_id == user_id,
            SocialConnection.provider == "meta",
        )
        .first()
    )

    if conn:
        conn.facebook_page_id     = facebook_page_id
        conn.facebook_page_name   = facebook_page_name
        conn.instagram_account_id = instagram_account_id
        conn.access_token         = access_token
        conn.status               = "connected"
        conn.updated_at           = datetime.now(timezone.utc)
    else:
        conn = SocialConnection(
            user_id              = user_id,
            provider             = "meta",
            facebook_page_id     = facebook_page_id,
            facebook_page_name   = facebook_page_name,
            instagram_account_id = instagram_account_id,
            access_token         = access_token,
            status               = "connected",
        )
        db.add(conn)

    db.commit()
    db.refresh(conn)
    return conn


def disconnect_meta(db: Session, user_id: int) -> bool:
    """Marca a conexão Meta do usuário como desconectada. Retorna True se existia."""
    conn = (
        db.query(SocialConnection)
        .filter(
            SocialConnection.user_id == user_id,
            SocialConnection.provider == "meta",
        )
        .first()
    )
    if not conn:
        return False
    conn.status     = "disconnected"
    conn.updated_at = datetime.now(timezone.utc)
    db.commit()
    return True
