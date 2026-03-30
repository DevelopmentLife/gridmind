"""Shared test fixtures for the GridMind CLI test suite."""

from __future__ import annotations

from typing import Any
from unittest.mock import MagicMock, patch

import pytest
from click.testing import CliRunner

from gridmind_cli.api_client import GridMindClient
from gridmind_cli.config import ProfileConfig


@pytest.fixture
def runner() -> CliRunner:
    """Provide a Click CliRunner for invoking commands."""
    return CliRunner(mix_stderr=False)


@pytest.fixture
def mock_profile() -> ProfileConfig:
    """Provide a test ProfileConfig."""
    return ProfileConfig(api_url="https://test.gridmindai.dev", token="test-token-123")


@pytest.fixture
def mock_client(mock_profile: ProfileConfig) -> MagicMock:
    """Provide a mocked GridMindClient."""
    client = MagicMock(spec=GridMindClient)
    return client


@pytest.fixture
def patch_get_profile(mock_profile: ProfileConfig) -> Any:
    """Patch get_profile to return the mock profile."""
    with patch("gridmind_cli.config.get_profile", return_value=mock_profile) as p:
        yield p
