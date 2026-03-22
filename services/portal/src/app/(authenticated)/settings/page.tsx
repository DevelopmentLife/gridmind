"use client";

import { useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { formatDate, formatRelativeTime, maskApiKey } from "@/lib/formatters";
import type { ApiKey, TeamMember } from "@/types";

const MOCK_API_KEYS: ApiKey[] = [
  { keyId: "key-001", name: "Production CI", prefix: "gm_live_sk_aBC", createdAt: "2026-01-15T10:00:00Z", lastUsedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), expiresAt: null },
  { keyId: "key-002", name: "Monitoring Script", prefix: "gm_live_sk_xYZ", createdAt: "2026-02-01T09:00:00Z", lastUsedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), expiresAt: "2027-02-01T09:00:00Z" },
];

const MOCK_TEAM: TeamMember[] = [
  { userId: "user-001", email: "jane@acme.com", fullName: "Jane Smith", role: "org_owner", joinedAt: "2025-11-01T09:00:00Z", lastActiveAt: new Date(Date.now() - 30 * 60 * 1000).toISOString() },
  { userId: "user-002", email: "bob@acme.com", fullName: "Bob Chen", role: "org_admin", joinedAt: "2025-11-05T10:00:00Z", lastActiveAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
  { userId: "user-003", email: "alice@acme.com", fullName: "Alice Kim", role: "org_member", joinedAt: "2026-01-10T11:00:00Z", lastActiveAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() },
];

type SettingsTab = "profile" | "team" | "api-keys" | "notifications";

export default function SettingsPage() {
  const { user, org } = useAuthStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [profileName, setProfileName] = useState(user?.fullName ?? "");
  const [profileEmail, setProfileEmail] = useState(user?.email ?? "");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("org_member");
  const [apiKeys] = useState<ApiKey[]>(MOCK_API_KEYS);
  const [team] = useState<TeamMember[]>(MOCK_TEAM);

  const tabs: { key: SettingsTab; label: string }[] = [
    { key: "profile", label: "Profile" },
    { key: "team", label: "Team" },
    { key: "api-keys", label: "API Keys" },
    { key: "notifications", label: "Notifications" },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-brand-text-primary text-2xl font-bold">Settings</h1>
        <p className="text-brand-text-muted text-sm mt-1">{org?.name}</p>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-brand-border-default mb-6" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px focus:outline-none focus:ring-2 focus:ring-brand-electric/50 rounded-t-md ${
              activeTab === tab.key
                ? "border-brand-electric text-brand-electric"
                : "border-transparent text-brand-text-muted hover:text-brand-text-secondary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Profile */}
      {activeTab === "profile" && (
        <div className="space-y-5">
          <div className="card">
            <h2 className="text-brand-text-primary font-semibold text-sm mb-4">Personal information</h2>
            <form
              onSubmit={(e) => { e.preventDefault(); }}
              className="space-y-4"
            >
              <div>
                <label htmlFor="fullName" className="label">Full name</label>
                <input
                  id="fullName"
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="input"
                  autoComplete="name"
                />
              </div>
              <div>
                <label htmlFor="email" className="label">Email address</label>
                <input
                  id="email"
                  type="email"
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                  className="input"
                  autoComplete="email"
                />
              </div>
              <div className="flex justify-end">
                <button type="submit" className="btn-primary">Save changes</button>
              </div>
            </form>
          </div>

          <div className="card">
            <h2 className="text-brand-text-primary font-semibold text-sm mb-4">Change password</h2>
            <form onSubmit={(e) => { e.preventDefault(); }} className="space-y-4">
              <div>
                <label htmlFor="currentPassword" className="label">Current password</label>
                <input id="currentPassword" type="password" className="input" autoComplete="current-password" placeholder="••••••••" />
              </div>
              <div>
                <label htmlFor="newPassword" className="label">New password</label>
                <input id="newPassword" type="password" className="input" autoComplete="new-password" placeholder="Min. 8 chars, 1 uppercase, 1 number" />
              </div>
              <div>
                <label htmlFor="confirmNewPassword" className="label">Confirm new password</label>
                <input id="confirmNewPassword" type="password" className="input" autoComplete="new-password" placeholder="••••••••" />
              </div>
              <div className="flex justify-end">
                <button type="submit" className="btn-primary">Update password</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Team */}
      {activeTab === "team" && (
        <div className="space-y-5">
          <div className="card">
            <h2 className="text-brand-text-primary font-semibold text-sm mb-4">Team members ({team.length})</h2>
            <div className="space-y-3">
              {team.map((member) => (
                <div key={member.userId} className="flex items-center justify-between py-2 border-b border-brand-border-subtle last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-electric flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {member.fullName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-brand-text-primary text-sm font-medium">{member.fullName}</p>
                      <p className="text-brand-text-muted text-xs">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-brand-text-muted text-xs">
                      {member.lastActiveAt ? formatRelativeTime(member.lastActiveAt) : "Never"}
                    </span>
                    <span className="px-2 py-0.5 bg-brand-slate rounded text-brand-text-secondary text-xs">
                      {member.role.replace("org_", "")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2 className="text-brand-text-primary font-semibold text-sm mb-4">Invite member</h2>
            <form onSubmit={(e) => { e.preventDefault(); }} className="flex items-end gap-3">
              <div className="flex-1">
                <label htmlFor="inviteEmail" className="label">Email address</label>
                <input
                  id="inviteEmail"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="input"
                  placeholder="colleague@company.com"
                  autoComplete="off"
                />
              </div>
              <div className="w-40">
                <label htmlFor="inviteRole" className="label">Role</label>
                <select
                  id="inviteRole"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="input"
                >
                  <option value="org_admin">Admin</option>
                  <option value="org_member">Member</option>
                  <option value="org_viewer">Viewer</option>
                </select>
              </div>
              <button type="submit" className="btn-primary flex-shrink-0 mb-0">Send invite</button>
            </form>
          </div>
        </div>
      )}

      {/* API Keys */}
      {activeTab === "api-keys" && (
        <div className="space-y-5">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-brand-text-primary font-semibold text-sm">API keys ({apiKeys.length})</h2>
              <button type="button" className="btn-primary text-xs py-1.5">+ Create key</button>
            </div>
            <div className="space-y-3">
              {apiKeys.map((key) => (
                <div key={key.keyId} className="flex items-start justify-between py-3 border-b border-brand-border-subtle last:border-0">
                  <div>
                    <p className="text-brand-text-primary text-sm font-medium mb-1">{key.name}</p>
                    <p className="text-brand-text-muted text-xs font-mono mb-1">{maskApiKey(key.prefix)}</p>
                    <div className="flex items-center gap-3 text-2xs text-brand-text-muted">
                      <span>Created {formatDate(key.createdAt)}</span>
                      {key.lastUsedAt && <span>Last used {formatRelativeTime(key.lastUsedAt)}</span>}
                      {key.expiresAt && <span>Expires {formatDate(key.expiresAt)}</span>}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="text-brand-red hover:text-brand-red/80 text-xs transition-colors focus:outline-none ml-4 flex-shrink-0"
                    aria-label={`Revoke API key ${key.name}`}
                  >
                    Revoke
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Notifications */}
      {activeTab === "notifications" && (
        <div className="card">
          <h2 className="text-brand-text-primary font-semibold text-sm mb-4">Notification preferences</h2>
          <div className="space-y-4">
            {[
              { key: "incidentAlerts", label: "Incident alerts", desc: "Get notified when new incidents are opened or escalated" },
              { key: "approvalRequests", label: "Approval requests", desc: "Get notified when agents need your approval" },
              { key: "agentHealthAlerts", label: "Agent health alerts", desc: "Get notified when agents degrade or go offline" },
              { key: "billingAlerts", label: "Billing alerts", desc: "Usage warnings and invoice notifications" },
              { key: "weeklyDigest", label: "Weekly digest", desc: "A summary of your deployments' performance each Monday" },
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-brand-text-primary text-sm font-medium">{label}</p>
                  <p className="text-brand-text-muted text-xs mt-0.5">{desc}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={true}
                  aria-label={`Toggle ${label}`}
                  className="flex-shrink-0 w-10 h-6 rounded-full bg-brand-electric relative transition-colors focus:outline-none focus:ring-2 focus:ring-brand-electric/50"
                >
                  <span className="absolute left-4 top-1 w-4 h-4 bg-white rounded-full shadow transition-transform" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex justify-end mt-6">
            <button type="button" className="btn-primary">Save preferences</button>
          </div>
        </div>
      )}
    </div>
  );
}
