"""Tests for gateway.routes.billing — Stripe integration with mock."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient


class TestBillingWithMock:
    """Billing endpoint tests using MockStripeService."""

    def test_create_customer(self, client: TestClient, auth_headers: dict[str, str]) -> None:
        """Create a Stripe customer returns mock customer."""
        resp = client.post("/api/v1/billing/customers", json={
            "email": "billing@example.com",
            "name": "Billing Test",
        }, headers=auth_headers)
        assert resp.status_code == 201
        data = resp.json()
        assert data["id"].startswith("cus_mock_")
        assert data["email"] == "billing@example.com"

    def test_get_customer(self, client: TestClient, auth_headers: dict[str, str]) -> None:
        """Retrieve a mock customer."""
        resp = client.get("/api/v1/billing/customers/cus_mock_test123", headers=auth_headers)
        assert resp.status_code == 200

    def test_create_setup_intent(self, client: TestClient, auth_headers: dict[str, str]) -> None:
        """Create a SetupIntent returns client secret."""
        resp = client.post(
            "/api/v1/billing/setup-intent?customer_id=cus_mock_test",
            headers=auth_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "client_secret" in data

    def test_attach_payment_method(self, client: TestClient, auth_headers: dict[str, str]) -> None:
        """Attach a payment method to a customer."""
        resp = client.post("/api/v1/billing/payment-methods/attach", json={
            "payment_method_id": "pm_test_123",
            "customer_id": "cus_mock_test",
        }, headers=auth_headers)
        assert resp.status_code == 200

    def test_list_payment_methods(self, client: TestClient, auth_headers: dict[str, str]) -> None:
        """List payment methods for a customer."""
        resp = client.get(
            "/api/v1/billing/payment-methods?customer_id=cus_mock_test",
            headers=auth_headers,
        )
        assert resp.status_code == 200

    def test_create_subscription(self, client: TestClient, auth_headers: dict[str, str]) -> None:
        """Create a subscription returns mock subscription."""
        resp = client.post("/api/v1/billing/subscriptions", json={
            "customer_id": "cus_mock_test",
            "price_id": "price_test_123",
        }, headers=auth_headers)
        assert resp.status_code == 201
        data = resp.json()
        assert data["status"] == "active"

    def test_cancel_subscription(self, client: TestClient, auth_headers: dict[str, str]) -> None:
        """Cancel a subscription."""
        # Create first
        create_resp = client.post("/api/v1/billing/subscriptions", json={
            "customer_id": "cus_mock_test",
            "price_id": "price_test_123",
        }, headers=auth_headers)
        sub_id = create_resp.json()["id"]

        resp = client.delete(f"/api/v1/billing/subscriptions/{sub_id}", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["status"] == "canceled"

    def test_create_usage_record(self, client: TestClient, auth_headers: dict[str, str]) -> None:
        """Report metered usage."""
        resp = client.post("/api/v1/billing/usage-records", json={
            "subscription_item_id": "si_test_123",
            "quantity": 100,
        }, headers=auth_headers)
        assert resp.status_code == 201

    def test_list_invoices(self, client: TestClient, auth_headers: dict[str, str]) -> None:
        """List invoices for a customer."""
        resp = client.get(
            "/api/v1/billing/invoices?customer_id=cus_mock_test",
            headers=auth_headers,
        )
        assert resp.status_code == 200

    def test_test_charge(self, client: TestClient, auth_headers: dict[str, str]) -> None:
        """Run a test charge."""
        resp = client.post("/api/v1/billing/test-charge", json={
            "customer_id": "cus_mock_test",
        }, headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["amount"] == 1
        assert data["status"] == "succeeded"

    def test_margin_calculator(self, client: TestClient, auth_headers: dict[str, str]) -> None:
        """Margin calculation returns correct formula result."""
        resp = client.post("/api/v1/billing/margin-calculator", json={
            "monthly_cost": 500.0,
        }, headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["margin_target"] >= 0.55
        assert data["customer_price"] > 500.0

    def test_margin_calculator_zero_cost(self, client: TestClient, auth_headers: dict[str, str]) -> None:
        """Zero cost returns 55% margin target."""
        resp = client.post("/api/v1/billing/margin-calculator", json={
            "monthly_cost": 0.0,
        }, headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["margin_target"] == 0.55
        assert data["customer_price"] == 0.0

    def test_webhook(self, client: TestClient) -> None:
        """Webhook endpoint processes events."""
        resp = client.post(
            "/api/v1/billing/webhook",
            content=b'{"type": "invoice.payment_succeeded"}',
            headers={"stripe-signature": "test_sig"},
        )
        assert resp.status_code == 200

    def test_billing_no_auth(self, client: TestClient) -> None:
        """Billing endpoints require auth."""
        resp = client.post("/api/v1/billing/customers", json={
            "email": "test@test.com", "name": "Test",
        })
        assert resp.status_code in (401, 403)
