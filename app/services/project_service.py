"""
CRUD e lógica de negócio para ImageProject, VideoProject e GenerationResult.

Os módulos de imagem (Árvore de Imagens) e vídeo (Legendar Vídeo) chamam
estas funções para criar projetos, atualizar status e registrar resultados.
"""

import json
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.projects import GenerationResult, ImageProject, VideoProject


# ── Status permitidos ─────────────────────────────────────────────────────────

VALID_STATUSES = {"pending", "processing", "completed", "failed"}


# ── ImageProject ──────────────────────────────────────────────────────────────

def create_image_project(
    db: Session,
    *,
    user_id: int,
    brand_id: int | None = None,
    title: str | None = None,
    input_type: str,                  # "text" | "image"
    input_prompt: str | None = None,
    input_file_path: str | None = None,
    credits_cost: int = 0,
) -> ImageProject:
    project = ImageProject(
        user_id=user_id,
        brand_id=brand_id,
        title=title,
        status="pending",
        input_type=input_type,
        input_prompt=input_prompt,
        input_file_path=input_file_path,
        credits_cost=credits_cost,
    )
    db.add(project)
    db.flush()
    return project


def get_image_project(db: Session, project_id: int, user_id: int) -> ImageProject:
    project = db.scalar(
        select(ImageProject).where(
            ImageProject.id == project_id,
            ImageProject.user_id == user_id,
        )
    )
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Projeto não encontrado.")
    return project


# ── VideoProject ──────────────────────────────────────────────────────────────

def create_video_project(
    db: Session,
    *,
    user_id: int,
    brand_id: int | None = None,
    title: str | None = None,
    input_file_path: str | None = None,
    input_file_name: str | None = None,
    input_file_size: int | None = None,
    language: str = "pt",
    credits_cost: int = 0,
) -> VideoProject:
    project = VideoProject(
        user_id=user_id,
        brand_id=brand_id,
        title=title,
        status="pending",
        input_file_path=input_file_path,
        input_file_name=input_file_name,
        input_file_size=input_file_size,
        language=language,
        credits_cost=credits_cost,
    )
    db.add(project)
    db.flush()
    return project


def get_video_project(db: Session, project_id: int, user_id: int) -> VideoProject:
    project = db.scalar(
        select(VideoProject).where(
            VideoProject.id == project_id,
            VideoProject.user_id == user_id,
        )
    )
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Projeto não encontrado.")
    return project


# ── Atualização de status ─────────────────────────────────────────────────────

def update_image_status(
    db: Session, project_id: int, user_id: int, new_status: str, error_message: str | None = None
) -> ImageProject:
    _assert_status(new_status)
    project = get_image_project(db, project_id, user_id)
    project.status = new_status
    if error_message is not None:
        project.error_message = error_message
    db.flush()
    return project


def update_video_status(
    db: Session, project_id: int, user_id: int, new_status: str, error_message: str | None = None
) -> VideoProject:
    _assert_status(new_status)
    project = get_video_project(db, project_id, user_id)
    project.status = new_status
    if error_message is not None:
        project.error_message = error_message
    db.flush()
    return project


# ── Resultados ────────────────────────────────────────────────────────────────

def add_result(
    db: Session,
    *,
    project_type: str,          # "image" | "video"
    project_id: int,
    result_type: str,
    file_path: str | None = None,
    file_url: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> GenerationResult:
    result = GenerationResult(
        project_type=project_type,
        project_id=project_id,
        result_type=result_type,
        file_path=file_path,
        file_url=file_url,
        metadata_json=json.dumps(metadata) if metadata else None,
    )
    db.add(result)
    db.flush()
    return result


def get_results(db: Session, project_type: str, project_id: int) -> list[GenerationResult]:
    return list(db.scalars(
        select(GenerationResult)
        .where(
            GenerationResult.project_type == project_type,
            GenerationResult.project_id == project_id,
        )
        .order_by(GenerationResult.created_at)
    ).all())


# ── Histórico ─────────────────────────────────────────────────────────────────

def get_history(
    db: Session,
    user_id: int,
    limit: int = 20,
    offset: int = 0,
) -> dict[str, Any]:
    img_total = db.scalar(
        select(func.count()).select_from(ImageProject).where(ImageProject.user_id == user_id)
    ) or 0
    vid_total = db.scalar(
        select(func.count()).select_from(VideoProject).where(VideoProject.user_id == user_id)
    ) or 0

    images = list(db.scalars(
        select(ImageProject)
        .where(ImageProject.user_id == user_id)
        .order_by(ImageProject.created_at.desc())
        .limit(limit)
        .offset(offset)
    ).all())

    videos = list(db.scalars(
        select(VideoProject)
        .where(VideoProject.user_id == user_id)
        .order_by(VideoProject.created_at.desc())
        .limit(limit)
        .offset(offset)
    ).all())

    return {
        "image_projects": images,
        "video_projects": videos,
        "image_total": img_total,
        "video_total": vid_total,
    }


def update_result_metadata(
    db: Session,
    project_type: str,
    project_id: int,
    result_type: str,
    metadata: dict[str, Any],
) -> GenerationResult:
    """Substitui o metadata_json de um resultado existente."""
    result = db.scalar(
        select(GenerationResult).where(
            GenerationResult.project_type == project_type,
            GenerationResult.project_id   == project_id,
            GenerationResult.result_type  == result_type,
        )
    )
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resultado não encontrado.")
    result.metadata_json = json.dumps(metadata)
    db.flush()
    return result


def delete_image_project(db: Session, project_id: int, user_id: int) -> None:
    project = get_image_project(db, project_id, user_id)
    db.delete(project)
    db.flush()


def delete_video_project(db: Session, project_id: int, user_id: int) -> None:
    project = get_video_project(db, project_id, user_id)
    db.delete(project)
    db.flush()


# ── Privado ───────────────────────────────────────────────────────────────────

def _assert_status(s: str) -> None:
    if s not in VALID_STATUSES:
        raise ValueError(f"Status inválido: {s!r}. Use um de: {VALID_STATUSES}")
