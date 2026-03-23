// =============================================================================
// GridMind Admin — Top Bar Component
// =============================================================================

"use client";

import Link from "next/link";

import { useApprovalStore } from "@/stores/approvalStore";
import { useIncidentStore } from "@/stores/incidentStore";
import { useUiStore } from "@/stores/uiStore";
import type { BreadcrumbItem } from "@/types";

interface TopBarProps {
  breadcrumbs?: BreadcrumbItem[];
  title?: string;
}

function HamburgerIcon({ open }: { open: boolean }) {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      {open ? (
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
      )}
    </svg>
  );
}

function BellIcon({ hasBadge }: { hasBadge: boolean }) {
  return (
    <div className="relative">
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>
      {hasBadge && (
        <span
          aria-hidden="true"
          className="absolute -top-1 -right-1 w-2 h-2 bg-brand-red rounded-full"
        />
      )}
    </div>
  );
}

export function TopBar({ breadcrumbs, title }: TopBarProps) {
  const { sidebarOpen, toggleSidebar, notificationPanelOpen, toggleNotificationPanel } =
    useUiStore();
  const unreadCount = useUiStore((s) => s.getUnreadCount());
  const pendingApprovals = useApprovalStore((s) => s.getPendingCount());
  const p1Count = useIncidentStore((s) => s.getP1Count());

  const hasUrgentItems = p1Count > 0 || pendingApprovals > 0;

  return (
    <header
      className="h-14 bg-brand-navy border-b border-brand-border-subtle flex items-center px-4 gap-4 flex-shrink-0"
      role="banner"
    >
      {/* Sidebar toggle */}
      <button
        type="button"
        onClick={toggleSidebar}
        aria-label={sidebarOpen ? "Close navigation sidebar" : "Open navigation sidebar"}
        aria-expanded={sidebarOpen}
        className="p-1.5 rounded-md text-brand-text-secondary hover:text-brand-text-primary hover:bg-brand-slate transition-colors focus:outline-none focus:ring-2 focus:ring-brand-electric"
      >
        <HamburgerIcon open={sidebarOpen} />
      </button>

      {/* Breadcrumbs / Title */}
      <nav aria-label="Breadcrumb" className="flex-1 min-w-0">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <ol className="flex items-center gap-2 text-sm" role="list">
            {breadcrumbs.map((crumb, i) => (
              <li key={crumb.label} className="flex items-center gap-2">
                {i > 0 && (
                  <span
                    className="text-brand-text-muted"
                    aria-hidden="true"
                  >
                    /
                  </span>
                )}
                {crumb.href && i < breadcrumbs.length - 1 ? (
                  <Link
                    href={crumb.href}
                    className="text-brand-text-secondary hover:text-brand-text-primary transition-colors truncate max-w-[120px]"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span
                    aria-current="page"
                    className="text-brand-text-primary font-medium truncate max-w-[200px]"
                  >
                    {crumb.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        ) : title ? (
          <h1 className="text-brand-text-primary font-semibold text-sm truncate">
            {title}
          </h1>
        ) : null}
      </nav>

      {/* Right side — alerts + notifications + user */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Urgent alerts bar */}
        {hasUrgentItems && (
          <div
            role="status"
            aria-live="polite"
            aria-label={`${p1Count > 0 ? `${p1Count} P1 incident${p1Count > 1 ? "s" : ""}, ` : ""}${pendingApprovals} pending approval${pendingApprovals !== 1 ? "s" : ""}`}
            className="hidden sm:flex items-center gap-2"
          >
            {p1Count > 0 && (
              <Link
                href="/incidents"
                className="flex items-center gap-1.5 text-2xs bg-brand-red/10 text-brand-red border border-brand-red/30 rounded px-2 py-1 font-mono font-semibold animate-pulse hover:bg-brand-red/20 transition-colors"
              >
                <span className="w-1.5 h-1.5 bg-brand-red rounded-full" aria-hidden="true" />
                {p1Count} P1
              </Link>
            )}
            {pendingApprovals > 0 && (
              <Link
                href="/approvals"
                className="flex items-center gap-1.5 text-2xs bg-brand-amber/10 text-brand-amber border border-brand-amber/30 rounded px-2 py-1 font-mono font-semibold hover:bg-brand-amber/20 transition-colors"
              >
                <span className="w-1.5 h-1.5 bg-brand-amber rounded-full" aria-hidden="true" />
                {pendingApprovals} pending
              </Link>
            )}
          </div>
        )}

        {/* Notification bell */}
        <button
          type="button"
          onClick={toggleNotificationPanel}
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
          aria-expanded={notificationPanelOpen}
          aria-haspopup="dialog"
          className="p-1.5 rounded-md text-brand-text-secondary hover:text-brand-text-primary hover:bg-brand-slate transition-colors focus:outline-none focus:ring-2 focus:ring-brand-electric"
        >
          <BellIcon hasBadge={unreadCount > 0} />
        </button>

        {/* User menu */}
        <button
          type="button"
          aria-label="User menu"
          aria-haspopup="menu"
          className="flex items-center gap-2 p-1.5 rounded-md hover:bg-brand-slate transition-colors focus:outline-none focus:ring-2 focus:ring-brand-electric"
        >
          <div
            aria-hidden="true"
            className="w-7 h-7 rounded-full bg-brand-electric/20 border border-brand-electric/40 flex items-center justify-center text-brand-electric font-semibold text-xs font-mono"
          >
            OP
          </div>
          <span className="hidden md:block text-sm text-brand-text-secondary font-medium">
            operator@gridmindai.dev
          </span>
        </button>
      </div>
    </header>
  );
}
