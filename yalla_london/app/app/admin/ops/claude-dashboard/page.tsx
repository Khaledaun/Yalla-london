"use client";

import { useEffect, useState } from "react";

interface Agent {
  name: string;
  description: string;
  model: string;
}

interface SessionLog {
  date: string;
  content: string;
}

interface DashboardData {
  agents: Agent[];
  hooks: Record<string, boolean>;
  sessionLogs: SessionLog[];
  permissions: { allow: number; deny: number };
  projectStatus: string;
  counts: {
    agents: number;
    commands: number;
    skills: number;
    sessionLogs: number;
  };
  timestamp: string;
}

export default function ClaudeDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/claude-dashboard")
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(
            res.status === 403
              ? "This dashboard is only available in development mode"
              : text
          );
        }
        return res.json();
      })
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 32, fontFamily: "system-ui" }}>
        <h1>Claude Code Ops Dashboard</h1>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 32, fontFamily: "system-ui" }}>
        <h1>Claude Code Ops Dashboard</h1>
        <div
          style={{
            padding: 16,
            background: "#FEF2F2",
            border: "1px solid #FECACA",
            borderRadius: 8,
            color: "#991B1B",
          }}
        >
          {error}
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div
      style={{
        padding: 32,
        fontFamily: "system-ui",
        maxWidth: 1200,
        margin: "0 auto",
        background: "var(--admin-bg, #FAF8F4)",
        minHeight: "100vh",
      }}
    >
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
        Claude Code Ops Dashboard
      </h1>
      <p style={{ color: "#6B7280", marginBottom: 32, fontSize: 14 }}>
        Last refreshed: {new Date(data.timestamp).toLocaleString()}
      </p>

      {/* KPI Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 16,
          marginBottom: 32,
        }}
      >
        {[
          { label: "Agents", value: data.counts.agents, color: "#3B7EA1" },
          { label: "Commands", value: data.counts.commands, color: "#C49A2A" },
          { label: "Skills", value: data.counts.skills, color: "#2D5A3D" },
          {
            label: "Permissions (Allow)",
            value: data.permissions.allow,
            color: "#059669",
          },
          {
            label: "Permissions (Deny)",
            value: data.permissions.deny,
            color: "#C8322B",
          },
          {
            label: "Session Logs",
            value: data.counts.sessionLogs,
            color: "#6B7280",
          },
        ].map((card) => (
          <div
            key={card.label}
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: 20,
              border: "1px solid rgba(214,208,196,0.5)",
            }}
          >
            <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
              {card.label}
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: card.color }}>
              {card.value}
            </div>
          </div>
        ))}
      </div>

      {/* Hooks Status */}
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          padding: 24,
          marginBottom: 24,
          border: "1px solid rgba(214,208,196,0.5)",
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
          Active Hooks
        </h2>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {Object.entries(data.hooks).map(([event, active]) => (
            <div
              key={event}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                background: active ? "#ECFDF5" : "#FEF2F2",
                color: active ? "#065F46" : "#991B1B",
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              {active ? "\u2713" : "\u2717"} {event}
            </div>
          ))}
          {Object.keys(data.hooks).length === 0 && (
            <p style={{ color: "#6B7280" }}>No hooks configured</p>
          )}
        </div>
      </div>

      {/* Agents Registry */}
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          padding: 24,
          marginBottom: 24,
          border: "1px solid rgba(214,208,196,0.5)",
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
          Agent Registry ({data.agents.length})
        </h2>
        <div style={{ display: "grid", gap: 8 }}>
          {data.agents.map((agent) => (
            <div
              key={agent.name}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 16px",
                background: "#FAFAF9",
                borderRadius: 8,
                fontSize: 14,
              }}
            >
              <div>
                <span style={{ fontWeight: 600 }}>{agent.name}</span>
                {agent.description && (
                  <span style={{ color: "#6B7280", marginLeft: 8 }}>
                    — {agent.description}
                  </span>
                )}
              </div>
              <span
                style={{
                  padding: "2px 8px",
                  borderRadius: 4,
                  background: "#E5E7EB",
                  fontSize: 12,
                  fontWeight: 500,
                }}
              >
                {agent.model}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Session Logs */}
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          padding: 24,
          border: "1px solid rgba(214,208,196,0.5)",
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
          Recent Session Logs ({data.sessionLogs.length})
        </h2>
        {data.sessionLogs.length === 0 ? (
          <p style={{ color: "#6B7280" }}>
            No session logs yet. Logs are created when sessions end (Stop hook).
          </p>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {data.sessionLogs.map((log) => (
              <div key={log.date}>
                <button
                  onClick={() =>
                    setExpandedLog(expandedLog === log.date ? null : log.date)
                  }
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "12px 16px",
                    background: "#FAFAF9",
                    borderRadius: 8,
                    border: "1px solid #E5E7EB",
                    cursor: "pointer",
                    fontSize: 14,
                    fontWeight: 500,
                  }}
                >
                  {expandedLog === log.date ? "\u25BC" : "\u25B6"} {log.date}
                </button>
                {expandedLog === log.date && (
                  <pre
                    style={{
                      padding: 16,
                      background: "#1F2937",
                      color: "#F3F4F6",
                      borderRadius: "0 0 8px 8px",
                      fontSize: 12,
                      overflow: "auto",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {log.content || "(empty)"}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
