"""
Service: ContentPillar — Módulo 1: Estratégia da Marca
Gestão dos pilares editoriais de uma brand.
"""

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.brand import Brand
from app.models.content_pillar import ContentPillar
from app.schemas.content_pillar import ContentPillarCreate, ContentPillarUpdate


def _assert_brand_ownership(db: Session, brand_id: int, user_id: int) -> None:
    brand = db.query(Brand).filter(Brand.id == brand_id, Brand.owner_id == user_id).first()
    if not brand:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Brand não encontrada.")


def create_pillar(db: Session, payload: ContentPillarCreate, user_id: int) -> ContentPillar:
    _assert_brand_ownership(db, payload.brand_id, user_id)
    pillar = ContentPillar(**payload.model_dump())
    db.add(pillar)
    db.commit()
    db.refresh(pillar)
    return pillar


def list_pillars(db: Session, brand_id: int, user_id: int) -> list[ContentPillar]:
    _assert_brand_ownership(db, brand_id, user_id)
    return db.query(ContentPillar).filter(ContentPillar.brand_id == brand_id).all()


def update_pillar(db: Session, pillar_id: int, payload: ContentPillarUpdate, user_id: int) -> ContentPillar:
    pillar = db.query(ContentPillar).filter(ContentPillar.id == pillar_id).first()
    if not pillar:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pilar não encontrado.")
    _assert_brand_ownership(db, pillar.brand_id, user_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(pillar, field, value)
    db.commit()
    db.refresh(pillar)
    return pillar


def delete_pillar(db: Session, pillar_id: int, user_id: int) -> None:
    pillar = db.query(ContentPillar).filter(ContentPillar.id == pillar_id).first()
    if not pillar:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pilar não encontrado.")
    _assert_brand_ownership(db, pillar.brand_id, user_id)
    db.delete(pillar)
    db.commit()
