"use client";

interface TopBarProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function TopBar({ title, subtitle, actions }: TopBarProps) {
  const environment =
    process.env["NEXT_PUBLIC_ENVIRONMENT"] ?? "development";
  const version = process.env["NEXT_PUBLIC_APP_VERSION"] ?? "0.1.0";

  return (
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

      {/* Right: actions + meta */}
      <div className="flex items-center gap-4 flex-shrink-0 ml-6">
        {actions}

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
  );
}
