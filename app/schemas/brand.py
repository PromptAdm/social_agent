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
    posting_frequency: str | None = None
    cta_default: str | None = None


class BrandCreate(BrandBase):
    pass


class BrandUpdate(BaseModel):
    name: str | None = None
    niche: str | None = None
    description: str | None = None
    tone_of_voice: str | None = None
    target_audience: str | None = None
    logo_url: str | None = None
    posting_frequency: str | None = None
    cta_default: str | None = None


class BrandOut(BrandBase):
    id: int
    owner_id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Config endpoint (painel web) ───────────────────────────────────────────────

class BrandConfigUpdate(BaseModel):
    """
    Campos de configuração editorial da brand.
    Todos opcionais — somente os campos enviados são atualizados.
    """
    niche: str | None = None
    tone_of_voice: str | None = None
    target_audience: str | None = None
    posting_frequency: str | None = None
    cta_default: str | None = None


class BrandConfigOut(BaseModel):
    """Configuração editorial retornada pelo endpoint /brands/{id}/config."""
    brand_id: int
    brand_name: str
    niche: str | None
    tone_of_voice: str | None
    target_audience: str | None
    posting_frequency: str | None
    cta_default: str | None
    updated_at: datetime

    model_config = {"from_attributes": True}
