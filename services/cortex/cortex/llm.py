"""LLM client abstraction for Cortex agents with mock fallback."""

from __future__ import annotations

import time
from collections import deque
from dataclasses import dataclass, field
from typing import Any

import structlog

from cortex.models import ToolDefinition

logger = structlog.get_logger(__name__)

# Model ID constants
HAIKU = "claude-haiku-4-5"
SONNET = "claude-sonnet-4-6"
OPUS = "claude-opus-4-6"


@dataclass
class _TokenWindow:
    """Rolling 1-hour window for token usage tracking."""

    _entries: deque[tuple[float, int]] = field(default_factory=deque)
    _window_seconds: float = 3600.0

    def record(self, tokens: int) -> None:
        """Record token usage at the current timestamp."""
        now = time.monotonic()
        self._entries.append((now, tokens))
        self._prune(now)

    def total(self) -> int:
        """Return total tokens used in the current window."""
        self._prune(time.monotonic())
        return sum(t for _, t in self._entries)

    def _prune(self, now: float) -> None:
        """Remove entries older than the window."""
        cutoff = now - self._window_seconds
        while self._entries and self._entries[0][0] < cutoff:
            self._entries.popleft()


class MockLLMClient:
    """Mock LLM client that returns fixture responses when no API key is available."""

    def __init__(self) -> None:
        self._token_window = _TokenWindow()

    async def call(
        self,
        model: str,
        system: str,
        messages: list[dict[str, Any]],
        max_tokens: int = 4096,
    ) -> str:
        """Return a mock LLM response.

        Args:
            model: Model identifier (ignored in mock).
            system: System prompt.
            messages: Conversation messages.
            max_tokens: Maximum tokens (ignored in mock).

        Returns:
            A reasonable fixture response string.
        """
        self._token_window.record(50)
        logger.debug("mock_llm.call", model=model, message_count=len(messages))

        # Provide contextual mock responses based on system prompt keywords
        system_lower = system.lower()
        if "workload" in system_lower or "profil" in system_lower:
            return '{"classification": "OLTP", "qps": 150, "confidence": 0.85}'
        if "incident" in system_lower or "root cause" in system_lower:
            return (
                '{"hypotheses": [{"cause": "connection_pool_exhaustion", '
                '"confidence": 0.78, "evidence": ["max_connections reached"]}]}'
            )
        if "security" in system_lower or "posture" in system_lower:
            return '{"risk_score": 25, "findings": [], "status": "healthy"}'
        if "cost" in system_lower or "billing" in system_lower:
            return '{"monthly_cost_usd": 342.50, "trend": "stable", "anomalies": []}'
        if "scale" in system_lower or "replica" in system_lower:
            return '{"recommendation": "maintain_current", "reason": "load within capacity"}'
        if "optimi" in system_lower or "query" in system_lower:
            return '{"recommendations": [], "indexes_suggested": 0}'
        if "drift" in system_lower:
            return '{"drift_detected": false, "score": 0.0}'
        if "forecast" in system_lower or "capacity" in system_lower:
            return '{"forecast_1h": {"cpu": 45.0, "memory": 62.0, "connections": 80}}'
        if "health" in system_lower:
            return '{"score": 85, "status": "healthy"}'
        if "onboard" in system_lower:
            return '{"phase": "complete", "next_action": "go_live"}'
        return '{"status": "ok", "message": "Mock response"}'

    async def call_with_tools(
        self,
        model: str,
        system: str,
        messages: list[dict[str, Any]],
        tools: list[ToolDefinition],
        max_tokens: int = 4096,
    ) -> tuple[str, list[dict[str, Any]]]:
        """Return a mock response with no tool calls.

        Args:
            model: Model identifier.
            system: System prompt.
            messages: Conversation messages.
            tools: Available tool definitions.
            max_tokens: Maximum tokens.

        Returns:
            Tuple of (response_text, empty_tool_calls).
        """
        self._token_window.record(75)
        response = await self.call(model, system, messages, max_tokens)
        return response, []

    @property
    def token_usage(self) -> int:
        """Return total tokens used in the rolling window."""
        return self._token_window.total()


class LLMClient:
    """Anthropic LLM client with automatic mock fallback.

    When no API key is provided, a MockLLMClient is used instead,
    allowing development and testing without an Anthropic account.
    """

    def __init__(self, api_key: str | None = None) -> None:
        self._api_key = api_key
        self._token_window = _TokenWindow()
        self._mock: MockLLMClient | None = None

        if api_key:
            import anthropic

            self._client = anthropic.AsyncAnthropic(api_key=api_key)
            logger.info("llm_client.initialized", mode="live")
        else:
            self._mock = MockLLMClient()
            self._client = None  # type: ignore[assignment]
            logger.info("llm_client.initialized", mode="mock")

    async def call(
        self,
        model: str,
        system: str,
        messages: list[dict[str, Any]],
        max_tokens: int = 4096,
    ) -> str:
        """Make a single-turn LLM call.

        Args:
            model: Claude model ID (e.g., HAIKU, SONNET, OPUS).
            system: System prompt.
            messages: List of message dicts with 'role' and 'content'.
            max_tokens: Maximum response tokens.

        Returns:
            The text content of the LLM response.
        """
        if self._mock is not None:
            return await self._mock.call(model, system, messages, max_tokens)

        response = await self._client.messages.create(
            model=model,
            system=system,
            messages=messages,
            max_tokens=max_tokens,
        )
        usage = response.usage
        self._token_window.record(usage.input_tokens + usage.output_tokens)

        # Extract text from response content blocks
        text_parts = [block.text for block in response.content if hasattr(block, "text")]
        return "".join(text_parts)

    async def call_with_tools(
        self,
        model: str,
        system: str,
        messages: list[dict[str, Any]],
        tools: list[ToolDefinition],
        max_tokens: int = 4096,
    ) -> tuple[str, list[dict[str, Any]]]:
        """Make an LLM call with tool-use support.

        Args:
            model: Claude model ID.
            system: System prompt.
            messages: Conversation messages.
            tools: List of available tool definitions.
            max_tokens: Maximum response tokens.

        Returns:
            Tuple of (response_text, tool_calls) where tool_calls is a list
            of dicts with 'name' and 'input' keys.
        """
        if self._mock is not None:
            return await self._mock.call_with_tools(model, system, messages, tools, max_tokens)

        anthropic_tools = [
            {
                "name": t.name,
                "description": t.description,
                "input_schema": t.input_schema or {"type": "object", "properties": {}},
            }
            for t in tools
        ]

        response = await self._client.messages.create(
            model=model,
            system=system,
            messages=messages,
            tools=anthropic_tools,
            max_tokens=max_tokens,
        )
        usage = response.usage
        self._token_window.record(usage.input_tokens + usage.output_tokens)

        text_parts: list[str] = []
        tool_calls: list[dict[str, Any]] = []
        for block in response.content:
            if hasattr(block, "text"):
                text_parts.append(block.text)
            elif block.type == "tool_use":
                tool_calls.append({"name": block.name, "input": block.input})

        return "".join(text_parts), tool_calls

    @property
    def token_usage(self) -> int:
        """Return total tokens used in the rolling window."""
        if self._mock is not None:
            return self._mock.token_usage
        return self._token_window.total()
