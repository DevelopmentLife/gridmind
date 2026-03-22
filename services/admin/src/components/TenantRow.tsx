// =============================================================================
// GridMind Admin — Tenant Table Row Component
// =============================================================================

"use client";

import Link from "next/link";

import { StatusBadge } from "@/components/StatusBadge";
import { formatCurrency, formatDate, formatGb, formatRelativeTime } from "@/lib/formatters";
import type { Tenant } from "@/types";

interface TenantRowProps {
  tenant: Tenant;
  isSelected?: boolean;
  onSelect?: (tenantId: string) => void;
}

const TIER_LABEL: Record<string, string> = {
  starter: "Starter",
  professional: "Professional",
  enterprise: "Enterprise",
};

const TIER_CLASS: Record<string, string> = {
  starter: "text-brand-text-muted",
  professional: "text-brand-ocean",
  enterprise: "text-brand-amber",
};

export function TenantRow({ tenant, isSelected = false, onSelect }: TenantRowProps) {
  const storagePercent = Math.min(
    100,
    Math.round((tenant.storageGb / tenant.storageGbLimit) * 100)
  );

  const storageBarColor =
    storagePercent >= 90
      ? "bg-brand-red"
      : storagePercent >= 75
        ? "bg-brand-amber"
        : "bg-brand-electric";

  return (
    <tr
      role="row"
      aria-selected={isSelected}
      onClick={() => onSelect?.(tenant.tenantId)}
      className={`
        border-b border-brand-border-subtle cursor-pointer select-none
        transition-colors duration-100
        hover:bg-brand-slate/50
        ${isSelected ? "bg-brand-slate" : ""}
      `}
    >
      {/* Org name */}
      <td className="px-4 py-3.5">
        <div>
          <Link
            href={`/tenants/${tenant.tenantId}`}
            onClick={(e) => e.stopPropagation()}
            className="font-medium text-brand-text-primary hover:text-brand-electric transition-colors text-sm"
          >
            {tenant.orgName}
          </Link>
          <p className="text-xs text-brand-text-muted mt-0.5">{tenant.email}</p>
        </div>
      </td>

      {/* Status */}
      <td className="px-4 py-3.5">
        <StatusBadge status={tenant.status} size="sm" />
      </td>

      {/* Tier */}
      <td className="px-4 py-3.5">
        <span className={`text-xs font-semibold ${TIER_CLASS[tenant.tier] ?? "text-brand-text-secondary"}`}>
          {TIER_LABEL[tenant.tier] ?? tenant.tier}
        </span>
      </td>

      {/* MRR */}
      <td className="px-4 py-3.5">
        <span className="font-mono text-sm text-brand-text-primary">
          {tenant.mrr > 0 ? formatCurrency(tenant.mrr) : "—"}
        </span>
        {tenant.status === "trialing" && tenant.trialEndsAt && (
          <p className="text-xs text-brand-cyan mt-0.5">
            Trial ends {formatRelativeTime(tenant.trialEndsAt)}
          </p>
        )}
      </td>

      {/* Deployments */}
      <td className="px-4 py-3.5">
        <span className="font-mono text-sm text-brand-text-secondary">
          {tenant.deploymentCount}
        </span>
      </td>

      {/* Storage */}
      <td className="px-4 py-3.5">
        <div className="min-w-[100px]">
          <div className="flex items-center justify-between mb-1">
            <span className="font-mono text-xs text-brand-text-secondary">
              {formatGb(tenant.storageGb)} / {formatGb(tenant.storageGbLimit)}
            </span>
            <span
              className={`font-mono text-2xs ml-2 ${
                storagePercent >= 90
                  ? "text-brand-red"
                  : storagePercent >= 75
                    ? "text-brand-amber"
                    : "text-brand-text-muted"
              }`}
            >
              {storagePercent}%
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={storagePercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Storage usage: ${storagePercent}%`}
            className="h-1.5 bg-brand-border-default rounded-full overflow-hidden"
          >
            <div
              className={`h-full rounded-full transition-all ${storageBarColor}`}
              style={{ width: `${storagePercent}%` }}
            />
          </div>
        </div>
      </td>

      {/* Created */}
      <td className="px-4 py-3.5">
        <span className="text-xs text-brand-text-muted">
          {formatDate(tenant.createdAt)}
        </span>
      </td>

      {/* Actions */}
      <td className="px-4 py-3.5">
        <Link
          href={`/tenants/${tenant.tenantId}`}
          onClick={(e) => e.stopPropagation()}
          aria-label={`View details for ${tenant.orgName}`}
          className="text-xs text-brand-electric hover:text-brand-ocean transition-colors font-medium"
        >
          View →
        </Link>
      </td>
    </tr>
  );
}
