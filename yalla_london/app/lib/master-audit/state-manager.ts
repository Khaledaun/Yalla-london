/**
 * Master Audit Engine — State Manager
 *
 * Manages audit run state for batch resume support.
 * State is persisted to docs/master-audit/<runId>/state.json.
 *
 * On resume:
 * - Completed batches are skipped
 * - Processing continues from the last incomplete batch
 * - Issues accumulated so far are preserved
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import type { AuditState, AuditMode, BatchState } from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function getStateDir(outputDir: string, runId: string): string {
  return path.resolve(process.cwd(), outputDir, runId);
}

function getStatePath(outputDir: string, runId: string): string {
  return path.join(getStateDir(outputDir, runId), 'state.json');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a unique run ID.
 * Format: <siteId>-<YYYYMMDD>-<HHMMSS>-<4hex>
 */
export function generateRunId(siteId: string): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const time = now.toISOString().slice(11, 19).replace(/:/g, '');
  const hex = crypto.randomBytes(2).toString('hex');
  return `${siteId}-${date}-${time}-${hex}`;
}

/**
 * Create a fresh audit state.
 */
export function createState(
  runId: string,
  siteId: string,
  mode: AuditMode,
  baseUrl: string,
  urls: string[],
  batchSize: number,
  outputDir: string
): AuditState {
  // Build batch definitions
  const batches: BatchState[] = [];
  for (let i = 0; i < urls.length; i += batchSize) {
    const batchUrls = urls.slice(i, i + batchSize);
    batches.push({
      batchIndex: batches.length,
      urls: batchUrls,
      status: 'pending',
      startTime: null,
      endTime: null,
    });
  }

  const state: AuditState = {
    runId,
    siteId,
    mode,
    status: 'running',
    baseUrl,
    progress: {
      totalUrls: urls.length,
      processedUrls: 0,
      percentComplete: 0,
    },
    batches,
    completedBatchIndices: [],
    issueCount: 0,
    errors: [],
    startTime: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
  };

  // Persist initial state
  const stateDir = getStateDir(outputDir, runId);
  ensureDir(stateDir);
  const statePath = getStatePath(outputDir, runId);
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf-8');

  return state;
}

/**
 * Save current state to disk.
 */
export function saveState(state: AuditState, outputDir: string): void {
  state.lastUpdated = new Date().toISOString();

  // Recalculate progress
  const processedUrls = state.batches
    .filter((b) => b.status === 'completed')
    .reduce((sum, b) => sum + b.urls.length, 0);
  state.progress.processedUrls = processedUrls;
  state.progress.percentComplete =
    state.progress.totalUrls > 0
      ? Math.round((processedUrls / state.progress.totalUrls) * 100)
      : 0;

  const stateDir = getStateDir(outputDir, state.runId);
  ensureDir(stateDir);
  const statePath = getStatePath(outputDir, state.runId);
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf-8');
}

/**
 * Load state from disk for resume.
 * Returns null if state file does not exist.
 */
export function loadState(
  outputDir: string,
  runId: string
): AuditState | null {
  const statePath = getStatePath(outputDir, runId);
  if (!fs.existsSync(statePath)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(statePath, 'utf-8');
    return JSON.parse(raw) as AuditState;
  } catch (err) {
    console.warn(
      `[master-audit/state-manager] Failed to load state from ${statePath}: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
    return null;
  }
}

/**
 * Check whether all batches are completed.
 */
export function isComplete(state: AuditState): boolean {
  return state.batches.every((b) => b.status === 'completed');
}

/**
 * Mark a batch as started.
 */
export function markBatchStarted(
  state: AuditState,
  batchIndex: number
): void {
  const batch = state.batches[batchIndex];
  if (batch) {
    batch.status = 'pending'; // still in-progress
    batch.startTime = new Date().toISOString();
  }
}

/**
 * Mark a batch as completed.
 */
export function markBatchCompleted(
  state: AuditState,
  batchIndex: number,
  issuesFound: number
): void {
  const batch = state.batches[batchIndex];
  if (batch) {
    batch.status = 'completed';
    batch.endTime = new Date().toISOString();
    if (!state.completedBatchIndices.includes(batchIndex)) {
      state.completedBatchIndices.push(batchIndex);
    }
    state.issueCount += issuesFound;
  }
}

/**
 * Mark a batch as failed.
 */
export function markBatchFailed(
  state: AuditState,
  batchIndex: number,
  errorMessage: string
): void {
  const batch = state.batches[batchIndex];
  if (batch) {
    batch.status = 'failed';
    batch.endTime = new Date().toISOString();
    state.errors.push({
      timestamp: new Date().toISOString(),
      message: `Batch ${batchIndex} failed: ${errorMessage}`,
    });
  }
}

/**
 * Record a per-URL error in the state.
 */
export function recordError(
  state: AuditState,
  message: string,
  url?: string
): void {
  state.errors.push({
    timestamp: new Date().toISOString(),
    message,
    url,
  });
}

/**
 * Get indices of batches that still need processing (not completed).
 */
export function getPendingBatchIndices(state: AuditState): number[] {
  return state.batches
    .filter((b) => b.status !== 'completed')
    .map((b) => b.batchIndex);
}

/**
 * Find the most recent run ID for a site by scanning the output directory.
 * Returns null if no previous runs exist.
 */
export function findLatestRunId(
  outputDir: string,
  siteId: string
): string | null {
  const baseDir = path.resolve(process.cwd(), outputDir);
  if (!fs.existsSync(baseDir)) {
    return null;
  }

  const entries = fs.readdirSync(baseDir, { withFileTypes: true });
  const matchingDirs = entries
    .filter((e) => e.isDirectory() && e.name.startsWith(`${siteId}-`))
    .map((e) => e.name)
    .sort()
    .reverse();

  return matchingDirs.length > 0 ? matchingDirs[0] : null;
}
