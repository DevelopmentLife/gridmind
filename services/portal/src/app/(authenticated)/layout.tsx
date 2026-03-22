"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { TopNav } from "@/components/TopNav";
import { Sidebar } from "@/components/Sidebar";
import { useAuthStore } from "@/stores/authStore";

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, hydrateFromStorage } = useAuthStore();

  useEffect(() => {
    hydrateFromStorage();
    if (!isAuthenticated()) {
      router.replace("/login");
    }
  }, [hydrateFromStorage, isAuthenticated, router]);

  if (!isAuthenticated()) {
    return (
      <div className="min-h-screen bg-brand-midnight flex items-center justify-center">
        <div className="flex items-center gap-3 text-brand-text-muted">
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm">Loading…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-midnight flex flex-col">
      <TopNav />
      <div className="flex flex-1 overflow-hidden h-[calc(100vh-3.5rem)]">
        <Sidebar />
        <main className="flex-1 overflow-y-auto" id="main-content">
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-brand-electric focus:text-white focus:rounded-md focus:text-sm focus:font-medium"
          >
            Skip to main content
          </a>
          {children}
        </main>
      </div>
    </div>
  );
}
