"use client";

import { useState } from "react";
import clsx from "clsx";
import type { FeatureFlag } from "@/types";
import {
  flagStatusColor,
  flagStatusLabel,
  formatRelative,
} from "@/lib/formatters";

interface FeatureFlagRowProps {
  flag: FeatureFlag;
  isSaving?: boolean;
  onToggle?: (flagId: string, enabled: boolean) => void;
  onRolloutChange?: (flagId: string, percentage: number) => void;
  onSelect?: (flagId: string) => void;
  "data-testid"?: string;
}

export function FeatureFlagRow({
  flag,
  isSaving = false,
  onToggle,
  onRolloutChange,
  onSelect,
  "data-testid": testId,
}: FeatureFlagRowProps) {
  const [localRollout, setLocalRollout] = useState(flag.rolloutPercentage);
  const [rolloutDirty, setRolloutDirty] = useState(false);

  const isEnabled = flag.status === "enabled";
  const isPartial = flag.status === "partial";

  const handleToggle = () => {
    onToggle?.(flag.flagId, !isEnabled);
  };

  const handleRolloutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setLocalRollout(val);
    setRolloutDirty(val !== flag.rolloutPercentage);
  };

  const handleRolloutCommit = () => {
    if (rolloutDirty) {
      onRolloutChange?.(flag.flagId, localRollout);
      setRolloutDirty(false);
    }
  };

  return (
    <div
      className={clsx(
        "bg-brand-navy border border-brand-border-subtle rounded-lg p-4",
        "transition-colors hover:border-brand-border-default",
        onSelect && "cursor-pointer",
        isSaving && "opacity-60 pointer-events-none"
      )}
      onClick={() => onSelect?.(flag.flagId)}
      data-testid={testId}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onKeyDown={(e) => {
        if (onSelect && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onSelect(flag.flagId);
        }
      }}
      aria-label={`Feature flag: ${flag.name}`}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Left: name + description + tags */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-brand-text-primary text-sm font-semibold font-mono">
              {flag.name}
            </span>
            <span
              className={clsx(
                "inline-flex items-center px-1.5 py-0.5 rounded text-2xs font-medium",
                "bg-brand-slate border border-brand-border-subtle",
                flagStatusColor(flag.status)
              )}
            >
              {flagStatusLabel(flag.status)}
            </span>
            {flag.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-1.5 py-0.5 rounded text-2xs bg-brand-slate text-brand-text-muted"
              >
                {tag}
              </span>
            ))}
          </div>

          <p className="text-brand-text-muted text-xs leading-relaxed mb-2 truncate">
            {flag.description}
          </p>

          <div className="flex items-center gap-4 text-2xs text-brand-text-muted">
            <span>
              Updated{" "}
              <span title={flag.updatedAt}>{formatRelative(flag.updatedAt)}</span>
            </span>
            <span>by {flag.updatedBy}</span>
            {flag.enabledTenants.length > 0 && (
              <span className="text-brand-green">
                +{flag.enabledTenants.length} override{flag.enabledTenants.length !== 1 ? "s" : ""}
              </span>
            )}
            {flag.disabledTenants.length > 0 && (
              <span className="text-brand-red">
                -{flag.disabledTenants.length} blocked
              </span>
            )}
          </div>
        </div>

        {/* Right: toggle + rollout */}
        <div
          className="flex flex-col items-end gap-3 flex-shrink-0"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          role="presentation"
        >
          {/* Toggle switch */}
          <button
            role="switch"
            aria-checked={isEnabled || isPartial}
            aria-label={`${flag.name} is ${isEnabled ? "enabled" : "disabled"} — click to toggle`}
            onClick={handleToggle}
            disabled={isSaving}
            className={clsx(
              "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-brand-amber/60 focus:ring-offset-1 focus:ring-offset-brand-navy",
              (isEnabled || isPartial) ? "bg-brand-amber" : "bg-brand-slate",
              isSaving && "cursor-not-allowed"
            )}
          >
            <span
              className={clsx(
                "inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform",
                (isEnabled || isPartial) ? "translate-x-[18px]" : "translate-x-[3px]"
              )}
              aria-hidden="true"
            />
          </button>

          {/* Rollout slider — only visible when partial or enabled */}
          {(isPartial || (isEnabled && localRollout < 100)) && (
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-2">
                <label
                  htmlFor={`rollout-${flag.flagId}`}
                  className="text-2xs text-brand-text-muted"
                >
                  Rollout
                </label>
                <span className="text-2xs font-mono text-brand-amber tabular-nums w-8 text-right">
                  {localRollout}%
                </span>
              </div>
              <input
                id={`rollout-${flag.flagId}`}
                type="range"
                min={0}
                max={100}
                step={5}
                value={localRollout}
                onChange={handleRolloutChange}
                onMouseUp={handleRolloutCommit}
                onTouchEnd={handleRolloutCommit}
                aria-label={`Rollout percentage for ${flag.name}: ${localRollout}%`}
                className={clsx(
                  "w-28 h-1 rounded-full appearance-none cursor-pointer",
                  "accent-brand-amber bg-brand-slate"
                )}
              />
              {rolloutDirty && (
                <button
                  onClick={handleRolloutCommit}
                  className="text-2xs text-brand-amber hover:text-brand-amber-light transition-colors"
                >
                  Apply
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
