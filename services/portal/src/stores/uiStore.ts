import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ModalState, Notification } from "@/types";

interface UiStore {
  sidebarCollapsed: boolean;
  modal: ModalState;
  notifications: Notification[];
  unreadCount: number;

  // Actions
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  openModal: (type: ModalState["type"], payload?: Record<string, unknown>) => void;
  closeModal: () => void;
  addNotification: (notification: Omit<Notification, "notificationId" | "read" | "createdAt">) => void;
  markNotificationRead: (id: string) => void;
  markAllRead: () => void;
  dismissNotification: (id: string) => void;
}

function generateId(): string {
  return `notif_${Math.random().toString(36).slice(2, 11)}`;
}

export const useUiStore = create<UiStore>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      modal: { isOpen: false, type: null, payload: null },
      notifications: [],
      unreadCount: 0,

      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

      openModal: (type, payload = {}) =>
        set({ modal: { isOpen: true, type, payload } }),

      closeModal: () =>
        set({ modal: { isOpen: false, type: null, payload: null } }),

      addNotification: (notif) => {
        const notification: Notification = {
          ...notif,
          notificationId: generateId(),
          read: false,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          notifications: [notification, ...state.notifications].slice(0, 100),
          unreadCount: state.unreadCount + 1,
        }));
      },

      markNotificationRead: (id) => {
        set((state) => {
          const notifications = state.notifications.map((n) =>
            n.notificationId === id ? { ...n, read: true } : n,
          );
          const unreadCount = notifications.filter((n) => !n.read).length;
          return { notifications, unreadCount };
        });
      },

      markAllRead: () => {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
          unreadCount: 0,
        }));
      },

      dismissNotification: (id) => {
        set((state) => {
          const notifications = state.notifications.filter((n) => n.notificationId !== id);
          const unreadCount = notifications.filter((n) => !n.read).length;
          return { notifications, unreadCount };
        });
      },
    }),
    {
      name: "gridmind-portal-ui",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? localStorage : ({} as Storage)
      ),
      partialize: (state) => ({ sidebarCollapsed: state.sidebarCollapsed }),
    },
  ),
);
