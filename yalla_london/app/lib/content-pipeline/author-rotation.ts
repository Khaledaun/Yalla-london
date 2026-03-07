/**
 * Author Rotation Module
 *
 * Replaces generic "Editorial" bylines with real author personas using
 * the existing TeamMember + ContentCredit Prisma models.
 *
 * Strategy:
 * - Each site has 2-3 TeamMember profiles with real names, bios, social links
 * - getNextAuthor() picks the author with fewest recent ContentCredits (load-balanced)
 * - assignAuthor() creates a ContentCredit record linking the TeamMember to the content
 *
 * This directly addresses the January 2026 Authenticity Update which actively
 * demotes anonymous/generic "Editorial" bylines (Gemini audit action #2).
 */

export interface AuthorProfile {
  id: string;
  name: string;
  nameAr: string | null;
  slug: string;
  title: string;
  bio: string;
  bioAr: string | null;
  avatarUrl: string | null;
  linkedinUrl: string | null;
  twitterUrl: string | null;
  instagramUrl: string | null;
  websiteUrl: string | null;
}

/**
 * Get the next author for content assignment, load-balanced by recent credits.
 * Picks the TeamMember with fewest ContentCredits in the last 30 days.
 * Falls back to a generic profile if no TeamMembers exist for the site.
 */
export async function getNextAuthor(siteId: string): Promise<AuthorProfile> {
  const { prisma } = await import("@/lib/db");

  try {
    // Find active TeamMembers for this site (or global members)
    const members = await prisma.teamMember.findMany({
      where: {
        is_active: true,
        OR: [
          { site_id: null }, // global team members
          { site: { slug: siteId } }, // site-specific via Site.slug
        ],
      },
      include: {
        content_credits: {
          where: {
            created_at: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          },
          select: { id: true },
        },
      },
      orderBy: { display_order: "asc" },
    });

    if (members.length === 0) {
      // No TeamMembers yet — return a fallback that won't crash
      const { getSiteConfig } = await import("@/config/sites");
      const site = getSiteConfig(siteId);
      return {
        id: "",
        name: `${site?.name || "Editorial"} Team`,
        nameAr: null,
        slug: "editorial",
        title: "Travel Content Writer",
        bio: "",
        bioAr: null,
        avatarUrl: null,
        linkedinUrl: null,
        twitterUrl: null,
        instagramUrl: null,
        websiteUrl: null,
      };
    }

    // Pick the member with fewest recent credits (load-balanced)
    members.sort((a, b) => a.content_credits.length - b.content_credits.length);
    const chosen = members[0];

    return {
      id: chosen.id,
      name: chosen.name_en,
      nameAr: chosen.name_ar,
      slug: chosen.slug,
      title: chosen.title_en,
      bio: chosen.bio_en,
      bioAr: chosen.bio_ar,
      avatarUrl: chosen.avatar_url,
      linkedinUrl: chosen.linkedin_url,
      twitterUrl: chosen.twitter_url,
      instagramUrl: chosen.instagram_url,
      websiteUrl: chosen.website_url,
    };
  } catch (err) {
    console.warn("[author-rotation] Failed to get next author:", err instanceof Error ? err.message : err);
    const { getSiteConfig } = await import("@/config/sites");
    const site = getSiteConfig(siteId);
    return {
      id: "",
      name: `${site?.name || "Editorial"} Team`,
      nameAr: null,
      slug: "editorial",
      title: "Travel Content Writer",
      bio: "",
      bioAr: null,
      avatarUrl: null,
      linkedinUrl: null,
      twitterUrl: null,
      instagramUrl: null,
      websiteUrl: null,
    };
  }
}

/**
 * Assign an author to a piece of content by creating a ContentCredit record.
 */
export async function assignAuthor(
  teamMemberId: string,
  contentType: string,
  contentId: string,
  role: "AUTHOR" | "EDITOR" | "REVIEWER" = "AUTHOR",
): Promise<void> {
  if (!teamMemberId) return; // skip if no real TeamMember

  const { prisma } = await import("@/lib/db");

  try {
    await prisma.contentCredit.upsert({
      where: {
        team_member_id_content_type_content_id: {
          team_member_id: teamMemberId,
          content_type: contentType,
          content_id: contentId,
        },
      },
      create: {
        team_member_id: teamMemberId,
        content_type: contentType,
        content_id: contentId,
        role,
      },
      update: {
        role,
      },
    });
  } catch (err) {
    console.warn("[author-rotation] Failed to assign author:", err instanceof Error ? err.message : err);
  }
}

/**
 * Get author profile for a published BlogPost by looking up its ContentCredit.
 * Returns null if no author assigned.
 */
export async function getAuthorForPost(blogPostId: string): Promise<AuthorProfile | null> {
  const { prisma } = await import("@/lib/db");

  try {
    const credit = await prisma.contentCredit.findFirst({
      where: {
        content_type: "blog_post",
        content_id: blogPostId,
        role: "AUTHOR",
      },
      include: {
        team_member: true,
      },
    });

    if (!credit?.team_member) return null;
    const m = credit.team_member;

    return {
      id: m.id,
      name: m.name_en,
      nameAr: m.name_ar,
      slug: m.slug,
      title: m.title_en,
      bio: m.bio_en,
      bioAr: m.bio_ar,
      avatarUrl: m.avatar_url,
      linkedinUrl: m.linkedin_url,
      twitterUrl: m.twitter_url,
      instagramUrl: m.instagram_url,
      websiteUrl: m.website_url,
    };
  } catch {
    return null;
  }
}

/**
 * Build Person JSON-LD for structured data from an AuthorProfile.
 */
export function buildAuthorJsonLd(author: AuthorProfile, baseUrl: string): Record<string, unknown> {
  const sameAs: string[] = [];
  if (author.linkedinUrl) sameAs.push(author.linkedinUrl);
  if (author.twitterUrl) sameAs.push(author.twitterUrl);
  if (author.instagramUrl) sameAs.push(author.instagramUrl);
  if (author.websiteUrl) sameAs.push(author.websiteUrl);

  return {
    "@type": "Person",
    name: author.name,
    url: author.slug !== "editorial" ? `${baseUrl}/team/${author.slug}` : undefined,
    jobTitle: author.title,
    ...(author.avatarUrl ? { image: author.avatarUrl } : {}),
    ...(sameAs.length > 0 ? { sameAs } : {}),
  };
}
