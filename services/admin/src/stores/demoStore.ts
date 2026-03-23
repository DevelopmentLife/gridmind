// =============================================================================
// GridMind Admin — Demo / Live Mode Store
// =============================================================================

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface DemoState {
  isDemoMode: boolean;
  toggleDemoMode: () => void;
  setDemoMode: (demo: boolean) => void;
}

export const useDemoStore = create<DemoState>()(
  persist(
    (set) => ({
      isDemoMode: true,

      toggleDemoMode: () => set((s) => ({ isDemoMode: !s.isDemoMode })),

      setDemoMode: (isDemoMode) => set({ isDemoMode }),
    }),
    { name: "gm-admin-demo-mode" }
  )
);
