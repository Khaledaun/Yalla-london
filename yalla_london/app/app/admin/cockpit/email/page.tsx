"use client";
/**
 * Email Center — /admin/cockpit/email
 *
 * Functional the moment any email provider (Resend/SendGrid/SMTP) is connected.
 * Shows honest provider status from real env vars. Wired to lib/email/sender.ts.
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface ProviderStatus {
  resend: boolean;
  sendgrid: boolean;
  smtp: boolean;
  active: boolean;
  activeProvider: string | null;
}

interface EmailCampaign {
  id: string;
  name: string;
  status: string;
  sentAt: string | null;
  openRate: number | null;
  clickRate: number | null;
  recipientCount: number;
}

interface EmailTemplate {
  id: string;
  name: string;
  type: string;
  updatedAt: string;
}

interface EmailData {
  providerStatus: ProviderStatus;
  campaigns: EmailCampaign[];
  templates: EmailTemplate[];
  subscriberCount: number;
}

export default function EmailCenterPage() {
  const router = useRouter();
  const [data, setData] = useState<EmailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "campaigns" | "templates" | "subscribers">("overview");
  const [testEmail, setTestEmail] = useState("");
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/email-center")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const sendTest = async () => {
    if (!testEmail.trim()) return;
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/email-center", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test_send", to: testEmail }),
      });
      const json = await res.json();
      setTestResult(json.success !== false ? "✅ Test email sent successfully!" : `❌ ${json.error ?? "Send failed"}`);
    } catch (e) {
      setTestResult(`❌ ${e instanceof Error ? e.message : "Error"}`);
    } finally {
      setTestLoading(false);
    }
  };

  function timeAgo(iso: string | null): string {
    if (!iso) return "never";
    const diff = Date.now() - new Date(iso).getTime();
    const h = Math.floor(diff / 3600000);
    if (h < 1) return "just now";
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-zinc-950/90 backdrop-blur-sm border-b border-zinc-800 px-4 py-3">
        <div className="max-w-screen-xl mx-auto flex items-center gap-3">
          <button onClick={() => router.push("/admin/cockpit")} className="text-zinc-500 hover:text-zinc-300 text-sm">← Cockpit</button>
          <h1 className="text-base font-bold text-white">📧 Email Center</h1>
          {data?.providerStatus.active && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-900/50 text-emerald-300 border border-emerald-700">
              ● {data.providerStatus.activeProvider} connected
            </span>
          )}
        </div>
        <div className="max-w-screen-xl mx-auto mt-2 flex gap-1">
          {(["overview", "campaigns", "templates", "subscribers"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize ${activeTab === t ? "bg-zinc-100 text-zinc-900" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-screen-xl mx-auto px-4 py-4 pb-20 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-48"><p className="text-zinc-500 text-sm">Loading…</p></div>
        ) : (
          <>
            {/* Overview */}
            {activeTab === "overview" && (
              <>
                {/* Provider status */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                  <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-3">Email Provider Status</h3>
                  {!data?.providerStatus.active ? (
                    <div className="bg-amber-950/20 border border-amber-800 rounded-xl p-4">
                      <p className="text-amber-300 font-medium text-sm">⚠️ No email provider connected</p>
                      <p className="text-zinc-400 text-xs mt-1">Add one of these to your Vercel environment variables:</p>
                      <ul className="mt-2 space-y-1 text-xs text-zinc-500">
                        <li>• <span className="font-mono text-zinc-300">RESEND_API_KEY</span> — Recommended. Free tier: 100 emails/day.</li>
                        <li>• <span className="font-mono text-zinc-300">SENDGRID_API_KEY</span> — SendGrid account required.</li>
                        <li>• <span className="font-mono text-zinc-300">SMTP_HOST + SMTP_USER + SMTP_PASS</span> — Any SMTP server.</li>
                      </ul>
                      <a
                        href="https://resend.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block mt-3 px-3 py-1.5 rounded-lg bg-amber-900/40 hover:bg-amber-900/70 text-amber-300 text-xs font-medium border border-amber-800"
                      >
                        Get Resend API Key (Free) →
                      </a>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {[
                        { key: "Resend", ok: data?.providerStatus.resend ?? false },
                        { key: "SendGrid", ok: data?.providerStatus.sendgrid ?? false },
                        { key: "SMTP", ok: data?.providerStatus.smtp ?? false },
                      ].map(({ key, ok }) => (
                        <div key={key} className="flex items-center gap-2 text-sm">
                          <span className={ok ? "text-emerald-400" : "text-zinc-600"}>{ok ? "✅" : "❌"}</span>
                          <span className={ok ? "text-zinc-200" : "text-zinc-500"}>{key}</span>
                          {ok && data?.providerStatus.activeProvider === key.toLowerCase() && (
                            <span className="text-xs text-emerald-400">(active)</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-blue-400">{data?.subscriberCount ?? 0}</div>
                    <div className="text-xs text-zinc-500 mt-1">Subscribers</div>
                  </div>
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-zinc-300">{data?.campaigns.length ?? 0}</div>
                    <div className="text-xs text-zinc-500 mt-1">Campaigns</div>
                  </div>
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-zinc-300">{data?.templates.length ?? 0}</div>
                    <div className="text-xs text-zinc-500 mt-1">Templates</div>
                  </div>
                </div>

                {/* Test send */}
                {data?.providerStatus.active && (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-3">Test Send</h3>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none"
                      />
                      <button
                        onClick={sendTest}
                        disabled={testLoading || !testEmail.trim()}
                        className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium"
                      >
                        {testLoading ? "Sending…" : "Send Test"}
                      </button>
                    </div>
                    {testResult && (
                      <p className={`mt-2 text-xs rounded px-2 py-1 ${testResult.startsWith("✅") ? "bg-emerald-950/30 text-emerald-300" : "bg-red-950/30 text-red-300"}`}>
                        {testResult}
                      </p>
                    )}
                  </div>
                )}

                {/* Auto-campaigns */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                  <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-3">Auto-Campaigns</h3>
                  <div className="space-y-2 text-xs">
                    {[
                      { trigger: "Article published (EN)", action: "Sends digest to EN subscribers", status: data?.providerStatus.active },
                      { trigger: "Arabic article published", action: "Sends Arabic digest to AR subscribers", status: data?.providerStatus.active },
                      { trigger: "Monday 8am", action: "Weekly digest with top articles from last week", status: data?.providerStatus.active },
                      { trigger: "New subscriber", action: "Welcome email series", status: data?.providerStatus.active },
                    ].map(({ trigger, action, status }) => (
                      <div key={trigger} className="flex items-start gap-2 p-2 bg-zinc-800 rounded-lg">
                        <span className={status ? "text-emerald-400" : "text-zinc-600"}>{status ? "✅" : "⏸"}</span>
                        <div>
                          <p className="text-zinc-300">{trigger}</p>
                          <p className="text-zinc-500">{action}</p>
                          {!status && <p className="text-amber-400 mt-0.5">Will activate when email provider is connected</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Campaigns */}
            {activeTab === "campaigns" && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Campaigns</h3>
                  <button
                    onClick={() => router.push("/admin/email-campaigns")}
                    className="text-xs text-blue-400 hover:underline"
                  >
                    Open Email Campaigns →
                  </button>
                </div>
                {!data?.campaigns.length ? (
                  <p className="text-zinc-500 text-sm text-center py-6">No campaigns yet.</p>
                ) : (
                  <div className="space-y-2">
                    {data.campaigns.map((c) => (
                      <div key={c.id} className="flex items-center justify-between p-3 bg-zinc-800 rounded-xl text-xs">
                        <div>
                          <p className="text-zinc-200 font-medium">{c.name}</p>
                          <p className="text-zinc-500 mt-0.5">{c.recipientCount} recipients · {timeAgo(c.sentAt)}</p>
                        </div>
                        <div className="text-right">
                          <span className={`px-2 py-0.5 rounded-full border text-xs ${
                            c.status === "sent" ? "bg-emerald-900/30 text-emerald-300 border-emerald-800" : "bg-zinc-800 text-zinc-400 border-zinc-700"
                          }`}>{c.status}</span>
                          {c.openRate !== null && <p className="text-zinc-500 mt-1">{c.openRate}% open · {c.clickRate}% click</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Templates */}
            {activeTab === "templates" && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Templates</h3>
                  <button
                    onClick={() => router.push("/admin/email-campaigns")}
                    className="text-xs text-blue-400 hover:underline"
                  >
                    Build Template →
                  </button>
                </div>
                {!data?.templates.length ? (
                  <p className="text-zinc-500 text-sm text-center py-6">No templates yet. Create one in Email Campaigns.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {data.templates.map((t) => (
                      <div key={t.id} className="bg-zinc-800 rounded-xl p-3 border border-zinc-700">
                        <p className="text-sm font-medium text-zinc-200">{t.name}</p>
                        <p className="text-xs text-zinc-500 mt-0.5 capitalize">{t.type} · Updated {timeAgo(t.updatedAt)}</p>
                        <button
                          onClick={() => router.push(`/admin/email-campaigns?template=${t.id}`)}
                          className="mt-2 text-xs text-blue-400 hover:underline"
                        >
                          Edit →
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Subscribers */}
            {activeTab === "subscribers" && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-3">Subscribers</h3>
                <div className="text-center py-8">
                  <div className="text-3xl font-bold text-blue-400">{data?.subscriberCount ?? 0}</div>
                  <p className="text-zinc-500 text-sm mt-1">Total subscribers</p>
                  <p className="text-zinc-600 text-xs mt-3">
                    Subscribers are captured from the newsletter opt-in form in each site&apos;s footer.
                    Manage them in the Email Campaigns admin page.
                  </p>
                  <button
                    onClick={() => router.push("/admin/email-campaigns")}
                    className="mt-4 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm border border-zinc-700"
                  >
                    Manage Subscribers →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
