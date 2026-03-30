"""Tests for gridmind deploy command."""

from __future__ import annotations

import os
import tempfile
from unittest.mock import MagicMock, patch

import pytest
import yaml
from click.testing import CliRunner

from gridmind_cli.commands.deploy import TeamSpec, _parse_team_yaml
from gridmind_cli.main import cli


@pytest.fixture
def runner() -> CliRunner:
    return CliRunner(mix_stderr=False)


@pytest.fixture
def valid_team_yaml(tmp_path: object) -> str:
    """Write a valid team YAML to a temp file and return its path."""
    import pathlib
    p = pathlib.Path(str(tmp_path)) / "team.yaml"
    data = {
        "team_name": "test-team",
        "description": "A test team",
        "agents": [
            {"name": "argus", "model": "claude-haiku-4-5", "tier": "perception"},
            {"name": "sherlock", "model": "claude-sonnet-4-6", "tier": "reasoning"},
        ],
    }
    p.write_text(yaml.dump(data))
    return str(p)


class TestTeamSpecValidation:
    """Test YAML parsing and Pydantic validation."""

    def test_valid_team_spec(self, valid_team_yaml: str) -> None:
        from pathlib import Path
        spec = _parse_team_yaml(Path(valid_team_yaml))
        assert spec.team_name == "test-team"
        assert len(spec.agents) == 2

    def test_missing_agents_raises(self, tmp_path: object) -> None:
        import pathlib
        p = pathlib.Path(str(tmp_path)) / "bad.yaml"
        p.write_text(yaml.dump({"team_name": "x"}))
        with pytest.raises(Exception):
            _parse_team_yaml(p)

    def test_file_not_found_raises(self) -> None:
        from pathlib import Path
        with pytest.raises(Exception, match="File not found"):
            _parse_team_yaml(Path("/nonexistent/team.yaml"))

    def test_empty_agents_raises(self, tmp_path: object) -> None:
        import pathlib
        p = pathlib.Path(str(tmp_path)) / "empty.yaml"
        p.write_text(yaml.dump({"team_name": "x", "agents": []}))
        with pytest.raises(Exception):
            _parse_team_yaml(p)


class TestDeployCommand:
    """Test the deploy CLI command."""

    @patch("gridmind_cli.commands.deploy.GridMindClient")
    @patch("gridmind_cli.commands.deploy.get_profile")
    def test_deploy_success(
        self, mock_get_profile: MagicMock, mock_client_cls: MagicMock,
        runner: CliRunner, valid_team_yaml: str,
    ) -> None:
        from gridmind_cli.config import ProfileConfig
        mock_get_profile.return_value = ProfileConfig(api_url="http://test", token="t")
        mock_client = MagicMock()
        mock_client.post.return_value = {"deploymentId": "dep-123", "status": "submitted"}
        mock_client_cls.return_value = mock_client

        result = runner.invoke(cli, ["deploy", valid_team_yaml])
        assert result.exit_code == 0
        mock_client.post.assert_called_once()

    @patch("gridmind_cli.commands.deploy.GridMindClient")
    @patch("gridmind_cli.commands.deploy.get_profile")
    def test_deploy_api_error(
        self, mock_get_profile: MagicMock, mock_client_cls: MagicMock,
        runner: CliRunner, valid_team_yaml: str,
    ) -> None:
        from gridmind_cli.api_client import APIError
        from gridmind_cli.config import ProfileConfig
        mock_get_profile.return_value = ProfileConfig(api_url="http://test", token="t")
        mock_client = MagicMock()
        mock_client.post.side_effect = APIError(500, "INTERNAL_ERROR", "boom")
        mock_client_cls.return_value = mock_client

        result = runner.invoke(cli, ["deploy", valid_team_yaml])
        assert result.exit_code != 0
