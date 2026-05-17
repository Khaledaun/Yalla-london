"use client";

/**
 * Monday Audit Preview — iPhone-first page that shows what the Monday
 * morning email will contain, with a "Send me the email now" button.
 *
 * Khaled does NOT have to wait for the Monday 09:00 UTC cron to fire.
 * He can open this page anytime, see the 4 action item categories, and
 * either act on them directly (taps the "Open" link) or send himself the
 * email so it lives in his inbox like the real Monday digest.
 */

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface ActionItem {
  id: string;
  category: "manual_action" | "metric_watch" | "auto_draining" | "code_change_needed";
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  actionUrl?: string;
  metric?: { label: string; value: number | string };
}

interface SiteReport {
  siteId: string;
  generatedAt: string;
  totalItems: number;
  itemsByCategory: Record<string, number>;
  items: ActionItem[];
}

interface AuditResponse {
  totalSites: number;
  totalActionItems: number;
  reports: SiteReport[];
}

const SEV_COLOR: Record<string, string> = {
  critical: "#C8322B",
  warning: "#C49A2A",
  info: "#3B7EA1",
};
const SEV_LABEL: Record<string, string> = {
  critical: "CRITICAL",
  warning: "ATTENTION",
  info: "FYI",
};
const CAT_EMOJI: Record<string, string> = {
  manual_action: "🚨",
  metric_watch: "📊",
  auto_draining: "⚙️",
  code_change_needed: "🔧",
};
const CAT_LABEL: Record<string, string> = {
  manual_action: "needs your tap",
  metric_watch: "trend to watch",
  auto_draining: "system is fixing it",
  code_change_needed: "next dev session",
};

export default function MondayAuditPage() {
  const [data, setData] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/monday-audit");
      if (!res.ok) {
        setError(`HTTP ${res.status}`);
        setLoading(false);
        return;
      }
      const json = (await res.json()) as AuditResponse;
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  async function sendNow() {
    setSending(true);
    try {
      const res = await fetch("/api/admin/monday-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sendEmail: true }),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        setToast({ text: `Failed: HTTP ${res.status} ${txt.slice(0, 80)}`, ok: false });
        return;
      }
      const j = await res.json();
      if (j.emailResult?.success) {
        setToast({ text: `✅ Email sent — check your inbox`, ok: true });
      } else {
        setToast({ text: `Email failed: ${j.emailResult?.error || "unknown error"}`, ok: false });
      }
    } catch (err) {
      setToast({ text: `Failed: ${err instanceof Error ? err.message : String(err)}`, ok: false });
    } finally {
      setSending(false);
    }
  }

  const totalCritical =
    data?.reports.reduce((n, r) => n + r.items.filter((i) => i.severity === "critical").length, 0) || 0;
  const totalWarning =
    data?.reports.reduce((n, r) => n + r.items.filter((i) => i.severity === "warning").length, 0) || 0;

  return (
    <div className="min-h-screen bg-[var(--admin-bg)] text-[var(--admin-text)] pb-32">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[var(--admin-bg)]/95 backdrop-blur border-b border-[rgba(214,208,196,0.5)]">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link href="/admin/cockpit" className="text-sm text-[var(--admin-muted)] hover:text-[var(--admin-text)]">
            ← Cockpit
          </Link>
          <h1 className="text-base font-semibold">Monday Audit</h1>
          <button
            onClick={load}
            disabled={loading}
            className="text-xs px-3 py-1 rounded border border-[rgba(214,208,196,0.5)] disabled:opacity-50"
          >
            {loading ? "…" : "Refresh"}
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 pt-4 space-y-4">
        {/* Explainer */}
        <div className="bg-white border border-[rgba(214,208,196,0.5)] rounded-lg p-4 text-sm">
          <p className="mb-2">
            This is the same report you'll get by email every <strong>Monday at 9:00 AM UTC</strong> (≈12:00 noon Israel
            / 9:00 AM London). It surfaces the 4 things worth checking each week.
          </p>
          <p className="text-[var(--admin-muted)] text-xs">
            Tap an item's <strong>Open →</strong> link to act on it. Tap <strong>Send me the email now</strong> if you
            want a copy in your inbox for later.
          </p>
        </div>

        {/* Summary card */}
        {data && (
          <div className="bg-white border border-[rgba(214,208,196,0.5)] rounded-lg p-4">
            <div className="flex items-baseline justify-between mb-3">
              <div>
                <div className="text-2xl font-semibold">{data.totalActionItems}</div>
                <div className="text-xs text-[var(--admin-muted)]">action item(s) across {data.totalSites} site(s)</div>
              </div>
              <div className="text-right text-xs text-[var(--admin-muted)]">
                {totalCritical > 0 && <div className="text-[#C8322B] font-medium">🚨 {totalCritical} critical</div>}
                {totalWarning > 0 && <div className="text-[#C49A2A] font-medium">⚠️ {totalWarning} attention</div>}
              </div>
            </div>
            <button
              onClick={sendNow}
              disabled={sending || data.totalActionItems === 0}
              className="w-full bg-[#1A2238] text-white rounded px-3 py-2.5 text-sm font-medium disabled:opacity-50"
            >
              {sending ? "Sending…" : data.totalActionItems === 0 ? "Nothing to send 🎉" : "📧 Send me the email now"}
            </button>
          </div>
        )}

        {error && <div className="bg-red-50 border border-red-200 text-red-800 rounded p-3 text-sm">{error}</div>}

        {loading && <div className="text-center text-sm text-[var(--admin-muted)] py-8">Loading audit…</div>}

        {!loading && data?.totalActionItems === 0 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded p-4 text-sm text-emerald-900">
            🎉 No action items. Everything's healthy this week.
          </div>
        )}

        {/* Per-site reports */}
        {data?.reports.map((report) => {
          if (report.items.length === 0) return null;
          return (
            <div key={report.siteId} className="space-y-2">
              <h2 className="text-sm font-semibold text-[var(--admin-muted)] uppercase tracking-wide mt-4">
                {report.siteId} — {report.items.length} item(s)
              </h2>
              {report.items.map((item) => (
                <div
                  key={item.id}
                  className="bg-white border border-[rgba(214,208,196,0.5)] rounded-lg p-4"
                  style={{ borderLeftColor: SEV_COLOR[item.severity], borderLeftWidth: "4px" }}
                >
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-[10px] font-bold tracking-wide" style={{ color: SEV_COLOR[item.severity] }}>
                      {SEV_LABEL[item.severity]}
                    </span>
                    <span className="text-[10px] text-[var(--admin-muted)]">
                      {CAT_EMOJI[item.category]} {CAT_LABEL[item.category]}
                    </span>
                  </div>
                  <div className="text-base font-semibold leading-snug mb-1.5">{item.title}</div>
                  <div className="text-sm text-[var(--admin-muted)] leading-relaxed">{item.description}</div>
                  {item.metric && (
                    <div className="inline-block mt-2 text-[11px] px-2 py-0.5 rounded bg-stone-100 text-stone-700">
                      {item.metric.label}: {String(item.metric.value)}
                    </div>
                  )}
                  {item.actionUrl && (
                    <div className="mt-3">
                      <a href={item.actionUrl} className="inline-block text-sm font-semibold text-[#3B7EA1] underline">
                        Open →
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-20 left-4 right-4 max-w-3xl mx-auto z-50 px-4 py-3 rounded shadow-lg text-sm ${
            toast.ok ? "bg-emerald-700 text-white" : "bg-red-700 text-white"
          }`}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}
