"""
Router: Brands — Módulo 1: Estratégia da Marca
Endpoints CRUD para brands vinculadas ao usuário autenticado.
"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_active_user, get_db
from app.models.user import User
from app.schemas.brand import BrandCreate, BrandOut, BrandUpdate
from app.services import brand_service

router = APIRouter(prefix="/brands", tags=["Brands"])


@router.post("/", response_model=BrandOut, status_code=status.HTTP_201_CREATED)
def create_brand(
    payload: BrandCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return brand_service.create_brand(db, payload, owner_id=current_user.id)


@router.get("/", response_model=list[BrandOut])
def list_brands(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return brand_service.list_brands(db, owner_id=current_user.id)


@router.get("/{brand_id}", response_model=BrandOut)
def get_brand(
    brand_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return brand_service.get_brand(db, brand_id, owner_id=current_user.id)


@router.patch("/{brand_id}", response_model=BrandOut)
def update_brand(
    brand_id: int,
    payload: BrandUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return brand_service.update_brand(db, brand_id, payload, owner_id=current_user.id)


@router.delete("/{brand_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_brand(
    brand_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    brand_service.delete_brand(db, brand_id, owner_id=current_user.id)
