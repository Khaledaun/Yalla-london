"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AgentStatus {
  ceo: {
    status: string;
    lastActivity: string | null;
    conversationsToday: number;
    messagesHandled: number;
    toolsUsed: string[];
  };
  cto: {
    status: string;
    lastRun: string | null;
    findings: number;
    lastTaskType: string | null;
  };
}

interface RecentConversation {
  id: string;
  channel: string;
  contactName: string | null;
  status: string;
  lastMessageAt: string | null;
  messageCount: number;
  lastMessage: {
    content: string;
    direction: string;
    createdAt: string;
  } | null;
}

interface PipelineSummary {
  totalOpportunities: number;
  activeOpportunities: number;
  totalPipelineValue: number;
  stageBreakdown: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Agent HQ Page
// ---------------------------------------------------------------------------

export default function AgentHQPage() {
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);
  const [conversations, setConversations] = useState<RecentConversation[]>([]);
  const [pipeline, setPipeline] = useState<PipelineSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/agent");

      if (res.ok) {
        const data = await res.json();
        if (data.ceo) setAgentStatus({ ceo: data.ceo, cto: data.cto });
        if (data.recentConversations) setConversations(data.recentConversations);
        if (data.pipeline) setPipeline(data.pipeline);
      }

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load agent data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div style={{ padding: "24px", fontFamily: "var(--font-system, system-ui)" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "16px" }}>Agent HQ</h1>
        <p style={{ color: "#666" }}>Loading agent status...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px", fontFamily: "var(--font-system, system-ui)", maxWidth: "1200px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 700 }}>Agent HQ</h1>
        <button
          onClick={fetchData}
          style={{
            padding: "8px 16px",
            background: "#3B7EA1",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          Refresh
        </button>
      </div>

      {error && (
        <div style={{ padding: "12px 16px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "8px", marginBottom: "16px", color: "#991B1B" }}>
          {error}
        </div>
      )}

      {/* Agent Status Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        {/* CEO Agent Card */}
        <div style={{ background: "#fff", border: "1px solid rgba(214,208,196,0.5)", borderRadius: "12px", padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: 600 }}>CEO Agent</h2>
            <span style={{
              padding: "4px 10px",
              borderRadius: "12px",
              fontSize: "12px",
              fontWeight: 600,
              background: agentStatus?.ceo.status === "active" ? "#D1FAE5" : "#FEF3C7",
              color: agentStatus?.ceo.status === "active" ? "#065F46" : "#92400E",
            }}>
              {agentStatus?.ceo.status || "unknown"}
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <div style={{ fontSize: "12px", color: "#666" }}>Conversations Today</div>
              <div style={{ fontSize: "24px", fontWeight: 700 }}>{agentStatus?.ceo.conversationsToday || 0}</div>
            </div>
            <div>
              <div style={{ fontSize: "12px", color: "#666" }}>Messages Handled</div>
              <div style={{ fontSize: "24px", fontWeight: 700 }}>{agentStatus?.ceo.messagesHandled || 0}</div>
            </div>
          </div>
          {agentStatus?.ceo.toolsUsed && agentStatus.ceo.toolsUsed.length > 0 && (
            <div style={{ marginTop: "12px" }}>
              <div style={{ fontSize: "12px", color: "#666", marginBottom: "4px" }}>Tools Used</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                {agentStatus.ceo.toolsUsed.slice(0, 6).map((tool) => (
                  <span key={tool} style={{ padding: "2px 8px", background: "#F3F4F6", borderRadius: "4px", fontSize: "11px" }}>
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* CTO Agent Card */}
        <div style={{ background: "#fff", border: "1px solid rgba(214,208,196,0.5)", borderRadius: "12px", padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: 600 }}>CTO Agent</h2>
            <span style={{
              padding: "4px 10px",
              borderRadius: "12px",
              fontSize: "12px",
              fontWeight: 600,
              background: "#FEF3C7",
              color: "#92400E",
            }}>
              {agentStatus?.cto.status || "pending"}
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <div style={{ fontSize: "12px", color: "#666" }}>Findings</div>
              <div style={{ fontSize: "24px", fontWeight: 700 }}>{agentStatus?.cto.findings || 0}</div>
            </div>
            <div>
              <div style={{ fontSize: "12px", color: "#666" }}>Last Run</div>
              <div style={{ fontSize: "14px", fontWeight: 500 }}>
                {agentStatus?.cto.lastRun
                  ? new Date(agentStatus.cto.lastRun).toLocaleDateString()
                  : "Never"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pipeline Summary */}
      {pipeline && (
        <div style={{ background: "#fff", border: "1px solid rgba(214,208,196,0.5)", borderRadius: "12px", padding: "20px", marginBottom: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: 600 }}>Sales Pipeline</h2>
            <Link href="/admin/agent/conversations" style={{ color: "#3B7EA1", fontSize: "14px", textDecoration: "none" }}>
              View All
            </Link>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "12px" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "28px", fontWeight: 700, color: "#3B7EA1" }}>{pipeline.activeOpportunities}</div>
              <div style={{ fontSize: "12px", color: "#666" }}>Active</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "28px", fontWeight: 700, color: "#C49A2A" }}>${(pipeline.totalPipelineValue || 0).toLocaleString()}</div>
              <div style={{ fontSize: "12px", color: "#666" }}>Pipeline Value</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "28px", fontWeight: 700 }}>{pipeline.totalOpportunities}</div>
              <div style={{ fontSize: "12px", color: "#666" }}>Total</div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Conversations */}
      <div style={{ background: "#fff", border: "1px solid rgba(214,208,196,0.5)", borderRadius: "12px", padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 600 }}>Recent Conversations</h2>
          <Link href="/admin/agent/conversations" style={{ color: "#3B7EA1", fontSize: "14px", textDecoration: "none" }}>
            View All
          </Link>
        </div>

        {conversations.length === 0 ? (
          <p style={{ color: "#666", textAlign: "center", padding: "24px" }}>No conversations yet. Conversations will appear here when messages arrive via WhatsApp, email, or web forms.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {conversations.map((conv) => (
              <div
                key={conv.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px",
                  borderRadius: "8px",
                  background: "#FAF8F4",
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <span style={{ fontWeight: 600, fontSize: "14px" }}>
                      {conv.contactName || "Unknown"}
                    </span>
                    <span style={{
                      padding: "2px 6px",
                      borderRadius: "4px",
                      fontSize: "10px",
                      fontWeight: 600,
                      background: conv.channel === "whatsapp" ? "#D1FAE5" : conv.channel === "email" ? "#DBEAFE" : "#F3F4F6",
                      color: conv.channel === "whatsapp" ? "#065F46" : conv.channel === "email" ? "#1E40AF" : "#374151",
                    }}>
                      {conv.channel}
                    </span>
                    <span style={{
                      padding: "2px 6px",
                      borderRadius: "4px",
                      fontSize: "10px",
                      background: conv.status === "open" ? "#D1FAE5" : conv.status === "waiting" ? "#FEF3C7" : "#F3F4F6",
                      color: conv.status === "open" ? "#065F46" : conv.status === "waiting" ? "#92400E" : "#374151",
                    }}>
                      {conv.status}
                    </span>
                  </div>
                  {conv.lastMessage && (
                    <p style={{ fontSize: "13px", color: "#666", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "400px" }}>
                      {conv.lastMessage.direction === "outbound" ? "Agent: " : ""}{conv.lastMessage.content.slice(0, 80)}
                    </p>
                  )}
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: "12px", color: "#666" }}>
                    {conv.lastMessageAt ? new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                  </div>
                  <div style={{ fontSize: "11px", color: "#999" }}>
                    {conv.messageCount} msg{conv.messageCount !== 1 ? "s" : ""}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
