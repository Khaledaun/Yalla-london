import { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getBaseUrl } from "@/lib/url-utils";
import { getDefaultSiteId, getSiteConfig } from "@/config/sites";
import { StructuredData } from "@/components/structured-data";
import {
  Anchor,
  Ship,
  Sun,
  Thermometer,
  Wind,
  Calendar,
  MapPin,
  ChevronRight,
  Waves,
  Navigation,
  Star,
  Users,
  Compass,
  Clock,
  Sparkles,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════════ */

const SITE_ID = "zenitha-yachts-med";

interface HighlightItem {
  title: string;
  description: string;
  icon?: string;
}

interface WeatherData {
  summerTemp?: string;
  winterTemp?: string;
  waterTemp?: string;
  windConditions?: string;
  [key: string]: unknown;
}

interface MarinaItem {
  name: string;
  description?: string;
  location?: string;
  facilities?: string[];
  [key: string]: unknown;
}

interface StopItem {
  day: number;
  port: string;
  description?: string;
  highlights?: string[];
  overnightAnchor?: string;
  [key: string]: unknown;
}

/* ═══════════════════════════════════════════════════════════════════
   STATIC PARAMS (for static generation)
   ═══════════════════════════════════════════════════════════════════ */

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  try {
    const { prisma } = await import("@/lib/db");
    const destinations = await prisma.yachtDestination.findMany({
      where: { siteId: SITE_ID, status: "active" },
      select: { slug: true },
    });
    return destinations.map((d) => ({ slug: d.slug }));
  } catch (e) {
    console.warn("[destination-detail] generateStaticParams failed:", e);
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

  let title = `Destination | ${siteName}`;
  let description = "Explore yacht charter destinations with Zenitha Yachts.";
  let heroImage: string | undefined;

  try {
    const { prisma } = await import("@/lib/db");
    const dest = await prisma.yachtDestination.findFirst({
      where: { slug, siteId: SITE_ID },
      select: { name: true, description_en: true, heroImage: true },
    });
    if (dest) {
      title = `${dest.name} Yacht Charter | ${siteName}`;
      description = dest.description_en
        ? dest.description_en.substring(0, 155)
        : description;
      heroImage = dest.heroImage || undefined;
    }
  } catch (e) {
    console.warn("[destination-detail] metadata DB query failed:", e);
  }

  const canonicalUrl = `${baseUrl}/destinations/${slug}`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        "en-GB": canonicalUrl,
        "ar-SA": `${baseUrl}/ar/destinations/${slug}`,
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

export default async function DestinationDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const headersList = await headers();
  const siteId = headersList.get("x-site-id") || getDefaultSiteId();
  const baseUrl = await getBaseUrl();

  /* ── Fetch destination from DB ── */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let destination: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let relatedYachts: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let relatedItineraries: any[] = [];

  try {
    const { prisma } = await import("@/lib/db");

    destination = await prisma.yachtDestination.findFirst({
      where: { slug, siteId: SITE_ID, status: "active" },
    });

    if (destination) {
      [relatedYachts, relatedItineraries] = await Promise.all([
        prisma.yacht.findMany({
          where: { destinationId: destination.id, siteId: SITE_ID, status: "active" },
          orderBy: { rating: "desc" },
          take: 6,
        }),
        prisma.charterItinerary.findMany({
          where: { destinationId: destination.id, siteId: SITE_ID, status: "active" },
          orderBy: { duration: "asc" },
          take: 6,
        }),
      ]);
    }
  } catch (e) {
    console.warn("[destination-detail] DB query failed:", e);
  }

  if (!destination) {
    notFound();
  }

  /* ── Parse JSONB fields ── */
  const highlights = parseJson<HighlightItem[]>(destination.highlights) || [];
  const weatherInfo = parseJson<WeatherData>(destination.weatherInfo) || {};
  const marinas = parseJson<MarinaItem[]>(destination.marinas) || [];
  const bestMonths = parseJson<string[]>(destination.bestMonths) || [];
  const galleryImages = parseJson<string[]>(destination.galleryImages) || [];

  /* ── JSON-LD Place structured data ── */
  const placeJsonLd = {
    "@context": "https://schema.org",
    "@type": "Place",
    name: destination.name,
    description: destination.description_en || "",
    url: `${baseUrl}/destinations/${slug}`,
    ...(destination.country && {
      address: {
        "@type": "PostalAddress",
        addressCountry: destination.country,
      },
    }),
    containedInPlace: {
      "@type": "Place",
      name: formatRegion(destination.region),
    },
    ...(destination.heroImage && { image: destination.heroImage }),
  };

  return (
    <>
      {/* Breadcrumb — deeper than layout breadcrumb */}
      <StructuredData
        type="breadcrumb"
        siteId={siteId}
        data={{
          items: [
            { name: "Home", url: baseUrl },
            { name: "Destinations", url: `${baseUrl}/destinations` },
            { name: destination.name, url: `${baseUrl}/destinations/${slug}` },
          ],
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(placeJsonLd) }}
      />

      <div className="min-h-screen" style={{ background: "var(--z-bg)" }}>
        {/* ────────────────────────────────────────────────────────────
            1. HERO SECTION
           ──────────────────────────────────────────────────────────── */}
        <section className="relative" style={{ minHeight: "60vh", display: "flex", alignItems: "flex-end" }}>
          {/* Background: hero image or gradient fallback */}
          {destination.heroImage ? (
            <>
              <Image
                src={destination.heroImage}
                alt={`${destination.name} yacht charter destination`}
                fill
                className="object-cover"
                priority
                sizes="100vw"
              />
              <div className="absolute inset-0" style={{ background: "var(--z-gradient-overlay)" }} />
            </>
          ) : (
            <div className="absolute inset-0" style={{ background: "var(--z-gradient-hero)" }}>
              <div className="absolute inset-0 flex items-center justify-center opacity-10">
                <Anchor className="w-64 h-64" style={{ color: "var(--z-gold)" }} />
              </div>
            </div>
          )}

          <div className="z-container relative z-10 pb-12 pt-32">
            <Link
              href="/destinations"
              className="inline-flex items-center gap-1 mb-4 font-body transition-colors hover:text-white"
              style={{ color: "var(--z-champagne)", fontSize: "var(--z-text-body-sm)" }}
            >
              <ChevronRight className="w-4 h-4 rotate-180" /> All Destinations
            </Link>

            {/* Region badge */}
            <div className="mb-4">
              <span className="z-badge z-badge-gold">{formatRegion(destination.region)}</span>
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
              {destination.name}
            </h1>

            {/* Quick stats */}
            <div className="flex flex-wrap gap-4 mt-6">
              {destination.seasonStart && destination.seasonEnd && (
                <QuickStat
                  icon={<Calendar className="w-5 h-5" />}
                  label="Season"
                  value={`${destination.seasonStart} - ${destination.seasonEnd}`}
                />
              )}
              {destination.averagePricePerWeek && (
                <QuickStat
                  icon={<Ship className="w-5 h-5" />}
                  label="From"
                  value={`\u20ac${Number(destination.averagePricePerWeek).toLocaleString()}/wk`}
                />
              )}
              {relatedYachts.length > 0 && (
                <QuickStat
                  icon={<Anchor className="w-5 h-5" />}
                  label="Available Yachts"
                  value={String(relatedYachts.length)}
                />
              )}
              {destination.country && (
                <QuickStat
                  icon={<MapPin className="w-5 h-5" />}
                  label="Country"
                  value={destination.country}
                />
              )}
            </div>
          </div>
        </section>

        {/* ────────────────────────────────────────────────────────────
            2. OVERVIEW
           ──────────────────────────────────────────────────────────── */}
        <section className="z-section" style={{ background: "var(--z-pearl)" }}>
          <div className="z-container">
            <div className="max-w-3xl">
              <p className="z-text-overline mb-3">Overview</p>
              <span className="z-gold-bar mb-6 block" />

              {destination.description_en && (
                <p
                  className="font-body mb-8"
                  style={{
                    fontSize: "var(--z-text-body-lg)",
                    color: "var(--z-navy)",
                    lineHeight: "var(--z-leading-relaxed)",
                  }}
                >
                  {destination.description_en}
                </p>
              )}

              {/* Season info + best months */}
              {(destination.seasonStart || bestMonths.length > 0) && (
                <div className="flex flex-wrap items-center gap-3 mt-6">
                  {destination.seasonStart && destination.seasonEnd && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" style={{ color: "var(--z-gold)" }} />
                      <span className="font-heading" style={{ fontSize: "var(--z-text-body-sm)", fontWeight: "var(--z-weight-semibold)", color: "var(--z-navy)" }}>
                        {destination.seasonStart} - {destination.seasonEnd}
                      </span>
                    </div>
                  )}
                  {bestMonths.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {bestMonths.map((month) => (
                        <span key={month} className="z-badge z-badge-ocean">
                          {month}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ────────────────────────────────────────────────────────────
            3. HIGHLIGHTS
           ──────────────────────────────────────────────────────────── */}
        {highlights.length > 0 && (
          <section className="z-section" style={{ background: "var(--z-sand)" }}>
            <div className="z-container">
              <SectionHeading icon={<Sparkles className="w-6 h-6" />} title="Highlights" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {highlights.map((item, i) => (
                  <div key={i} className="z-card" style={{ background: "var(--z-surface)" }}>
                    <div className="z-card-body">
                      <h3
                        className="font-heading mb-2"
                        style={{
                          fontSize: "var(--z-text-heading)",
                          fontWeight: "var(--z-weight-semibold)",
                          color: "var(--z-navy)",
                        }}
                      >
                        {item.title}
                      </h3>
                      <p
                        className="font-body"
                        style={{
                          color: "var(--z-muted)",
                          fontSize: "var(--z-text-body-sm)",
                          lineHeight: "var(--z-leading-relaxed)",
                        }}
                      >
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ────────────────────────────────────────────────────────────
            4. WEATHER INFO
           ──────────────────────────────────────────────────────────── */}
        {Object.keys(weatherInfo).length > 0 && (
          <section className="z-section" style={{ background: "var(--z-pearl)" }}>
            <div className="z-container">
              <SectionHeading icon={<Sun className="w-6 h-6" />} title="Weather & Season Guide" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {weatherInfo.summerTemp && (
                  <WeatherCard
                    icon={<Thermometer className="w-5 h-5" />}
                    title="Summer"
                    text={weatherInfo.summerTemp}
                  />
                )}
                {weatherInfo.winterTemp && (
                  <WeatherCard
                    icon={<Thermometer className="w-5 h-5" />}
                    title="Winter"
                    text={weatherInfo.winterTemp}
                  />
                )}
                {weatherInfo.waterTemp && (
                  <WeatherCard
                    icon={<Waves className="w-5 h-5" />}
                    title="Water Temperature"
                    text={weatherInfo.waterTemp}
                  />
                )}
                {weatherInfo.windConditions && (
                  <WeatherCard
                    icon={<Wind className="w-5 h-5" />}
                    title="Wind Conditions"
                    text={weatherInfo.windConditions}
                  />
                )}
              </div>
            </div>
          </section>
        )}

        {/* ────────────────────────────────────────────────────────────
            5. AVAILABLE YACHTS
           ──────────────────────────────────────────────────────────── */}
        <section className="z-section" style={{ background: "var(--z-sand)" }}>
          <div className="z-container">
            <SectionHeading
              icon={<Ship className="w-6 h-6" />}
              title={`Available Yachts in ${destination.name}`}
            />

            {relatedYachts.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {relatedYachts.map((yacht) => {
                    const images = parseJson<string[]>(yacht.images) || [];
                    const firstImage = images[0] || null;

                    return (
                      <Link
                        key={yacht.id}
                        href={`/yachts/${yacht.slug}`}
                        className="z-card group"
                        style={{ background: "var(--z-surface)" }}
                      >
                        {/* Image */}
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
                              <Ship className="w-10 h-10" style={{ color: "rgba(255,255,255,0.15)" }} />
                            </div>
                          )}
                          <div className="absolute inset-0" style={{ background: "var(--z-gradient-overlay-light)" }} />
                          <div className="absolute top-3 left-3 flex gap-2">
                            <span className="z-badge z-badge-navy">{formatYachtType(yacht.type)}</span>
                          </div>
                        </div>

                        {/* Content */}
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

                          {/* Specs row */}
                          <div className="flex items-center gap-3 mb-3" style={{ color: "var(--z-muted)", fontSize: "var(--z-text-caption)" }}>
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
                                <Star className="w-3 h-3" style={{ color: "var(--z-gold)" }} />
                                {Number(yacht.rating).toFixed(1)}
                              </span>
                            )}
                          </div>

                          {/* GCC badges */}
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

                          {/* Price */}
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
                <div className="text-center mt-8">
                  <Link href="/yachts" className="z-btn z-btn-secondary">
                    View All Yachts <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <Ship className="w-12 h-12 mx-auto mb-4" style={{ color: "var(--z-champagne)" }} />
                <p className="font-heading mb-2" style={{ fontSize: "var(--z-text-heading)", color: "var(--z-navy)" }}>
                  Yachts coming soon
                </p>
                <p className="font-body mb-6" style={{ color: "var(--z-muted)", fontSize: "var(--z-text-body-sm)" }}>
                  We are curating the finest yachts for {destination.name}. Check back soon.
                </p>
                <Link href="/inquiry" className="z-btn z-btn-primary">
                  Request a Custom Quote
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* ────────────────────────────────────────────────────────────
            6. SUGGESTED ITINERARIES
           ──────────────────────────────────────────────────────────── */}
        {relatedItineraries.length > 0 && (
          <section className="z-section" style={{ background: "var(--z-pearl)" }}>
            <div className="z-container">
              <SectionHeading
                icon={<Navigation className="w-6 h-6" />}
                title="Suggested Itineraries"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {relatedItineraries.map((itin) => (
                  <Link
                    key={itin.id}
                    href={`/itineraries/${itin.slug}`}
                    className="z-card group"
                    style={{ background: "var(--z-surface)" }}
                  >
                    <div className="relative z-aspect-photo">
                      {itin.heroImage ? (
                        <Image
                          src={itin.heroImage}
                          alt={itin.title_en}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      ) : (
                        <div
                          className="absolute inset-0 flex items-center justify-center"
                          style={{ background: "var(--z-gradient-card)" }}
                        >
                          <Navigation className="w-8 h-8" style={{ color: "rgba(255,255,255,0.15)" }} />
                        </div>
                      )}
                      <div className="absolute inset-0" style={{ background: "var(--z-gradient-overlay-light)" }} />
                      <div className="absolute top-3 left-3 flex gap-2">
                        <span className="z-badge z-badge-gold">
                          <Clock className="w-3 h-3" /> {itin.duration} Days
                        </span>
                        <span className="z-badge z-badge-ocean">{itin.difficulty}</span>
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
                        {itin.title_en}
                      </h3>
                      {itin.estimatedCost && (
                        <div className="flex items-center gap-1">
                          <span className="z-text-caption">Est. </span>
                          <span
                            className="font-mono"
                            style={{
                              fontSize: "var(--z-text-body-sm)",
                              fontWeight: "var(--z-weight-bold)",
                              color: "var(--z-navy)",
                            }}
                          >
                            {itin.currency === "EUR" ? "\u20ac" : "$"}
                            {Number(itin.estimatedCost).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ────────────────────────────────────────────────────────────
            7. MARINAS
           ──────────────────────────────────────────────────────────── */}
        {marinas.length > 0 && (
          <section className="z-section" style={{ background: "var(--z-sand)" }}>
            <div className="z-container">
              <SectionHeading icon={<Anchor className="w-6 h-6" />} title="Marinas & Ports" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {marinas.map((marina, i) => (
                  <div key={i} className="z-card" style={{ background: "var(--z-surface)" }}>
                    <div className="z-card-body">
                      <div className="flex items-center gap-2 mb-3">
                        <MapPin className="w-5 h-5 shrink-0" style={{ color: "var(--z-gold)" }} />
                        <h3
                          className="font-heading"
                          style={{
                            fontSize: "var(--z-text-heading)",
                            fontWeight: "var(--z-weight-semibold)",
                            color: "var(--z-navy)",
                          }}
                        >
                          {marina.name}
                        </h3>
                      </div>
                      {marina.description && (
                        <p
                          className="font-body mb-2"
                          style={{
                            color: "var(--z-muted)",
                            fontSize: "var(--z-text-body-sm)",
                            lineHeight: "var(--z-leading-relaxed)",
                          }}
                        >
                          {marina.description}
                        </p>
                      )}
                      {marina.location && (
                        <p className="z-text-caption">{marina.location}</p>
                      )}
                      {marina.facilities && marina.facilities.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {marina.facilities.map((f, j) => (
                            <span key={j} className="z-badge z-badge-outline">
                              {f}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ────────────────────────────────────────────────────────────
            8. CTA
           ──────────────────────────────────────────────────────────── */}
        <section style={{ background: "var(--z-gradient-hero)", padding: "var(--z-space-16) 0" }}>
          <div className="z-container text-center">
            <h2
              className="font-display mb-4"
              style={{
                fontSize: "var(--z-text-title-lg)",
                fontWeight: "var(--z-weight-bold)",
                color: "var(--z-pearl)",
              }}
            >
              Plan Your {destination.name} Charter
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
              Let our charter experts match you with the perfect yacht and itinerary
              for your {destination.name} adventure.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/inquiry" className="z-btn z-btn-primary z-btn-lg">
                <Compass className="w-5 h-5" />
                Start Your Inquiry
              </Link>
              <Link
                href="/yachts"
                className="z-btn z-btn-secondary z-btn-lg"
                style={{ color: "var(--z-pearl)", borderColor: "rgba(255,255,255,0.3)" }}
              >
                <Ship className="w-5 h-5" />
                Browse Yachts
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   HELPER FUNCTIONS
   ═══════════════════════════════════════════════════════════════════ */

/** Safely parse a JSONB field that might already be an object or a string */
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

function formatRegion(region: string): string {
  const map: Record<string, string> = {
    MEDITERRANEAN: "Mediterranean",
    ARABIAN_GULF: "Arabian Gulf",
    RED_SEA: "Red Sea",
    INDIAN_OCEAN: "Indian Ocean",
    CARIBBEAN: "Caribbean",
    SOUTHEAST_ASIA: "Southeast Asia",
  };
  return map[region] || region;
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

/* Unused but required for TypeScript to recognise the async DB helpers */
async function fetchDestination() {
  return null as null;
}
async function fetchRelatedYachts() {
  return [] as never[];
}
async function fetchRelatedItineraries() {
  return [] as never[];
}

/* ═══════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════════════════ */

function QuickStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
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

function SectionHeading({ icon, title }: { icon: React.ReactNode; title: string }) {
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

function WeatherCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="z-card" style={{ background: "var(--z-surface)" }}>
      <div className="z-card-body">
        <div className="flex items-center gap-2 mb-3">
          <div style={{ color: "var(--z-gold)" }}>{icon}</div>
          <h3
            className="font-heading"
            style={{
              fontSize: "var(--z-text-body)",
              fontWeight: "var(--z-weight-semibold)",
              color: "var(--z-navy)",
            }}
          >
            {title}
          </h3>
        </div>
        <p
          className="font-body"
          style={{
            color: "var(--z-muted)",
            fontSize: "var(--z-text-body-sm)",
            lineHeight: "var(--z-leading-relaxed)",
          }}
        >
          {text}
        </p>
      </div>
    </div>
  );
}
