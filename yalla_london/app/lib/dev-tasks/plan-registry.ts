/**
 * Development Plan Registry
 *
 * Structured TypeScript plan definitions for the Development Monitor.
 * Plans are code — no markdown parsing needed.
 * Each task maps to a testType in live-tests.ts for real, visible test outcomes.
 */

export interface DevPlanTask {
  id: string;           // "A.1.1"
  phase: string;        // "A.1 Revenue Visibility"
  phaseOrder: number;   // 1
  taskOrder: number;    // 1
  taskTotal: number;    // tasks in this phase
  title: string;
  description: string;
  testType: string;     // maps to live test function in live-tests.ts
  testable: boolean;    // false = test button grayed out
  status: "done" | "todo" | "in-progress";
  readiness: number;    // 0-100
  dueDate: string;      // ISO date
  startDate: string;
  category: string;     // DevTask category field
  dependsOn?: string[]; // task IDs that must complete first
}

export interface DevPlan {
  id: string;           // "stage-a"
  project: string;      // "general / march26"
  title: string;        // "Stage A: Infrastructure Completion"
  tasks: DevPlanTask[];
}

// ── Stage A: Infrastructure Completion ─────────────────────────────────────────

export const STAGE_A_PLAN: DevPlan = {
  id: "stage-a",
  project: "general / march26",
  title: "Stage A: Infrastructure Completion",
  tasks: [
    // ── Phase A.1: Revenue Visibility (4 tasks) ──────────────────────────────
    {
      id: "A.1.1",
      phase: "A.1 Revenue Visibility",
      phaseOrder: 1,
      taskOrder: 1,
      taskTotal: 4,
      title: "GA4 Dashboard Wiring",
      description: "Connect GA4 Data API to cockpit so traffic numbers are real (not 0s). MCP server works, cockpit needs wiring.",
      testType: "ga4-live-pull",
      testable: true,
      status: "done",
      readiness: 100,
      dueDate: "2026-03-11",
      startDate: "2026-03-11",
      category: "config",
    },
    {
      id: "A.1.2",
      phase: "A.1 Revenue Visibility",
      phaseOrder: 1,
      taskOrder: 2,
      taskTotal: 4,
      title: "Affiliate Click Tracking",
      description: "Server-side redirect tracking via CjClickEvent + SID tracking in CTA blocks.",
      testType: "affiliate-click-verify",
      testable: true,
      status: "done",
      readiness: 100,
      dueDate: "2026-03-04",
      startDate: "2026-03-04",
      category: "pipeline",
    },
    {
      id: "A.1.3",
      phase: "A.1 Revenue Visibility",
      phaseOrder: 1,
      taskOrder: 3,
      taskTotal: 4,
      title: "Per-Site OG Images",
      description: "Dynamic OG image generator at /api/og using Next.js ImageResponse with per-site brand colors.",
      testType: "og-image-render",
      testable: true,
      status: "done",
      readiness: 100,
      dueDate: "2026-03-04",
      startDate: "2026-03-04",
      category: "content",
    },
    {
      id: "A.1.4",
      phase: "A.1 Revenue Visibility",
      phaseOrder: 1,
      taskOrder: 4,
      taskTotal: 4,
      title: "Login Rate Limiting",
      description: "5 attempts/15min with progressive delays. Middleware adds 5 req/15min on auth routes. 429 with Retry-After.",
      testType: "login-rate-limit-verify",
      testable: true,
      status: "done",
      readiness: 100,
      dueDate: "2026-03-04",
      startDate: "2026-03-04",
      category: "config",
    },

    // ── Phase A.2: Multi-Site Hardening (4 tasks) ────────────────────────────
    {
      id: "A.2.1",
      phase: "A.2 Multi-Site Hardening",
      phaseOrder: 2,
      taskOrder: 1,
      taskTotal: 4,
      title: "CJ Schema Migration",
      description: "Add siteId to CJ models (CjCommission, CjClickEvent, CjOffer) so revenue data doesn't leak between sites.",
      testType: "cj-schema-check",
      testable: true,
      status: "todo",
      readiness: 0,
      dueDate: "2026-03-18",
      startDate: "2026-03-11",
      category: "pipeline",
    },
    {
      id: "A.2.2",
      phase: "A.2 Multi-Site Hardening",
      phaseOrder: 2,
      taskOrder: 2,
      taskTotal: 4,
      title: "Arabic SSR",
      description: "Server-render Arabic HTML at /ar/ routes so Google indexes Arabic content properly. Currently returns English HTML.",
      testType: "arabic-ssr-check",
      testable: true,
      status: "todo",
      readiness: 0,
      dueDate: "2026-03-20",
      startDate: "2026-03-11",
      category: "seo",
    },
    {
      id: "A.2.3",
      phase: "A.2 Multi-Site Hardening",
      phaseOrder: 2,
      taskOrder: 3,
      taskTotal: 4,
      title: "Feature Flags Runtime Wiring",
      description: "lib/feature-flags.ts with isFeatureFlagEnabled() + 60s cache. lib/cron-feature-guard.ts maps 32+ crons.",
      testType: "feature-flags-verify",
      testable: true,
      status: "done",
      readiness: 100,
      dueDate: "2026-03-04",
      startDate: "2026-03-04",
      category: "config",
    },
    {
      id: "A.2.4",
      phase: "A.2 Multi-Site Hardening",
      phaseOrder: 2,
      taskOrder: 4,
      taskTotal: 4,
      title: "Brand Templates for Non-London Sites",
      description: "Ensure brand-kit-generator produces correct output for all 5 sites. Test getBrandProfile() for each siteId.",
      testType: "brand-kit-test",
      testable: true,
      status: "todo",
      readiness: 0,
      dueDate: "2026-03-22",
      startDate: "2026-03-11",
      category: "content",
    },

    // ── Phase A.3: Compliance & Social (4 tasks) ─────────────────────────────
    {
      id: "A.3.1",
      phase: "A.3 Compliance & Social",
      phaseOrder: 3,
      taskOrder: 1,
      taskTotal: 4,
      title: "Cookie Consent Banner",
      description: "Bilingual EN/AR cookie consent banner with 4 categories, localStorage-persisted, auto-applied on load.",
      testType: "cookie-consent-verify",
      testable: true,
      status: "done",
      readiness: 100,
      dueDate: "2026-03-04",
      startDate: "2026-03-04",
      category: "config",
    },
    {
      id: "A.3.2",
      phase: "A.3 Compliance & Social",
      phaseOrder: 3,
      taskOrder: 2,
      taskTotal: 4,
      title: "GDPR Data Deletion",
      description: "Public endpoint to delete user data (EmailSubscriber, CharterInquiry, CjClickEvent by email). Logs to AuditLog.",
      testType: "gdpr-endpoint-test",
      testable: true,
      status: "todo",
      readiness: 0,
      dueDate: "2026-03-25",
      startDate: "2026-03-11",
      category: "config",
    },
    {
      id: "A.3.3",
      phase: "A.3 Compliance & Social",
      phaseOrder: 3,
      taskOrder: 3,
      taskTotal: 4,
      title: "Twitter/X Auto-Publish",
      description: "Wire Twitter API v2 so social cron publishes posts automatically. Needs API keys in Vercel.",
      testType: "twitter-api-verify",
      testable: true,
      status: "todo",
      readiness: 0,
      dueDate: "2026-03-25",
      startDate: "2026-03-11",
      category: "config",
    },
    {
      id: "A.3.4",
      phase: "A.3 Compliance & Social",
      phaseOrder: 3,
      taskOrder: 4,
      taskTotal: 4,
      title: "SendGrid Integration",
      description: "Wire email campaigns to actually send via SendGrid. Sender supports SMTP/Resend/SendGrid, just needs keys.",
      testType: "email-send-test",
      testable: true,
      status: "todo",
      readiness: 0,
      dueDate: "2026-03-25",
      startDate: "2026-03-11",
      category: "config",
    },

    // ── Phase A.4: Cleanup (3 tasks) ─────────────────────────────────────────
    {
      id: "A.4.1",
      phase: "A.4 Cleanup",
      phaseOrder: 4,
      taskOrder: 1,
      taskTotal: 3,
      title: "Orphan Prisma Models Audit",
      description: "Remove unused Prisma models with 0 references outside schema.prisma. Preserve models used by DB, APIs, admin, crons.",
      testType: "prisma-orphan-scan",
      testable: true,
      status: "todo",
      readiness: 0,
      dueDate: "2026-03-28",
      startDate: "2026-03-11",
      category: "config",
    },
    {
      id: "A.4.2",
      phase: "A.4 Cleanup",
      phaseOrder: 4,
      taskOrder: 2,
      taskTotal: 3,
      title: "Dead Admin Buttons",
      description: "Find and wire all non-functional buttons in admin pages. Grep for TODO, onClick={() => {}}, disabled.",
      testType: "dead-buttons-scan",
      testable: true,
      status: "todo",
      readiness: 0,
      dueDate: "2026-03-28",
      startDate: "2026-03-11",
      category: "content",
    },
    {
      id: "A.4.3",
      phase: "A.4 Cleanup",
      phaseOrder: 4,
      taskOrder: 3,
      taskTotal: 3,
      title: "Test Suite Expansion",
      description: "Expand smoke tests to 120+ tests across 20+ categories covering all new features.",
      testType: "smoke-test-run",
      testable: true,
      status: "todo",
      readiness: 0,
      dueDate: "2026-03-28",
      startDate: "2026-03-11",
      category: "config",
    },
  ],
};

// ── Registry Functions ─────────────────────────────────────────────────────────

const ALL_PLANS: DevPlan[] = [STAGE_A_PLAN];

export function getAllPlans(): DevPlan[] {
  return ALL_PLANS;
}

export function getPlan(planId: string): DevPlan | undefined {
  return ALL_PLANS.find((p) => p.id === planId);
}

export function getPlanTasks(planId: string): DevPlanTask[] {
  return getPlan(planId)?.tasks || [];
}

export function getPhases(planId: string): { name: string; order: number; tasks: DevPlanTask[] }[] {
  const plan = getPlan(planId);
  if (!plan) return [];

  const phaseMap = new Map<string, { name: string; order: number; tasks: DevPlanTask[] }>();
  for (const task of plan.tasks) {
    if (!phaseMap.has(task.phase)) {
      phaseMap.set(task.phase, { name: task.phase, order: task.phaseOrder, tasks: [] });
    }
    phaseMap.get(task.phase)!.tasks.push(task);
  }

  return Array.from(phaseMap.values()).sort((a, b) => a.order - b.order);
}

export function computePhaseReadiness(tasks: DevPlanTask[]): number {
  if (tasks.length === 0) return 0;
  return Math.round(tasks.reduce((sum, t) => sum + t.readiness, 0) / tasks.length);
}

export function computeProjectReadiness(plan: DevPlan): number {
  if (plan.tasks.length === 0) return 0;
  return Math.round(plan.tasks.reduce((sum, t) => sum + t.readiness, 0) / plan.tasks.length);
}
