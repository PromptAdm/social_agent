"""
Service: Lead — Módulo 7: Gestão de Leads

Funções:
    create_lead  — registra novo lead
    list_leads   — lista com filtros (status, source, data de criação)
    get_lead     — busca por id com ownership check
    update_lead  — atualiza campos
    delete_lead  — remove da base
"""

from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.brand import Brand
from app.models.lead import Lead, LeadSource, LeadStatus
from app.schemas.lead import LeadCreate, LeadUpdate


# ── Helpers ────────────────────────────────────────────────────────────────────

def _assert_brand_ownership(db: Session, brand_id: int, user_id: int) -> None:
    brand = db.query(Brand).filter(Brand.id == brand_id, Brand.owner_id == user_id).first()
    if not brand:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Brand não encontrada.")


# ── CRUD ───────────────────────────────────────────────────────────────────────

def create_lead(db: Session, payload: LeadCreate, user_id: int) -> Lead:
    _assert_brand_ownership(db, payload.brand_id, user_id)
    lead = Lead(**payload.model_dump())
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead


def list_leads(
    db: Session,
    brand_id: int,
    user_id: int,
    *,
    lead_status: LeadStatus | None = None,
    source: LeadSource | None = None,
    created_from: datetime | None = None,
    created_to: datetime | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[Lead]:
    _assert_brand_ownership(db, brand_id, user_id)
    query = db.query(Lead).filter(Lead.brand_id == brand_id)
    if lead_status is not None:
        query = query.filter(Lead.status == lead_status)
    if source is not None:
        query = query.filter(Lead.source == source)
    if created_from is not None:
        query = query.filter(Lead.created_at >= created_from)
    if created_to is not None:
        query = query.filter(Lead.created_at <= created_to)
    return query.order_by(Lead.created_at.desc()).offset(offset).limit(limit).all()


def get_lead(db: Session, lead_id: int, user_id: int) -> Lead:
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead não encontrado.")
    _assert_brand_ownership(db, lead.brand_id, user_id)
    return lead


def update_lead(db: Session, lead_id: int, payload: LeadUpdate, user_id: int) -> Lead:
    lead = get_lead(db, lead_id, user_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(lead, field, value)
    db.commit()
    db.refresh(lead)
    return lead


def delete_lead(db: Session, lead_id: int, user_id: int) -> None:
    lead = get_lead(db, lead_id, user_id)
    db.delete(lead)
    db.commit()
