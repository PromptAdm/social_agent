"""
Router: Billing — plan summary, usage, plan list, Stripe checkout, and webhooks.

Endpoints:
    GET  /billing/summary                — current plan + usage + limits + features
    GET  /billing/status                 — lightweight resolved billing state
    GET  /billing/plans                  — list public plans (with is_current)
    GET  /billing/usage                  — current usage only
    POST /billing/trial/start            — activate 7-day Professional trial
    POST /billing/create-checkout-session — create Stripe Checkout and return URL
    POST /billing/portal                 — Stripe Customer Portal session URL
    POST /billing/webhook                — Stripe webhook receiver (no auth)
"""

import logging

import stripe
from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.dependencies import get_current_active_user, get_db
from app.models.user import User
from app.schemas.billing import (
    BillingStatus,
    BillingSummary,
    CheckoutRequest,
    CheckoutResponse,
    CreditPackage,
    CreditsBalanceResponse,
    CreditsCheckoutRequest,
    CreditsCheckoutResponse,
    PlanDetail,
    PortalResponse,
    TrialStartResponse,
    UsageSet,
)
from app.services import payment_provider_service, subscription_service

logger   = logging.getLogger(__name__)
settings = get_settings()
router   = APIRouter(prefix="/billing", tags=["Billing"])


# ── Read-only endpoints ────────────────────────────────────────────────────────

@router.get("/summary", response_model=BillingSummary, summary="Plano atual, uso, limites e features")
def get_billing_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> BillingSummary:
    return subscription_service.get_billing_summary(db, current_user.id)


@router.get(
    "/status",
    response_model=BillingStatus,
    summary="Estado de billing resolvido (leve)",
)
def get_billing_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> BillingStatus:
    """
    Lightweight endpoint that returns the resolved billing state without the
    full plan comparison table.  Use this for sidebar badges, post-limit
    warnings, and other frequent reads.

    Returns the *effective* plan (what limits actually apply), not just what
    is stored in the DB.
    """
    bs = subscription_service.get_user_billing_status_svc(db, current_user.id)
    return BillingStatus(
        plan            = bs.plan,
        plan_code       = bs.plan_code,
        status          = bs.status,
        remaining_posts = bs.remaining_posts,
        trial_days_left = bs.trial_days_left,
    )


@router.get("/plans", response_model=list[PlanDetail], summary="Lista os planos disponíveis")
def list_plans(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> list[PlanDetail]:
    summary = subscription_service.get_billing_summary(db, current_user.id)
    return subscription_service.list_public_plans(summary.effective_plan_code)


@router.get("/usage", response_model=UsageSet, summary="Uso atual de recursos")
def get_usage(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> UsageSet:
    usage = subscription_service.get_usage(db, current_user.id)
    return UsageSet(
        brands=usage["brands"],
        posts_per_month=usage["posts_per_month"],
    )


# ── Trial ──────────────────────────────────────────────────────────────────────

@router.post(
    "/trial/start",
    response_model=TrialStartResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Ativa o trial de 7 dias (Professional)",
)
def start_trial(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> TrialStartResponse:
    """Each user may activate the 7-day trial once. Returns 409 if already used."""
    try:
        sub = subscription_service.start_trial(db, current_user.id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    return TrialStartResponse(
        trial_started_at=sub.trial_started_at,
        trial_ends_at=sub.trial_ends_at,
        plan_code=sub.plan_code,
        status=sub.status,
    )


# ── Stripe Checkout ────────────────────────────────────────────────────────────

@router.post(
    "/create-checkout-session",
    response_model=CheckoutResponse,
    summary="Cria sessão Stripe Checkout e retorna a URL",
)
def create_checkout_session(
    body: CheckoutRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> CheckoutResponse:
    """
    Creates a Stripe Checkout Session for the given plan + billing cycle.
    Returns `{"checkout_url": "https://checkout.stripe.com/..."}`.
    Returns 503 when STRIPE_ENABLED=false.
    """
    if not settings.STRIPE_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Pagamentos ainda não estão disponíveis. Entre em contato com o suporte.",
        )

    try:
        url = payment_provider_service.create_checkout(
            user_id=current_user.id,
            email=current_user.email,
            plan_code=body.plan_code,
            billing_cycle=body.billing_cycle,
            payment_method_preference=body.payment_method_preference,
            db=db,
        )
    except (ValueError, NotImplementedError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception:
        logger.exception("[billing] create_checkout failed user=%s", current_user.id)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Erro ao criar sessão de pagamento. Tente novamente.",
        )

    return CheckoutResponse(checkout_url=url)


# ── Customer Portal ────────────────────────────────────────────────────────────

@router.post(
    "/portal",
    response_model=PortalResponse,
    summary="Cria sessão do Customer Portal Stripe",
)
def create_portal_session(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> PortalResponse:
    """Opens the Stripe Customer Portal for subscription management."""
    if not settings.STRIPE_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Portal de faturamento não disponível.",
        )

    sub = subscription_service.get_or_create(db, current_user.id)
    if not sub.stripe_customer_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nenhuma assinatura Stripe encontrada para este usuário.",
        )

    try:
        url = payment_provider_service.create_portal_session(
            sub.stripe_customer_id,
            provider_name="card",
        )
    except NotImplementedError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception:
        logger.exception("[billing] create_portal_session failed user=%s", current_user.id)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Erro ao abrir portal de faturamento.",
        )

    return PortalResponse(portal_url=url)


# ── Credits ────────────────────────────────────────────────────────────────────

@router.get(
    "/credits",
    response_model=CreditsBalanceResponse,
    summary="Saldo de créditos e pacotes disponíveis",
)
def get_credits(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> CreditsBalanceResponse:
    from app.billing.credit_packages import list_packages
    from app.services.credits_service import get_or_create

    row      = get_or_create(db, current_user.id)
    packages = [CreditPackage(**pkg) for pkg in list_packages()]

    return CreditsBalanceResponse(
        balance         = row.balance,
        lifetime_earned = row.lifetime_earned,
        packages        = packages,
    )


@router.post(
    "/credits/checkout",
    response_model=CreditsCheckoutResponse,
    summary="Cria sessão de pagamento avulso para comprar créditos",
)
def create_credits_checkout(
    body: CreditsCheckoutRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> CreditsCheckoutResponse:
    """
    Creates a one-time Stripe Checkout for the requested credit package.
    Returns `{"checkout_url": "https://checkout.stripe.com/..."}`.
    Returns 503 when STRIPE_ENABLED=false.
    """
    if not settings.STRIPE_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Pagamentos ainda não estão disponíveis. Entre em contato com o suporte.",
        )

    from app.billing.credit_packages import get_package
    try:
        get_package(body.package_code)
    except KeyError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Pacote de créditos inválido: {body.package_code!r}. "
                   "Use: credits_100, credits_500 ou credits_1000.",
        )

    try:
        from app.services.stripe_service import create_credits_checkout_session
        url = create_credits_checkout_session(
            user_id=current_user.id,
            email=current_user.email,
            package_code=body.package_code,
            db=db,
        )
    except (ValueError, KeyError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception:
        logger.exception("[billing] create_credits_checkout failed user=%s", current_user.id)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Erro ao criar sessão de pagamento. Tente novamente.",
        )

    return CreditsCheckoutResponse(checkout_url=url)


# ── Webhook ────────────────────────────────────────────────────────────────────

@router.post(
    "/webhook",
    status_code=status.HTTP_200_OK,
    include_in_schema=False,  # not exposed in Swagger — Stripe-only endpoint
)
async def stripe_webhook(
    request: Request,
    db: Session = Depends(get_db),
    stripe_signature: str = Header(None, alias="stripe-signature"),
) -> dict:
    """
    Receives and validates Stripe webhook events.
    No user auth — identity comes from the Stripe signature.
    """
    if not settings.STRIPE_ENABLED:
        logger.info("[stripe_webhook] STRIPE_ENABLED=false — ignoring event")
        return {"ignored": True}

    payload: bytes = await request.body()

    # ── DEBUG (remover após validar em produção) ───────────────────────────────
    print("WEBHOOK RECEIVED")
    print("SIGNATURE:", stripe_signature)
    print("PAYLOAD SIZE:", len(payload))
    print("STRIPE_WEBHOOK_SECRET prefix:", (settings.STRIPE_WEBHOOK_SECRET or "")[:12] or "<NOT SET>")
    # ──────────────────────────────────────────────────────────────────────────

    if not stripe_signature:
        logger.warning("[stripe_webhook] missing stripe-signature header")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing Stripe-Signature header")

    if not payload:
        logger.warning("[stripe_webhook] empty payload")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty payload")

    if not settings.STRIPE_WEBHOOK_SECRET:
        logger.error("[stripe_webhook] STRIPE_WEBHOOK_SECRET not configured")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Webhook secret not configured")

    try:
        result = payment_provider_service.handle_webhook(
            payload,
            stripe_signature,
            db,
            provider_name="card",
        )
        logger.info("[stripe_webhook] event processed successfully")
        return result
    except stripe.SignatureVerificationError as exc:
        logger.warning(
            "[stripe_webhook] signature verification failed — check STRIPE_WEBHOOK_SECRET matches 'stripe listen' output. detail=%s",
            str(exc),
        )
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Stripe signature")
    except Exception:
        logger.exception("[stripe_webhook] unhandled error")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Webhook processing error")
