import Link from "next/link";
import Image from "next/image";
import { headers } from "next/headers";
import { Calendar, Clock, ArrowRight, Tag, Compass } from "lucide-react";
import { getBaseUrl } from "@/lib/url-utils";
import { getDefaultSiteId } from "@/config/sites";

/* ═══════════════════════════════════════════════════════════════════
   PLACEHOLDER ARTICLES — replaced by DB content once published
   ═══════════════════════════════════════════════════════════════════ */

interface JournalArticle {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  readTime: string;
  date: string;
  image: string;
  featured: boolean;
}

const PLACEHOLDER_ARTICLES: JournalArticle[] = [
  {
    slug: "first-time-charter-guide-mediterranean",
    title: "First-Time Charter Guide: Everything You Need to Know Before Booking a Mediterranean Yacht",
    excerpt:
      "From choosing the right yacht type to understanding APA costs, provisioning, and tipping etiquette — a comprehensive guide for first-time charterers in the Mediterranean.",
    category: "Charter Guides",
    readTime: "12 min read",
    date: "2026-02-20",
    image: "https://images.unsplash.com/photo-1528154291023-a6525fabe5b4?w=800&q=80&auto=format&fit=crop",
    featured: true,
  },
  {
    slug: "greek-islands-7-day-itinerary-cyclades",
    title: "7-Day Cyclades Sailing Itinerary: Santorini, Mykonos, Paros & Hidden Gems",
    excerpt:
      "A day-by-day sailing route through the Cyclades with recommended anchorages, restaurants, and the secluded bays only locals know about.",
    category: "Itineraries",
    readTime: "10 min read",
    date: "2026-02-15",
    image: "https://images.unsplash.com/photo-1696227213867-e16c8e082e8c?w=800&q=80&auto=format&fit=crop",
    featured: true,
  },
  {
    slug: "halal-catering-yacht-charter-guide",
    title: "Halal Catering on Yacht Charters: How We Source, Prepare & Serve",
    excerpt:
      "An inside look at how Zenitha arranges certified halal provisioning across Mediterranean ports — from Athens to Bodrum to Palma de Mallorca.",
    category: "Charter Experience",
    readTime: "8 min read",
    date: "2026-02-10",
    image: "https://images.unsplash.com/photo-1721488145498-3a8d7dfbab67?w=800&q=80&auto=format&fit=crop",
    featured: false,
  },
  {
    slug: "croatian-coast-dubrovnik-to-split",
    title: "Dubrovnik to Split: Sailing Croatia's Dalmatian Coast in 10 Days",
    excerpt:
      "Island-hopping from the walled city of Dubrovnik through Korčula, Hvar, and Vis to Split. Marinas, restaurants, and the best anchorages along the way.",
    category: "Itineraries",
    readTime: "11 min read",
    date: "2026-02-05",
    image: "https://images.unsplash.com/photo-1626690218773-09d845797704?w=800&q=80&auto=format&fit=crop",
    featured: false,
  },
  {
    slug: "motor-yacht-vs-catamaran-which-to-choose",
    title: "Motor Yacht vs Catamaran: Which Is Right for Your Charter?",
    excerpt:
      "A practical comparison of motor yachts and catamarans for charter — covering speed, comfort, stability, cost, and which works best for families, couples, and groups.",
    category: "Charter Guides",
    readTime: "7 min read",
    date: "2026-01-28",
    image: "https://images.unsplash.com/photo-1724261813677-05803b039805?w=800&q=80&auto=format&fit=crop",
    featured: false,
  },
  {
    slug: "turkish-riviera-blue-cruise-bodrum-fethiye",
    title: "The Blue Cruise: A Traditional Gulet Journey from Bodrum to Fethiye",
    excerpt:
      "Following the legendary blue cruise route along Turkey's Lycian coast aboard a traditional wooden gulet. Ancient ruins, turquoise bays, and authentic Turkish hospitality.",
    category: "Itineraries",
    readTime: "9 min read",
    date: "2026-01-20",
    image: "https://images.unsplash.com/photo-1569263979104-865ab7cd8d13?w=800&q=80&auto=format&fit=crop",
    featured: false,
  },
];

const CATEGORIES = [
  "All",
  "Charter Guides",
  "Itineraries",
  "Charter Experience",
  "Destinations",
  "Sailing Tips",
];

/* ═══════════════════════════════════════════════════════════════════
   ARTICLE CARD COMPONENT
   ═══════════════════════════════════════════════════════════════════ */

function ArticleCard({
  article,
  featured = false,
}: {
  article: JournalArticle;
  featured?: boolean;
}) {
  return (
    <Link
      href={`/journal/${article.slug}`}
      className="z-card group flex flex-col"
      style={{ background: "var(--z-surface)" }}
    >
      <div
        className="relative overflow-hidden"
        style={{
          aspectRatio: featured ? "16/9" : "3/2",
          background: "var(--z-gradient-card)",
        }}
      >
        <Image
          src={article.image}
          alt={article.title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes={
            featured
              ? "(max-width: 768px) 100vw, 66vw"
              : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          }
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to top, rgba(10,22,40,0.4), transparent 50%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "var(--z-space-4)",
            left: "var(--z-space-4)",
          }}
        >
          <span className="z-badge z-badge-gold">
            <Tag className="w-3 h-3" />
            {article.category}
          </span>
        </div>
      </div>

      <div className="z-card-body flex-1 flex flex-col">
        <h3
          className={`font-heading group-hover:text-[var(--z-aegean)] transition-colors ${featured ? "z-line-clamp-2" : "z-line-clamp-2"}`}
          style={{
            fontSize: featured
              ? "var(--z-text-title)"
              : "var(--z-text-heading)",
            fontWeight: "var(--z-weight-bold)",
            color: "var(--z-navy)",
            marginBottom: "var(--z-space-3)",
          }}
        >
          {article.title}
        </h3>

        <p
          className="z-line-clamp-2 font-body flex-1"
          style={{
            color: "var(--z-muted)",
            fontSize: "var(--z-text-body-sm)",
            marginBottom: "var(--z-space-4)",
            lineHeight: "var(--z-leading-relaxed)",
          }}
        >
          {article.excerpt}
        </p>

        <div
          className="flex items-center justify-between"
          style={{
            paddingTop: "var(--z-space-3)",
            borderTop: "1px solid var(--z-border-subtle)",
          }}
        >
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 z-text-caption">
              <Calendar className="w-3.5 h-3.5" style={{ color: "var(--z-gold)" }} />
              {new Date(article.date).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
            <span className="flex items-center gap-1 z-text-caption">
              <Clock className="w-3.5 h-3.5" style={{ color: "var(--z-gold)" }} />
              {article.readTime}
            </span>
          </div>
          <ArrowRight
            className="w-4 h-4 group-hover:translate-x-1 transition-transform"
            style={{ color: "var(--z-gold)" }}
          />
        </div>
      </div>
    </Link>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   PAGE COMPONENT
   ═══════════════════════════════════════════════════════════════════ */

export default async function JournalPage() {
  const headersList = await headers();
  const siteId = headersList.get("x-site-id") || getDefaultSiteId();
  const baseUrl = await getBaseUrl();

  /* Try loading articles from DB first */
  let articles: JournalArticle[] = PLACEHOLDER_ARTICLES;
  try {
    const { prisma } = await import("@/lib/db");
    const dbPosts = await prisma.blogPost.findMany({
      where: { siteId, published: true, deletedAt: null },
      orderBy: { published_at: "desc" },
      take: 12,
      select: {
        slug: true,
        title_en: true,
        excerpt_en: true,
        category: true,
        published_at: true,
        featured_image: true,
        reading_time: true,
      },
    });
    if (dbPosts.length > 0) {
      articles = dbPosts.map((p) => ({
        slug: p.slug,
        title: p.title_en || "Untitled",
        excerpt: p.excerpt_en || "",
        category: p.category?.name || "Charter Guides",
        readTime: p.reading_time ? `${p.reading_time} min read` : "8 min read",
        date: p.published_at?.toISOString().split("T")[0] || "2026-01-01",
        image: p.featured_image || PLACEHOLDER_ARTICLES[0].image,
        featured: false,
      }));
      // Mark first two as featured
      if (articles.length > 0) articles[0].featured = true;
      if (articles.length > 1) articles[1].featured = true;
    }
  } catch (e) {
    console.warn("[journal] DB query failed, using placeholder articles:", e instanceof Error ? e.message : "unknown");
  }

  const featured = articles.filter((a) => a.featured);
  const remaining = articles.filter((a) => !a.featured);

  /* Structured data: ItemList */
  const itemListData = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "The Zenitha Journal",
    description:
      "Charter guides, sailing itineraries, and destination stories for Mediterranean yacht holidays.",
    url: `${baseUrl}/journal`,
    numberOfItems: articles.length,
    itemListElement: articles.slice(0, 10).map((a, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${baseUrl}/journal/${a.slug}`,
      name: a.title,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListData) }}
      />

      <main>
        {/* ═══ Hero ══════════════════════════════════════════════ */}
        <section
          style={{
            background: "var(--z-gradient-hero-vertical)",
            color: "var(--z-pearl)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: "100px",
              background:
                "linear-gradient(to top, var(--z-pearl) 0%, transparent 100%)",
              pointerEvents: "none",
            }}
          />

          <div
            className="z-container"
            style={{ position: "relative", zIndex: 1 }}
          >
            <div
              style={{
                paddingTop: "clamp(96px, 12vw, 160px)",
                paddingBottom: "clamp(64px, 8vw, 100px)",
                maxWidth: "var(--z-container-text)",
                marginInline: "auto",
                textAlign: "center",
              }}
            >
              <p
                className="z-text-overline"
                style={{ marginBottom: "var(--z-space-4)" }}
              >
                The Zenitha Journal
              </p>

              <h1
                className="z-text-display"
                style={{
                  color: "var(--z-pearl)",
                  marginBottom: "var(--z-space-6)",
                }}
              >
                Charter Guides &{" "}
                <span style={{ color: "var(--z-gold)" }}>
                  Sailing Stories
                </span>
              </h1>

              <p
                className="z-text-body-lg"
                style={{
                  color: "var(--z-champagne)",
                  maxWidth: "580px",
                  marginInline: "auto",
                  lineHeight: "var(--z-leading-relaxed)",
                }}
              >
                Destination deep-dives, itinerary inspiration, and practical
                advice from our charter specialists &mdash; everything you need
                to plan an unforgettable voyage.
              </p>
            </div>
          </div>
        </section>

        {/* ═══ Category Tags ════════════════════════════════════ */}
        <section style={{ background: "var(--z-pearl)" }}>
          <div className="z-container">
            <div
              style={{
                display: "flex",
                gap: "var(--z-space-3)",
                flexWrap: "wrap",
                justifyContent: "center",
                paddingBottom: "var(--z-space-8)",
              }}
            >
              {CATEGORIES.map((cat) => (
                <span
                  key={cat}
                  className={`z-badge ${cat === "All" ? "z-badge-gold" : ""}`}
                  style={{
                    cursor: "pointer",
                    padding: "var(--z-space-2) var(--z-space-4)",
                    fontSize: "var(--z-text-body-sm)",
                  }}
                >
                  {cat}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ Featured Articles ════════════════════════════════ */}
        {featured.length > 0 && (
          <section
            className="z-section"
            style={{ background: "var(--z-pearl)" }}
          >
            <div className="z-container">
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr",
                  gap: "var(--z-space-8)",
                }}
                className="journal-featured-grid"
              >
                {featured.map((article) => (
                  <ArticleCard
                    key={article.slug}
                    article={article}
                    featured
                  />
                ))}
              </div>
              <style>{`
                @media (min-width: 768px) {
                  .journal-featured-grid {
                    grid-template-columns: 1fr 1fr !important;
                  }
                }
              `}</style>
            </div>
          </section>
        )}

        {/* ═══ All Articles ═════════════════════════════════════ */}
        <section
          className="z-section"
          style={{ background: "var(--z-sand)" }}
        >
          <div className="z-container">
            <h2
              className="z-text-title"
              style={{ marginBottom: "var(--z-space-8)" }}
            >
              Latest Articles
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                gap: "var(--z-space-8)",
              }}
            >
              {remaining.map((article) => (
                <ArticleCard key={article.slug} article={article} />
              ))}
            </div>
          </div>
        </section>

        {/* ═══ CTA ══════════════════════════════════════════════ */}
        <section
          className="z-section-lg"
          style={{
            background: "var(--z-gradient-hero)",
            color: "var(--z-pearl)",
            textAlign: "center",
          }}
        >
          <div className="z-container">
            <div
              style={{
                maxWidth: "var(--z-container-text)",
                marginInline: "auto",
              }}
            >
              <Compass
                size={48}
                style={{
                  color: "var(--z-gold)",
                  marginBottom: "var(--z-space-6)",
                  marginInline: "auto",
                  display: "block",
                }}
              />
              <h2
                className="z-text-title-lg"
                style={{
                  color: "var(--z-pearl)",
                  marginBottom: "var(--z-space-4)",
                }}
              >
                Ready to Start Planning?
              </h2>
              <p
                className="z-text-body-lg"
                style={{
                  color: "var(--z-champagne)",
                  marginBottom: "var(--z-space-8)",
                  lineHeight: "var(--z-leading-relaxed)",
                }}
              >
                From reading about a destination to setting sail &mdash; our
                charter specialists turn inspiration into reality.
              </p>
              <Link
                href="/charter-planner"
                className="z-btn z-btn-primary z-btn-lg"
              >
                Plan Your Charter
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
