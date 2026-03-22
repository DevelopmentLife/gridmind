import { describe, it, expect, beforeEach } from "vitest";

import { useApprovalStore } from "@/stores/approvalStore";
import type { Approval } from "@/types";

const makeApproval = (overrides: Partial<Approval> = {}): Approval => ({
  approvalId: "appr-001",
  tenantId: "tenant-001",
  tenantName: "Acme Corporation",
  sourceAgentId: "sherlock-001",
  sourceAgentName: "sherlock",
  sourceAgentDisplayName: "SHERLOCK",
  actionDescription: "Restart connection pool",
  riskLevel: "high",
  context: {},
  status: "pending",
  requestedAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 3600_000).toISOString(),
  timeoutSeconds: 300,
  ...overrides,
});

describe("approvalStore", () => {
  beforeEach(() => {
    useApprovalStore.setState({
      approvals: [],
      selectedApprovalId: null,
      isLoading: false,
      error: null,
      processingIds: new Set<string>(),
    });
  });

  describe("setApprovals", () => {
    it("sets the approvals list", () => {
      const approvals = [makeApproval(), makeApproval({ approvalId: "appr-002" })];
      useApprovalStore.getState().setApprovals(approvals);
      expect(useApprovalStore.getState().approvals).toHaveLength(2);
    });
  });

  describe("selectApproval", () => {
    it("sets selectedApprovalId", () => {
      useApprovalStore.getState().selectApproval("appr-001");
      expect(useApprovalStore.getState().selectedApprovalId).toBe("appr-001");
    });

    it("clears selectedApprovalId", () => {
      useApprovalStore.getState().selectApproval("appr-001");
      useApprovalStore.getState().selectApproval(null);
      expect(useApprovalStore.getState().selectedApprovalId).toBeNull();
    });
  });

  describe("updateApprovalStatus", () => {
    it("updates status to approved", () => {
      useApprovalStore.getState().setApprovals([makeApproval()]);
      useApprovalStore
        .getState()
        .updateApprovalStatus("appr-001", "approved", "operator@gridmind.io", "LGTM");
      expect(useApprovalStore.getState().approvals[0]?.status).toBe("approved");
    });

    it("updates status to rejected", () => {
      useApprovalStore.getState().setApprovals([makeApproval()]);
      useApprovalStore
        .getState()
        .updateApprovalStatus("appr-001", "rejected", "operator@gridmind.io", "Too risky");
      expect(useApprovalStore.getState().approvals[0]?.status).toBe("rejected");
    });

    it("sets respondedBy and justification", () => {
      useApprovalStore.getState().setApprovals([makeApproval()]);
      useApprovalStore
        .getState()
        .updateApprovalStatus("appr-001", "approved", "op@gm.io", "All good");
      const updated = useApprovalStore.getState().approvals[0];
      expect(updated?.respondedBy).toBe("op@gm.io");
      expect(updated?.justification).toBe("All good");
    });

    it("sets respondedAt timestamp", () => {
      useApprovalStore.getState().setApprovals([makeApproval()]);
      const before = new Date().toISOString();
      useApprovalStore
        .getState()
        .updateApprovalStatus("appr-001", "approved");
      const updated = useApprovalStore.getState().approvals[0];
      expect(updated?.respondedAt).toBeDefined();
      expect(updated?.respondedAt! >= before).toBe(true);
    });

    it("does not affect other approvals", () => {
      useApprovalStore.getState().setApprovals([
        makeApproval({ approvalId: "appr-001" }),
        makeApproval({ approvalId: "appr-002" }),
      ]);
      useApprovalStore.getState().updateApprovalStatus("appr-001", "approved");
      expect(useApprovalStore.getState().approvals[1]?.status).toBe("pending");
    });
  });

  describe("setProcessing", () => {
    it("adds approvalId to processingIds", () => {
      useApprovalStore.getState().setProcessing("appr-001", true);
      expect(useApprovalStore.getState().processingIds.has("appr-001")).toBe(true);
    });

    it("removes approvalId from processingIds", () => {
      useApprovalStore.getState().setProcessing("appr-001", true);
      useApprovalStore.getState().setProcessing("appr-001", false);
      expect(useApprovalStore.getState().processingIds.has("appr-001")).toBe(false);
    });

    it("can process multiple approvals simultaneously", () => {
      useApprovalStore.getState().setProcessing("appr-001", true);
      useApprovalStore.getState().setProcessing("appr-002", true);
      expect(useApprovalStore.getState().processingIds.has("appr-001")).toBe(true);
      expect(useApprovalStore.getState().processingIds.has("appr-002")).toBe(true);
    });
  });

  describe("getApprovalById", () => {
    it("returns matching approval", () => {
      useApprovalStore.getState().setApprovals([makeApproval()]);
      const found = useApprovalStore.getState().getApprovalById("appr-001");
      expect(found?.sourceAgentDisplayName).toBe("SHERLOCK");
    });

    it("returns undefined for unknown id", () => {
      useApprovalStore.getState().setApprovals([makeApproval()]);
      const found = useApprovalStore.getState().getApprovalById("does-not-exist");
      expect(found).toBeUndefined();
    });
  });

  describe("getPendingApprovals", () => {
    it("returns only pending approvals", () => {
      useApprovalStore.getState().setApprovals([
        makeApproval({ approvalId: "a1", status: "pending" }),
        makeApproval({ approvalId: "a2", status: "approved" }),
        makeApproval({ approvalId: "a3", status: "pending" }),
      ]);
      const pending = useApprovalStore.getState().getPendingApprovals();
      expect(pending).toHaveLength(2);
    });
  });

  describe("getPendingCount", () => {
    it("returns count of pending approvals", () => {
      useApprovalStore.getState().setApprovals([
        makeApproval({ approvalId: "a1", status: "pending" }),
        makeApproval({ approvalId: "a2", status: "approved" }),
        makeApproval({ approvalId: "a3", status: "pending" }),
        makeApproval({ approvalId: "a4", status: "rejected" }),
      ]);
      expect(useApprovalStore.getState().getPendingCount()).toBe(2);
    });

    it("returns 0 when no pending approvals", () => {
      useApprovalStore.getState().setApprovals([
        makeApproval({ approvalId: "a1", status: "approved" }),
      ]);
      expect(useApprovalStore.getState().getPendingCount()).toBe(0);
    });
  });

  describe("getCriticalPendingCount", () => {
    it("returns count of critical-risk pending approvals", () => {
      useApprovalStore.getState().setApprovals([
        makeApproval({ approvalId: "a1", status: "pending", riskLevel: "critical" }),
        makeApproval({ approvalId: "a2", status: "pending", riskLevel: "high" }),
        makeApproval({ approvalId: "a3", status: "pending", riskLevel: "critical" }),
        makeApproval({ approvalId: "a4", status: "approved", riskLevel: "critical" }),
      ]);
      expect(useApprovalStore.getState().getCriticalPendingCount()).toBe(2);
    });

    it("returns 0 when no critical pending approvals", () => {
      useApprovalStore.getState().setApprovals([
        makeApproval({ approvalId: "a1", status: "pending", riskLevel: "low" }),
      ]);
      expect(useApprovalStore.getState().getCriticalPendingCount()).toBe(0);
    });
  });
});
