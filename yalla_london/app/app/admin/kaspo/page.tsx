"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  AdminCard,
  AdminPageHeader,
  AdminKPICard,
  AdminButton,
  AdminEmptyState,
  AdminStatusBadge,
  AdminTabs,
  AdminAlertBanner,
  AdminLoadingState,
} from "@/components/admin/admin-ui";
import {
  Users,
  Download,
  BookOpen,
  UserPlus,
  Mail,
  Building2,
  Clock,
  FileText,
  Eye,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  X,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────

interface KaspoAgent {
  id: string;
  name: string;
  email: string;
  company: string;
  status: "active" | "pending" | "suspended";
  signupDate: string;
  score: number;
  phone: string | null;
  budgetRange: string | null;
}

interface KaspoKPIs {
  totalAgents: number;
  activeAgents: number;
  pendingAgents: number;
  suspendedAgents: number;
  newSignupsThisMonth: number;
  totalDownloads: number;
  topGuide: string;
}

interface ActivityItem {
  id: string;
  agentName: string;
  agentEmail: string;
  type: string;
  detail: string;
  timestamp: string;
}

interface ContentAccessSettings {
  guides: boolean;
  hotelReviews: boolean;
  restaurantGuides: boolean;
  eventCalendar: boolean;
  exclusiveDeals: boolean;
  customItineraries: boolean;
}

interface KaspoData {
  agents: KaspoAgent[];
  kpis: KaspoKPIs;
  contentAccessSettings: ContentAccessSettings;
  activityFeed: ActivityItem[];
}

// ─── Content Access Labels ─────────────────────────────────────────

const ACCESS_LABELS: Record<
  keyof ContentAccessSettings,
  { label: string; description: string }
> = {
  guides: {
    label: "Travel Guides",
    description: "PDF city guides and neighborhood walkthroughs",
  },
  hotelReviews: {
    label: "Hotel Reviews",
    description: "Curated luxury hotel reviews with insider notes",
  },
  restaurantGuides: {
    label: "Restaurant Guides",
    description: "Halal dining and fine dining recommendations",
  },
  eventCalendar: {
    label: "Event Calendar",
    description: "Upcoming London events, exhibitions, and shows",
  },
  exclusiveDeals: {
    label: "Exclusive Deals",
    description: "Partner hotel and experience deals for agents",
  },
  customItineraries: {
    label: "Custom Itineraries",
    description: "AI-generated bespoke travel itineraries",
  },
};

// ─── Tabs ──────────────────────────────────────────────────────────

const TABS = [
  { id: "agents", label: "Agents" },
  { id: "access", label: "Content Access" },
  { id: "activity", label: "Activity" },
];

// ─── Page Component ────────────────────────────────────────────────

export default function KaspoAdminPage() {
  const [activeTab, setActiveTab] = useState("agents");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<KaspoData | null>(null);

  // Invite modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteCompany, setInviteCompany] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteResult, setInviteResult] = useState<{
    ok: boolean;
    msg: string;
  } | null>(null);

  // Status update
  const [statusLoading, setStatusLoading] = useState<string | null>(null);

  // Access settings
  const [accessSettings, setAccessSettings] =
    useState<ContentAccessSettings | null>(null);
  const [accessSaving, setAccessSaving] = useState(false);
  const [accessSaved, setAccessSaved] = useState(false);

  // ── Fetch data ──

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/kaspo");
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(
          errData?.error || `Failed to load (${res.status})`
        );
      }
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Unknown error");

      setData({
        agents: json.agents,
        kpis: json.kpis,
        contentAccessSettings: json.contentAccessSettings,
        activityFeed: json.activityFeed,
      });
      setAccessSettings(json.contentAccessSettings);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load Kaspo data"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Invite agent ──

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviteLoading(true);
    setInviteResult(null);
    try {
      const res = await fetch("/api/admin/kaspo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "invite_agent",
          email: inviteEmail.trim(),
          company: inviteCompany.trim() || undefined,
          name: inviteName.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || `Request failed (${res.status})`);
      }
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Unknown error");

      setInviteResult({ ok: true, msg: json.message });
      setInviteEmail("");
      setInviteCompany("");
      setInviteName("");
      fetchData();
    } catch (err) {
      setInviteResult({
        ok: false,
        msg: err instanceof Error ? err.message : "Failed to invite agent",
      });
    } finally {
      setInviteLoading(false);
    }
  };

  // ── Update agent status ──

  const handleStatusUpdate = async (
    agentId: string,
    newStatus: "active" | "pending" | "suspended"
  ) => {
    setStatusLoading(agentId);
    try {
      const res = await fetch("/api/admin/kaspo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_status",
          agentId,
          status: newStatus,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || `Request failed (${res.status})`);
      }
      fetchData();
    } catch (err) {
      console.warn(
        "[kaspo] Status update failed:",
        err instanceof Error ? err.message : String(err)
      );
    } finally {
      setStatusLoading(null);
    }
  };

  // ── Save content access settings ──

  const handleSaveAccess = async () => {
    if (!accessSettings) return;
    setAccessSaving(true);
    setAccessSaved(false);
    try {
      const res = await fetch("/api/admin/kaspo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_access",
          settings: accessSettings,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || `Request failed (${res.status})`);
      }
      setAccessSaved(true);
      setTimeout(() => setAccessSaved(false), 3000);
    } catch (err) {
      console.warn(
        "[kaspo] Access settings save failed:",
        err instanceof Error ? err.message : String(err)
      );
    } finally {
      setAccessSaving(false);
    }
  };

  // ── Relative time ──

  const timeAgo = (isoDate: string) => {
    const diff = Date.now() - new Date(isoDate).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(isoDate).toLocaleDateString();
  };

  // ─── Render ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--admin-bg)] p-4 md:p-6">
        <AdminPageHeader
          title="Kaspo B2B"
          subtitle="Travel Agent Network"
        />
        <AdminLoadingState label="Loading Kaspo data..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--admin-bg)] p-4 md:p-6">
        <AdminPageHeader
          title="Kaspo B2B"
          subtitle="Travel Agent Network"
        />
        <AdminAlertBanner
          severity="critical"
          message="Failed to load Kaspo data"
          detail={error}
          action={
            <AdminButton onClick={fetchData} size="sm">
              Retry
            </AdminButton>
          }
        />
      </div>
    );
  }

  if (!data) return null;

  const { agents, kpis, activityFeed } = data;

  const tabsWithCounts = TABS.map((t) => {
    if (t.id === "agents") return { ...t, count: kpis.totalAgents };
    if (t.id === "activity") return { ...t, count: activityFeed.length };
    return t;
  });

  return (
    <div className="min-h-screen bg-[var(--admin-bg)] p-4 md:p-6 max-w-6xl mx-auto">
      {/* ── Header ── */}
      <AdminPageHeader
        title="Kaspo B2B"
        subtitle="Travel Agent Network"
        backHref="/admin/cockpit"
        action={
          <div className="flex items-center gap-2">
            <AdminButton onClick={fetchData} variant="ghost" size="sm">
              <RefreshCw size={14} />
            </AdminButton>
            <AdminButton
              onClick={() => {
                setShowInviteModal(true);
                setInviteResult(null);
              }}
              variant="primary"
              size="sm"
            >
              <UserPlus size={14} />
              <span className="hidden sm:inline">Invite Agent</span>
            </AdminButton>
          </div>
        }
      />

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <AdminKPICard
          value={kpis.activeAgents}
          label="Active Agents"
          color="var(--admin-green)"
        />
        <AdminKPICard
          value={kpis.totalDownloads}
          label="PDF Downloads"
          color="var(--admin-blue)"
        />
        <AdminKPICard
          value={
            kpis.topGuide.length > 20
              ? kpis.topGuide.slice(0, 18) + "..."
              : kpis.topGuide
          }
          label="Top Guide"
          color="var(--admin-gold)"
        />
        <AdminKPICard
          value={kpis.newSignupsThisMonth}
          label="New This Month"
          color="var(--admin-red)"
        />
      </div>

      {/* ── Tabs ── */}
      <div className="mb-5">
        <AdminTabs
          tabs={tabsWithCounts}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>

      {/* ── Tab: Agents ── */}
      {activeTab === "agents" && (
        <AgentsTab
          agents={agents}
          kpis={kpis}
          statusLoading={statusLoading}
          onStatusUpdate={handleStatusUpdate}
          timeAgo={timeAgo}
        />
      )}

      {/* ── Tab: Content Access ── */}
      {activeTab === "access" && accessSettings && (
        <ContentAccessTab
          settings={accessSettings}
          onChange={setAccessSettings}
          onSave={handleSaveAccess}
          saving={accessSaving}
          saved={accessSaved}
        />
      )}

      {/* ── Tab: Activity ── */}
      {activeTab === "activity" && (
        <ActivityTab feed={activityFeed} timeAgo={timeAgo} />
      )}

      {/* ── Invite Modal ── */}
      {showInviteModal && (
        <InviteModal
          email={inviteEmail}
          setEmail={setInviteEmail}
          company={inviteCompany}
          setCompany={setInviteCompany}
          name={inviteName}
          setName={setInviteName}
          loading={inviteLoading}
          result={inviteResult}
          onInvite={handleInvite}
          onClose={() => setShowInviteModal(false)}
        />
      )}
    </div>
  );
}

// ─── AgentsTab ─────────────────────────────────────────────────────

function AgentsTab({
  agents,
  kpis,
  statusLoading,
  onStatusUpdate,
  timeAgo,
}: {
  agents: KaspoAgent[];
  kpis: KaspoKPIs;
  statusLoading: string | null;
  onStatusUpdate: (id: string, s: "active" | "pending" | "suspended") => void;
  timeAgo: (d: string) => string;
}) {
  if (agents.length === 0) {
    return (
      <AdminCard>
        <AdminEmptyState
          icon={Users}
          title="No Kaspo agents yet"
          description="Invite your first B2B travel agent to get started."
        />
      </AdminCard>
    );
  }

  return (
    <div className="space-y-3">
      {/* Summary row */}
      <div className="flex flex-wrap gap-3 mb-2">
        <span className="inline-flex items-center gap-1.5 text-[12px] font-[var(--font-system)] text-stone-600">
          <span className="w-2 h-2 rounded-full bg-[var(--admin-green)]" />
          {kpis.activeAgents} active
        </span>
        <span className="inline-flex items-center gap-1.5 text-[12px] font-[var(--font-system)] text-stone-600">
          <span className="w-2 h-2 rounded-full bg-[var(--admin-gold)]" />
          {kpis.pendingAgents} pending
        </span>
        <span className="inline-flex items-center gap-1.5 text-[12px] font-[var(--font-system)] text-stone-600">
          <span className="w-2 h-2 rounded-full bg-stone-400" />
          {kpis.suspendedAgents} suspended
        </span>
      </div>

      {/* Desktop table */}
      <AdminCard className="hidden md:block overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[var(--admin-border)]">
                <th className="pb-3 font-[var(--font-system)] text-[11px] font-semibold uppercase tracking-[1px] text-stone-500">
                  Agent
                </th>
                <th className="pb-3 font-[var(--font-system)] text-[11px] font-semibold uppercase tracking-[1px] text-stone-500">
                  Company
                </th>
                <th className="pb-3 font-[var(--font-system)] text-[11px] font-semibold uppercase tracking-[1px] text-stone-500">
                  Status
                </th>
                <th className="pb-3 font-[var(--font-system)] text-[11px] font-semibold uppercase tracking-[1px] text-stone-500">
                  Joined
                </th>
                <th className="pb-3 font-[var(--font-system)] text-[11px] font-semibold uppercase tracking-[1px] text-stone-500">
                  Score
                </th>
                <th className="pb-3 font-[var(--font-system)] text-[11px] font-semibold uppercase tracking-[1px] text-stone-500 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {agents.map((agent) => (
                <tr
                  key={agent.id}
                  className="border-b border-[var(--admin-border)] last:border-b-0"
                >
                  <td className="py-3 pr-3">
                    <div className="font-[var(--font-system)] text-[13px] font-semibold text-stone-800">
                      {agent.name}
                    </div>
                    <div className="font-[var(--font-system)] text-[11px] text-stone-500">
                      {agent.email}
                    </div>
                  </td>
                  <td className="py-3 pr-3">
                    <div className="font-[var(--font-system)] text-[12px] text-stone-700 flex items-center gap-1.5">
                      <Building2 size={12} className="text-stone-400" />
                      {agent.company}
                    </div>
                  </td>
                  <td className="py-3 pr-3">
                    <AdminStatusBadge status={agent.status} />
                  </td>
                  <td className="py-3 pr-3">
                    <span className="font-[var(--font-system)] text-[12px] text-stone-500">
                      {timeAgo(agent.signupDate)}
                    </span>
                  </td>
                  <td className="py-3 pr-3">
                    <span className="font-[var(--font-system)] text-[13px] font-semibold text-stone-700 tabular-nums">
                      {agent.score}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <AgentActions
                      agent={agent}
                      loading={statusLoading === agent.id}
                      onStatusUpdate={onStatusUpdate}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminCard>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {agents.map((agent) => (
          <AdminCard key={agent.id}>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0">
                <div className="font-[var(--font-system)] text-[13px] font-semibold text-stone-800 truncate">
                  {agent.name}
                </div>
                <div className="font-[var(--font-system)] text-[11px] text-stone-500 truncate">
                  {agent.email}
                </div>
              </div>
              <AdminStatusBadge status={agent.status} />
            </div>
            <div className="flex items-center gap-4 text-[11px] font-[var(--font-system)] text-stone-500 mb-3">
              <span className="flex items-center gap-1">
                <Building2 size={11} />
                {agent.company}
              </span>
              <span className="flex items-center gap-1">
                <Clock size={11} />
                {timeAgo(agent.signupDate)}
              </span>
              <span>Score: {agent.score}</span>
            </div>
            <AgentActions
              agent={agent}
              loading={statusLoading === agent.id}
              onStatusUpdate={onStatusUpdate}
            />
          </AdminCard>
        ))}
      </div>
    </div>
  );
}

// ─── AgentActions ──────────────────────────────────────────────────

function AgentActions({
  agent,
  loading,
  onStatusUpdate,
}: {
  agent: KaspoAgent;
  loading: boolean;
  onStatusUpdate: (id: string, s: "active" | "pending" | "suspended") => void;
}) {
  if (loading) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] text-stone-400">
        <span className="w-3 h-3 border-2 border-stone-300 border-t-transparent rounded-full animate-spin" />
        Updating...
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap justify-end md:justify-end">
      {agent.status !== "active" && (
        <AdminButton
          size="sm"
          variant="success"
          onClick={() => onStatusUpdate(agent.id, "active")}
        >
          Activate
        </AdminButton>
      )}
      {agent.status !== "suspended" && (
        <AdminButton
          size="sm"
          variant="danger"
          onClick={() => onStatusUpdate(agent.id, "suspended")}
        >
          Suspend
        </AdminButton>
      )}
      {agent.status === "suspended" && (
        <AdminButton
          size="sm"
          variant="secondary"
          onClick={() => onStatusUpdate(agent.id, "pending")}
        >
          Reset
        </AdminButton>
      )}
    </div>
  );
}

// ─── ContentAccessTab ──────────────────────────────────────────────

function ContentAccessTab({
  settings,
  onChange,
  onSave,
  saving,
  saved,
}: {
  settings: ContentAccessSettings;
  onChange: (s: ContentAccessSettings) => void;
  onSave: () => void;
  saving: boolean;
  saved: boolean;
}) {
  const toggleSetting = (key: keyof ContentAccessSettings) => {
    onChange({ ...settings, [key]: !settings[key] });
  };

  const enabledCount = Object.values(settings).filter(Boolean).length;

  return (
    <div className="space-y-4">
      {saved && (
        <AdminAlertBanner
          severity="info"
          message="Content access settings saved successfully"
        />
      )}

      <AdminCard>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-[var(--font-display)] font-bold text-[14px] text-stone-800">
              Agent Content Access
            </h3>
            <p className="font-[var(--font-system)] text-[11px] text-stone-500 mt-1">
              Control which content categories Kaspo agents can access.{" "}
              {enabledCount} of {Object.keys(settings).length} enabled.
            </p>
          </div>
          <AdminButton
            onClick={onSave}
            variant="primary"
            size="sm"
            loading={saving}
          >
            Save Changes
          </AdminButton>
        </div>

        <div className="space-y-0 divide-y divide-[var(--admin-border)]">
          {(
            Object.keys(ACCESS_LABELS) as Array<keyof ContentAccessSettings>
          ).map((key) => {
            const { label, description } = ACCESS_LABELS[key];
            const enabled = settings[key];

            return (
              <div
                key={key}
                className="flex items-center justify-between py-3.5 gap-4"
              >
                <div className="min-w-0">
                  <div className="font-[var(--font-system)] text-[13px] font-semibold text-stone-800">
                    {label}
                  </div>
                  <div className="font-[var(--font-system)] text-[11px] text-stone-500 mt-0.5">
                    {description}
                  </div>
                </div>
                <button
                  onClick={() => toggleSetting(key)}
                  className="flex-shrink-0 p-1 rounded-lg transition-colors"
                  aria-label={`Toggle ${label}`}
                  role="switch"
                  aria-checked={enabled}
                >
                  {enabled ? (
                    <ToggleRight
                      size={28}
                      className="text-[var(--admin-green)]"
                    />
                  ) : (
                    <ToggleLeft size={28} className="text-stone-300" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </AdminCard>
    </div>
  );
}

// ─── ActivityTab ───────────────────────────────────────────────────

function ActivityTab({
  feed,
  timeAgo,
}: {
  feed: ActivityItem[];
  timeAgo: (d: string) => string;
}) {
  if (feed.length === 0) {
    return (
      <AdminCard>
        <AdminEmptyState
          icon={Eye}
          title="No activity yet"
          description="Agent downloads, logins, and interactions will appear here."
        />
      </AdminCard>
    );
  }

  const activityIcon = (type: string) => {
    switch (type) {
      case "guide_download":
        return <Download size={14} className="text-[var(--admin-blue)]" />;
      case "page_view":
        return <Eye size={14} className="text-stone-400" />;
      case "email_open":
        return <Mail size={14} className="text-[var(--admin-gold)]" />;
      case "form_submit":
        return <FileText size={14} className="text-[var(--admin-green)]" />;
      default:
        return <BookOpen size={14} className="text-stone-400" />;
    }
  };

  return (
    <AdminCard>
      <h3 className="font-[var(--font-display)] font-bold text-[14px] text-stone-800 mb-4">
        Recent Activity
      </h3>
      <div className="space-y-0 divide-y divide-[var(--admin-border)]">
        {feed.map((item) => (
          <div key={item.id} className="flex items-start gap-3 py-3">
            <div className="mt-0.5 w-7 h-7 rounded-lg bg-stone-50 border border-[var(--admin-border)] flex items-center justify-center flex-shrink-0">
              {activityIcon(item.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-[var(--font-system)] text-[12px] text-stone-800">
                <span className="font-semibold">{item.agentName}</span>{" "}
                <span className="text-stone-500">{item.detail}</span>
              </div>
              <div className="font-[var(--font-system)] text-[11px] text-stone-400 mt-0.5">
                {item.agentEmail} &middot; {timeAgo(item.timestamp)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </AdminCard>
  );
}

// ─── InviteModal ───────────────────────────────────────────────────

function InviteModal({
  email,
  setEmail,
  company,
  setCompany,
  name,
  setName,
  loading,
  result,
  onInvite,
  onClose,
}: {
  email: string;
  setEmail: (v: string) => void;
  company: string;
  setCompany: (v: string) => void;
  name: string;
  setName: (v: string) => void;
  loading: boolean;
  result: { ok: boolean; msg: string } | null;
  onInvite: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="invite-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-[var(--admin-border)]">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <h2
          id="invite-modal-title"
          className="font-[var(--font-display)] font-bold text-[16px] text-stone-900 mb-1"
        >
          Invite B2B Agent
        </h2>
        <p className="font-[var(--font-system)] text-[12px] text-stone-500 mb-5">
          Send an invitation to a travel agent to join the Kaspo network.
        </p>

        {result && (
          <div
            className={`rounded-lg px-3 py-2 mb-4 font-[var(--font-system)] text-[12px] ${
              result.ok
                ? "bg-[var(--status-green-bg)] text-[var(--admin-green)]"
                : "bg-[var(--status-red-bg)] text-[var(--status-red-text)]"
            }`}
          >
            {result.msg}
          </div>
        )}

        <div className="space-y-3">
          {/* Email */}
          <div>
            <label className="block font-[var(--font-system)] text-[11px] font-semibold uppercase tracking-[0.8px] text-stone-500 mb-1.5">
              Email *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="agent@travelcompany.com"
              className="w-full px-3 py-2.5 rounded-lg border border-[var(--admin-border)] bg-white
                font-[var(--font-system)] text-[13px] text-stone-800
                placeholder:text-stone-400
                focus:outline-none focus:ring-2 focus:ring-[var(--admin-blue)]/30 focus:border-[var(--admin-blue)]
                transition-colors"
            />
          </div>

          {/* Name */}
          <div>
            <label className="block font-[var(--font-system)] text-[11px] font-semibold uppercase tracking-[0.8px] text-stone-500 mb-1.5">
              Agent Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Sarah Ahmed"
              className="w-full px-3 py-2.5 rounded-lg border border-[var(--admin-border)] bg-white
                font-[var(--font-system)] text-[13px] text-stone-800
                placeholder:text-stone-400
                focus:outline-none focus:ring-2 focus:ring-[var(--admin-blue)]/30 focus:border-[var(--admin-blue)]
                transition-colors"
            />
          </div>

          {/* Company */}
          <div>
            <label className="block font-[var(--font-system)] text-[11px] font-semibold uppercase tracking-[0.8px] text-stone-500 mb-1.5">
              Company
            </label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Premium Travel Co."
              className="w-full px-3 py-2.5 rounded-lg border border-[var(--admin-border)] bg-white
                font-[var(--font-system)] text-[13px] text-stone-800
                placeholder:text-stone-400
                focus:outline-none focus:ring-2 focus:ring-[var(--admin-blue)]/30 focus:border-[var(--admin-blue)]
                transition-colors"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <AdminButton onClick={onClose} variant="ghost" size="md">
            Cancel
          </AdminButton>
          <AdminButton
            onClick={onInvite}
            variant="primary"
            size="md"
            loading={loading}
            disabled={!email.trim()}
          >
            <UserPlus size={14} />
            Send Invitation
          </AdminButton>
        </div>
      </div>
    </div>
  );
}
