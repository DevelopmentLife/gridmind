// =============================================================================
// GridMind Admin — Approval Card Component
// =============================================================================

"use client";

import { useState } from "react";

import { formatRelativeTime, formatTimeRemaining } from "@/lib/formatters";
import type { Approval } from "@/types";

interface ApprovalCardProps {
  approval: Approval;
  onApprove: (approvalId: string, justification?: string) => Promise<void>;
  onReject: (approvalId: string, justification: string) => Promise<void>;
  isProcessing?: boolean;
}

const RISK_CONFIG: Record<
  string,
  { label: string; badgeClass: string; borderClass: string }
> = {
  low: {
    label: "Low Risk",
    badgeClass: "bg-brand-green/10 text-brand-green border-brand-green/20",
    borderClass: "border-l-brand-green/50",
  },
  medium: {
    label: "Medium Risk",
    badgeClass: "bg-brand-amber/10 text-brand-amber border-brand-amber/20",
    borderClass: "border-l-brand-amber/50",
  },
  high: {
    label: "High Risk",
    badgeClass: "bg-brand-red/10 text-brand-red border-brand-red/20",
    borderClass: "border-l-brand-red/60",
  },
  critical: {
    label: "Critical Risk",
    badgeClass: "bg-brand-red/20 text-brand-red border-brand-red/40",
    borderClass: "border-l-brand-red",
  },
};

export function ApprovalCard({
  approval,
  onApprove,
  onReject,
  isProcessing = false,
}: ApprovalCardProps) {
  const [rejectMode, setRejectMode] = useState(false);
  const [justification, setJustification] = useState("");
  const [justificationError, setJustificationError] = useState("");

  const riskConfig = RISK_CONFIG[approval.riskLevel] ?? RISK_CONFIG["medium"]!;
  const isExpired = new Date(approval.expiresAt) < new Date();
  const isPending = approval.status === "pending" && !isExpired;

  const handleApprove = async () => {
    await onApprove(approval.approvalId, "Approved by operator");
  };

  const handleRejectSubmit = async () => {
    if (!justification.trim()) {
      setJustificationError("Rejection reason is required.");
      return;
    }
    setJustificationError("");
    await onReject(approval.approvalId, justification.trim());
    setRejectMode(false);
    setJustification("");
  };

  return (
    <article
      aria-label={`Approval request from ${approval.sourceAgentDisplayName}: ${approval.actionDescription}`}
      className={`
        bg-brand-navy border border-brand-border-default rounded-lg overflow-hidden
        border-l-4 ${riskConfig.borderClass}
        ${isExpired ? "opacity-50" : ""}
      `}
    >
      {/* Header */}
      <div className="px-5 pt-4 pb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="font-mono font-bold text-brand-text-primary text-sm tracking-wider">
            {approval.sourceAgentDisplayName}
          </span>
          <span className="text-brand-text-muted text-xs">→</span>
          <span className="text-brand-text-secondary text-xs font-medium">
            {approval.tenantName}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className={`text-2xs px-2 py-0.5 rounded border font-mono font-semibold uppercase tracking-wider ${riskConfig.badgeClass}`}
          >
            {riskConfig.label}
          </span>
          {isExpired ? (
            <span className="text-2xs text-brand-red font-mono">EXPIRED</span>
          ) : (
            <span className="text-2xs text-brand-text-muted font-mono">
              Expires in {formatTimeRemaining(approval.expiresAt)}
            </span>
          )}
        </div>
      </div>

      {/* Action description */}
      <div className="px-5 pb-4">
        <p className="text-sm text-brand-text-primary leading-relaxed mb-3">
          {approval.actionDescription}
        </p>

        {/* Context details */}
        {Object.keys(approval.context).length > 0 && (
          <div className="bg-brand-midnight rounded p-3 mb-4">
            <p className="text-2xs text-brand-text-muted uppercase tracking-wider mb-2 font-mono">
              Context
            </p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
              {Object.entries(approval.context).map(([key, value]) => (
                <div key={key} className="contents">
                  <dt className="text-xs text-brand-text-muted font-mono">{key}:</dt>
                  <dd className="text-xs text-brand-text-primary font-mono truncate">
                    {typeof value === "object" ? JSON.stringify(value) : String(value)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {/* Footer: timestamp */}
        <p className="text-2xs text-brand-text-muted mb-4">
          Requested {formatRelativeTime(approval.requestedAt)}
        </p>

        {/* Action buttons or status */}
        {approval.status !== "pending" || isExpired ? (
          <div
            className={`text-xs font-mono font-semibold px-3 py-2 rounded border text-center ${
              approval.status === "approved"
                ? "bg-brand-green/10 text-brand-green border-brand-green/20"
                : "bg-brand-red/10 text-brand-red border-brand-red/20"
            }`}
          >
            {isExpired ? "EXPIRED" : approval.status.toUpperCase()}
            {approval.respondedBy && (
              <span className="font-normal text-brand-text-muted ml-2">
                by {approval.respondedBy}
              </span>
            )}
          </div>
        ) : rejectMode ? (
          <div className="space-y-3">
            <div>
              <label
                htmlFor={`reject-reason-${approval.approvalId}`}
                className="block text-2xs text-brand-text-muted uppercase tracking-wider mb-1 font-mono"
              >
                Rejection reason (required)
              </label>
              <textarea
                id={`reject-reason-${approval.approvalId}`}
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="Explain why this action is being rejected..."
                rows={3}
                disabled={isProcessing}
                aria-describedby={
                  justificationError
                    ? `reject-error-${approval.approvalId}`
                    : undefined
                }
                className="w-full bg-brand-midnight border border-brand-border-default rounded px-3 py-2 text-sm text-brand-text-primary placeholder-brand-text-muted focus:outline-none focus:ring-2 focus:ring-brand-electric resize-none disabled:opacity-50"
              />
              {justificationError && (
                <p
                  id={`reject-error-${approval.approvalId}`}
                  role="alert"
                  className="text-xs text-brand-red mt-1"
                >
                  {justificationError}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleRejectSubmit}
                disabled={isProcessing}
                aria-label="Confirm rejection"
                className="flex-1 bg-brand-red/10 hover:bg-brand-red/20 text-brand-red border border-brand-red/30 hover:border-brand-red/50 rounded px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? "Rejecting..." : "Confirm Reject"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setRejectMode(false);
                  setJustification("");
                  setJustificationError("");
                }}
                disabled={isProcessing}
                className="px-4 py-2 text-sm text-brand-text-secondary hover:text-brand-text-primary transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-3" role="group" aria-label="Approval actions">
            <button
              type="button"
              onClick={handleApprove}
              disabled={isProcessing || !isPending}
              aria-label={`Approve: ${approval.actionDescription}`}
              className="flex-1 bg-brand-green/10 hover:bg-brand-green/20 text-brand-green border border-brand-green/30 hover:border-brand-green/50 rounded px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? "Processing..." : "Approve"}
            </button>
            <button
              type="button"
              onClick={() => setRejectMode(true)}
              disabled={isProcessing || !isPending}
              aria-label={`Reject: ${approval.actionDescription}`}
              className="flex-1 bg-brand-red/10 hover:bg-brand-red/20 text-brand-red border border-brand-red/30 hover:border-brand-red/50 rounded px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Reject
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
