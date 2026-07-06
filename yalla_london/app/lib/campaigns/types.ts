/**
 * Campaign Agent — Type Definitions
 *
 * A Campaign is a batch operation that processes multiple published articles
 * through defined operations: enhance content, inject affiliates, fix headings,
 * expand Arabic content, optimize SEO, add media (future), add banners (future).
 *
 * Campaigns are resumable, budget-guarded, and process items one-at-a-time
 * across multiple cron invocations. Every change is snapshotted for rollback.
 */

// ─── Campaign Types ──────────────────────────────────────────────────────────

export type CampaignType =
  | 'enhance_content'     // Expand thin content, add authenticity signals, improve headings
  | 'inject_affiliates'   // Add/update affiliate links and booking CTAs
  | 'fix_arabic'          // Expand thin Arabic content to match English
  | 'fix_headings'        // Restructure flat articles with proper H2/H3 hierarchy
  | 'seo_optimize'        // Meta optimization, internal links, structured data
  | 'inject_media'        // Add photos, maps, embeds (future)
  | 'add_banners'         // Add promotional banners (future)
  | 'custom';             // User-defined operations

export type CampaignStatus = 'draft' | 'queued' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
export type CampaignItemStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';

// ─── Campaign Config ─────────────────────────────────────────────────────────

export interface CampaignConfig {
  operations: CampaignOperation[];
  filters?: CampaignFilters;
  aiModel?: string;              // Default: 'grok-4-1-fast'
  dryRun?: boolean;              // Preview changes without saving
  skipIfScoreAbove?: number;     // Skip articles already scoring above this
  minWordCountTarget?: number;   // Target word count for expansion (default 1500)
}

export type CampaignOperation =
  | 'expand_content'        // Add new H2 sections, expand thin sections
  | 'add_authenticity'      // Inject first-hand experience signals
  | 'fix_heading_hierarchy' // Restructure to proper H2/H3
  | 'add_internal_links'    // Inject 3+ internal links
  | 'add_affiliate_links'   // Add booking/affiliate CTAs
  | 'fix_meta_description'  // Rewrite meta description to 120-160 chars
  | 'fix_meta_title'        // Fix meta title to 50-60 chars
  | 'expand_arabic'         // Expand thin Arabic content
  | 'fix_slug_artifacts'    // Remove hash/date artifacts from slugs
  | 'add_structured_data'   // Add/improve JSON-LD
  | 'inject_images'         // Add images (future)
  | 'inject_maps'           // Add Google Maps embeds (future)
  | 'add_banners';          // Add promotional banners (future)

export interface CampaignFilters {
  minWordCount?: number;     // Only articles below this word count
  maxWordCount?: number;     // Only articles above this word count
  maxSeoScore?: number;      // Only articles below this SEO score
  hasAffiliates?: boolean;   // Only articles with/without affiliates
  slugPattern?: string;      // Regex to match specific slugs
  publishedBefore?: string;  // ISO date — only articles published before
  publishedAfter?: string;   // ISO date — only articles published after
}

// ─── Snapshots ───────────────────────────────────────────────────────────────

export interface ArticleSnapshot {
  wordCountEn: number;
  wordCountAr: number;
  h2Count: number;
  h3Count: number;
  internalLinkCount: number;
  affiliateLinkCount: number;
  seoScore: number | null;
  metaTitleEn: string | null;
  metaDescEn: string | null;
  metaDescLen: number;
  hasAuthenticitySignals: boolean;
  authenticitySignalCount: number;
  featuredImage: string | null;
}

export interface ItemChanges {
  wordsAdded?: number;
  h2sAdded?: number;
  h3sAdded?: number;
  internalLinksAdded?: number;
  affiliateLinksAdded?: number;
  metaDescRewritten?: boolean;
  metaTitleRewritten?: boolean;
  arabicExpanded?: boolean;
  slugCleaned?: boolean;
  authenticitySignalsAdded?: number;
}

// ─── Runner Types ────────────────────────────────────────────────────────────

export interface CampaignRunResult {
  campaignId: string;
  itemsProcessed: number;
  itemsSucceeded: number;
  itemsFailed: number;
  itemsSkipped: number;
  totalCostUsd: number;
  errors: string[];
  duration_ms: number;
}

export interface ItemProcessResult {
  success: boolean;
  operationsApplied: CampaignOperation[];
  changes: ItemChanges;
  costUsd: number;
  error?: string;
  beforeSnapshot: ArticleSnapshot;
  afterSnapshot?: ArticleSnapshot;
}
