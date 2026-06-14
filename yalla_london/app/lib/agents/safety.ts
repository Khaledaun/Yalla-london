/**
 * CEO + CTO Agent Platform — Safety & Guardrails Module
 *
 * Guards against: runaway spending, PII leakage, unauthorized deletions,
 * low-confidence auto-responses, and rate limit abuse.
 */

import type { SafetyConfig } from "./types";

// ---------------------------------------------------------------------------
// PII Regex Patterns
// ---------------------------------------------------------------------------

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_RE = /(\+?\d{1,4}[\s.-]?)?(\(?\d{2,4}\)?[\s.-]?)?\d{3,4}[\s.-]?\d{3,4}/g;
const CARD_RE = /\b(?:\d[ -]*?){13,19}\b/g;

// Tool ID substrings that indicate financial actions
const FINANCE_KEYWORDS = ["payment", "refund", "billing", "invoice", "charge", "payout", "finance"];
// Tool ID substrings that indicate destructive actions
const DELETE_KEYWORDS = ["delete", "remove", "destroy", "purge", "erase"];

// ---------------------------------------------------------------------------
// Tool Safety Check
// ---------------------------------------------------------------------------

export function checkToolSafety(
  toolId: string,
  params: Record<string, unknown>,
  config: SafetyConfig,
): { allowed: boolean; reason?: string; requiresApproval?: boolean } {
  const lowerToolId = toolId.toLowerCase();

  // Money guard: finance-related tools with amount exceeding threshold
  if (FINANCE_KEYWORDS.some((kw) => lowerToolId.includes(kw))) {
    const amount = typeof params.amount === "number" ? params.amount : 0;
    if (amount > config.moneyApprovalThresholdUsd) {
      return {
        allowed: true,
        requiresApproval: true,
        reason: `Financial action ($${amount}) exceeds $${config.moneyApprovalThresholdUsd} threshold`,
      };
    }
  }

  // Stage transition guard: won/lost require approval
  if (lowerToolId === "crm_update_stage") {
    const stage = typeof params.stage === "string" ? params.stage.toLowerCase() : "";
    if (config.notifyOnStageChanges.includes(stage as never)) {
      return {
        allowed: true,
        requiresApproval: true,
        reason: `Stage transition to "${stage}" requires approval`,
      };
    }
  }

  // Data deletion guard
  if (DELETE_KEYWORDS.some((kw) => lowerToolId.includes(kw))) {
    return {
      allowed: true,
      requiresApproval: true,
      reason: `Destructive action "${toolId}" requires approval`,
    };
  }

  return { allowed: true };
}

// ---------------------------------------------------------------------------
// PII Filter
// ---------------------------------------------------------------------------

export function filterPII(text: string): string {
  let result = text;
  result = result.replace(EMAIL_RE, "[EMAIL_REDACTED]");
  result = result.replace(CARD_RE, "[CARD_REDACTED]");
  // Phone regex is broad — only replace sequences that look like real phone numbers
  // (7+ digit sequences with optional country code)
  result = result.replace(PHONE_RE, (match) => {
    const digits = match.replace(/\D/g, "");
    return digits.length >= 7 ? "[PHONE_REDACTED]" : match;
  });
  return result;
}

// ---------------------------------------------------------------------------
// Confidence Check
// ---------------------------------------------------------------------------

export function checkConfidence(
  confidence: number,
  config: SafetyConfig,
): { shouldEscalate: boolean; reason?: string } {
  if (confidence < config.escalationConfidenceThreshold) {
    return {
      shouldEscalate: true,
      reason: `Confidence ${(confidence * 100).toFixed(0)}% is below ${(config.escalationConfidenceThreshold * 100).toFixed(0)}% threshold`,
    };
  }
  return { shouldEscalate: false };
}

// ---------------------------------------------------------------------------
// Rate Limiting
// ---------------------------------------------------------------------------

export function checkRateLimit(
  channel: string,
  direction: "inbound" | "outbound",
  counters: Map<string, number>,
  config: SafetyConfig,
): { allowed: boolean; reason?: string } {
  if (direction !== "outbound") {
    return { allowed: true };
  }

  // Per-channel daily outbound limit
  const dailyKey = `outbound:${channel}:daily`;
  const current = counters.get(dailyKey) || 0;
  if (current >= config.maxDailyMessagesPerChannel) {
    return {
      allowed: false,
      reason: `Daily outbound limit (${config.maxDailyMessagesPerChannel}) reached for channel "${channel}"`,
    };
  }

  // Per-hour AI call limit (global, not per-channel)
  const aiKey = "ai:calls:hourly";
  const aiCurrent = counters.get(aiKey) || 0;
  if (aiCurrent >= config.maxAICallsPerHour) {
    return {
      allowed: false,
      reason: `Hourly AI call limit (${config.maxAICallsPerHour}) reached`,
    };
  }

  // Increment counters
  counters.set(dailyKey, current + 1);
  counters.set(aiKey, aiCurrent + 1);

  return { allowed: true };
}

// ---------------------------------------------------------------------------
// Safe Context Builder
// ---------------------------------------------------------------------------

export function buildSafeContext(
  rawContent: string,
  contactName: string | null,
): string {
  let safe = filterPII(rawContent);

  // If we have a contact name, ensure only the first name appears
  if (contactName) {
    const firstName = contactName.split(/\s+/)[0];
    // Replace full name occurrences with first name only
    if (contactName.includes(" ")) {
      safe = safe.replace(new RegExp(escapeRegex(contactName), "gi"), firstName);
    }
  }

  return safe;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ---------------------------------------------------------------------------
// Audit Logger
// ---------------------------------------------------------------------------

export function auditLog(
  action: string,
  agentId: string,
  details: Record<string, unknown>,
): void {
  const entry = {
    timestamp: new Date().toISOString(),
    action,
    agentId,
    ...details,
  };
  console.info(`[agent-safety] ${JSON.stringify(entry)}`);
}
