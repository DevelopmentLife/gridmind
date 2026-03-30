"""CLI entry point — click group that registers all subcommands."""

from __future__ import annotations

import click

from gridmind_cli import __version__
from gridmind_cli.commands.auth import auth
from gridmind_cli.commands.cost import cost
from gridmind_cli.commands.deploy import deploy
from gridmind_cli.commands.logs import logs
from gridmind_cli.commands.status import status
from gridmind_cli.commands.teams import teams


@click.group()
@click.version_option(version=__version__, prog_name="gridmind")
@click.option(
    "--profile",
    default="default",
    help="Configuration profile name.",
    envvar="GRIDMIND_PROFILE",
)
@click.pass_context
def cli(ctx: click.Context, profile: str) -> None:
    """GridMind CLI — manage agent teams, deployments, costs, and auth."""
    ctx.ensure_object(dict)
    ctx.obj["profile"] = profile


cli.add_command(deploy)
cli.add_command(status)
cli.add_command(logs)
cli.add_command(cost)
cli.add_command(teams)
cli.add_command(auth)


if __name__ == "__main__":
    cli()
