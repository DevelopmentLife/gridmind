"""Claude Code Agent Teams connector — parse .claude/agents/*.yaml files."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml

from cortex.connectors.base import FrameworkConnector
from cortex.connectors.team_config import AgentSpec, AgentTeamSpec


def _parse_claude_agent_yaml(raw: dict[str, Any], index: int = 0) -> AgentSpec:
    """Convert a single Claude Code agent YAML entry to an AgentSpec.

    Args:
        raw: Parsed YAML dict for a single agent definition.
        index: Fallback index for unnamed agents.

    Returns:
        An AgentSpec.
    """
    name = raw.get("name", raw.get("id", f"claude_agent_{index}"))
    model_raw = raw.get("model", "sonnet")
    model_map: dict[str, str] = {
        "haiku": "claude-haiku-4-5",
        "sonnet": "claude-sonnet-4-6",
        "opus": "claude-opus-4-6",
    }
    model = model_map.get(model_raw, model_raw)

    tools: list[str] = []
    for t in raw.get("tools", []):
        if isinstance(t, str):
            tools.append(t)
        elif isinstance(t, dict):
            tools.append(t.get("name", "unknown"))

    return AgentSpec(
        name=name,
        display_name=name.upper(),
        tier=raw.get("tier", "reasoning"),
        model=model,
        autonomy=raw.get("autonomy", "supervised"),
        tools=tools,
        description=raw.get("description", raw.get("prompt", "")[:100]),
        extra={"claude_code_prompt": raw.get("prompt", "")},
    )


class ClaudeCodeConnector(FrameworkConnector):
    """Import Claude Code Agent Teams configurations.

    Reads YAML files from a ``.claude/agents/`` directory or accepts a dict
    representation of the team.
    """

    NAME = "claude_code"
    STATUS = "available"

    def import_config(self, source: str | dict[str, Any]) -> AgentTeamSpec:
        """Import Claude Code agent YAML files or a dict.

        Args:
            source: Path to a ``.claude/agents/`` directory or a YAML file,
                    or a pre-parsed dict with a ``team_name`` and ``agents`` key.

        Returns:
            The normalized AgentTeamSpec.

        Raises:
            FileNotFoundError: If the source path does not exist.
            ValueError: If the config is invalid.
        """
        if isinstance(source, dict):
            agents_raw = source.get("agents", [])
            agents = [_parse_claude_agent_yaml(a, i) for i, a in enumerate(agents_raw)]
            return AgentTeamSpec(
                team_name=source.get("team_name", "claude-code-team"),
                description=source.get("description", ""),
                agents=agents,
                source_framework="claude_code",
            )

        path = Path(source)
        if not path.exists():
            raise FileNotFoundError(f"Claude Code config not found: {source}")

        agents: list[AgentSpec] = []
        if path.is_dir():
            yaml_files = sorted(path.glob("*.yaml")) + sorted(path.glob("*.yml"))
            for idx, yf in enumerate(yaml_files):
                raw: dict[str, Any] = yaml.safe_load(yf.read_text()) or {}
                agents.append(_parse_claude_agent_yaml(raw, idx))
            team_name = path.parent.parent.name or "claude-code-team"
        else:
            raw = yaml.safe_load(path.read_text()) or {}
            if "agents" in raw:
                for idx, a in enumerate(raw["agents"]):
                    agents.append(_parse_claude_agent_yaml(a, idx))
            else:
                agents.append(_parse_claude_agent_yaml(raw, 0))
            team_name = raw.get("team_name", path.stem)

        if not agents:
            raise ValueError("No agents found in Claude Code config.")

        return AgentTeamSpec(
            team_name=team_name,
            agents=agents,
            source_framework="claude_code",
        )

    def export_config(self, spec: AgentTeamSpec) -> dict[str, Any]:
        """Export an AgentTeamSpec to Claude Code agent format.

        Args:
            spec: The team specification.

        Returns:
            A dict with agent definitions.
        """
        model_reverse: dict[str, str] = {
            "claude-haiku-4-5": "haiku",
            "claude-sonnet-4-6": "sonnet",
            "claude-opus-4-6": "opus",
        }
        agents: list[dict[str, Any]] = []
        for a in spec.agents:
            agents.append({
                "name": a.name,
                "model": model_reverse.get(a.model, a.model),
                "tools": a.tools,
                "description": a.description,
                "prompt": a.extra.get("claude_code_prompt", a.description),
            })
        return {
            "team_name": spec.team_name,
            "agents": agents,
        }
