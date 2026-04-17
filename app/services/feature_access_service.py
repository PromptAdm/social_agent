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
        from app.services.subscription_service import get_or_create
        sub = get_or_create(db, user_id)
        return _plan_has_feature(sub.plan_code, feature)
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
