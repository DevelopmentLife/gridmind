import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { TenantTableRow } from "@/components/TenantTableRow";
import type { Tenant } from "@/types";

const MOCK_TENANT: Tenant = {
  tenantId: "t-test-001",
  name: "Test Corporation",
  slug: "test-corp",
  tier: "enterprise",
  status: "active",
  mrr: 120_000, // $1200.00
  arr: 1_440_000,
  deploymentCount: 5,
  agentCount: 120,
  ownerEmail: "cto@testcorp.io",
  ownerName: "Jane Doe",
  createdAt: "2024-01-15T10:00:00Z",
  trialEndsAt: null,
  stripeCustomerId: "cus_test123",
  region: "us-east-1",
  activeIncidents: 0,
};

// Wrap in a table/tbody for valid HTML rendering
function renderRow(ui: React.ReactElement) {
  return render(
    <table>
      <tbody>{ui}</tbody>
    </table>
  );
}

describe("TenantTableRow", () => {
  it("renders tenant name", () => {
    renderRow(<TenantTableRow tenant={MOCK_TENANT} />);
    expect(screen.getByText("Test Corporation")).toBeInTheDocument();
  });

  it("renders tenant owner email", () => {
    renderRow(<TenantTableRow tenant={MOCK_TENANT} />);
    expect(screen.getByText("cto@testcorp.io")).toBeInTheDocument();
  });

  it("renders tier badge", () => {
    renderRow(<TenantTableRow tenant={MOCK_TENANT} />);
    expect(screen.getByText("Enterprise")).toBeInTheDocument();
  });

  it("renders status with correct label", () => {
    renderRow(<TenantTableRow tenant={MOCK_TENANT} />);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("renders MRR in formatted currency", () => {
    renderRow(<TenantTableRow tenant={MOCK_TENANT} />);
    expect(screen.getByText("$1,200")).toBeInTheDocument();
  });

  it("renders deployment count", () => {
    renderRow(<TenantTableRow tenant={MOCK_TENANT} />);
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("renders region", () => {
    renderRow(<TenantTableRow tenant={MOCK_TENANT} />);
    expect(screen.getByText("us-east-1")).toBeInTheDocument();
  });

  it("shows dash for zero active incidents", () => {
    renderRow(<TenantTableRow tenant={MOCK_TENANT} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("shows incident count badge when activeIncidents > 0", () => {
    const tenant = { ...MOCK_TENANT, activeIncidents: 3 };
    renderRow(<TenantTableRow tenant={tenant} />);
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("calls onSelect when row is clicked", () => {
    const onSelect = vi.fn();
    renderRow(
      <TenantTableRow tenant={MOCK_TENANT} onSelect={onSelect} />
    );
    fireEvent.click(screen.getByRole("row"));
    expect(onSelect).toHaveBeenCalledWith("t-test-001");
  });

  it("calls onSelect when Enter key is pressed", () => {
    const onSelect = vi.fn();
    renderRow(
      <TenantTableRow tenant={MOCK_TENANT} onSelect={onSelect} />
    );
    fireEvent.keyDown(screen.getByRole("row"), { key: "Enter" });
    expect(onSelect).toHaveBeenCalledWith("t-test-001");
  });

  it("renders Impersonate button", () => {
    renderRow(<TenantTableRow tenant={MOCK_TENANT} />);
    expect(
      screen.getByRole("button", { name: /impersonate test corporation/i })
    ).toBeInTheDocument();
  });

  it("calls onImpersonate when Impersonate button is clicked", () => {
    const onImpersonate = vi.fn();
    renderRow(
      <TenantTableRow tenant={MOCK_TENANT} onImpersonate={onImpersonate} />
    );
    const btn = screen.getByRole("button", { name: /impersonate/i });
    fireEvent.click(btn);
    expect(onImpersonate).toHaveBeenCalledWith(MOCK_TENANT);
  });

  it("disables Impersonate button for churned tenant", () => {
    const tenant = { ...MOCK_TENANT, status: "churned" as const };
    renderRow(<TenantTableRow tenant={tenant} />);
    expect(
      screen.getByRole("button", { name: /impersonate/i })
    ).toBeDisabled();
  });

  it("disables Impersonate button for suspended tenant", () => {
    const tenant = { ...MOCK_TENANT, status: "suspended" as const };
    renderRow(<TenantTableRow tenant={tenant} />);
    expect(
      screen.getByRole("button", { name: /impersonate/i })
    ).toBeDisabled();
  });

  it("shows more actions menu when ... button is clicked", () => {
    renderRow(<TenantTableRow tenant={MOCK_TENANT} />);
    const moreBtn = screen.getByRole("button", { name: /more tenant actions/i });
    fireEvent.click(moreBtn);
    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("shows Suspend option for active tenant in actions menu", () => {
    renderRow(<TenantTableRow tenant={MOCK_TENANT} />);
    const moreBtn = screen.getByRole("button", { name: /more tenant actions/i });
    fireEvent.click(moreBtn);
    expect(screen.getByText("Suspend Tenant")).toBeInTheDocument();
  });

  it("shows Reactivate option for suspended tenant", () => {
    const tenant = { ...MOCK_TENANT, status: "suspended" as const };
    renderRow(<TenantTableRow tenant={tenant} />);
    const moreBtn = screen.getByRole("button", { name: /more tenant actions/i });
    fireEvent.click(moreBtn);
    expect(screen.getByText("Reactivate")).toBeInTheDocument();
  });

  it("does not show Suspend option for suspended tenant", () => {
    const tenant = { ...MOCK_TENANT, status: "suspended" as const };
    renderRow(<TenantTableRow tenant={tenant} />);
    const moreBtn = screen.getByRole("button", { name: /more tenant actions/i });
    fireEvent.click(moreBtn);
    expect(screen.queryByText("Suspend Tenant")).not.toBeInTheDocument();
  });

  it("applies data-testid attribute", () => {
    renderRow(
      <TenantTableRow tenant={MOCK_TENANT} data-testid="test-row" />
    );
    expect(screen.getByTestId("test-row")).toBeInTheDocument();
  });

  it("has aria-label on row", () => {
    renderRow(<TenantTableRow tenant={MOCK_TENANT} />);
    expect(screen.getByLabelText("Tenant: Test Corporation")).toBeInTheDocument();
  });

  describe("trial tenant", () => {
    it("allows impersonation for trial tenant", () => {
      const tenant = { ...MOCK_TENANT, status: "trial" as const };
      renderRow(<TenantTableRow tenant={tenant} />);
      expect(
        screen.getByRole("button", { name: /impersonate/i })
      ).not.toBeDisabled();
    });
  });
});
