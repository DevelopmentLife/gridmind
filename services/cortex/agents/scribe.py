"""SCRIBE — Documentation agent.

Auto-generates documentation from git diffs, schema changes, and events.
"""

from __future__ import annotations

import json

import structlog

from cortex.base_agent import BaseAgent
from cortex.models import AgentTier, AutonomyLevel, EventEnvelope, ToolDefinition

logger = structlog.get_logger(__name__)


class ScribeAgent(BaseAgent):
    """Documentation: auto-generates from diffs/events."""

    AGENT_NAME = "scribe"
    TIER = AgentTier.SPECIALIZED
    AUTONOMY_LEVEL = AutonomyLevel.AUTONOMOUS
    MODEL_ASSIGNMENT = "claude-sonnet-4-6"
    VISIBILITY = "Internal"
    DESCRIPTION = "Documentation: auto-generates from diffs/events"
    CYCLE_INTERVAL_SECONDS = 3600.0
    TOOLS = [
        ToolDefinition(
            name="get_git_diff",
            description="Get recent git diffs for a repository",
            input_schema={
                "type": "object",
                "properties": {"repo": {"type": "string"}, "since": {"type": "string"}},
            },
        ),
        ToolDefinition(
            name="write_file",
            description="Write content to a documentation file",
            input_schema={
                "type": "object",
                "properties": {"path": {"type": "string"}, "content": {"type": "string"}},
            },
        ),
        ToolDefinition(
            name="get_schema_diff",
            description="Get database schema changes since last check",
            input_schema={"type": "object", "properties": {"since": {"type": "string"}}},
        ),
    ]
    SUBSCRIPTIONS: list[str] = []
    EMISSIONS = ["specialized.documentation_updated"]

    async def run_cycle(self) -> None:
        """Check for changes and generate/update documentation."""
        last_check = await self.get_context("last_doc_check") or ""

        git_diff = await self._invoke_tool("get_git_diff", repo="gridmind", since=str(last_check))
        schema_diff = await self._invoke_tool("get_schema_diff", since=str(last_check))

        has_changes = bool(
            git_diff.get("result", {}).get("changes")
            or schema_diff.get("result", {}).get("changes")
        )

        if not has_changes:
            return

        # Use LLM to generate documentation updates
        doc_content = await self._llm(
            system=(
                "You are SCRIBE, a technical documentation writer. Based on the code and "
                "schema changes, generate concise documentation updates in markdown format. "
                "Focus on: what changed, why it matters, and any breaking changes."
            ),
            messages=[{
                "role": "user",
                "content": (
                    f"Git changes: {json.dumps(git_diff)}\n"
                    f"Schema changes: {json.dumps(schema_diff)}"
                ),
            }],
        )

        await self._invoke_tool(
            "write_file",
            path="docs/changelog/latest.md",
            content=doc_content,
        )

        from datetime import UTC, datetime
        now = datetime.now(UTC).isoformat()
        await self.set_context("last_doc_check", now, ttl=86400)

        await self._emit(EventEnvelope(
            event_type="specialized.documentation_updated",
            tenant_id=self._context.tenant_id,
            payload={"updated_at": now},
        ))

    async def process(self, event: EventEnvelope) -> None:
        """Handle inbound events."""
