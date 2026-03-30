"""gridmind logs <agent> [--follow] [--lines 50] — stream or fetch agent logs."""

from __future__ import annotations

import time
from typing import Any

import click

from gridmind_cli.api_client import APIError, GridMindClient
from gridmind_cli.config import get_profile
from gridmind_cli.formatters import console, error_panel


def _print_log_lines(lines: list[dict[str, Any]]) -> None:
    """Print structured log entries."""
    for entry in lines:
        ts = entry.get("timestamp", "")
        level = entry.get("level", "INFO")
        msg = entry.get("message", "")
        style = "red" if level == "ERROR" else "yellow" if level == "WARN" else "dim"
        console.print(f"[dim]{ts}[/dim] [{style}]{level:5s}[/{style}] {msg}")


@click.command("logs")
@click.argument("agent")
@click.option("--follow", "-f", is_flag=True, help="Stream logs in real-time.")
@click.option("--lines", "-n", default=50, show_default=True, help="Number of log lines to fetch.")
@click.pass_context
def logs(ctx: click.Context, agent: str, follow: bool, lines: int) -> None:
    """Fetch or stream logs for a specific AGENT.

    AGENT is the agent name (e.g., argus, sherlock).
    """
    profile = get_profile(ctx.obj.get("profile"))
    client = GridMindClient(profile)
    try:
        params: dict[str, Any] = {"agent": agent, "limit": lines}
        data = client.get("/api/v1/agents/logs", params=params)
        entries: list[dict[str, Any]] = data.get("items", [])
        _print_log_lines(entries)

        if follow:
            cursor = data.get("next_cursor")
            console.print("[dim]Following logs (Ctrl+C to stop)...[/dim]")
            try:
                while True:
                    time.sleep(2)
                    poll_params: dict[str, Any] = {"agent": agent, "limit": 20}
                    if cursor:
                        poll_params["cursor"] = cursor
                    data = client.get("/api/v1/agents/logs", params=poll_params)
                    new_entries: list[dict[str, Any]] = data.get("items", [])
                    _print_log_lines(new_entries)
                    cursor = data.get("next_cursor") or cursor
            except KeyboardInterrupt:
                console.print("\n[dim]Stopped following logs.[/dim]")
    except APIError as exc:
        console.print(error_panel(f"[{exc.status_code}] {exc.code}: {exc.message}"))
        raise SystemExit(1) from exc
    finally:
        client.close()
