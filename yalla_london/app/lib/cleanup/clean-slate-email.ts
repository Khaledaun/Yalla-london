/**
 * Clean-Slate Email Renderer — composes the briefing-style HTML email
 * for the manifest (dry-run preview) and execution result.
 */

import type { CleanSlateManifest } from "./clean-slate-analyzer";
import type { ExecutionResult } from "./clean-slate-executor";

const ROW = (label: string, value: string | number, hint = "") =>
  `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee;color:#444">${label}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:600">${value}</td>${hint ? `<td style="padding:6px 12px;border-bottom:1px solid #eee;color:#888;font-size:13px">${hint}</td>` : ""}</tr>`;

export function renderManifestEmail(manifest: CleanSlateManifest): { subject: string; html: string } {
  const subject = `Clean-Slate dry run — ${manifest.siteId} (${manifest.summary.willUnpublish} unpublish, ${manifest.summary.willFix} fix, ${manifest.summary.willDelete} delete)`;

  const clusterRows = manifest.unpublish.duplicateClusters
    .slice(0, 30)
    .map(
      (c) =>
        `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee">
        <div style="font-weight:600">${escapeHtml(c.clusterTitle)}</div>
        <div style="color:#0a7e3f;font-size:13px;margin-top:4px">KEEP: <code>${escapeHtml(c.keep.slug)}</code> (seo ${c.keep.seoScore}, ${c.keep.wordCount}w)</div>
        ${c.drop
          .map(
            (d) =>
              `<div style="color:#b71c1c;font-size:13px;margin-left:12px">↓ DROP: <code>${escapeHtml(d.slug)}</code> → 301 to keeper</div>`,
          )
          .join("")}
      </td></tr>`,
    )
    .join("");

  const thinRows = manifest.unpublish.thinNoTraffic
    .slice(0, 20)
    .map(
      (t) =>
        `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee"><code>${escapeHtml(t.slug)}</code></td><td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right">${t.wordCount}w</td></tr>`,
    )
    .join("");

  const slugRows = manifest.unpublish.slugArtifacts
    .slice(0, 20)
    .map(
      (s) =>
        `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee"><code>${escapeHtml(s.slug)}</code></td><td style="padding:6px 12px;border-bottom:1px solid #eee;color:#0a7e3f">→ <code>${escapeHtml(s.cleanedSlug)}</code></td></tr>`,
    )
    .join("");

  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, sans-serif; max-width: 720px; margin: 0 auto; padding: 24px; color: #222; }
  h1 { color: #1a3a52; border-bottom: 3px solid #C49A2A; padding-bottom: 8px; margin-top: 32px; }
  h2 { color: #1a3a52; margin-top: 28px; border-bottom: 1px solid #eee; padding-bottom: 6px; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; }
  .summary-card { background: #f8f5f0; border-left: 4px solid #C49A2A; padding: 16px 20px; margin: 16px 0; border-radius: 4px; }
  .stat { display: inline-block; margin-right: 24px; }
  .stat-num { font-size: 28px; font-weight: 700; color: #1a3a52; display: block; }
  .stat-label { font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
  .danger { color: #b71c1c; }
  .safe { color: #0a7e3f; }
  .cta-box { background: #1a3a52; color: white; padding: 20px; border-radius: 6px; margin: 24px 0; text-align: center; }
  .cta-box a { color: #C49A2A; text-decoration: none; font-weight: 600; }
  code { background: #f3f3f3; padding: 2px 6px; border-radius: 3px; font-size: 13px; }
</style>
</head>
<body>

<h1>🧹 Clean-Slate Operation — Dry Run Preview</h1>

<div class="summary-card">
  <p style="margin:0 0 12px 0;color:#666">Site: <strong>${escapeHtml(manifest.siteId)}</strong> · Generated: ${new Date(manifest.generatedAt).toLocaleString()}</p>
  <div class="stat"><span class="stat-num safe">${manifest.summary.willKeep}</span><span class="stat-label">Keep</span></div>
  <div class="stat"><span class="stat-num danger">${manifest.summary.willUnpublish}</span><span class="stat-label">Unpublish</span></div>
  <div class="stat"><span class="stat-num">${manifest.summary.willFix}</span><span class="stat-label">Fix in place</span></div>
  <div class="stat"><span class="stat-num">${manifest.summary.willDelete}</span><span class="stat-label">Delete (stale data)</span></div>
</div>

<h2>Rules applied</h2>
<table>
  ${ROW("Duplicate Jaccard threshold", manifest.rules.duplicateJaccardThreshold, "Articles with ≥70% normalized title overlap = duplicates")}
  ${ROW("Thin content floor", `${manifest.rules.minWordsToKeep}w`, "Below this AND zero traffic → unpublish")}
  ${ROW("Protect: clicks (last 30d)", `≥ ${manifest.rules.minClicksToProtect}`, "Articles with any clicks are never touched")}
  ${ROW("Protect: impressions (last 30d)", `≥ ${manifest.rules.minImpressionsToProtect}`, "Articles with traction are never touched")}
  ${ROW("Protect: created within", `${manifest.rules.protectAgeDays} days`, "Recent articles get time to mature")}
</table>

<h2>Protected (will not touch)</h2>
<table>
  ${ROW("With traffic in last 30d", manifest.protect.withTraffic, "Has clicks or ≥50 impressions")}
  ${ROW("Created in last 7d", manifest.protect.recentlyCreated, "Maturing — left alone")}
</table>

<h2>Phase 1: Unpublish — Duplicate clusters (${manifest.unpublish.duplicateClusters.length})</h2>
<p style="color:#555">Each cluster keeps the highest-scoring article and 301-redirects losers via <code>canonical_slug</code>. SEO equity preserved.</p>
${manifest.unpublish.duplicateClusters.length > 0 ? `<table>${clusterRows}</table>` : '<p style="color:#888">No duplicate clusters detected.</p>'}
${manifest.unpublish.duplicateClusters.length > 30 ? `<p style="color:#888">+ ${manifest.unpublish.duplicateClusters.length - 30} more clusters (see JSON manifest for full list)</p>` : ""}

<h2>Phase 2: Unpublish — Thin content with no traffic (${manifest.unpublish.thinNoTraffic.length})</h2>
${manifest.unpublish.thinNoTraffic.length > 0 ? `<table>${thinRows}</table>` : '<p style="color:#888">No thin-no-traffic articles detected.</p>'}
${manifest.unpublish.thinNoTraffic.length > 20 ? `<p style="color:#888">+ ${manifest.unpublish.thinNoTraffic.length - 20} more (see JSON)</p>` : ""}

<h2>Phase 3: Unpublish — Slug artifacts (${manifest.unpublish.slugArtifacts.length})</h2>
<p style="color:#555">Slugs with <code>-v3</code>, hex hashes, or year tags. Canonical → cleaned slug if a clean version is published; otherwise just unpublish.</p>
${manifest.unpublish.slugArtifacts.length > 0 ? `<table>${slugRows}</table>` : '<p style="color:#888">No slug artifacts detected.</p>'}

<h2>Phase 4-5: In-place fixes</h2>
<table>
  ${ROW("Title artifacts", manifest.fix.titleArtifacts.length, "Strip '| Yalla London Guide' etc.")}
  ${ROW("Meta placeholders", manifest.fix.metaPlaceholders.length, "Strip [REDIRECTED:], [DUPLICATE-FLAGGED:]")}
</table>

<h2>Phase 6-7: Delete stale data + regenerate sitemap</h2>
<table>
  ${ROW("Rejected drafts", manifest.delete.rejectedDrafts.count, `> ${manifest.delete.rejectedDrafts.oldestDays}d old`)}
  ${ROW("Cron job logs", manifest.delete.cronJobLogs.count, `> ${manifest.delete.cronJobLogs.oldestDays}d old`)}
  ${ROW("AutoFix logs", manifest.delete.autoFixLogs.count, `> ${manifest.delete.autoFixLogs.oldestDays}d old`)}
  ${ROW("API usage logs", manifest.delete.apiUsageLogs.count, `> ${manifest.delete.apiUsageLogs.oldestDays}d old`)}
  ${ROW("Zombie running crons", manifest.delete.zombieRunningCrons.count, "> 1h running — mark as failed")}
  ${ROW("Stuck promoting drafts", manifest.delete.stuckPromotingDrafts.count, "Revert to reservoir")}
  ${ROW("Stuck generating topics", manifest.delete.stuckGeneratingTopics.count, "Reset to ready")}
  ${ROW("Orphaned URLIndexingStatus", manifest.delete.orphanedUrlIndexingStatus.count, "Slug no longer exists")}
</table>

<div class="cta-box">
  <p style="margin:0 0 8px 0">This was a DRY RUN. Nothing was changed.</p>
  <p style="margin:0">To execute, hit the cockpit Clean-Slate button OR<br>
  <code>POST /api/admin/clean-slate?confirm=true&siteId=${escapeHtml(manifest.siteId)}</code></p>
</div>

<p style="color:#888;font-size:13px;text-align:center;margin-top:32px">
Generated by clean-slate analyzer · Estimated execution time: ${Math.round(manifest.summary.estimatedExecutionMs / 1000)}s<br>
Nothing in this email has been applied to the site yet.
</p>

</body>
</html>`;

  return { subject, html };
}

export function renderResultEmail(result: ExecutionResult): { subject: string; html: string } {
  const totalApplied =
    result.applied.unpublishedDuplicates +
    result.applied.unpublishedThin +
    result.applied.unpublishedSlugArtifacts +
    result.applied.titlesFixed +
    result.applied.metasFixed;
  const totalDeleted =
    result.applied.rejectedDraftsDeleted +
    result.applied.cronJobLogsDeleted +
    result.applied.autoFixLogsDeleted +
    result.applied.apiUsageLogsDeleted +
    result.applied.orphanedUrlsDeleted;

  const subject = `Clean-Slate executed — ${result.siteId} (${totalApplied} applied, ${totalDeleted} deleted, ${result.errors.length} errors)`;

  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 720px; margin: 0 auto; padding: 24px; color: #222; }
  h1 { color: #1a3a52; border-bottom: 3px solid #C49A2A; padding-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; }
  .summary-card { background: #f0f7ed; border-left: 4px solid #0a7e3f; padding: 16px 20px; border-radius: 4px; }
  .error-card { background: #fdecea; border-left: 4px solid #b71c1c; padding: 16px 20px; border-radius: 4px; margin: 16px 0; }
  code { background: #f3f3f3; padding: 2px 6px; border-radius: 3px; font-size: 13px; }
</style>
</head>
<body>

<h1>✅ Clean-Slate Executed — ${escapeHtml(result.siteId)}</h1>

<div class="summary-card">
  <strong>Duration:</strong> ${(result.durationMs / 1000).toFixed(1)}s · ${new Date(result.startedAt).toLocaleString()} → ${new Date(result.completedAt).toLocaleString()}
</div>

<h2>Applied</h2>
<table>
  ${ROW("Duplicate clusters unpublished", result.applied.unpublishedDuplicates)}
  ${ROW("Thin articles unpublished", result.applied.unpublishedThin)}
  ${ROW("Slug artifacts unpublished", result.applied.unpublishedSlugArtifacts)}
  ${ROW("Titles fixed in place", result.applied.titlesFixed)}
  ${ROW("Meta placeholders fixed", result.applied.metasFixed)}
  ${ROW("Rejected drafts deleted", result.applied.rejectedDraftsDeleted)}
  ${ROW("Cron logs deleted", result.applied.cronJobLogsDeleted)}
  ${ROW("AutoFix logs deleted", result.applied.autoFixLogsDeleted)}
  ${ROW("API usage logs deleted", result.applied.apiUsageLogsDeleted)}
  ${ROW("Zombie crons resolved", result.applied.zombieCronsResolved)}
  ${ROW("Promoting drafts reverted", result.applied.promotingDraftsReverted)}
  ${ROW("Generating topics reset", result.applied.generatingTopicsReset)}
  ${ROW("Orphaned URLs deleted", result.applied.orphanedUrlsDeleted)}
</table>

<h2>Skipped</h2>
<table>
  ${ROW("Now protected (re-check)", result.skipped.nowProtected, "Gained traffic between manifest and execute")}
  ${ROW("Per-run cap hit", result.skipped.perRunCapHit, "Run again to continue")}
  ${ROW("Errors during execution", result.skipped.errors)}
</table>

${
  result.errors.length > 0
    ? `<div class="error-card">
  <strong>${result.errors.length} errors</strong>
  <ul>
    ${result.errors
      .slice(0, 10)
      .map(
        (e) =>
          `<li><code>${escapeHtml(e.phase)}</code> on <code>${escapeHtml(e.targetId)}</code>: ${escapeHtml(e.message)}</li>`,
      )
      .join("")}
    ${result.errors.length > 10 ? `<li>+ ${result.errors.length - 10} more (see /admin/cockpit AutoFixLog for full list)</li>` : ""}
  </ul>
</div>`
    : ""
}

<p style="color:#888;font-size:13px;text-align:center;margin-top:32px">
All changes logged to AutoFixLog with structured before/after snapshots.<br>
Inspect at /admin/cockpit · Trigger again from /admin/cockpit Clean-Slate button.
</p>

</body>
</html>`;

  return { subject, html };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
