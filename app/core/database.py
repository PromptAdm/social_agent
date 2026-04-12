"""
Configuração do SQLAlchemy: engine, SessionLocal e Base declarativa.
Todos os models devem herdar de Base para serem reconhecidos pelo Alembic.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import get_settings

settings = get_settings()

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,   # verifica conexão antes de usar do pool
    echo=settings.DEBUG,  # loga queries SQL em modo debug
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


class Base(DeclarativeBase):
    """Base declarativa compartilhada por todos os models ORM."""
    pass
