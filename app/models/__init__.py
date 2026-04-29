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
from app.models.scheduler_execution import SchedulerExecution, SchedulerLock, SchedulerPostAttempt
from app.models.subscription import UserSubscription
from app.models.credits import UserCredit, CreditLog
from app.models.projects import ImageProject, VideoProject, GenerationResult
from app.models.connected_account import ConnectedAccount
from app.models.social_connection import SocialConnection
from app.models.stripe_event import StripeWebhookEvent
from app.models.admin_audit_log import AdminAuditLog
from app.models.feature_override import FeatureOverride

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
    "SchedulerExecution",
    "SchedulerLock",
    "SchedulerPostAttempt",
    "UserSubscription",
    "UserCredit",
    "CreditLog",
    "ImageProject",
    "VideoProject",
    "GenerationResult",
    "ConnectedAccount",
    "SocialConnection",
    "StripeWebhookEvent",
    "AdminAuditLog",
    "FeatureOverride",
]
