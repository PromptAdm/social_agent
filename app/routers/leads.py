"""
Router: Leads — Módulo 7: Gestão de Leads
Prefixo: /api/v1/leads

Endpoints:
    POST   /leads/                  — registrar lead
    GET    /leads/brand/{brand_id}  — listar com filtros
    GET    /leads/{lead_id}         — detalhar lead
    PATCH  /leads/{lead_id}         — atualizar lead
    DELETE /leads/{lead_id}         — remover lead

Filtros disponíveis em GET /leads/brand/{brand_id}:
    ?lead_status=novo|contatado|qualificado|convertido|perdido
    ?source=comentario|mensagem_direta|mencao|resposta_story|manual
    ?created_from=<ISO 8601>
    ?created_to=<ISO 8601>
"""

from datetime import datetime

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_active_user, get_db
from app.models.lead import LeadSource, LeadStatus
from app.models.user import User
from app.schemas.lead import LeadCreate, LeadOut, LeadUpdate
from app.services import lead_service

router = APIRouter(prefix="/leads", tags=["Leads"])


@router.post(
    "/",
    response_model=LeadOut,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar lead",
)
def create_lead(
    payload: LeadCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return lead_service.create_lead(db, payload, user_id=current_user.id)


@router.get(
    "/brand/{brand_id}",
    response_model=list[LeadOut],
    summary="Listar leads da brand",
    description=(
        "Retorna leads da brand. "
        "Filtre por `lead_status`, `source` e/ou intervalo de data de criação."
    ),
)
def list_leads(
    brand_id: int,
    lead_status: LeadStatus | None = None,
    source: LeadSource | None = None,
    created_from: datetime | None = None,
    created_to: datetime | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return lead_service.list_leads(
        db,
        brand_id=brand_id,
        user_id=current_user.id,
        lead_status=lead_status,
        source=source,
        created_from=created_from,
        created_to=created_to,
        limit=limit,
        offset=offset,
    )


@router.get("/{lead_id}", response_model=LeadOut, summary="Detalhar lead")
def get_lead(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return lead_service.get_lead(db, lead_id, user_id=current_user.id)


@router.patch("/{lead_id}", response_model=LeadOut, summary="Atualizar lead")
def update_lead(
    lead_id: int,
    payload: LeadUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return lead_service.update_lead(db, lead_id, payload, user_id=current_user.id)


@router.delete("/{lead_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Remover lead")
def delete_lead(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    lead_service.delete_lead(db, lead_id, user_id=current_user.id)
