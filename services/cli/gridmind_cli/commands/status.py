"""gridmind status [team] — show agent fleet status as a rich table."""

from __future__ import annotations

from typing import Any

import click

from gridmind_cli.api_client import APIError, GridMindClient
from gridmind_cli.config import get_profile
from gridmind_cli.formatters import agent_status_table, console, error_panel


@click.command("status")
@click.argument("team", required=False, default=None)
@click.pass_context
def status(ctx: click.Context, team: str | None) -> None:
    """Show the status of all agents, optionally filtered by TEAM name."""
    profile = get_profile(ctx.obj.get("profile"))
    client = GridMindClient(profile)
    try:
        params: dict[str, Any] = {}
        if team:
            params["team"] = team
        data = client.get("/api/v1/agents", params=params)
        agents: list[dict[str, Any]] = data.get("items", [])
        if not agents:
            console.print("[yellow]No agents found.[/yellow]")
            return
        console.print(agent_status_table(agents))
    except APIError as exc:
        console.print(error_panel(f"[{exc.status_code}] {exc.code}: {exc.message}"))
        raise SystemExit(1) from exc
    finally:
        client.close()
