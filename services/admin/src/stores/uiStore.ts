// =============================================================================
// GridMind Admin — UI State Store
// =============================================================================

import { create } from "zustand";

import type { BreadcrumbItem } from "@/types";

interface Notification {
  notificationId: string;
  type: "info" | "success" | "warning" | "error";
  title: string;
  message?: string;
  timestamp: string;
  read: boolean;
}

interface UiState {
  sidebarOpen: boolean;
  notificationPanelOpen: boolean;
  notifications: Notification[];
  breadcrumbs: BreadcrumbItem[];
  globalLoading: boolean;
  commandPaletteOpen: boolean;

  // Actions
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setNotificationPanelOpen: (open: boolean) => void;
  toggleNotificationPanel: () => void;
  addNotification: (
    notification: Omit<Notification, "notificationId" | "timestamp" | "read">
  ) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  clearNotifications: () => void;
  setBreadcrumbs: (breadcrumbs: BreadcrumbItem[]) => void;
  setGlobalLoading: (loading: boolean) => void;
  setCommandPaletteOpen: (open: boolean) => void;

  // Derived
  getUnreadCount: () => number;
}

let notificationCounter = 0;

export const useUiStore = create<UiState>((set, get) => ({
  sidebarOpen: true,
  notificationPanelOpen: false,
  notifications: [],
  breadcrumbs: [],
  globalLoading: false,
  commandPaletteOpen: false,

  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  toggleSidebar: () =>
    set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  setNotificationPanelOpen: (notificationPanelOpen) =>
    set({ notificationPanelOpen }),
  toggleNotificationPanel: () =>
    set((state) => ({
      notificationPanelOpen: !state.notificationPanelOpen,
    })),

  addNotification: (notification) => {
    notificationCounter += 1;
    const newNotification: Notification = {
      ...notification,
      notificationId: `notif-${notificationCounter}`,
      timestamp: new Date().toISOString(),
      read: false,
    };
    set((state) => ({
      notifications: [newNotification, ...state.notifications].slice(0, 50),
    }));
  },

  markNotificationRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.notificationId === id ? { ...n, read: true } : n
      ),
    })),

  markAllNotificationsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    })),

  clearNotifications: () => set({ notifications: [] }),

  setBreadcrumbs: (breadcrumbs) => set({ breadcrumbs }),

  setGlobalLoading: (globalLoading) => set({ globalLoading }),

  setCommandPaletteOpen: (commandPaletteOpen) =>
    set({ commandPaletteOpen }),

  getUnreadCount: () =>
    get().notifications.filter((n) => !n.read).length,
}));
