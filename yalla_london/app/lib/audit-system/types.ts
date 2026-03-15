/**
 * SEO Audit System — Type Definitions
 *
 * Re-exports master-audit types and adds DB-layer types.
 */

// Re-export all master-audit types
export type {
  IssueSeverity,
  IssueCategory,
  AuditMode,
  AuditConfig,
  CrawlSettings,
  ValidatorConfig,
  RiskScannerConfig,
  HardGateConfig,
  CrawlResult,
  ExtractedSignals,
  AuditIssue as MasterAuditIssue,
  IssueEvidence,
  IssueSuggestedFix,
  HardGateResult,
  SoftGateResult,
  UrlInventoryEntry,
  AuditRunResult,
  AuditState,
  BatchState,
} from '@/lib/master-audit/types';

// ---------------------------------------------------------------------------
// DB-layer types (matching Prisma models)
// ---------------------------------------------------------------------------

export type AuditRunStatus =
  | 'pending'
  | 'inventory'
  | 'crawling'
  | 'validating'
  | 'completed'
  | 'failed';

export type AuditIssueStatus = 'open' | 'ignored' | 'fixed' | 'wontfix';

export type AuditTriggeredBy = 'scheduled' | 'manual' | 'ci';

export interface AuditRunSummary {
  id: string;
  siteId: string;
  status: AuditRunStatus;
  mode: string;
  triggeredBy: string;
  totalUrls: number;
  processedUrls: number;
  currentBatch: number;
  totalBatches: number;
  totalIssues: number;
  p0Count: number;
  p1Count: number;
  p2Count: number;
  healthScore: number | null;
  hardGatesPassed: boolean | null;
  startedAt: string;
  completedAt: string | null;
  errorMessage: string | null;
}

export interface AuditIssueSummary {
  id: string;
  siteId: string;
  url: string;
  category: string;
  severity: string;
  title: string;
  description: string;
  status: AuditIssueStatus;
  fingerprint: string;
  firstDetectedAt: string;
  lastDetectedAt: string;
  detectionCount: number;
}

export interface SiteHealthOverview {
  siteId: string;
  latestRun: AuditRunSummary | null;
  healthScore: number | null;
  healthTrend: 'improving' | 'declining' | 'stable' | 'unknown';
  previousHealthScore: number | null;
  openIssues: {
    total: number;
    p0: number;
    p1: number;
    p2: number;
  };
  issuesByCategory: Record<string, number>;
  lastAuditAt: string | null;
  isRunning: boolean;
}

export interface StepRunnerResult {
  advanced: boolean;
  newStatus: AuditRunStatus;
  message: string;
  processedInStep: number;
}
