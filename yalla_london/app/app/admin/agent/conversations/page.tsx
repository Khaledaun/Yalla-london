"use client";

import { useState, useEffect, useCallback } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Conversation {
  id: string;
  channel: string;
  externalId: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  status: string;
  summary: string | null;
  sentiment: string | null;
  tags: string[];
  messageCount: number;
  lastMessage: {
    content: string;
    direction: string;
    createdAt: string;
    agentId: string | null;
  } | null;
  lastMessageAt: string | null;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ---------------------------------------------------------------------------
// Conversation Browser Page
// ---------------------------------------------------------------------------

export default function ConversationBrowserPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedConv, setSelectedConv] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Filters
  const [channel, setChannel] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");

  const fetchConversations = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (channel) params.set("channel", channel);
      if (status) params.set("status", status);
      if (search) params.set("search", search);

      const res = await fetch(`/api/admin/agent/conversations?${params}`);
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
        setPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
      }
    } catch (err) {
      console.warn("[conversations] Fetch failed:", err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [channel, status, search]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const handleAction = async (conversationId: string, action: string) => {
    setActionLoading(conversationId);
    try {
      const res = await fetch("/api/admin/agent/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, action }),
      });
      if (res.ok) {
        fetchConversations(pagination.page);
      }
    } catch (err) {
      console.warn("[conversations] Action failed:", err instanceof Error ? err.message : String(err));
    } finally {
      setActionLoading(null);
    }
  };

  const channelColor = (ch: string) => {
    switch (ch) {
      case "whatsapp": return { bg: "#D1FAE5", text: "#065F46" };
      case "email": return { bg: "#DBEAFE", text: "#1E40AF" };
      case "web": return { bg: "#EDE9FE", text: "#5B21B6" };
      case "internal": return { bg: "#F3F4F6", text: "#374151" };
      default: return { bg: "#F3F4F6", text: "#374151" };
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "open": return { bg: "#D1FAE5", text: "#065F46" };
      case "waiting": return { bg: "#FEF3C7", text: "#92400E" };
      case "resolved": return { bg: "#DBEAFE", text: "#1E40AF" };
      case "archived": return { bg: "#F3F4F6", text: "#374151" };
      default: return { bg: "#F3F4F6", text: "#374151" };
    }
  };

  return (
    <div style={{ padding: "24px", fontFamily: "var(--font-system, system-ui)", maxWidth: "1200px" }}>
      <h1 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "20px" }}>Conversations</h1>

      {/* Filters */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginBottom: "20px" }}>
        <input
          type="text"
          placeholder="Search by name, email, phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && fetchConversations(1)}
          style={{ padding: "8px 12px", border: "1px solid #D6D0C4", borderRadius: "6px", fontSize: "14px", minWidth: "220px" }}
        />
        <select
          value={channel}
          onChange={(e) => { setChannel(e.target.value); }}
          style={{ padding: "8px 12px", border: "1px solid #D6D0C4", borderRadius: "6px", fontSize: "14px" }}
        >
          <option value="">All Channels</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="email">Email</option>
          <option value="web">Web</option>
          <option value="internal">Internal</option>
        </select>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); }}
          style={{ padding: "8px 12px", border: "1px solid #D6D0C4", borderRadius: "6px", fontSize: "14px" }}
        >
          <option value="">All Statuses</option>
          <option value="open">Open</option>
          <option value="waiting">Waiting</option>
          <option value="resolved">Resolved</option>
          <option value="archived">Archived</option>
        </select>
        <button
          onClick={() => fetchConversations(1)}
          style={{ padding: "8px 16px", background: "#3B7EA1", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "14px" }}
        >
          Search
        </button>
      </div>

      {/* Stats Bar */}
      <div style={{ display: "flex", gap: "16px", marginBottom: "20px", flexWrap: "wrap" }}>
        <div style={{ background: "#fff", border: "1px solid rgba(214,208,196,0.5)", borderRadius: "8px", padding: "12px 20px" }}>
          <div style={{ fontSize: "20px", fontWeight: 700 }}>{pagination.total}</div>
          <div style={{ fontSize: "12px", color: "#666" }}>Total</div>
        </div>
      </div>

      {/* Conversation List */}
      {loading ? (
        <p style={{ color: "#666" }}>Loading conversations...</p>
      ) : conversations.length === 0 ? (
        <div style={{ background: "#fff", border: "1px solid rgba(214,208,196,0.5)", borderRadius: "12px", padding: "48px", textAlign: "center" }}>
          <p style={{ color: "#666", fontSize: "16px" }}>No conversations found.</p>
          <p style={{ color: "#999", fontSize: "14px" }}>Conversations will appear here when messages arrive via WhatsApp, email, or web forms.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {conversations.map((conv) => {
            const chColor = channelColor(conv.channel);
            const stColor = statusColor(conv.status);
            const isSelected = selectedConv === conv.id;

            return (
              <div key={conv.id}>
                <div
                  onClick={() => setSelectedConv(isSelected ? null : conv.id)}
                  style={{
                    background: "#fff",
                    border: `1px solid ${isSelected ? "#3B7EA1" : "rgba(214,208,196,0.5)"}`,
                    borderRadius: "10px",
                    padding: "16px",
                    cursor: "pointer",
                    transition: "border-color 0.2s",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                        <span style={{ fontWeight: 600, fontSize: "15px" }}>
                          {conv.contactName || conv.contactEmail || conv.contactPhone || "Unknown"}
                        </span>
                        <span style={{ padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 600, background: chColor.bg, color: chColor.text }}>
                          {conv.channel}
                        </span>
                        <span style={{ padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 500, background: stColor.bg, color: stColor.text }}>
                          {conv.status}
                        </span>
                        {conv.sentiment && (
                          <span style={{ fontSize: "11px", color: "#666" }}>
                            {conv.sentiment === "positive" ? "+" : conv.sentiment === "negative" ? "-" : "~"}
                          </span>
                        )}
                      </div>
                      {conv.lastMessage && (
                        <p style={{ fontSize: "13px", color: "#666", margin: "0 0 4px 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "500px" }}>
                          {conv.lastMessage.direction === "outbound" ? "Agent: " : ""}{conv.lastMessage.content.slice(0, 120)}
                        </p>
                      )}
                      {conv.tags.length > 0 && (
                        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                          {conv.tags.map((tag) => (
                            <span key={tag} style={{ padding: "1px 6px", background: "#F3F4F6", borderRadius: "3px", fontSize: "10px", color: "#666" }}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0, marginLeft: "16px" }}>
                      <div style={{ fontSize: "12px", color: "#666" }}>
                        {conv.lastMessageAt ? timeAgo(conv.lastMessageAt) : "—"}
                      </div>
                      <div style={{ fontSize: "11px", color: "#999" }}>
                        {conv.messageCount} msg{conv.messageCount !== 1 ? "s" : ""}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Actions */}
                {isSelected && (
                  <div style={{ background: "#FAF8F4", border: "1px solid rgba(214,208,196,0.5)", borderTop: "none", borderRadius: "0 0 10px 10px", padding: "12px 16px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {conv.status === "open" && (
                      <button
                        onClick={() => handleAction(conv.id, "resolve")}
                        disabled={actionLoading === conv.id}
                        style={{ padding: "6px 14px", background: "#2D5A3D", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer", fontSize: "13px" }}
                      >
                        Resolve
                      </button>
                    )}
                    {conv.status === "waiting" && (
                      <button
                        onClick={() => handleAction(conv.id, "resolve")}
                        disabled={actionLoading === conv.id}
                        style={{ padding: "6px 14px", background: "#2D5A3D", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer", fontSize: "13px" }}
                      >
                        Resolve
                      </button>
                    )}
                    {(conv.status === "resolved" || conv.status === "archived") && (
                      <button
                        onClick={() => handleAction(conv.id, "reopen")}
                        disabled={actionLoading === conv.id}
                        style={{ padding: "6px 14px", background: "#3B7EA1", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer", fontSize: "13px" }}
                      >
                        Reopen
                      </button>
                    )}
                    {conv.status !== "archived" && (
                      <button
                        onClick={() => handleAction(conv.id, "archive")}
                        disabled={actionLoading === conv.id}
                        style={{ padding: "6px 14px", background: "#6B7280", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer", fontSize: "13px" }}
                      >
                        Archive
                      </button>
                    )}
                    {conv.summary && (
                      <div style={{ flex: "1 1 100%", marginTop: "8px", padding: "8px 12px", background: "#fff", borderRadius: "6px", fontSize: "13px", color: "#555" }}>
                        <strong>Summary:</strong> {conv.summary}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: "20px" }}>
          <button
            disabled={pagination.page <= 1}
            onClick={() => fetchConversations(pagination.page - 1)}
            style={{ padding: "6px 14px", border: "1px solid #D6D0C4", borderRadius: "5px", cursor: pagination.page <= 1 ? "default" : "pointer", opacity: pagination.page <= 1 ? 0.5 : 1, background: "#fff", fontSize: "13px" }}
          >
            Prev
          </button>
          <span style={{ padding: "6px 14px", fontSize: "13px", color: "#666" }}>
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => fetchConversations(pagination.page + 1)}
            style={{ padding: "6px 14px", border: "1px solid #D6D0C4", borderRadius: "5px", cursor: pagination.page >= pagination.totalPages ? "default" : "pointer", opacity: pagination.page >= pagination.totalPages ? 0.5 : 1, background: "#fff", fontSize: "13px" }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
