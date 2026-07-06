/**
 * Approval queue API.
 *
 * GET /api/admin/agent/approvals?siteId=&limit=
 *   Returns the list of AgentTask rows with status="needs_approval".
 *
 * POST /api/admin/agent/approvals
 *   { action: "approve" | "reject", taskId: string, reason?: string }
 *
 *   approve → flips status to "approved" so a worker picks it up; the tool
 *             does NOT auto-execute here. (Cockpit can wire a "run-now"
 *             button separately if needed; defaulting to deferred-execute
 *             keeps the API safe for one-tap-from-iPhone use.)
 *   reject  → flips status to "rejected" with a reason, completes the task.
 *
 * Admin-only.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";
import {
  listPendingApprovals,
  approvePendingApproval,
  rejectPendingApproval,
} from "@/lib/agents/task-helpers";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const siteId = request.nextUrl.searchParams.get("siteId") || undefined;
  const limitRaw = request.nextUrl.searchParams.get("limit");
  const limit = limitRaw ? Math.min(200, Math.max(1, parseInt(limitRaw, 10) || 50)) : 50;

  try {
    const approvals = await listPendingApprovals({ siteId, limit });
    return NextResponse.json({ ok: true, approvals, count: approvals.length });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const body = (await request.json().catch(() => ({}))) as {
    action?: string;
    taskId?: string;
    reason?: string;
  };

  if (!body.taskId) {
    return NextResponse.json({ ok: false, error: "taskId required" }, { status: 400 });
  }
  if (body.action !== "approve" && body.action !== "reject") {
    return NextResponse.json(
      { ok: false, error: "action must be 'approve' or 'reject'" },
      { status: 400 },
    );
  }

  // Identify the reviewer for the audit trail. Falls back to "admin" if we
  // can't extract the session principal — the requireAdmin gate already
  // confirmed admin identity, this is just attribution.
  const reviewer =
    request.headers.get("x-admin-email") ||
    request.cookies.get("admin-email")?.value ||
    "admin";

  if (body.action === "approve") {
    const result = await approvePendingApproval(body.taskId, reviewer);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  }

  const result = await rejectPendingApproval(body.taskId, reviewer, body.reason);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
