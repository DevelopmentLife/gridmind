"use client";

import { useState } from "react";
import clsx from "clsx";
import type { AuditLogEntry } from "@/types";
import { formatDatetime, formatRelative } from "@/lib/formatters";

interface AuditLogRowProps {
  entry: AuditLogEntry;
  isExpanded?: boolean;
  onToggleExpand?: (auditId: string) => void;
  "data-testid"?: string;
}

export function AuditLogRow({
  entry,
  isExpanded = false,
  onToggleExpand,
  "data-testid": testId,
}: AuditLogRowProps) {
  const [localExpanded, setLocalExpanded] = useState(false);
  const expanded = isExpanded || localExpanded;

  const toggle = () => {
    if (onToggleExpand) {
      onToggleExpand(entry.auditId);
    } else {
      setLocalExpanded((v) => !v);
    }
  };

  const severityBadge = {
    info: "bg-brand-slate text-brand-text-secondary border-brand-border-subtle",
    warning: "bg-brand-amber/10 text-brand-amber border-brand-amber/30",
    critical: "bg-brand-red/10 text-brand-red border-brand-red/30",
  }[entry.severity];

  const actorBadge = {
    agent: "text-brand-cyan",
    human: "text-brand-ocean",
    system: "text-brand-text-muted",
  }[entry.actorType];

  return (
    <div
      className={clsx(
        "border-b border-brand-border-subtle transition-colors",
        entry.severity === "critical" && "bg-brand-red/5",
        entry.severity === "warning" && "bg-brand-amber/5"
      )}
      data-testid={testId}
    >
      {/* Main row */}
      <button
        className={clsx(
          "w-full text-left flex items-start gap-3 px-4 py-3",
          "hover:bg-brand-slate/30 transition-colors",
          "focus:outline-none focus:ring-inset focus:ring-1 focus:ring-brand-amber/40"
        )}
        onClick={toggle}
        aria-expanded={expanded}
        aria-controls={`audit-detail-${entry.auditId}`}
        aria-label={`Audit entry: ${entry.actionType} — expand for details`}
      >
        {/* Timestamp */}
        <div className="flex-shrink-0 w-32 pt-0.5">
          <span
            className="text-brand-text-muted text-xs font-mono"
            title={formatDatetime(entry.timestamp)}
            suppressHydrationWarning
          >
            {formatRelative(entry.timestamp)}
          </span>
        </div>

        {/* Severity */}
        <div className="flex-shrink-0 w-20">
          <span
            className={clsx(
              "inline-flex items-center px-1.5 py-0.5 rounded text-2xs font-semibold uppercase border",
              severityBadge
            )}
          >
            {entry.severity}
          </span>
        </div>

        {/* Actor */}
        <div className="flex-shrink-0 w-36 min-w-0">
          <p className={clsx("text-xs font-medium", actorBadge)}>
            {entry.actorType}
          </p>
          <p className="text-brand-text-muted text-2xs truncate">
            {entry.actorEmail ?? entry.actorId}
          </p>
        </div>

        {/* Tenant */}
        <div className="flex-shrink-0 w-36 min-w-0">
          <p className="text-brand-text-secondary text-xs truncate">
            {entry.tenantName ?? entry.tenantId ?? "Platform"}
          </p>
        </div>

        {/* Agent */}
        <div className="flex-shrink-0 w-28">
          {entry.agentName ? (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-2xs font-mono bg-brand-slate text-brand-cyan border border-brand-border-subtle">
              {entry.agentName.toUpperCase()}
            </span>
          ) : (
            <span className="text-brand-text-muted text-2xs">—</span>
          )}
        </div>

        {/* Action type */}
        <div className="flex-1 min-w-0">
          <p className="text-brand-text-primary text-xs font-medium font-mono truncate">
            {entry.actionType}
          </p>
          {entry.resourceType && (
            <p className="text-brand-text-muted text-2xs truncate">
              {entry.resourceType}
              {entry.resourceId && ` / ${entry.resourceId}`}
            </p>
          )}
        </div>

        {/* Expand icon */}
        <div className="flex-shrink-0 ml-2">
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden="true"
            className={clsx(
              "text-brand-text-muted transition-transform",
              expanded && "rotate-180"
            )}
          >
            <path
              d="M2 4l4 4 4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div
          id={`audit-detail-${entry.auditId}`}
          className="px-4 pb-4 pt-0 ml-32"
          role="region"
          aria-label="Audit entry details"
        >
          <div className="bg-brand-midnight rounded-lg p-3 border border-brand-border-subtle">
            <div className="flex items-center justify-between mb-2">
              <p className="text-brand-text-muted text-2xs font-mono">
                {entry.auditId}
              </p>
              <p className="text-brand-text-muted text-2xs">
                {formatDatetime(entry.timestamp)}
              </p>
            </div>

            {entry.ipAddress && (
              <p className="text-brand-text-muted text-2xs mb-2">
                IP: <span className="font-mono text-brand-text-secondary">{entry.ipAddress}</span>
              </p>
            )}

            <pre className="text-brand-text-secondary text-2xs font-mono whitespace-pre-wrap break-all">
              {JSON.stringify(entry.details, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
