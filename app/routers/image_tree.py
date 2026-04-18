"""
Router: Árvore de Imagens
Prefixo: /api/v1/images

Endpoints:
  POST   /images/               — cria projeto + upload de referências + inicia geração (multipart)
  GET    /images/{id}           — status completo (fase + famílias + imagens)
  POST   /images/{id}/refine    — gera nova família como variação de uma existente
  DELETE /images/{id}           — exclui projeto e arquivos
"""

import json
import logging

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.dependencies import get_current_active_user, get_db
from app.models.projects import GenerationResult, ImageProject
from app.models.user import User
from app.schemas.image_tree import (
    CreateImageProjectOut,
    ImageFamilyOut,
    ImageTreeStatusOut,
    RefineRequestIn,
)
from app.schemas.projects import ImageProjectOut
from app.services import (
    credit_service,
    project_service,
    storage_service,
    image_generation_service,
)

logger   = logging.getLogger(__name__)
settings = get_settings()
router   = APIRouter(prefix="/images", tags=["image-tree"])


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_results(db: Session, project_id: int) -> list[GenerationResult]:
    return list(db.scalars(
        select(GenerationResult).where(
            GenerationResult.project_type == "image",
            GenerationResult.project_id   == project_id,
        ).order_by(GenerationResult.created_at)
    ).all())


def _build_status(
    project: ImageProject,
    results: list[GenerationResult],
) -> ImageTreeStatusOut:
    """Deriva fase e desserializa famílias a partir dos resultados armazenados."""
    families_r = next((r for r in results if r.result_type == "families"), None)

    # ── Fase derivada ──────────────────────────────────────────────────────────
    if project.status == "failed":
        phase = "failed"
    elif project.status == "completed" and families_r:
        phase = "completed"
    elif project.status == "processing":
        phase = "generating"
    else:
        phase = "pending"

    # ── Famílias ───────────────────────────────────────────────────────────────
    families: list[ImageFamilyOut] | None = None
    if families_r and families_r.metadata_json:
        try:
            data = json.loads(families_r.metadata_json)
            families = [ImageFamilyOut(**f) for f in data.get("families", [])]
        except Exception:
            pass

    return ImageTreeStatusOut(
        project=ImageProjectOut.model_validate(project),
        phase=phase,
        families=families,
    )


# ── Background tasks ──────────────────────────────────────────────────────────

def _run_generation(
    project_id: int,
    user_id: int,
    direction: dict,
    ref_paths: list[str],
) -> None:
    """Executa geração de famílias em background com sessão própria."""
    from app.core.database import SessionLocal  # noqa: PLC0415
    db = SessionLocal()
    try:
        project = db.scalar(select(ImageProject).where(ImageProject.id == project_id))
        if not project:
            return

        families = image_generation_service.generate_families_sync(
            project_id, user_id, direction, ref_paths
        )

        project_service.add_result(
            db,
            project_type="image",
            project_id=project_id,
            result_type="families",
            metadata={"families": families},
        )
        project.status = "completed"
        db.commit()
        logger.info(
            "Geração concluída: project_id=%d, famílias=%d",
            project_id, len(families),
        )

    except Exception as exc:
        logger.exception("Geração falhou: project_id=%d", project_id)
        db.rollback()
        try:
            project = db.scalar(select(ImageProject).where(ImageProject.id == project_id))
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
    response_model=CreateImageProjectOut,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Criar projeto e iniciar geração de famílias visuais",
)
async def create_project(
    background_tasks: BackgroundTasks,
    description: str             = Form(...,          description="Descrição criativa e objetivo do projeto"),
    objective:   str             = Form(default="social_media", description="social_media|advertising|branding|content|product"),
    style:       str             = Form(default="bold",          description="minimalist|bold|lifestyle|corporate|artistic|playful"),
    tone:        str             = Form(default="professional",  description="professional|creative|casual|elegant|vibrant|dark"),
    mode:        str             = Form(default="fast",          description="fast|creative|campaign"),
    title:       str | None      = Form(default=None),
    brand_id:    int | None      = Form(default=None),
    references:  list[UploadFile] = File(default=[]),
    db:          Session         = Depends(get_db),
    current_user: User           = Depends(get_current_active_user),
) -> CreateImageProjectOut:

    # ── Validar modo ──────────────────────────────────────────────────────────
    valid_modes = {"fast", "creative", "campaign"}
    if mode not in valid_modes:
        raise HTTPException(400, f"Modo inválido: {mode}. Use: {', '.join(valid_modes)}.")

    credits_cost = image_generation_service.credit_cost_for_mode(mode)

    # ── Verificar créditos ────────────────────────────────────────────────────
    if not credit_service.can_afford(db, current_user.id, credits_cost):
        balance = credit_service.get_balance(db, current_user.id).balance
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"Créditos insuficientes. Saldo: {balance}, necessário: {credits_cost}.",
        )

    # ── Criar projeto ─────────────────────────────────────────────────────────
    direction = {
        "description": description,
        "objective":   objective,
        "style":       style,
        "tone":        tone,
        "mode":        mode,
        "ref_count":   len(references),
    }
    project = project_service.create_image_project(
        db,
        user_id=current_user.id,
        brand_id=brand_id,
        title=title or f"Projeto {style.capitalize()} — {mode}",
        input_type="image" if references else "text",
        input_prompt=json.dumps(direction),
        credits_cost=credits_cost,
    )
    project.status = "processing"
    db.flush()

    # ── Salvar imagens de referência ──────────────────────────────────────────
    ref_paths: list[str] = []
    allowed_image_types = {
        "image/jpeg", "image/png", "image/webp", "image/gif",
    }
    for ref_file in references:
        ct = ref_file.content_type or ""
        if ct not in allowed_image_types:
            db.rollback()
            raise HTTPException(400, f"Tipo de referência não suportado: {ct}.")
        try:
            file_path, _ = await storage_service.save_upload(
                ref_file, current_user.id, "image", project.id
            )
            ref_paths.append(file_path)
        except HTTPException:
            db.rollback()
            raise

    # ── Debitar créditos ──────────────────────────────────────────────────────
    credit_service.spend(
        db,
        current_user.id,
        credits_cost,
        credit_service.IMAGE_GENERATION,
        reference_id=project.id,
        reference_type="image_project",
        description=f"Árvore de Imagens: {project.title} ({mode})",
    )

    db.commit()
    db.refresh(project)

    # ── Geração em background ─────────────────────────────────────────────────
    background_tasks.add_task(
        _run_generation,
        project.id,
        current_user.id,
        direction,
        ref_paths,
    )

    return CreateImageProjectOut(project_id=project.id, credits_cost=credits_cost)


@router.get(
    "/{project_id}",
    response_model=ImageTreeStatusOut,
    summary="Status do projeto com famílias visuais geradas",
)
def get_status(
    project_id:   int,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_active_user),
) -> ImageTreeStatusOut:
    project = project_service.get_image_project(db, project_id, current_user.id)
    results = _get_results(db, project_id)
    return _build_status(project, results)


@router.post(
    "/{project_id}/refine",
    response_model=ImageTreeStatusOut,
    summary="Gerar nova família como variação de uma existente",
)
def refine_family(
    project_id:   int,
    payload:      RefineRequestIn,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_active_user),
) -> ImageTreeStatusOut:
    project = project_service.get_image_project(db, project_id, current_user.id)
    results = _get_results(db, project_id)

    # ── Carregar famílias existentes ──────────────────────────────────────────
    families_r = next((r for r in results if r.result_type == "families"), None)
    if not families_r or not families_r.metadata_json:
        raise HTTPException(404, "Famílias não encontradas. Aguarde a geração ou tente novamente.")

    data     = json.loads(families_r.metadata_json)
    families = data.get("families", [])

    # ── Localizar família de origem ───────────────────────────────────────────
    original = next((f for f in families if f.get("family_id") == payload.family_id), None)
    if not original:
        raise HTTPException(404, f"Família '{payload.family_id}' não encontrada.")

    # ── Gerar refinamento (síncrono — rápido para mock, usar background em produção) ──
    new_family = image_generation_service.generate_refinement_sync(
        project_id=project_id,
        user_id=current_user.id,
        original_family=original,
        refine_direction=payload.direction,
    )

    # ── Persistir: anexar nova família à lista ────────────────────────────────
    families.append(new_family)
    families_r.metadata_json = json.dumps({"families": families})
    db.commit()
    db.refresh(project)

    return _build_status(project, _get_results(db, project_id))


@router.delete(
    "/{project_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Excluir projeto e todos os arquivos gerados",
)
def delete_project(
    project_id:   int,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_active_user),
) -> None:
    project_service.get_image_project(db, project_id, current_user.id)  # ownership check
    storage_service.delete_project_files(current_user.id, "image", project_id)
    project_service.delete_image_project(db, project_id, current_user.id)
    db.commit()
