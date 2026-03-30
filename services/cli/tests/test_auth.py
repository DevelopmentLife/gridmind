"""Tests for gridmind auth login/logout/whoami commands."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from click.testing import CliRunner

from gridmind_cli.config import CLIConfig, ProfileConfig
from gridmind_cli.main import cli


@pytest.fixture
def runner() -> CliRunner:
    return CliRunner(mix_stderr=False)


class TestAuthLogin:
    """Test the auth login command."""

    @patch("gridmind_cli.commands.auth.save_config")
    @patch("gridmind_cli.commands.auth.load_config")
    @patch("gridmind_cli.commands.auth.GridMindClient")
    def test_login_success(
        self, mock_client_cls: MagicMock, mock_load: MagicMock,
        mock_save: MagicMock, runner: CliRunner,
    ) -> None:
        mock_load.return_value = CLIConfig()
        mock_client = MagicMock()
        mock_client.post.return_value = {"access_token": "tok-abc", "org_id": "org-1"}
        mock_client_cls.return_value = mock_client

        result = runner.invoke(cli, ["auth", "login"], input="user@test.com\nsecret\n")
        assert result.exit_code == 0
        assert "Login Successful" in result.output
        mock_save.assert_called_once()

    @patch("gridmind_cli.commands.auth.load_config")
    @patch("gridmind_cli.commands.auth.GridMindClient")
    def test_login_api_failure(
        self, mock_client_cls: MagicMock, mock_load: MagicMock,
        runner: CliRunner,
    ) -> None:
        from gridmind_cli.api_client import APIError
        mock_load.return_value = CLIConfig()
        mock_client = MagicMock()
        mock_client.post.side_effect = APIError(401, "AUTHENTICATION_ERROR", "Bad creds")
        mock_client_cls.return_value = mock_client

        result = runner.invoke(cli, ["auth", "login"], input="user@test.com\nwrong\n")
        assert result.exit_code != 0


class TestAuthLogout:
    """Test the auth logout command."""

    @patch("gridmind_cli.commands.auth.save_config")
    @patch("gridmind_cli.commands.auth.load_config")
    def test_logout_clears_token(
        self, mock_load: MagicMock, mock_save: MagicMock, runner: CliRunner,
    ) -> None:
        cfg = CLIConfig()
        cfg.profiles["default"].token = "old-token"
        mock_load.return_value = cfg

        result = runner.invoke(cli, ["auth", "logout"])
        assert result.exit_code == 0
        assert "Logged Out" in result.output
        mock_save.assert_called_once()


class TestAuthWhoami:
    """Test the auth whoami command."""

    @patch("gridmind_cli.commands.auth.GridMindClient")
    @patch("gridmind_cli.commands.auth.get_profile")
    def test_whoami_shows_user(
        self, mock_get_profile: MagicMock, mock_client_cls: MagicMock,
        runner: CliRunner,
    ) -> None:
        mock_get_profile.return_value = ProfileConfig(
            api_url="http://test", token="tok",
        )
        mock_client = MagicMock()
        mock_client.get.return_value = {
            "email": "user@test.com",
            "org_name": "TestOrg",
            "role": "admin",
        }
        mock_client_cls.return_value = mock_client

        result = runner.invoke(cli, ["auth", "whoami"])
        assert result.exit_code == 0
        assert "user@test.com" in result.output

    @patch("gridmind_cli.commands.auth.get_profile")
    def test_whoami_not_authenticated(
        self, mock_get_profile: MagicMock, runner: CliRunner,
    ) -> None:
        mock_get_profile.return_value = ProfileConfig(api_url="http://test", token=None)
        result = runner.invoke(cli, ["auth", "whoami"])
        assert result.exit_code == 0
        assert "Not authenticated" in result.output
