"""
Provider registry — maps payment_method_preference to a PaymentProvider instance.

To add a new provider:
  1. Create its class in a new module under app/billing/providers/
  2. Import it in the mapping below
  3. Add its preference key to VALID_PAYMENT_PREFERENCES
"""

from __future__ import annotations

from typing import Literal

from app.billing.providers.base import PaymentProvider

PaymentMethodPreference = Literal["card", "pix"]

VALID_PAYMENT_PREFERENCES: frozenset[str] = frozenset({"card", "pix"})


def get_provider(preference: str) -> PaymentProvider:
    """
    Returns the PaymentProvider for the given preference.

    "card" → StripeProvider (Stripe Checkout + webhooks)
    "pix"  → PixProvider    (not yet implemented — raises on use)

    Raises ValueError for unknown preferences so the router can return 400
    before hitting any payment logic.
    """
    if preference not in VALID_PAYMENT_PREFERENCES:
        raise ValueError(
            f"Método de pagamento inválido: '{preference}'. "
            f"Opções válidas: {sorted(VALID_PAYMENT_PREFERENCES)}."
        )

    if preference == "pix":
        from app.billing.providers.pix import PixProvider
        return PixProvider()

    # Default — "card" uses Stripe
    from app.billing.providers.stripe import StripeProvider
    return StripeProvider()
