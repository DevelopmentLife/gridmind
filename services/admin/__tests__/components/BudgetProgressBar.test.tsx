import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { BudgetProgressBar } from "@/components/BudgetProgressBar";
import type { BudgetStatus } from "@/types";

function makeBudget(overrides: Partial<BudgetStatus> = {}): BudgetStatus {
  return {
    budgetUsd: 250,
    spentUsd: 50,
    percentUsed: 20,
    remainingUsd: 200,
    projectedOverage: false,
    ...overrides,
  };
}

describe("BudgetProgressBar", () => {
  it("renders budget amount text", () => {
    render(<BudgetProgressBar budget={makeBudget()} />);
    const amountEl = screen.getByTestId("budget-amount");
    expect(amountEl).toHaveTextContent("$50");
    expect(amountEl).toHaveTextContent("$250");
  });

  it("renders the progress track", () => {
    render(<BudgetProgressBar budget={makeBudget()} />);
    expect(screen.getByTestId("budget-track")).toBeInTheDocument();
  });

  it("renders fill bar", () => {
    render(<BudgetProgressBar budget={makeBudget({ percentUsed: 40 })} />);
    const fill = screen.getByTestId("budget-fill");
    expect(fill).toBeInTheDocument();
    expect(fill.style.width).toBe("40%");
  });

  it("shows percentage used text", () => {
    render(<BudgetProgressBar budget={makeBudget({ percentUsed: 35.5 })} />);
    expect(screen.getByText("35.5% used")).toBeInTheDocument();
  });

  it("shows remaining amount", () => {
    render(<BudgetProgressBar budget={makeBudget({ remainingUsd: 200 })} />);
    expect(screen.getByText("$200 remaining")).toBeInTheDocument();
  });

  describe("green zone (< 50%)", () => {
    it("applies green color to fill bar", () => {
      render(<BudgetProgressBar budget={makeBudget({ percentUsed: 30 })} />);
      const fill = screen.getByTestId("budget-fill");
      expect(fill.className).toContain("bg-brand-green");
    });
  });

  describe("amber zone (50-80%)", () => {
    it("applies amber color to fill bar at 50%", () => {
      render(<BudgetProgressBar budget={makeBudget({ percentUsed: 50 })} />);
      const fill = screen.getByTestId("budget-fill");
      expect(fill.className).toContain("bg-brand-amber");
    });

    it("applies amber color to fill bar at 75%", () => {
      render(<BudgetProgressBar budget={makeBudget({ percentUsed: 75 })} />);
      const fill = screen.getByTestId("budget-fill");
      expect(fill.className).toContain("bg-brand-amber");
    });
  });

  describe("red zone (>= 80%)", () => {
    it("applies red color to fill bar at 80%", () => {
      render(<BudgetProgressBar budget={makeBudget({ percentUsed: 80 })} />);
      const fill = screen.getByTestId("budget-fill");
      expect(fill.className).toContain("bg-brand-red");
    });

    it("applies red color to fill bar at 100%", () => {
      render(<BudgetProgressBar budget={makeBudget({ percentUsed: 100 })} />);
      const fill = screen.getByTestId("budget-fill");
      expect(fill.className).toContain("bg-brand-red");
    });
  });

  it("clamps fill width to 100% when percentUsed exceeds 100", () => {
    render(<BudgetProgressBar budget={makeBudget({ percentUsed: 120 })} />);
    const fill = screen.getByTestId("budget-fill");
    expect(fill.style.width).toBe("100%");
  });

  it("shows overage warning when projectedOverage is true", () => {
    render(<BudgetProgressBar budget={makeBudget({ projectedOverage: true })} />);
    expect(screen.getByText("Projected to exceed monthly budget")).toBeInTheDocument();
  });

  it("does not show overage warning when projectedOverage is false", () => {
    render(<BudgetProgressBar budget={makeBudget({ projectedOverage: false })} />);
    expect(screen.queryByText("Projected to exceed monthly budget")).not.toBeInTheDocument();
  });

  it("has correct aria attributes for meter role", () => {
    const { container } = render(<BudgetProgressBar budget={makeBudget({ percentUsed: 45 })} />);
    const meter = container.querySelector('[role="meter"]');
    expect(meter).toBeInTheDocument();
    expect(meter).toHaveAttribute("aria-valuenow", "45");
    expect(meter).toHaveAttribute("aria-valuemin", "0");
    expect(meter).toHaveAttribute("aria-valuemax", "100");
  });

  it("applies custom className", () => {
    const { container } = render(<BudgetProgressBar budget={makeBudget()} className="mt-4" />);
    const meter = container.querySelector('[role="meter"]');
    expect(meter?.className).toContain("mt-4");
  });
});
