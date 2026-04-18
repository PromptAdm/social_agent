"""
Gerencia o armazenamento de arquivos enviados e gerados.

Estrutura de diretórios:
  {STORAGE_DIR}/
    uploads/users/{user_id}/{project_type}/{project_id}/
    generated/users/{user_id}/{project_type}/{project_id}/

Os módulos de imagem e vídeo chamam get_upload_path() e get_output_path()
para obter caminhos absolutos antes de gravar arquivos.
"""

import os
import shutil
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

from app.core.config import get_settings

settings = get_settings()


def _storage_root() -> Path:
    root = Path(settings.STORAGE_DIR).resolve()
    root.mkdir(parents=True, exist_ok=True)
    return root


def get_upload_dir(user_id: int, project_type: str, project_id: int) -> Path:
    d = _storage_root() / "uploads" / "users" / str(user_id) / project_type / str(project_id)
    d.mkdir(parents=True, exist_ok=True)
    return d


def get_output_dir(user_id: int, project_type: str, project_id: int) -> Path:
    d = _storage_root() / "generated" / "users" / str(user_id) / project_type / str(project_id)
    d.mkdir(parents=True, exist_ok=True)
    return d


def get_upload_path(user_id: int, project_type: str, project_id: int, filename: str) -> Path:
    return get_upload_dir(user_id, project_type, project_id) / _safe_name(filename)


def get_output_path(user_id: int, project_type: str, project_id: int, filename: str) -> Path:
    return get_output_dir(user_id, project_type, project_id) / _safe_name(filename)


def relative_url(abs_path: Path) -> str:
    """Converte caminho absoluto para URL relativa servida por /storage."""
    try:
        rel = abs_path.relative_to(_storage_root())
        return f"/storage/{rel.as_posix()}"
    except ValueError:
        return str(abs_path)


async def save_upload(
    file: UploadFile,
    user_id: int,
    project_type: str,
    project_id: int,
) -> tuple[str, str]:
    """
    Salva um arquivo enviado e retorna (file_path, file_url).
    Lança 413 se o arquivo ultrapassar MAX_UPLOAD_MB.
    """
    max_bytes = settings.MAX_UPLOAD_MB * 1024 * 1024
    ext       = _ext(file.filename or "file")
    unique    = f"{uuid.uuid4().hex}{ext}"
    dest      = get_upload_dir(user_id, project_type, project_id) / unique

    size = 0
    with dest.open("wb") as out:
        while chunk := await file.read(1024 * 1024):  # 1 MB chunks
            size += len(chunk)
            if size > max_bytes:
                out.close()
                dest.unlink(missing_ok=True)
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"Arquivo muito grande. Limite: {settings.MAX_UPLOAD_MB} MB.",
                )
            out.write(chunk)

    return str(dest), relative_url(dest)


def delete_project_files(user_id: int, project_type: str, project_id: int) -> None:
    for subdir in ("uploads", "generated"):
        d = _storage_root() / subdir / "users" / str(user_id) / project_type / str(project_id)
        if d.exists():
            shutil.rmtree(d, ignore_errors=True)


# ── Privados ──────────────────────────────────────────────────────────────────

def _safe_name(filename: str) -> str:
    name = Path(filename).name
    return "".join(c if c.isalnum() or c in "._-" else "_" for c in name) or "file"


def _ext(filename: str) -> str:
    suffix = Path(filename).suffix.lower()
    return suffix if suffix else ""
