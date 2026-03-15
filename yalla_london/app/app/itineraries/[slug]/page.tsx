import React from "react";
import { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getBaseUrl } from "@/lib/url-utils";
import { getDefaultSiteId, getSiteConfig } from "@/config/sites";
import { StructuredData } from "@/components/structured-data";
import {
  Navigation,
  Clock,
  MapPin,
  Ship,
  ChevronRight,
  Compass,
  Anchor,
  Sun,
  DollarSign,
  Star,
  Users,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════
   TYPES & CONSTANTS
   ═══════════════════════════════════════════════════════════════════ */


interface StopItem {
  day: number;
  port: string;
  description?: string;
  highlights?: string[];
  overnightAnchor?: string;
  lat?: number;
  lng?: number;
  activities?: string[];
  restaurants?: string[];
  notes?: string;
}

const DIFFICULTY_LABELS: Record<string, string> = {
  EASY: "Easy",
  MODERATE: "Moderate",
  ADVANCED: "Advanced",
};

const DIFFICULTY_BADGE: Record<string, string> = {
  EASY: "z-badge-success",
  MODERATE: "z-badge-warning",
  ADVANCED: "z-badge-error",
};

/* ═══════════════════════════════════════════════════════════════════
   STATIC PARAMS
   ═══════════════════════════════════════════════════════════════════ */

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  try {
    const { prisma } = await import("@/lib/db");
    const itineraries = await prisma.charterItinerary.findMany({
      where: { siteId: getDefaultSiteId(), status: "active" },
      select: { slug: true },
    });
    return itineraries.map((it) => ({ slug: it.slug }));
  } catch (e) {
    console.warn("[itinerary-detail] generateStaticParams failed:", e);
    return [];
  }
}

/* ═══════════════════════════════════════════════════════════════════
   METADATA
   ═══════════════════════════════════════════════════════════════════ */

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const baseUrl = await getBaseUrl();
  const headersList = await headers();
  const siteId = headersList.get("x-site-id") || getDefaultSiteId();
  const siteConfig = getSiteConfig(siteId);
  const siteName = siteConfig?.name || "Zenitha Yachts";

  let title = `Itinerary | ${siteName}`;
  let description = "Explore curated sailing itineraries with Zenitha Yachts.";
  let heroImage: string | undefined;

  try {
    const { prisma } = await import("@/lib/db");
    const itin = await prisma.charterItinerary.findFirst({
      where: { slug, siteId },
      select: { title_en: true, description_en: true, heroImage: true, duration: true },
    });
    if (itin) {
      title = `${itin.title_en} | ${siteName}`;
      description = itin.description_en
        ? itin.description_en.substring(0, 155)
        : `${itin.duration}-day sailing itinerary with Zenitha Yachts.`;
      heroImage = itin.heroImage || undefined;
    }
  } catch (e) {
    console.warn("[itinerary-detail] metadata DB query failed:", e);
  }

  const canonicalUrl = `${baseUrl}/itineraries/${slug}`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        "en-GB": canonicalUrl,
        "ar-SA": `${baseUrl}/ar/itineraries/${slug}`,
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
      type: "website",
      ...(heroImage && {
        images: [{ url: heroImage, width: 1200, height: 630, alt: title }],
      }),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(heroImage && { images: [heroImage] }),
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}

/* ═══════════════════════════════════════════════════════════════════
   PAGE COMPONENT
   ═══════════════════════════════════════════════════════════════════ */

export default async function ItineraryDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const headersList = await headers();
  const siteId = headersList.get("x-site-id") || getDefaultSiteId();
  const baseUrl = await getBaseUrl();

  /* ── Fetch itinerary + destination ── */
  interface ItineraryRow {
    id: string;
    title_en: string;
    title_ar: string | null;
    slug: string;
    duration: number;
    difficulty: string;
    description_en: string | null;
    description_ar: string | null;
    stops: unknown;
    recommendedYachtTypes: unknown;
    estimatedCost: unknown;
    currency: string;
    bestSeason: string | null;
    heroImage: string | null;
    destinationId: string;
    destination: {
      id: string;
      name: string;
      slug: string;
      region: string;
    };
  }

  interface YachtRow {
    id: string;
    name: string;
    slug: string;
    type: string;
    length: unknown;
    cabins: number;
    berths: number;
    pricePerWeekLow: unknown;
    pricePerWeekHigh: unknown;
    currency: string;
    images: unknown;
    rating: unknown;
    reviewCount: number;
    halalCateringAvailable: boolean;
    familyFriendly: boolean;
    crewIncluded: boolean;
  }

  interface RelatedRow {
    id: string;
    title_en: string;
    slug: string;
    duration: number;
    difficulty: string;
    heroImage: string | null;
    estimatedCost: unknown;
    currency: string;
  }

  let itinerary: ItineraryRow | null = null;
  let recommendedYachts: YachtRow[] = [];
  let relatedItineraries: RelatedRow[] = [];

  try {
    const { prisma } = await import("@/lib/db");

    itinerary = (await prisma.charterItinerary.findFirst({
      where: { slug, siteId, status: "active" },
      include: {
        destination: {
          select: { id: true, name: true, slug: true, region: true },
        },
      },
    })) as ItineraryRow | null;

    if (itinerary) {
      const yachtTypes = parseJson<string[]>(itinerary.recommendedYachtTypes) || [];

      const yachtWhere: Record<string, unknown> = {
        siteId,
        status: "active",
        destinationId: itinerary.destinationId,
      };
      if (yachtTypes.length > 0) {
        yachtWhere.type = { in: yachtTypes };
      }

      [recommendedYachts, relatedItineraries] = await Promise.all([
        prisma.yacht.findMany({
          where: yachtWhere,
          orderBy: { rating: "desc" },
          take: 6,
          select: {
            id: true,
            name: true,
            slug: true,
            type: true,
            length: true,
            cabins: true,
            berths: true,
            pricePerWeekLow: true,
            pricePerWeekHigh: true,
            currency: true,
            images: true,
            rating: true,
            reviewCount: true,
            halalCateringAvailable: true,
            familyFriendly: true,
            crewIncluded: true,
          },
        }) as Promise<YachtRow[]>,
        prisma.charterItinerary.findMany({
          where: {
            siteId,
            status: "active",
            destinationId: itinerary.destinationId,
            id: { not: itinerary.id },
          },
          orderBy: { duration: "asc" },
          take: 3,
          select: {
            id: true,
            title_en: true,
            slug: true,
            duration: true,
            difficulty: true,
            heroImage: true,
            estimatedCost: true,
            currency: true,
          },
        }) as Promise<RelatedRow[]>,
      ]);
    }
  } catch (e) {
    console.warn("[itinerary-detail] DB query failed:", e);
  }

  if (!itinerary) {
    notFound();
  }

  /* ── Parse JSONB ── */
  const stops = parseJson<StopItem[]>(itinerary.stops) || [];
  const recommendedYachtTypes = parseJson<string[]>(itinerary.recommendedYachtTypes) || [];

  /* ── JSON-LD ── */
  const tripJsonLd = {
    "@context": "https://schema.org",
    "@type": "Trip",
    name: itinerary.title_en,
    description: itinerary.description_en || "",
    url: `${baseUrl}/itineraries/${slug}`,
    itinerary: {
      "@type": "ItemList",
      numberOfItems: stops.length,
      itemListElement: stops.map((stop, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: `Day ${stop.day}: ${stop.port}`,
        description: stop.description || "",
      })),
    },
    ...(itinerary.heroImage && { image: itinerary.heroImage }),
    ...(itinerary.estimatedCost && {
      offers: {
        "@type": "Offer",
        price: Number(itinerary.estimatedCost),
        priceCurrency: itinerary.currency,
      },
    }),
  };

  return (
    <>
      {/* Breadcrumb (deeper than layout) */}
      <StructuredData
        type="breadcrumb"
        siteId={siteId}
        data={{
          items: [
            { name: "Home", url: baseUrl },
            { name: "Itineraries", url: `${baseUrl}/itineraries` },
            { name: itinerary.title_en, url: `${baseUrl}/itineraries/${slug}` },
          ],
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(tripJsonLd) }}
      />

      <div className="min-h-screen" style={{ background: "var(--z-bg)" }}>
        {/* ────────────────────────────────────────────────────────────
            1. HERO
           ──────────────────────────────────────────────────────────── */}
        <section
          className="relative"
          style={{ minHeight: "55vh", display: "flex", alignItems: "flex-end" }}
        >
          {itinerary.heroImage ? (
            <>
              <Image
                src={itinerary.heroImage}
                alt={itinerary.title_en}
                fill
                className="object-cover"
                priority
                sizes="100vw"
              />
              <div
                className="absolute inset-0"
                style={{ background: "var(--z-gradient-overlay)" }}
              />
            </>
          ) : (
            <div className="absolute inset-0" style={{ background: "var(--z-gradient-hero)" }}>
              <div className="absolute inset-0 flex items-center justify-center opacity-10">
                <Navigation className="w-64 h-64" style={{ color: "var(--z-gold)" }} />
              </div>
            </div>
          )}

          <div className="z-container relative z-10 pb-12 pt-32">
            <Link
              href="/itineraries"
              className="inline-flex items-center gap-1 mb-4 font-body transition-colors hover:text-white"
              style={{ color: "var(--z-champagne)", fontSize: "var(--z-text-body-sm)" }}
            >
              <ChevronRight className="w-4 h-4 rotate-180" /> All Itineraries
            </Link>

            {/* Badges */}
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="z-badge z-badge-gold">
                <Clock className="w-3 h-3" /> {itinerary.duration} Days
              </span>
              <span
                className={`z-badge ${DIFFICULTY_BADGE[itinerary.difficulty] || "z-badge-ocean"}`}
              >
                {DIFFICULTY_LABELS[itinerary.difficulty] || itinerary.difficulty}
              </span>
            </div>

            <h1
              className="font-display mb-4"
              style={{
                fontSize: "var(--z-text-hero-display)",
                fontWeight: "var(--z-weight-bold)",
                color: "var(--z-pearl)",
                lineHeight: "var(--z-leading-tight)",
              }}
            >
              {itinerary.title_en}
            </h1>

            {/* Quick stats row */}
            <div className="flex flex-wrap gap-4 mt-6">
              <QuickStat
                icon={<MapPin className="w-5 h-5" />}
                label="Destination"
                value={itinerary.destination.name}
              />
              {itinerary.bestSeason && (
                <QuickStat
                  icon={<Sun className="w-5 h-5" />}
                  label="Best Season"
                  value={itinerary.bestSeason}
                />
              )}
              {itinerary.estimatedCost && (
                <QuickStat
                  icon={<DollarSign className="w-5 h-5" />}
                  label="Est. Cost"
                  value={`${itinerary.currency === "EUR" ? "\u20ac" : "$"}${Number(itinerary.estimatedCost).toLocaleString()}`}
                />
              )}
              <QuickStat
                icon={<Navigation className="w-5 h-5" />}
                label="Stops"
                value={`${stops.length} ports`}
              />
            </div>
          </div>
        </section>

        {/* ────────────────────────────────────────────────────────────
            2. OVERVIEW
           ──────────────────────────────────────────────────────────── */}
        <section className="z-section" style={{ background: "var(--z-pearl)" }}>
          <div className="z-container">
            <div className="max-w-3xl">
              {itinerary.description_en && (
                <>
                  <p className="z-text-overline mb-3">Overview</p>
                  <span className="z-gold-bar mb-6 block" />
                  <p
                    className="font-body mb-6"
                    style={{
                      fontSize: "var(--z-text-body-lg)",
                      color: "var(--z-navy)",
                      lineHeight: "var(--z-leading-relaxed)",
                    }}
                  >
                    {itinerary.description_en}
                  </p>
                </>
              )}

              <div className="flex flex-wrap items-center gap-4">
                <Link
                  href={`/destinations/${itinerary.destination.slug}`}
                  className="z-btn z-btn-ghost"
                >
                  <MapPin className="w-4 h-4" />
                  Explore {itinerary.destination.name}
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ────────────────────────────────────────────────────────────
            3. DAY-BY-DAY STOPS (Timeline)
           ──────────────────────────────────────────────────────────── */}
        {stops.length > 0 && (
          <section className="z-section" style={{ background: "var(--z-sand)" }}>
            <div className="z-container">
              <SectionHeading
                icon={<Navigation className="w-6 h-6" />}
                title="Day-by-Day Itinerary"
              />

              <div className="max-w-3xl mx-auto">
                <div className="relative">
                  {/* Timeline line */}
                  <div
                    className="absolute left-6 top-0 bottom-0 w-0.5"
                    style={{ background: "var(--z-border)" }}
                    aria-hidden="true"
                  />

                  <div className="space-y-8">
                    {stops.map((stop, i) => (
                      <div key={i} className="relative pl-16">
                        {/* Day circle */}
                        <div
                          className="absolute left-0 top-0 w-12 h-12 rounded-full flex items-center justify-center"
                          style={{
                            background: "var(--z-gradient-cta)",
                            boxShadow: "var(--z-shadow-gold)",
                          }}
                        >
                          <span
                            className="font-mono"
                            style={{
                              fontSize: "var(--z-text-body-sm)",
                              fontWeight: "var(--z-weight-bold)",
                              color: "var(--z-navy)",
                            }}
                          >
                            {stop.day}
                          </span>
                        </div>

                        {/* Stop card */}
                        <div className="z-card" style={{ background: "var(--z-surface)" }}>
                          <div className="z-card-body">
                            <div className="flex items-center gap-2 mb-2">
                              <MapPin
                                className="w-4 h-4 shrink-0"
                                style={{ color: "var(--z-gold)" }}
                              />
                              <h3
                                className="font-heading"
                                style={{
                                  fontSize: "var(--z-text-heading)",
                                  fontWeight: "var(--z-weight-semibold)",
                                  color: "var(--z-navy)",
                                }}
                              >
                                {stop.port}
                              </h3>
                            </div>

                            {stop.description && (
                              <p
                                className="font-body mb-3"
                                style={{
                                  color: "var(--z-muted)",
                                  fontSize: "var(--z-text-body-sm)",
                                  lineHeight: "var(--z-leading-relaxed)",
                                }}
                              >
                                {stop.description}
                              </p>
                            )}

                            {/* Highlights */}
                            {stop.highlights && stop.highlights.length > 0 && (
                              <div className="mb-3">
                                <p
                                  className="font-heading mb-1.5"
                                  style={{
                                    fontSize: "var(--z-text-caption)",
                                    fontWeight: "var(--z-weight-semibold)",
                                    color: "var(--z-navy)",
                                    textTransform: "uppercase",
                                    letterSpacing: "var(--z-tracking-wider)",
                                  }}
                                >
                                  Highlights
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                  {stop.highlights.map((h, j) => (
                                    <span key={j} className="z-badge z-badge-ocean">
                                      {h}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Activities */}
                            {stop.activities && stop.activities.length > 0 && (
                              <div className="mb-3">
                                <p
                                  className="font-heading mb-1.5"
                                  style={{
                                    fontSize: "var(--z-text-caption)",
                                    fontWeight: "var(--z-weight-semibold)",
                                    color: "var(--z-navy)",
                                    textTransform: "uppercase",
                                    letterSpacing: "var(--z-tracking-wider)",
                                  }}
                                >
                                  Activities
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                  {stop.activities.map((a, j) => (
                                    <span key={j} className="z-badge z-badge-gold">
                                      {a}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Overnight anchor */}
                            {stop.overnightAnchor && (
                              <div
                                className="flex items-center gap-2 mt-3 pt-3"
                                style={{
                                  borderTop: "1px solid var(--z-border-subtle)",
                                }}
                              >
                                <Anchor
                                  className="w-3.5 h-3.5"
                                  style={{ color: "var(--z-aegean)" }}
                                />
                                <span className="z-text-caption">
                                  Overnight: {stop.overnightAnchor}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ────────────────────────────────────────────────────────────
            4. RECOMMENDED YACHT TYPES
           ──────────────────────────────────────────────────────────── */}
        {recommendedYachtTypes.length > 0 && (
          <section className="z-section-sm" style={{ background: "var(--z-pearl)" }}>
            <div className="z-container">
              <SectionHeading
                icon={<Ship className="w-6 h-6" />}
                title="Recommended Yacht Types"
              />
              <div className="flex flex-wrap gap-3">
                {recommendedYachtTypes.map((type) => (
                  <div
                    key={type}
                    className="px-6 py-4 flex items-center gap-3"
                    style={{
                      background: "var(--z-surface)",
                      border: "1px solid var(--z-border)",
                      borderRadius: "var(--z-radius-lg)",
                    }}
                  >
                    <Ship className="w-5 h-5" style={{ color: "var(--z-gold)" }} />
                    <span
                      className="font-heading"
                      style={{
                        fontSize: "var(--z-text-body)",
                        fontWeight: "var(--z-weight-semibold)",
                        color: "var(--z-navy)",
                      }}
                    >
                      {formatYachtType(type)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ────────────────────────────────────────────────────────────
            5. AVAILABLE YACHTS
           ──────────────────────────────────────────────────────────── */}
        {recommendedYachts.length > 0 && (
          <section className="z-section" style={{ background: "var(--z-sand)" }}>
            <div className="z-container">
              <SectionHeading
                icon={<Anchor className="w-6 h-6" />}
                title="Available Yachts for This Route"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {recommendedYachts.map((yacht) => {
                  const images = parseJson<string[]>(yacht.images) || [];
                  const firstImage = images[0] || null;

                  return (
                    <Link
                      key={yacht.id}
                      href={`/yachts/${yacht.slug}`}
                      className="z-card group"
                      style={{ background: "var(--z-surface)" }}
                    >
                      <div className="relative z-aspect-video">
                        {firstImage ? (
                          <Image
                            src={firstImage}
                            alt={yacht.name}
                            fill
                            className="object-cover"
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          />
                        ) : (
                          <div
                            className="absolute inset-0 flex items-center justify-center"
                            style={{ background: "var(--z-gradient-card)" }}
                          >
                            <Ship
                              className="w-10 h-10"
                              style={{ color: "rgba(255,255,255,0.15)" }}
                            />
                          </div>
                        )}
                        <div
                          className="absolute inset-0"
                          style={{ background: "var(--z-gradient-overlay-light)" }}
                        />
                        <div className="absolute top-3 left-3">
                          <span className="z-badge z-badge-navy">
                            {formatYachtType(yacht.type)}
                          </span>
                        </div>
                      </div>

                      <div className="z-card-body">
                        <h3
                          className="font-heading mb-1 group-hover:text-[var(--z-aegean)] transition-colors"
                          style={{
                            fontSize: "var(--z-text-heading)",
                            fontWeight: "var(--z-weight-semibold)",
                            color: "var(--z-navy)",
                          }}
                        >
                          {yacht.name}
                        </h3>

                        <div
                          className="flex items-center gap-3 mb-3"
                          style={{
                            color: "var(--z-muted)",
                            fontSize: "var(--z-text-caption)",
                          }}
                        >
                          {yacht.length && (
                            <span className="flex items-center gap-1">
                              <Anchor className="w-3 h-3" /> {Number(yacht.length)}m
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" /> {yacht.cabins} cabins
                          </span>
                          {yacht.rating && (
                            <span className="flex items-center gap-1">
                              <Star
                                className="w-3 h-3"
                                style={{ color: "var(--z-gold)" }}
                              />
                              {Number(yacht.rating).toFixed(1)}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {yacht.halalCateringAvailable && (
                            <span className="z-badge z-badge-success">Halal</span>
                          )}
                          {yacht.familyFriendly && (
                            <span className="z-badge z-badge-ocean">Family</span>
                          )}
                          {yacht.crewIncluded && (
                            <span className="z-badge z-badge-gold">Crewed</span>
                          )}
                        </div>

                        <div
                          className="flex items-center justify-between pt-3"
                          style={{ borderTop: "1px solid var(--z-border-subtle)" }}
                        >
                          {yacht.pricePerWeekLow ? (
                            <div>
                              <span className="z-text-caption">From </span>
                              <span
                                className="font-mono"
                                style={{
                                  fontSize: "var(--z-text-body)",
                                  fontWeight: "var(--z-weight-bold)",
                                  color: "var(--z-navy)",
                                }}
                              >
                                {yacht.currency === "EUR" ? "\u20ac" : "$"}
                                {Number(yacht.pricePerWeekLow).toLocaleString()}
                              </span>
                              <span className="z-text-caption">/wk</span>
                            </div>
                          ) : (
                            <span className="z-text-caption">Price on request</span>
                          )}
                          <ChevronRight
                            className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                            style={{ color: "var(--z-gold)" }}
                          />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ────────────────────────────────────────────────────────────
            6. RELATED ITINERARIES
           ──────────────────────────────────────────────────────────── */}
        {relatedItineraries.length > 0 && (
          <section className="z-section" style={{ background: "var(--z-pearl)" }}>
            <div className="z-container">
              <SectionHeading
                icon={<Compass className="w-6 h-6" />}
                title={`More ${itinerary.destination.name} Itineraries`}
              />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {relatedItineraries.map((rel) => (
                  <Link
                    key={rel.id}
                    href={`/itineraries/${rel.slug}`}
                    className="z-card group"
                    style={{ background: "var(--z-surface)" }}
                  >
                    <div className="relative z-aspect-photo">
                      {rel.heroImage ? (
                        <Image
                          src={rel.heroImage}
                          alt={rel.title_en}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 33vw"
                        />
                      ) : (
                        <div
                          className="absolute inset-0 flex items-center justify-center"
                          style={{ background: "var(--z-gradient-card)" }}
                        >
                          <Navigation
                            className="w-8 h-8"
                            style={{ color: "rgba(255,255,255,0.15)" }}
                          />
                        </div>
                      )}
                      <div
                        className="absolute inset-0"
                        style={{ background: "var(--z-gradient-overlay-light)" }}
                      />
                      <div className="absolute top-3 left-3 flex gap-2">
                        <span className="z-badge z-badge-gold">
                          <Clock className="w-3 h-3" /> {rel.duration} Days
                        </span>
                        <span
                          className={`z-badge ${DIFFICULTY_BADGE[rel.difficulty] || "z-badge-ocean"}`}
                        >
                          {DIFFICULTY_LABELS[rel.difficulty] || rel.difficulty}
                        </span>
                      </div>
                    </div>
                    <div className="z-card-body">
                      <h3
                        className="font-heading mb-2 group-hover:text-[var(--z-aegean)] transition-colors"
                        style={{
                          fontSize: "var(--z-text-heading)",
                          fontWeight: "var(--z-weight-semibold)",
                          color: "var(--z-navy)",
                        }}
                      >
                        {rel.title_en}
                      </h3>
                      {rel.estimatedCost && (
                        <span className="z-text-caption">
                          Est. {rel.currency === "EUR" ? "\u20ac" : "$"}
                          {Number(rel.estimatedCost).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ────────────────────────────────────────────────────────────
            7. CTA
           ──────────────────────────────────────────────────────────── */}
        <section
          style={{
            background: "var(--z-gradient-hero)",
            padding: "var(--z-space-16) 0",
          }}
        >
          <div className="z-container text-center">
            <h2
              className="font-display mb-4"
              style={{
                fontSize: "var(--z-text-title-lg)",
                fontWeight: "var(--z-weight-bold)",
                color: "var(--z-pearl)",
              }}
            >
              Book This Itinerary
            </h2>
            <p
              className="font-body mb-8"
              style={{
                fontSize: "var(--z-text-body-lg)",
                color: "var(--z-champagne)",
                maxWidth: "520px",
                margin: "0 auto var(--z-space-8)",
              }}
            >
              Let our charter experts pair this {itinerary.duration}-day route
              with the perfect yacht for your group.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href={`/inquiry?destination=${encodeURIComponent(itinerary.destination.slug)}&itinerary=${encodeURIComponent(slug)}`}
                className="z-btn z-btn-primary z-btn-lg"
              >
                <Compass className="w-5 h-5" />
                Start Your Inquiry
              </Link>
              <Link
                href={`/destinations/${itinerary.destination.slug}`}
                className="z-btn z-btn-secondary z-btn-lg"
                style={{
                  color: "var(--z-pearl)",
                  borderColor: "rgba(255,255,255,0.3)",
                }}
              >
                <MapPin className="w-5 h-5" />
                Explore {itinerary.destination.name}
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════ */

function parseJson<T>(value: unknown): T | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "object") return value as T;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }
  return null;
}

function formatYachtType(type: string): string {
  const map: Record<string, string> = {
    SAILBOAT: "Sailboat",
    CATAMARAN: "Catamaran",
    MOTOR_YACHT: "Motor Yacht",
    GULET: "Gulet",
    SUPERYACHT: "Superyacht",
    POWER_CATAMARAN: "Power Cat",
  };
  return map[type] || type;
}

/* ═══════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════════════════ */

function QuickStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="z-card-glass px-5 py-3 flex items-center gap-3">
      <div style={{ color: "var(--z-gold)" }}>{icon}</div>
      <div>
        <div className="z-text-label" style={{ color: "rgba(255,255,255,0.6)" }}>
          {label}
        </div>
        <div
          className="font-heading"
          style={{
            fontSize: "var(--z-text-body)",
            fontWeight: "var(--z-weight-semibold)",
            color: "var(--z-pearl)",
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

function SectionHeading({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-2">
        <div style={{ color: "var(--z-gold)" }}>{icon}</div>
        <h2
          className="font-heading"
          style={{
            fontSize: "var(--z-text-title)",
            fontWeight: "var(--z-weight-bold)",
            color: "var(--z-navy)",
          }}
        >
          {title}
        </h2>
      </div>
      <span className="z-gold-bar" />
    </div>
  );
}
