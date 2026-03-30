"""gridmind auth login/logout/whoami — authentication management."""

from __future__ import annotations

import click

from gridmind_cli.api_client import APIError, GridMindClient
from gridmind_cli.config import (
    CLIConfig,
    ProfileConfig,
    get_profile,
    load_config,
    save_config,
)
from gridmind_cli.formatters import console, error_panel, info_panel


@click.group("auth")
def auth() -> None:
    """Manage authentication credentials."""


@auth.command("login")
@click.option("--api-url", default=None, help="API base URL override.")
@click.pass_context
def login(ctx: click.Context, api_url: str | None) -> None:
    """Authenticate with the GridMind API and store credentials."""
    email = click.prompt("Email")
    password = click.prompt("Password", hide_input=True)

    cfg = load_config()
    profile_name: str = ctx.obj.get("profile", "default")
    profile = cfg.profiles.get(profile_name, ProfileConfig())

    if api_url:
        profile.api_url = api_url

    client = GridMindClient(profile)
    try:
        result = client.post("/api/v1/auth/token", json={
            "username": email,
            "password": password,
        })
        token: str = result.get("access_token", "")
        if not token:
            console.print(error_panel("No access token returned."))
            raise SystemExit(1)

        profile.token = token
        profile.org_id = result.get("org_id")
        cfg.profiles[profile_name] = profile
        save_config(cfg)
        console.print(info_panel("Login Successful", f"Profile: {profile_name}"))
    except APIError as exc:
        console.print(error_panel(f"Login failed: {exc.message}"))
        raise SystemExit(1) from exc
    finally:
        client.close()


@auth.command("logout")
@click.pass_context
def logout(ctx: click.Context) -> None:
    """Clear stored credentials for the current profile."""
    cfg = load_config()
    profile_name: str = ctx.obj.get("profile", "default")
    profile = cfg.profiles.get(profile_name)
    if profile:
        profile.token = None
        cfg.profiles[profile_name] = profile
        save_config(cfg)
    console.print(info_panel("Logged Out", f"Profile: {profile_name}"))


@auth.command("whoami")
@click.pass_context
def whoami(ctx: click.Context) -> None:
    """Display current authentication status."""
    profile_name: str = ctx.obj.get("profile", "default")
    profile = get_profile(profile_name)

    if not profile.token:
        console.print("[yellow]Not authenticated. Run 'gridmind auth login'.[/yellow]")
        return

    client = GridMindClient(profile)
    try:
        data = client.get("/api/v1/auth/me")
        console.print(info_panel(
            "Current User",
            f"Email: {data.get('email', 'N/A')}\n"
            f"Org: {data.get('org_name', 'N/A')}\n"
            f"Role: {data.get('role', 'N/A')}",
        ))
    except APIError as exc:
        console.print(error_panel(f"Token invalid: {exc.message}"))
    finally:
        client.close()
