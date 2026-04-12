"""
Schemas Pydantic: MediaAsset
"""

from datetime import datetime

from pydantic import BaseModel

from app.models.media_asset import AssetType


class MediaAssetBase(BaseModel):
    url: str
    asset_type: AssetType
    filename: str | None = None
    size_bytes: int | None = None
    mime_type: str | None = None
    order: int = 0


class MediaAssetCreate(MediaAssetBase):
    post_id: int


class MediaAssetOut(MediaAssetBase):
    id: int
    post_id: int
    created_at: datetime

    model_config = {"from_attributes": True}
