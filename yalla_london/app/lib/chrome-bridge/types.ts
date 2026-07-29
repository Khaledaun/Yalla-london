/**
 * Claude Chrome Bridge — Shared types and Zod schemas.
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Audit pillars (from PLAYBOOK.md)
// ---------------------------------------------------------------------------

export const AUDIT_PILLARS = [
  "on_page",
  "technical",
  "aio",
  "ux",
  "offsite",
  "affiliate",
  "accessibility",
] as const;

export type AuditPillar = (typeof AUDIT_PILLARS)[number];

export const AUDIT_TYPES = [
  "per_page",
  "sitewide",
  "action_log_triage",
  "offsite",
] as const;

export type AuditType = (typeof AUDIT_TYPES)[number];

export const SEVERITY_LEVELS = ["info", "warning", "critical"] as const;
export type Severity = (typeof SEVERITY_LEVELS)[number];

// ---------------------------------------------------------------------------
// Finding / Action shapes
// ---------------------------------------------------------------------------

export const FindingSchema = z.object({
  pillar: z.enum(AUDIT_PILLARS),
  issue: z.string().min(3),
  severity: z.enum(SEVERITY_LEVELS).default("info"),
  evidence: z.string().optional(),
  metric: z
    .object({
      name: z.string(),
      value: z.union([z.string(), z.number()]).optional(),
      benchmark: z.union([z.string(), z.number()]).optional(),
    })
    .optional(),
});

export type Finding = z.infer<typeof FindingSchema>;

export const InterpretedActionSchema = z.object({
  action: z.string().min(3),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  affectedFiles: z.array(z.string()).optional(),
  relatedKG: z.string().optional(), // e.g., "KG-032"
  autoFixable: z.boolean().default(false),
  expectedImpact: z.string().optional(),
  estimatedEffort: z.enum(["trivial", "small", "medium", "large"]).optional(),
});

export type InterpretedAction = z.infer<typeof InterpretedActionSchema>;

// ---------------------------------------------------------------------------
// POST /report payload
// ---------------------------------------------------------------------------

export const ReportUploadSchema = z.object({
  siteId: z.string().min(1),
  pageUrl: z.string().url(),
  pageSlug: z.string().optional(),
  auditType: z.enum(AUDIT_TYPES).default("per_page"),
  severity: z.enum(SEVERITY_LEVELS).default("info"),
  findings: z.array(FindingSchema).min(1),
  interpretedActions: z.array(InterpretedActionSchema).default([]),
  rawData: z.record(z.unknown()).optional(),
  reportMarkdown: z.string().min(20),
});

export type ReportUpload = z.infer<typeof ReportUploadSchema>;

// ---------------------------------------------------------------------------
// POST /triage payload
// ---------------------------------------------------------------------------

export const TriageUploadSchema = z.object({
  siteId: z.string().optional(), // optional: triage can be cross-site
  periodHours: z.number().int().positive().max(168).default(24),
  severity: z.enum(SEVERITY_LEVELS).default("info"),
  findings: z.array(FindingSchema).min(1),
  interpretedActions: z.array(InterpretedActionSchema).default([]),
  rawData: z.record(z.unknown()).optional(),
  reportMarkdown: z.string().min(20),
});

export type TriageUpload = z.infer<typeof TriageUploadSchema>;

// ---------------------------------------------------------------------------
// Common response types
// ---------------------------------------------------------------------------

export interface BridgeError {
  error: string;
  details?: unknown;
}
