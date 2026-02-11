/**
 * Yalla Skill Registry — Auto-Activated Development & Operations Skills
 *
 * Inspired by openclaw/skills, claude-code-templates, and rails-enterprise-dev.
 * Adapted for Next.js / TypeScript / Prisma multi-tenant platform.
 *
 * Skills auto-activate based on:
 * - File patterns being edited (e.g., *.test.ts triggers test-gen)
 * - Keywords in task context (e.g., "security" triggers security-audit)
 * - System events (e.g., pre-deploy triggers perf-check)
 * - Manual invocation from Operations Hub
 */

// ── Skill Definition ─────────────────────────────────

export interface Skill {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  category: SkillCategory;
  icon: string; // lucide icon name

  // Auto-activation triggers
  triggers: {
    filePatterns?: string[]; // glob patterns
    keywords?: string[]; // context keywords
    events?: SkillEvent[]; // system events
    directories?: string[]; // active when working in these dirs
  };

  // What the skill does
  actions: SkillAction[];

  // Dependencies
  requires?: string[]; // env vars or packages needed
  priority: "critical" | "high" | "medium" | "low";
  enabled: boolean;
}

export type SkillCategory =
  | "code-quality"
  | "testing"
  | "security"
  | "performance"
  | "deployment"
  | "content"
  | "seo"
  | "design"
  | "data"
  | "operations"
  | "requirements"
  | "automation";

export type SkillEvent =
  | "pre-commit"
  | "post-commit"
  | "pre-deploy"
  | "post-deploy"
  | "pre-build"
  | "post-build"
  | "on-error"
  | "on-new-file"
  | "cron-daily"
  | "cron-hourly"
  | "manual";

export interface SkillAction {
  id: string;
  name: string;
  nameAr: string;
  type: "check" | "generate" | "fix" | "report" | "transform" | "validate";
  description: string;
  // API endpoint or command to run
  endpoint?: string;
  command?: string;
  // System prompt for AI-assisted actions
  systemPrompt?: string;
}

// ── Skill Status ─────────────────────────────────────

export interface SkillStatus {
  skillId: string;
  active: boolean;
  lastRun?: string; // ISO date
  lastResult?: "success" | "warning" | "error";
  runsToday: number;
  findings: number; // issues found in last run
}

// ═══════════════════════════════════════════════════════
//  SKILL DEFINITIONS
// ═══════════════════════════════════════════════════════

export const skills: Skill[] = [
  // ── CODE QUALITY ─────────────────────────────────

  {
    id: "code-reviewer",
    name: "Code Reviewer",
    nameAr: "مراجع الكود",
    description:
      "Automated code review: style consistency, anti-patterns, SOLID principles, Next.js best practices, and Prisma query optimization.",
    category: "code-quality",
    icon: "SearchCode",
    triggers: {
      filePatterns: ["**/*.ts", "**/*.tsx"],
      events: ["pre-commit"],
      keywords: ["review", "code quality", "refactor"],
    },
    actions: [
      {
        id: "review-style",
        name: "Style & Consistency Check",
        nameAr: "فحص التنسيق والاتساق",
        type: "check",
        description: "Checks naming conventions, import order, unused exports",
        systemPrompt:
          "Review this code for: naming conventions (camelCase for vars, PascalCase for components), import organization (external → internal → relative), unused exports, dead code, and consistency with the existing codebase patterns.",
      },
      {
        id: "review-patterns",
        name: "Pattern & Architecture Review",
        nameAr: "مراجعة الأنماط والهيكلة",
        type: "check",
        description:
          "Checks for anti-patterns, SOLID violations, proper error handling",
        systemPrompt:
          "Review this code for: anti-patterns (God components, prop drilling > 3 levels, N+1 queries), SOLID principle violations, missing error boundaries, improper async/await handling, and memory leaks in useEffect.",
      },
      {
        id: "review-nextjs",
        name: "Next.js Best Practices",
        nameAr: "أفضل ممارسات Next.js",
        type: "check",
        description:
          "Validates server/client component split, metadata, caching, and data fetching",
        systemPrompt:
          'Review for Next.js 14 App Router best practices: proper "use client" boundaries (keep client components small), metadata exports, revalidation strategies, Server Actions usage, proper loading/error states, and image optimization.',
      },
      {
        id: "review-prisma",
        name: "Prisma Query Optimizer",
        nameAr: "محسّن استعلامات Prisma",
        type: "check",
        description:
          "Detects N+1 queries, missing indexes, and inefficient includes",
        systemPrompt:
          "Review Prisma queries for: N+1 problems (use include/select instead of loops), missing where clauses on large tables, overly broad select (fetch only needed fields), missing pagination on list queries, and transaction usage for multi-step operations.",
      },
    ],
    priority: "high",
    enabled: true,
  },

  // ── TESTING ──────────────────────────────────────

  {
    id: "test-generator",
    name: "Test Generator",
    nameAr: "مولّد الاختبارات",
    description:
      "Auto-generates unit tests, integration tests, and API endpoint tests. Covers edge cases, error paths, and bilingual content.",
    category: "testing",
    icon: "FlaskConical",
    triggers: {
      filePatterns: ["**/*.test.ts", "**/*.spec.ts", "**/__tests__/**"],
      keywords: ["test", "testing", "coverage", "spec"],
      events: ["on-new-file"],
      directories: ["app/api/", "lib/"],
    },
    actions: [
      {
        id: "gen-unit-tests",
        name: "Generate Unit Tests",
        nameAr: "توليد اختبارات الوحدة",
        type: "generate",
        description: "Creates unit tests for functions and utilities",
        systemPrompt:
          "Generate comprehensive unit tests using Jest/Vitest. Cover: happy path, edge cases (null, undefined, empty arrays, max values), error paths (throw scenarios), and type validation. Use describe/it/expect pattern. Mock external dependencies.",
      },
      {
        id: "gen-api-tests",
        name: "Generate API Tests",
        nameAr: "توليد اختبارات API",
        type: "generate",
        description: "Creates API endpoint tests with auth, validation, errors",
        systemPrompt:
          "Generate API route tests: test GET/POST/PUT/DELETE handlers, validate request body/query params, test auth requirements (401 for unauthenticated), test validation errors (400), test not found (404), and test successful responses (200/201). Use NextRequest/NextResponse mocks.",
      },
      {
        id: "gen-component-tests",
        name: "Generate Component Tests",
        nameAr: "توليد اختبارات المكونات",
        type: "generate",
        description: "Creates React component tests with RTL",
        systemPrompt:
          "Generate React component tests using React Testing Library. Test: rendering, user interactions (click, type, submit), async states (loading, error, success), accessibility (roles, labels), and bilingual content (EN/AR). Use screen.getByRole/getByText.",
      },
    ],
    priority: "high",
    enabled: true,
  },

  // ── SECURITY ─────────────────────────────────────

  {
    id: "security-auditor",
    name: "Security Auditor",
    nameAr: "مدقق الأمان",
    description:
      "Scans for OWASP Top 10 vulnerabilities, API key leaks, SQL/NoSQL injection, XSS, CSRF, and auth bypass risks.",
    category: "security",
    icon: "Shield",
    triggers: {
      filePatterns: [
        "**/*.ts",
        "**/*.env*",
        "**/route.ts",
        "**/middleware.ts",
      ],
      keywords: ["security", "auth", "password", "token", "secret", "api key"],
      events: ["pre-commit", "pre-deploy"],
    },
    actions: [
      {
        id: "scan-secrets",
        name: "Secret Scanner",
        nameAr: "فحص الأسرار",
        type: "check",
        description: "Detects hardcoded API keys, passwords, tokens in code",
        systemPrompt:
          "Scan for hardcoded secrets: API keys (patterns like sk_live_*, AKIA*, ghp_*), passwords in strings, JWT tokens, database connection strings, private keys, and .env file contents committed to git. Flag any credential-like strings.",
      },
      {
        id: "scan-injection",
        name: "Injection Scanner",
        nameAr: "فحص الحقن",
        type: "check",
        description: "Checks for SQL/NoSQL injection, command injection, XSS",
        systemPrompt:
          "Scan for injection vulnerabilities: raw SQL in Prisma ($queryRaw without parameterization), unsanitized user input in HTML (dangerouslySetInnerHTML), command injection (exec/spawn with user input), path traversal (user input in file paths), and SSRF (user-controlled URLs in fetch).",
      },
      {
        id: "scan-auth",
        name: "Auth & Access Control",
        nameAr: "التحقق والتحكم بالوصول",
        type: "check",
        description: "Validates authentication and authorization patterns",
        systemPrompt:
          "Audit authentication/authorization: API routes missing auth checks (getServerSession), admin routes accessible without role validation, CORS misconfiguration, missing rate limiting on auth endpoints, session fixation risks, and CSRF token validation.",
      },
      {
        id: "scan-dependencies",
        name: "Dependency Vulnerability Check",
        nameAr: "فحص ثغرات التبعيات",
        type: "check",
        description: "Checks npm packages for known vulnerabilities",
        command: "npm audit --production --json",
      },
    ],
    priority: "critical",
    enabled: true,
  },

  // ── PERFORMANCE ──────────────────────────────────

  {
    id: "performance-optimizer",
    name: "Performance Optimizer",
    nameAr: "محسّن الأداء",
    description:
      "Analyzes bundle size, Core Web Vitals, image optimization, lazy loading, and caching strategies.",
    category: "performance",
    icon: "Gauge",
    triggers: {
      filePatterns: [
        "**/*.tsx",
        "**/layout.tsx",
        "**/page.tsx",
        "next.config.*",
      ],
      keywords: [
        "performance",
        "speed",
        "bundle",
        "optimize",
        "slow",
        "lighthouse",
      ],
      events: ["pre-deploy", "pre-build"],
    },
    actions: [
      {
        id: "analyze-bundle",
        name: "Bundle Size Analyzer",
        nameAr: "محلل حجم الحزمة",
        type: "report",
        description: "Identifies large dependencies and code-splitting opportunities",
        systemPrompt:
          "Analyze imports for bundle impact: identify heavy client-side packages (moment.js, lodash full import, plotly.js), suggest tree-shaking alternatives, find components that should be dynamically imported (next/dynamic), and detect duplicate dependencies.",
      },
      {
        id: "analyze-images",
        name: "Image Optimization",
        nameAr: "تحسين الصور",
        type: "check",
        description: "Checks for unoptimized images, missing next/image usage",
        systemPrompt:
          'Scan for image issues: <img> tags that should use next/image, missing width/height (causes CLS), missing alt text, large images without responsive srcSet, images loaded eagerly that should be lazy, and missing priority flag on above-the-fold images.',
      },
      {
        id: "analyze-caching",
        name: "Caching Strategy Review",
        nameAr: "مراجعة استراتيجية التخزين المؤقت",
        type: "check",
        description: "Reviews revalidation, ISR, and API caching patterns",
        systemPrompt:
          "Review caching: API routes missing Cache-Control headers, pages that could use ISR (revalidate) instead of SSR, missing stale-while-revalidate patterns, Prisma queries that should be cached, and static data fetched on every request.",
      },
    ],
    priority: "high",
    enabled: true,
  },

  // ── REQUIREMENTS & BDD (from rails-enterprise-dev) ───

  {
    id: "requirements-writer",
    name: "Requirements & BDD Writer",
    nameAr: "كاتب المتطلبات والسلوك",
    description:
      "Converts feature requests into structured user stories, acceptance criteria, and Gherkin-style BDD scenarios. Adapted from enterprise Rails patterns for Next.js.",
    category: "requirements",
    icon: "ClipboardList",
    triggers: {
      keywords: [
        "feature",
        "requirement",
        "user story",
        "acceptance criteria",
        "BDD",
        "gherkin",
        "spec",
      ],
      events: ["manual"],
    },
    actions: [
      {
        id: "gen-user-story",
        name: "Generate User Stories",
        nameAr: "توليد قصص المستخدم",
        type: "generate",
        description:
          "Creates INVEST-quality user stories from feature descriptions",
        systemPrompt: `Convert this feature description into structured user stories following the INVEST criteria:

**Format per story:**
### US-{number}: {title}
**As a** {persona} **I want to** {action} **So that** {benefit}

**Acceptance Criteria:**
- [ ] Given {context}, When {action}, Then {result}
- [ ] Given {context}, When {action}, Then {result}

**Priority:** {P0-P3}
**Estimate:** {S/M/L/XL}
**Dependencies:** {list or none}

Ensure stories are: Independent, Negotiable, Valuable, Estimable, Small, Testable.
Consider: bilingual support (EN/AR), multi-tenant context, mobile responsiveness, admin vs public user flows.`,
      },
      {
        id: "gen-bdd-scenarios",
        name: "Generate BDD Scenarios",
        nameAr: "توليد سيناريوهات BDD",
        type: "generate",
        description:
          "Creates Gherkin-style test scenarios for Playwright/Cypress",
        systemPrompt: `Generate BDD test scenarios in Gherkin format adapted for Playwright E2E tests:

Feature: {feature name}
  Background:
    Given {setup conditions}

  Scenario: {scenario name}
    Given {initial state}
    And {additional context}
    When {user action}
    Then {expected result}
    And {additional verification}

  Scenario Outline: {parameterized scenario}
    Given {state with <param>}
    When {action with <param>}
    Then {result with <param>}
    Examples:
      | param | expected |
      | value1 | result1 |

Cover: happy paths, error states, edge cases, auth boundaries, bilingual content, and multi-site scenarios.`,
      },
    ],
    priority: "medium",
    enabled: true,
  },

  // ── REAL-TIME / ASYNC PATTERNS (from rails-enterprise-dev) ───

  {
    id: "async-patterns",
    name: "Async & Background Job Patterns",
    nameAr: "أنماط المعالجة غير المتزامنة",
    description:
      "Best practices for background jobs, cron tasks, webhooks, queues, and real-time updates in Next.js. Adapted from Sidekiq patterns.",
    category: "automation",
    icon: "Workflow",
    triggers: {
      filePatterns: ["**/api/cron/**", "**/api/webhooks/**", "**/jobs/**"],
      keywords: [
        "cron",
        "webhook",
        "background",
        "queue",
        "async",
        "scheduled",
        "worker",
      ],
      directories: ["app/api/cron/", "app/api/webhooks/", "lib/jobs/"],
    },
    actions: [
      {
        id: "pattern-cron",
        name: "Cron Job Pattern",
        nameAr: "نمط المهام المجدولة",
        type: "generate",
        description:
          "Generates idempotent cron job handlers with error recovery",
        systemPrompt: `Generate a Next.js cron job API route following these patterns:
- Verify cron secret (CRON_SECRET header)
- Idempotent execution (safe to retry)
- Distributed lock (prevent parallel runs)
- Structured logging with timestamps
- Error capture and notification
- Execution time tracking
- Graceful timeout handling
- Return structured JSON with stats`,
      },
      {
        id: "pattern-webhook",
        name: "Webhook Handler Pattern",
        nameAr: "نمط معالج Webhook",
        type: "generate",
        description:
          "Generates secure webhook handlers with signature verification",
        systemPrompt: `Generate a secure webhook handler:
- Signature verification (HMAC-SHA256)
- Idempotent processing (deduplicate by event ID)
- Raw body parsing for signature verification
- Async processing (acknowledge fast, process later)
- Dead letter queue for failed events
- Structured logging of all webhook events
- Type-safe event parsing with Zod`,
      },
    ],
    priority: "medium",
    enabled: true,
  },

  // ── SEO AUTOMATION ──────────────────────────────

  {
    id: "seo-optimizer",
    name: "SEO Optimizer",
    nameAr: "محسّن SEO",
    description:
      "Validates metadata, structured data, canonical URLs, sitemap coverage, and Core Web Vitals for all pages.",
    category: "seo",
    icon: "Search",
    triggers: {
      filePatterns: [
        "**/page.tsx",
        "**/layout.tsx",
        "**/sitemap.ts",
        "**/robots.ts",
      ],
      keywords: [
        "SEO",
        "metadata",
        "structured data",
        "sitemap",
        "canonical",
        "schema",
      ],
      events: ["pre-deploy"],
    },
    actions: [
      {
        id: "check-metadata",
        name: "Metadata Completeness",
        nameAr: "اكتمال البيانات الوصفية",
        type: "check",
        description: "Validates title, description, OG tags on all pages",
        systemPrompt:
          "Check every page.tsx and layout.tsx for: metadata export (title, description), Open Graph tags (og:title, og:description, og:image), Twitter card tags, canonical URL, alternates (hreflang for EN/AR), and proper title template chain.",
      },
      {
        id: "check-schema",
        name: "Structured Data Validation",
        nameAr: "التحقق من البيانات المنظمة",
        type: "check",
        description: "Validates JSON-LD schema markup on content pages",
        systemPrompt:
          "Check for proper JSON-LD structured data: Article pages need Article schema, product pages need Product schema, FAQ pages need FAQPage schema, event pages need Event schema. Validate required fields per schema.org spec.",
      },
    ],
    priority: "high",
    enabled: true,
  },

  // ── CONTENT AUTOMATION ──────────────────────────

  {
    id: "content-quality",
    name: "Content Quality Gate",
    nameAr: "بوابة جودة المحتوى",
    description:
      "Validates article quality: readability score, bilingual completeness, affiliate link density, image alt text, and internal linking.",
    category: "content",
    icon: "PenTool",
    triggers: {
      keywords: [
        "article",
        "blog",
        "content",
        "post",
        "publish",
        "editorial",
      ],
      events: ["manual"],
      directories: ["app/blog/", "app/api/articles/"],
    },
    actions: [
      {
        id: "check-readability",
        name: "Readability Analysis",
        nameAr: "تحليل القراءة",
        type: "check",
        description: "Checks Flesch-Kincaid score, sentence length, paragraphs",
        systemPrompt:
          "Analyze content readability: aim for Flesch-Kincaid grade 8-10, sentences under 25 words, paragraphs under 150 words. Check for: passive voice overuse, jargon without explanation, missing subheadings every 300 words, and proper introduction/conclusion structure.",
      },
      {
        id: "check-bilingual",
        name: "Bilingual Completeness",
        nameAr: "اكتمال المحتوى ثنائي اللغة",
        type: "check",
        description: "Ensures AR content matches EN content structure",
        systemPrompt:
          "Verify bilingual completeness: every EN field has an AR equivalent, AR content is actual translation (not placeholder), RTL formatting is correct, Arabic typography uses proper fonts, and cultural adaptation is appropriate (not just translation).",
      },
    ],
    priority: "medium",
    enabled: true,
  },

  // ── DEPLOYMENT ──────────────────────────────────

  {
    id: "deploy-checklist",
    name: "Deploy Checklist",
    nameAr: "قائمة تحقق النشر",
    description:
      "Pre-deployment validation: env vars, build success, DB migrations, feature flags, and rollback plan.",
    category: "deployment",
    icon: "Rocket",
    triggers: {
      keywords: ["deploy", "release", "production", "ship"],
      events: ["pre-deploy"],
    },
    actions: [
      {
        id: "check-env",
        name: "Environment Validation",
        nameAr: "التحقق من البيئة",
        type: "validate",
        description: "Verifies all required env vars are set",
        endpoint: "/api/admin/operations-hub",
      },
      {
        id: "check-build",
        name: "Build Verification",
        nameAr: "التحقق من البناء",
        type: "validate",
        description: "Runs production build and checks for errors",
        command: "npx next build",
      },
      {
        id: "check-migrations",
        name: "Migration Status",
        nameAr: "حالة الترحيل",
        type: "check",
        description: "Ensures Prisma migrations are up to date",
        command: "npx prisma migrate status",
      },
    ],
    priority: "critical",
    enabled: true,
  },

  // ── DATA & ANALYTICS ────────────────────────────

  {
    id: "data-integrity",
    name: "Data Integrity Monitor",
    nameAr: "مراقب سلامة البيانات",
    description:
      "Validates database consistency: orphaned records, missing relations, data quality metrics, and multi-tenant data isolation.",
    category: "data",
    icon: "Database",
    triggers: {
      filePatterns: ["**/prisma/schema.prisma", "**/migrations/**"],
      keywords: ["data", "database", "migration", "prisma", "orphan"],
      events: ["cron-daily"],
    },
    actions: [
      {
        id: "check-orphans",
        name: "Orphan Record Detection",
        nameAr: "كشف السجلات اليتيمة",
        type: "check",
        description: "Finds records with broken foreign key references",
        systemPrompt:
          "Generate Prisma queries to detect orphaned records: Articles without a Site, Products without prices, Purchases without a customer email, Media without associated articles, and any record where a required relation is null.",
      },
      {
        id: "check-tenant-isolation",
        name: "Multi-Tenant Isolation Audit",
        nameAr: "تدقيق عزل المستأجرين",
        type: "check",
        description: "Verifies data isolation between sites",
        systemPrompt:
          "Audit multi-tenant data isolation: verify all queries include siteId filter, check that API routes scope data to the current tenant, ensure admin routes validate site ownership, and check for cross-tenant data leakage in shared tables.",
      },
    ],
    priority: "high",
    enabled: true,
  },
];

// ═══════════════════════════════════════════════════════
//  SKILL ENGINE
// ═══════════════════════════════════════════════════════

/**
 * Get all registered skills
 */
export function getAllSkills(): Skill[] {
  return skills;
}

/**
 * Get skills by category
 */
export function getSkillsByCategory(category: SkillCategory): Skill[] {
  return skills.filter((s) => s.category === category);
}

/**
 * Find skills that should auto-activate for a given context
 */
export function findMatchingSkills(context: {
  filePath?: string;
  keywords?: string[];
  event?: SkillEvent;
  directory?: string;
}): Skill[] {
  return skills.filter((skill) => {
    if (!skill.enabled) return false;

    const t = skill.triggers;

    // Match file patterns
    if (context.filePath && t.filePatterns) {
      const matchesFile = t.filePatterns.some((pattern) => {
        const regex = globToRegex(pattern);
        return regex.test(context.filePath!);
      });
      if (matchesFile) return true;
    }

    // Match keywords
    if (context.keywords && t.keywords) {
      const matchesKeyword = t.keywords.some((kw) =>
        context.keywords!.some(
          (ck) =>
            ck.toLowerCase().includes(kw.toLowerCase()) ||
            kw.toLowerCase().includes(ck.toLowerCase()),
        ),
      );
      if (matchesKeyword) return true;
    }

    // Match events
    if (context.event && t.events) {
      if (t.events.includes(context.event)) return true;
    }

    // Match directories
    if (context.directory && t.directories) {
      const matchesDir = t.directories.some((d) =>
        context.directory!.includes(d),
      );
      if (matchesDir) return true;
    }

    return false;
  });
}

/**
 * Get skill by ID
 */
export function getSkillById(id: string): Skill | undefined {
  return skills.find((s) => s.id === id);
}

/**
 * Get skills that should run for a given event
 */
export function getEventSkills(event: SkillEvent): Skill[] {
  return skills.filter(
    (s) => s.enabled && s.triggers.events?.includes(event),
  );
}

/**
 * Get all skill categories with counts
 */
export function getSkillCategories(): {
  category: SkillCategory;
  count: number;
  label: string;
}[] {
  const categoryLabels: Record<SkillCategory, string> = {
    "code-quality": "Code Quality",
    testing: "Testing",
    security: "Security",
    performance: "Performance",
    deployment: "Deployment",
    content: "Content",
    seo: "SEO",
    design: "Design",
    data: "Data",
    operations: "Operations",
    requirements: "Requirements",
    automation: "Automation",
  };

  const counts: Record<string, number> = {};
  skills.forEach((s) => {
    counts[s.category] = (counts[s.category] || 0) + 1;
  });

  return Object.entries(categoryLabels).map(([cat, label]) => ({
    category: cat as SkillCategory,
    count: counts[cat] || 0,
    label,
  }));
}

// ── Helpers ──────────────────────────────────────────

function globToRegex(glob: string): RegExp {
  const escaped = glob
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "{{GLOBSTAR}}")
    .replace(/\*/g, "[^/]*")
    .replace(/\{\{GLOBSTAR\}\}/g, ".*");
  return new RegExp(`^${escaped}$`);
}
