// =============================================================================
// GridMind Admin — Approval Queue Page
// =============================================================================

"use client";

import { useEffect, useState } from "react";

import { ApprovalCard } from "@/components/ApprovalCard";
import { useApprovalStore } from "@/stores/approvalStore";
import { useUiStore } from "@/stores/uiStore";
import type { ApprovalStatus } from "@/types";

const STATUS_TABS: { value: ApprovalStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "expired", label: "Expired" },
];

export default function ApprovalsPage() {
  const [activeTab, setActiveTab] = useState<ApprovalStatus>("pending");

  const approvals = useApprovalStore((s) => s.approvals);
  const processingIds = useApprovalStore((s) => s.processingIds);
  const getPendingCount = useApprovalStore((s) => s.getPendingCount);
  const getCriticalPendingCount = useApprovalStore((s) => s.getCriticalPendingCount);
  const updateApprovalStatus = useApprovalStore((s) => s.updateApprovalStatus);
  const setProcessing = useApprovalStore((s) => s.setProcessing);

  const setBreadcrumbs = useUiStore((s) => s.setBreadcrumbs);
  const addNotification = useUiStore((s) => s.addNotification);

  useEffect(() => {
    setBreadcrumbs([{ label: "Approvals" }]);
    return () => setBreadcrumbs([]);
  }, [setBreadcrumbs]);

  const pendingCount = getPendingCount();
  const criticalCount = getCriticalPendingCount();
  const tabApprovals = approvals.filter((a) => a.status === activeTab);

  const handleApprove = async (approvalId: string, justification?: string) => {
    setProcessing(approvalId, true);
    try {
      // Production: await approvalsApi.approveApproval(approvalId, justification)
      await new Promise<void>((r) => setTimeout(r, 800));
      updateApprovalStatus(
        approvalId,
        "approved",
        "operator@gridmind.io",
        justification ?? "Approved by operator"
      );
      addNotification({
        type: "success",
        title: "Approval granted",
        message: "Agent action has been approved.",
      });
    } finally {
      setProcessing(approvalId, false);
    }
  };

  const handleReject = async (approvalId: string, justification: string) => {
    setProcessing(approvalId, true);
    try {
      // Production: await approvalsApi.rejectApproval(approvalId, justification)
      await new Promise<void>((r) => setTimeout(r, 800));
      updateApprovalStatus(
        approvalId,
        "rejected",
        "operator@gridmind.io",
        justification
      );
      addNotification({
        type: "info",
        title: "Approval rejected",
        message: "The agent action has been rejected.",
      });
    } finally {
      setProcessing(approvalId, false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-text-primary">
            Approval Queue
          </h1>
          <p className="text-brand-text-secondary text-sm mt-1">
            Review and respond to agent action requests
          </p>
        </div>
        {criticalCount > 0 && (
          <div
            role="alert"
            aria-live="assertive"
            className="flex items-center gap-2 bg-brand-red/10 border border-brand-red/40 rounded-lg px-4 py-2"
          >
            <span
              className="w-2 h-2 bg-brand-red rounded-full animate-pulse"
              aria-hidden="true"
            />
            <span className="text-sm font-semibold text-brand-red">
              {criticalCount} critical-risk approval
              {criticalCount > 1 ? "s" : ""} pending
            </span>
          </div>
        )}
      </div>

      {/* Tab navigation */}
      <nav
        aria-label="Approval status filter"
        role="tablist"
        className="flex gap-1 bg-brand-navy border border-brand-border-default rounded-lg p-1 w-fit"
      >
        {STATUS_TABS.map((statusTab) => {
          const count = approvals.filter(
            (a) => a.status === statusTab.value
          ).length;
          return (
            <button
              key={statusTab.value}
              type="button"
              role="tab"
              aria-selected={activeTab === statusTab.value}
              aria-controls={`tabpanel-${statusTab.value}`}
              onClick={() => setActiveTab(statusTab.value)}
              className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition-all ${
                activeTab === statusTab.value
                  ? "bg-brand-electric/10 text-brand-electric border border-brand-electric/20"
                  : "text-brand-text-secondary hover:text-brand-text-primary"
              }`}
            >
              {statusTab.label}
              {count > 0 && (
                <span
                  aria-label={`${count} items`}
                  className={`text-2xs font-mono px-1.5 py-0.5 rounded-full ${
                    statusTab.value === "pending"
                      ? "bg-brand-amber text-brand-midnight font-bold"
                      : "bg-brand-border-default text-brand-text-muted"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Tab panel */}
      <div
        id={`tabpanel-${activeTab}`}
        role="tabpanel"
        aria-label={`${activeTab} approvals`}
      >
        {tabApprovals.length === 0 ? (
          <div className="bg-brand-navy border border-brand-border-default rounded-lg p-12 text-center">
            <p className="text-brand-text-muted font-mono text-sm">
              No {activeTab} approvals.
            </p>
            {activeTab === "pending" && pendingCount === 0 && (
              <p className="text-brand-green font-mono text-xs mt-2">
                All agents are operating autonomously.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {tabApprovals.map((approval) => (
              <ApprovalCard
                key={approval.approvalId}
                approval={approval}
                onApprove={handleApprove}
                onReject={handleReject}
                isProcessing={processingIds.has(approval.approvalId)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
