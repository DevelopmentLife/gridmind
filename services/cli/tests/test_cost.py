"""Tests for gridmind cost command."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from click.testing import CliRunner

from gridmind_cli.main import cli


@pytest.fixture
def runner() -> CliRunner:
    return CliRunner(mix_stderr=False)


class TestCostCommand:
    """Test the cost CLI command."""

    @patch("gridmind_cli.commands.cost.GridMindClient")
    @patch("gridmind_cli.commands.cost.get_profile")
    def test_cost_default_period(
        self, mock_get_profile: MagicMock, mock_client_cls: MagicMock,
        runner: CliRunner,
    ) -> None:
        from gridmind_cli.config import ProfileConfig
        mock_get_profile.return_value = ProfileConfig(api_url="http://test", token="t")
        mock_client = MagicMock()
        mock_client.get.return_value = {
            "items": [
                {"group": "argus", "totalDecisions": 100, "totalTokens": 5000, "totalCostUsd": 0.0125},
                {"group": "sherlock", "totalDecisions": 50, "totalTokens": 12000, "totalCostUsd": 0.045},
            ],
        }
        mock_client_cls.return_value = mock_client

        result = runner.invoke(cli, ["cost"])
        assert result.exit_code == 0
        assert "argus" in result.output
        mock_client.get.assert_called_once_with(
            "/api/v1/cost/summary",
            params={"period": "7d", "group_by": "agent"},
        )

    @patch("gridmind_cli.commands.cost.GridMindClient")
    @patch("gridmind_cli.commands.cost.get_profile")
    def test_cost_custom_period(
        self, mock_get_profile: MagicMock, mock_client_cls: MagicMock,
        runner: CliRunner,
    ) -> None:
        from gridmind_cli.config import ProfileConfig
        mock_get_profile.return_value = ProfileConfig(api_url="http://test", token="t")
        mock_client = MagicMock()
        mock_client.get.return_value = {"items": []}
        mock_client_cls.return_value = mock_client

        result = runner.invoke(cli, ["cost", "--period", "30d"])
        assert result.exit_code == 0
        mock_client.get.assert_called_once_with(
            "/api/v1/cost/summary",
            params={"period": "30d", "group_by": "agent"},
        )

    @patch("gridmind_cli.commands.cost.GridMindClient")
    @patch("gridmind_cli.commands.cost.get_profile")
    def test_cost_empty_data(
        self, mock_get_profile: MagicMock, mock_client_cls: MagicMock,
        runner: CliRunner,
    ) -> None:
        from gridmind_cli.config import ProfileConfig
        mock_get_profile.return_value = ProfileConfig(api_url="http://test", token="t")
        mock_client = MagicMock()
        mock_client.get.return_value = {"items": []}
        mock_client_cls.return_value = mock_client

        result = runner.invoke(cli, ["cost"])
        assert result.exit_code == 0
        assert "No cost data" in result.output
