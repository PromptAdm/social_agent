"""
Schemas Pydantic: ContentPillar
"""

from datetime import datetime

from pydantic import BaseModel


class ContentPillarBase(BaseModel):
    name: str
    description: str | None = None
    color_hex: str | None = None


class ContentPillarCreate(ContentPillarBase):
    brand_id: int


class ContentPillarUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    color_hex: str | None = None


class ContentPillarOut(ContentPillarBase):
    id: int
    brand_id: int
    created_at: datetime

    model_config = {"from_attributes": True}
