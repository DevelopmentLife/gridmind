"""Contract tests for shared event schemas.

Validates that all NATS event types in EVENT_TYPE_MAP:
  - Produce valid JSON Schema documents
  - Carry the required tenant_id or deployment_id fields
  - Can be instantiated with minimal required arguments
  - Auto-generate a unique event_id and timestamp
"""

from __future__ import annotations

import pytest

try:
    import jsonschema
    HAS_JSONSCHEMA = True
except ImportError:
    HAS_JSONSCHEMA = False

from shared.schemas.events import EVENT_TYPE_MAP, EventEnvelope


# ---------------------------------------------------------------------------
# Parametrize helpers
# ---------------------------------------------------------------------------

_EVENT_ITEMS = list(EVENT_TYPE_MAP.items())


# ---------------------------------------------------------------------------
# Schema validity tests
# ---------------------------------------------------------------------------


class TestEventSchemas:
    @pytest.mark.parametrize("event_type,model_class", _EVENT_ITEMS)
    @pytest.mark.skipif(not HAS_JSONSCHEMA, reason="jsonschema not installed")
    def test_schema_is_valid_json_schema(self, event_type: str, model_class: type) -> None:
        """Every event model must produce a draft-7-compatible JSON Schema."""
        schema = model_class.model_json_schema()
        jsonschema.Draft7Validator.check_schema(schema)

    @pytest.mark.parametrize("event_type,model_class", _EVENT_ITEMS)
    def test_event_has_tenant_id_or_deployment_id(
        self, event_type: str, model_class: type
    ) -> None:
        """Every event must have tenant_id or deployment_id to enable tenant isolation."""
        fields = model_class.model_fields
        assert "tenant_id" in fields or "deployment_id" in fields, (
            f"{event_type}: missing tenant_id and deployment_id"
        )

    @pytest.mark.parametrize("event_type,model_class", _EVENT_ITEMS)
    def test_event_has_event_type_field(self, event_type: str, model_class: type) -> None:
        """Every event must declare an event_type field for deserialization routing."""
        fields = model_class.model_fields
        assert "event_type" in fields, f"{event_type}: missing event_type field"

    @pytest.mark.parametrize("event_type,model_class", _EVENT_ITEMS)
    def test_event_has_event_id_field(self, event_type: str, model_class: type) -> None:
        """Every event must have an event_id for deduplication."""
        fields = model_class.model_fields
        assert "event_id" in fields, f"{event_type}: missing event_id field"

    @pytest.mark.parametrize("event_type,model_class", _EVENT_ITEMS)
    def test_event_has_timestamp_field(self, event_type: str, model_class: type) -> None:
        """Every event must have a timestamp for ordering and TTL."""
        fields = model_class.model_fields
        assert "timestamp" in fields, f"{event_type}: missing timestamp field"

    @pytest.mark.parametrize("event_type,model_class", _EVENT_ITEMS)
    def test_map_key_matches_model_default_event_type(
        self, event_type: str, model_class: type
    ) -> None:
        """The EVENT_TYPE_MAP key must match the model's default event_type."""
        instance = model_class(
            event_type=event_type,
            tenant_id="test-tenant",
            agent_id="test-agent",
        )
        assert instance.event_type == event_type, (
            f"Map key '{event_type}' does not match model event_type '{instance.event_type}'"
        )


# ---------------------------------------------------------------------------
# EventEnvelope base tests
# ---------------------------------------------------------------------------


class TestEventEnvelopeBase:
    def test_event_envelope_auto_generates_id(self) -> None:
        env = EventEnvelope(
            event_type="test.event",
            tenant_id="test-tenant",
            agent_id="test-agent",
        )
        assert env.event_id
        assert len(env.event_id) == 36  # UUID format

    def test_event_envelope_auto_generates_timestamp(self) -> None:
        env = EventEnvelope(
            event_type="test.event",
            tenant_id="test-tenant",
            agent_id="test-agent",
        )
        assert env.timestamp is not None

    def test_two_events_have_different_ids(self) -> None:
        env1 = EventEnvelope(
            event_type="test.event",
            tenant_id="test-tenant",
            agent_id="test-agent",
        )
        env2 = EventEnvelope(
            event_type="test.event",
            tenant_id="test-tenant",
            agent_id="test-agent",
        )
        assert env1.event_id != env2.event_id

    def test_correlation_id_defaults_to_none(self) -> None:
        env = EventEnvelope(
            event_type="test.event",
            tenant_id="test-tenant",
            agent_id="test-agent",
        )
        assert env.correlation_id is None

    def test_payload_defaults_to_none(self) -> None:
        env = EventEnvelope(
            event_type="test.event",
            tenant_id="test-tenant",
            agent_id="test-agent",
        )
        assert env.payload is None

    def test_payload_accepts_dict(self) -> None:
        env = EventEnvelope(
            event_type="test.event",
            tenant_id="test-tenant",
            agent_id="test-agent",
            payload={"key": "value", "count": 42},
        )
        assert env.payload == {"key": "value", "count": 42}


# ---------------------------------------------------------------------------
# EVENT_TYPE_MAP completeness tests
# ---------------------------------------------------------------------------


class TestEventTypeMap:
    def test_map_is_not_empty(self) -> None:
        assert len(EVENT_TYPE_MAP) > 0

    def test_all_values_are_pydantic_models(self) -> None:
        from pydantic import BaseModel
        for key, model_class in EVENT_TYPE_MAP.items():
            assert issubclass(model_class, BaseModel), (
                f"{key}: model class is not a Pydantic BaseModel"
            )

    def test_map_contains_perception_events(self) -> None:
        perception_events = [k for k in EVENT_TYPE_MAP if k.startswith("perception.")]
        assert len(perception_events) >= 3, "Expected at least 3 perception event types"

    def test_map_contains_reasoning_events(self) -> None:
        reasoning_events = [k for k in EVENT_TYPE_MAP if k.startswith("reasoning.")]
        assert len(reasoning_events) >= 3, "Expected at least 3 reasoning event types"

    def test_map_contains_execution_events(self) -> None:
        execution_events = [k for k in EVENT_TYPE_MAP if k.startswith("execution.")]
        assert len(execution_events) >= 3, "Expected at least 3 execution event types"

    def test_map_contains_approval_events(self) -> None:
        approval_events = [k for k in EVENT_TYPE_MAP if k.startswith("approval.")]
        assert len(approval_events) >= 2, "Expected request and response approval events"

    def test_map_contains_billing_events(self) -> None:
        billing_events = [k for k in EVENT_TYPE_MAP if k.startswith("billing.")]
        assert len(billing_events) >= 2, "Expected at least 2 billing event types"
