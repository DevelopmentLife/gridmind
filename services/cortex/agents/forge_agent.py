"""FORGE — Provisioning agent.

IaC execution with scoped IAM and auto-rollback capabilities.
"""

from __future__ import annotations

import json

import structlog

from cortex.base_agent import BaseAgent
from cortex.models import AgentTier, AutonomyLevel, EventEnvelope, ToolDefinition

logger = structlog.get_logger(__name__)


class ForgeAgent(BaseAgent):
    """Provisioning: IaC execution with scoped IAM + auto-rollback."""

    AGENT_NAME = "forge"
    TIER = AgentTier.EXECUTION
    AUTONOMY_LEVEL = AutonomyLevel.SUPERVISED
    MODEL_ASSIGNMENT = "deterministic"
    VISIBILITY = "Customer"
    DESCRIPTION = "Provisioning: IaC execution with scoped IAM + auto-rollback"
    CYCLE_INTERVAL_SECONDS = 0.0  # Event-driven
    TOOLS = [
        ToolDefinition(
            name="terraform_plan",
            description="Run terraform plan for a given configuration",
            input_schema={
                "type": "object",
                "properties": {
                    "workspace": {"type": "string"},
                    "vars": {"type": "object"},
                },
            },
        ),
        ToolDefinition(
            name="terraform_apply",
            description="Run terraform apply for a given plan",
            input_schema={
                "type": "object",
                "properties": {"workspace": {"type": "string"}, "plan_id": {"type": "string"}},
            },
        ),
        ToolDefinition(
            name="kubectl_scale",
            description="Scale a Kubernetes deployment",
            input_schema={
                "type": "object",
                "properties": {
                    "deployment": {"type": "string"},
                    "replicas": {"type": "integer"},
                    "namespace": {"type": "string"},
                },
            },
        ),
        ToolDefinition(
            name="kubectl_apply",
            description="Apply a Kubernetes manifest",
            input_schema={
                "type": "object",
                "properties": {"manifest": {"type": "string"}, "namespace": {"type": "string"}},
            },
        ),
        ToolDefinition(
            name="tag_resources",
            description="Apply tags to cloud resources",
            input_schema={
                "type": "object",
                "properties": {
                    "resource_ids": {"type": "array"},
                    "tags": {"type": "object"},
                },
            },
        ),
    ]
    SUBSCRIPTIONS = [
        "scaling.decision",
        "onboarding.provision_requested",
    ]
    EMISSIONS = [
        "execution.provision_started",
        "execution.provision_completed",
        "execution.provision_failed",
        "execution.rollback_initiated",
    ]

    async def run_cycle(self) -> None:
        """FORGE is event-driven; no proactive cycle."""

    async def process(self, event: EventEnvelope) -> None:
        """Execute provisioning actions based on incoming events."""
        if event.event_type == "scaling.decision":
            await self._handle_scaling(event)
        elif event.event_type == "onboarding.provision_requested":
            await self._handle_provision(event)

    async def _handle_scaling(self, event: EventEnvelope) -> None:
        """Execute a scaling decision."""
        action = event.payload.get("action", {})
        deployment_id = event.payload.get("deployment_id", "")
        replicas = action.get("replicas", 1)

        # Request approval before executing
        try:
            await self._request_approval(
                f"Scale deployment {deployment_id} to {replicas} replicas",
                risk_level="medium",
            )
        except Exception as exc:
            logger.warning("forge.scaling_approval_denied", error=str(exc))
            return

        await self._emit(EventEnvelope(
            event_type="execution.provision_started",
            tenant_id=self._context.tenant_id,
            payload={"deployment_id": deployment_id, "action": "scale", "replicas": replicas},
        ))

        try:
            result = await self._invoke_tool(
                "kubectl_scale",
                deployment=deployment_id,
                replicas=replicas,
                namespace="gridmind",
            )
            await self._emit(EventEnvelope(
                event_type="execution.provision_completed",
                tenant_id=self._context.tenant_id,
                payload={
                    "deployment_id": deployment_id,
                    "action": "scale",
                    "result": result,
                },
            ))
        except Exception as exc:
            logger.error("forge.scaling_failed", error=str(exc))
            await self._emit(EventEnvelope(
                event_type="execution.provision_failed",
                tenant_id=self._context.tenant_id,
                payload={"deployment_id": deployment_id, "error": str(exc)},
            ))

    async def _handle_provision(self, event: EventEnvelope) -> None:
        """Execute a new deployment provision."""
        workspace = event.payload.get("workspace", "")
        tf_vars = event.payload.get("terraform_vars", {})

        await self._emit(EventEnvelope(
            event_type="execution.provision_started",
            tenant_id=self._context.tenant_id,
            payload={"workspace": workspace, "action": "provision"},
        ))

        try:
            # Plan
            plan_result = await self._invoke_tool(
                "terraform_plan", workspace=workspace, vars=tf_vars
            )
            plan_id = plan_result.get("result", {}).get("plan_id", "plan-001")

            # Apply
            apply_result = await self._invoke_tool(
                "terraform_apply", workspace=workspace, plan_id=plan_id
            )

            # Tag resources
            resource_ids = apply_result.get("result", {}).get("resource_ids", [])
            if resource_ids:
                await self._invoke_tool(
                    "tag_resources",
                    resource_ids=resource_ids,
                    tags={
                        "tenant_id": self._context.tenant_id,
                        "managed_by": "gridmind",
                    },
                )

            await self._emit(EventEnvelope(
                event_type="execution.provision_completed",
                tenant_id=self._context.tenant_id,
                payload={"workspace": workspace, "result": apply_result},
            ))
        except Exception as exc:
            logger.error("forge.provision_failed", error=str(exc))
            await self._emit(EventEnvelope(
                event_type="execution.provision_failed",
                tenant_id=self._context.tenant_id,
                payload={"workspace": workspace, "error": str(exc)},
            ))
