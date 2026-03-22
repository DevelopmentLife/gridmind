"""ORACLE — Capacity Forecast agent.

Produces 1h/6h/24h/7d capacity forecasts using Holt-Winters exponential smoothing.
"""

from __future__ import annotations

import json
import math
from dataclasses import dataclass, field

import structlog

from cortex.base_agent import BaseAgent
from cortex.models import AgentTier, AutonomyLevel, EventEnvelope, ToolDefinition

logger = structlog.get_logger(__name__)

FORECAST_HORIZONS = {"1h": 6, "6h": 36, "24h": 144, "7d": 1008}


@dataclass
class _HoltWinters:
    """Simple Holt-Winters exponential smoothing for time series forecasting."""

    alpha: float = 0.3
    beta: float = 0.1
    level: float = 0.0
    trend: float = 0.0
    _initialized: bool = False

    def update(self, observation: float) -> None:
        """Update the model with a new observation."""
        if not self._initialized:
            self.level = observation
            self.trend = 0.0
            self._initialized = True
            return

        prev_level = self.level
        self.level = self.alpha * observation + (1 - self.alpha) * (self.level + self.trend)
        self.trend = self.beta * (self.level - prev_level) + (1 - self.beta) * self.trend

    def forecast(self, steps: int) -> float:
        """Forecast value at `steps` ahead."""
        return self.level + self.trend * steps


class OracleAgent(BaseAgent):
    """Capacity Forecast: 1h/6h/24h/7d Holt-Winters exponential smoothing."""

    AGENT_NAME = "oracle"
    TIER = AgentTier.PERCEPTION
    AUTONOMY_LEVEL = AutonomyLevel.AUTONOMOUS
    MODEL_ASSIGNMENT = "claude-sonnet-4-6"
    VISIBILITY = "Customer"
    DESCRIPTION = "Capacity Forecast: 1h/6h/24h/7d Holt-Winters exponential smoothing"
    CYCLE_INTERVAL_SECONDS = 300.0
    TOOLS = [
        ToolDefinition(
            name="get_historical_metrics",
            description="Retrieve historical CPU, memory, connection, and storage metrics",
            input_schema={
                "type": "object",
                "properties": {
                    "metric": {"type": "string"},
                    "lookback_minutes": {"type": "integer"},
                },
            },
        ),
    ]
    SUBSCRIPTIONS: list[str] = []
    EMISSIONS = ["perception.capacity_forecast", "perception.capacity_warning"]

    def __init__(self, *args: object, **kwargs: object) -> None:
        super().__init__(*args, **kwargs)  # type: ignore[arg-type]
        self._models: dict[str, _HoltWinters] = {
            "cpu": _HoltWinters(alpha=0.3, beta=0.1),
            "memory": _HoltWinters(alpha=0.3, beta=0.1),
            "connections": _HoltWinters(alpha=0.3, beta=0.1),
            "storage_gb": _HoltWinters(alpha=0.2, beta=0.05),
        }

    async def run_cycle(self) -> None:
        """Gather metrics, update models, and emit forecasts."""
        forecasts: dict[str, dict[str, float]] = {}

        for metric_name, model in self._models.items():
            metrics = await self._invoke_tool(
                "get_historical_metrics",
                metric=metric_name,
                lookback_minutes=10,
            )

            # Update model with latest observations
            values = metrics.get("result", {}).get("values", [])
            if isinstance(values, list):
                for val in values:
                    if isinstance(val, (int, float)):
                        model.update(val)

            # Generate forecasts for each horizon
            metric_forecasts: dict[str, float] = {}
            for horizon_name, steps in FORECAST_HORIZONS.items():
                forecast_val = model.forecast(steps)
                metric_forecasts[horizon_name] = round(max(0, forecast_val), 2)
            forecasts[metric_name] = metric_forecasts

        await self._emit(EventEnvelope(
            event_type="perception.capacity_forecast",
            tenant_id=self._context.tenant_id,
            payload={"forecasts": forecasts},
        ))

        # Warn if any metric is forecast to exceed thresholds
        warnings: list[dict[str, object]] = []
        thresholds = {"cpu": 85.0, "memory": 90.0, "connections": 90.0, "storage_gb": 85.0}

        for metric, horizon_vals in forecasts.items():
            threshold = thresholds.get(metric, 100.0)
            for horizon, value in horizon_vals.items():
                if value > threshold:
                    warnings.append({
                        "metric": metric,
                        "horizon": horizon,
                        "forecast_value": value,
                        "threshold": threshold,
                    })

        if warnings:
            await self._emit(EventEnvelope(
                event_type="perception.capacity_warning",
                tenant_id=self._context.tenant_id,
                payload={"warnings": warnings},
            ))

    async def process(self, event: EventEnvelope) -> None:
        """Handle inbound events."""
