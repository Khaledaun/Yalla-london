/**
 * Validate that every destination in BLOG_REDIRECTS + PAGE_REDIRECTS points
 * to a published BlogPost or a real static route.
 *
 * A redirect to a nonexistent slug makes the middleware 301 to a 404, which
 * Google caches as "Page redirects to a page with a 404" and drops the
 * source URL from the index.
 *
 * Usage:
 *   npx tsx scripts/validate-redirect-map.ts [--site=yalla-london]
 *
 * CI:
 *   Exits with code 1 if any redirect target is broken.
 *
 * Admin trigger: can be POSTed from the cockpit via /api/admin/validate-redirects
 * (wraps this same logic).
 */
import { prisma } from "@/lib/db";
import { BLOG_REDIRECTS, PAGE_REDIRECTS } from "@/lib/seo/redirect-map";
import { getDefaultSiteId, getActiveSiteIds } from "@/config/sites";

type RedirectIssue = {
  source: string;
  target: string;
  reason: string;
};

const STATIC_ROUTES = new Set<string>([
  "/", "/hotels", "/experiences", "/recommendations", "/events", "/news",
  "/blog", "/shop", "/itineraries", "/destinations", "/about", "/contact",
  "/faq", "/glossary", "/halal-charter", "/halal-restaurants-london",
  "/london-with-kids", "/london-by-foot", "/privacy", "/terms", "/team",
  "/editorial-policy", "/affiliate-disclosure", "/how-it-works", "/journal",
  "/charter-planner", "/fleet", "/yachts", "/inquiry", "/tools",
  "/tools/seo-audit", "/information",
]);

async function validateBlogRedirectsForSite(siteId: string): Promise<RedirectIssue[]> {
  const issues: RedirectIssue[] = [];

  const uniqueTargets = new Set<string>(Object.values(BLOG_REDIRECTS));
  const targetSlugs = [...uniqueTargets].map((path) => path.replace(/^\/blog\//, ""));

  const published = await prisma.blogPost.findMany({
    where: { siteId, published: true, deletedAt: null, slug: { in: targetSlugs } },
    select: { slug: true },
  });
  const publishedSet = new Set(published.map((p) => p.slug));

  for (const [source, target] of Object.entries(BLOG_REDIRECTS)) {
    const targetSlug = target.replace(/^\/blog\//, "");
    if (!publishedSet.has(targetSlug)) {
      issues.push({
        source,
        target,
        reason: `Target blog slug "${targetSlug}" is not a published BlogPost for site "${siteId}"`,
      });
    }
    if (BLOG_REDIRECTS[target]) {
      issues.push({
        source,
        target,
        reason: `Redirect CHAIN: target "${target}" is itself a redirect source (loop risk)`,
      });
    }
  }

  for (const [source, target] of Object.entries(PAGE_REDIRECTS)) {
    if (STATIC_ROUTES.has(target)) continue;
    issues.push({
      source,
      target,
      reason: `Target "${target}" is not in STATIC_ROUTES — verify it is a real route`,
    });
  }

  return issues;
}

export async function validateRedirectMap(siteId?: string): Promise<{
  siteId: string;
  totalRedirects: number;
  issues: RedirectIssue[];
}> {
  const effectiveSiteId = siteId || getDefaultSiteId();
  const issues = await validateBlogRedirectsForSite(effectiveSiteId);
  return {
    siteId: effectiveSiteId,
    totalRedirects: Object.keys(BLOG_REDIRECTS).length + Object.keys(PAGE_REDIRECTS).length,
    issues,
  };
}

async function main() {
  const arg = process.argv.find((a) => a.startsWith("--site="));
  const siteIds = arg ? [arg.replace("--site=", "")] : getActiveSiteIds();

  let totalIssues = 0;
  for (const siteId of siteIds) {
    const result = await validateRedirectMap(siteId);
    console.log(`\n=== ${siteId} (${result.totalRedirects} redirects) ===`);
    if (result.issues.length === 0) {
      console.log("  All redirect targets valid ✓");
    } else {
      console.log(`  ${result.issues.length} issue(s):`);
      for (const issue of result.issues) {
        console.log(`    ✗ ${issue.source}`);
        console.log(`      → ${issue.target}`);
        console.log(`      ${issue.reason}`);
      }
      totalIssues += result.issues.length;
    }
  }

  await prisma.$disconnect();
  if (totalIssues > 0) {
    console.error(`\n${totalIssues} broken redirect(s). Fix before deploying.`);
    process.exit(1);
  }
  console.log("\nAll redirects validated ✓");
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
