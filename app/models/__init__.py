"""
Models ORM exportados para facilitar importação no Alembic env.py.
Todos herdam de app.core.database.Base.
"""

from app.models.user import User
from app.models.brand import Brand
from app.models.content_pillar import ContentPillar
from app.models.idea import Idea
from app.models.post import Post
from app.models.media_asset import MediaAsset
from app.models.comment import Comment
from app.models.reply_suggestion import ReplySuggestion
from app.models.lead import Lead
from app.models.analytics_snapshot import AnalyticsSnapshot
from app.models.integration_log import IntegrationLog

__all__ = [
    "User",
    "Brand",
    "ContentPillar",
    "Idea",
    "Post",
    "MediaAsset",
    "Comment",
    "ReplySuggestion",
    "Lead",
    "AnalyticsSnapshot",
    "IntegrationLog",
]
