"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import clsx from "clsx";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: string | number;
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "Dashboard",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <rect x="1" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <rect x="9" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <rect x="1" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <rect x="9" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    href: "/tenants",
    label: "Tenants",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M8 8a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" strokeWidth="1.5" />
        <path d="M2 14c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/revenue",
    label: "Revenue",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M8 1v14M4 5h5.5a2.5 2.5 0 010 5H4m0-5H3m1 5H3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/agents",
    label: "Agent Fleet",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="6" r="3" stroke="currentColor" strokeWidth="1.5" />
        <path d="M3 14c0-2.761 2.239-5 5-5s5 2.239 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="2" cy="4" r="1.5" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="14" cy="4" r="1.5" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    ),
  },
  {
    href: "/incidents",
    label: "Incidents",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M8 1L15 14H1L8 1z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M8 6v4M8 11.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/feature-flags",
    label: "Feature Flags",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M3 2v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M3 2h9l-2.5 4L12 10H3" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/system",
    label: "System Health",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M1 8h2l2-5 2 10 2-6 2 4 2-3h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/audit",
    label: "Audit Log",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M5 6h6M5 9h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/settings",
    label: "Settings",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 1v1M8 14v1M1 8h1M14 8h1M3.22 3.22l.707.707M12.07 12.07l.707.707M12.07 3.93l-.707.707M3.93 12.07l-.707.707" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
];

export function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <aside
      className="flex flex-col w-60 bg-brand-navy border-r border-brand-border-subtle min-h-screen flex-shrink-0"
      aria-label="Platform navigation"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-brand-border-subtle">
        <div
          className="w-8 h-8 rounded-lg bg-brand-amber flex items-center justify-center flex-shrink-0 shadow-glow-amber"
          aria-hidden="true"
        >
          <span className="text-brand-midnight font-bold text-sm font-mono">G</span>
        </div>
        <div className="min-w-0">
          <p className="text-brand-text-primary text-sm font-semibold truncate">
            GridMind
          </p>
          <p className="text-brand-amber text-2xs font-mono uppercase tracking-wider">
            SuperAdmin
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto" aria-label="Main navigation">
        <ul className="space-y-0.5" role="list">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={clsx(
                    "relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group",
                    "focus:outline-none focus:ring-2 focus:ring-brand-amber/60",
                    active
                      ? "text-brand-amber bg-brand-amber/10"
                      : "text-brand-text-secondary hover:text-brand-text-primary hover:bg-brand-slate"
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  {/* Active indicator */}
                  {active && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute left-0 inset-y-1 w-0.5 rounded-full bg-brand-amber"
                      aria-hidden="true"
                    />
                  )}

                  <span
                    className={clsx(
                      "flex-shrink-0 transition-colors",
                      active
                        ? "text-brand-amber"
                        : "text-brand-text-muted group-hover:text-brand-text-secondary"
                    )}
                  >
                    {item.icon}
                  </span>

                  <span className="truncate">{item.label}</span>

                  {item.badge !== undefined && (
                    <span className="ml-auto flex-shrink-0 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-brand-red text-white text-2xs font-bold">
                      {item.badge}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-brand-border-subtle">
        <p className="text-brand-text-muted text-2xs font-mono text-center">
          platform.gridmind.io
        </p>
      </div>
    </aside>
  );
}
