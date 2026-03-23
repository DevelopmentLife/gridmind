import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { FeatureFlagRow } from "@/components/FeatureFlagRow";
import type { FeatureFlag } from "@/types";

const MOCK_FLAG_ENABLED: FeatureFlag = {
  flagId: "ff-001",
  name: "new_dashboard_v2",
  description: "Redesigned dashboard with new metrics and charts",
  status: "enabled",
  rolloutPercentage: 100,
  enabledTenants: [],
  disabledTenants: [],
  createdAt: "2025-01-10T10:00:00Z",
  updatedAt: "2025-02-15T14:30:00Z",
  updatedBy: "eng@gridmindai.dev",
  tags: ["ui", "dashboard"],
};

const MOCK_FLAG_DISABLED: FeatureFlag = {
  ...MOCK_FLAG_ENABLED,
  flagId: "ff-002",
  name: "experimental_feature",
  status: "disabled",
  rolloutPercentage: 0,
};

const MOCK_FLAG_PARTIAL: FeatureFlag = {
  ...MOCK_FLAG_ENABLED,
  flagId: "ff-003",
  name: "beta_rollout",
  status: "partial",
  rolloutPercentage: 30,
  enabledTenants: ["t-001", "t-002"],
};

describe("FeatureFlagRow", () => {
  it("renders flag name", () => {
    render(<FeatureFlagRow flag={MOCK_FLAG_ENABLED} />);
    expect(screen.getByText("new_dashboard_v2")).toBeInTheDocument();
  });

  it("renders flag description", () => {
    render(<FeatureFlagRow flag={MOCK_FLAG_ENABLED} />);
    expect(
      screen.getByText("Redesigned dashboard with new metrics and charts")
    ).toBeInTheDocument();
  });

  it("renders tags", () => {
    render(<FeatureFlagRow flag={MOCK_FLAG_ENABLED} />);
    expect(screen.getByText("ui")).toBeInTheDocument();
    expect(screen.getByText("dashboard")).toBeInTheDocument();
  });

  it("renders Enabled status badge for enabled flag", () => {
    render(<FeatureFlagRow flag={MOCK_FLAG_ENABLED} />);
    expect(screen.getByText("Enabled")).toBeInTheDocument();
  });

  it("renders Disabled status badge for disabled flag", () => {
    render(<FeatureFlagRow flag={MOCK_FLAG_DISABLED} />);
    expect(screen.getByText("Disabled")).toBeInTheDocument();
  });

  it("renders Partial Rollout status badge for partial flag", () => {
    render(<FeatureFlagRow flag={MOCK_FLAG_PARTIAL} />);
    expect(screen.getByText("Partial Rollout")).toBeInTheDocument();
  });

  it("renders toggle switch with correct aria-checked for enabled flag", () => {
    render(<FeatureFlagRow flag={MOCK_FLAG_ENABLED} />);
    const toggle = screen.getByRole("switch");
    expect(toggle).toHaveAttribute("aria-checked", "true");
  });

  it("renders toggle switch with aria-checked=false for disabled flag", () => {
    render(<FeatureFlagRow flag={MOCK_FLAG_DISABLED} />);
    const toggle = screen.getByRole("switch");
    expect(toggle).toHaveAttribute("aria-checked", "false");
  });

  it("calls onToggle with correct arguments when toggle is clicked — enabling", () => {
    const onToggle = vi.fn();
    render(<FeatureFlagRow flag={MOCK_FLAG_DISABLED} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole("switch"));
    expect(onToggle).toHaveBeenCalledWith("ff-002", true);
  });

  it("calls onToggle with correct arguments when toggle is clicked — disabling", () => {
    const onToggle = vi.fn();
    render(<FeatureFlagRow flag={MOCK_FLAG_ENABLED} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole("switch"));
    expect(onToggle).toHaveBeenCalledWith("ff-001", false);
  });

  it("shows enabled override count", () => {
    render(<FeatureFlagRow flag={MOCK_FLAG_PARTIAL} />);
    expect(screen.getByText("+2 overrides")).toBeInTheDocument();
  });

  it("shows rollout slider for partial flag", () => {
    render(<FeatureFlagRow flag={MOCK_FLAG_PARTIAL} />);
    expect(screen.getByRole("slider")).toBeInTheDocument();
  });

  it("does not show rollout slider for fully enabled flag", () => {
    render(<FeatureFlagRow flag={MOCK_FLAG_ENABLED} />);
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();
  });

  it("does not show rollout slider for disabled flag", () => {
    render(<FeatureFlagRow flag={MOCK_FLAG_DISABLED} />);
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();
  });

  it("shows rollout percentage for partial flag", () => {
    render(<FeatureFlagRow flag={MOCK_FLAG_PARTIAL} />);
    expect(screen.getByText("30%")).toBeInTheDocument();
  });

  it("disables toggle when isSaving=true", () => {
    render(<FeatureFlagRow flag={MOCK_FLAG_ENABLED} isSaving={true} />);
    expect(screen.getByRole("switch")).toBeDisabled();
  });

  it("applies pointer-events-none when isSaving=true", () => {
    const { container } = render(
      <FeatureFlagRow flag={MOCK_FLAG_ENABLED} isSaving={true} />
    );
    expect(container.firstChild).toHaveClass("pointer-events-none");
  });

  it("calls onSelect when row is clicked", () => {
    const onSelect = vi.fn();
    render(<FeatureFlagRow flag={MOCK_FLAG_ENABLED} onSelect={onSelect} />);
    const row = screen.getByLabelText("Feature flag: new_dashboard_v2");
    fireEvent.click(row);
    expect(onSelect).toHaveBeenCalledWith("ff-001");
  });

  it("calls onSelect when Enter key is pressed", () => {
    const onSelect = vi.fn();
    render(<FeatureFlagRow flag={MOCK_FLAG_ENABLED} onSelect={onSelect} />);
    const row = screen.getByLabelText("Feature flag: new_dashboard_v2");
    fireEvent.keyDown(row, { key: "Enter" });
    expect(onSelect).toHaveBeenCalledWith("ff-001");
  });

  it("shows updatedBy information", () => {
    render(<FeatureFlagRow flag={MOCK_FLAG_ENABLED} />);
    expect(screen.getByText(/eng@gridmindai.dev/)).toBeInTheDocument();
  });

  it("applies data-testid attribute", () => {
    render(
      <FeatureFlagRow flag={MOCK_FLAG_ENABLED} data-testid="flag-test" />
    );
    expect(screen.getByTestId("flag-test")).toBeInTheDocument();
  });

  it("shows disabled tenant count when present", () => {
    const flag = { ...MOCK_FLAG_ENABLED, disabledTenants: ["t-005", "t-008"] };
    render(<FeatureFlagRow flag={flag} />);
    expect(screen.getByText("-2 blocked")).toBeInTheDocument();
  });

  describe("toggle aria-label", () => {
    it("describes enabled state for enabled flag", () => {
      render(<FeatureFlagRow flag={MOCK_FLAG_ENABLED} />);
      expect(
        screen.getByRole("switch", {
          name: /new_dashboard_v2 is enabled/i,
        })
      ).toBeInTheDocument();
    });

    it("describes disabled state for disabled flag", () => {
      render(<FeatureFlagRow flag={MOCK_FLAG_DISABLED} />);
      expect(
        screen.getByRole("switch", {
          name: /experimental_feature is disabled/i,
        })
      ).toBeInTheDocument();
    });
  });
});
