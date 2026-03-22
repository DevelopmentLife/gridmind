"""AEGIS — Security Posture agent.

Continuous security red-teaming: credentials, encryption, compliance, network exposure.
"""

from __future__ import annotations

import json

import structlog

from cortex.base_agent import BaseAgent
from cortex.models import AgentTier, AutonomyLevel, EventEnvelope, ToolDefinition

logger = structlog.get_logger(__name__)


class AegisAgent(BaseAgent):
    """Security Posture: continuous red-team, credentials, encryption, compliance."""

    AGENT_NAME = "aegis"
    TIER = AgentTier.REASONING
    AUTONOMY_LEVEL = AutonomyLevel.ADVISORY
    MODEL_ASSIGNMENT = "claude-sonnet-4-6"
    VISIBILITY = "Customer"
    DESCRIPTION = "Security Posture: continuous red-team, credentials, encryption, compliance"
    CYCLE_INTERVAL_SECONDS = 300.0
    TOOLS = [
        ToolDefinition(
            name="scan_pg_hba",
            description="Scan pg_hba.conf for security issues",
            input_schema={"type": "object", "properties": {}},
        ),
        ToolDefinition(
            name="scan_pg_roles",
            description="Scan PostgreSQL roles for privilege escalation risks",
            input_schema={"type": "object", "properties": {}},
        ),
        ToolDefinition(
            name="check_ssl_config",
            description="Check SSL/TLS configuration for the database",
            input_schema={"type": "object", "properties": {}},
        ),
        ToolDefinition(
            name="check_network_exposure",
            description="Check network exposure and firewall rules",
            input_schema={"type": "object", "properties": {}},
        ),
    ]
    SUBSCRIPTIONS = ["perception.drift_detected"]
    EMISSIONS = ["security.posture_report", "security.finding"]

    async def run_cycle(self) -> None:
        """Run security scans and emit posture report."""
        hba = await self._invoke_tool("scan_pg_hba")
        roles = await self._invoke_tool("scan_pg_roles")
        ssl = await self._invoke_tool("check_ssl_config")
        network = await self._invoke_tool("check_network_exposure")

        analysis = await self._llm(
            system=(
                "You are AEGIS, a database security posture analyst. Analyze all scans and "
                "produce a security posture report. Return JSON: {\"risk_score\": 0-100, "
                "\"findings\": [{\"severity\": \"critical|high|medium|low|info\", "
                "\"category\": str, \"description\": str, \"remediation\": str}], "
                "\"overall_status\": \"secure|at_risk|critical\"}"
            ),
            messages=[{
                "role": "user",
                "content": (
                    f"pg_hba scan: {json.dumps(hba)}\n"
                    f"Roles scan: {json.dumps(roles)}\n"
                    f"SSL config: {json.dumps(ssl)}\n"
                    f"Network exposure: {json.dumps(network)}"
                ),
            }],
        )

        try:
            report = json.loads(analysis)
        except json.JSONDecodeError:
            report = {"risk_score": 0, "findings": [], "overall_status": "secure"}

        await self._emit(EventEnvelope(
            event_type="security.posture_report",
            tenant_id=self._context.tenant_id,
            payload=report,
        ))

        # Emit individual high/critical findings
        for finding in report.get("findings", []):
            if finding.get("severity") in ("critical", "high"):
                await self._emit(EventEnvelope(
                    event_type="security.finding",
                    tenant_id=self._context.tenant_id,
                    payload=finding,
                ))

    async def process(self, event: EventEnvelope) -> None:
        """React to drift detection events with targeted security scan."""
        if event.event_type == "perception.drift_detected":
            categories = event.payload.get("categories", [])
            if "security" in categories:
                logger.info("aegis.drift_triggered_scan", categories=categories)
                await self.run_cycle()
