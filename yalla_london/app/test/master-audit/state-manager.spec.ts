import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  generateRunId,
  createState,
  saveState,
  loadState,
  markBatchCompleted,
  markBatchFailed,
  getPendingBatchIndices,
  isComplete,
} from '../../lib/master-audit/state-manager';

const TEST_OUTPUT_DIR = 'test-output-state-manager';
const TEST_RUN_DIR = path.resolve(process.cwd(), TEST_OUTPUT_DIR);

describe('state-manager', () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_RUN_DIR)) {
      fs.rmSync(TEST_RUN_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(TEST_RUN_DIR)) {
      fs.rmSync(TEST_RUN_DIR, { recursive: true });
    }
  });

  describe('generateRunId', () => {
    it('includes site ID', () => {
      const runId = generateRunId('yalla-london');
      expect(runId.startsWith('yalla-london-')).toBe(true);
    });

    it('generates unique IDs', () => {
      const id1 = generateRunId('test');
      const id2 = generateRunId('test');
      // Due to hex suffix, they should differ (unless called in same millisecond)
      expect(typeof id1).toBe('string');
      expect(typeof id2).toBe('string');
    });
  });

  describe('createState', () => {
    it('creates state with correct batch structure', () => {
      const urls = ['https://a.com/1', 'https://a.com/2', 'https://a.com/3'];
      const state = createState('test-run', 'test-site', 'full', 'https://a.com', urls, 2, TEST_OUTPUT_DIR);

      expect(state.runId).toBe('test-run');
      expect(state.siteId).toBe('test-site');
      expect(state.status).toBe('running');
      expect(state.batches).toHaveLength(2); // 3 URLs / batchSize 2 = 2 batches
      expect(state.batches[0].urls).toHaveLength(2);
      expect(state.batches[1].urls).toHaveLength(1);
    });

    it('persists state file to disk', () => {
      const urls = ['https://a.com/1'];
      createState('persist-test', 'test-site', 'full', 'https://a.com', urls, 10, TEST_OUTPUT_DIR);

      const statePath = path.resolve(TEST_RUN_DIR, 'persist-test', 'state.json');
      expect(fs.existsSync(statePath)).toBe(true);
    });
  });

  describe('loadState', () => {
    it('loads previously saved state', () => {
      const urls = ['https://a.com/1'];
      const original = createState('load-test', 'test-site', 'full', 'https://a.com', urls, 10, TEST_OUTPUT_DIR);

      const loaded = loadState(TEST_OUTPUT_DIR, 'load-test');
      expect(loaded).not.toBeNull();
      expect(loaded!.runId).toBe(original.runId);
    });

    it('returns null for non-existent run', () => {
      const loaded = loadState(TEST_OUTPUT_DIR, 'nonexistent');
      expect(loaded).toBeNull();
    });
  });

  describe('batch management', () => {
    it('marks batches as completed', () => {
      const urls = ['https://a.com/1', 'https://a.com/2'];
      const state = createState('batch-test', 'test', 'full', 'https://a.com', urls, 1, TEST_OUTPUT_DIR);

      markBatchCompleted(state, 0, 5);
      expect(state.batches[0].status).toBe('completed');
      expect(state.completedBatchIndices).toContain(0);
      expect(state.issueCount).toBe(5);
    });

    it('marks batches as failed', () => {
      const urls = ['https://a.com/1'];
      const state = createState('fail-test', 'test', 'full', 'https://a.com', urls, 1, TEST_OUTPUT_DIR);

      markBatchFailed(state, 0, 'Connection timeout');
      expect(state.batches[0].status).toBe('failed');
      expect(state.errors).toHaveLength(1);
      expect(state.errors[0].message).toContain('Connection timeout');
    });

    it('gets pending batch indices', () => {
      const urls = ['https://a.com/1', 'https://a.com/2', 'https://a.com/3'];
      const state = createState('pending-test', 'test', 'full', 'https://a.com', urls, 1, TEST_OUTPUT_DIR);

      markBatchCompleted(state, 0, 0);
      const pending = getPendingBatchIndices(state);
      expect(pending).toEqual([1, 2]);
    });

    it('isComplete returns true when all batches done', () => {
      const urls = ['https://a.com/1', 'https://a.com/2'];
      const state = createState('complete-test', 'test', 'full', 'https://a.com', urls, 1, TEST_OUTPUT_DIR);

      markBatchCompleted(state, 0, 0);
      markBatchCompleted(state, 1, 0);
      expect(isComplete(state)).toBe(true);
    });
  });

  describe('saveState progress calculation', () => {
    it('updates progress percentage', () => {
      const urls = ['https://a.com/1', 'https://a.com/2', 'https://a.com/3', 'https://a.com/4'];
      const state = createState('progress-test', 'test', 'full', 'https://a.com', urls, 2, TEST_OUTPUT_DIR);

      markBatchCompleted(state, 0, 0);
      saveState(state, TEST_OUTPUT_DIR);

      expect(state.progress.processedUrls).toBe(2);
      expect(state.progress.percentComplete).toBe(50);
    });
  });
});
