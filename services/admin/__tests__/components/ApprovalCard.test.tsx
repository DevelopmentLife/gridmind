import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { ApprovalCard } from "@/components/ApprovalCard";
import type { Approval } from "@/types";

const mockApproval: Approval = {
  approvalId: "appr-001",
  tenantId: "tenant-001",
  tenantName: "Acme Corporation",
  sourceAgentId: "sherlock-001",
  sourceAgentName: "sherlock",
  sourceAgentDisplayName: "SHERLOCK",
  actionDescription: "Restart connection pool to clear queued connections.",
  riskLevel: "high",
  context: {
    currentCpu: 87,
    connectionQueue: 48,
  },
  status: "pending",
  requestedAt: new Date(Date.now() - 600_000).toISOString(),
  expiresAt: new Date(Date.now() + 3600_000 * 4).toISOString(),
  timeoutSeconds: 300,
};

describe("ApprovalCard", () => {
  const mockOnApprove = vi.fn();
  const mockOnReject = vi.fn();

  beforeEach(() => {
    mockOnApprove.mockClear();
    mockOnReject.mockClear();
  });

  it("renders source agent display name", () => {
    render(
      <ApprovalCard
        approval={mockApproval}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    );
    expect(screen.getByText("SHERLOCK")).toBeInTheDocument();
  });

  it("renders tenant name", () => {
    render(
      <ApprovalCard
        approval={mockApproval}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    );
    expect(screen.getByText("Acme Corporation")).toBeInTheDocument();
  });

  it("renders action description", () => {
    render(
      <ApprovalCard
        approval={mockApproval}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    );
    expect(
      screen.getByText(/Restart connection pool/i)
    ).toBeInTheDocument();
  });

  it("renders risk level badge", () => {
    render(
      <ApprovalCard
        approval={mockApproval}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    );
    expect(screen.getByText("High Risk")).toBeInTheDocument();
  });

  it("renders context details", () => {
    render(
      <ApprovalCard
        approval={mockApproval}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    );
    expect(screen.getByText("currentCpu:")).toBeInTheDocument();
    expect(screen.getByText("87")).toBeInTheDocument();
  });

  it("renders Approve and Reject buttons for pending approval", () => {
    render(
      <ApprovalCard
        approval={mockApproval}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    );
    expect(screen.getByRole("button", { name: /Approve/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Reject/i })).toBeInTheDocument();
  });

  it("calls onApprove when Approve is clicked", async () => {
    mockOnApprove.mockResolvedValue(undefined);
    render(
      <ApprovalCard
        approval={mockApproval}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /Approve/i }));
    await waitFor(() => {
      expect(mockOnApprove).toHaveBeenCalledWith("appr-001", "Approved by operator");
    });
  });

  it("shows reject form when Reject is clicked", () => {
    render(
      <ApprovalCard
        approval={mockApproval}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /Reject/i }));
    expect(screen.getByPlaceholderText(/Explain why/i)).toBeInTheDocument();
  });

  it("shows validation error when rejecting without reason", () => {
    render(
      <ApprovalCard
        approval={mockApproval}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /Reject/i }));
    fireEvent.click(screen.getByRole("button", { name: /Confirm Reject/i }));
    expect(screen.getByRole("alert")).toHaveTextContent(/required/i);
  });

  it("calls onReject with justification when rejection form is submitted", async () => {
    mockOnReject.mockResolvedValue(undefined);
    render(
      <ApprovalCard
        approval={mockApproval}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /Reject/i }));
    fireEvent.change(screen.getByPlaceholderText(/Explain why/i), {
      target: { value: "Too high risk for current maintenance window." },
    });
    fireEvent.click(screen.getByRole("button", { name: /Confirm Reject/i }));
    await waitFor(() => {
      expect(mockOnReject).toHaveBeenCalledWith(
        "appr-001",
        "Too high risk for current maintenance window."
      );
    });
  });

  it("can cancel reject mode", () => {
    render(
      <ApprovalCard
        approval={mockApproval}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /^Reject$/i }));
    expect(screen.getByPlaceholderText(/Explain why/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));
    expect(screen.queryByPlaceholderText(/Explain why/i)).not.toBeInTheDocument();
  });

  it("disables buttons when isProcessing", () => {
    render(
      <ApprovalCard
        approval={mockApproval}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
        isProcessing
      />
    );
    expect(screen.getByRole("button", { name: /Approve/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Reject/i })).toBeDisabled();
  });

  it("shows approved status for approved approval", () => {
    const approvedApproval: Approval = {
      ...mockApproval,
      status: "approved",
      respondedBy: "operator@gridmind.io",
    };
    render(
      <ApprovalCard
        approval={approvedApproval}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    );
    expect(screen.getByText(/APPROVED/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Approve/i })).not.toBeInTheDocument();
  });

  it("shows rejected status for rejected approval", () => {
    const rejectedApproval: Approval = {
      ...mockApproval,
      status: "rejected",
    };
    render(
      <ApprovalCard
        approval={rejectedApproval}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    );
    expect(screen.getByText(/REJECTED/i)).toBeInTheDocument();
  });

  it("has accessible article role with label", () => {
    render(
      <ApprovalCard
        approval={mockApproval}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    );
    const article = screen.getByRole("article");
    expect(article).toHaveAttribute("aria-label", expect.stringContaining("SHERLOCK"));
  });
});
