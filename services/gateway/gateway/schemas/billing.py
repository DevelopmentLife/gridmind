"""Billing endpoint schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, EmailStr, Field


class CustomerCreate(BaseModel):
    """Create a Stripe customer."""

    email: EmailStr
    name: str = Field(min_length=1, max_length=255)
    metadata: dict[str, str] = Field(default_factory=dict)


class CustomerResponse(BaseModel):
    """Stripe customer response."""

    id: str
    email: str
    name: str
    metadata: dict[str, str] = Field(default_factory=dict)
    created: int


class SetupIntentResponse(BaseModel):
    """Stripe SetupIntent response."""

    id: str
    client_secret: str
    customer: str
    status: str


class PaymentMethodAttach(BaseModel):
    """Attach a payment method to a customer."""

    payment_method_id: str
    customer_id: str


class PaymentMethodResponse(BaseModel):
    """Payment method details."""

    id: str
    customer: str | None = None
    type: str = "card"
    card: dict[str, Any] = Field(default_factory=dict)


class SubscriptionCreate(BaseModel):
    """Create a subscription."""

    customer_id: str
    price_id: str
    metadata: dict[str, str] = Field(default_factory=dict)


class SubscriptionUpdate(BaseModel):
    """Update a subscription."""

    metadata: dict[str, str] | None = None
    cancel_at_period_end: bool | None = None


class SubscriptionResponse(BaseModel):
    """Subscription details."""

    id: str
    customer: str
    status: str
    items: dict[str, Any] = Field(default_factory=dict)
    current_period_start: int | None = None
    current_period_end: int | None = None


class UsageRecordCreate(BaseModel):
    """Report metered usage."""

    subscription_item_id: str
    quantity: int = Field(ge=0)
    timestamp: int | None = None


class UsageRecordResponse(BaseModel):
    """Usage record response."""

    id: str
    subscription_item: str
    quantity: int
    timestamp: int


class InvoiceResponse(BaseModel):
    """Invoice details."""

    id: str
    status: str
    amount_due: int = 0
    currency: str = "usd"
    customer: str | None = None


class TestChargeRequest(BaseModel):
    """Run a test charge."""

    customer_id: str


class TestChargeResponse(BaseModel):
    """Test charge result."""

    id: str
    amount: int
    currency: str
    customer: str
    status: str


class MarginCalculationRequest(BaseModel):
    """Calculate margin for a given monthly cost."""

    monthly_cost: float = Field(ge=0)


class MarginCalculationResponse(BaseModel):
    """Margin calculation result."""

    monthly_cost: float
    margin_target: float
    customer_price: float


class MeteredPriceCreate(BaseModel):
    """Create a metered Stripe Price for per-decision billing."""

    unit_amount: int = Field(ge=1, description="Price per decision in cents (e.g. 1 = $0.01)")
    currency: str = Field(default="usd", min_length=3, max_length=3)
    nickname: str | None = Field(default=None, max_length=255)
    product_id: str | None = None


class MeteredPriceResponse(BaseModel):
    """Metered Stripe Price response."""

    id: str
    object: str = "price"
    currency: str
    unit_amount: int
    billing_scheme: str
    recurring: dict[str, Any]
    nickname: str | None = None
    product: str
    active: bool
