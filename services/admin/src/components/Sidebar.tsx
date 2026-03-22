// =============================================================================
// GridMind Admin — Sidebar Navigation Component
// =============================================================================

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useApprovalStore } from "@/stores/approvalStore";
import { useIncidentStore } from "@/stores/incidentStore";
import { useUiStore } from "@/stores/uiStore";

interface NavSection {
  title: string;
  items: NavItem[];
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badgeKey?: "pendingApprovals" | "openIncidents" | "p1Incidents";
}

// ---------------------------------------------------------------------------
// SVG Icons (inline for zero bundle overhead)
// ---------------------------------------------------------------------------

const Icons = {
  dashboard: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zm-10 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
    </svg>
  ),
  agents: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
    </svg>
  ),
  tenants: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  deployments: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
    </svg>
  ),
  incidents: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  approvals: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  billing: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  ),
  settings: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
};

const NAV_SECTIONS: NavSection[] = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/", icon: Icons.dashboard },
      { label: "Agent Fleet", href: "/agents", icon: Icons.agents },
    ],
  },
  {
    title: "Operations",
    items: [
      { label: "Tenants", href: "/tenants", icon: Icons.tenants },
      { label: "Deployments", href: "/deployments", icon: Icons.deployments },
      {
        label: "Incidents",
        href: "/incidents",
        icon: Icons.incidents,
        badgeKey: "openIncidents",
      },
      {
        label: "Approvals",
        href: "/approvals",
        icon: Icons.approvals,
        badgeKey: "pendingApprovals",
      },
    ],
  },
  {
    title: "Platform",
    items: [
      { label: "Billing", href: "/billing", icon: Icons.billing },
      { label: "Settings", href: "/settings", icon: Icons.settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const pendingApprovals = useApprovalStore((s) => s.getPendingCount());
  const openIncidents = useIncidentStore((s) => s.getOpenCount());
  const p1Incidents = useIncidentStore((s) => s.getP1Count());

  const badges: Record<string, number> = {
    pendingApprovals,
    openIncidents,
    p1Incidents,
  };

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <aside
      aria-label="Main navigation"
      className={`
        fixed left-0 top-0 bottom-0 z-30
        flex flex-col
        bg-brand-navy border-r border-brand-border-subtle
        transition-all duration-300 ease-in-out
        ${sidebarOpen ? "w-56" : "w-0 overflow-hidden"}
      `}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-brand-border-subtle flex-shrink-0">
        <div className="w-7 h-7 rounded bg-brand-electric flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-xs font-mono">GM</span>
        </div>
        <div className="min-w-0">
          <p className="text-brand-text-primary font-semibold text-sm truncate">
            GridMind
          </p>
          <p className="text-brand-text-muted text-2xs font-mono">
            Admin Console
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3" aria-label="Site navigation">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} className="mb-6">
            <p className="text-2xs text-brand-text-muted uppercase tracking-widest font-mono px-2 mb-2">
              {section.title}
            </p>
            <ul role="list" className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(item.href);
                const badgeCount = item.badgeKey
                  ? (badges[item.badgeKey] ?? 0)
                  : 0;

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={`
                        flex items-center gap-3 px-3 py-2 rounded-md text-sm
                        transition-all duration-100
                        ${
                          active
                            ? "bg-brand-electric/10 text-brand-electric border border-brand-electric/20"
                            : "text-brand-text-secondary hover:text-brand-text-primary hover:bg-brand-slate border border-transparent"
                        }
                      `}
                    >
                      <span className="flex-shrink-0">{item.icon}</span>
                      <span className="flex-1 truncate font-medium">{item.label}</span>
                      {badgeCount > 0 && (
                        <span
                          aria-label={`${badgeCount} items`}
                          className={`
                            text-2xs font-mono font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center
                            ${
                              item.badgeKey === "openIncidents" && p1Incidents > 0
                                ? "bg-brand-red text-white animate-pulse"
                                : item.badgeKey === "pendingApprovals"
                                  ? "bg-brand-amber text-brand-midnight"
                                  : "bg-brand-electric/20 text-brand-electric"
                            }
                          `}
                        >
                          {badgeCount}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-brand-border-subtle flex-shrink-0">
        <p className="text-2xs text-brand-text-muted font-mono text-center">
          GridMind v0.1.0
        </p>
      </div>
    </aside>
  );
}
