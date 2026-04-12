"""
Schemas Pydantic: Brand
"""

from datetime import datetime

from pydantic import BaseModel


class BrandBase(BaseModel):
    name: str
    niche: str | None = None
    description: str | None = None
    tone_of_voice: str | None = None
    target_audience: str | None = None
    logo_url: str | None = None


class BrandCreate(BrandBase):
    pass


class BrandUpdate(BaseModel):
    name: str | None = None
    niche: str | None = None
    description: str | None = None
    tone_of_voice: str | None = None
    target_audience: str | None = None
    logo_url: str | None = None


class BrandOut(BrandBase):
    id: int
    owner_id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
