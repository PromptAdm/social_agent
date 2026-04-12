"""
Configuração do SQLAlchemy: engine, SessionLocal e Base declarativa.
Todos os models devem herdar de Base para serem reconhecidos pelo Alembic.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import get_settings

settings = get_settings()

_engine_kwargs: dict = {
    "pool_pre_ping": True,   # verifica conexão antes de usar do pool
    "echo": settings.DEBUG,  # loga queries SQL em modo debug
}

# SQLite não suporta acesso multi-thread sem este flag
if settings.DATABASE_URL.startswith("sqlite"):
    _engine_kwargs["connect_args"] = {"check_same_thread": False}

engine = create_engine(settings.DATABASE_URL, **_engine_kwargs)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


class Base(DeclarativeBase):
    """Base declarativa compartilhada por todos os models ORM."""
    pass
