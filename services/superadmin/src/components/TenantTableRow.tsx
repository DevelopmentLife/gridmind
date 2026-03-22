"use client";

import { useState } from "react";
import clsx from "clsx";
import type { Tenant } from "@/types";
import {
  formatCurrency,
  formatDate,
  formatRelative,
  tenantStatusColor,
  tenantStatusLabel,
  tenantTierColor,
  tenantTierLabel,
} from "@/lib/formatters";

interface TenantTableRowProps {
  tenant: Tenant;
  onSelect?: (tenantId: string) => void;
  onImpersonate?: (tenant: Tenant) => void;
  onSuspend?: (tenantId: string) => void;
  onReactivate?: (tenantId: string) => void;
  "data-testid"?: string;
}

export function TenantTableRow({
  tenant,
  onSelect,
  onImpersonate,
  onSuspend,
  onReactivate,
  "data-testid": testId,
}: TenantTableRowProps) {
  const [showActions, setShowActions] = useState(false);

  const canSuspend = tenant.status === "active" || tenant.status === "trial";
  const canReactivate = tenant.status === "suspended";

  return (
    <tr
      className={clsx(
        "border-b border-brand-border-subtle transition-colors",
        "hover:bg-brand-slate/40 group",
        onSelect && "cursor-pointer"
      )}
      onClick={() => onSelect?.(tenant.tenantId)}
      data-testid={testId}
      tabIndex={onSelect ? 0 : undefined}
      onKeyDown={(e) => {
        if (onSelect && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onSelect(tenant.tenantId);
        }
      }}
      aria-label={`Tenant: ${tenant.name}`}
    >
      {/* Tenant name + email */}
      <td className="py-3 pl-4 pr-3">
        <div className="flex flex-col min-w-0">
          <span className="text-brand-text-primary text-sm font-medium truncate">
            {tenant.name}
          </span>
          <span className="text-brand-text-muted text-xs truncate">
            {tenant.ownerEmail}
          </span>
        </div>
      </td>

      {/* Tier badge */}
      <td className="py-3 px-3">
        <span
          className={clsx(
            "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize",
            "bg-brand-slate border border-brand-border-default",
            tenantTierColor(tenant.tier)
          )}
          aria-label={`Tier: ${tenantTierLabel(tenant.tier)}`}
        >
          {tenantTierLabel(tenant.tier)}
        </span>
      </td>

      {/* Status */}
      <td className="py-3 px-3">
        <div className="flex items-center gap-2">
          <span
            className={clsx(
              "w-1.5 h-1.5 rounded-full flex-shrink-0",
              tenant.status === "active" && "bg-brand-green",
              tenant.status === "suspended" && "bg-brand-amber",
              tenant.status === "churned" && "bg-brand-red",
              tenant.status === "trial" && "bg-brand-ocean",
              tenant.status === "onboarding" && "bg-brand-cyan"
            )}
            aria-hidden="true"
          />
          <span
            className={clsx("text-sm", tenantStatusColor(tenant.status))}
          >
            {tenantStatusLabel(tenant.status)}
          </span>
        </div>
      </td>

      {/* MRR */}
      <td className="py-3 px-3 text-right">
        <span className="text-brand-text-primary text-sm font-mono tabular-nums">
          {formatCurrency(tenant.mrr)}
        </span>
      </td>

      {/* Deployments */}
      <td className="py-3 px-3 text-right">
        <span className="text-brand-text-secondary text-sm tabular-nums">
          {tenant.deploymentCount}
        </span>
      </td>

      {/* Region */}
      <td className="py-3 px-3">
        <span className="text-brand-text-muted text-xs font-mono">
          {tenant.region}
        </span>
      </td>

      {/* Created */}
      <td className="py-3 px-3">
        <span
          className="text-brand-text-muted text-xs"
          title={formatDate(tenant.createdAt)}
        >
          {formatRelative(tenant.createdAt)}
        </span>
      </td>

      {/* Active incidents */}
      <td className="py-3 px-3 text-center">
        {tenant.activeIncidents > 0 ? (
          <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full bg-brand-red/20 text-brand-red text-xs font-bold border border-brand-red/40">
            {tenant.activeIncidents}
          </span>
        ) : (
          <span className="text-brand-text-muted text-xs">—</span>
        )}
      </td>

      {/* Actions */}
      <td
        className="py-3 pr-4 pl-3"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="relative flex items-center justify-end gap-1">
          {/* Impersonate — always amber, requires confirmation via modal */}
          <button
            onClick={() => onImpersonate?.(tenant)}
            className={clsx(
              "px-2.5 py-1 rounded text-xs font-medium transition-colors",
              "bg-brand-amber/10 text-brand-amber border border-brand-amber/30",
              "hover:bg-brand-amber/20 hover:border-brand-amber/60",
              "focus:outline-none focus:ring-2 focus:ring-brand-amber/60",
              "disabled:opacity-40 disabled:cursor-not-allowed"
            )}
            aria-label={`Impersonate ${tenant.name}`}
            disabled={tenant.status === "churned" || tenant.status === "suspended"}
          >
            Impersonate
          </button>

          {/* More actions */}
          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              className={clsx(
                "p-1.5 rounded text-brand-text-muted hover:text-brand-text-secondary",
                "hover:bg-brand-slate transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-brand-amber/60"
              )}
              aria-label="More tenant actions"
              aria-expanded={showActions}
              aria-haspopup="menu"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <circle cx="7" cy="3" r="1" fill="currentColor" />
                <circle cx="7" cy="7" r="1" fill="currentColor" />
                <circle cx="7" cy="11" r="1" fill="currentColor" />
              </svg>
            </button>

            {showActions && (
              <div
                className={clsx(
                  "absolute right-0 top-full mt-1 z-20 min-w-[140px]",
                  "bg-brand-navy border border-brand-border-default rounded-lg shadow-card-hover",
                  "py-1"
                )}
                role="menu"
                aria-label="Tenant actions menu"
              >
                <button
                  onClick={() => {
                    onSelect?.(tenant.tenantId);
                    setShowActions(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs text-brand-text-secondary hover:text-brand-text-primary hover:bg-brand-slate transition-colors"
                  role="menuitem"
                >
                  View Details
                </button>

                {canSuspend && (
                  <button
                    onClick={() => {
                      onSuspend?.(tenant.tenantId);
                      setShowActions(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-brand-amber hover:bg-brand-amber/10 transition-colors"
                    role="menuitem"
                  >
                    Suspend Tenant
                  </button>
                )}

                {canReactivate && (
                  <button
                    onClick={() => {
                      onReactivate?.(tenant.tenantId);
                      setShowActions(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-brand-green hover:bg-brand-green/10 transition-colors"
                    role="menuitem"
                  >
                    Reactivate
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}
