"""
Backup automático do banco de dados — SQLite e PostgreSQL.

Uso:
    python scripts/backup.py               # backup padrão
    python scripts/backup.py --dry-run     # simula sem gravar/enviar
    python scripts/backup.py --no-s3       # força apenas backup local

Saídas:
    exit 0 — backup concluído com sucesso
    exit 1 — falha crítica (backup não foi criado)

Variáveis de ambiente lidas diretamente (sem depender de FastAPI):
    DATABASE_URL              — string de conexão (detecta sqlite vs postgresql)
    BACKUP_DIR                — diretório local para armazenar backups (padrão: ./backups)
    BACKUP_RETENTION_DAYS     — quantos dias manter backups locais (padrão: 7)
    BACKUP_S3_BUCKET          — nome do bucket S3; vazio = sem upload
    BACKUP_S3_PREFIX          — prefixo/pasta no bucket (padrão: social-agent/backups)
    AWS_ACCESS_KEY_ID         — credencial AWS (boto3 também aceita ~/.aws/credentials)
    AWS_SECRET_ACCESS_KEY     — credencial AWS
    AWS_REGION                — região do bucket (padrão: us-east-1)
"""

from __future__ import annotations

import argparse
import gzip
import logging
import os
import shutil
import sqlite3
import subprocess
import sys
import time
import urllib.parse
from datetime import datetime, timedelta, timezone
from pathlib import Path

# ── Logging ───────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [backup] %(levelname)s %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
log = logging.getLogger("backup")


# ── Configuração via env ───────────────────────────────────────────────────────

def _load_dotenv() -> None:
    """
    Lê o arquivo .env da raiz do projeto e injeta no os.environ.
    Só processa linhas no formato KEY=VALUE; ignora comentários e vazias.
    Não sobrescreve variáveis já definidas no ambiente do SO.
    """
    root = Path(__file__).resolve().parent.parent
    dotenv = root / ".env"
    if not dotenv.exists():
        return
    with dotenv.open(encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = value


_load_dotenv()

DATABASE_URL          = os.environ.get("DATABASE_URL", "sqlite:///./social_agent.db")
BACKUP_DIR            = Path(os.environ.get("BACKUP_DIR", "./backups"))
BACKUP_RETENTION_DAYS = int(os.environ.get("BACKUP_RETENTION_DAYS", "7"))
BACKUP_S3_BUCKET      = os.environ.get("BACKUP_S3_BUCKET", "")
BACKUP_S3_PREFIX      = os.environ.get("BACKUP_S3_PREFIX", "social-agent/backups")
AWS_REGION            = os.environ.get("AWS_REGION", "us-east-1")


# ── Helpers ────────────────────────────────────────────────────────────────────

def _timestamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def _gzip_file(src: Path, dst: Path) -> None:
    """Comprime src → dst.gz. Remove src após sucesso."""
    with src.open("rb") as f_in, gzip.open(dst, "wb", compresslevel=6) as f_out:
        shutil.copyfileobj(f_in, f_out)
    src.unlink()
    log.info("Comprimido: %s (%.1f KB)", dst.name, dst.stat().st_size / 1024)


# ── Backup SQLite ──────────────────────────────────────────────────────────────

def _sqlite_db_path(url: str) -> Path:
    """Extrai o caminho do arquivo SQLite a partir da DATABASE_URL."""
    # sqlite:///./social_agent.db  →  ./social_agent.db
    # sqlite:////abs/path.db       →  /abs/path.db
    path_str = url.removeprefix("sqlite:///")
    root = Path(__file__).resolve().parent.parent
    path = Path(path_str)
    return path if path.is_absolute() else (root / path).resolve()


def backup_sqlite(out_dir: Path, dry_run: bool = False) -> Path | None:
    """
    Cria um backup atômico do SQLite usando a API nativa sqlite3.connect.backup().
    Seguro mesmo com a aplicação rodando (locking de WAL transparente).

    Retorna o caminho do arquivo .sql.gz criado, ou None em dry_run.
    """
    db_path = _sqlite_db_path(DATABASE_URL)
    if not db_path.exists():
        log.error("Arquivo SQLite não encontrado: %s", db_path)
        return None

    log.info("SQLite detectado: %s", db_path)
    ts = _timestamp()
    raw_path  = out_dir / f"backup_{ts}.db"
    gz_path   = out_dir / f"backup_{ts}.db.gz"

    if dry_run:
        log.info("[dry-run] Pularia backup de %s → %s", db_path, gz_path)
        return None

    out_dir.mkdir(parents=True, exist_ok=True)

    src_conn = sqlite3.connect(str(db_path))
    dst_conn = sqlite3.connect(str(raw_path))
    try:
        # backup() é thread-safe e usa o journal do SQLite corretamente
        src_conn.backup(dst_conn, pages=100)
        log.info("Dump concluído: %s", raw_path.name)
    finally:
        dst_conn.close()
        src_conn.close()

    _gzip_file(raw_path, gz_path)
    return gz_path


# ── Backup PostgreSQL ──────────────────────────────────────────────────────────

def backup_postgresql(out_dir: Path, dry_run: bool = False) -> Path | None:
    """
    Chama pg_dump com formato custom (mais compacto e restaurável via pg_restore).
    Requer pg_dump instalado no PATH do servidor.

    Retorna o caminho do .pgdump.gz criado, ou None em dry_run / falha.
    """
    ts = _timestamp()
    raw_path = out_dir / f"backup_{ts}.pgdump"
    gz_path  = out_dir / f"backup_{ts}.pgdump.gz"

    if dry_run:
        log.info("[dry-run] Pularia pg_dump → %s", gz_path)
        return None

    # Verifica se pg_dump está disponível
    if not shutil.which("pg_dump"):
        log.error("pg_dump não encontrado no PATH — instale postgresql-client")
        return None

    out_dir.mkdir(parents=True, exist_ok=True)

    # pg_dump aceita a URL diretamente como string de conexão
    result = subprocess.run(
        ["pg_dump", "--format=custom", f"--file={raw_path}", DATABASE_URL],
        capture_output=True,
        text=True,
    )

    if result.returncode != 0:
        # Oculta a URL (pode conter senha) no log de erro
        log.error("pg_dump falhou (código %d): %s", result.returncode,
                  _mask_db_url(result.stderr.strip()))
        if raw_path.exists():
            raw_path.unlink()
        return None

    log.info("pg_dump concluído: %s", raw_path.name)
    _gzip_file(raw_path, gz_path)
    return gz_path


def _mask_db_url(text: str) -> str:
    """Remove senhas de mensagens de erro antes de logar."""
    try:
        parsed = urllib.parse.urlparse(DATABASE_URL)
        if parsed.password:
            text = text.replace(parsed.password, "***")
    except Exception:
        pass
    return text


# ── Upload S3 ──────────────────────────────────────────────────────────────────

def upload_to_s3(local_file: Path, dry_run: bool = False) -> bool:
    """
    Faz upload do arquivo de backup para S3.
    Retorna True em sucesso, False em falha ou quando S3 não está configurado.
    Silencioso se boto3 não estiver instalado.
    """
    if not BACKUP_S3_BUCKET:
        return True  # S3 não configurado — ok, não é erro

    s3_key = f"{BACKUP_S3_PREFIX.rstrip('/')}/{local_file.name}"

    if dry_run:
        log.info("[dry-run] Pularia upload s3://%s/%s", BACKUP_S3_BUCKET, s3_key)
        return True

    try:
        import boto3  # type: ignore[import]
    except ImportError:
        log.warning(
            "boto3 não instalado — ignorando upload S3. "
            "Instale com: pip install boto3"
        )
        return True  # não é falha crítica

    try:
        s3 = boto3.client("s3", region_name=AWS_REGION)
        s3.upload_file(
            str(local_file),
            BACKUP_S3_BUCKET,
            s3_key,
            ExtraArgs={"ServerSideEncryption": "AES256"},
        )
        log.info("Upload S3 concluído: s3://%s/%s", BACKUP_S3_BUCKET, s3_key)
        return True
    except Exception as exc:
        log.error("Falha no upload S3: %s", exc)
        return False


# ── Limpeza de backups antigos ─────────────────────────────────────────────────

def purge_old_backups(backup_dir: Path, retention_days: int, dry_run: bool = False) -> int:
    """
    Remove arquivos de backup locais mais antigos que retention_days.
    Retorna quantos arquivos foram removidos.
    """
    if retention_days <= 0:
        return 0

    cutoff = time.time() - (retention_days * 86400)
    removed = 0

    for f in backup_dir.glob("backup_*.gz"):
        if f.stat().st_mtime < cutoff:
            age_days = (time.time() - f.stat().st_mtime) / 86400
            if dry_run:
                log.info("[dry-run] Removeria %s (%.1f dias)", f.name, age_days)
            else:
                f.unlink()
                log.info("Removido (%.1f dias): %s", age_days, f.name)
            removed += 1

    return removed


# ── Ponto de entrada ──────────────────────────────────────────────────────────

def main() -> int:
    parser = argparse.ArgumentParser(description="Backup do banco de dados do Social Agent")
    parser.add_argument("--dry-run",  action="store_true", help="Simula sem gravar ou enviar")
    parser.add_argument("--no-s3",    action="store_true", help="Ignora upload S3 mesmo se configurado")
    parser.add_argument("--out-dir",  type=Path, default=BACKUP_DIR, help="Diretório de saída")
    parser.add_argument("--retention",type=int,  default=BACKUP_RETENTION_DAYS,
                        help="Dias de retenção local (0 = sem limpeza)")
    args = parser.parse_args()

    out_dir: Path = args.out_dir
    dry_run: bool = args.dry_run

    log.info("=== Backup Social Agent ===")
    log.info("DATABASE_URL: %s", _mask_db_url(DATABASE_URL))
    log.info("Destino local: %s", out_dir.resolve())
    if BACKUP_S3_BUCKET and not args.no_s3:
        log.info("S3: s3://%s/%s", BACKUP_S3_BUCKET, BACKUP_S3_PREFIX)

    # Detecta engine
    url_lower = DATABASE_URL.lower()
    if url_lower.startswith("sqlite"):
        backup_file = backup_sqlite(out_dir, dry_run=dry_run)
    elif url_lower.startswith("postgresql") or url_lower.startswith("postgres"):
        backup_file = backup_postgresql(out_dir, dry_run=dry_run)
    else:
        log.error("DATABASE_URL não reconhecida: '%s'", DATABASE_URL[:20])
        return 1

    if backup_file is None and not dry_run:
        log.error("Backup falhou — nenhum arquivo foi criado.")
        return 1

    # Upload S3
    if backup_file and not args.no_s3:
        upload_to_s3(backup_file, dry_run=dry_run)

    # Limpeza local
    removed = purge_old_backups(out_dir, args.retention, dry_run=dry_run)
    if removed:
        log.info("Retenção: %d arquivo(s) antigo(s) removido(s)", removed)

    log.info("=== Backup concluído ===")
    return 0


if __name__ == "__main__":
    sys.exit(main())
