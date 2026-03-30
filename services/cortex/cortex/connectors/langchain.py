"""LangChain connector — import LangChain agent configurations into GridMind."""

from __future__ import annotations

from typing import Any

from cortex.connectors.base import FrameworkConnector
from cortex.connectors.team_config import AgentSpec, AgentTeamSpec, ModelRoutingConfig

# Mapping from LangChain model class names to GridMind model identifiers.
_LANGCHAIN_MODEL_MAP: dict[str, str] = {
    "ChatAnthropic": "claude-sonnet-4-6",
    "ChatAnthropicMessages": "claude-sonnet-4-6",
    "claude-3-haiku": "claude-haiku-4-5",
    "claude-3-sonnet": "claude-sonnet-4-6",
    "claude-3-opus": "claude-opus-4-6",
    "claude-3.5-haiku": "claude-haiku-4-5",
    "claude-3.5-sonnet": "claude-sonnet-4-6",
    "claude-4-haiku": "claude-haiku-4-5",
    "claude-4-sonnet": "claude-sonnet-4-6",
    "claude-4-opus": "claude-opus-4-6",
}


def _map_model(langchain_model: str) -> str:
    """Map a LangChain model identifier to a GridMind model.

    Args:
        langchain_model: LangChain model class name or model string.

    Returns:
        GridMind model identifier.
    """
    return _LANGCHAIN_MODEL_MAP.get(langchain_model, "claude-sonnet-4-6")


def _extract_tools(agent_config: dict[str, Any]) -> list[str]:
    """Extract tool names from a LangChain agent config.

    Args:
        agent_config: The agent dict from a LangChain config.

    Returns:
        List of tool name strings.
    """
    tools: list[str] = []
    raw_tools = agent_config.get("tools", [])
    for t in raw_tools:
        if isinstance(t, str):
            tools.append(t)
        elif isinstance(t, dict):
            tools.append(t.get("name", t.get("tool_name", "unknown")))
    return tools


class LangChainConnector(FrameworkConnector):
    """Import LangChain AgentExecutor configurations into GridMind.

    Expects a dict with a ``team_name`` and a list of ``agents``, where each
    agent has fields like ``agent_type``, ``llm``, ``tools``, etc.
    """

    NAME = "langchain"
    STATUS = "available"

    def import_config(self, source: str | dict[str, Any]) -> AgentTeamSpec:
        """Import a LangChain configuration dict into an AgentTeamSpec.

        Args:
            source: A dict with ``team_name`` and ``agents`` keys.

        Returns:
            The normalized AgentTeamSpec.

        Raises:
            ValueError: If required fields are missing.
        """
        if isinstance(source, str):
            raise ValueError(
                "LangChain connector requires a dict, not a file path. "
                "Parse your LangChain config before importing."
            )

        team_name = source.get("team_name", "langchain-team")
        raw_agents = source.get("agents", [])
        if not raw_agents:
            raise ValueError("LangChain config must have at least one agent.")

        agents: list[AgentSpec] = []
        for idx, agent_cfg in enumerate(raw_agents):
            name = agent_cfg.get("name", f"agent_{idx}")
            llm = agent_cfg.get("llm", {})
            model_name = llm if isinstance(llm, str) else llm.get("model", "ChatAnthropic")
            model = _map_model(model_name)
            tools = _extract_tools(agent_cfg)

            agents.append(AgentSpec(
                name=name,
                display_name=name.upper(),
                tier=agent_cfg.get("tier", "reasoning"),
                model=model,
                autonomy=agent_cfg.get("autonomy", "supervised"),
                tools=tools,
                description=agent_cfg.get("description", ""),
                extra={"langchain_agent_type": agent_cfg.get("agent_type", "AgentExecutor")},
            ))

        return AgentTeamSpec(
            team_name=team_name,
            description=source.get("description", ""),
            agents=agents,
            source_framework="langchain",
        )

    def export_config(self, spec: AgentTeamSpec) -> dict[str, Any]:
        """Export an AgentTeamSpec to a LangChain-compatible dict.

        Args:
            spec: The team specification.

        Returns:
            A dict representing a LangChain configuration.
        """
        agents: list[dict[str, Any]] = []
        for agent in spec.agents:
            agents.append({
                "name": agent.name,
                "agent_type": agent.extra.get("langchain_agent_type", "AgentExecutor"),
                "llm": {"model": agent.model},
                "tools": [{"name": t} for t in agent.tools],
                "description": agent.description,
            })
        return {
            "team_name": spec.team_name,
            "description": spec.description,
            "agents": agents,
        }
