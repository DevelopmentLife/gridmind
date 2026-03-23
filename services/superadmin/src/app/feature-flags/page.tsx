"use client";

import { useState } from "react";
import { TopBar } from "@/components/TopBar";
import { FeatureFlagRow } from "@/components/FeatureFlagRow";
import type { FeatureFlag } from "@/types";

const MOCK_FLAGS: FeatureFlag[] = [
  { flagId: "ff-001", name: "new_onboarding_flow", description: "Redesigned 3-step onboarding experience with interactive setup wizard", status: "partial", rolloutPercentage: 50, enabledTenants: ["t-001", "t-003"], disabledTenants: [], createdAt: "2025-01-10T10:00:00Z", updatedAt: "2025-03-15T14:30:00Z", updatedBy: "cto@gridmindai.dev", tags: ["onboarding", "ux"] },
  { flagId: "ff-002", name: "agent_opus_reasoning", description: "Use Claude Opus for SHERLOCK reasoning tasks (higher quality, higher cost)", status: "disabled", rolloutPercentage: 0, enabledTenants: ["t-006"], disabledTenants: [], createdAt: "2025-02-01T09:00:00Z", updatedAt: "2025-02-28T16:00:00Z", updatedBy: "cto@gridmindai.dev", tags: ["agents", "ai", "cost"] },
  { flagId: "ff-003", name: "enterprise_rbac_v2", description: "Enhanced RBAC with fine-grained permissions, custom roles, and audit integrations", status: "enabled", rolloutPercentage: 100, enabledTenants: [], disabledTenants: [], createdAt: "2024-12-01T00:00:00Z", updatedAt: "2025-01-15T12:00:00Z", updatedBy: "eng@gridmindai.dev", tags: ["security", "enterprise"] },
  { flagId: "ff-004", name: "cost_forecasting_beta", description: "AI-powered monthly cost forecasting using ORACLE historical analysis", status: "partial", rolloutPercentage: 25, enabledTenants: ["t-001", "t-003", "t-006"], disabledTenants: [], createdAt: "2025-03-01T08:00:00Z", updatedAt: "2025-03-18T10:00:00Z", updatedBy: "product@gridmindai.dev", tags: ["ai", "billing", "beta"] },
  { flagId: "ff-005", name: "multi_region_deployments", description: "Allow tenants to deploy databases across multiple AWS regions simultaneously", status: "disabled", rolloutPercentage: 0, enabledTenants: [], disabledTenants: [], createdAt: "2025-02-15T11:00:00Z", updatedAt: "2025-02-15T11:00:00Z", updatedBy: "cto@gridmindai.dev", tags: ["infrastructure", "enterprise"] },
  { flagId: "ff-006", name: "portal_dark_mode_v2", description: "Updated dark mode theme with improved contrast ratios and WCAG AA compliance", status: "enabled", rolloutPercentage: 100, enabledTenants: [], disabledTenants: [], createdAt: "2025-01-20T09:00:00Z", updatedAt: "2025-02-10T15:00:00Z", updatedBy: "design@gridmindai.dev", tags: ["ui", "accessibility"] },
  { flagId: "ff-007", name: "webhook_v2_api", description: "New webhook API with retry logic, signature verification, and delivery receipts", status: "partial", rolloutPercentage: 10, enabledTenants: [], disabledTenants: ["t-005"], createdAt: "2025-03-10T14:00:00Z", updatedAt: "2025-03-19T09:00:00Z", updatedBy: "eng@gridmindai.dev", tags: ["api", "integrations", "beta"] },
];

export default function FeatureFlagsPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>(MOCK_FLAGS);
  const [savingFlagId, setSavingFlagId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filteredFlags = search
    ? flags.filter(
        (f) =>
          f.name.toLowerCase().includes(search.toLowerCase()) ||
          f.description.toLowerCase().includes(search.toLowerCase()) ||
          f.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
      )
    : flags;

  const handleToggle = (flagId: string, enabled: boolean) => {
    setSavingFlagId(flagId);
    // Simulate API call
    setTimeout(() => {
      setFlags((prev) =>
        prev.map((f) =>
          f.flagId === flagId
            ? {
                ...f,
                status: enabled ? "enabled" : "disabled",
                rolloutPercentage: enabled ? 100 : 0,
                updatedAt: new Date().toISOString(),
              }
            : f
        )
      );
      setSavingFlagId(null);
    }, 500);
  };

  const handleRolloutChange = (flagId: string, percentage: number) => {
    setSavingFlagId(flagId);
    setTimeout(() => {
      setFlags((prev) =>
        prev.map((f) =>
          f.flagId === flagId
            ? {
                ...f,
                rolloutPercentage: percentage,
                status: percentage === 0 ? "disabled" : percentage === 100 ? "enabled" : "partial",
                updatedAt: new Date().toISOString(),
              }
            : f
        )
      );
      setSavingFlagId(null);
    }, 500);
  };

  const enabledCount = flags.filter((f) => f.status === "enabled").length;
  const partialCount = flags.filter((f) => f.status === "partial").length;
  const disabledCount = flags.filter((f) => f.status === "disabled").length;

  return (
    <>
      <TopBar
        title="Feature Flags"
        subtitle={`${flags.length} flags · ${enabledCount} enabled · ${partialCount} partial · ${disabledCount} disabled`}
      />

      <div className="p-6">
        {/* Search */}
        <div className="mb-5">
          <div className="relative max-w-sm">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-muted w-3.5 h-3.5"
              viewBox="0 0 14 14"
              fill="none"
              aria-hidden="true"
            >
              <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M9.5 9.5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              placeholder="Search flags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-brand-navy border border-brand-border-default rounded-lg pl-9 pr-3 py-2 text-sm text-brand-text-primary placeholder:text-brand-text-muted focus:outline-none focus:ring-2 focus:ring-brand-amber/40 focus:border-brand-amber/60 transition-colors"
              aria-label="Search feature flags"
            />
          </div>
        </div>

        {/* Flag list */}
        <div className="space-y-3" role="list" aria-label="Feature flags">
          {filteredFlags.length === 0 ? (
            <div className="text-center py-12 text-brand-text-muted text-sm">
              No flags match your search.
            </div>
          ) : (
            filteredFlags.map((flag) => (
              <div key={flag.flagId} role="listitem">
                <FeatureFlagRow
                  flag={flag}
                  isSaving={savingFlagId === flag.flagId}
                  onToggle={handleToggle}
                  onRolloutChange={handleRolloutChange}
                  data-testid={`flag-row-${flag.flagId}`}
                />
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
