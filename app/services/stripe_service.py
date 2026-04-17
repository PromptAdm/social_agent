"""
Stripe Service — placeholder para integração futura de cobrança.

Estado atual: INATIVO
    Nenhuma chamada real ao Stripe é feita.
    Todas as funções retornam None ou levantam NotImplementedError
    de forma controlada e documentada.

Como ativar:
    1. pip install stripe
    2. Adicionar em requirements.txt: stripe>=7.0.0
    3. Configurar no .env:
           STRIPE_ENABLED=true
           STRIPE_SECRET_KEY=sk_live_...
           STRIPE_WEBHOOK_SECRET=whsec_...
    4. Implementar as funções marcadas com TODO abaixo.

Stripe Price IDs (configurar quando ativar):
    Cada plano precisa de um Price ID no Stripe Dashboard.
    Formato: price_xxxxxxxxxxxxxxxxxxxx
    Preencher em .env:
        STRIPE_PRICE_STARTER_MONTHLY=
        STRIPE_PRICE_STARTER_YEARLY=
        STRIPE_PRICE_PROFESSIONAL_MONTHLY=
        STRIPE_PRICE_PROFESSIONAL_YEARLY=
        STRIPE_PRICE_PREMIUM_MONTHLY=
        STRIPE_PRICE_PREMIUM_YEARLY=

Segurança:
    - Nunca logar STRIPE_SECRET_KEY (coberto pelo SensitiveDataFilter)
    - Sempre verificar X-Stripe-Signature no webhook
    - Usar idempotency keys em chamadas de criação
"""

from __future__ import annotations

import logging

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class StripeNotConfiguredError(Exception):
    """Levantada quando Stripe é chamado mas STRIPE_ENABLED=false."""


def _require_stripe():
    """Guard — levanta erro claro se Stripe não estiver ativado."""
    if not settings.STRIPE_ENABLED:
        raise StripeNotConfiguredError(
            "Stripe não está ativado. "
            "Configure STRIPE_ENABLED=true e STRIPE_SECRET_KEY no .env."
        )
    try:
        import stripe  # noqa: F401
    except ImportError as exc:
        raise StripeNotConfiguredError(
            "Pacote 'stripe' não instalado. Execute: pip install stripe>=7.0.0"
        ) from exc


# ── Customer ──────────────────────────────────────────────────────────────────

def create_customer(user_id: int, email: str) -> str | None:
    """
    Cria um Customer no Stripe e retorna o stripe_customer_id.
    TODO: implementar quando STRIPE_ENABLED=true.
    """
    if not settings.STRIPE_ENABLED:
        logger.debug("create_customer ignorado (STRIPE_ENABLED=false)")
        return None

    _require_stripe()
    # TODO: implementar
    # import stripe
    # customer = stripe.Customer.create(email=email, metadata={"user_id": str(user_id)})
    # return customer.id
    raise NotImplementedError("create_customer: implementar antes de ativar Stripe")


# ── Checkout Session ──────────────────────────────────────────────────────────

def create_checkout_session(
    user_id: int,
    plan_code: str,
    billing_cycle: str,          # "monthly" | "yearly"
    success_url: str,
    cancel_url: str,
    stripe_customer_id: str | None = None,
) -> str | None:
    """
    Cria uma Checkout Session e retorna a URL de redirecionamento.
    TODO: implementar quando STRIPE_ENABLED=true.
    """
    if not settings.STRIPE_ENABLED:
        logger.debug("create_checkout_session ignorado (STRIPE_ENABLED=false)")
        return None

    _require_stripe()
    # TODO: implementar
    # price_id = _resolve_price_id(plan_code, billing_cycle)
    # session = stripe.checkout.Session.create(
    #     customer=stripe_customer_id,
    #     mode="subscription",
    #     line_items=[{"price": price_id, "quantity": 1}],
    #     success_url=success_url,
    #     cancel_url=cancel_url,
    #     metadata={"user_id": str(user_id), "plan_code": plan_code},
    # )
    # return session.url
    raise NotImplementedError("create_checkout_session: implementar antes de ativar Stripe")


# ── Portal de cliente ─────────────────────────────────────────────────────────

def create_portal_session(
    stripe_customer_id: str,
    return_url: str,
) -> str | None:
    """
    Cria uma sessão do Customer Portal (gerenciar assinatura, cancelar, etc.).
    TODO: implementar quando STRIPE_ENABLED=true.
    """
    if not settings.STRIPE_ENABLED:
        logger.debug("create_portal_session ignorado (STRIPE_ENABLED=false)")
        return None

    _require_stripe()
    # TODO: implementar
    raise NotImplementedError("create_portal_session: implementar antes de ativar Stripe")


# ── Webhook ───────────────────────────────────────────────────────────────────

def handle_webhook(payload: bytes, stripe_signature: str) -> dict:
    """
    Valida e processa eventos do webhook Stripe.

    Eventos importantes a tratar:
        checkout.session.completed    → ativar assinatura
        customer.subscription.updated → atualizar plano
        customer.subscription.deleted → cancelar assinatura
        invoice.payment_failed        → marcar status=past_due

    TODO: implementar quando STRIPE_ENABLED=true.
    """
    if not settings.STRIPE_ENABLED:
        return {"ignored": True, "reason": "STRIPE_ENABLED=false"}

    _require_stripe()
    # TODO: implementar
    # import stripe
    # event = stripe.Webhook.construct_event(
    #     payload, stripe_signature, settings.STRIPE_WEBHOOK_SECRET
    # )
    # _dispatch_event(event)
    # return {"received": True}
    raise NotImplementedError("handle_webhook: implementar antes de ativar Stripe")


# ── Helper interno ────────────────────────────────────────────────────────────

def _resolve_price_id(plan_code: str, billing_cycle: str) -> str:
    """
    Mapeia (plan_code, billing_cycle) → Stripe Price ID.
    TODO: ler de settings quando IDs estiverem configurados.
    """
    # Exemplo:
    # price_map = {
    #     ("starter",      "monthly"): settings.STRIPE_PRICE_STARTER_MONTHLY,
    #     ("starter",      "yearly"):  settings.STRIPE_PRICE_STARTER_YEARLY,
    #     ("professional", "monthly"): settings.STRIPE_PRICE_PROFESSIONAL_MONTHLY,
    #     ("professional", "yearly"):  settings.STRIPE_PRICE_PROFESSIONAL_YEARLY,
    #     ("premium",      "monthly"): settings.STRIPE_PRICE_PREMIUM_MONTHLY,
    #     ("premium",      "yearly"):  settings.STRIPE_PRICE_PREMIUM_YEARLY,
    # }
    # price_id = price_map.get((plan_code, billing_cycle))
    # if not price_id:
    #     raise ValueError(f"Price ID não configurado: {plan_code}/{billing_cycle}")
    # return price_id
    raise NotImplementedError("_resolve_price_id: configurar Stripe Price IDs no .env")
