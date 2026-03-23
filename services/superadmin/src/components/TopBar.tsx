"use client";

import { useDemoStore } from "@/stores/demoStore";

interface TopBarProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function TopBar({ title, subtitle, actions }: TopBarProps) {
  const environment =
    process.env["NEXT_PUBLIC_ENVIRONMENT"] ?? "development";
  const version = process.env["NEXT_PUBLIC_APP_VERSION"] ?? "0.1.0";

  const isDemoMode = useDemoStore((s) => s.isDemoMode);
  const toggleDemoMode = useDemoStore((s) => s.toggleDemoMode);

  return (
    <>
      <header className="flex items-center justify-between px-6 py-4 bg-brand-navy border-b border-brand-border-subtle flex-shrink-0">
        {/* Title */}
        <div className="min-w-0">
          <h1 className="text-brand-text-primary font-semibold text-lg leading-tight truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-brand-text-muted text-sm mt-0.5 truncate">
              {subtitle}
            </p>
          )}
        </div>

        {/* Right: actions + demo toggle + meta */}
        <div className="flex items-center gap-4 flex-shrink-0 ml-6">
          {actions}

          {/* Demo / Live toggle */}
          <button
            type="button"
            onClick={toggleDemoMode}
            aria-label={isDemoMode ? "Switch to Live mode" : "Switch to Demo mode"}
            aria-pressed={!isDemoMode}
            className={[
              "flex items-center gap-1.5 rounded-full px-3 py-1 text-2xs font-mono font-bold uppercase border transition-colors",
              isDemoMode
                ? "bg-brand-amber/10 text-brand-amber border-brand-amber/30 hover:bg-brand-amber/20"
                : "bg-brand-green/10 text-brand-green border-brand-green/30 hover:bg-brand-green/20",
            ].join(" ")}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${isDemoMode ? "bg-brand-amber" : "bg-brand-green animate-pulse"}`}
              aria-hidden="true"
            />
            {isDemoMode ? "Demo" : "Live"}
          </button>

          {/* Environment badge */}
          <div className="flex items-center gap-2 border-l border-brand-border-subtle pl-4">
            <span
              className={[
                "inline-flex items-center px-2 py-0.5 rounded text-2xs font-mono font-bold uppercase",
                environment === "production"
                  ? "bg-brand-amber/20 text-brand-amber border border-brand-amber/40"
                  : environment === "staging"
                  ? "bg-brand-ocean/20 text-brand-ocean border border-brand-ocean/40"
                  : "bg-brand-slate text-brand-text-muted border border-brand-border-default",
              ].join(" ")}
              aria-label={`Environment: ${environment}`}
            >
              {environment}
            </span>

            <span className="text-brand-text-muted text-2xs font-mono hidden lg:inline">
              v{version}
            </span>
          </div>

          {/* Amber indicator dot — persistent god-mode reminder */}
          <div
            className="w-2 h-2 rounded-full bg-brand-amber animate-amber-pulse flex-shrink-0"
            aria-label="Superadmin mode active"
            title="Superadmin — Elevated Privileges Active"
          />
        </div>
      </header>

      {/* Live mode banner */}
      {!isDemoMode && (
        <div
          role="status"
          className="flex items-center gap-2 px-6 py-1.5 bg-brand-green/10 border-b border-brand-green/20 text-brand-green text-xs font-mono"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-brand-green animate-pulse" aria-hidden="true" />
          LIVE MODE — Connected to production API. All data is real and read-only.
        </div>
      )}
    </>
  );
}
