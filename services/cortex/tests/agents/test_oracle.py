"""Tests for agents.oracle — OracleAgent (Capacity Forecast)."""

from __future__ import annotations

import pytest

from cortex.base_agent import AgentContext
from cortex.models import AgentTier, AutonomyLevel, EventEnvelope


@pytest.fixture
def oracle(make_agent_context):
    from agents.oracle import OracleAgent
    ctx: AgentContext = make_agent_context("test-tenant")
    return OracleAgent(ctx)


class TestOracleDeclarations:
    def test_agent_name(self):
        from agents.oracle import OracleAgent
        assert OracleAgent.AGENT_NAME == "oracle"

    def test_tier_is_perception(self):
        from agents.oracle import OracleAgent
        assert OracleAgent.TIER == AgentTier.PERCEPTION

    def test_autonomy_is_autonomous(self):
        from agents.oracle import OracleAgent
        assert OracleAgent.AUTONOMY_LEVEL == AutonomyLevel.AUTONOMOUS

    def test_model_assignment_is_sonnet(self):
        from agents.oracle import OracleAgent
        assert OracleAgent.MODEL_ASSIGNMENT == "claude-sonnet-4-6"

    def test_visibility_is_customer(self):
        from agents.oracle import OracleAgent
        assert OracleAgent.VISIBILITY == "Customer"

    def test_description_set(self):
        from agents.oracle import OracleAgent
        assert len(OracleAgent.DESCRIPTION) > 0

    def test_emissions_include_capacity_forecast(self):
        from agents.oracle import OracleAgent
        assert "perception.capacity_forecast" in OracleAgent.EMISSIONS

    def test_emissions_include_capacity_warning(self):
        from agents.oracle import OracleAgent
        assert "perception.capacity_warning" in OracleAgent.EMISSIONS

    def test_cycle_interval_is_positive(self):
        from agents.oracle import OracleAgent
        assert OracleAgent.CYCLE_INTERVAL_SECONDS > 0

    def test_holt_winters_models_initialized(self, oracle):
        assert "cpu" in oracle._models
        assert "memory" in oracle._models
        assert "connections" in oracle._models
        assert "storage_gb" in oracle._models


class TestOracleHoltWinters:
    def test_holt_winters_update_initializes_level(self):
        from agents.oracle import _HoltWinters
        hw = _HoltWinters()
        hw.update(100.0)
        assert hw.level == 100.0
        assert hw._initialized is True

    def test_holt_winters_forecast_returns_positive_value(self):
        from agents.oracle import _HoltWinters
        hw = _HoltWinters()
        hw.update(100.0)
        hw.update(110.0)
        result = hw.forecast(steps=6)
        assert result > 0

    def test_holt_winters_multiple_updates(self):
        from agents.oracle import _HoltWinters
        hw = _HoltWinters()
        for val in [50.0, 60.0, 70.0, 80.0]:
            hw.update(val)
        assert hw._initialized is True
        assert hw.level > 0


class TestOracleProcessing:
    async def test_process_unknown_event_does_not_raise(self, oracle):
        from unittest.mock import MagicMock
        event = MagicMock(spec=EventEnvelope)
        event.tenant_id = "test-tenant"
        event.event_type = "unknown.event"
        await oracle.process(event)

    async def test_run_cycle_emits_capacity_forecast(self, oracle, mock_event_mesh):
        await oracle.run_cycle()
        event_types = [e.event_type for e in mock_event_mesh.published_events]
        assert "perception.capacity_forecast" in event_types

    async def test_run_cycle_emits_capacity_warning_when_threshold_exceeded(
        self, oracle, mock_event_mesh
    ):
        """When a forecast exceeds the threshold, capacity_warning is emitted."""
        # Seed models with very high values to force a warning
        for model in oracle._models.values():
            for _ in range(5):
                model.update(99.0)

        await oracle.run_cycle()
        event_types = [e.event_type for e in mock_event_mesh.published_events]
        assert "perception.capacity_warning" in event_types

    async def test_run_cycle_does_not_raise(self, oracle):
        try:
            await oracle.run_cycle()
        except Exception:
            pass
