"""Cost calculator — model pricing and cost projection utilities."""

from __future__ import annotations

from decimal import Decimal
from typing import Any

from pydantic import BaseModel, Field

# Model pricing: (input_per_1M_tokens_usd, output_per_1M_tokens_usd)
MODEL_PRICING: dict[str, tuple[Decimal, Decimal]] = {
    "claude-haiku-4-5": (Decimal("0.25"), Decimal("1.25")),
    "claude-sonnet-4-6": (Decimal("3.00"), Decimal("15.00")),
    "claude-opus-4-6": (Decimal("15.00"), Decimal("75.00")),
}

_ONE_MILLION = Decimal("1000000")


class DecisionCost(BaseModel):
    """Breakdown of costs for a single agent decision.

    Attributes:
        model_cost_usd: Cost of LLM tokens.
        compute_cost_usd: Cost of compute time.
        tool_cost_usd: Cost of tool invocations.
        total_cost_usd: Sum of all cost components.
    """

    model_cost_usd: Decimal = Field(default=Decimal("0"))
    compute_cost_usd: Decimal = Field(default=Decimal("0"))
    tool_cost_usd: Decimal = Field(default=Decimal("0"))
    total_cost_usd: Decimal = Field(default=Decimal("0"))


def calculate_model_cost(
    model: str,
    input_tokens: int,
    output_tokens: int,
) -> Decimal:
    """Calculate the LLM token cost for a given model and token counts.

    Args:
        model: Model identifier (e.g. ``claude-haiku-4-5``).
        input_tokens: Number of input tokens consumed.
        output_tokens: Number of output tokens generated.

    Returns:
        Cost in USD as a Decimal.

    Raises:
        ValueError: If the model is not in the pricing table.
    """
    pricing = MODEL_PRICING.get(model)
    if pricing is None:
        raise ValueError(f"Unknown model: {model}")
    input_price, output_price = pricing
    cost = (
        Decimal(input_tokens) * input_price / _ONE_MILLION
        + Decimal(output_tokens) * output_price / _ONE_MILLION
    )
    return cost.quantize(Decimal("0.00000001"))


def calculate_decision_cost(
    model: str,
    input_tokens: int,
    output_tokens: int,
    compute_ms: int = 0,
    tool_calls: int = 0,
    compute_rate_per_ms: Decimal = Decimal("0.0000001"),
    tool_rate_per_call: Decimal = Decimal("0.001"),
) -> DecisionCost:
    """Calculate the full cost breakdown for a single agent decision.

    Args:
        model: Model identifier.
        input_tokens: Input tokens consumed.
        output_tokens: Output tokens generated.
        compute_ms: Compute duration in milliseconds.
        tool_calls: Number of tool invocations.
        compute_rate_per_ms: Cost per millisecond of compute.
        tool_rate_per_call: Cost per tool invocation.

    Returns:
        A DecisionCost with all cost components.
    """
    model_cost = calculate_model_cost(model, input_tokens, output_tokens)
    compute_cost = (Decimal(compute_ms) * compute_rate_per_ms).quantize(Decimal("0.00000001"))
    tool_cost = (Decimal(tool_calls) * tool_rate_per_call).quantize(Decimal("0.00000001"))
    total = model_cost + compute_cost + tool_cost

    return DecisionCost(
        model_cost_usd=model_cost,
        compute_cost_usd=compute_cost,
        tool_cost_usd=tool_cost,
        total_cost_usd=total,
    )


def project_monthly_cost(
    daily_decisions: int,
    avg_input_tokens: int,
    avg_output_tokens: int,
    model: str,
    avg_compute_ms: int = 500,
    avg_tool_calls: int = 1,
    days_in_month: int = 30,
) -> Decimal:
    """Project monthly cost based on average daily usage.

    Args:
        daily_decisions: Average number of decisions per day.
        avg_input_tokens: Average input tokens per decision.
        avg_output_tokens: Average output tokens per decision.
        model: Model identifier.
        avg_compute_ms: Average compute time per decision.
        avg_tool_calls: Average tool calls per decision.
        days_in_month: Number of days to project over.

    Returns:
        Projected monthly cost in USD.
    """
    per_decision = calculate_decision_cost(
        model=model,
        input_tokens=avg_input_tokens,
        output_tokens=avg_output_tokens,
        compute_ms=avg_compute_ms,
        tool_calls=avg_tool_calls,
    )
    total = per_decision.total_cost_usd * Decimal(daily_decisions) * Decimal(days_in_month)
    return total.quantize(Decimal("0.01"))
