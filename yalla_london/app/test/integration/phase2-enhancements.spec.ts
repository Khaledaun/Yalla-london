/**
 * Tests for Phase 2 audit enhancements:
 * - Admin breadcrumbs hook
 * - Session timeout configuration
 * - Email notification handler
 * - Bulk content operations
 * - Social media design presets
 * - Audit log viewer
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

const read = (path: string) =>
  readFileSync(`/home/user/Yalla-london/yalla_london/app/${path}`, "utf-8");

// ---------------------------------------------------------------------------
// 1. Admin breadcrumbs hook
// ---------------------------------------------------------------------------
describe("useAdminBreadcrumbs hook", () => {
  const src = read("lib/use-admin-breadcrumbs.ts");

  it("exports useAdminBreadcrumbs function", () => {
    expect(src).toContain("export function useAdminBreadcrumbs");
  });

  it("exports Breadcrumb interface", () => {
    expect(src).toContain("export interface Breadcrumb");
  });

  it("uses usePathname from next/navigation", () => {
    expect(src).toContain("usePathname");
    expect(src).toContain("next/navigation");
  });

  it("maps all main navigation sections", () => {
    const sections = [
      "Dashboard",
      "Content",
      "Media",
      "SEO & Marketing",
      "AI & Automation",
      "Design & Media",
      "Settings",
    ];
    for (const section of sections) {
      expect(src).toContain(section);
    }
  });

  it("starts breadcrumbs with Admin root", () => {
    expect(src).toContain("label: 'Admin'");
    expect(src).toContain("href: '/admin'");
  });

  it("has fallback for unknown paths", () => {
    // Should generate breadcrumbs from URL segments for unknown paths
    expect(src).toMatch(/fallback|segment|unknown/i);
  });
});

// ---------------------------------------------------------------------------
// 2. Session timeout configuration
// ---------------------------------------------------------------------------
describe("Session timeout configuration", () => {
  const src = read("lib/auth.ts");

  it("uses configurable session maxAge from env", () => {
    expect(src).toContain("SESSION_MAX_AGE_SECONDS");
  });

  it("defaults to 8 hours (28800 seconds)", () => {
    expect(src).toContain("28800");
  });

  it("has updateAge for session refresh", () => {
    expect(src).toContain("updateAge");
  });
});

// ---------------------------------------------------------------------------
// 3. Email notification handler
// ---------------------------------------------------------------------------
describe("Email notification handler", () => {
  const src = read("lib/email-notifications.ts");

  it("exports processSubscriberNotifications", () => {
    expect(src).toContain("export async function processSubscriberNotifications");
  });

  it("exports sendEmail", () => {
    expect(src).toContain("export async function sendEmail");
  });

  it("exports buildNotificationEmail", () => {
    expect(src).toContain("export function buildNotificationEmail");
  });

  it("supports resend provider", () => {
    expect(src).toContain("resend");
    expect(src).toContain("RESEND_API_KEY");
    expect(src).toContain("api.resend.com");
  });

  it("supports sendgrid provider", () => {
    expect(src).toContain("sendgrid");
    expect(src).toContain("SENDGRID_API_KEY");
  });

  it("supports smtp provider", () => {
    expect(src).toContain("smtp");
    expect(src).toContain("SMTP_HOST");
    expect(src).toContain("nodemailer");
  });

  it("queries pending subscriber_notification jobs", () => {
    expect(src).toContain("subscriber_notification");
    expect(src).toContain("pending");
  });

  it("updates job status after processing", () => {
    expect(src).toContain("completed");
    expect(src).toContain("failed");
  });

  it("escapes HTML in notification emails", () => {
    expect(src).toContain("escapeHtml");
  });

  it("builds responsive HTML email", () => {
    expect(src).toContain("<!DOCTYPE html");
    expect(src).toContain("unsubscribe");
  });
});

// ---------------------------------------------------------------------------
// 4. Bulk content operations
// ---------------------------------------------------------------------------
describe("Bulk content API", () => {
  const src = read("app/api/admin/content/bulk/route.ts");

  it("exports PUT handler with withAdminAuth", () => {
    expect(src).toContain("export const PUT");
    expect(src).toContain("withAdminAuth");
  });

  it("supports all bulk actions", () => {
    const actions = [
      "publish",
      "unpublish",
      "delete",
      "addTag",
      "removeTag",
      "setCategory",
    ];
    for (const action of actions) {
      expect(src).toContain(`'${action}'`);
    }
  });

  it("validates max 100 items", () => {
    expect(src).toContain("100");
  });

  it("uses soft delete for bulk delete", () => {
    expect(src).toContain("deletedAt");
  });

  it("logs bulk actions to AuditLog", () => {
    expect(src).toContain("auditLog");
    expect(src).toContain("bulk_");
  });

  it("uses zod validation", () => {
    expect(src).toContain("zod");
    expect(src).toContain("safeParse");
  });

  it("validates category exists for setCategory", () => {
    expect(src).toContain("category");
    expect(src).toContain("findUnique");
  });
});

// ---------------------------------------------------------------------------
// 5. Social media design presets
// ---------------------------------------------------------------------------
describe("Design Studio social media presets", () => {
  const src = read("components/design-studio/design-canvas.tsx");

  it("includes all social media formats", () => {
    const formats = [
      "instagram-post",
      "instagram-story",
      "instagram-reel",
      "facebook-post",
      "facebook-cover",
      "twitter-post",
      "twitter-header",
      "linkedin-post",
      "linkedin-cover",
      "tiktok-video",
      "youtube-thumbnail",
      "pinterest-pin",
      "og-image",
    ];
    for (const format of formats) {
      expect(src).toContain(`"${format}"`);
    }
  });

  it("retains original print formats", () => {
    expect(src).toContain("A4");
    expect(src).toContain("A5");
    expect(src).toContain("letter");
    expect(src).toContain("square");
    expect(src).toContain("landscape");
  });

  it("uses correct Instagram post dimensions (1080x1080)", () => {
    expect(src).toMatch(/instagram-post.*1080.*1080/s);
  });

  it("uses correct YouTube thumbnail dimensions (1280x720)", () => {
    expect(src).toMatch(/youtube-thumbnail.*1280.*720/s);
  });

  it("uses correct OG image dimensions (1200x630)", () => {
    expect(src).toMatch(/og-image.*1200.*630/s);
  });
});

// ---------------------------------------------------------------------------
// 6. Audit log viewer
// ---------------------------------------------------------------------------
describe("Audit log viewer", () => {
  it("API route exists with GET handler", () => {
    const src = read("app/api/admin/audit-logs/route.ts");
    expect(src).toContain("export const GET");
    expect(src).toContain("auditLog");
    expect(src).toContain("page");
    expect(src).toContain("limit");
  });

  it("API supports filtering by action, resource, dates", () => {
    const src = read("app/api/admin/audit-logs/route.ts");
    expect(src).toContain("action");
    expect(src).toContain("resource");
    expect(src).toContain("startDate");
    expect(src).toContain("endDate");
  });

  it("admin page exists with breadcrumbs", () => {
    const src = read("app/admin/audit-logs/page.tsx");
    expect(src).toContain("use client");
    expect(src).toContain("PageHeader");
    expect(src).toContain("Audit Logs");
    expect(src).toContain("breadcrumbs");
  });

  it("admin page has pagination controls", () => {
    const src = read("app/admin/audit-logs/page.tsx");
    expect(src).toContain("Previous");
    expect(src).toContain("Next");
    expect(src).toContain("setPage");
  });
});
