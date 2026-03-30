"""gridmind teams list — show agent teams as a rich table."""

from __future__ import annotations

from typing import Any

import click

from gridmind_cli.api_client import APIError, GridMindClient
from gridmind_cli.config import get_profile
from gridmind_cli.formatters import console, error_panel, teams_table


@click.group("teams")
def teams() -> None:
    """Manage agent teams."""


@teams.command("list")
@click.pass_context
def teams_list(ctx: click.Context) -> None:
    """List all agent teams for the current organization."""
    profile = get_profile(ctx.obj.get("profile"))
    client = GridMindClient(profile)
    try:
        data = client.get("/api/v1/agents/teams")
        items: list[dict[str, Any]] = data.get("items", [])
        if not items:
            console.print("[yellow]No teams found.[/yellow]")
            return
        console.print(teams_table(items))
    except APIError as exc:
        console.print(error_panel(f"[{exc.status_code}] {exc.code}: {exc.message}"))
        raise SystemExit(1) from exc
    finally:
        client.close()
