"""
Router: Legendar Vídeo
Prefixo: /api/v1/video-subtitle

Endpoints:
  POST   /video-subtitle/                  — cria projeto + inicia transcrição (multipart)
  GET    /video-subtitle/{id}              — status completo (fase + segmentos + URLs)
  PUT    /video-subtitle/{id}/segments     — salva segmentos editados pelo usuário
  POST   /video-subtitle/{id}/render       — inicia renderização com FFmpeg
  GET    /video-subtitle/{id}/srt          — download direto do arquivo SRT
"""

import json
import logging
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.dependencies import get_current_active_user, get_db
from app.models.projects import GenerationResult, VideoProject
from app.models.user import User
from app.schemas.video_subtitle import (
    CreateProjectOut,
    SubtitleSegment,
    UpdateSegmentsIn,
    VideoSubtitleStatusOut,
)
from app.schemas.projects import VideoProjectOut
from app.services import (
    credit_service,
    project_service,
    storage_service,
    srt_service,
    transcription_service,
    video_render_service,
)

logger   = logging.getLogger(__name__)
settings = get_settings()
router   = APIRouter(prefix="/video-subtitle", tags=["video-subtitle"])


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_results(db: Session, project_id: int) -> list[GenerationResult]:
    return list(db.scalars(
        select(GenerationResult).where(
            GenerationResult.project_type == "video",
            GenerationResult.project_id   == project_id,
        ).order_by(GenerationResult.created_at)
    ).all())


def _build_status(
    project: VideoProject,
    results: list[GenerationResult],
) -> VideoSubtitleStatusOut:
    seg_r   = next((r for r in results if r.result_type == "segments"),        None)
    srt_r   = next((r for r in results if r.result_type == "subtitle_srt"),    None)
    vid_r   = next((r for r in results if r.result_type == "rendered_video"),  None)

    # ── Fase derivada ──────────────────────────────────────────────────────────
    if project.status == "failed":
        phase = "failed"
    elif vid_r or (srt_r and project.status == "completed"):
        phase = "completed"
    elif seg_r and project.status == "processing":
        phase = "rendering"
    elif seg_r:
        phase = "transcribed"
    elif project.status == "processing":
        phase = "transcribing"
    else:
        phase = "pending"

    # ── Segmentos ──────────────────────────────────────────────────────────────
    segments: list[SubtitleSegment] | None = None
    if seg_r and seg_r.metadata_json:
        try:
            data = json.loads(seg_r.metadata_json)
            segments = [SubtitleSegment(**s) for s in data.get("segments", [])]
        except Exception:
            pass

    return VideoSubtitleStatusOut(
        project=VideoProjectOut.model_validate(project),
        phase=phase,
        segments=segments,
        srt_url=srt_r.file_url   if srt_r else None,
        video_url=vid_r.file_url if vid_r else None,
        ffmpeg_available=video_render_service.is_available(),
    )


# ── Background tasks ──────────────────────────────────────────────────────────

def _run_transcription(project_id: int, file_path: str, language: str) -> None:
    from app.core.database import SessionLocal  # noqa: PLC0415
    db = SessionLocal()
    try:
        project = db.scalar(select(VideoProject).where(VideoProject.id == project_id))
        if not project:
            return

        segments = transcription_service.transcribe_sync(file_path, language)

        project_service.add_result(
            db,
            project_type="video",
            project_id=project_id,
            result_type="segments",
            metadata={"segments": segments, "language": language},
        )
        project.status = "completed"
        db.commit()
        logger.info("Transcrição concluída: project_id=%d, segmentos=%d", project_id, len(segments))

    except Exception as exc:
        logger.exception("Transcrição falhou: project_id=%d", project_id)
        db.rollback()
        try:
            project = db.scalar(select(VideoProject).where(VideoProject.id == project_id))
            if project:
                project.status = "failed"
                project.error_message = str(exc)[:500]
                db.commit()
        except Exception:
            pass
    finally:
        db.close()


def _run_render(project_id: int, video_path: str, segments_json: str, user_id: int) -> None:
    from app.core.database import SessionLocal  # noqa: PLC0415
    db = SessionLocal()
    try:
        project = db.scalar(select(VideoProject).where(VideoProject.id == project_id))
        if not project:
            return

        data     = json.loads(segments_json)
        segments = data.get("segments", [])

        # 1. Gerar SRT
        srt_content = srt_service.segments_to_srt(segments)
        output_dir  = storage_service.get_output_dir(user_id, "video", project_id)
        srt_path    = output_dir / "subtitles.srt"
        srt_path.write_text(srt_content, encoding="utf-8")
        srt_url = storage_service.relative_url(srt_path)

        project_service.add_result(
            db,
            project_type="video",
            project_id=project_id,
            result_type="subtitle_srt",
            file_path=str(srt_path),
            file_url=srt_url,
        )

        # 2. Tentar renderizar com FFmpeg
        output_video = output_dir / "video_com_legendas.mp4"
        try:
            video_render_service.render_with_subtitles_sync(
                video_path, str(srt_path), str(output_video)
            )
            video_url = storage_service.relative_url(output_video)
            project_service.add_result(
                db,
                project_type="video",
                project_id=project_id,
                result_type="rendered_video",
                file_path=str(output_video),
                file_url=video_url,
            )
            logger.info("Render concluído: project_id=%d", project_id)

        except video_render_service.FFmpegNotAvailable:
            project.error_message = (
                "FFmpeg não disponível — vídeo não renderizado. "
                "Baixe o arquivo SRT e use em um editor de vídeo."
            )
            logger.warning("FFmpeg ausente: project_id=%d", project_id)

        project.status = "completed"
        db.commit()

    except Exception as exc:
        logger.exception("Render falhou: project_id=%d", project_id)
        db.rollback()
        try:
            project = db.scalar(select(VideoProject).where(VideoProject.id == project_id))
            if project:
                project.status = "failed"
                project.error_message = str(exc)[:500]
                db.commit()
        except Exception:
            pass
    finally:
        db.close()


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post(
    "/",
    response_model=CreateProjectOut,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Criar projeto e iniciar transcrição",
)
async def create_project(
    background_tasks: BackgroundTasks,
    file:     UploadFile      = File(...,          description="Arquivo de vídeo (mp4, mov, avi, webm)"),
    language: str             = Form(default="pt", description="Código do idioma (pt, en, es, fr, auto)"),
    title:    str | None      = Form(default=None),
    brand_id: int | None      = Form(default=None),
    db:       Session         = Depends(get_db),
    current_user: User        = Depends(get_current_active_user),
) -> CreateProjectOut:
    # ── Verificar créditos ────────────────────────────────────────────────────
    if not credit_service.can_afford(db, current_user.id, settings.CREDITS_VIDEO_SUBTITLE):
        balance = credit_service.get_balance(db, current_user.id).balance
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"Créditos insuficientes. Saldo: {balance}, necessário: {settings.CREDITS_VIDEO_SUBTITLE}.",
        )

    # ── Validar tipo de arquivo ───────────────────────────────────────────────
    allowed = {"video/mp4", "video/quicktime", "video/x-msvideo", "video/webm", "video/mpeg"}
    ct = file.content_type or ""
    if ct not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Tipo de arquivo não suportado: {ct}. Use mp4, mov, avi ou webm.",
        )

    # ── Criar projeto (com status "processing") ────────────────────────────────
    project = project_service.create_video_project(
        db,
        user_id=current_user.id,
        brand_id=brand_id,
        title=title or file.filename,
        input_file_name=file.filename,
        input_file_size=file.size,
        language=language,
        credits_cost=settings.CREDITS_VIDEO_SUBTITLE,
    )
    project.status = "processing"
    db.flush()

    # ── Salvar arquivo ────────────────────────────────────────────────────────
    try:
        file_path, _ = await storage_service.save_upload(
            file, current_user.id, "video", project.id
        )
    except HTTPException:
        db.rollback()
        raise

    project.input_file_path = file_path

    # ── Debitar créditos ──────────────────────────────────────────────────────
    credit_service.spend(
        db,
        current_user.id,
        settings.CREDITS_VIDEO_SUBTITLE,
        credit_service.VIDEO_SUBTITLE,
        reference_id=project.id,
        reference_type="video_project",
        description=f"Legendagem: {file.filename}",
    )

    db.commit()
    db.refresh(project)

    # ── Transcrição em background ─────────────────────────────────────────────
    background_tasks.add_task(_run_transcription, project.id, file_path, language)

    return CreateProjectOut(project_id=project.id)


@router.get(
    "/{project_id}",
    response_model=VideoSubtitleStatusOut,
    summary="Status do projeto (fase + segmentos + URLs)",
)
def get_status(
    project_id:   int,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_active_user),
) -> VideoSubtitleStatusOut:
    project = project_service.get_video_project(db, project_id, current_user.id)
    results = _get_results(db, project_id)
    return _build_status(project, results)


@router.put(
    "/{project_id}/segments",
    response_model=VideoSubtitleStatusOut,
    summary="Salvar segmentos editados pelo usuário",
)
def update_segments(
    project_id:   int,
    payload:      UpdateSegmentsIn,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_active_user),
) -> VideoSubtitleStatusOut:
    project_service.get_video_project(db, project_id, current_user.id)  # ownership check

    segs = [s.model_dump() for s in payload.segments]
    # Re-index para garantir sequência contínua
    for i, s in enumerate(segs, start=1):
        s["index"] = i

    project_service.update_result_metadata(
        db,
        project_type="video",
        project_id=project_id,
        result_type="segments",
        metadata={"segments": segs},
    )
    db.commit()

    project = project_service.get_video_project(db, project_id, current_user.id)
    results = _get_results(db, project_id)
    return _build_status(project, results)


@router.post(
    "/{project_id}/render",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Iniciar renderização do vídeo com legendas",
)
def start_render(
    project_id:       int,
    background_tasks: BackgroundTasks,
    db:               Session = Depends(get_db),
    current_user:     User    = Depends(get_current_active_user),
) -> dict:
    project = project_service.get_video_project(db, project_id, current_user.id)
    results = _get_results(db, project_id)

    seg_r = next((r for r in results if r.result_type == "segments"), None)
    if not seg_r or not seg_r.metadata_json:
        raise HTTPException(400, "Transcrição não encontrada. Aguarde a transcrição ou tente novamente.")

    if not project.input_file_path:
        raise HTTPException(400, "Arquivo de vídeo não encontrado no projeto.")

    # Remover resultados de render anterior se existirem (nova tentativa)
    for r in results:
        if r.result_type in ("subtitle_srt", "rendered_video"):
            db.delete(r)

    project.status = "processing"
    project.error_message = None
    db.commit()

    background_tasks.add_task(
        _run_render,
        project_id,
        project.input_file_path,
        seg_r.metadata_json,
        current_user.id,
    )

    return {"message": "Renderização iniciada.", "project_id": project_id}


@router.get(
    "/{project_id}/srt",
    summary="Download direto do arquivo SRT",
)
def download_srt(
    project_id:   int,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_active_user),
) -> FileResponse:
    project_service.get_video_project(db, project_id, current_user.id)  # ownership check
    results = _get_results(db, project_id)

    srt_r = next((r for r in results if r.result_type == "subtitle_srt"), None)
    if not srt_r or not srt_r.file_path:
        raise HTTPException(404, "Arquivo SRT não disponível. Execute a renderização primeiro.")

    path = Path(srt_r.file_path)
    if not path.exists():
        raise HTTPException(404, "Arquivo SRT não encontrado no servidor.")

    filename = f"legendas_projeto_{project_id}.srt"
    return FileResponse(
        path=str(path),
        filename=filename,
        media_type="text/plain",
    )
