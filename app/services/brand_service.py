"""
Service: Brand — Módulo 1: Estratégia da Marca
Operações CRUD sobre brands, garantindo ownership.
"""

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.brand import Brand
from app.schemas.brand import BrandConfigUpdate, BrandCreate, BrandUpdate


def _get_or_404(db: Session, brand_id: int, owner_id: int) -> Brand:
    brand = db.query(Brand).filter(Brand.id == brand_id, Brand.owner_id == owner_id).first()
    if not brand:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Brand não encontrada.")
    return brand


def create_brand(db: Session, payload: BrandCreate, owner_id: int) -> Brand:
    brand = Brand(**payload.model_dump(), owner_id=owner_id)
    db.add(brand)
    db.commit()
    db.refresh(brand)
    return brand


def list_brands(db: Session, owner_id: int) -> list[Brand]:
    return db.query(Brand).filter(Brand.owner_id == owner_id).all()


def get_brand(db: Session, brand_id: int, owner_id: int) -> Brand:
    return _get_or_404(db, brand_id, owner_id)


def update_brand(db: Session, brand_id: int, payload: BrandUpdate, owner_id: int) -> Brand:
    brand = _get_or_404(db, brand_id, owner_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(brand, field, value)
    db.commit()
    db.refresh(brand)
    return brand


def delete_brand(db: Session, brand_id: int, owner_id: int) -> None:
    brand = _get_or_404(db, brand_id, owner_id)
    db.delete(brand)
    db.commit()


def update_config(db: Session, brand_id: int, payload: BrandConfigUpdate, owner_id: int) -> Brand:
    """
    Atualiza somente os campos de configuração editorial da brand
    (nicho, tom de voz, público, frequência, CTA padrão).
    Usado pelo painel web — não altera name nem logo.
    """
    brand = _get_or_404(db, brand_id, owner_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(brand, field, value)
    db.commit()
    db.refresh(brand)
    return brand
