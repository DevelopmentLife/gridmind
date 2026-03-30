"""Rich formatters — reusable tables and panels for CLI output."""

from __future__ import annotations

from typing import Any

from rich.console import Console
from rich.panel import Panel
from rich.table import Table

console = Console()


def agent_status_table(agents: list[dict[str, Any]]) -> Table:
    """Build a Rich table showing agent fleet status.

    Args:
        agents: List of agent dicts with keys agentName, status, tier,
                model, tasksInFlight, uptimeSeconds.

    Returns:
        A Rich Table ready for printing.
    """
    table = Table(title="Agent Fleet Status", show_lines=True)
    table.add_column("Agent", style="cyan", no_wrap=True)
    table.add_column("Status", justify="center")
    table.add_column("Tier", style="magenta")
    table.add_column("Model", style="dim")
    table.add_column("Tasks", justify="right")
    table.add_column("Uptime", justify="right")

    for a in agents:
        status_str = a.get("status", "unknown")
        style = "green" if status_str == "healthy" else "red"
        uptime_s = a.get("uptimeSeconds", 0)
        uptime_h = f"{uptime_s / 3600:.1f}h"
        table.add_row(
            a.get("displayName", a.get("agentName", "?")),
            f"[{style}]{status_str}[/{style}]",
            a.get("tier", ""),
            a.get("model", ""),
            str(a.get("tasksInFlight", 0)),
            uptime_h,
        )
    return table


def cost_table(rows: list[dict[str, Any]], title: str = "Cost Summary") -> Table:
    """Build a Rich table for cost data.

    Args:
        rows: List of dicts with keys group, totalDecisions, totalTokens,
              totalCostUsd.
        title: Table title.

    Returns:
        A Rich Table ready for printing.
    """
    table = Table(title=title, show_lines=True)
    table.add_column("Group", style="cyan")
    table.add_column("Decisions", justify="right")
    table.add_column("Tokens", justify="right")
    table.add_column("Cost (USD)", justify="right", style="green")

    for r in rows:
        table.add_row(
            r.get("group", ""),
            f"{r.get('totalDecisions', 0):,}",
            f"{r.get('totalTokens', 0):,}",
            f"${r.get('totalCostUsd', 0):.4f}",
        )
    return table


def teams_table(team_list: list[dict[str, Any]]) -> Table:
    """Build a Rich table for agent teams.

    Args:
        team_list: List of team dicts with keys name, agentCount, status.

    Returns:
        A Rich Table ready for printing.
    """
    table = Table(title="Agent Teams", show_lines=True)
    table.add_column("Team", style="cyan")
    table.add_column("Agents", justify="right")
    table.add_column("Status", justify="center")

    for t in team_list:
        status_str = t.get("status", "unknown")
        style = "green" if status_str == "active" else "yellow"
        table.add_row(
            t.get("name", ""),
            str(t.get("agentCount", 0)),
            f"[{style}]{status_str}[/{style}]",
        )
    return table


def info_panel(title: str, content: str) -> Panel:
    """Create a Rich panel for informational messages.

    Args:
        title: Panel title.
        content: Panel body text.

    Returns:
        A Rich Panel.
    """
    return Panel(content, title=title, border_style="blue")


def error_panel(message: str) -> Panel:
    """Create a Rich panel for error messages.

    Args:
        message: Error description.

    Returns:
        A Rich Panel styled for errors.
    """
    return Panel(f"[red]{message}[/red]", title="Error", border_style="red")
