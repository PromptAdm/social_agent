"""
PixProvider — placeholder for Pix recurring payment integration.

When implementing Pix recurring payments, replace the NotImplementedError
bodies with the actual provider SDK calls (e.g. Gerencianet/EFÍ, PagSeguro,
Asaas, or a custom PIX gateway).

Steps to complete this provider:
  1. Choose a Pix gateway that supports assinaturas / cobranças recorrentes.
  2. Add the gateway SDK to requirements.txt.
  3. Add gateway credentials to app/core/config.py and .env.
  4. Implement create_checkout: generate a QR-code / deep-link and return its URL.
  5. Implement handle_webhook: validate the gateway's signature, deduplicate via
     a provider-specific event table (or extend stripe_webhook_events with a
     provider column), then call subscription_service to update the local row.
  6. Implement sync_subscription: fetch the current subscription state from the
     gateway and write it to UserSubscription using the same field mapping that
     sync_subscription_from_stripe uses.
  7. create_portal_session: most Pix gateways have no customer portal — either
     raise NotImplementedError or build an in-app management screen.
"""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.billing.providers.base import CheckoutParams


class PixProvider:
    """Pix recurring payment provider — not yet implemented."""

    _NOT_READY = (
        "Pagamentos via Pix recorrente ainda não estão disponíveis. "
        "Entre em contato com o suporte."
    )

    def create_checkout(self, params: CheckoutParams, db: Session) -> str:
        raise NotImplementedError(self._NOT_READY)

    def handle_webhook(
        self,
        payload: bytes,
        signature: str,
        db: Session,
    ) -> dict:
        raise NotImplementedError(self._NOT_READY)

    def sync_subscription(
        self,
        provider_subscription_id: str,
        db: Session,
        *,
        customer_id: str | None = None,
        user_id: int | None = None,
    ):
        raise NotImplementedError(self._NOT_READY)

    def create_portal_session(self, customer_id: str) -> str:
        raise NotImplementedError(
            "Pix não possui portal de autoatendimento. "
            "Ofereça gestão da assinatura dentro do próprio app."
        )
