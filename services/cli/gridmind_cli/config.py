"""Configuration management — reads/writes ~/.gridmind/config.yaml."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml
from pydantic import BaseModel, Field

_CONFIG_DIR = Path.home() / ".gridmind"
_CONFIG_FILE = _CONFIG_DIR / "config.yaml"


class ProfileConfig(BaseModel):
    """A single CLI profile with API endpoint and auth token."""

    api_url: str = Field(default="https://api.gridmindai.dev")
    token: str | None = Field(default=None)
    org_id: str | None = Field(default=None)


class CLIConfig(BaseModel):
    """Root configuration containing named profiles."""

    profiles: dict[str, ProfileConfig] = Field(default_factory=lambda: {
        "default": ProfileConfig(),
    })
    active_profile: str = Field(default="default")


def config_dir() -> Path:
    """Return the GridMind config directory, creating it if needed."""
    _CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    return _CONFIG_DIR


def load_config() -> CLIConfig:
    """Load CLI configuration from disk.

    Returns:
        The parsed CLIConfig, or a default configuration if the file
        does not exist.
    """
    if not _CONFIG_FILE.exists():
        return CLIConfig()
    raw: dict[str, Any] = yaml.safe_load(_CONFIG_FILE.read_text()) or {}
    return CLIConfig.model_validate(raw)


def save_config(cfg: CLIConfig) -> None:
    """Persist CLIConfig to ~/.gridmind/config.yaml.

    Args:
        cfg: The configuration to write.
    """
    config_dir()
    _CONFIG_FILE.write_text(yaml.dump(cfg.model_dump(), default_flow_style=False))


def get_profile(name: str | None = None) -> ProfileConfig:
    """Retrieve a profile by name (defaults to active profile).

    Args:
        name: Profile name. Falls back to active_profile when None.

    Returns:
        The matching ProfileConfig.

    Raises:
        click.ClickException: If the profile does not exist.
    """
    import click

    cfg = load_config()
    profile_name = name or cfg.active_profile
    profile = cfg.profiles.get(profile_name)
    if profile is None:
        raise click.ClickException(f"Profile '{profile_name}' not found.")
    return profile
