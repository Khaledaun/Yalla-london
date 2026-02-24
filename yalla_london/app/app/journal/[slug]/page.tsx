import { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Calendar,
  Clock,
  ArrowLeft,
  Anchor,
  ArrowRight,
  Tag,
} from "lucide-react";
import { getBaseUrl } from "@/lib/url-utils";
import { getDefaultSiteId, getSiteConfig, getSiteDomain } from "@/config/sites";
import { sanitizeHtml } from "@/lib/html-sanitizer";
import { StructuredData } from "@/components/structured-data";

/* ═══════════════════════════════════════════════════════════════════
   METADATA
   ═══════════════════════════════════════════════════════════════════ */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const baseUrl = await getBaseUrl();
  const headersList = await headers();
  const siteId = headersList.get("x-site-id") || getDefaultSiteId();
  const siteConfig = getSiteConfig(siteId);
  const siteName = siteConfig?.name || "Zenitha Yachts";
  const siteDomain = getSiteDomain(siteId);
  const canonicalUrl = `${baseUrl}/journal/${slug}`;

  /* Try loading article title from DB */
  let title = `Charter Guide | ${siteName}`;
  let description =
    "Expert charter guide and sailing advice from the Zenitha Yachts team.";
  let ogImage = `${siteDomain}/images/${siteConfig?.slug || "zenitha-yachts"}-og.jpg`;

  try {
    const { prisma } = await import("@/lib/db");
    const post = await prisma.blogPost.findFirst({
      where: { slug, siteId, published: true, deletedAt: null },
      select: {
        title_en: true,
        excerpt_en: true,
        meta_description: true,
        featured_image: true,
      },
    });
    if (post) {
      title = `${post.title_en} | ${siteName}`;
      description =
        post.meta_description || post.excerpt_en || description;
      if (post.featured_image) ogImage = post.featured_image;
    }
  } catch {
    /* fallback to defaults */
  }

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        "en-GB": canonicalUrl,
        "ar-SA": `${baseUrl}/ar/journal/${slug}`,
        "x-default": canonicalUrl,
      },
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName,
      locale: "en_GB",
      alternateLocale: "ar_SA",
      type: "article",
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large" as const,
        "max-snippet": -1,
      },
    },
  };
}

/* ═══════════════════════════════════════════════════════════════════
   PAGE COMPONENT
   ═══════════════════════════════════════════════════════════════════ */

export default async function JournalArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const headersList = await headers();
  const siteId = headersList.get("x-site-id") || getDefaultSiteId();
  const siteName = getSiteConfig(siteId)?.name || "Zenitha Yachts";
  const baseUrl = await getBaseUrl();

  /* Load article from DB */
  let post: {
    title_en: string;
    content_en: string | null;
    excerpt_en: string | null;
    slug: string;
    published_at: Date | null;
    featured_image: string | null;
    reading_time: number | null;
    author: { name: string } | null;
    category: { name: string; slug: string } | null;
  } | null = null;

  try {
    const { prisma } = await import("@/lib/db");
    post = await prisma.blogPost.findFirst({
      where: { slug, siteId, published: true, deletedAt: null },
      select: {
        title_en: true,
        content_en: true,
        excerpt_en: true,
        slug: true,
        published_at: true,
        featured_image: true,
        reading_time: true,
        author: { select: { name: true } },
        category: { select: { name: true, slug: true } },
      },
    });
  } catch (e) {
    console.warn("[journal-article] DB query failed:", e instanceof Error ? e.message : "unknown");
  }

  if (!post) {
    notFound();
  }

  const publishedDate = post.published_at
    ? new Date(post.published_at).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  /* Article structured data */
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title_en,
    description: post.excerpt_en || "",
    url: `${baseUrl}/journal/${slug}`,
    datePublished: post.published_at?.toISOString(),
    author: {
      "@type": "Person",
      name: post.author?.name || "Zenitha Yachts Editorial",
    },
    publisher: {
      "@type": "Organization",
      name: siteName,
      url: baseUrl,
    },
    ...(post.featured_image && {
      image: {
        "@type": "ImageObject",
        url: post.featured_image,
      },
    }),
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${baseUrl}/journal/${slug}`,
    },
  };

  return (
    <>
      {/* Breadcrumb */}
      <StructuredData
        type="breadcrumb"
        siteId={siteId}
        data={{
          items: [
            { name: "Home", url: baseUrl },
            { name: "Journal", url: `${baseUrl}/journal` },
            { name: post.title_en, url: `${baseUrl}/journal/${slug}` },
          ],
        }}
      />

      {/* Article JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />

      <main>
        {/* ═══ Hero / Header ═══════════════════════════════════ */}
        <section
          style={{
            background: "var(--z-gradient-hero-vertical)",
            color: "var(--z-pearl)",
            position: "relative",
          }}
        >
          <div
            className="z-container"
            style={{ position: "relative", zIndex: 1 }}
          >
            <div
              style={{
                paddingTop: "clamp(96px, 10vw, 140px)",
                paddingBottom: "var(--z-space-12)",
                maxWidth: "var(--z-container-text)",
                marginInline: "auto",
              }}
            >
              {/* Back link */}
              <Link
                href="/journal"
                className="z-text-caption"
                style={{
                  color: "var(--z-champagne)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "var(--z-space-2)",
                  marginBottom: "var(--z-space-6)",
                  textDecoration: "none",
                }}
              >
                <ArrowLeft size={14} />
                Back to Journal
              </Link>

              {/* Category */}
              {post.category && (
                <span className="z-badge z-badge-gold" style={{ marginBottom: "var(--z-space-4)", display: "inline-flex" }}>
                  <Tag className="w-3 h-3" />
                  {post.category.name}
                </span>
              )}

              {/* H1 */}
              <h1
                className="z-text-display"
                style={{
                  color: "var(--z-pearl)",
                  marginBottom: "var(--z-space-6)",
                }}
              >
                {post.title_en}
              </h1>

              {/* Byline */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--z-space-6)",
                  flexWrap: "wrap",
                }}
              >
                <span
                  className="z-text-body"
                  style={{ color: "var(--z-champagne)" }}
                >
                  By{" "}
                  <strong style={{ color: "var(--z-pearl)" }}>
                    {post.author?.name || "Zenitha Yachts Editorial"}
                  </strong>
                </span>
                {publishedDate && (
                  <span
                    className="z-text-caption"
                    style={{
                      color: "var(--z-champagne)",
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--z-space-2)",
                    }}
                  >
                    <Calendar size={14} />
                    {publishedDate}
                  </span>
                )}
                {post.reading_time && (
                  <span
                    className="z-text-caption"
                    style={{
                      color: "var(--z-champagne)",
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--z-space-2)",
                    }}
                  >
                    <Clock size={14} />
                    {post.reading_time} min read
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ═══ Featured Image ══════════════════════════════════ */}
        {post.featured_image && (
          <div
            style={{
              background: "var(--z-pearl)",
              paddingBottom: "var(--z-space-8)",
            }}
          >
            <div className="z-container">
              <div
                style={{
                  maxWidth: "var(--z-container-text)",
                  marginInline: "auto",
                  position: "relative",
                  aspectRatio: "16/9",
                  borderRadius: "var(--z-radius-lg)",
                  overflow: "hidden",
                }}
              >
                <Image
                  src={post.featured_image}
                  alt={post.title_en}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 800px"
                  priority
                />
              </div>
            </div>
          </div>
        )}

        {/* ═══ Article Body ════════════════════════════════════ */}
        <section
          className="z-section"
          style={{ background: "var(--z-pearl)" }}
        >
          <div className="z-container">
            <div
              style={{
                maxWidth: "var(--z-container-text)",
                marginInline: "auto",
              }}
            >
              {post.content_en ? (
                <div
                  className="z-prose"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHtml(post.content_en),
                  }}
                />
              ) : (
                <div className="z-prose">
                  <p
                    className="z-text-body-lg"
                    style={{
                      color: "var(--z-muted)",
                      lineHeight: "var(--z-leading-relaxed)",
                    }}
                  >
                    {post.excerpt_en ||
                      "This article is being prepared by our editorial team. Check back soon for the full content."}
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ═══ Internal Links / CTA ═══════════════════════════ */}
        <section
          className="z-section"
          style={{ background: "var(--z-sand)" }}
        >
          <div className="z-container">
            <div
              style={{
                maxWidth: "var(--z-container-text)",
                marginInline: "auto",
                display: "grid",
                gridTemplateColumns: "1fr",
                gap: "var(--z-space-6)",
              }}
              className="journal-cta-grid"
            >
              <Link
                href="/journal"
                className="z-card"
                style={{
                  padding: "var(--z-space-6)",
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--z-space-4)",
                  textDecoration: "none",
                }}
              >
                <ArrowLeft size={20} style={{ color: "var(--z-gold)" }} />
                <div>
                  <p
                    className="z-text-caption"
                    style={{ margin: 0 }}
                  >
                    More Articles
                  </p>
                  <p
                    className="z-text-heading"
                    style={{
                      margin: 0,
                      color: "var(--z-navy)",
                    }}
                  >
                    Back to the Journal
                  </p>
                </div>
              </Link>

              <Link
                href="/charter-planner"
                className="z-card"
                style={{
                  padding: "var(--z-space-6)",
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--z-space-4)",
                  textDecoration: "none",
                  background: "var(--z-navy)",
                }}
              >
                <Anchor size={20} style={{ color: "var(--z-gold)" }} />
                <div style={{ flex: 1 }}>
                  <p
                    className="z-text-caption"
                    style={{ margin: 0, color: "var(--z-champagne)" }}
                  >
                    Inspired?
                  </p>
                  <p
                    className="z-text-heading"
                    style={{ margin: 0, color: "var(--z-pearl)" }}
                  >
                    Plan Your Charter
                  </p>
                </div>
                <ArrowRight size={20} style={{ color: "var(--z-gold)" }} />
              </Link>

              <style>{`
                @media (min-width: 768px) {
                  .journal-cta-grid {
                    grid-template-columns: 1fr 1fr !important;
                  }
                }
              `}</style>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
