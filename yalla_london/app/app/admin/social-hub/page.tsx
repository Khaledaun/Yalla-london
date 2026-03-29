"use client";

import { useState, useEffect, useCallback, type ComponentType } from "react";

// Simple inline icon for AdminEmptyState
const BoxIcon: ComponentType<{ size?: number | string; color?: string }> = ({ size = 24, color = "#78716C" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
);
import {
  AdminCard,
  AdminPageHeader,
  AdminButton,
  AdminKPICard,
  AdminStatusBadge,
  AdminLoadingState,
  AdminEmptyState,
  AdminAlertBanner,
  AdminTabs,
} from "@/components/admin/admin-ui";

interface WhatsAppStatus {
  configured: boolean;
  proxyEnabled: boolean;
  phoneNumberId: string | null;
  recentConversations: Array<{
    id: string;
    status: string;
    summary: string | null;
    sentiment: string | null;
    updatedAt: string;
  }>;
}

interface PostBridgeStatus {
  configured: boolean;
  accountCount: number;
  accounts: Array<{
    id: string;
    platform: string;
    username: string;
    connected: boolean;
  }>;
}

interface QueueItem {
  id: string;
  title: string;
  platform: string;
  scheduled_time?: string;
  published_time?: string;
  status: string;
  content_type?: string;
}

export default function SocialHubPage() {
  const [loading, setLoading] = useState(true);
  const [whatsapp, setWhatsapp] = useState<WhatsAppStatus | null>(null);
  const [postBridge, setPostBridge] = useState<PostBridgeStatus | null>(null);
  const [upcoming, setUpcoming] = useState<QueueItem[]>([]);
  const [recent, setRecent] = useState<QueueItem[]>([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [actionResult, setActionResult] = useState<string | null>(null);
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("");

  // Schedule post form
  const [schedTitle, setSchedTitle] = useState("");
  const [schedContent, setSchedContent] = useState("");
  const [schedPlatform, setSchedPlatform] = useState("instagram");
  const [schedDate, setSchedDate] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/social-hub");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setWhatsapp(data.whatsapp);
      setPostBridge(data.postBridge);
      setUpcoming(data.queue?.upcoming || []);
      setRecent(data.queue?.recent || []);
    } catch (err) {
      console.warn("[social-hub] fetch failed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const doAction = async (action: string, extra: Record<string, unknown> = {}) => {
    setActionResult(null);
    try {
      const res = await fetch("/api/admin/social-hub", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await res.json();
      setActionResult(data.success ? `✓ ${action} succeeded` : `✗ ${data.error}`);
      if (data.success) fetchData();
    } catch {
      setActionResult(`✗ ${action} failed`);
    }
  };

  if (loading) return <AdminLoadingState label="Loading Social Hub..." />;

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "whatsapp", label: "WhatsApp" },
    { id: "social", label: "Social Media" },
    { id: "queue", label: "Publishing Queue" },
    { id: "schedule", label: "Schedule Post" },
  ];

  return (
    <div className="space-y-6 p-4 md:p-6">
      <AdminPageHeader
        title="Social Hub"
        subtitle="WhatsApp + Social Media + Publishing Queue"
      />

      {actionResult && (
        <AdminAlertBanner
          severity={actionResult.startsWith("✓") ? "info" : "critical"}
          message={actionResult}
          onDismiss={() => setActionResult(null)}
        />
      )}

      <AdminTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === "overview" && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <AdminKPICard
            label="WhatsApp"
            value={whatsapp?.configured ? "Connected" : "Not Set Up"}
          />
          <AdminKPICard
            label="Social Accounts"
            value={String(postBridge?.accountCount || 0)}
          />
          <AdminKPICard
            label="Upcoming Posts"
            value={String(upcoming.length)}
          />
          <AdminKPICard
            label="Published (Recent)"
            value={String(recent.length)}
          />
        </div>
      )}

      {activeTab === "whatsapp" && (
        <div className="space-y-4">
          <AdminCard title="WhatsApp Configuration">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Status</span>
                <AdminStatusBadge
                  status={whatsapp?.configured ? "active" : "inactive"}
                  label={whatsapp?.configured ? "Configured" : "Not Configured"}
                />
              </div>
              {whatsapp?.configured && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Kapso Proxy</span>
                    <AdminStatusBadge
                      status={whatsapp.proxyEnabled ? "active" : "warning"}
                      label={whatsapp.proxyEnabled ? "Enabled" : "Direct Mode"}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Phone Number ID</span>
                    <span className="text-sm font-mono">{whatsapp.phoneNumberId || "—"}</span>
                  </div>
                </>
              )}
              {!whatsapp?.configured && (
                <p className="text-sm text-amber-600 bg-amber-50 rounded p-3">
                  Set <code>WHATSAPP_ACCESS_TOKEN</code> and <code>WHATSAPP_PHONE_NUMBER_ID</code> in Vercel env vars to enable WhatsApp.
                </p>
              )}
            </div>
          </AdminCard>

          {whatsapp?.configured && (
            <AdminCard title="Send Test Message">
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Phone number (e.g., +971501234567)"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  className="w-full p-3 border rounded-lg text-sm"
                />
                <input
                  type="text"
                  placeholder="Message (optional)"
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  className="w-full p-3 border rounded-lg text-sm"
                />
                <AdminButton
                  onClick={() => doAction("send_whatsapp_test", { to: testPhone, message: testMessage })}
                  disabled={!testPhone}
                >
                  Send Test
                </AdminButton>
              </div>
            </AdminCard>
          )}

          {whatsapp?.recentConversations && whatsapp.recentConversations.length > 0 && (
            <AdminCard title="Recent Conversations">
              <div className="space-y-2">
                {whatsapp.recentConversations.map((c) => (
                  <div key={c.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{c.summary || "No summary"}</p>
                      <p className="text-xs text-gray-500">{new Date(c.updatedAt).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-2">
                      <AdminStatusBadge status={c.status === "open" ? "active" : "inactive"} label={c.status} />
                      {c.sentiment && (
                        <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded">
                          {c.sentiment}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </AdminCard>
          )}
        </div>
      )}

      {activeTab === "social" && (
        <div className="space-y-4">
          <AdminCard
            title="Post Bridge"
            action={
              postBridge?.configured ? (
                <AdminButton size="sm" onClick={() => doAction("sync_accounts")}>
                  Sync Accounts
                </AdminButton>
              ) : undefined
            }
          >
            {!postBridge?.configured ? (
              <p className="text-sm text-amber-600 bg-amber-50 rounded p-3">
                Set <code>POST_BRIDGE_API_KEY</code> in Vercel env vars to enable social media management.
              </p>
            ) : postBridge.accounts.length === 0 ? (
              <AdminEmptyState
                icon={BoxIcon}
                title="No Social Accounts"
                description="Connect social accounts in Post Bridge dashboard, then sync here."
              />
            ) : (
              <div className="space-y-2">
                {postBridge.accounts.map((acc) => (
                  <div key={acc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <PlatformIcon platform={acc.platform} />
                      <div>
                        <p className="text-sm font-medium">{acc.username}</p>
                        <p className="text-xs text-gray-500 capitalize">{acc.platform}</p>
                      </div>
                    </div>
                    <AdminStatusBadge
                      status={acc.connected ? "active" : "error"}
                      label={acc.connected ? "Connected" : "Disconnected"}
                    />
                  </div>
                ))}
              </div>
            )}
          </AdminCard>
        </div>
      )}

      {activeTab === "queue" && (
        <div className="space-y-4">
          <AdminCard title={`Upcoming Posts (${upcoming.length})`}>
            {upcoming.length === 0 ? (
              <AdminEmptyState icon={BoxIcon} title="No Upcoming Posts" description="Schedule a post to see it here." />
            ) : (
              <div className="space-y-2">
                {upcoming.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{p.title}</p>
                      <p className="text-xs text-gray-500">
                        <PlatformIcon platform={p.platform} inline /> {p.platform} · {p.content_type} · {p.scheduled_time ? new Date(p.scheduled_time).toLocaleString() : "Not scheduled"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <AdminStatusBadge status="warning" label={p.status} />
                      <AdminButton size="sm" variant="primary" onClick={() => doAction("publish_now", { postId: p.id })}>
                        Publish Now
                      </AdminButton>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </AdminCard>

          <AdminCard title={`Recently Published (${recent.length})`}>
            {recent.length === 0 ? (
              <AdminEmptyState icon={BoxIcon} title="No Recent Posts" description="Published social posts will appear here." />
            ) : (
              <div className="space-y-2">
                {recent.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{p.title}</p>
                      <p className="text-xs text-gray-500">
                        {p.platform} · {p.published_time ? new Date(p.published_time).toLocaleString() : "—"}
                      </p>
                    </div>
                    <AdminStatusBadge status="active" label="Published" />
                  </div>
                ))}
              </div>
            )}
          </AdminCard>
        </div>
      )}

      {activeTab === "schedule" && (
        <AdminCard title="Schedule a New Post">
          <div className="space-y-4 max-w-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={schedTitle}
                onChange={(e) => setSchedTitle(e.target.value)}
                placeholder="Post title"
                className="w-full p-3 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
              <textarea
                value={schedContent}
                onChange={(e) => setSchedContent(e.target.value)}
                placeholder="Post content / caption"
                rows={4}
                className="w-full p-3 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Platform</label>
              <select
                value={schedPlatform}
                onChange={(e) => setSchedPlatform(e.target.value)}
                className="w-full p-3 border rounded-lg text-sm"
              >
                <option value="instagram">Instagram</option>
                <option value="facebook">Facebook</option>
                <option value="twitter">X (Twitter)</option>
                <option value="tiktok">TikTok</option>
                <option value="linkedin">LinkedIn</option>
                <option value="pinterest">Pinterest</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Schedule For (optional)</label>
              <input
                type="datetime-local"
                value={schedDate}
                onChange={(e) => setSchedDate(e.target.value)}
                className="w-full p-3 border rounded-lg text-sm"
              />
            </div>
            <AdminButton
              onClick={() => {
                doAction("schedule_post", {
                  title: schedTitle,
                  content: schedContent,
                  platform: schedPlatform,
                  scheduledAt: schedDate || undefined,
                });
                setSchedTitle("");
                setSchedContent("");
                setSchedDate("");
              }}
              disabled={!schedTitle || !schedContent}
            >
              Schedule Post
            </AdminButton>
          </div>
        </AdminCard>
      )}
    </div>
  );
}

function PlatformIcon({ platform, inline }: { platform: string; inline?: boolean }) {
  const icons: Record<string, string> = {
    instagram: "📸",
    facebook: "👍",
    twitter: "𝕏",
    tiktok: "🎵",
    linkedin: "💼",
    pinterest: "📌",
    whatsapp: "💬",
    youtube: "▶️",
  };
  const icon = icons[platform.toLowerCase()] || "🌐";
  return inline ? <span>{icon}</span> : <span className="text-lg">{icon}</span>;
}
