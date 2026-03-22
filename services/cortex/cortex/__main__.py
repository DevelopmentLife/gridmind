"""Entry point for the Cortex agent runtime."""

from __future__ import annotations

import asyncio

from cortex.runtime import CortexRuntime


async def main() -> None:
    """Bootstrap and run the Cortex agent fleet."""
    # Import agents here to avoid circular imports at module level
    from agents import ALL_AGENT_CLASSES

    runtime = CortexRuntime.from_env()
    for agent_cls in ALL_AGENT_CLASSES:
        runtime.register(agent_cls)
    await runtime.run_until_shutdown()


if __name__ == "__main__":
    asyncio.run(main())
