"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/stores/authStore";
import { useUiStore } from "@/stores/uiStore";
import { useApprovalStore } from "@/stores/approvalStore";
import { PlanBadge } from "./PlanBadge";

export function TopNav() {
  const router = useRouter();
  const { user, org, logout } = useAuthStore();
  const { toggleSidebar, sidebarCollapsed, notifications, unreadCount, markAllRead } = useUiStore();
  const { getPendingCount } = useApprovalStore();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const pendingApprovals = getPendingCount();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const initials = user?.fullName
    ? user.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  return (
    <header className="h-14 bg-brand-navy border-b border-brand-border-default flex items-center justify-between px-4 sticky top-0 z-30">
      {/* Left — sidebar toggle + logo */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleSidebar}
          className="p-1.5 rounded-md text-brand-text-muted hover:text-brand-text-primary hover:bg-brand-slate transition-colors focus:outline-none focus:ring-2 focus:ring-brand-electric/50"
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <span className="text-brand-text-primary font-bold text-sm">GridMind</span>
          <span className="text-brand-text-muted text-xs">Portal</span>
        </div>
        {org?.plan && <PlanBadge plan={org.plan} size="sm" />}
      </div>

      {/* Right — notifications + user menu */}
      <div className="flex items-center gap-2">
        {/* Approvals badge */}
        {pendingApprovals > 0 && (
          <button
            type="button"
            onClick={() => router.push("/approvals")}
            className="relative flex items-center gap-1.5 px-3 py-1.5 bg-brand-amber/10 hover:bg-brand-amber/20 text-brand-amber rounded-md text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-brand-amber/50"
            aria-label={`${pendingApprovals} pending approval${pendingApprovals !== 1 ? "s" : ""}`}
          >
            <span aria-hidden="true">⏳</span>
            {pendingApprovals} pending
          </button>
        )}

        {/* Notification bell */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowUserMenu(false);
            }}
            className="relative p-1.5 rounded-md text-brand-text-muted hover:text-brand-text-primary hover:bg-brand-slate transition-colors focus:outline-none focus:ring-2 focus:ring-brand-electric/50"
            aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
            aria-expanded={showNotifications}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
            {unreadCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-brand-red rounded-full text-white text-2xs flex items-center justify-center font-bold"
                aria-hidden="true"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ duration: 0.1 }}
                className="absolute right-0 top-full mt-2 w-80 bg-brand-navy border border-brand-border-default rounded-lg shadow-card-hover z-50"
                role="dialog"
                aria-label="Notifications"
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-brand-border-subtle">
                  <h2 className="text-brand-text-primary font-semibold text-sm">Notifications</h2>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={markAllRead}
                      className="text-brand-electric text-xs hover:underline focus:outline-none"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="text-brand-text-muted text-sm text-center py-8">
                      No notifications
                    </p>
                  ) : (
                    notifications.slice(0, 10).map((n) => (
                      <div
                        key={n.notificationId}
                        className={`px-4 py-3 border-b border-brand-border-subtle last:border-0 ${
                          !n.read ? "bg-brand-electric/5" : ""
                        }`}
                      >
                        <p className="text-brand-text-primary text-xs font-medium">{n.title}</p>
                        <p className="text-brand-text-muted text-xs mt-0.5">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowNotifications(false);
            }}
            className="flex items-center gap-2 p-1.5 rounded-md hover:bg-brand-slate transition-colors focus:outline-none focus:ring-2 focus:ring-brand-electric/50"
            aria-label="User menu"
            aria-expanded={showUserMenu}
          >
            <div
              className="w-7 h-7 rounded-full bg-brand-electric flex items-center justify-center text-white text-xs font-bold"
              aria-hidden="true"
            >
              {initials}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-brand-text-primary text-xs font-medium leading-tight">
                {user?.fullName ?? "User"}
              </p>
              <p className="text-brand-text-muted text-2xs">{org?.name ?? ""}</p>
            </div>
          </button>

          <AnimatePresence>
            {showUserMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ duration: 0.1 }}
                className="absolute right-0 top-full mt-2 w-52 bg-brand-navy border border-brand-border-default rounded-lg shadow-card-hover z-50"
                role="menu"
              >
                <div className="px-4 py-3 border-b border-brand-border-subtle">
                  <p className="text-brand-text-primary text-sm font-medium truncate">
                    {user?.fullName}
                  </p>
                  <p className="text-brand-text-muted text-xs truncate">{user?.email}</p>
                </div>
                <div className="py-1">
                  {[
                    { label: "Settings", href: "/settings" },
                    { label: "Billing", href: "/billing" },
                  ].map(({ label, href }) => (
                    <button
                      key={href}
                      type="button"
                      onClick={() => {
                        router.push(href);
                        setShowUserMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-brand-text-secondary hover:text-brand-text-primary hover:bg-brand-slate text-sm transition-colors focus:outline-none"
                      role="menuitem"
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="py-1 border-t border-brand-border-subtle">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-brand-red hover:bg-brand-red/10 text-sm transition-colors focus:outline-none"
                    role="menuitem"
                  >
                    Sign out
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
