import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApprovalCard } from "@/components/ApprovalCard";
import { useApprovalStore } from "@/stores/approvalStore";
import type { Approval } from "@/types";

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className, ...rest }: React.ComponentProps<"div">) => (
      <div className={className} {...rest}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const MOCK_APPROVAL: Approval = {
  approvalId: "apr-001",
  agentName: "titan",
  displayName: "TITAN",
  deploymentId: "deploy-001",
  deploymentName: "production-primary",
  action: "Scale connection pool from 1000 → 1500",
  rationale: "Connection utilization is at 95%. Scaling will relieve pressure.",
  riskLevel: "high",
  status: "pending",
  requestedAt: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
  expiresAt: new Date(Date.now() + 296 * 1000).toISOString(),
  respondedAt: null,
  respondedBy: null,
};

describe("ApprovalCard", () => {
  beforeEach(() => {
    useApprovalStore.setState({ approvals: [MOCK_APPROVAL], submitting: {}, error: null, isLoading: false });
    vi.clearAllMocks();
  });

  it("renders agent display name", () => {
    render(<ApprovalCard approval={MOCK_APPROVAL} />);
    expect(screen.getByText("TITAN")).toBeInTheDocument();
  });

  it("renders deployment name", () => {
    render(<ApprovalCard approval={MOCK_APPROVAL} />);
    expect(screen.getByText("production-primary")).toBeInTheDocument();
  });

  it("renders action description", () => {
    render(<ApprovalCard approval={MOCK_APPROVAL} />);
    expect(screen.getByText("Scale connection pool from 1000 → 1500")).toBeInTheDocument();
  });

  it("renders rationale", () => {
    render(<ApprovalCard approval={MOCK_APPROVAL} />);
    expect(screen.getByText(/Connection utilization is at 95%/)).toBeInTheDocument();
  });

  it("renders risk level badge", () => {
    render(<ApprovalCard approval={MOCK_APPROVAL} />);
    expect(screen.getByText("high risk")).toBeInTheDocument();
  });

  it("renders Approve and Reject buttons for pending approval", () => {
    render(<ApprovalCard approval={MOCK_APPROVAL} />);
    expect(screen.getByRole("button", { name: /approve/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reject/i })).toBeInTheDocument();
  });

  it("shows reject form when Reject is clicked", async () => {
    render(<ApprovalCard approval={MOCK_APPROVAL} />);
    fireEvent.click(screen.getByRole("button", { name: /reject request/i }));
    await waitFor(() => {
      expect(screen.getByLabelText(/reason for rejection/i)).toBeInTheDocument();
    });
  });

  it("shows validation error when reject submitted with empty reason", async () => {
    render(<ApprovalCard approval={MOCK_APPROVAL} />);
    fireEvent.click(screen.getByRole("button", { name: /reject request/i }));
    await waitFor(() => screen.getByText("Confirm Reject"));
    fireEvent.click(screen.getByText("Confirm Reject"));
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Please provide a reason");
    });
  });

  it("does not render action buttons for approved approval", () => {
    const approved: Approval = {
      ...MOCK_APPROVAL,
      status: "approved",
      respondedAt: new Date().toISOString(),
      respondedBy: "jane@acme.com",
    };
    render(<ApprovalCard approval={approved} />);
    expect(screen.queryByRole("button", { name: /approve/i })).not.toBeInTheDocument();
  });

  it("shows approved state for approved approval", () => {
    const approved: Approval = {
      ...MOCK_APPROVAL,
      status: "approved",
      respondedAt: new Date().toISOString(),
      respondedBy: "jane@acme.com",
    };
    render(<ApprovalCard approval={approved} />);
    expect(screen.getByText(/Approved by jane@acme.com/)).toBeInTheDocument();
  });

  it("shows expired state for expired approval", () => {
    const expired: Approval = {
      ...MOCK_APPROVAL,
      status: "expired",
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    };
    render(<ApprovalCard approval={expired} />);
    expect(screen.getByText(/Expired — no response received/)).toBeInTheDocument();
  });

  it("calls approveRequest when Approve clicked", async () => {
    const approveRequest = vi.fn().mockResolvedValue(undefined);
    useApprovalStore.setState({ approvals: [MOCK_APPROVAL], submitting: {}, error: null, isLoading: false, approveRequest });
    render(<ApprovalCard approval={MOCK_APPROVAL} />);
    fireEvent.click(screen.getByRole("button", { name: /approve request/i }));
    await waitFor(() => {
      expect(approveRequest).toHaveBeenCalledWith("apr-001", undefined);
    });
  });
});
