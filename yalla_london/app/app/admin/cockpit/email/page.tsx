"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ProviderStatus {
  activeProvider: string;
  domainVerified: boolean;
  sandboxMode: boolean;
  fromAddress: string;
  configuredEnvVars: string[];
}

interface CampaignSummary {
  id: string;
  name: string;
  status: string;
  sentCount: number;
  openCount: number;
  clickCount: number;
  scheduledAt: string | null;
  sentAt: string | null;
}

interface TemplateSummary {
  id: string;
  name: string;
  type: string;
  updatedAt: string;
}

interface EmailCenterData {
  provider: ProviderStatus;
  stats: {
    totalTemplates: number;
    totalCampaigns: number;
    totalSubscribers: number;
    subscribersThisMonth: number;
    emailsSentToday: number;
    emailsSentThisWeek: number;
    openRate: number;
    clickRate: number;
  };
  recentCampaigns: CampaignSummary[];
  templates: TemplateSummary[];
  setupComplete: boolean;
  setupSteps: Array<{ label: string; done: boolean; hint: string }>;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function CockpitEmailPage() {
  const [data, setData] = useState<EmailCenterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/email-center");
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status}: ${errText.slice(0, 200)}`);
      }
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load email data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleTestSend = async () => {
    if (!testEmail || !testEmail.includes("@")) return;
    setTestSending(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/email-center", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test_send", to: testEmail }),
      });
      const json = await res.json().catch(() => ({ success: false, error: "Invalid response" }));
      setTestResult({
        success: json.success,
        message: json.success
          ? `Test email sent via ${json.provider || "unknown"}`
          : json.error || "Send failed",
      });
    } catch (err) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : "Network error",
      });
    } finally {
      setTestSending(false);
    }
  };

  // ─── Loading / Error ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ padding: "24px", maxWidth: 800, margin: "0 auto" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>Email Center</h1>
        <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>Loading email system status...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "24px", maxWidth: 800, margin: "0 auto" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>Email Center</h1>
        <div style={{ padding: 20, background: "#fef2f2", borderRadius: 8, color: "#b91c1c", marginBottom: 16 }}>
          {error}
        </div>
        <button onClick={() => { setLoading(true); fetchData(); }} style={btnStyle}>
          Retry
        </button>
      </div>
    );
  }

  const d = data!;
  const providerColor = d.provider.activeProvider === "console" ? "#b91c1c" : d.provider.sandboxMode ? "#d97706" : "#059669";
  const providerLabel = d.provider.activeProvider === "console"
    ? "Not configured"
    : d.provider.sandboxMode
      ? `${d.provider.activeProvider} (sandbox)`
      : d.provider.activeProvider;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: "24px", maxWidth: 800, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <Link href="/admin/cockpit" style={{ color: "#6b7280", textDecoration: "none", fontSize: 13 }}>
            &larr; Cockpit
          </Link>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: "4px 0 0" }}>Email Center</h1>
        </div>
        <Link href="/admin/email-campaigns" style={linkBtnStyle}>
          Full Email Manager &rarr;
        </Link>
      </div>

      {/* Setup banner */}
      {!d.setupComplete && (
        <div style={{ padding: 16, background: "#fffbeb", border: "1px solid #fbbf24", borderRadius: 8, marginBottom: 20 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8, color: "#92400e" }}>Setup Required</div>
          {d.setupSteps.filter(s => !s.done).map((step, i) => (
            <div key={i} style={{ fontSize: 13, color: "#78350f", marginBottom: 4 }}>
              <span style={{ color: "#dc2626", marginRight: 6 }}>&#9679;</span>
              <strong>{step.label}</strong> &mdash; {step.hint}
            </div>
          ))}
        </div>
      )}

      {/* Provider Status Card */}
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 4 }}>Email Provider</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: providerColor }}>{providerLabel}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 4 }}>From Address</div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{d.provider.fromAddress || "Not set"}</div>
          </div>
        </div>
        {d.provider.sandboxMode && (
          <div style={{ marginTop: 12, padding: 10, background: "#fef3c7", borderRadius: 6, fontSize: 12, color: "#92400e" }}>
            Sandbox mode: can only send to your own email. Verify your domain at{" "}
            <a href="https://resend.com/domains" target="_blank" rel="noopener" style={{ color: "#2563eb" }}>
              resend.com/domains
            </a>{" "}
            then set <code>RESEND_DOMAIN_VERIFIED=true</code> in Vercel.
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 20 }}>
        <KpiCard label="Templates" value={d.stats.totalTemplates} />
        <KpiCard label="Campaigns" value={d.stats.totalCampaigns} />
        <KpiCard label="Subscribers" value={d.stats.totalSubscribers} subtitle={d.stats.subscribersThisMonth > 0 ? `+${d.stats.subscribersThisMonth} this month` : undefined} />
        <KpiCard label="Sent Today" value={d.stats.emailsSentToday} subtitle={`${d.stats.emailsSentThisWeek} this week`} />
      </div>

      {/* Test Send */}
      <div style={cardStyle}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Quick Test Send</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="email"
            value={testEmail}
            onChange={e => setTestEmail(e.target.value)}
            placeholder="your@email.com"
            style={{ flex: 1, padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14 }}
          />
          <button
            onClick={handleTestSend}
            disabled={testSending || !testEmail}
            style={{ ...btnStyle, opacity: testSending || !testEmail ? 0.5 : 1 }}
          >
            {testSending ? "Sending..." : "Send Test"}
          </button>
        </div>
        {testResult && (
          <div style={{
            marginTop: 8,
            padding: 8,
            borderRadius: 6,
            fontSize: 13,
            background: testResult.success ? "#ecfdf5" : "#fef2f2",
            color: testResult.success ? "#065f46" : "#b91c1c",
          }}>
            {testResult.message}
          </div>
        )}
      </div>

      {/* Recent Campaigns */}
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Recent Campaigns</div>
          <Link href="/admin/email-campaigns" style={{ fontSize: 12, color: "#2563eb", textDecoration: "none" }}>
            View all &rarr;
          </Link>
        </div>
        {d.recentCampaigns.length === 0 ? (
          <div style={{ padding: 20, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>
            No campaigns yet. Create one in the{" "}
            <Link href="/admin/email-campaigns" style={{ color: "#2563eb" }}>Email Manager</Link>.
          </div>
        ) : (
          <div>
            {d.recentCampaigns.slice(0, 5).map(c => (
              <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: "#9ca3af" }}>
                    {c.sentAt ? `Sent ${new Date(c.sentAt).toLocaleDateString()}` : c.status}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 12, fontSize: 12, color: "#6b7280" }}>
                  <span>{c.sentCount} sent</span>
                  <span>{c.openCount} opened</span>
                  <span>{c.clickCount} clicks</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Templates */}
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Email Templates ({d.templates.length})</div>
          <Link href="/admin/email-campaigns" style={{ fontSize: 12, color: "#2563eb", textDecoration: "none" }}>
            Manage &rarr;
          </Link>
        </div>
        {d.templates.length === 0 ? (
          <div style={{ padding: 20, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>
            No templates yet. 7 pre-built templates are available in the Email Builder.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
            {d.templates.slice(0, 6).map(t => (
              <div key={t.id} style={{ padding: 10, background: "#f9fafb", borderRadius: 6, fontSize: 12 }}>
                <div style={{ fontWeight: 500, marginBottom: 2 }}>{t.name}</div>
                <div style={{ color: "#9ca3af" }}>{t.type}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Env Vars Status */}
      <div style={cardStyle}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Configuration</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12 }}>
          {[
            { key: "RESEND_API_KEY", desc: "Resend email provider" },
            { key: "SENDGRID_API_KEY", desc: "SendGrid email provider" },
            { key: "SMTP_HOST", desc: "SMTP email provider" },
            { key: "EMAIL_FROM", desc: "Sender address" },
            { key: "RESEND_DOMAIN_VERIFIED", desc: "Domain verification" },
          ].map(env => {
            const configured = d.provider.configuredEnvVars.includes(env.key);
            return (
              <div key={env.key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: configured ? "#059669" : "#d1d5db", fontSize: 16 }}>
                  {configured ? "\u2713" : "\u25CB"}
                </span>
                <span style={{ color: configured ? "#111827" : "#9ca3af" }}>
                  {env.key} <span style={{ color: "#9ca3af" }}>({env.desc})</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function KpiCard({ label, value, subtitle }: { label: string; value: number; subtitle?: string }) {
  return (
    <div style={{ padding: 14, background: "#fff", border: "1px solid rgba(214,208,196,0.5)", borderRadius: 8 }}>
      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: "#111827" }}>{value}</div>
      {subtitle && <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{subtitle}</div>}
    </div>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  padding: 16,
  background: "#fff",
  border: "1px solid rgba(214,208,196,0.5)",
  borderRadius: 8,
  marginBottom: 16,
};

const btnStyle: React.CSSProperties = {
  padding: "8px 16px",
  background: "#0C4A6E",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};

const linkBtnStyle: React.CSSProperties = {
  padding: "6px 14px",
  background: "#f3f4f6",
  color: "#374151",
  borderRadius: 6,
  fontSize: 12,
  fontWeight: 500,
  textDecoration: "none",
};
