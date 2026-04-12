/**
 * Testing & Logging Standards — Single Source of Truth
 *
 * This file defines the canonical standards for:
 * 1. Manual action logging — what must be logged, how, and with what verification
 * 2. SEO/AIO testing sequences — the exact order of checks for indexing, auditing, publishing
 * 3. Verification requirements — pre-check, post-check, what constitutes real success
 * 4. Quality escalation — thresholds that auto-tighten when patterns of failure emerge
 *
 * DESIGN PRINCIPLES:
 * - Starts at the HIGHEST possible standard, relaxed only when proven unnecessary
 * - Self-adjusting: every discovered fix that reveals a better process updates these standards
 * - Ultra-focused on SEO, AIO (AI Optimization), indexing, and SEO audit sequences
 * - Every manual action must prove it happened (post-verification), not just claim it did
 * - Khaled (owner) works from iPhone with ADHD — every failure must be plain-language + actionable
 *
 * EVOLUTION LOG (append-only — never delete entries):
 * v1.0.0 (2026-03-06): Initial standards — 14 pre-pub checks, 4 verification levels, 8 SEO sequences
 * ---
 *
 * Referenced by: action-logger.ts, all admin API routes, pre-publication-gate.ts, SEO agent,
 *                content-matrix, content-indexing, seo-audit, seo-command, departures, cockpit
 */

// ─── Version & Evolution ─────────────────────────────────────────────────────

export const TESTING_STANDARDS_VERSION = "1.0.0";
export const TESTING_STANDARDS_DATE = "2026-03-06";

/**
 * Evolution entries — append-only log of every standards improvement.
 * Each discovered fix that reveals a better process adds an entry here.
 * The system learns from its own failures.
 */
export const EVOLUTION_LOG: EvolutionEntry[] = [
  {
    version: "1.0.0",
    date: "2026-03-06",
    trigger: "User discovered fake success on delete — articles showed 'deleted' but remained in DB",
    discovery: "Post-operation verification is mandatory. Success response without DB confirmation is fraudulent.",
    standardChanged: "VERIFICATION_LEVELS.mutation: post-verification now required for ALL create/update/delete",
    impact: "All 7 content-matrix actions, simple-write delete, feature-flag delete now verify after mutation"
  },
];

// ─── Types ───────────────────────────────────────────────────────────────────

export interface EvolutionEntry {
  version: string;
  date: string;
  /** What failure/discovery triggered the change */
  trigger: string;
  /** What we learned */
  discovery: string;
  /** Which standard was changed */
  standardChanged: string;
  /** How many endpoints/flows were affected */
  impact: string;
}

export type ActionCategory =
  | "content-mutation"   // Create, update, delete articles/drafts
  | "content-publish"    // Publishing, unpublishing, scheduling
  | "seo-action"         // SEO fixes, audit triggers, meta corrections
  | "indexing-action"    // IndexNow submissions, URL verification, sitemap
  | "cron-trigger"       // Manual cron invocations from dashboard
  | "config-change"      // AI config, feature flags, settings
  | "diagnostic"         // Health checks, audits, exports
  | "commerce-action";   // Affiliate, Etsy, product actions

export type VerificationLevel =
  | "none"           // Read-only operations (safe, no mutation)
  | "response-check" // Verify API response shape is correct
  | "post-verify"    // Re-read the DB record after mutation to confirm change
  | "full-audit";    // Post-verify + re-run quality gate + log comprehensive details

// ─── Logging Requirements Per Action Category ────────────────────────────────

/**
 * Every action category has specific requirements for what MUST be logged.
 * If an endpoint doesn't meet these requirements, it is non-compliant.
 */
export const LOGGING_REQUIREMENTS: Record<ActionCategory, {
  /** Minimum fields that MUST be present in every log entry */
  requiredFields: (keyof import("./action-logger").ActionLogEntry)[];
  /** Verification level — how to confirm the action actually worked */
  verificationLevel: VerificationLevel;
  /** Must log pre-operation state? (what was the record before we changed it) */
  requirePreState: boolean;
  /** Must log post-operation state? (what is the record after we changed it) */
  requirePostState: boolean;
  /** Must include suggested fix on failure? */
  requireFixSuggestion: boolean;
  /** Must include plain-language summary? */
  requirePlainSummary: boolean;
  /** Maximum acceptable false-success rate (0 = zero tolerance) */
  maxFalseSuccessRate: 0;
}> = {
  "content-mutation": {
    requiredFields: ["action", "resource", "resourceId", "success", "summary"],
    verificationLevel: "post-verify",
    requirePreState: true,
    requirePostState: true,
    requireFixSuggestion: true,
    requirePlainSummary: true,
    maxFalseSuccessRate: 0,
  },
  "content-publish": {
    requiredFields: ["action", "resource", "resourceId", "success", "summary"],
    verificationLevel: "full-audit",
    requirePreState: true,
    requirePostState: true,
    requireFixSuggestion: true,
    requirePlainSummary: true,
    maxFalseSuccessRate: 0,
  },
  "seo-action": {
    requiredFields: ["action", "resource", "success", "summary"],
    verificationLevel: "post-verify",
    requirePreState: false,
    requirePostState: true,
    requireFixSuggestion: true,
    requirePlainSummary: true,
    maxFalseSuccessRate: 0,
  },
  "indexing-action": {
    requiredFields: ["action", "resource", "resourceId", "success", "summary"],
    verificationLevel: "post-verify",
    requirePreState: false,
    requirePostState: true,
    requireFixSuggestion: true,
    requirePlainSummary: true,
    maxFalseSuccessRate: 0,
  },
  "cron-trigger": {
    requiredFields: ["action", "resource", "resourceId", "success", "summary"],
    verificationLevel: "response-check",
    requirePreState: false,
    requirePostState: false,
    requireFixSuggestion: true,
    requirePlainSummary: true,
    maxFalseSuccessRate: 0,
  },
  "config-change": {
    requiredFields: ["action", "resource", "success", "summary"],
    verificationLevel: "post-verify",
    requirePreState: true,
    requirePostState: true,
    requireFixSuggestion: true,
    requirePlainSummary: true,
    maxFalseSuccessRate: 0,
  },
  "diagnostic": {
    requiredFields: ["action", "resource", "success", "summary"],
    verificationLevel: "response-check",
    requirePreState: false,
    requirePostState: false,
    requireFixSuggestion: false,
    requirePlainSummary: true,
    maxFalseSuccessRate: 0,
  },
  "commerce-action": {
    requiredFields: ["action", "resource", "success", "summary"],
    verificationLevel: "post-verify",
    requirePreState: true,
    requirePostState: true,
    requireFixSuggestion: true,
    requirePlainSummary: true,
    maxFalseSuccessRate: 0,
  },
};

// ─── Verification Patterns ───────────────────────────────────────────────────

/**
 * Canonical verification patterns for every mutation type.
 * These define EXACTLY how to confirm an action succeeded.
 *
 * Rule: NEVER return { success: true } without completing the verification step.
 */
export const VERIFICATION_PATTERNS = {
  /** For Prisma delete operations */
  delete: {
    steps: [
      "1. Pre-check: findUnique to confirm record exists (capture title/keyword for log)",
      "2. If not found: return 404 with log entry (success:false, 'Record not found')",
      "3. Execute: prisma.model.delete({ where: { id } })",
      "4. Post-verify: findUnique again — record MUST be null",
      "5. If still exists: return 500 with log entry (success:false, 'Delete verification failed')",
      "6. If gone: return 200 with log entry (success:true, 'Deleted and verified gone')",
    ],
    antiPattern: "NEVER return success:true after delete without re-reading the record to confirm it's gone",
  },

  /** For Prisma update operations */
  update: {
    steps: [
      "1. Pre-check: findUnique to confirm record exists and capture current state",
      "2. If not found: return 404 with log entry",
      "3. If already in target state: return 200 with log (success:true, 'Already in desired state')",
      "4. Execute: prisma.model.update({ where: { id }, data: { ... } })",
      "5. Post-verify: re-read the specific field(s) that should have changed",
      "6. If field didn't change: return 500 with log entry (success:false, 'Update verification failed')",
      "7. If changed: return 200 with log entry including old→new values",
    ],
    antiPattern: "NEVER return success:true for an update without confirming the target field actually changed",
  },

  /** For Prisma create operations */
  create: {
    steps: [
      "1. Validate all required fields (fail fast with specific field names in error)",
      "2. Check for duplicates if relevant (slug, title, etc.)",
      "3. Execute: prisma.model.create({ data: { ... } })",
      "4. Post-verify: created record has an id — include it in response and log",
      "5. Log includes: created record id, key identifying fields, content length if applicable",
    ],
    antiPattern: "NEVER return success:true for a create without including the new record's ID",
  },

  /** For external API calls (cron triggers, indexing submissions) */
  externalCall: {
    steps: [
      "1. Execute the fetch/API call",
      "2. Check response.ok (HTTP 2xx)",
      "3. Parse response body — handle non-JSON gracefully (Safari)",
      "4. Log: HTTP status, response body summary, latency",
      "5. If !ok: log with error and fix suggestion",
    ],
    antiPattern: "NEVER assume fetch succeeded without checking response.ok",
  },
} as const;

// ─── SEO Testing Sequences ──────────────────────────────────────────────────

/**
 * Canonical testing sequences for SEO, AIO, and indexing operations.
 * Each sequence defines the EXACT order of checks with pass/fail criteria.
 *
 * These sequences are the gold standard — they represent the most thorough
 * process discovered through all prior audits and fixes.
 */
export const SEO_TEST_SEQUENCES = {

  /**
   * SEQUENCE 1: Pre-Publication Quality Gate
   * Run BEFORE any article is published. Fail-closed: gate failure = publication blocked.
   *
   * 14 checks in strict order. Checks 1-6 are hard blockers, 7-14 are warnings
   * (except SEO score <50 which also blocks).
   */
  prePublicationGate: {
    name: "Pre-Publication Quality Gate",
    triggerPoint: "Before BlogPost.published = true",
    failBehavior: "fail-closed" as const,
    checks: [
      { id: 1, name: "Route Existence", type: "blocker" as const, description: "Public URL returns 200 (not 404)", metric: "HTTP status", threshold: "200" },
      { id: 2, name: "Arabic Route", type: "blocker" as const, description: "/ar/ variant returns 200", metric: "HTTP status", threshold: "200" },
      { id: 3, name: "SEO Minimums", type: "blocker" as const, description: "Title ≥30ch, meta title, meta desc ≥120ch, content present", metric: "char counts", threshold: "title≥30, metaDesc≥120" },
      { id: 4, name: "SEO Score", type: "blocker" as const, description: "Score ≥50 to publish (≥70 ideal)", metric: "score/100", threshold: "≥50 hard, ≥70 soft" },
      { id: 5, name: "Heading Hierarchy", type: "warning" as const, description: "1 H1, ≥2 H2, no skipped levels", metric: "heading structure", threshold: "valid hierarchy" },
      { id: 6, name: "Word Count", type: "blocker" as const, description: "≥1000 words for blog (varies by type)", metric: "word count", threshold: "per CONTENT_TYPE_THRESHOLDS" },
      { id: 7, name: "Internal Links", type: "warning" as const, description: "≥3 internal links for blog", metric: "link count", threshold: "per CONTENT_TYPE_THRESHOLDS" },
      { id: 8, name: "Readability", type: "warning" as const, description: "Flesch-Kincaid ≤12 (English only)", metric: "FK grade", threshold: "≤12" },
      { id: 9, name: "Image Alt Text", type: "warning" as const, description: "All <img> have alt attribute", metric: "coverage %", threshold: "100%" },
      { id: 10, name: "Author Attribution", type: "warning" as const, description: "Author byline present (E-E-A-T)", metric: "boolean", threshold: "true" },
      { id: 11, name: "Structured Data", type: "warning" as const, description: "Valid JSON-LD present", metric: "boolean", threshold: "true" },
      { id: 12, name: "Authenticity Signals", type: "warning" as const, description: "≥3 experience markers, ≤1 AI-generic phrase", metric: "signal count", threshold: "≥3 signals" },
      { id: 13, name: "Affiliate Links", type: "warning" as const, description: "≥2 affiliate/booking links present", metric: "link count", threshold: "≥2 (blog/guide)" },
      { id: 14, name: "AIO Readiness", type: "warning" as const, description: "Direct answer in first 80 words, Q-format H2s", metric: "signal presence", threshold: "advisory only" },
    ],
    evolution: "Check count: 4→9→11→13→14. Each audit uncovered missing checks."
  },

  /**
   * SEQUENCE 2: Indexing Submission Flow
   * The exact steps for getting a URL indexed by Google.
   */
  indexingSubmission: {
    name: "Indexing Submission Flow",
    triggerPoint: "After article published + gate passed",
    failBehavior: "retry-with-backoff" as const,
    steps: [
      { id: 1, name: "URL Tracked", description: "ensureUrlTracked() writes pending record to URLIndexingStatus", verify: "Record exists in DB with status 'pending'" },
      { id: 2, name: "IndexNow Ping", description: "POST to IndexNow API with site key", verify: "HTTP 200/202 response", retryPolicy: "3 retries with exponential backoff" },
      { id: 3, name: "Sitemap Inclusion", description: "URL appears in /sitemap.xml", verify: "Sitemap contains the URL" },
      { id: 4, name: "GSC Inspection", description: "URL Inspection API confirms crawl request", verify: "inspection.indexingState !== 'ERROR'" },
      { id: 5, name: "Status Update", description: "URLIndexingStatus updated to 'submitted' or 'indexed'", verify: "DB record reflects current state" },
    ],
    window: "7 days — posts missing initial submission caught by daily seo/cron runs",
    evolution: "Window: 24h→7d (Audit #11). Submission: dual→single (seo-agent discovers, seo/cron submits)."
  },

  /**
   * SEQUENCE 3: SEO Audit Flow
   * Full site audit sequence with auto-fix capabilities.
   */
  seoAudit: {
    name: "SEO Audit Flow",
    triggerPoint: "Manual 'Run Full Audit' button or weekly cron",
    steps: [
      { id: 1, name: "Inventory Build", description: "Collect all indexable URLs from sitemap + static routes" },
      { id: 2, name: "Crawl", description: "Fetch each URL (semaphore concurrency, rate-limited)" },
      { id: 3, name: "Extract Signals", description: "Parse HTML for title, meta, headings, links, schema, hreflang" },
      { id: 4, name: "Validate", description: "Run 8 validators (http, canonical, hreflang, sitemap, schema, links, metadata, robots)" },
      { id: 5, name: "Risk Scan", description: "Run 3 risk scanners (scaled content, site reputation, expired domain)" },
      { id: 6, name: "Hard Gates", description: "Evaluate 6 hard gates (0 violations = pass)" },
      { id: 7, name: "Report", description: "Generate EXEC_SUMMARY.md + FIX_PLAN.md with severity-ordered findings" },
    ],
    hardGates: [
      "No broken internal links (HTTP 4xx/5xx)",
      "All indexable pages return 200",
      "Every page has canonical tag",
      "All JSON-LD is valid",
      "Hreflang reciprocity verified",
      "Sitemap parses successfully",
    ],
  },

  /**
   * SEQUENCE 4: Content Pipeline End-to-End
   * From topic to published, indexed, monetized article.
   */
  contentPipeline: {
    name: "Content Pipeline E2E",
    steps: [
      { id: 1, name: "Topic Research", verify: "TopicProposal created with site_id, intent, source_weights_json" },
      { id: 2, name: "Draft Creation", verify: "ArticleDraft created with topic reference" },
      { id: 3, name: "Research Phase", verify: "research_data populated (or pre-populated flag set)" },
      { id: 4, name: "Outline Phase", verify: "outline JSON with sections, headings" },
      { id: 5, name: "Drafting Phase", verify: "content_en ≥250 words per section, maxTokens 3000 EN / 3500 AR" },
      { id: 6, name: "Assembly Phase", verify: "Full HTML body, ≥1200 words. Raw fallback after 1st timeout." },
      { id: 7, name: "Images Phase", verify: "Image references or placeholders" },
      { id: 8, name: "SEO Phase", verify: "Meta title, meta description, SEO score computed" },
      { id: 9, name: "Scoring Phase", verify: "quality_score ≥70 (gate), seo_score computed" },
      { id: 10, name: "Reservoir", verify: "Draft in reservoir status, waiting for selection" },
      { id: 11, name: "Selection", verify: "Content selector promotes to BlogPost (bilingual, with affiliates)" },
      { id: 12, name: "Pre-Pub Gate", verify: "14-check gate passes (fail-closed)" },
      { id: 13, name: "Publication", verify: "BlogPost.published=true, public URL returns 200" },
      { id: 14, name: "Indexing", verify: "IndexNow submitted, sitemap updated" },
      { id: 15, name: "Monitoring", verify: "GSC picks up URL within 7 days" },
    ],
    criticalInvariants: [
      "Assembly raw fallback after 1st timeout (attempts≥1 → instant HTML concat, no AI call)",
      "Arabic maxTokens ≥3500 for drafting/assembly/expansion",
      "Content-builder dedup: write marker BEFORE processing, re-count in 90s window",
      "Sweeper NEVER resets assembly timeout drafts",
      "Permanent failure cap: 10 total attempts → MAX_RECOVERIES_EXCEEDED",
      "Atomic topic claiming: updateMany + 'generating' status",
      "Pre-pub gate fail-closed: gate failure blocks publication",
      "Dashboard builders run sequentially (not Promise.all) to avoid pool exhaustion",
    ],
  },

  /**
   * SEQUENCE 5: AIO (AI Overview) Optimization
   * Checks that maximize the chance of being cited in Google AI Overviews.
   */
  aioOptimization: {
    name: "AIO Readiness Checks",
    description: "60%+ of searches show AI Overviews. Content cited in overviews gets 2-3x more visibility.",
    checks: [
      { name: "Direct Answer", description: "First 80 words contain a clear, direct answer to the topic question", priority: "critical" as const },
      { name: "Question H2s", description: "At least 2 H2 headings phrased as questions (natural language queries)", priority: "high" as const },
      { name: "No Preamble", description: "Article doesn't start with 'In this article...' or similar filler", priority: "high" as const },
      { name: "Structured Data", description: "Valid JSON-LD (Article schema) present for crawl hints", priority: "high" as const },
      { name: "Concise Paragraphs", description: "No paragraph exceeds 3 sentences (AIO prefers extractable chunks)", priority: "medium" as const },
      { name: "First-Hand Signals", description: "3+ experience markers (sensory details, insider tips, personal observations)", priority: "critical" as const },
      { name: "Authority Links", description: "Links to authoritative sources (.gov, .org, established brands)", priority: "medium" as const },
      { name: "Topical Depth", description: "3+ internal links to related content (topical cluster signal)", priority: "high" as const },
    ],
    evolution: "Added as check #14 in pre-pub gate (warning-only). Elevated to dedicated sequence for focused testing.",
  },

  /**
   * SEQUENCE 6: Manual Action Verification
   * Every button tap on the dashboard goes through this flow.
   */
  manualActionVerification: {
    name: "Dashboard Action Verification Flow",
    description: "Guarantees no fake success indicators. Every action proves it happened.",
    steps: [
      { id: 1, name: "Auth Check", description: "withAdminAuth or requireAdmin validates session" },
      { id: 2, name: "Input Validation", description: "Validate all required fields, return specific field-level errors" },
      { id: 3, name: "Pre-State Capture", description: "For mutations: findUnique to capture current record state" },
      { id: 4, name: "Execute Action", description: "Perform the Prisma mutation or external API call" },
      { id: 5, name: "Post-Verification", description: "Re-read from DB to confirm the change actually persisted" },
      { id: 6, name: "Log Entry", description: "logManualAction with full details (pre-state, post-state, duration)" },
      { id: 7, name: "Response", description: "Return verified result. success:true ONLY if post-verification passed" },
    ],
    zeroToleranceRules: [
      "NEVER return success:true without DB post-verification on mutations",
      "NEVER swallow errors with empty catch blocks — log with context",
      "NEVER show success toast without the backend confirming the change",
      "NEVER return success on delete without confirming record is gone",
      "NEVER return success on update without confirming field changed",
    ],
  },

  /**
   * SEQUENCE 7: SEO Auto-Fix Flow
   * Automated SEO corrections run by the SEO agent.
   */
  seoAutoFix: {
    name: "SEO Agent Auto-Fix Flow",
    fixes: [
      { name: "Missing Meta Title", limit: 50, description: "AI generates title from content, saves to BlogPost.meta_title_en" },
      { name: "Missing Meta Description", limit: 50, description: "AI generates 120-155 char description from content" },
      { name: "Long Meta Title", limit: 100, description: "Trims at word boundary to ≤60 chars" },
      { name: "Long Meta Description", limit: 100, description: "Trims at word boundary to ≤155 chars" },
      { name: "Missing Internal Links", limit: 5, description: "Injects <section class='related-articles'> with up to 3 recent post links" },
      { name: "Schema Injection", limit: 20, description: "Adds Article JSON-LD to posts missing structured data" },
    ],
    budgetGuard: "53s total budget, 12s per individual AI call, check remaining before each fix",
    evolution: "Batch: 2→8 meta optimizations, 1→3 content expansions, 5→20 schema injections per run.",
  },

  /**
   * SEQUENCE 8: Content Auto-Fix Cron
   * Runs at 11:00 + 18:00 UTC daily.
   */
  contentAutoFix: {
    name: "Content Auto-Fix Cron",
    schedule: "11:00 + 18:00 UTC daily",
    fixes: [
      { name: "Expand Thin Reservoir", description: "Reservoir drafts <1000 words get AI expansion", verify: "Word count ≥1000 after fix" },
      { name: "Trim Long Meta Desc (BlogPost)", description: "meta_description_en >160 chars trimmed to ≤155", verify: "Length ≤155" },
      { name: "Trim Long Meta Desc (ArticleDraft)", description: "seo_meta.metaDescription >160 chars trimmed to ≤155", verify: "Length ≤155" },
    ],
    constraints: [
      "Uses { not: '' } not { not: null } on required String fields (Prisma rule)",
      "Budget guard: 53s with 7s buffer",
    ],
  },
} as const;

// ─── Action-to-Category Mapping ──────────────────────────────────────────────

/**
 * Maps action names (as used in logManualAction) to their category.
 * This determines which LOGGING_REQUIREMENTS apply.
 */
export const ACTION_CATEGORY_MAP: Record<string, ActionCategory> = {
  // Content mutations
  "delete-draft": "content-mutation",
  "delete-post": "content-mutation",
  "re-queue-draft": "content-mutation",
  "rewrite-draft": "content-mutation",
  "editor-save-article": "content-mutation",
  "simple-write-save": "content-mutation",
  "simple-write-delete": "content-mutation",
  "bulk-queue-articles": "content-mutation",

  // Content publishing
  "unpublish-post": "content-publish",
  "force-publish": "content-publish",
  "simple-write-publish": "content-publish",
  "gate-check": "content-publish",
  "enhance-draft": "content-publish",

  // SEO actions
  "quick-fix-missing-meta-titles": "seo-action",
  "quick-fix-missing-meta-descriptions": "seo-action",
  "quick-fix-thin-content": "seo-action",
  "auto-fix-all": "seo-action",
  "compliance-audit": "seo-action",
  "run-full-audit": "seo-action",

  // Indexing actions
  "verify-url": "indexing-action",
  "submit-discovered": "indexing-action",
  "resubmit-stuck": "indexing-action",
  "submit-to-google": "indexing-action",

  // Cron triggers
  "do-now": "cron-trigger",
  "run-cron-content-builder": "cron-trigger",
  "run-cron-content-selector": "cron-trigger",
  "run-cron-seo-agent": "cron-trigger",
  "run-cron-sweeper": "cron-trigger",

  // Config changes
  "save-ai-routes": "config-change",
  "test-all-providers": "config-change",
  "add-flag": "config-change",
  "toggle-flag": "config-change",
  "update-flag": "config-change",
  "delete-flag": "config-change",

  // Diagnostics
  "audit-export": "diagnostic",
  "site-diagnose": "diagnostic",
};

// ─── SEO Quality Escalation Rules ────────────────────────────────────────────

/**
 * Auto-tightening rules: when a pattern of failure is detected,
 * these thresholds automatically escalate to prevent recurrence.
 *
 * Example: If 5+ articles fail the quality gate due to thin content in a week,
 * the minWords threshold should be raised.
 */
export const QUALITY_ESCALATION_RULES = {
  /**
   * If >30% of articles fail word count check in a 7-day window,
   * the AI generation prompts should request 20% more words.
   */
  thinContentPattern: {
    trigger: "30%+ articles fail word count in 7 days",
    action: "Raise content generation prompt word targets by 20%",
    currentMinWords: 1000,
    escalationTarget: 1200,
  },

  /**
   * If >20% of articles fail authenticity signals,
   * the AI prompts need stronger first-person experience directives.
   */
  authenticityGapPattern: {
    trigger: "20%+ articles fail authenticity check in 7 days",
    action: "Add explicit sensory detail requirements to generation prompts",
    currentMinSignals: 3,
    escalationTarget: 5,
  },

  /**
   * If >50% of newly published articles are NOT indexed within 7 days,
   * the indexing flow has a systemic issue requiring investigation.
   */
  indexingFailurePattern: {
    trigger: "50%+ published articles not indexed after 7 days",
    action: "Audit IndexNow key, sitemap validity, and robots.txt",
    escalation: "Alert on cockpit dashboard with diagnostic link",
  },

  /**
   * If any delete/update operation has a false-success rate >0%,
   * that endpoint must be immediately fixed with post-verification.
   */
  falseSuccessPattern: {
    trigger: "Any action returns success:true but DB shows no change",
    action: "Endpoint code review + add post-verification",
    tolerance: 0,
    escalation: "Block endpoint until fixed (return 503 'Verification offline')",
  },
} as const;

// ─── Helper Functions ────────────────────────────────────────────────────────

/**
 * Get the logging requirements for a given action name.
 */
export function getRequirementsForAction(actionName: string): typeof LOGGING_REQUIREMENTS[ActionCategory] | null {
  const category = ACTION_CATEGORY_MAP[actionName];
  if (!category) return null;
  return LOGGING_REQUIREMENTS[category];
}

/**
 * Get the verification level required for a given action.
 */
export function getVerificationLevel(actionName: string): VerificationLevel {
  const reqs = getRequirementsForAction(actionName);
  return reqs?.verificationLevel ?? "response-check";
}

/**
 * Check if an action's log entry meets the required standards.
 * Returns list of violations (empty = compliant).
 */
export function validateLogEntry(
  actionName: string,
  entry: Partial<import("./action-logger").ActionLogEntry>
): string[] {
  const reqs = getRequirementsForAction(actionName);
  if (!reqs) return [`Unknown action "${actionName}" — not in ACTION_CATEGORY_MAP`];

  const violations: string[] = [];

  for (const field of reqs.requiredFields) {
    if (entry[field] === undefined || entry[field] === null) {
      violations.push(`Missing required field: ${field}`);
    }
  }

  if (reqs.requirePlainSummary && (!entry.summary || entry.summary.length < 10)) {
    violations.push("Summary must be ≥10 characters with plain-language description");
  }

  if (reqs.requireFixSuggestion && entry.success === false && !entry.fix) {
    violations.push("Failed actions must include a 'fix' suggestion");
  }

  return violations;
}

/**
 * Record an evolution entry when a better process is discovered.
 * This is called programmatically when a fix reveals a better standard.
 */
export function recordEvolution(entry: Omit<EvolutionEntry, "version">): void {
  const nextVersion = `1.${EVOLUTION_LOG.length}.0`;
  EVOLUTION_LOG.push({ ...entry, version: nextVersion });
  console.info(`[testing-standards] Evolution recorded: v${nextVersion} — ${entry.discovery}`);
}
