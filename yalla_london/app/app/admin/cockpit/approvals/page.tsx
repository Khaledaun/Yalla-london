"use client";

/**
 * Approval Queue — pending agent actions waiting for human review.
 *
 * Backs the CEO Agent's `safety.ts` `requireApproval` gate. Each time the
 * agent tries to run a tool flagged as money-spending, deletion, or stage-
 * changing, it persists an AgentTask row with status="needs_approval".
 * This page lists them so Khaled can approve / reject from his phone.
 *
 * iPhone-first: stacks cards on mobile, table layout >= md.
 */

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface PendingApproval {
  id: string;
  agentType: string;
  taskType: string;
  tool: string;
  params: Record<string, unknown>;
  description: string;
  priority: string;
  siteId: string | null;
  conversationId: string | null;
  createdAt: string;
  ageMinutes: number;
}

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actioning, setActioning] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<{ id: string; text: string; ok: boolean } | null>(null);

  const fetchApprovals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/agent/approvals?limit=100");
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Unknown error");
      setApprovals(json.approvals);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApprovals();
    const interval = setInterval(fetchApprovals, 60_000);
    return () => clearInterval(interval);
  }, [fetchApprovals]);

  const handleAction = useCallback(
    async (id: string, action: "approve" | "reject", reason?: string) => {
      setActioning(id);
      setActionResult(null);
      try {
        const res = await fetch("/api/admin/agent/approvals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskId: id, action, reason }),
        });
        const json = await res.json();
        if (!res.ok || !json.ok) {
          throw new Error(json.error || `HTTP ${res.status}`);
        }
        setActionResult({
          id,
          text: action === "approve" ? "Approved — agent will execute on next run" : "Rejected",
          ok: true,
        });
        // Optimistically remove from list
        setApprovals((prev) => prev.filter((a) => a.id !== id));
      } catch (err) {
        setActionResult({
          id,
          text: err instanceof Error ? err.message : String(err),
          ok: false,
        });
      } finally {
        setActioning(null);
      }
    },
    [],
  );

  const priorityColor = (p: string) => {
    switch (p) {
      case "critical":
        return "bg-red-100 text-red-800 border-red-300";
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-300";
      case "medium":
        return "bg-yellow-50 text-yellow-800 border-yellow-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F4] p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link
              href="/admin/cockpit"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              ← Cockpit
            </Link>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-gray-900 mt-2">
              Approval Queue
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              {approvals.length} action{approvals.length === 1 ? "" : "s"} waiting for review
            </p>
          </div>
          <button
            onClick={fetchApprovals}
            disabled={loading}
            className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            {loading ? "…" : "Refresh"}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4 mb-4">
            <strong>Error:</strong> {error}
          </div>
        )}

        {!loading && approvals.length === 0 && !error && (
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-gray-600">
            <div className="text-4xl mb-3">✅</div>
            <p className="font-medium">Nothing waiting</p>
            <p className="text-sm mt-1">The agent has no actions queued for approval.</p>
          </div>
        )}

        <div className="space-y-3">
          {approvals.map((a) => (
            <div
              key={a.id}
              className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span
                      className={`text-xs px-2 py-0.5 rounded border font-medium ${priorityColor(a.priority)}`}
                    >
                      {a.priority.toUpperCase()}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded border bg-blue-50 text-blue-800 border-blue-300 font-medium">
                      {a.agentType.toUpperCase()}
                    </span>
                    {a.siteId && (
                      <span className="text-xs px-2 py-0.5 rounded border bg-gray-50 text-gray-700 border-gray-300 font-mono">
                        {a.siteId}
                      </span>
                    )}
                    <span className="text-xs text-gray-500">{a.ageMinutes}m ago</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">
                    <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                      {a.tool}
                    </span>
                  </p>
                  <p className="text-sm text-gray-700 mt-1">{a.description}</p>
                </div>
              </div>

              {Object.keys(a.params).length > 0 && (
                <details className="text-xs text-gray-600 mt-2 mb-3">
                  <summary className="cursor-pointer hover:text-gray-900">
                    Parameters ({Object.keys(a.params).length})
                  </summary>
                  <pre className="bg-gray-50 border border-gray-200 rounded p-2 mt-1 overflow-x-auto text-[10px] leading-tight">
                    {JSON.stringify(a.params, null, 2)}
                  </pre>
                </details>
              )}

              {actionResult?.id === a.id && (
                <div
                  className={`text-xs p-2 rounded mb-2 ${
                    actionResult.ok
                      ? "bg-green-50 text-green-800 border border-green-200"
                      : "bg-red-50 text-red-800 border border-red-200"
                  }`}
                >
                  {actionResult.text}
                </div>
              )}

              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => handleAction(a.id, "approve")}
                  disabled={actioning === a.id}
                  className="flex-1 py-2 px-3 text-sm font-medium bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {actioning === a.id ? "…" : "Approve"}
                </button>
                <button
                  onClick={() => {
                    const reason = prompt("Reject reason (optional):") || undefined;
                    handleAction(a.id, "reject", reason);
                  }}
                  disabled={actioning === a.id}
                  className="flex-1 py-2 px-3 text-sm font-medium bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
