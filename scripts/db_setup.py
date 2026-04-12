"""
db_setup.py — Utilitário de setup do banco de dados
=====================================================
Verifica conectividade, executa migrações e opcionalmente popula com seed.

Uso:
    # Somente migrar
    python scripts/db_setup.py

    # Migrar + seed
    python scripts/db_setup.py --seed

    # Reset completo (downgrade + upgrade + seed)  ⚠️  DESTRÓI DADOS!
    python scripts/db_setup.py --reset --seed
"""

import argparse
import sys
from pathlib import Path

# Garante que o diretório raiz esteja no sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dotenv import load_dotenv

load_dotenv()


def check_connection() -> bool:
    """Verifica se o banco de dados está acessível."""
    from sqlalchemy import text
    from app.core.database import engine

    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("✓  Conexão com o banco de dados OK")
        return True
    except Exception as exc:
        print(f"✗  Não foi possível conectar ao banco: {exc}")
        return False


def run_migrations() -> None:
    """Executa alembic upgrade head."""
    from alembic import command
    from alembic.config import Config

    root = Path(__file__).resolve().parent.parent
    alembic_cfg = Config(str(root / "alembic.ini"))
    alembic_cfg.set_main_option("script_location", str(root / "alembic"))

    print("⚙️   Executando migrações (alembic upgrade head)…")
    command.upgrade(alembic_cfg, "head")
    print("✓  Migrações aplicadas")


def run_downgrade() -> None:
    """Executa alembic downgrade base (apaga todas as tabelas)."""
    from alembic import command
    from alembic.config import Config

    root = Path(__file__).resolve().parent.parent
    alembic_cfg = Config(str(root / "alembic.ini"))
    alembic_cfg.set_main_option("script_location", str(root / "alembic"))

    print("⚠️   Executando downgrade (alembic downgrade base)…")
    command.downgrade(alembic_cfg, "base")
    print("✓  Downgrade concluído — banco vazio")


def run_seed() -> None:
    """Executa o seed de dados fictícios."""
    from scripts.seed import seed

    seed()


def main() -> None:
    parser = argparse.ArgumentParser(description="Setup do banco Social Agent")
    parser.add_argument(
        "--seed",
        action="store_true",
        help="Popula o banco com dados fictícios após migrar",
    )
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Faz downgrade + upgrade antes de migrar (⚠️ DESTRÓI DADOS)",
    )
    args = parser.parse_args()

    print("\n🗄️   Social Agent — Database Setup\n")

    if not check_connection():
        print("\nVerifique o DATABASE_URL no arquivo .env e tente novamente.")
        sys.exit(1)

    if args.reset:
        confirm = input(
            "\n⚠️  ATENÇÃO: --reset vai apagar todos os dados do banco.\n"
            "   Digite 'sim' para confirmar: "
        )
        if confirm.strip().lower() != "sim":
            print("Operação cancelada.")
            sys.exit(0)
        run_downgrade()

    run_migrations()

    if args.seed:
        run_seed()

    print("\n🎉  Setup concluído!\n")


if __name__ == "__main__":
    main()
