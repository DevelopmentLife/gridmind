"""gridmind deploy <team.yaml> — read YAML, validate, POST to API, show progress."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import click
import yaml
from pydantic import BaseModel, Field, ValidationError
from rich.progress import Progress, SpinnerColumn, TextColumn

from gridmind_cli.api_client import APIError, GridMindClient
from gridmind_cli.config import get_profile
from gridmind_cli.formatters import console, error_panel, info_panel


class AgentSpec(BaseModel):
    """Specification for a single agent in a team YAML."""

    name: str = Field(..., min_length=1, max_length=100)
    model: str = Field(default="claude-sonnet-4-6")
    tier: str = Field(default="reasoning")
    tools: list[str] = Field(default_factory=list)


class TeamSpec(BaseModel):
    """Root schema for a team deployment YAML file."""

    team_name: str = Field(..., min_length=1, max_length=255)
    description: str = Field(default="")
    agents: list[AgentSpec] = Field(..., min_length=1)
    deployment_id: str | None = Field(default=None)


def _parse_team_yaml(filepath: Path) -> TeamSpec:
    """Parse and validate a team YAML file.

    Args:
        filepath: Path to the YAML file.

    Returns:
        Validated TeamSpec.

    Raises:
        click.ClickException: On file-not-found or validation error.
    """
    if not filepath.exists():
        raise click.ClickException(f"File not found: {filepath}")
    raw: dict[str, Any] = yaml.safe_load(filepath.read_text()) or {}
    try:
        return TeamSpec.model_validate(raw)
    except ValidationError as exc:
        raise click.ClickException(f"Invalid team YAML: {exc}") from exc


@click.command("deploy")
@click.argument("team_yaml", type=click.Path(exists=False))
@click.pass_context
def deploy(ctx: click.Context, team_yaml: str) -> None:
    """Deploy an agent team from a YAML specification file.

    TEAM_YAML is the path to a team specification YAML file.
    """
    profile = get_profile(ctx.obj.get("profile"))
    filepath = Path(team_yaml)
    spec = _parse_team_yaml(filepath)

    console.print(info_panel("Deploying Team", f"[cyan]{spec.team_name}[/cyan] ({len(spec.agents)} agents)"))

    client = GridMindClient(profile)
    try:
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console,
        ) as progress:
            task = progress.add_task("Submitting deployment...", total=None)
            payload = spec.model_dump(mode="json")
            result = client.post("/api/v1/deployments/teams", json=payload)
            progress.update(task, description="Deployment submitted.")

        console.print(f"[green]Deployment ID:[/green] {result.get('deploymentId', 'N/A')}")
        console.print(f"[green]Status:[/green] {result.get('status', 'submitted')}")
    except APIError as exc:
        console.print(error_panel(f"[{exc.status_code}] {exc.code}: {exc.message}"))
        raise SystemExit(1) from exc
    finally:
        client.close()
