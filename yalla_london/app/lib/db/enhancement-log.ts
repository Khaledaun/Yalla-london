/**
 * Enhancement log helpers for BlogPost post-publish modifications.
 *
 * Each cron that modifies published articles must:
 * 1. Check ENHANCEMENT_OWNERS to confirm it owns the modification type
 * 2. Call appendEnhancementLog() after each successful modification
 */

import { ENHANCEMENT_OWNERS } from "@/lib/content-pipeline/constants";

export type EnhancementType = keyof typeof ENHANCEMENT_OWNERS;

export interface EnhancementLogEntry {
  type: string;
  cron: string;
  timestamp: string;
  summary: string;
}

/**
 * Check if a cron job is allowed to make a specific enhancement type.
 */
export function isEnhancementOwner(cronName: string, enhancementType: string): boolean {
  const owner = ENHANCEMENT_OWNERS[enhancementType];
  if (!owner) return true; // Unknown types are unowned — allow
  return owner === cronName;
}

/**
 * Build the update data that appends an enhancement log entry to an existing log array.
 * Returns a Prisma-compatible JsonB value.
 */
export function buildEnhancementLogEntry(
  existingLog: unknown,
  type: string,
  cronName: string,
  summary: string
): EnhancementLogEntry[] {
  const entries: EnhancementLogEntry[] = Array.isArray(existingLog) ? [...existingLog] : [];
  entries.push({
    type,
    cron: cronName,
    timestamp: new Date().toISOString(),
    summary,
  });
  // Keep last 50 entries to prevent unbounded growth
  return entries.slice(-50);
}
