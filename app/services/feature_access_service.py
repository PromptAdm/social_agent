"""
FeatureAccessService — verificação de acesso a features por plano.

Ponto único para "o usuário pode usar X?".
Importado apenas por routers que precisam de feature gating.
Não é acoplado a auth, não altera state.

Features disponíveis:
    scheduling       — agendamento de posts
    analytics        — relatórios e analytics avançados
    approval         — fluxo de aprovação de conteúdo
    priority_support — suporte prioritário

Regras:
    1. Quando MONETIZATION_ENABLED=false → sempre True (no-op)
    2. Plano "legacy" → sempre True em tudo
    3. Erro interno de billing → sempre True (nunca bloqueia por bug)
"""

from __future__ import annotations

import logging

from sqlalchemy.orm import Session

from app.billing.plans import has_feature as _plan_has_feature
from app.billing.state_machine import get_effective_plan
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


def can_use(db: Session, user_id: int, feature: str) -> bool:
    """
    Retorna True se o usuário pode usar a feature.

    Uso nos routers:
        if not feature_access_service.can_use(db, current_user.id, "analytics"):
            raise HTTPException(402, "Analytics disponível a partir do plano Professional.")
    """
    if not settings.MONETIZATION_ENABLED:
        return True

    try:
        # 1. Check per-user feature override (super admin grant/revoke)
        from app.models.feature_override import FeatureOverride
        from datetime import datetime, timezone
        override = (
            db.query(FeatureOverride)
            .filter(
                FeatureOverride.user_id == user_id,
                FeatureOverride.feature == feature,
            )
            .first()
        )
        if override is not None:
            active = override.enabled and (
                override.expires_at is None
                or datetime.now(timezone.utc) < override.expires_at
            )
            logger.info(
                "feature_access_service.can_use: user=%s feature=%s → override=%s (enabled=%s)",
                user_id, feature, active, override.enabled,
            )
            return active

        # 2. Fall back to plan-based check
        from app.services.subscription_service import get_or_create, _flush_expired_trial
        sub = get_or_create(db, user_id)
        _flush_expired_trial(db, sub)
        effective = get_effective_plan(sub)
        return _plan_has_feature(effective, feature)
    except Exception as exc:
        logger.warning("feature_access_service.can_use falhou: user=%s feature=%s err=%s",
                       user_id, feature, exc)
        return True  # fail-open: nunca bloqueia por erro de billing


def require_feature(db: Session, user_id: int, feature: str, plan_hint: str = "Professional") -> None:
    """
    Lança HTTPException(402) se o usuário não tem acesso à feature.

    Uso:
        require_feature(db, user.id, "analytics")

    :param plan_hint: nome do plano mínimo para mostrar na mensagem de erro.
    """
    if not can_use(db, user_id, feature):
        from fastapi import HTTPException
        feature_labels = {
            "analytics":        "Analytics avançado",
            "approval":         "Fluxo de aprovação",
            "scheduling":       "Agendamento de posts",
            "priority_support": "Suporte prioritário",
        }
        label = feature_labels.get(feature, feature)
        raise HTTPException(
            status_code=402,
            detail=(
                f"{label} está disponível a partir do plano {plan_hint}. "
                f"Faça upgrade para desbloquear."
            ),
        )
