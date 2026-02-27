/**
 * Development Plan Generator for New Sites
 *
 * Generates a structured development plan (markdown + DevTask records)
 * from the new site wizard configuration. Designed to be both human-readable
 * and Claude Code-executable.
 */

interface SiteConfig {
  siteId: string;
  name: string;
  tagline: string;
  domain: string;
  siteType: "travel_blog" | "yacht_charter" | "other";
  primaryLanguage: "en" | "ar";
  secondaryLanguage: "en" | "ar" | "none";
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  topics: string[];
  affiliates: string[];
  contentVelocity: number;
  researchNotes?: string;
  targetKeywords?: string[];
  automations?: string[];
}

interface PlanStep {
  title: string;
  description: string;
  category: string;
  priority: "critical" | "high" | "medium" | "low";
  actionLabel?: string;
  actionApi?: string;
  actionPayload?: Record<string, unknown>;
}

export interface DevelopmentPlan {
  siteId: string;
  siteName: string;
  markdown: string;
  steps: PlanStep[];
}

export function generateDevelopmentPlan(config: SiteConfig): DevelopmentPlan {
  const steps: PlanStep[] = [];
  const sections: string[] = [];

  // Header
  sections.push(`# ${config.name} — Development Plan`);
  sections.push(`\n**Site ID:** \`${config.siteId}\``);
  sections.push(`**Domain:** ${config.domain}`);
  sections.push(`**Type:** ${config.siteType.replace("_", " ")}`);
  sections.push(`**Languages:** ${config.primaryLanguage.toUpperCase()}${config.secondaryLanguage !== "none" ? ` + ${config.secondaryLanguage.toUpperCase()}` : ""}`);
  sections.push(`**Generated:** ${new Date().toISOString().slice(0, 10)}`);

  // Phase 1: Configuration
  sections.push(`\n## Phase 1: Configuration`);

  steps.push({
    title: `Add ${config.siteId} to config/sites.ts`,
    description: `Register site with: name="${config.name}", domain="${config.domain}", colors=[${config.primaryColor}, ${config.secondaryColor}, ${config.accentColor}], topics=[${config.topics.join(", ")}], affiliates=[${config.affiliates.join(", ")}]`,
    category: "config",
    priority: "critical",
  });
  sections.push(`- [ ] Add \`${config.siteId}\` to \`config/sites.ts\``);

  steps.push({
    title: `Add ${config.domain} to middleware.ts`,
    description: `Map domain ${config.domain} to siteId ${config.siteId} in the DOMAIN_SITE_MAP. Include both www and non-www.`,
    category: "config",
    priority: "critical",
  });
  sections.push(`- [ ] Add \`${config.domain}\` to \`middleware.ts\` domain mapping`);

  steps.push({
    title: `Create destination theme for ${config.siteId}`,
    description: `Add entry in config/destination-themes.ts with primaryColor=${config.primaryColor}, secondaryColor=${config.secondaryColor}, accentColor=${config.accentColor}`,
    category: "config",
    priority: "high",
  });
  sections.push(`- [ ] Create destination theme in \`config/destination-themes.ts\``);

  // Phase 2: Content System
  sections.push(`\n## Phase 2: Content Pipeline`);

  steps.push({
    title: `Write system prompts for ${config.name}`,
    description: `Create EN${config.secondaryLanguage !== "none" ? " + AR" : ""} system prompts in sites.ts. Must include: 1,500+ word target, heading hierarchy, 3+ internal links, 2+ affiliate links (${config.affiliates.join(", ")}), focus keyword in title/first paragraph/H2.`,
    category: "content",
    priority: "critical",
  });
  sections.push(`- [ ] Write comprehensive system prompts (EN${config.secondaryLanguage !== "none" ? " + AR" : ""})`);

  steps.push({
    title: `Generate initial topic proposals`,
    description: `Run weekly-topics cron for ${config.siteId} to generate 30+ topic proposals across: ${config.topics.join(", ")}`,
    category: "content",
    priority: "high",
    actionLabel: "Generate Topics",
    actionApi: "/api/cron/weekly-topics",
    actionPayload: { siteId: config.siteId },
  });
  sections.push(`- [ ] Generate 30+ topic proposals`);

  steps.push({
    title: `Build 3 seed articles`,
    description: `Run content-builder to create 3 initial articles for ${config.name}. These will be the first published content to establish the site.`,
    category: "content",
    priority: "high",
    actionLabel: "Build Content",
    actionApi: "/api/cron/content-builder",
    actionPayload: { siteId: config.siteId },
  });
  sections.push(`- [ ] Build 3 seed articles via content builder`);

  // Phase 3: SEO Setup
  sections.push(`\n## Phase 3: SEO & Indexing`);

  steps.push({
    title: `Set up IndexNow for ${config.domain}`,
    description: `Configure INDEXNOW_KEY and submit to Bing/Google. Verify key file accessible at ${config.domain}/${config.siteId}-indexnow-key.txt`,
    category: "seo",
    priority: "high",
  });
  sections.push(`- [ ] Configure IndexNow key`);

  steps.push({
    title: `Add Google Search Console property`,
    description: `Add ${config.domain} to GSC. Set GSC_SITE_URL_${config.siteId.toUpperCase().replace(/-/g, "_")} env var.`,
    category: "seo",
    priority: "high",
  });
  sections.push(`- [ ] Add GSC property for \`${config.domain}\``);

  steps.push({
    title: `Create OG image for ${config.name}`,
    description: `Create branded OG image at public/images/${config.siteId}-og.jpg with brand colors and logo.`,
    category: "seo",
    priority: "medium",
  });
  sections.push(`- [ ] Create branded OG image`);

  // Phase 4: Affiliates
  if (config.affiliates.length > 0) {
    sections.push(`\n## Phase 4: Affiliate Setup`);

    for (const affiliate of config.affiliates) {
      steps.push({
        title: `Set up ${affiliate} affiliate account`,
        description: `Register for ${affiliate} affiliate program. Get API key/tracking ID. Add to site config affiliateCategories.`,
        category: "revenue",
        priority: "medium",
      });
      sections.push(`- [ ] Register ${affiliate} affiliate program`);
    }

    steps.push({
      title: `Configure affiliate injection for ${config.siteId}`,
      description: `Add destination-specific affiliate URLs for ${config.name} in affiliate-injection cron and select-runner.ts`,
      category: "revenue",
      priority: "medium",
    });
    sections.push(`- [ ] Wire affiliate injection for this site`);
  }

  // Phase 5: Deployment
  sections.push(`\n## Phase 5: Deployment`);

  steps.push({
    title: `Add ${config.domain} to Vercel project`,
    description: `Go to Vercel dashboard → Settings → Domains → Add ${config.domain}. Copy DNS records.`,
    category: "deploy",
    priority: "critical",
  });
  sections.push(`- [ ] Add domain to Vercel project`);

  steps.push({
    title: `Set up DNS records`,
    description: `Point ${config.domain} CNAME to cname.vercel-dns.com. If using root domain, add A records for 76.76.21.21.`,
    category: "deploy",
    priority: "critical",
  });
  sections.push(`- [ ] Configure DNS records`);

  steps.push({
    title: `Add environment variables`,
    description: `Add to Vercel: GA4_MEASUREMENT_ID_${config.siteId.toUpperCase().replace(/-/g, "_")}, GSC_SITE_URL_${config.siteId.toUpperCase().replace(/-/g, "_")}, GA4_PROPERTY_ID_${config.siteId.toUpperCase().replace(/-/g, "_")}`,
    category: "deploy",
    priority: "high",
  });
  sections.push(`- [ ] Add per-site environment variables`);

  // Phase 6: Automation
  sections.push(`\n## Phase 6: Automation`);

  steps.push({
    title: `Verify cron jobs process ${config.siteId}`,
    description: `Confirm weekly-topics, content-builder, content-selector, affiliate-injection, and SEO agent all include ${config.siteId} in their active site loops.`,
    category: "automation",
    priority: "high",
  });
  sections.push(`- [ ] Verify all cron jobs include ${config.siteId}`);

  steps.push({
    title: `Set content velocity to ${config.contentVelocity}/day`,
    description: `Ensure content-selector promotes up to ${config.contentVelocity} article(s) per day for ${config.siteId}.`,
    category: "automation",
    priority: "medium",
  });
  sections.push(`- [ ] Set content velocity: ${config.contentVelocity}/day`);

  // Yacht-specific
  if (config.siteType === "yacht_charter") {
    sections.push(`\n## Phase 7: Yacht-Specific Setup`);

    steps.push({
      title: `Add yacht models to Prisma schema`,
      description: `Add Yacht, YachtDestination, CharterItinerary, CharterInquiry, BrokerPartner models if not already present.`,
      category: "yacht",
      priority: "critical",
    });
    sections.push(`- [ ] Verify yacht Prisma models exist`);

    steps.push({
      title: `Create yacht admin pages`,
      description: `Build fleet management, inquiry CRM, destination editor, and itinerary planner admin pages at /admin/yachts.`,
      category: "yacht",
      priority: "high",
    });
    sections.push(`- [ ] Create yacht admin dashboard pages`);

    steps.push({
      title: `Create public yacht pages`,
      description: `Build yacht search, yacht detail, destination detail, itinerary detail, charter planner, and inquiry form public pages.`,
      category: "yacht",
      priority: "high",
    });
    sections.push(`- [ ] Create public yacht pages`);
  }

  // Research notes
  if (config.researchNotes) {
    sections.push(`\n## Research Notes\n`);
    sections.push("```markdown");
    sections.push(config.researchNotes);
    sections.push("```");
  }

  // Target keywords
  if (config.targetKeywords && config.targetKeywords.length > 0) {
    sections.push(`\n## Target Keywords\n`);
    for (const kw of config.targetKeywords) {
      sections.push(`- ${kw}`);
    }
  }

  // Summary
  sections.push(`\n## Summary`);
  sections.push(`\n| Metric | Value |`);
  sections.push(`|--------|-------|`);
  sections.push(`| Total steps | ${steps.length} |`);
  sections.push(`| Critical | ${steps.filter((s) => s.priority === "critical").length} |`);
  sections.push(`| High | ${steps.filter((s) => s.priority === "high").length} |`);
  sections.push(`| Medium | ${steps.filter((s) => s.priority === "medium").length} |`);
  sections.push(`| Content velocity | ${config.contentVelocity}/day |`);
  sections.push(`| Affiliate partners | ${config.affiliates.length} |`);

  return {
    siteId: config.siteId,
    siteName: config.name,
    markdown: sections.join("\n"),
    steps,
  };
}
