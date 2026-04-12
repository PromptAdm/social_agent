"""
Schemas Pydantic: AnalyticsSnapshot
"""

from datetime import datetime

from pydantic import BaseModel


class AnalyticsSnapshotBase(BaseModel):
    platform: str
    snapshot_date: datetime
    followers_count: int | None = None
    following_count: int | None = None
    posts_count: int | None = None
    impressions: int | None = None
    reach: int | None = None
    profile_views: int | None = None
    likes_total: int | None = None
    comments_total: int | None = None
    shares_total: int | None = None
    saves_total: int | None = None
    engagement_rate: float | None = None


class AnalyticsSnapshotCreate(AnalyticsSnapshotBase):
    brand_id: int


class AnalyticsSnapshotOut(AnalyticsSnapshotBase):
    id: int
    brand_id: int
    created_at: datetime

    model_config = {"from_attributes": True}
