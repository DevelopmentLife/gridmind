"""Stripe billing service with mock fallback."""

from __future__ import annotations

import math
import time
from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

import structlog

from gateway.config import get_settings

logger = structlog.get_logger()


# ---------------------------------------------------------------------------
# Margin formula
# ---------------------------------------------------------------------------

def compute_margin(monthly_cost: float) -> dict[str, float]:
    """Compute the target margin and customer price.

    Formula: margin_target = max(0.55, 0.75 - 0.035 * ln(monthly_cost / 100))
    Customer price: cost / (1 - margin_target)

    Args:
        monthly_cost: The provider cost per month in dollars.

    Returns:
        Dict with margin_target, customer_price, and monthly_cost.
    """
    if monthly_cost <= 0:
        return {"monthly_cost": 0.0, "margin_target": 0.55, "customer_price": 0.0}
    margin_target = max(0.55, 0.75 - 0.035 * math.log(monthly_cost / 100))
    customer_price = monthly_cost / (1 - margin_target)
    return {
        "monthly_cost": round(monthly_cost, 2),
        "margin_target": round(margin_target, 4),
        "customer_price": round(customer_price, 2),
    }


# ---------------------------------------------------------------------------
# Mock Stripe service
# ---------------------------------------------------------------------------

class MockStripeService:
    """Fixture-based Stripe mock for development without API keys."""

    def __init__(self) -> None:
        self._customers: dict[str, dict[str, Any]] = {}
        self._subscriptions: dict[str, dict[str, Any]] = {}
        self._payment_methods: dict[str, list[dict[str, Any]]] = {}
        self._invoices: dict[str, dict[str, Any]] = {}
        logger.info("mock_stripe_service_initialized")

    async def create_customer(self, email: str, name: str, metadata: dict[str, str] | None = None) -> dict[str, Any]:
        """Create a mock Stripe customer."""
        cid = f"cus_mock_{uuid4().hex[:12]}"
        customer = {
            "id": cid,
            "email": email,
            "name": name,
            "metadata": metadata or {},
            "created": int(time.time()),
        }
        self._customers[cid] = customer
        return customer

    async def retrieve_customer(self, customer_id: str) -> dict[str, Any]:
        """Retrieve a mock customer."""
        if customer_id in self._customers:
            return self._customers[customer_id]
        return {"id": customer_id, "email": "mock@example.com", "name": "Mock Customer", "created": int(time.time())}

    async def update_customer(self, customer_id: str, **kwargs: Any) -> dict[str, Any]:
        """Update a mock customer."""
        customer = await self.retrieve_customer(customer_id)
        customer.update(kwargs)
        self._customers[customer_id] = customer
        return customer

    async def delete_customer(self, customer_id: str) -> dict[str, Any]:
        """Delete a mock customer."""
        self._customers.pop(customer_id, None)
        return {"id": customer_id, "deleted": True}

    async def attach_payment_method(self, payment_method_id: str, customer_id: str) -> dict[str, Any]:
        """Attach a mock payment method."""
        pm = {
            "id": payment_method_id or f"pm_mock_{uuid4().hex[:12]}",
            "customer": customer_id,
            "type": "card",
            "card": {"brand": "visa", "last4": "4242", "exp_month": 12, "exp_year": 2028},
        }
        self._payment_methods.setdefault(customer_id, []).append(pm)
        return pm

    async def detach_payment_method(self, payment_method_id: str) -> dict[str, Any]:
        """Detach a mock payment method."""
        for methods in self._payment_methods.values():
            for i, m in enumerate(methods):
                if m["id"] == payment_method_id:
                    methods.pop(i)
                    return {"id": payment_method_id, "customer": None}
        return {"id": payment_method_id, "customer": None}

    async def list_payment_methods(self, customer_id: str) -> list[dict[str, Any]]:
        """List mock payment methods."""
        return self._payment_methods.get(customer_id, [])

    async def create_subscription(self, customer_id: str, price_id: str, **kwargs: Any) -> dict[str, Any]:
        """Create a mock subscription."""
        sid = f"sub_mock_{uuid4().hex[:12]}"
        sub = {
            "id": sid,
            "customer": customer_id,
            "status": "active",
            "items": {"data": [{"price": {"id": price_id}}]},
            "current_period_start": int(time.time()),
            "current_period_end": int(time.time()) + 30 * 86400,
            **kwargs,
        }
        self._subscriptions[sid] = sub
        return sub

    async def update_subscription(self, subscription_id: str, **kwargs: Any) -> dict[str, Any]:
        """Update a mock subscription."""
        sub = self._subscriptions.get(subscription_id, {"id": subscription_id, "status": "active"})
        sub.update(kwargs)
        self._subscriptions[subscription_id] = sub
        return sub

    async def cancel_subscription(self, subscription_id: str) -> dict[str, Any]:
        """Cancel a mock subscription."""
        sub = self._subscriptions.get(subscription_id, {"id": subscription_id})
        sub["status"] = "canceled"
        sub["canceled_at"] = int(time.time())
        return sub

    async def retrieve_subscription(self, subscription_id: str) -> dict[str, Any]:
        """Retrieve a mock subscription."""
        return self._subscriptions.get(subscription_id, {
            "id": subscription_id, "status": "active", "customer": "cus_mock_default",
        })

    async def create_usage_record(self, subscription_item_id: str, quantity: int, timestamp: int | None = None) -> dict[str, Any]:
        """Create a mock usage record."""
        return {
            "id": f"mbur_mock_{uuid4().hex[:12]}",
            "subscription_item": subscription_item_id,
            "quantity": quantity,
            "timestamp": timestamp or int(time.time()),
        }

    async def list_invoices(self, customer_id: str, limit: int = 10) -> list[dict[str, Any]]:
        """List mock invoices."""
        return [inv for inv in self._invoices.values() if inv.get("customer") == customer_id][:limit]

    async def retrieve_invoice(self, invoice_id: str) -> dict[str, Any]:
        """Retrieve a mock invoice."""
        return self._invoices.get(invoice_id, {
            "id": invoice_id, "status": "paid", "amount_due": 9900, "currency": "usd",
        })

    async def finalize_invoice(self, invoice_id: str) -> dict[str, Any]:
        """Finalize a mock invoice."""
        inv = await self.retrieve_invoice(invoice_id)
        inv["status"] = "open"
        self._invoices[invoice_id] = inv
        return inv

    async def run_test_charge(self, customer_id: str) -> dict[str, Any]:
        """Run a mock $0.01 test charge."""
        return {
            "id": f"ch_mock_{uuid4().hex[:12]}",
            "amount": 1,
            "currency": "usd",
            "customer": customer_id,
            "status": "succeeded",
        }

    async def construct_webhook_event(self, payload: bytes, sig_header: str) -> dict[str, Any]:
        """Construct a mock webhook event."""
        return {
            "id": f"evt_mock_{uuid4().hex[:12]}",
            "type": "invoice.payment_succeeded",
            "data": {"object": {}},
            "created": int(time.time()),
        }

    async def create_setup_intent(self, customer_id: str) -> dict[str, Any]:
        """Create a mock SetupIntent."""
        return {
            "id": f"seti_mock_{uuid4().hex[:12]}",
            "client_secret": f"seti_mock_secret_{uuid4().hex[:12]}",
            "customer": customer_id,
            "status": "requires_payment_method",
        }


# ---------------------------------------------------------------------------
# Real Stripe service
# ---------------------------------------------------------------------------

class StripeService:
    """Production Stripe service wrapping the stripe library."""

    def __init__(self, secret_key: str, webhook_secret: str | None = None) -> None:
        import stripe

        self._stripe = stripe
        self._stripe.api_key = secret_key
        self._webhook_secret = webhook_secret
        logger.info("stripe_service_initialized")

    async def create_customer(self, email: str, name: str, metadata: dict[str, str] | None = None) -> dict[str, Any]:
        """Create a Stripe customer."""
        return dict(self._stripe.Customer.create(email=email, name=name, metadata=metadata or {}))

    async def retrieve_customer(self, customer_id: str) -> dict[str, Any]:
        """Retrieve a Stripe customer."""
        return dict(self._stripe.Customer.retrieve(customer_id))

    async def update_customer(self, customer_id: str, **kwargs: Any) -> dict[str, Any]:
        """Update a Stripe customer."""
        return dict(self._stripe.Customer.modify(customer_id, **kwargs))

    async def delete_customer(self, customer_id: str) -> dict[str, Any]:
        """Delete a Stripe customer."""
        return dict(self._stripe.Customer.delete(customer_id))

    async def attach_payment_method(self, payment_method_id: str, customer_id: str) -> dict[str, Any]:
        """Attach a payment method to a customer."""
        return dict(self._stripe.PaymentMethod.attach(payment_method_id, customer=customer_id))

    async def detach_payment_method(self, payment_method_id: str) -> dict[str, Any]:
        """Detach a payment method."""
        return dict(self._stripe.PaymentMethod.detach(payment_method_id))

    async def list_payment_methods(self, customer_id: str) -> list[dict[str, Any]]:
        """List payment methods for a customer."""
        result = self._stripe.PaymentMethod.list(customer=customer_id, type="card")
        return [dict(pm) for pm in result.data]

    async def create_subscription(self, customer_id: str, price_id: str, **kwargs: Any) -> dict[str, Any]:
        """Create a subscription."""
        return dict(self._stripe.Subscription.create(
            customer=customer_id, items=[{"price": price_id}], **kwargs,
        ))

    async def update_subscription(self, subscription_id: str, **kwargs: Any) -> dict[str, Any]:
        """Update a subscription."""
        return dict(self._stripe.Subscription.modify(subscription_id, **kwargs))

    async def cancel_subscription(self, subscription_id: str) -> dict[str, Any]:
        """Cancel a subscription."""
        return dict(self._stripe.Subscription.delete(subscription_id))

    async def retrieve_subscription(self, subscription_id: str) -> dict[str, Any]:
        """Retrieve a subscription."""
        return dict(self._stripe.Subscription.retrieve(subscription_id))

    async def create_usage_record(self, subscription_item_id: str, quantity: int, timestamp: int | None = None) -> dict[str, Any]:
        """Create a usage record."""
        params: dict[str, Any] = {"quantity": quantity, "action": "increment"}
        if timestamp:
            params["timestamp"] = timestamp
        return dict(self._stripe.SubscriptionItem.create_usage_record(subscription_item_id, **params))

    async def list_invoices(self, customer_id: str, limit: int = 10) -> list[dict[str, Any]]:
        """List invoices for a customer."""
        result = self._stripe.Invoice.list(customer=customer_id, limit=limit)
        return [dict(inv) for inv in result.data]

    async def retrieve_invoice(self, invoice_id: str) -> dict[str, Any]:
        """Retrieve an invoice."""
        return dict(self._stripe.Invoice.retrieve(invoice_id))

    async def finalize_invoice(self, invoice_id: str) -> dict[str, Any]:
        """Finalize a draft invoice."""
        return dict(self._stripe.Invoice.finalize_invoice(invoice_id))

    async def run_test_charge(self, customer_id: str) -> dict[str, Any]:
        """Run a $0.01 test charge to verify payment method."""
        return dict(self._stripe.PaymentIntent.create(
            amount=1, currency="usd", customer=customer_id, confirm=True,
        ))

    async def construct_webhook_event(self, payload: bytes, sig_header: str) -> dict[str, Any]:
        """Construct and validate a Stripe webhook event."""
        if not self._webhook_secret:
            raise ValueError("Webhook secret not configured")
        event = self._stripe.Webhook.construct_event(payload, sig_header, self._webhook_secret)
        return dict(event)

    async def create_setup_intent(self, customer_id: str) -> dict[str, Any]:
        """Create a SetupIntent for collecting payment details."""
        return dict(self._stripe.SetupIntent.create(customer=customer_id))


# ---------------------------------------------------------------------------
# Factory
# ---------------------------------------------------------------------------

_service: StripeService | MockStripeService | None = None


def get_stripe_service() -> StripeService | MockStripeService:
    """Return the singleton Stripe service (real or mock).

    Returns:
        StripeService if STRIPE_SECRET_KEY is configured, MockStripeService otherwise.
    """
    global _service  # noqa: PLW0603
    if _service is None:
        settings = get_settings()
        if settings.stripe_secret_key:
            _service = StripeService(
                settings.stripe_secret_key,
                settings.stripe_webhook_secret,
            )
        else:
            _service = MockStripeService()
    return _service
