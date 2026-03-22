// =============================================================================
// GridMind Admin — Approval Queue Store
// =============================================================================

import { create } from "zustand";

import type { Approval, ApprovalStatus } from "@/types";

interface ApprovalState {
  approvals: Approval[];
  selectedApprovalId: string | null;
  isLoading: boolean;
  error: string | null;
  processingIds: Set<string>;

  // Actions
  setApprovals: (approvals: Approval[]) => void;
  selectApproval: (id: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  updateApprovalStatus: (
    approvalId: string,
    status: ApprovalStatus,
    respondedBy?: string,
    justification?: string
  ) => void;
  setProcessing: (approvalId: string, isProcessing: boolean) => void;

  // Derived
  getApprovalById: (id: string) => Approval | undefined;
  getPendingApprovals: () => Approval[];
  getPendingCount: () => number;
  getCriticalPendingCount: () => number;
}

export const useApprovalStore = create<ApprovalState>((set, get) => ({
  approvals: [],
  selectedApprovalId: null,
  isLoading: false,
  error: null,
  processingIds: new Set<string>(),

  setApprovals: (approvals) => set({ approvals }),
  selectApproval: (id) => set({ selectedApprovalId: id }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  updateApprovalStatus: (approvalId, status, respondedBy, justification) =>
    set((state) => ({
      approvals: state.approvals.map((a) =>
        a.approvalId === approvalId
          ? {
              ...a,
              status,
              respondedAt: new Date().toISOString(),
              respondedBy: respondedBy ?? a.respondedBy,
              justification: justification ?? a.justification,
            }
          : a
      ),
    })),

  setProcessing: (approvalId, isProcessing) =>
    set((state) => {
      const next = new Set(state.processingIds);
      if (isProcessing) {
        next.add(approvalId);
      } else {
        next.delete(approvalId);
      }
      return { processingIds: next };
    }),

  getApprovalById: (id) =>
    get().approvals.find((a) => a.approvalId === id),

  getPendingApprovals: () =>
    get().approvals.filter((a) => a.status === "pending"),

  getPendingCount: () =>
    get().approvals.filter((a) => a.status === "pending").length,

  getCriticalPendingCount: () =>
    get().approvals.filter(
      (a) => a.status === "pending" && a.riskLevel === "critical"
    ).length,
}));
