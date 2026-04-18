from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_active_user, get_db
from app.models.user import User
from app.schemas.projects import ImageProjectOut, ProjectHistoryOut, VideoProjectOut
from app.services import project_service, storage_service

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("/history", response_model=ProjectHistoryOut)
def history(
    limit:        int     = Query(default=20, ge=1, le=100),
    offset:       int     = Query(default=0,  ge=0),
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_active_user),
) -> ProjectHistoryOut:
    data = project_service.get_history(db, current_user.id, limit=limit, offset=offset)
    return ProjectHistoryOut(
        image_projects=[ImageProjectOut.model_validate(p) for p in data["image_projects"]],
        video_projects=[VideoProjectOut.model_validate(p) for p in data["video_projects"]],
        image_total=data["image_total"],
        video_total=data["video_total"],
    )


@router.get("/image/{project_id}", response_model=ImageProjectOut)
def get_image_project(
    project_id:   int,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_active_user),
) -> ImageProjectOut:
    project = project_service.get_image_project(db, project_id, current_user.id)
    return ImageProjectOut.model_validate(project)


@router.get("/video/{project_id}", response_model=VideoProjectOut)
def get_video_project(
    project_id:   int,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_active_user),
) -> VideoProjectOut:
    project = project_service.get_video_project(db, project_id, current_user.id)
    return VideoProjectOut.model_validate(project)


@router.delete("/image/{project_id}", status_code=204)
def delete_image_project(
    project_id:   int,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_active_user),
) -> None:
    project_service.delete_image_project(db, project_id, current_user.id)
    storage_service.delete_project_files(current_user.id, "image", project_id)
    db.commit()


@router.delete("/video/{project_id}", status_code=204)
def delete_video_project(
    project_id:   int,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_active_user),
) -> None:
    project_service.delete_video_project(db, project_id, current_user.id)
    storage_service.delete_project_files(current_user.id, "video", project_id)
    db.commit()
