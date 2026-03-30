"""gridmind cost [--period 7d] — display cost summary as a rich table."""

from __future__ import annotations

from typing import Any

import click

from gridmind_cli.api_client import APIError, GridMindClient
from gridmind_cli.config import get_profile
from gridmind_cli.formatters import console, cost_table, error_panel


@click.command("cost")
@click.option("--period", default="7d", show_default=True, help="Time period (e.g., 1d, 7d, 30d).")
@click.option("--group-by", default="agent", show_default=True, help="Group by: agent, deployment, model.")
@click.pass_context
def cost(ctx: click.Context, period: str, group_by: str) -> None:
    """Display cost summary for the current organization."""
    profile = get_profile(ctx.obj.get("profile"))
    client = GridMindClient(profile)
    try:
        params: dict[str, Any] = {"period": period, "group_by": group_by}
        data = client.get("/api/v1/cost/summary", params=params)
        rows: list[dict[str, Any]] = data.get("items", [])
        if not rows:
            console.print("[yellow]No cost data for the selected period.[/yellow]")
            return
        console.print(cost_table(rows, title=f"Cost Summary ({period})"))

        total = sum(r.get("totalCostUsd", 0) for r in rows)
        console.print(f"\n[bold]Total:[/bold] [green]${total:.4f}[/green]")
    except APIError as exc:
        console.print(error_panel(f"[{exc.status_code}] {exc.code}: {exc.message}"))
        raise SystemExit(1) from exc
    finally:
        client.close()
