import { create } from "zustand";
import type { Approval } from "@/types";
import { approvals as approvalsApi } from "@/lib/api";

interface ApprovalStore {
  approvals: Approval[];
  isLoading: boolean;
  error: string | null;
  submitting: Record<string, boolean>;

  // Actions
  fetchApprovals: (status?: string) => Promise<void>;
  approveRequest: (id: string, justification?: string) => Promise<void>;
  rejectRequest: (id: string, reason: string) => Promise<void>;
  upsertApproval: (approval: Approval) => void;
  setError: (error: string | null) => void;

  // Derived
  getPendingApprovals: () => Approval[];
  getPendingCount: () => number;
  getCriticalCount: () => number;
}

export const useApprovalStore = create<ApprovalStore>((set, get) => ({
  approvals: [],
  isLoading: false,
  error: null,
  submitting: {},

  fetchApprovals: async (status = "pending") => {
    set({ isLoading: true, error: null });
    try {
      const data = await approvalsApi.list(status);
      set({ approvals: data, isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load approvals";
      set({ isLoading: false, error: message });
    }
  },

  approveRequest: async (id, justification) => {
    set((state) => ({ submitting: { ...state.submitting, [id]: true } }));
    try {
      const updated = await approvalsApi.approve(id, justification);
      set((state) => ({
        approvals: state.approvals.map((a) => (a.approvalId === id ? updated : a)),
        submitting: { ...state.submitting, [id]: false },
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to approve request";
      set((state) => ({
        error: message,
        submitting: { ...state.submitting, [id]: false },
      }));
      throw err;
    }
  },

  rejectRequest: async (id, reason) => {
    set((state) => ({ submitting: { ...state.submitting, [id]: true } }));
    try {
      const updated = await approvalsApi.reject(id, reason);
      set((state) => ({
        approvals: state.approvals.map((a) => (a.approvalId === id ? updated : a)),
        submitting: { ...state.submitting, [id]: false },
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to reject request";
      set((state) => ({
        error: message,
        submitting: { ...state.submitting, [id]: false },
      }));
      throw err;
    }
  },

  upsertApproval: (approval) => {
    set((state) => ({
      approvals: state.approvals.some((a) => a.approvalId === approval.approvalId)
        ? state.approvals.map((a) => (a.approvalId === approval.approvalId ? approval : a))
        : [approval, ...state.approvals],
    }));
  },

  setError: (error) => set({ error }),

  getPendingApprovals: () => get().approvals.filter((a) => a.status === "pending"),

  getPendingCount: () => get().approvals.filter((a) => a.status === "pending").length,

  getCriticalCount: () =>
    get().approvals.filter((a) => a.status === "pending" && a.riskLevel === "critical").length,
}));
