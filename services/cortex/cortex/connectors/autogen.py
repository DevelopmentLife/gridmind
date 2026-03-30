"""AutoGen connector — stub, not yet available."""

from __future__ import annotations

from typing import Any

from cortex.connectors.base import FrameworkConnector, FrameworkNotAvailableError
from cortex.connectors.team_config import AgentTeamSpec


class AutoGenConnector(FrameworkConnector):
    """Stub connector for Microsoft AutoGen framework integration.

    AutoGen support is planned but not yet implemented.
    All import/export operations raise FrameworkNotAvailableError.
    """

    NAME = "autogen"
    STATUS = "coming_soon"

    def import_config(self, source: str | dict[str, Any]) -> AgentTeamSpec:
        """Import is not available for AutoGen.

        Raises:
            FrameworkNotAvailableError: Always.
        """
        raise FrameworkNotAvailableError(self.NAME, self.STATUS)

    def export_config(self, spec: AgentTeamSpec) -> dict[str, Any]:
        """Export is not available for AutoGen.

        Raises:
            FrameworkNotAvailableError: Always.
        """
        raise FrameworkNotAvailableError(self.NAME, self.STATUS)
