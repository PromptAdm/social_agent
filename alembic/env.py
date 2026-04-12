"""
Alembic env.py — configuração de migrações do Social Agent.

Comportamento:
- Lê DATABASE_URL do arquivo .env (via python-dotenv) e injeta em sqlalchemy.url,
  sobrescrevendo o valor placeholder do alembic.ini.
- Importa todos os models via app.models para que o Alembic detecte as tabelas
  automaticamente no modo --autogenerate.
"""

import os
from logging.config import fileConfig

from alembic import context
from dotenv import load_dotenv
from sqlalchemy import engine_from_config, pool

# Carrega .env antes de qualquer import da aplicação
load_dotenv()

# Importa Base e todos os models para registro no metadata
from app.core.database import Base  # noqa: E402
import app.models  # noqa: F401, E402 — força importação de todos os models

# ── Configuração do Alembic ────────────────────────────────────────────────────
config = context.config

# Sobrescreve sqlalchemy.url com a variável de ambiente DATABASE_URL
database_url = os.environ.get("DATABASE_URL")
if database_url:
    config.set_main_option("sqlalchemy.url", database_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


# ── Migrações offline ─────────────────────────────────────────────────────────
def run_migrations_offline() -> None:
    """
    Executa migrações em modo offline (sem conexão ativa ao banco).
    Gera SQL puro sem precisar de um banco acessível.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        # Inclui comentários de tipo nas colunas geradas
        render_as_batch=False,
    )
    with context.begin_transaction():
        context.run_migrations()


# ── Migrações online ──────────────────────────────────────────────────────────
def run_migrations_online() -> None:
    """
    Executa migrações em modo online (com conexão ativa ao banco).
    Usado no fluxo padrão: alembic upgrade head.
    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            # Compara tipos de colunas ao detectar diferenças
            compare_type=True,
            # Compara valores default ao detectar diferenças
            compare_server_default=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
