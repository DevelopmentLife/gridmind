"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Approval } from "@/types";
import { approvalRiskBg, formatRelativeTime, formatTimeRemaining } from "@/lib/formatters";
import { useApprovalStore } from "@/stores/approvalStore";

interface ApprovalCardProps {
  approval: Approval;
}

export function ApprovalCard({ approval }: ApprovalCardProps) {
  const { approveRequest, rejectRequest, submitting } = useApprovalStore();
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState("");

  const isSubmitting = submitting[approval.approvalId] ?? false;
  const isPending = approval.status === "pending";
  const isExpired =
    approval.status === "expired" || new Date(approval.expiresAt) < new Date();

  const handleApprove = async () => {
    await approveRequest(approval.approvalId);
  };

  const handleRejectSubmit = async () => {
    if (!rejectReason.trim()) {
      setRejectError("Please provide a reason for rejection.");
      return;
    }
    setRejectError("");
    await rejectRequest(approval.approvalId, rejectReason.trim());
    setShowRejectForm(false);
  };

  return (
    <div
      className={`bg-brand-navy border rounded-lg p-5 shadow-card transition-colors ${
        approval.riskLevel === "critical"
          ? "border-brand-red/30"
          : approval.riskLevel === "high"
            ? "border-brand-red/20"
            : "border-brand-border-default"
      }`}
      role="article"
      aria-label={`Approval request from ${approval.displayName}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-brand-ocean font-semibold text-sm">{approval.displayName}</span>
          <span className="text-brand-text-muted text-xs">→</span>
          <span className="text-brand-text-secondary text-xs truncate">
            {approval.deploymentName}
          </span>
        </div>
        <span
          className={`flex-shrink-0 px-2 py-0.5 rounded text-xs font-medium uppercase ${approvalRiskBg(approval.riskLevel)}`}
        >
          {approval.riskLevel} risk
        </span>
      </div>

      {/* Action description */}
      <h3 className="text-brand-text-primary font-medium text-sm mb-2">{approval.action}</h3>

      {/* Rationale */}
      <p className="text-brand-text-secondary text-xs leading-relaxed mb-4">{approval.rationale}</p>

      {/* Timer + requested time */}
      <div className="flex items-center justify-between text-xs text-brand-text-muted mb-4">
        <span>Requested {formatRelativeTime(approval.requestedAt)}</span>
        {isPending && !isExpired && (
          <span className="text-brand-amber">{formatTimeRemaining(approval.expiresAt)}</span>
        )}
        {isExpired && <span className="text-brand-red">Expired</span>}
      </div>

      {/* Action buttons (only for pending, non-expired) */}
      {isPending && !isExpired && (
        <AnimatePresence mode="wait">
          {!showRejectForm ? (
            <motion.div
              key="actions"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3"
            >
              <button
                type="button"
                onClick={handleApprove}
                disabled={isSubmitting}
                className="flex-1 py-2 px-4 bg-brand-green hover:bg-brand-green/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-brand-green/50"
                aria-label={`Approve request from ${approval.displayName}`}
              >
                {isSubmitting ? "Approving…" : "Approve"}
              </button>
              <button
                type="button"
                onClick={() => setShowRejectForm(true)}
                disabled={isSubmitting}
                className="flex-1 py-2 px-4 bg-brand-slate hover:bg-brand-slate-light disabled:opacity-50 disabled:cursor-not-allowed text-brand-text-secondary hover:text-brand-text-primary font-medium text-sm rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-brand-electric/50"
                aria-label={`Reject request from ${approval.displayName}`}
              >
                Reject
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="reject-form"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="space-y-3"
            >
              <div>
                <label
                  htmlFor={`reject-reason-${approval.approvalId}`}
                  className="block text-xs text-brand-text-secondary mb-1"
                >
                  Reason for rejection <span className="text-brand-red" aria-hidden="true">*</span>
                </label>
                <textarea
                  id={`reject-reason-${approval.approvalId}`}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={2}
                  className="w-full bg-brand-midnight border border-brand-border-default rounded-md px-3 py-2 text-sm text-brand-text-primary placeholder-brand-text-muted focus:outline-none focus:ring-2 focus:ring-brand-electric/50 resize-none"
                  placeholder="Explain why this action should not proceed…"
                  aria-required="true"
                  aria-describedby={rejectError ? `reject-error-${approval.approvalId}` : undefined}
                />
                {rejectError && (
                  <p
                    id={`reject-error-${approval.approvalId}`}
                    className="text-xs text-brand-red mt-1"
                    role="alert"
                  >
                    {rejectError}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleRejectSubmit}
                  disabled={isSubmitting}
                  className="flex-1 py-2 px-4 bg-brand-red hover:bg-brand-red/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-brand-red/50"
                >
                  {isSubmitting ? "Rejecting…" : "Confirm Reject"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowRejectForm(false);
                    setRejectReason("");
                    setRejectError("");
                  }}
                  className="py-2 px-4 text-brand-text-muted hover:text-brand-text-secondary text-sm transition-colors focus:outline-none"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Resolved state */}
      {!isPending && (
        <div
          className={`text-xs font-medium ${
            approval.status === "approved" ? "text-brand-green" : "text-brand-text-muted"
          }`}
        >
          {approval.status === "approved" && `Approved by ${approval.respondedBy ?? "system"}`}
          {approval.status === "rejected" && `Rejected by ${approval.respondedBy ?? "system"}`}
          {approval.status === "expired" && "Expired — no response received"}
          {approval.status === "cancelled" && "Cancelled by agent"}
          {approval.respondedAt && ` · ${formatRelativeTime(approval.respondedAt)}`}
        </div>
      )}
    </div>
  );
}
