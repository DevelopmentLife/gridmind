"""Tests for gridmind status command."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from click.testing import CliRunner

from gridmind_cli.main import cli


@pytest.fixture
def runner() -> CliRunner:
    return CliRunner(mix_stderr=False)


class TestStatusCommand:
    """Test the status CLI command."""

    @patch("gridmind_cli.commands.status.GridMindClient")
    @patch("gridmind_cli.commands.status.get_profile")
    def test_status_shows_agents(
        self, mock_get_profile: MagicMock, mock_client_cls: MagicMock,
        runner: CliRunner,
    ) -> None:
        from gridmind_cli.config import ProfileConfig
        mock_get_profile.return_value = ProfileConfig(api_url="http://test", token="t")
        mock_client = MagicMock()
        mock_client.get.return_value = {
            "items": [
                {
                    "agentName": "argus",
                    "displayName": "ARGUS",
                    "status": "healthy",
                    "tier": "perception",
                    "model": "claude-haiku-4-5",
                    "tasksInFlight": 2,
                    "uptimeSeconds": 3600,
                },
            ],
        }
        mock_client_cls.return_value = mock_client

        result = runner.invoke(cli, ["status"])
        assert result.exit_code == 0
        assert "ARGUS" in result.output

    @patch("gridmind_cli.commands.status.GridMindClient")
    @patch("gridmind_cli.commands.status.get_profile")
    def test_status_with_team_filter(
        self, mock_get_profile: MagicMock, mock_client_cls: MagicMock,
        runner: CliRunner,
    ) -> None:
        from gridmind_cli.config import ProfileConfig
        mock_get_profile.return_value = ProfileConfig(api_url="http://test", token="t")
        mock_client = MagicMock()
        mock_client.get.return_value = {"items": []}
        mock_client_cls.return_value = mock_client

        result = runner.invoke(cli, ["status", "my-team"])
        assert result.exit_code == 0
        mock_client.get.assert_called_once_with("/api/v1/agents", params={"team": "my-team"})

    @patch("gridmind_cli.commands.status.GridMindClient")
    @patch("gridmind_cli.commands.status.get_profile")
    def test_status_empty(
        self, mock_get_profile: MagicMock, mock_client_cls: MagicMock,
        runner: CliRunner,
    ) -> None:
        from gridmind_cli.config import ProfileConfig
        mock_get_profile.return_value = ProfileConfig(api_url="http://test", token="t")
        mock_client = MagicMock()
        mock_client.get.return_value = {"items": []}
        mock_client_cls.return_value = mock_client

        result = runner.invoke(cli, ["status"])
        assert result.exit_code == 0
        assert "No agents found" in result.output
