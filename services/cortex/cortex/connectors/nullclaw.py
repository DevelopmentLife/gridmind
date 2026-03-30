"""NullClaw native connector — validate and import/export YAML team configs."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml

from cortex.connectors.base import FrameworkConnector
from cortex.connectors.team_config import AgentSpec, AgentTeamSpec


class NullClawConnector(FrameworkConnector):
    """Connector for the GridMind native (NullClaw) YAML format.

    The NullClaw format is the canonical team configuration format used
    internally by GridMind. It maps 1:1 to the AgentTeamSpec model.
    """

    NAME = "nullclaw"
    STATUS = "available"

    def import_config(self, source: str | dict[str, Any]) -> AgentTeamSpec:
        """Import a NullClaw YAML file or dict into an AgentTeamSpec.

        Args:
            source: Path to a YAML file, or a pre-parsed dict.

        Returns:
            The validated AgentTeamSpec.

        Raises:
            FileNotFoundError: If the source path does not exist.
            ValueError: If the YAML is invalid or fails validation.
        """
        if isinstance(source, str):
            path = Path(source)
            if not path.exists():
                raise FileNotFoundError(f"NullClaw config not found: {source}")
            raw: dict[str, Any] = yaml.safe_load(path.read_text()) or {}
        else:
            raw = source

        try:
            spec = AgentTeamSpec.model_validate(raw)
        except Exception as exc:
            raise ValueError(f"Invalid NullClaw config: {exc}") from exc

        spec.source_framework = "nullclaw"
        return spec

    def export_config(self, spec: AgentTeamSpec) -> dict[str, Any]:
        """Export an AgentTeamSpec to a NullClaw-format dict.

        Args:
            spec: The team specification.

        Returns:
            A dict suitable for YAML serialization.
        """
        return spec.model_dump(mode="json")

    def export_yaml(self, spec: AgentTeamSpec) -> str:
        """Export an AgentTeamSpec to a YAML string.

        Args:
            spec: The team specification.

        Returns:
            YAML-formatted string.
        """
        return yaml.dump(self.export_config(spec), default_flow_style=False)
