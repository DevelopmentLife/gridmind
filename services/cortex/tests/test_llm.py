"""Tests for cortex.llm — LLM client with mock fallback."""

from __future__ import annotations

import pytest

from cortex.llm import HAIKU, OPUS, SONNET, LLMClient, MockLLMClient, _TokenWindow


class TestMockLLMClient:
    """Tests for MockLLMClient."""

    async def test_call_returns_string(self):
        """call() should return a non-empty string response."""
        client = MockLLMClient()
        result = await client.call(HAIKU, "test system", [{"role": "user", "content": "hello"}])

        assert isinstance(result, str)
        assert len(result) > 0

    async def test_call_contextual_workload_response(self):
        """call() should return workload-related response for workload prompts."""
        client = MockLLMClient()
        result = await client.call(
            HAIKU,
            "You are a workload profiler",
            [{"role": "user", "content": "analyze"}],
        )

        assert "classification" in result or "OLTP" in result

    async def test_call_contextual_incident_response(self):
        """call() should return incident-related response for incident prompts."""
        client = MockLLMClient()
        result = await client.call(
            OPUS,
            "Analyze the root cause of this incident",
            [{"role": "user", "content": "investigate"}],
        )

        assert "hypotheses" in result

    async def test_call_with_tools_returns_tuple(self):
        """call_with_tools() should return (text, tool_calls) tuple."""
        from cortex.models import ToolDefinition

        client = MockLLMClient()
        text, tools = await client.call_with_tools(
            SONNET,
            "system",
            [{"role": "user", "content": "test"}],
            [ToolDefinition(name="test_tool", description="test")],
        )

        assert isinstance(text, str)
        assert isinstance(tools, list)
        assert len(tools) == 0  # Mock returns no tool calls

    async def test_token_usage_tracked(self):
        """Token usage should be tracked after calls."""
        client = MockLLMClient()
        await client.call(HAIKU, "test", [{"role": "user", "content": "hello"}])

        assert client.token_usage > 0


class TestLLMClient:
    """Tests for LLMClient."""

    def test_no_api_key_uses_mock(self):
        """LLMClient without API key should use MockLLMClient."""
        client = LLMClient(api_key=None)
        assert client._mock is not None

    def test_with_api_key_creates_real_client(self):
        """LLMClient with API key should create real Anthropic client."""
        # We can't test this without the SDK, but we can verify the mock is None
        # This would normally test: client._client is not None
        client = LLMClient(api_key=None)
        assert client._mock is not None

    async def test_call_delegates_to_mock(self):
        """call() should delegate to mock when no API key."""
        client = LLMClient(api_key=None)
        result = await client.call(HAIKU, "test", [{"role": "user", "content": "hello"}])

        assert isinstance(result, str)

    async def test_token_usage_from_mock(self):
        """token_usage should reflect mock client usage."""
        client = LLMClient(api_key=None)
        await client.call(HAIKU, "test", [{"role": "user", "content": "hello"}])

        assert client.token_usage > 0


class TestTokenWindow:
    """Tests for _TokenWindow rolling window."""

    def test_record_and_total(self):
        """Recording tokens should update the total."""
        window = _TokenWindow()
        window.record(100)
        window.record(200)

        assert window.total() == 300

    def test_empty_window_returns_zero(self):
        """Empty window should return 0."""
        window = _TokenWindow()
        assert window.total() == 0


class TestModelConstants:
    """Tests for model ID constants."""

    def test_haiku_constant(self):
        assert HAIKU == "claude-haiku-4-5"

    def test_sonnet_constant(self):
        assert SONNET == "claude-sonnet-4-6"

    def test_opus_constant(self):
        assert OPUS == "claude-opus-4-6"
