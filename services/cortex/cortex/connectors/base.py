"""Abstract base class for all framework connectors."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from cortex.connectors.team_config import AgentTeamSpec


class FrameworkNotAvailableError(Exception):
    """Raised when a connector framework is not yet supported.

    Attributes:
        framework: The framework identifier that is unavailable.
        status: Current availability status (e.g. ``coming_soon``).
    """

    def __init__(self, framework: str, status: str = "coming_soon") -> None:
        super().__init__(f"Framework '{framework}' is not available (status: {status}).")
        self.framework = framework
        self.status = status


class FrameworkConnector(ABC):
    """Abstract base for importing/exporting agent team configurations.

    Every concrete connector must declare its ``NAME`` and ``STATUS``, and
    implement ``import_config`` and ``export_config``.
    """

    NAME: str = ""
    STATUS: str = "available"  # available | coming_soon | deprecated

    @abstractmethod
    def import_config(self, source: str | dict[str, Any]) -> AgentTeamSpec:
        """Import a team configuration from an external framework format.

        Args:
            source: Either a file path (str) or a parsed dict.

        Returns:
            A normalized AgentTeamSpec.
        """

    @abstractmethod
    def export_config(self, spec: AgentTeamSpec) -> dict[str, Any]:
        """Export a team configuration to the external framework format.

        Args:
            spec: The normalized AgentTeamSpec.

        Returns:
            A dict representing the framework-native configuration.
        """

    def validate(self, source: str | dict[str, Any]) -> list[str]:
        """Validate a source configuration and return a list of issues.

        Args:
            source: Either a file path or parsed dict.

        Returns:
            List of validation error messages (empty if valid).
        """
        errors: list[str] = []
        try:
            self.import_config(source)
        except Exception as exc:
            errors.append(str(exc))
        return errors
