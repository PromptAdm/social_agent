"""
Endpoint genérico de upload de arquivos.

Módulos de imagem e vídeo usam este endpoint para enviar arquivos
antes de iniciar um projeto. O arquivo é salvo no storage local e
o caminho retornado é passado ao criar o projeto.
"""

from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.dependencies import get_current_active_user, get_db
from app.models.user import User
from app.schemas.projects import UploadedFileOut
from app.services import storage_service

router  = APIRouter(prefix="/upload", tags=["upload"])
settings = get_settings()

ALLOWED_IMAGE_TYPES = {
    "image/jpeg", "image/png", "image/webp", "image/gif",
}
ALLOWED_VIDEO_TYPES = {
    "video/mp4", "video/quicktime", "video/x-msvideo",
    "video/webm", "video/mpeg",
}
ALLOWED_TYPES = ALLOWED_IMAGE_TYPES | ALLOWED_VIDEO_TYPES


@router.post("/", response_model=UploadedFileOut)
async def upload_file(
    file:         UploadFile = File(...),
    project_type: str        = Form(...),   # "image" | "video"
    project_id:   int        = Form(...),
    db:           Session    = Depends(get_db),
    current_user: User       = Depends(get_current_active_user),
) -> UploadedFileOut:
    from fastapi import HTTPException, status

    if project_type not in {"image", "video"}:
        raise HTTPException(status_code=400, detail="project_type deve ser 'image' ou 'video'.")

    content_type = file.content_type or ""
    if content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Tipo de arquivo não suportado: {content_type}.",
        )

    file_path, file_url = await storage_service.save_upload(
        file, current_user.id, project_type, project_id
    )

    return UploadedFileOut(
        file_path=file_path,
        file_url=file_url,
        original_name=file.filename or "file",
        size_bytes=file.size or 0,
        content_type=content_type,
    )
