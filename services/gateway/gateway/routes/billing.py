"""Billing routes — Stripe-backed billing operations."""

from __future__ import annotations

import structlog
from fastapi import APIRouter, Depends, Query, Request

from gateway.auth import TokenPayload, get_current_user, require_permission
from gateway.errors import UpstreamError, ValidationError
from gateway.schemas.billing import (
    CustomerCreate,
    CustomerResponse,
    MarginCalculationRequest,
    MarginCalculationResponse,
    MeteredPriceCreate,
    MeteredPriceResponse,
    PaymentMethodAttach,
    PaymentMethodResponse,
    SetupIntentResponse,
    SubscriptionCreate,
    SubscriptionResponse,
    SubscriptionUpdate,
    TestChargeRequest,
    TestChargeResponse,
    UsageRecordCreate,
    UsageRecordResponse,
    InvoiceResponse,
)
from gateway.schemas.common import PaginatedResponse
from gateway.stripe_service import compute_margin, get_stripe_service

logger = structlog.get_logger()

router = APIRouter(prefix="/api/v1/billing", tags=["billing"])


# ---------------------------------------------------------------------------
# POST /api/v1/billing/customers — Create Stripe customer
# ---------------------------------------------------------------------------

@router.post("/customers", response_model=CustomerResponse, status_code=201)
async def create_customer(
    body: CustomerCreate,
    user: TokenPayload = Depends(require_permission("billing:write")),
) -> CustomerResponse:
    """Create a Stripe customer."""
    svc = get_stripe_service()
    try:
        result = await svc.create_customer(body.email, body.name, body.metadata)
        return CustomerResponse(**result)
    except Exception as exc:
        logger.error("stripe_create_customer_failed", error=str(exc))
        raise UpstreamError("Failed to create Stripe customer.") from exc


# ---------------------------------------------------------------------------
# GET /api/v1/billing/customers/{id} — Get customer
# ---------------------------------------------------------------------------

@router.get("/customers/{customer_id}", response_model=CustomerResponse)
async def get_customer(
    customer_id: str,
    user: TokenPayload = Depends(require_permission("billing:read")),
) -> CustomerResponse:
    """Retrieve a Stripe customer."""
    svc = get_stripe_service()
    result = await svc.retrieve_customer(customer_id)
    return CustomerResponse(**result)


# ---------------------------------------------------------------------------
# POST /api/v1/billing/setup-intent — Create SetupIntent
# ---------------------------------------------------------------------------

@router.post("/setup-intent", response_model=SetupIntentResponse)
async def create_setup_intent(
    customer_id: str = Query(...),
    user: TokenPayload = Depends(require_permission("billing:write")),
) -> SetupIntentResponse:
    """Create a SetupIntent for collecting payment details."""
    svc = get_stripe_service()
    result = await svc.create_setup_intent(customer_id)
    return SetupIntentResponse(**result)


# ---------------------------------------------------------------------------
# POST /api/v1/billing/payment-methods/attach — Attach payment method
# ---------------------------------------------------------------------------

@router.post("/payment-methods/attach", response_model=PaymentMethodResponse)
async def attach_payment_method(
    body: PaymentMethodAttach,
    user: TokenPayload = Depends(require_permission("billing:write")),
) -> PaymentMethodResponse:
    """Attach a payment method to a customer."""
    svc = get_stripe_service()
    result = await svc.attach_payment_method(body.payment_method_id, body.customer_id)
    return PaymentMethodResponse(**result)


# ---------------------------------------------------------------------------
# GET /api/v1/billing/payment-methods — List methods
# ---------------------------------------------------------------------------

@router.get("/payment-methods", response_model=list[PaymentMethodResponse])
async def list_payment_methods(
    customer_id: str = Query(...),
    user: TokenPayload = Depends(require_permission("billing:read")),
) -> list[PaymentMethodResponse]:
    """List payment methods for a customer."""
    svc = get_stripe_service()
    results = await svc.list_payment_methods(customer_id)
    return [PaymentMethodResponse(**pm) for pm in results]


# ---------------------------------------------------------------------------
# POST /api/v1/billing/subscriptions — Create subscription
# ---------------------------------------------------------------------------

@router.post("/subscriptions", response_model=SubscriptionResponse, status_code=201)
async def create_subscription(
    body: SubscriptionCreate,
    user: TokenPayload = Depends(require_permission("billing:write")),
) -> SubscriptionResponse:
    """Create a subscription."""
    svc = get_stripe_service()
    result = await svc.create_subscription(body.customer_id, body.price_id)
    return SubscriptionResponse(**result)


# ---------------------------------------------------------------------------
# PATCH /api/v1/billing/subscriptions/{id} — Update
# ---------------------------------------------------------------------------

@router.patch("/subscriptions/{subscription_id}", response_model=SubscriptionResponse)
async def update_subscription(
    subscription_id: str,
    body: SubscriptionUpdate,
    user: TokenPayload = Depends(require_permission("billing:write")),
) -> SubscriptionResponse:
    """Update a subscription."""
    svc = get_stripe_service()
    update_data = body.model_dump(exclude_unset=True)
    result = await svc.update_subscription(subscription_id, **update_data)
    return SubscriptionResponse(**result)


# ---------------------------------------------------------------------------
# DELETE /api/v1/billing/subscriptions/{id} — Cancel
# ---------------------------------------------------------------------------

@router.delete("/subscriptions/{subscription_id}", response_model=SubscriptionResponse)
async def cancel_subscription(
    subscription_id: str,
    user: TokenPayload = Depends(require_permission("billing:write")),
) -> SubscriptionResponse:
    """Cancel a subscription."""
    svc = get_stripe_service()
    result = await svc.cancel_subscription(subscription_id)
    return SubscriptionResponse(**result)


# ---------------------------------------------------------------------------
# POST /api/v1/billing/usage-records — Report metered usage
# ---------------------------------------------------------------------------

@router.post("/usage-records", response_model=UsageRecordResponse, status_code=201)
async def create_usage_record(
    body: UsageRecordCreate,
    user: TokenPayload = Depends(require_permission("billing:write")),
) -> UsageRecordResponse:
    """Report metered usage."""
    svc = get_stripe_service()
    result = await svc.create_usage_record(
        body.subscription_item_id, body.quantity, body.timestamp,
    )
    return UsageRecordResponse(**result)


# ---------------------------------------------------------------------------
# GET /api/v1/billing/invoices — List invoices
# ---------------------------------------------------------------------------

@router.get("/invoices", response_model=list[InvoiceResponse])
async def list_invoices(
    customer_id: str = Query(...),
    limit: int = Query(default=10, ge=1, le=100),
    user: TokenPayload = Depends(require_permission("billing:read")),
) -> list[InvoiceResponse]:
    """List invoices for a customer."""
    svc = get_stripe_service()
    results = await svc.list_invoices(customer_id, limit)
    return [InvoiceResponse(**inv) for inv in results]


# ---------------------------------------------------------------------------
# GET /api/v1/billing/invoices/{id} — Get invoice
# ---------------------------------------------------------------------------

@router.get("/invoices/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(
    invoice_id: str,
    user: TokenPayload = Depends(require_permission("billing:read")),
) -> InvoiceResponse:
    """Retrieve an invoice."""
    svc = get_stripe_service()
    result = await svc.retrieve_invoice(invoice_id)
    return InvoiceResponse(**result)


# ---------------------------------------------------------------------------
# POST /api/v1/billing/test-charge — Verify card
# ---------------------------------------------------------------------------

@router.post("/test-charge", response_model=TestChargeResponse)
async def test_charge(
    body: TestChargeRequest,
    user: TokenPayload = Depends(require_permission("billing:write")),
) -> TestChargeResponse:
    """Run a $0.01 test charge to verify card."""
    svc = get_stripe_service()
    result = await svc.run_test_charge(body.customer_id)
    return TestChargeResponse(**result)


# ---------------------------------------------------------------------------
# POST /api/v1/billing/prices/metered — Create metered price
# ---------------------------------------------------------------------------

@router.post("/prices/metered", response_model=MeteredPriceResponse, status_code=201)
async def create_metered_price(
    body: MeteredPriceCreate,
    user: TokenPayload = Depends(require_permission("billing:write")),
) -> MeteredPriceResponse:
    """Create a metered Stripe Price for per-agent-decision billing.

    Sets up usage_type=metered so customers are billed based on reported
    usage records (one record per agent decision batch).
    """
    svc = get_stripe_service()
    try:
        result = await svc.create_metered_price(
            unit_amount=body.unit_amount,
            currency=body.currency,
            nickname=body.nickname,
            product_id=body.product_id,
        )
        return MeteredPriceResponse(**result)
    except Exception as exc:
        logger.error("stripe_create_metered_price_failed", error=str(exc))
        raise UpstreamError("Failed to create metered price.") from exc


# ---------------------------------------------------------------------------
# POST /api/v1/billing/margin-calculator — Compute margin
# ---------------------------------------------------------------------------

@router.post("/margin-calculator", response_model=MarginCalculationResponse)
async def calculate_margin(
    body: MarginCalculationRequest,
    user: TokenPayload = Depends(require_permission("billing:read")),
) -> MarginCalculationResponse:
    """Compute margin target and customer price."""
    result = compute_margin(body.monthly_cost)
    return MarginCalculationResponse(**result)


# ---------------------------------------------------------------------------
# POST /api/v1/billing/webhook — Stripe webhook receiver
# ---------------------------------------------------------------------------

@router.post("/webhook", status_code=200)
async def stripe_webhook(request: Request) -> dict[str, str]:
    """Receive and process Stripe webhook events.

    Validates the Stripe-Signature header (HMAC-SHA256).
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    svc = get_stripe_service()
    try:
        event = await svc.construct_webhook_event(payload, sig_header)
    except Exception as exc:
        logger.error("stripe_webhook_validation_failed", error=str(exc))
        raise ValidationError("Invalid webhook signature.") from exc

    event_type = event.get("type", "unknown")
    logger.info("stripe_webhook_received", event_type=event_type, event_id=event.get("id"))

    # Handle specific event types
    if event_type == "invoice.payment_succeeded":
        logger.info("invoice_payment_succeeded", data=event.get("data"))
    elif event_type == "customer.subscription.updated":
        logger.info("subscription_updated", data=event.get("data"))
    elif event_type == "customer.subscription.deleted":
        logger.info("subscription_deleted", data=event.get("data"))

    return {"status": "received"}
