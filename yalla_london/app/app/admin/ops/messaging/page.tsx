"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ChannelStatus = "wired" | "partial" | "planned";

interface EnvCheck {
  key: string;
  label: string;
  set: boolean;
}

interface ChannelCard {
  id: string;
  icon: string;
  name: string;
  description: string;
  status: ChannelStatus;
  envChecks: EnvCheck[];
  actionLabel: string;
  actionHref?: string;
  note?: string;
}

// ---------------------------------------------------------------------------
// Static channel definitions (env `set` values are defaults, overridden at runtime)
// ---------------------------------------------------------------------------

interface ChannelDef {
  id: string;
  icon: string;
  name: string;
  description: string;
  status: ChannelStatus;
  envKeys: { key: string; label: string }[];
  actionLabel: string;
  actionHref?: string;
  note?: string;
}

const CHANNEL_DEFS: ChannelDef[] = [
  {
    id: "whatsapp",
    icon: "💬",
    name: "WhatsApp",
    description:
      "Bidirectional WhatsApp Cloud API for customer conversations, CEO agent responses, and automated follow-ups via Meta Business.",
    status: "wired",
    envKeys: [
      { key: "WHATSAPP_PHONE_NUMBER_ID", label: "Phone Number ID" },
      { key: "WHATSAPP_ACCESS_TOKEN", label: "Access Token" },
      { key: "WHATSAPP_VERIFY_TOKEN", label: "Verify Token" },
      { key: "WHATSAPP_BUSINESS_ACCOUNT_ID", label: "Business Account ID" },
    ],
    actionLabel: "View Conversations",
    actionHref: "/admin/agent/conversations",
    note: "Webhook: /api/webhooks/whatsapp",
  },
  {
    id: "email",
    icon: "✉️",
    name: "Email (Resend)",
    description:
      "Transactional email via Resend — welcome sequences, booking confirmations, CEO alert notifications, and retention campaigns.",
    status: "wired",
    envKeys: [
      { key: "RESEND_API_KEY", label: "Resend API Key" },
      { key: "RESEND_WEBHOOK_SECRET", label: "Webhook Secret" },
      { key: "EMAIL_FROM", label: "From Address" },
    ],
    actionLabel: "Email Campaigns",
    actionHref: "/admin/email-campaigns",
    note: "Webhook: /api/email/webhook",
  },
  {
    id: "kaspo",
    icon: "🎧",
    name: "Kaspo",
    description:
      "Customer messaging platform for live chat, ticketing, and unified inbox. Planned integration for multi-channel support operations.",
    status: "planned",
    envKeys: [
      { key: "KASPO_API_KEY", label: "API Key" },
      { key: "KASPO_WORKSPACE_ID", label: "Workspace ID" },
    ],
    actionLabel: "Coming Soon",
  },
  {
    id: "sms",
    icon: "📱",
    name: "SMS (Twilio)",
    description:
      "SMS notifications and two-way messaging via Twilio. Planned for booking reminders, OTP verification, and high-priority CEO alerts.",
    status: "planned",
    envKeys: [
      { key: "TWILIO_ACCOUNT_SID", label: "Account SID" },
      { key: "TWILIO_AUTH_TOKEN", label: "Auth Token" },
      { key: "TWILIO_PHONE_NUMBER", label: "Phone Number" },
    ],
    actionLabel: "Coming Soon",
  },
];

function buildChannels(envStatus: Record<string, boolean>): ChannelCard[] {
  return CHANNEL_DEFS.map(({ envKeys, ...rest }) => ({
    ...rest,
    envChecks: envKeys.map((e) => ({ ...e, set: !!envStatus[e.key] })),
  }));
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<ChannelStatus, { label: string; bg: string; text: string; dot: string }> = {
  wired:   { label: "WIRED",   bg: "rgba(16,185,129,0.12)", text: "#34D399", dot: "#10B981" },
  partial: { label: "PARTIAL", bg: "rgba(245,158,11,0.12)", text: "#FCD34D", dot: "#F59E0B" },
  planned: { label: "PLANNED", bg: "rgba(100,116,139,0.12)", text: "#94A3B8", dot: "#64748B" },
};

function StatusBadge({ status }: { status: ChannelStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        padding: "2px 8px",
        borderRadius: "999px",
        background: cfg.bg,
        color: cfg.text,
        fontFamily: "monospace",
        fontSize: "10px",
        fontWeight: 600,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
      }}
    >
      <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: cfg.dot, flexShrink: 0 }} />
      {cfg.label}
    </span>
  );
}

function EnvRow({ check }: { check: EnvCheck }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "4px 0",
        borderBottom: "1px solid rgba(30,41,59,0.6)",
      }}
    >
      <span style={{ fontSize: "11px", color: "#94A3B8", fontFamily: "monospace" }}>{check.key}</span>
      <span
        style={{
          fontSize: "10px",
          fontFamily: "monospace",
          fontWeight: 600,
          letterSpacing: "0.06em",
          color: check.set ? "#34D399" : "#F87171",
        }}
      >
        {check.set ? "SET" : "MISSING"}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Test Connection Button
// ---------------------------------------------------------------------------

function TestConnectionButton({ channelId }: { channelId: string }) {
  const [state, setState] = useState<"idle" | "testing" | "success" | "failed">("idle");
  const [latency, setLatency] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runTest = useCallback(async () => {
    setState("testing");
    setError(null);
    setLatency(null);
    const start = Date.now();
    try {
      const res = await fetch("/api/admin/env-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: channelId }),
        cache: "no-store",
      });
      const elapsed = Date.now() - start;
      setLatency(elapsed);
      if (!res.ok) {
        setState("failed");
        setError(`HTTP ${res.status}`);
        return;
      }
      const data = await res.json();
      if (data?.connected === false) {
        setState("failed");
        setError(data.error || "Connection failed");
      } else {
        setState("success");
      }
    } catch (err) {
      const elapsed = Date.now() - start;
      setLatency(elapsed);
      setState("failed");
      setError(err instanceof Error ? err.message : "Network error");
    }
  }, [channelId]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <button
        onClick={runTest}
        disabled={state === "testing"}
        style={{
          display: "block",
          width: "100%",
          textAlign: "center",
          padding: "9px 16px",
          borderRadius: "8px",
          background: state === "success"
            ? "rgba(16,185,129,0.15)"
            : state === "failed"
              ? "rgba(248,113,113,0.15)"
              : "rgba(59,126,161,0.15)",
          border: state === "success"
            ? "1px solid rgba(16,185,129,0.35)"
            : state === "failed"
              ? "1px solid rgba(248,113,113,0.35)"
              : "1px solid rgba(59,126,161,0.35)",
          color: state === "success"
            ? "#34D399"
            : state === "failed"
              ? "#F87171"
              : "#7DD3FC",
          fontFamily: "monospace",
          fontSize: "11px",
          fontWeight: 600,
          letterSpacing: "0.07em",
          textTransform: "uppercase" as const,
          cursor: state === "testing" ? "wait" : "pointer",
          opacity: state === "testing" ? 0.7 : 1,
          transition: "all 0.15s",
        }}
      >
        {state === "testing"
          ? "Testing..."
          : state === "success"
            ? `Connected${latency ? ` (${latency}ms)` : ""}`
            : state === "failed"
              ? "Failed"
              : "Test Connection"}
      </button>
      {state === "failed" && error && (
        <p style={{ fontSize: "10px", color: "#F87171", fontFamily: "monospace", margin: 0, padding: "0 4px" }}>
          {error}{latency ? ` (${latency}ms)` : ""}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Kaspo Setup Instructions
// ---------------------------------------------------------------------------

function KaspoSetupInstructions() {
  const [expanded, setExpanded] = useState(false);
  const webhookDomain =
    typeof window !== "undefined" ? window.location.origin : "https://your-domain";

  return (
    <div
      style={{
        background: "rgba(15,23,42,0.6)",
        borderRadius: "8px",
        padding: "10px 12px",
      }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          width: "100%",
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
        }}
      >
        <span
          style={{
            fontFamily: "monospace",
            fontSize: "10px",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "#7DD3FC",
            fontWeight: 600,
          }}
        >
          Setup Instructions
        </span>
        <span style={{ fontSize: "12px", color: "#64748B", transition: "transform 0.2s", transform: expanded ? "rotate(180deg)" : "rotate(0)" }}>
          ▼
        </span>
      </button>
      {expanded && (
        <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
            <span style={{ fontSize: "11px", color: "#64748B", fontWeight: 700, flexShrink: 0, fontFamily: "monospace" }}>1.</span>
            <p style={{ fontSize: "11px", color: "#94A3B8", lineHeight: 1.5, margin: 0 }}>
              Add <code style={{ background: "rgba(30,41,59,0.8)", padding: "1px 5px", borderRadius: "3px", color: "#E2E8F0", fontSize: "10px" }}>KASPO_API_KEY</code> and{" "}
              <code style={{ background: "rgba(30,41,59,0.8)", padding: "1px 5px", borderRadius: "3px", color: "#E2E8F0", fontSize: "10px" }}>KASPO_WORKSPACE_ID</code> in Vercel Environment Variables.
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
            <span style={{ fontSize: "11px", color: "#64748B", fontWeight: 700, flexShrink: 0, fontFamily: "monospace" }}>2.</span>
            <p style={{ fontSize: "11px", color: "#94A3B8", lineHeight: 1.5, margin: 0 }}>
              Configure webhooks in your Kaspo dashboard pointing to:{" "}
              <code style={{ background: "rgba(30,41,59,0.8)", padding: "1px 5px", borderRadius: "3px", color: "#7DD3FC", fontSize: "10px", wordBreak: "break-all" }}>
                {webhookDomain}/api/webhooks/kaspo
              </code>
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
            <span style={{ fontSize: "11px", color: "#64748B", fontWeight: 700, flexShrink: 0, fontFamily: "monospace" }}>3.</span>
            <p style={{ fontSize: "11px", color: "#94A3B8", lineHeight: 1.5, margin: 0 }}>
              Redeploy the app to activate the Kaspo integration.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function MessagingIntegrationsPage() {
  const [channels, setChannels] = useState<ChannelCard[]>(() => buildChannels({}));

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/env-check", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (data?.vars) setChannels(buildChannels(data.vars));
      } catch {
        // env check is best-effort — page still renders with all-unknown
      }
    })();
  }, []);

  const connectedCount = channels.filter((c) => c.status === "wired").length;
  const plannedCount = channels.filter((c) => c.status === "planned").length;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0B1120",
        padding: "28px 24px",
        fontFamily: "var(--font-system, system-ui)",
        color: "#F1F5F9",
      }}
    >
      {/* ------------------------------------------------------------------ */}
      {/* Header                                                               */}
      {/* ------------------------------------------------------------------ */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "28px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <p
            style={{
              fontFamily: "monospace",
              fontSize: "10px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#64748B",
              marginBottom: "6px",
            }}
          >
            Admin / Ops
          </p>
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#F8FAFC", margin: 0 }}>
            Messaging &amp; Integrations
          </h1>
          <p style={{ fontSize: "13px", color: "#94A3B8", marginTop: "4px" }}>
            Communication channels connected to the CEO Agent and notification system.
          </p>
        </div>

        {/* Environment label */}
        <span
          style={{
            padding: "4px 10px",
            borderRadius: "6px",
            background: "rgba(59,126,161,0.15)",
            border: "1px solid rgba(59,126,161,0.3)",
            fontSize: "11px",
            fontFamily: "monospace",
            letterSpacing: "0.08em",
            color: "#7DD3FC",
            fontWeight: 600,
            textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}
        >
          {typeof window !== "undefined"
            ? (process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV || "production")
            : "production"}
        </span>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Summary strip                                                        */}
      {/* ------------------------------------------------------------------ */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "12px",
          marginBottom: "28px",
        }}
      >
        {[
          { label: "Connected", value: connectedCount, color: "#34D399" },
          { label: "Planned", value: plannedCount, color: "#94A3B8" },
          { label: "Total Channels", value: channels.length, color: "#7DD3FC" },
          { label: "Env Vars Set", value: channels.reduce((n, c) => n + c.envChecks.filter(e => e.set).length, 0), color: "#C8322B" },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              background: "#111827",
              border: "1px solid #1E293B",
              borderRadius: "10px",
              padding: "14px 16px",
            }}
          >
            <p
              style={{
                fontFamily: "monospace",
                fontSize: "10px",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "#64748B",
                margin: "0 0 6px 0",
              }}
            >
              {stat.label}
            </p>
            <p style={{ fontSize: "26px", fontWeight: 700, color: stat.color, margin: 0, lineHeight: 1 }}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Channel cards grid                                                   */}
      {/* ------------------------------------------------------------------ */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: "16px",
        }}
      >
        {channels.map((channel) => {
          const isLive = channel.status === "wired" || channel.status === "partial";
          return (
            <div
              key={channel.id}
              style={{
                background: "#111827",
                border: "1px solid #1E293B",
                borderRadius: "12px",
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
                opacity: isLive ? 1 : 0.72,
              }}
            >
              {/* Card header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "22px", lineHeight: 1 }}>{channel.icon}</span>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: "15px", color: "#F8FAFC", margin: 0 }}>
                      {channel.name}
                    </p>
                    {channel.note && (
                      <p
                        style={{
                          fontFamily: "monospace",
                          fontSize: "10px",
                          color: "#475569",
                          margin: "2px 0 0 0",
                        }}
                      >
                        {channel.note}
                      </p>
                    )}
                  </div>
                </div>
                <StatusBadge status={channel.status} />
              </div>

              {/* Description */}
              <p style={{ fontSize: "12px", color: "#94A3B8", lineHeight: 1.55, margin: 0 }}>
                {channel.description}
              </p>

              {/* Env var checklist */}
              <div
                style={{
                  background: "rgba(15,23,42,0.6)",
                  borderRadius: "8px",
                  padding: "10px 12px",
                }}
              >
                <p
                  style={{
                    fontFamily: "monospace",
                    fontSize: "10px",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "#475569",
                    margin: "0 0 6px 0",
                    fontWeight: 600,
                  }}
                >
                  Env Vars
                </p>
                {channel.envChecks.map((check) => (
                  <EnvRow key={check.key} check={check} />
                ))}
              </div>

              {/* Kaspo setup instructions */}
              {channel.id === "kaspo" && <KaspoSetupInstructions />}

              {/* Action buttons */}
              <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
                {/* Test Connection button for wired and partial channels */}
                {(channel.status === "wired" || channel.status === "partial") && (
                  <TestConnectionButton channelId={channel.id} />
                )}

                {channel.actionHref ? (
                  <Link
                    href={channel.actionHref}
                    style={{
                      display: "block",
                      textAlign: "center",
                      padding: "9px 16px",
                      borderRadius: "8px",
                      background:
                        channel.status === "wired"
                          ? "rgba(16,185,129,0.15)"
                          : "rgba(100,116,139,0.15)",
                      border:
                        channel.status === "wired"
                          ? "1px solid rgba(16,185,129,0.35)"
                          : "1px solid rgba(100,116,139,0.35)",
                      color: channel.status === "wired" ? "#34D399" : "#94A3B8",
                      fontFamily: "monospace",
                      fontSize: "11px",
                      fontWeight: 600,
                      letterSpacing: "0.07em",
                      textTransform: "uppercase",
                      textDecoration: "none",
                      transition: "opacity 0.15s",
                    }}
                  >
                    {channel.actionLabel}
                  </Link>
                ) : (
                  <button
                    disabled
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "center",
                      padding: "9px 16px",
                      borderRadius: "8px",
                      background: "rgba(30,41,59,0.5)",
                      border: "1px solid rgba(30,41,59,0.8)",
                      color: "#475569",
                      fontFamily: "monospace",
                      fontSize: "11px",
                      fontWeight: 600,
                      letterSpacing: "0.07em",
                      textTransform: "uppercase",
                      cursor: "not-allowed",
                    }}
                  >
                    {channel.actionLabel}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Footer note                                                          */}
      {/* ------------------------------------------------------------------ */}
      <p
        style={{
          marginTop: "32px",
          fontSize: "11px",
          color: "#334155",
          fontFamily: "monospace",
          textAlign: "center",
        }}
      >
        Env var status reflects build-time detection. Set variables in Vercel → Redeploy to update.
      </p>
    </div>
  );
}
