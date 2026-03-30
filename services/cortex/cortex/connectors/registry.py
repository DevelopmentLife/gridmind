"""Connector registry — central lookup for all framework connectors."""

from __future__ import annotations

from typing import Any

from cortex.connectors.autogen import AutoGenConnector
from cortex.connectors.base import FrameworkConnector
from cortex.connectors.claude_code import ClaudeCodeConnector
from cortex.connectors.crewai import CrewAIConnector
from cortex.connectors.langchain import LangChainConnector
from cortex.connectors.nullclaw import NullClawConnector

CONNECTOR_REGISTRY: dict[str, FrameworkConnector] = {
    "nullclaw": NullClawConnector(),
    "langchain": LangChainConnector(),
    "claude_code": ClaudeCodeConnector(),
    "crewai": CrewAIConnector(),
    "autogen": AutoGenConnector(),
}


def get_connector(name: str) -> FrameworkConnector:
    """Retrieve a connector by name.

    Args:
        name: The connector identifier (e.g. ``nullclaw``, ``langchain``).

    Returns:
        The FrameworkConnector instance.

    Raises:
        KeyError: If the connector name is not registered.
    """
    connector = CONNECTOR_REGISTRY.get(name)
    if connector is None:
        raise KeyError(f"Unknown connector: '{name}'. Available: {list(CONNECTOR_REGISTRY.keys())}")
    return connector


def list_connectors() -> list[dict[str, Any]]:
    """List all registered connectors with their status.

    Returns:
        A list of dicts with ``name`` and ``status`` keys.
    """
    return [
        {"name": c.NAME, "status": c.STATUS}
        for c in CONNECTOR_REGISTRY.values()
    ]
