"""
Schemas Pydantic: Lead
"""

from datetime import datetime

from pydantic import BaseModel

from app.models.lead import LeadSource, LeadStatus


class LeadBase(BaseModel):
    username: str | None = None
    full_name: str | None = None
    email: str | None = None
    phone: str | None = None
    platform: str | None = None
    source: LeadSource = LeadSource.MANUAL
    notes: str | None = None


class LeadCreate(LeadBase):
    brand_id: int
    external_user_id: str | None = None


class LeadUpdate(BaseModel):
    full_name: str | None = None
    email: str | None = None
    phone: str | None = None
    status: LeadStatus | None = None
    notes: str | None = None


class LeadOut(LeadBase):
    id: int
    brand_id: int
    status: LeadStatus
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
