"""MEDIC — Agent Recovery agent.

Runs 5 recovery playbooks: crash, degradation, corruption, cascade, OOM.
"""

from __future__ import annotations

import enum
import json

import structlog

from cortex.base_agent import BaseAgent
from cortex.models import AgentTier, AutonomyLevel, EventEnvelope, ToolDefinition

logger = structlog.get_logger(__name__)


class RecoveryPlaybook(str, enum.Enum):
    """Recovery playbook types for different failure scenarios."""

    CRASH = "crash"
    DEGRADATION = "degradation"
    CORRUPTION = "corruption"
    CASCADE = "cascade"
    OOM = "oom"


PLAYBOOK_ACTIONS: dict[RecoveryPlaybook, list[str]] = {
    RecoveryPlaybook.CRASH: ["get_agent_logs", "clear_agent_state", "restart_agent_pod"],
    RecoveryPlaybook.DEGRADATION: ["get_agent_logs", "scale_agent_resources"],
    RecoveryPlaybook.CORRUPTION: ["clear_agent_state", "restart_agent_pod"],
    RecoveryPlaybook.CASCADE: ["get_agent_logs", "restart_agent_pod", "scale_agent_resources"],
    RecoveryPlaybook.OOM: ["get_agent_logs", "scale_agent_resources", "restart_agent_pod"],
}


class MedicAgent(BaseAgent):
    """Agent Recovery: 5 playbooks (crash, degradation, corruption, cascade, OOM)."""

    AGENT_NAME = "medic"
    TIER = AgentTier.SELF_HEALING
    AUTONOMY_LEVEL = AutonomyLevel.AUTONOMOUS
    MODEL_ASSIGNMENT = "claude-sonnet-4-6"
    VISIBILITY = "Internal"
    DESCRIPTION = "Agent Recovery: 5 playbooks (crash, degradation, corruption, cascade, OOM)"
    CYCLE_INTERVAL_SECONDS = 0.0  # Event-driven
    TOOLS = [
        ToolDefinition(
            name="restart_agent_pod",
            description="Restart the Kubernetes pod for a specific agent",
            input_schema={
                "type": "object",
                "properties": {"agent_name": {"type": "string"}, "namespace": {"type": "string"}},
            },
        ),
        ToolDefinition(
            name="clear_agent_state",
            description="Clear Redis state for a specific agent",
            input_schema={"type": "object", "properties": {"agent_name": {"type": "string"}}},
        ),
        ToolDefinition(
            name="get_agent_logs",
            description="Get recent logs for a specific agent pod",
            input_schema={
                "type": "object",
                "properties": {"agent_name": {"type": "string"}, "lines": {"type": "integer"}},
            },
        ),
        ToolDefinition(
            name="scale_agent_resources",
            description="Scale CPU/memory resources for an agent pod",
            input_schema={
                "type": "object",
                "properties": {
                    "agent_name": {"type": "string"},
                    "cpu_millicores": {"type": "integer"},
                    "memory_mb": {"type": "integer"},
                },
            },
        ),
    ]
    SUBSCRIPTIONS = [
        "agent.status_changed",
        "self_healing.incident_detected",
    ]
    EMISSIONS = [
        "self_healing.recovery_started",
        "self_healing.recovery_completed",
        "self_healing.recovery_failed",
    ]

    async def run_cycle(self) -> None:
        """MEDIC is event-driven; no proactive cycle."""

    async def process(self, event: EventEnvelope) -> None:
        """Diagnose and recover a failing agent."""
        agent_name = event.payload.get("agent_name", "")
        if not agent_name or agent_name == self.AGENT_NAME:
            return  # Skip self-recovery to avoid loops

        incident_type = event.payload.get("type", "")
        new_status = event.payload.get("new_status", "")

        # Select playbook based on incident type
        playbook = self._select_playbook(incident_type, new_status, event.payload)

        if playbook is None:
            return

        logger.info(
            "medic.recovery_starting",
            agent_name=agent_name,
            playbook=playbook.value,
        )

        await self._emit(EventEnvelope(
            event_type="self_healing.recovery_started",
            tenant_id=self._context.tenant_id,
            payload={
                "agent_name": agent_name,
                "playbook": playbook.value,
                "incident_type": incident_type,
            },
        ))

        try:
            # Get agent logs for diagnosis
            logs = await self._invoke_tool(
                "get_agent_logs", agent_name=agent_name, lines=100
            )

            # Use LLM to refine the recovery approach
            diagnosis = await self._llm(
                system=(
                    "You are MEDIC, an agent recovery specialist. Analyze the agent logs "
                    f"and the selected playbook ({playbook.value}) to determine the best "
                    "recovery steps. Return JSON: {\"root_cause\": str, "
                    "\"steps\": [str], \"resource_adjustment\": {\"cpu_millicores\": int, "
                    "\"memory_mb\": int} | null}"
                ),
                messages=[{
                    "role": "user",
                    "content": (
                        f"Agent: {agent_name}\n"
                        f"Incident: {json.dumps(event.payload)}\n"
                        f"Logs: {json.dumps(logs)}"
                    ),
                }],
            )

            # Execute playbook actions
            actions = PLAYBOOK_ACTIONS.get(playbook, [])
            for action in actions:
                if action == "restart_agent_pod":
                    await self._invoke_tool(
                        "restart_agent_pod",
                        agent_name=agent_name,
                        namespace="gridmind",
                    )
                elif action == "clear_agent_state":
                    await self._invoke_tool("clear_agent_state", agent_name=agent_name)
                elif action == "scale_agent_resources":
                    await self._invoke_tool(
                        "scale_agent_resources",
                        agent_name=agent_name,
                        cpu_millicores=500,
                        memory_mb=512,
                    )

            await self._emit(EventEnvelope(
                event_type="self_healing.recovery_completed",
                tenant_id=self._context.tenant_id,
                payload={
                    "agent_name": agent_name,
                    "playbook": playbook.value,
                    "actions_taken": actions,
                },
            ))
            logger.info("medic.recovery_completed", agent_name=agent_name)

        except Exception as exc:
            logger.error("medic.recovery_failed", agent_name=agent_name, error=str(exc))
            await self._emit(EventEnvelope(
                event_type="self_healing.recovery_failed",
                tenant_id=self._context.tenant_id,
                payload={
                    "agent_name": agent_name,
                    "playbook": playbook.value,
                    "error": str(exc),
                },
            ))

    def _select_playbook(
        self,
        incident_type: str,
        new_status: str,
        payload: dict[str, object],
    ) -> RecoveryPlaybook | None:
        """Select the appropriate recovery playbook based on incident signals."""
        if incident_type == "agent_dead":
            missed = payload.get("missed_heartbeats", 0)
            if isinstance(missed, int) and missed > 10:
                return RecoveryPlaybook.CRASH
            return RecoveryPlaybook.CRASH

        if new_status == "degraded":
            return RecoveryPlaybook.DEGRADATION

        if new_status == "dead":
            return RecoveryPlaybook.CRASH

        if "oom" in str(incident_type).lower():
            return RecoveryPlaybook.OOM

        if "cascade" in str(incident_type).lower():
            return RecoveryPlaybook.CASCADE

        if "corrupt" in str(incident_type).lower():
            return RecoveryPlaybook.CORRUPTION

        # Default: if we get a status change event to a bad state, try degradation
        if new_status in ("degraded", "dead"):
            return RecoveryPlaybook.DEGRADATION

        return None
