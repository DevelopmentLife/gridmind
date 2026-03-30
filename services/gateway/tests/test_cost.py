"""Tests for cost attribution routes and cost calculator."""

from __future__ import annotations

from decimal import Decimal
from typing import Any

import pytest
from fastapi.testclient import TestClient

from gateway.cost_calculator import (
    DecisionCost,
    calculate_decision_cost,
    calculate_model_cost,
    project_monthly_cost,
)
from tests.conftest import create_test_token

# ===========================================================================
# Cost Calculator tests
# ===========================================================================


class TestCalculateModelCost:
    """Test the calculate_model_cost function."""

    def test_haiku_cost(self) -> None:
        """Haiku: $0.25/1M input, $1.25/1M output."""
        cost = calculate_model_cost("claude-haiku-4-5", input_tokens=1000, output_tokens=500)
        expected = Decimal("1000") * Decimal("0.25") / Decimal("1000000") + \
                   Decimal("500") * Decimal("1.25") / Decimal("1000000")
        assert cost == expected.quantize(Decimal("0.00000001"))

    def test_sonnet_cost(self) -> None:
        """Sonnet: $3/1M input, $15/1M output."""
        cost = calculate_model_cost("claude-sonnet-4-6", input_tokens=2000, output_tokens=1000)
        expected = Decimal("2000") * Decimal("3") / Decimal("1000000") + \
                   Decimal("1000") * Decimal("15") / Decimal("1000000")
        assert cost == expected.quantize(Decimal("0.00000001"))

    def test_opus_cost(self) -> None:
        """Opus: $15/1M input, $75/1M output."""
        cost = calculate_model_cost("claude-opus-4-6", input_tokens=500, output_tokens=200)
        expected = Decimal("500") * Decimal("15") / Decimal("1000000") + \
                   Decimal("200") * Decimal("75") / Decimal("1000000")
        assert cost == expected.quantize(Decimal("0.00000001"))

    def test_unknown_model_raises(self) -> None:
        """Unknown model raises ValueError."""
        with pytest.raises(ValueError, match="Unknown model"):
            calculate_model_cost("claude-gpt-5", input_tokens=100, output_tokens=50)

    def test_zero_tokens(self) -> None:
        """Zero tokens should produce zero cost."""
        cost = calculate_model_cost("claude-haiku-4-5", input_tokens=0, output_tokens=0)
        assert cost == Decimal("0.00000000")


class TestCalculateDecisionCost:
    """Test the calculate_decision_cost function."""

    def test_full_cost_breakdown(self) -> None:
        """Verify all cost components are computed and summed."""
        result = calculate_decision_cost(
            model="claude-haiku-4-5",
            input_tokens=10000,
            output_tokens=5000,
            compute_ms=1000,
            tool_calls=3,
        )
        assert isinstance(result, DecisionCost)
        assert result.model_cost_usd > 0
        assert result.compute_cost_usd > 0
        assert result.tool_cost_usd > 0
        assert result.total_cost_usd == (
            result.model_cost_usd + result.compute_cost_usd + result.tool_cost_usd
        )


class TestProjectMonthlyCost:
    """Test the project_monthly_cost function."""

    def test_monthly_projection(self) -> None:
        """Monthly projection should scale daily cost by days_in_month."""
        monthly = project_monthly_cost(
            daily_decisions=100,
            avg_input_tokens=1000,
            avg_output_tokens=500,
            model="claude-haiku-4-5",
            avg_compute_ms=200,
            avg_tool_calls=1,
            days_in_month=30,
        )
        assert monthly > Decimal("0")
        assert isinstance(monthly, Decimal)


# ===========================================================================
# Cost Route tests (using TestClient)
# ===========================================================================


def _cost_headers() -> dict[str, str]:
    """Create auth headers with cost permissions."""
    token = create_test_token(
        permissions=[
            "cost:read", "cost:write",
            "billing:read", "billing:write",
        ],
    )
    return {"Authorization": f"Bearer {token}"}


class TestCostRoutes:
    """Test cost API endpoints."""

    def test_list_decisions(self, client: TestClient) -> None:
        """GET /api/v1/cost/decisions returns 200."""
        resp = client.get("/api/v1/cost/decisions", headers=_cost_headers())
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert "total_count" in data

    def test_cost_summary(self, client: TestClient) -> None:
        """GET /api/v1/cost/summary returns 200 with period."""
        resp = client.get(
            "/api/v1/cost/summary",
            params={"period": "daily", "group_by": "agent"},
            headers=_cost_headers(),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["period"] == "daily"

    def test_cost_realtime(self, client: TestClient) -> None:
        """GET /api/v1/cost/realtime returns 200."""
        resp = client.get("/api/v1/cost/realtime", headers=_cost_headers())
        assert resp.status_code == 200
        data = resp.json()
        assert "decisions" in data
        assert "running_total_usd" in data

    def test_get_budget(self, client: TestClient) -> None:
        """GET /api/v1/cost/budget returns 200."""
        resp = client.get("/api/v1/cost/budget", headers=_cost_headers())
        assert resp.status_code == 200
        data = resp.json()
        assert "status" in data

    def test_set_budget(self, client: TestClient) -> None:
        """POST /api/v1/cost/budget sets budget and returns 200."""
        resp = client.post(
            "/api/v1/cost/budget",
            json={
                "monthly_limit_usd": "500.00",
                "alert_threshold_percent": 75,
                "critical_threshold_percent": 90,
            },
            headers=_cost_headers(),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["monthly_limit_usd"] == 500.0
        assert data["alert_threshold_percent"] == 75
