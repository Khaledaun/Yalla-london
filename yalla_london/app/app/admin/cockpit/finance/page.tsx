"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";

// ─── Types ───────────────────────────────────────────────

interface StripeBalance {
  available: number;
  availableFormatted: string;
  pending: number;
  pendingFormatted: string;
}

interface StripeSubscriptions {
  total: number;
  active: number;
  canceled: number;
  pastDue: number;
}

interface StripePayment {
  id: string;
  amount: number;
  amountFormatted: string;
  currency: string;
  status: string;
  description: string;
  customerEmail: string | null;
  created: string;
  refunded: boolean;
}

interface StripeData {
  configured: boolean;
  error?: string;
  balance?: StripeBalance;
  revenue30d?: number;
  revenue30dFormatted?: string;
  refunded30d?: number;
  refunded30dFormatted?: string;
  mrr?: number;
  mrrFormatted?: string;
  subscriptions?: StripeSubscriptions;
  customersTotal?: string;
  recentPayments?: StripePayment[];
}

interface MercuryAccount {
  id: string;
  name: string;
  type: string;
  currentBalance: number;
  availableBalance: number;
  currency: string;
  status: string;
  routingNumber: string | null;
  accountNumber: string | null;
}

interface MercuryTransaction {
  id: string;
  amount: number;
  direction: string;
  description: string;
  counterparty: string | null;
  date: string;
  status: string;
}

interface MercuryData {
  configured: boolean;
  error?: string;
  accounts?: MercuryAccount[];
  totalBalance?: number;
  totalBalanceFormatted?: string;
  recentTransactions?: MercuryTransaction[];
}

interface AffiliateData {
  configured: boolean;
  clicks30d?: number;
  commissions30d?: number;
  revenue30d?: number;
  revenue30dFormatted?: string;
}

interface FinanceData {
  stripe: StripeData;
  mercury: MercuryData;
  affiliate: AffiliateData;
  summary: Record<string, unknown>;
}

// ─── Component ──────────────────────────────────────────

export default function FinancePage() {
  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "stripe" | "mercury" | "affiliate">("overview");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/finance");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 120_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  // Check URL params for checkout result
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "success") {
      setToast("Payment successful! Your subscription is now active.");
      window.history.replaceState({}, "", window.location.pathname);
    } else if (params.get("checkout") === "canceled") {
      setToast("Checkout was canceled.");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  async function runAction(action: string, payload: Record<string, unknown> = {}) {
    setActionLoading(action);
    try {
      const res = await fetch("/api/admin/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      const json = await res.json();
      if (json.url) {
        window.open(json.url, "_blank");
        setToast("Opening Stripe...");
      } else if (json.success) {
        setToast(`Done: ${json.synced !== undefined ? `${json.synced} invoices synced` : action}`);
        fetchData();
      } else {
        setToast(`Error: ${json.error || "Unknown"}`);
      }
    } catch (err) {
      setToast(`Failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setActionLoading(null);
    }
  }

  // ─── Render ────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ padding: 24, display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 32, height: 32, border: "2px solid #C49A2A", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 12px" }} />
          <p style={{ fontFamily: "var(--font-system)", fontSize: 12, color: "#78716C" }}>Loading financial data...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ background: "rgba(200,50,43,0.06)", border: "1px solid rgba(200,50,43,0.2)", borderRadius: 12, padding: 16 }}>
          <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "#C8322B", fontSize: 14 }}>Failed to load</p>
          <p style={{ fontFamily: "var(--font-system)", fontSize: 12, color: "#78716C", marginTop: 4 }}>{error}</p>
          <button onClick={fetchData} style={{ marginTop: 8, padding: "6px 16px", background: "#C8322B", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, cursor: "pointer" }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const s = data.stripe;
  const m = data.mercury;
  const a = data.affiliate;

  const tabs = [
    { id: "overview" as const, label: "Overview" },
    { id: "stripe" as const, label: "Stripe" },
    { id: "mercury" as const, label: "Mercury" },
    { id: "affiliate" as const, label: "Affiliate" },
  ];

  return (
    <div style={{ padding: "16px 16px 100px", maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, color: "#1C1917", margin: 0 }}>
          Finance Hub
        </h1>
        <p style={{ fontFamily: "var(--font-system)", fontSize: 12, color: "#78716C", marginTop: 4 }}>
          Stripe + Mercury + Affiliate revenue in one place
        </p>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", zIndex: 1000,
          background: "#1C1917", color: "#FAF8F4", padding: "10px 20px", borderRadius: 10,
          fontFamily: "var(--font-system)", fontSize: 13, boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
          maxWidth: "90vw",
        }}>
          {toast}
        </div>
      )}

      {/* Tab Navigation */}
      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid rgba(214,208,196,0.5)", marginBottom: 20 }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: "10px 16px", border: "none", background: "none", cursor: "pointer",
              fontFamily: "var(--font-system)", fontSize: 13, fontWeight: activeTab === t.id ? 700 : 500,
              color: activeTab === t.id ? "#1C1917" : "#78716C",
              borderBottom: activeTab === t.id ? "2px solid #C49A2A" : "2px solid transparent",
              transition: "all 0.2s",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && <OverviewTab stripe={s} mercury={m} affiliate={a} onAction={runAction} actionLoading={actionLoading} />}
      {activeTab === "stripe" && <StripeTab stripe={s} onAction={runAction} actionLoading={actionLoading} />}
      {activeTab === "mercury" && <MercuryTab mercury={m} />}
      {activeTab === "affiliate" && <AffiliateTab affiliate={a} />}
    </div>
  );
}

// ─── Overview Tab ────────────────────────────────────────

function OverviewTab({ stripe, mercury, affiliate, onAction, actionLoading }: {
  stripe: StripeData; mercury: MercuryData; affiliate: AffiliateData;
  onAction: (a: string, p?: Record<string, unknown>) => void; actionLoading: string | null;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* KPI Hero Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
        <KPICard
          label="Stripe Balance"
          value={stripe.balance?.availableFormatted || "—"}
          sub={stripe.configured ? (stripe.error ? "Error" : "Available") : "Not connected"}
          color={stripe.configured && !stripe.error ? "#2D5A3D" : "#C8322B"}
        />
        <KPICard
          label="Mercury Balance"
          value={mercury.totalBalanceFormatted || "—"}
          sub={mercury.configured ? (mercury.error ? "Error" : "Total") : "Not connected"}
          color={mercury.configured && !mercury.error ? "#2D5A3D" : "#C8322B"}
        />
        <KPICard
          label="Revenue (30d)"
          value={stripe.revenue30dFormatted || "£0.00"}
          sub="Stripe payments"
          color="#C49A2A"
        />
        <KPICard
          label="MRR"
          value={stripe.mrrFormatted || "£0.00"}
          sub={`${stripe.subscriptions?.active || 0} active subs`}
          color="#3B7EA1"
        />
        <KPICard
          label="Affiliate (30d)"
          value={affiliate.revenue30dFormatted || "$0.00"}
          sub={`${affiliate.clicks30d || 0} clicks`}
          color="#7C3AED"
        />
      </div>

      {/* Connection Status */}
      <Card title="Connection Status">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <StatusRow name="Stripe" connected={stripe.configured && !stripe.error} detail={stripe.error || (stripe.configured ? "Connected" : "Add STRIPE_SECRET_KEY")} />
          <StatusRow name="Mercury" connected={mercury.configured && !mercury.error} detail={mercury.error || (mercury.configured ? "Connected" : "Add MERCURY_API_KEY")} />
          <StatusRow name="CJ Affiliate" connected={affiliate.configured} detail={affiliate.configured ? "Connected" : "Add CJ_API_TOKEN"} />
        </div>
      </Card>

      {/* Quick Actions */}
      <Card title="Quick Actions">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {stripe.configured && !stripe.error && (
            <>
              <ActionBtn label="Manage Billing" loading={actionLoading === "billing_portal"} onClick={() => onAction("billing_portal")} />
              <ActionBtn label="Sync Invoices" loading={actionLoading === "sync_invoices"} onClick={() => onAction("sync_invoices")} />
            </>
          )}
          {!stripe.configured && (
            <p style={{ fontFamily: "var(--font-system)", fontSize: 12, color: "#78716C" }}>
              Add STRIPE_SECRET_KEY to Vercel to enable Stripe actions
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}

// ─── Stripe Tab ──────────────────────────────────────────

function StripeTab({ stripe, onAction, actionLoading }: {
  stripe: StripeData; onAction: (a: string, p?: Record<string, unknown>) => void; actionLoading: string | null;
}) {
  if (!stripe.configured) {
    return <NotConfigured name="Stripe" envVar="STRIPE_SECRET_KEY" hint="Stripe Dashboard → Developers → API Keys" />;
  }
  if (stripe.error) {
    return <ErrorCard message={stripe.error} />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Balance + Revenue */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Card title="Balance">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <MetricRow label="Available" value={stripe.balance?.availableFormatted || "£0.00"} />
            <MetricRow label="Pending" value={stripe.balance?.pendingFormatted || "£0.00"} />
          </div>
        </Card>
        <Card title="Revenue (30d)">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <MetricRow label="Gross" value={stripe.revenue30dFormatted || "£0.00"} />
            <MetricRow label="Refunded" value={stripe.refunded30dFormatted || "£0.00"} />
          </div>
        </Card>
      </div>

      {/* Subscriptions */}
      <Card title="Subscriptions">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, textAlign: "center" }}>
          <MiniStat label="Active" value={stripe.subscriptions?.active || 0} color="#2D5A3D" />
          <MiniStat label="Past Due" value={stripe.subscriptions?.pastDue || 0} color="#C8322B" />
          <MiniStat label="Canceled" value={stripe.subscriptions?.canceled || 0} color="#78716C" />
          <MiniStat label="MRR" value={stripe.mrrFormatted || "£0"} color="#C49A2A" />
        </div>
      </Card>

      {/* Recent Payments */}
      <Card title="Recent Payments">
        {(stripe.recentPayments?.length || 0) === 0 ? (
          <p style={{ fontFamily: "var(--font-system)", fontSize: 12, color: "#A8A29E", textAlign: "center", padding: 20 }}>
            No payments yet
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {stripe.recentPayments?.slice(0, 10).map((p) => (
              <div key={p.id} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "8px 0", borderBottom: "1px solid rgba(214,208,196,0.3)",
              }}>
                <div>
                  <p style={{ fontFamily: "var(--font-system)", fontSize: 13, fontWeight: 600, color: "#1C1917", margin: 0 }}>
                    {p.description}
                  </p>
                  <p style={{ fontFamily: "var(--font-system)", fontSize: 11, color: "#78716C", margin: 0 }}>
                    {p.customerEmail || "—"} · {new Date(p.created).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontFamily: "var(--font-system)", fontSize: 14, fontWeight: 700, color: p.refunded ? "#C8322B" : "#2D5A3D", margin: 0 }}>
                    {p.refunded ? "−" : ""}{p.amountFormatted}
                  </p>
                  <span style={{
                    fontFamily: "var(--font-system)", fontSize: 10, padding: "1px 6px", borderRadius: 4,
                    background: p.status === "succeeded" ? "rgba(45,90,61,0.1)" : "rgba(200,50,43,0.1)",
                    color: p.status === "succeeded" ? "#2D5A3D" : "#C8322B",
                  }}>
                    {p.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Actions */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <ActionBtn label="Manage Billing" loading={actionLoading === "billing_portal"} onClick={() => onAction("billing_portal")} />
        <ActionBtn label="Sync Invoices" loading={actionLoading === "sync_invoices"} onClick={() => onAction("sync_invoices")} />
      </div>
    </div>
  );
}

// ─── Mercury Tab ─────────────────────────────────────────

function MercuryTab({ mercury }: { mercury: MercuryData }) {
  if (!mercury.configured) {
    return <NotConfigured name="Mercury" envVar="MERCURY_API_KEY" hint="Mercury → Settings → API → Generate token" />;
  }
  if (mercury.error) {
    return <ErrorCard message={mercury.error} />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Accounts */}
      <Card title="Bank Accounts">
        {(mercury.accounts?.length || 0) === 0 ? (
          <p style={{ fontFamily: "var(--font-system)", fontSize: 12, color: "#A8A29E", textAlign: "center", padding: 20 }}>
            No accounts found
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {mercury.accounts?.map((acc) => (
              <div key={acc.id} style={{
                padding: 12, background: "rgba(250,248,244,0.5)", borderRadius: 10,
                border: "1px solid rgba(214,208,196,0.4)",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <p style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 700, color: "#1C1917", margin: 0 }}>
                      {acc.name}
                    </p>
                    <p style={{ fontFamily: "var(--font-system)", fontSize: 11, color: "#78716C", margin: 0 }}>
                      {acc.type} · {acc.accountNumber || "—"}
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontFamily: "var(--font-system)", fontSize: 18, fontWeight: 800, color: "#2D5A3D", margin: 0 }}>
                      ${Number(acc.currentBalance).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </p>
                    <span style={{
                      fontFamily: "var(--font-system)", fontSize: 10, padding: "1px 6px", borderRadius: 4,
                      background: acc.status === "active" ? "rgba(45,90,61,0.1)" : "rgba(200,50,43,0.1)",
                      color: acc.status === "active" ? "#2D5A3D" : "#C8322B",
                    }}>
                      {acc.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Recent Transactions */}
      <Card title="Recent Transactions">
        {(mercury.recentTransactions?.length || 0) === 0 ? (
          <p style={{ fontFamily: "var(--font-system)", fontSize: 12, color: "#A8A29E", textAlign: "center", padding: 20 }}>
            No recent transactions
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {mercury.recentTransactions?.slice(0, 15).map((tx) => (
              <div key={tx.id} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "8px 0", borderBottom: "1px solid rgba(214,208,196,0.2)",
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: "var(--font-system)", fontSize: 12, fontWeight: 500, color: "#1C1917", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {tx.counterparty || tx.description}
                  </p>
                  <p style={{ fontFamily: "var(--font-system)", fontSize: 10, color: "#A8A29E", margin: 0 }}>
                    {tx.date ? new Date(tx.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "—"}
                  </p>
                </div>
                <p style={{
                  fontFamily: "var(--font-system)", fontSize: 13, fontWeight: 700, margin: 0,
                  color: tx.direction === "credit" ? "#2D5A3D" : "#C8322B",
                }}>
                  {tx.direction === "credit" ? "+" : "−"}${Math.abs(Number(tx.amount)).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── Affiliate Tab ───────────────────────────────────────

function AffiliateTab({ affiliate }: { affiliate: AffiliateData }) {
  if (!affiliate.configured) {
    return <NotConfigured name="CJ Affiliate" envVar="CJ_API_TOKEN" hint="CJ Dashboard → Account → API Token" />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
        <KPICard label="Clicks (30d)" value={String(affiliate.clicks30d || 0)} sub="Total clicks" color="#7C3AED" />
        <KPICard label="Commissions" value={String(affiliate.commissions30d || 0)} sub="30-day count" color="#C49A2A" />
        <KPICard label="Revenue (30d)" value={affiliate.revenue30dFormatted || "$0.00"} sub="Commission earned" color="#2D5A3D" />
      </div>
      <Card title="">
        <p style={{ fontFamily: "var(--font-system)", fontSize: 12, color: "#78716C", textAlign: "center" }}>
          For detailed affiliate data, visit{" "}
          <Link href="/admin/affiliate-hq" style={{ color: "#3B7EA1", textDecoration: "underline" }}>Affiliate HQ</Link>
        </p>
      </Card>
    </div>
  );
}

// ─── Shared UI Components ────────────────────────────────

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: "#FFFFFF", borderRadius: 14, padding: 16,
      border: "1px solid rgba(214,208,196,0.5)", boxShadow: "0 1px 3px rgba(28,25,23,0.04)",
    }}>
      {title && (
        <p style={{ fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 700, color: "#44403C", marginBottom: 12, margin: "0 0 12px" }}>
          {title}
        </p>
      )}
      {children}
    </div>
  );
}

function KPICard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div style={{
      background: "#FFFFFF", borderRadius: 14, padding: "14px 16px",
      border: "1px solid rgba(214,208,196,0.5)", boxShadow: "0 1px 3px rgba(28,25,23,0.04)",
    }}>
      <p style={{ fontFamily: "var(--font-system)", fontSize: 10, fontWeight: 600, color: "#A8A29E", textTransform: "uppercase", letterSpacing: 0.5, margin: 0 }}>
        {label}
      </p>
      <p style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, color, margin: "4px 0 2px" }}>
        {value}
      </p>
      <p style={{ fontFamily: "var(--font-system)", fontSize: 11, color: "#78716C", margin: 0 }}>
        {sub}
      </p>
    </div>
  );
}

function StatusRow({ name, connected, detail }: { name: string; connected: boolean; detail: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
      <div style={{
        width: 8, height: 8, borderRadius: "50%",
        background: connected ? "#2D5A3D" : "#C8322B",
        boxShadow: connected ? "0 0 6px rgba(45,90,61,0.4)" : "0 0 6px rgba(200,50,43,0.4)",
      }} />
      <span style={{ fontFamily: "var(--font-system)", fontSize: 13, fontWeight: 600, color: "#1C1917", minWidth: 80 }}>
        {name}
      </span>
      <span style={{ fontFamily: "var(--font-system)", fontSize: 12, color: "#78716C" }}>
        {detail}
      </span>
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontFamily: "var(--font-system)", fontSize: 12, color: "#78716C" }}>{label}</span>
      <span style={{ fontFamily: "var(--font-system)", fontSize: 14, fontWeight: 700, color: "#1C1917" }}>{value}</span>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div>
      <p style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800, color, margin: 0 }}>{value}</p>
      <p style={{ fontFamily: "var(--font-system)", fontSize: 10, color: "#78716C", margin: 0 }}>{label}</p>
    </div>
  );
}

function ActionBtn({ label, loading, onClick }: { label: string; loading: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        padding: "8px 16px", border: "1px solid rgba(214,208,196,0.5)", borderRadius: 10,
        background: loading ? "#F5F5F4" : "#FFFFFF", cursor: loading ? "wait" : "pointer",
        fontFamily: "var(--font-system)", fontSize: 12, fontWeight: 600, color: "#44403C",
        transition: "all 0.15s",
      }}
    >
      {loading ? "..." : label}
    </button>
  );
}

function NotConfigured({ name, envVar, hint }: { name: string; envVar: string; hint: string }) {
  return (
    <div style={{ textAlign: "center", padding: "40px 20px" }}>
      <p style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: "#44403C" }}>
        {name} not connected
      </p>
      <p style={{ fontFamily: "var(--font-system)", fontSize: 13, color: "#78716C", marginTop: 8 }}>
        Add <code style={{ background: "#F5F5F4", padding: "2px 6px", borderRadius: 4, fontFamily: "var(--font-system)", fontSize: 12 }}>{envVar}</code> to Vercel environment variables.
      </p>
      <p style={{ fontFamily: "var(--font-system)", fontSize: 11, color: "#A8A29E", marginTop: 4 }}>
        {hint}
      </p>
    </div>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div style={{ background: "rgba(200,50,43,0.06)", border: "1px solid rgba(200,50,43,0.2)", borderRadius: 12, padding: 16 }}>
      <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "#C8322B", fontSize: 14 }}>Connection Error</p>
      <p style={{ fontFamily: "var(--font-system)", fontSize: 12, color: "#78716C", marginTop: 4 }}>{message}</p>
    </div>
  );
}
