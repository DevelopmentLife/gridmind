// =============================================================================
// GridMind Admin — Client Providers (data bootstrap)
// =============================================================================

"use client";

import { useEffect } from "react";

import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import {
  MOCK_AGENTS,
  MOCK_APPROVALS,
  MOCK_FLEET_HEALTH,
  MOCK_INCIDENTS,
  MOCK_TENANTS,
} from "@/lib/mock-data";
import { agentsApi, approvalsApi, incidentsApi, tenantsApi } from "@/lib/api";
import { useAgentStore } from "@/stores/agentStore";
import { useApprovalStore } from "@/stores/approvalStore";
import { useDemoStore } from "@/stores/demoStore";
import { useIncidentStore } from "@/stores/incidentStore";
import { useTenantStore } from "@/stores/tenantStore";
import { useUiStore } from "@/stores/uiStore";

function AppShell({ children }: { children: React.ReactNode }) {
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const isDemoMode = useDemoStore((s) => s.isDemoMode);

  return (
    <div className="flex h-screen bg-brand-midnight overflow-hidden">
      <Sidebar />
      <div
        className={`flex flex-col flex-1 min-w-0 transition-all duration-300 ${sidebarOpen ? "ml-56" : "ml-0"}`}
      >
        <TopBar />
        {!isDemoMode && (
          <div
            role="status"
            className="flex items-center gap-2 px-4 py-1.5 bg-brand-green/10 border-b border-brand-green/20 text-brand-green text-xs font-mono"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-brand-green animate-pulse" aria-hidden="true" />
            LIVE MODE — Connected to production API. Data is read-only.
          </div>
        )}
        <main
          id="main-content"
          className="flex-1 overflow-y-auto"
          tabIndex={-1}
          aria-label="Main content"
        >
          {children}
        </main>
      </div>
    </div>
  );
}

function DataBootstrap() {
  const setAgents = useAgentStore((s) => s.setAgents);
  const setFleetHealth = useAgentStore((s) => s.setFleetHealth);
  const setTenants = useTenantStore((s) => s.setTenants);
  const setIncidents = useIncidentStore((s) => s.setIncidents);
  const setApprovals = useApprovalStore((s) => s.setApprovals);
  const isDemoMode = useDemoStore((s) => s.isDemoMode);

  useEffect(() => {
    if (isDemoMode) {
      setAgents(MOCK_AGENTS);
      setFleetHealth(MOCK_FLEET_HEALTH);
      setTenants(MOCK_TENANTS);
      setIncidents(MOCK_INCIDENTS);
      setApprovals(MOCK_APPROVALS);
      return;
    }

    // Live mode — fetch from gateway API (read-only)
    void agentsApi.getFleetHealth().then(setFleetHealth).catch(console.error);
    void agentsApi
      .listAgents()
      .then((r) => setAgents(r.items))
      .catch(console.error);
    void tenantsApi
      .listTenants({ pageSize: 100 })
      .then((r) => setTenants(r.items))
      .catch(console.error);
    void incidentsApi
      .listIncidents({ pageSize: 100 })
      .then((r) => setIncidents(r.items))
      .catch(console.error);
    void approvalsApi
      .listApprovals({ pageSize: 100 })
      .then((r) => setApprovals(r.items))
      .catch(console.error);
  }, [isDemoMode, setAgents, setFleetHealth, setTenants, setIncidents, setApprovals]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DataBootstrap />
      <AppShell>{children}</AppShell>
    </>
  );
}
