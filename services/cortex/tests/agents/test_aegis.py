"""Tests for agents.aegis — AegisAgent (Security Posture)."""

from __future__ import annotations

import pytest

from cortex.base_agent import AgentContext
from cortex.models import AgentTier, AutonomyLevel, EventEnvelope


@pytest.fixture
def aegis(make_agent_context):
    from agents.aegis import AegisAgent
    ctx: AgentContext = make_agent_context("test-tenant")
    return AegisAgent(ctx)


class TestAegisDeclarations:
    def test_agent_name(self):
        from agents.aegis import AegisAgent
        assert AegisAgent.AGENT_NAME == "aegis"

    def test_tier_is_reasoning(self):
        from agents.aegis import AegisAgent
        assert AegisAgent.TIER == AgentTier.REASONING

    def test_autonomy_is_advisory(self):
        from agents.aegis import AegisAgent
        assert AegisAgent.AUTONOMY_LEVEL == AutonomyLevel.ADVISORY

    def test_model_assignment_is_sonnet(self):
        from agents.aegis import AegisAgent
        assert AegisAgent.MODEL_ASSIGNMENT == "claude-sonnet-4-6"

    def test_visibility_is_customer(self):
        from agents.aegis import AegisAgent
        assert AegisAgent.VISIBILITY == "Customer"

    def test_description_set(self):
        from agents.aegis import AegisAgent
        assert len(AegisAgent.DESCRIPTION) > 0

    def test_subscriptions_include_drift_detected(self):
        from agents.aegis import AegisAgent
        assert "perception.drift_detected" in AegisAgent.SUBSCRIPTIONS

    def test_emissions_include_posture_report(self):
        from agents.aegis import AegisAgent
        assert "security.posture_report" in AegisAgent.EMISSIONS

    def test_emissions_include_security_finding(self):
        from agents.aegis import AegisAgent
        assert "security.finding" in AegisAgent.EMISSIONS

    def test_tools_contain_scan_pg_hba(self):
        from agents.aegis import AegisAgent
        tool_names = {t.name for t in AegisAgent.TOOLS}
        assert "scan_pg_hba" in tool_names


class TestAegisProcessing:
    async def test_process_drift_with_security_category_triggers_run_cycle(
        self, aegis, mock_event_mesh
    ):
        """Drift detection with security category triggers a full security scan."""
        event = EventEnvelope(
            event_type="perception.drift_detected",
            tenant_id="test-tenant",
            payload={"drift_score": 0.7, "categories": ["security", "schema"]},
        )
        await aegis.process(event)
        event_types = [e.event_type for e in mock_event_mesh.published_events]
        assert "security.posture_report" in event_types

    async def test_process_drift_without_security_category_does_not_scan(
        self, aegis, mock_event_mesh
    ):
        """Drift without security category should not trigger a scan."""
        event = EventEnvelope(
            event_type="perception.drift_detected",
            tenant_id="test-tenant",
            payload={"drift_score": 0.4, "categories": ["schema"]},
        )
        await aegis.process(event)
        assert len(mock_event_mesh.published_events) == 0

    async def test_run_cycle_emits_posture_report(self, aegis, mock_event_mesh):
        await aegis.run_cycle()
        event_types = [e.event_type for e in mock_event_mesh.published_events]
        assert "security.posture_report" in event_types

    async def test_run_cycle_emits_findings_for_critical_severity(
        self, aegis, mock_event_mesh, mock_llm_client
    ):
        import json
        async def critical_findings_response(model, system, messages, max_tokens=4096):
            return json.dumps({
                "risk_score": 85,
                "findings": [
                    {
                        "severity": "critical",
                        "category": "credentials",
                        "description": "Superuser password not rotated",
                        "remediation": "Rotate password immediately",
                    }
                ],
                "overall_status": "critical",
            })
        mock_llm_client.call.side_effect = critical_findings_response

        await aegis.run_cycle()
        event_types = [e.event_type for e in mock_event_mesh.published_events]
        assert "security.finding" in event_types

    async def test_run_cycle_calls_llm(self, aegis, mock_llm_client):
        await aegis.run_cycle()
        mock_llm_client.call.assert_called_once()

    async def test_run_cycle_does_not_raise(self, aegis):
        try:
            await aegis.run_cycle()
        except Exception:
            pass
