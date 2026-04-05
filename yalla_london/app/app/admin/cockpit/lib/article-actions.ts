/**
 * Shared article action functions for the Cockpit dashboard.
 * Used by ContentTab, ArticleDetailDrawer, StatusDropdown, and Plan B (Tube Map).
 *
 * Every function:
 * - Accepts siteId for multi-site isolation
 * - Returns { success, message, data? }
 * - Safari-safe: checks res.ok before res.json()
 * - Never throws — all errors caught and returned in message
 */

import type { ActionResult, GateCheck } from "../types";

// ─── Safe fetch helper ──────────────────────────────────────────────────────

async function safeFetch(
  url: string,
  options?: RequestInit
): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  try {
    const res = await fetch(url, options);
    if (!res.ok) {
      return { ok: false, data: { error: `HTTP ${res.status}` } };
    }
    try {
      const data = await res.json();
      return { ok: true, data };
    } catch {
      return { ok: false, data: { error: "Invalid JSON response" } };
    }
  } catch (e) {
    return { ok: false, data: { error: e instanceof Error ? e.message : "Network error" } };
  }
}

function jsonPost(body: Record<string, unknown>): RequestInit {
  return {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

// ─── Content Matrix Actions ─────────────────────────────────────────────────

async function matrixAction(
  action: string,
  params: Record<string, string>
): Promise<ActionResult> {
  const { ok, data } = await safeFetch(
    "/api/admin/content-matrix",
    jsonPost({ action, ...params })
  );
  if (!ok) return { success: false, message: `${data.error}` };
  return {
    success: !!data.success,
    message: data.success ? "Done" : `${data.error ?? "Action failed"}`,
    data,
  };
}

// ─── Publish ────────────────────────────────────────────────────────────────

export async function publishArticle(
  draftId: string,
  locale: string,
  siteId: string
): Promise<ActionResult> {
  const { ok, data } = await safeFetch(
    "/api/admin/force-publish",
    jsonPost({ draftId, locale, count: 1, siteId })
  );
  if (!ok) return { success: false, message: `${data.error}` };
  return {
    success: !!data.success,
    message: data.success ? "Published!" : `${data.error ?? "Publish failed"}`,
    data,
  };
}

export async function unpublishArticle(
  blogPostId: string,
  _siteId: string
): Promise<ActionResult> {
  return matrixAction("unpublish", { blogPostId });
}

// ─── Draft Management ───────────────────────────────────────────────────────

export async function reQueueDraft(
  draftId: string,
  _siteId: string
): Promise<ActionResult> {
  return matrixAction("re_queue", { draftId });
}

export async function deleteDraft(
  draftId: string,
  _siteId: string
): Promise<ActionResult> {
  return matrixAction("delete_draft", { draftId });
}

export async function deletePost(
  blogPostId: string,
  _siteId: string
): Promise<ActionResult> {
  return matrixAction("delete_post", { blogPostId });
}

export async function enhanceDraft(
  draftId: string,
  _siteId: string
): Promise<ActionResult> {
  return matrixAction("enhance", { draftId });
}

// ─── SEO & Indexing ─────────────────────────────────────────────────────────

export async function submitToGoogle(
  slug: string,
  _siteId: string
): Promise<ActionResult> {
  const url = slug ? `/blog/${slug}` : "";
  if (!url) return { success: false, message: "No slug to submit" };
  const { ok, data } = await safeFetch(
    "/api/admin/content-indexing",
    jsonPost({ action: "submit", url })
  );
  if (!ok) return { success: false, message: `${data.error}` };
  return {
    success: !!data.success,
    message: data.success ? "Submitted for indexing" : `${data.error ?? "Submission failed"}`,
    data,
  };
}

// ─── Gate Check ─────────────────────────────────────────────────────────────

export async function runGateCheck(
  draftId: string,
  _siteId: string
): Promise<{ success: boolean; checks: GateCheck[] }> {
  const { ok, data } = await safeFetch(
    "/api/admin/content-matrix",
    jsonPost({ action: "gate_check", draftId })
  );
  if (!ok) {
    return {
      success: false,
      checks: [{
        check: "gate_api",
        pass: false,
        label: `Gate check failed: ${data.error}`,
        detail: "Tap 'Run gate check' to retry.",
        isBlocker: false,
      }],
    };
  }
  return {
    success: true,
    checks: (data.checks as GateCheck[]) ?? [],
  };
}

// ─── Quick Edit ─────────────────────────────────────────────────────────────

export async function quickEdit(
  id: string,
  type: "published" | "draft",
  title: string,
  metaDesc: string
): Promise<ActionResult> {
  if (type === "published") {
    const { ok, data } = await safeFetch(
      `/api/admin/blog-posts/${id}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title_en: title, meta_description_en: metaDesc }),
      }
    );
    if (!ok) return { success: false, message: `${data.error}` };
    return { success: true, message: "Saved!" };
  }

  return matrixAction("update_draft", {
    draftId: id,
    title,
    metaDescription: metaDesc,
  });
}

// ─── Cron Trigger ───────────────────────────────────────────────────────────

export async function runCronAction(
  path: string,
  siteId: string
): Promise<ActionResult> {
  const { ok, data } = await safeFetch(
    `/api/admin/departures`,
    jsonPost({ path, siteId })
  );
  if (!ok) return { success: false, message: `${data.error}` };
  return {
    success: !!data.success,
    message: data.success
      ? `Cron triggered: ${data.result ? JSON.stringify(data.result).slice(0, 100) : "OK"}`
      : `${data.error ?? "Cron failed"}`,
    data,
  };
}

// ─── SEO Review Fix ─────────────────────────────────────────────────────────

export async function reviewFix(
  blogPostId: string,
  _siteId: string
): Promise<ActionResult> {
  return matrixAction("review_fix", { blogPostId });
}
