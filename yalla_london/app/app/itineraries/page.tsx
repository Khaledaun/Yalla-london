import { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import Image from "next/image";
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
  Filter,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════════════ */


const DURATION_FILTERS = [
  { label: "All Durations", min: 0, max: 999 },
  { label: "3-5 Days", min: 3, max: 5 },
  { label: "7 Days", min: 7, max: 7 },
  { label: "10-14 Days", min: 10, max: 14 },
];

const DIFFICULTY_LABELS: Record<string, string> = {
  EASY: "Easy",
  MODERATE: "Moderate",
  ADVANCED: "Advanced",
};

/* ═══════════════════════════════════════════════════════════════════
   PAGE COMPONENT
   ═══════════════════════════════════════════════════════════════════ */

export default async function ItinerariesPage({
  searchParams,
}: {
  searchParams: Promise<{ dest?: string; dur?: string; diff?: string }>;
}) {
  const headersList = await headers();
  const siteId = headersList.get("x-site-id") || getDefaultSiteId();
  const baseUrl = await getBaseUrl();
  const params = await searchParams;
  const filterDest = params.dest || "";
  const filterDur = params.dur || "";
  const filterDiff = params.diff || "";

  /* ── Fetch itineraries with destination relation ── */
  interface ItineraryWithDest {
    id: string;
    title_en: string;
    title_ar: string | null;
    slug: string;
    duration: number;
    difficulty: string;
    description_en: string | null;
    estimatedCost: unknown;
    currency: string;
    heroImage: string | null;
    bestSeason: string | null;
    destination: {
      id: string;
      name: string;
      slug: string;
      region: string;
    };
  }

  interface DestinationOption {
    id: string;
    name: string;
    slug: string;
  }

  let itineraries: ItineraryWithDest[] = [];
  let destinations: DestinationOption[] = [];

  try {
    const { prisma } = await import("@/lib/db");

    [itineraries, destinations] = await Promise.all([
      prisma.charterItinerary.findMany({
        where: { siteId, status: "active" },
        include: {
          destination: {
            select: { id: true, name: true, slug: true, region: true },
          },
        },
        orderBy: [{ duration: "asc" }, { title_en: "asc" }],
      }) as Promise<ItineraryWithDest[]>,
      prisma.yachtDestination.findMany({
        where: { siteId, status: "active" },
        select: { id: true, name: true, slug: true },
        orderBy: { name: "asc" },
      }),
    ]);
  } catch (e) {
    console.warn("[itineraries-page] DB query failed:", e);
  }

  // Apply server-side filters from URL searchParams
  let filtered = itineraries;
  if (filterDest) {
    filtered = filtered.filter((it) => it.destination?.slug === filterDest);
  }
  if (filterDur) {
    const [minStr, maxStr] = filterDur.split("-");
    const min = parseInt(minStr, 10) || 0;
    const max = parseInt(maxStr, 10) || 999;
    filtered = filtered.filter((it) => it.duration >= min && it.duration <= max);
  }
  if (filterDiff) {
    filtered = filtered.filter((it) => it.difficulty === filterDiff);
  }

  /* ── ItemList structured data ── */
  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Sailing Itineraries",
    description: "Curated yacht charter itineraries across the Mediterranean and beyond.",
    numberOfItems: filtered.length,
    itemListElement: filtered.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.title_en,
      url: `${baseUrl}/itineraries/${it.slug}`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />

      <div className="min-h-screen" style={{ background: "var(--z-bg)" }}>
        {/* ────────────────────────────────────────────────────────────
            HERO
           ──────────────────────────────────────────────────────────── */}
        <section
          className="relative overflow-hidden"
          style={{
            background: "var(--z-gradient-hero)",
            minHeight: "50vh",
            display: "flex",
            alignItems: "center",
          }}
        >
          {/* Decorative elements */}
          <div className="absolute inset-0 opacity-10">
            <div
              className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full border-2 border-dashed"
              style={{ borderColor: "var(--z-gold)" }}
            />
            <div
              className="absolute bottom-1/4 right-1/3 w-48 h-48 rounded-full border border-dashed"
              style={{ borderColor: "var(--z-ocean)" }}
            />
          </div>

          <div className="z-container relative z-10 py-24">
            <div className="max-w-3xl">
              <p className="z-text-overline mb-4">Sailing Routes</p>
              <h1
                className="font-display mb-6"
                style={{
                  fontSize: "var(--z-text-hero-display)",
                  fontWeight: "var(--z-weight-bold)",
                  lineHeight: "var(--z-leading-tight)",
                  color: "var(--z-pearl)",
                }}
              >
                Curated Sailing Itineraries
              </h1>
              <p
                className="font-body mb-8"
                style={{
                  fontSize: "var(--z-text-body-lg)",
                  color: "var(--z-champagne)",
                  lineHeight: "var(--z-leading-relaxed)",
                  maxWidth: "600px",
                }}
              >
                Expert-planned routes with day-by-day breakdowns, recommended
                anchorages, and local insights. Each itinerary is crafted by
                captains who know these waters intimately.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="#itineraries" className="z-btn z-btn-primary z-btn-lg">
                  <Navigation className="w-5 h-5" />
                  Browse Routes
                </Link>
                <Link
                  href="/charter-planner"
                  className="z-btn z-btn-secondary z-btn-lg"
                  style={{ color: "var(--z-pearl)", borderColor: "rgba(255,255,255,0.3)" }}
                >
                  <Compass className="w-5 h-5" />
                  Custom Itinerary
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ────────────────────────────────────────────────────────────
            FILTER BAR
           ──────────────────────────────────────────────────────────── */}
        <section
          id="itineraries"
          className="sticky top-0 z-20"
          style={{
            background: "var(--z-surface)",
            borderBottom: "1px solid var(--z-border-subtle)",
            boxShadow: "var(--z-shadow-xs)",
          }}
        >
          <div className="z-container py-4">
            <form method="get" action="/itineraries#itineraries" className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2" style={{ color: "var(--z-muted)" }}>
                <Filter className="w-4 h-4" />
                <span
                  className="font-heading"
                  style={{
                    fontSize: "var(--z-text-body-sm)",
                    fontWeight: "var(--z-weight-semibold)",
                  }}
                >
                  Filter:
                </span>
              </div>

              {/* Destination filter */}
              {destinations.length > 0 && (
                <div>
                  <select
                    className="z-input z-input-sm"
                    style={{ minWidth: "180px" }}
                    aria-label="Filter by destination"
                    name="dest"
                    defaultValue={filterDest}
                  >
                    <option value="">All Destinations</option>
                    {destinations.map((d) => (
                      <option key={d.id} value={d.slug}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Duration filter */}
              <div>
                <select
                  className="z-input z-input-sm"
                  style={{ minWidth: "150px" }}
                  aria-label="Filter by duration"
                  name="dur"
                  defaultValue={filterDur}
                >
                  {DURATION_FILTERS.map((f) => (
                    <option key={f.label} value={f.min === 0 && f.max === 999 ? "" : `${f.min}-${f.max}`}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Difficulty filter */}
              <div>
                <select
                  className="z-input z-input-sm"
                  style={{ minWidth: "140px" }}
                  aria-label="Filter by difficulty"
                  name="diff"
                  defaultValue={filterDiff}
                >
                  <option value="">All Levels</option>
                  {Object.entries(DIFFICULTY_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="z-btn z-btn-sm"
                style={{ background: "var(--z-aegean)", color: "#fff", borderRadius: "var(--z-radius-md)", padding: "0.4rem 1rem", fontSize: "var(--z-text-body-sm)" }}
              >
                Apply
              </button>

              {(filterDest || filterDur || filterDiff) && (
                <a href="/itineraries" className="text-sm" style={{ color: "var(--z-coral)" }}>
                  Clear
                </a>
              )}

              {/* Count */}
              <span
                className="ml-auto z-text-caption"
                style={{ color: "var(--z-muted)" }}
              >
                {filtered.length} itinerar{filtered.length === 1 ? "y" : "ies"}
                {filtered.length !== itineraries.length && ` of ${itineraries.length}`}
              </span>
            </form>
          </div>
        </section>

        {/* ────────────────────────────────────────────────────────────
            ITINERARY CARDS GRID
           ──────────────────────────────────────────────────────────── */}
        <section className="z-section" style={{ background: "var(--z-pearl)" }}>
          <div className="z-container">
            {filtered.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {filtered.map((itin) => (
                  <Link
                    key={itin.id}
                    href={`/itineraries/${itin.slug}`}
                    className="z-card group flex flex-col"
                    style={{ background: "var(--z-surface)" }}
                  >
                    {/* Image */}
                    <div className="relative z-aspect-photo">
                      {itin.heroImage ? (
                        <Image
                          src={itin.heroImage}
                          alt={itin.title_en}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      ) : (
                        <div
                          className="absolute inset-0 flex items-center justify-center"
                          style={{ background: "var(--z-gradient-card)" }}
                        >
                          <Navigation
                            className="w-10 h-10"
                            style={{ color: "rgba(255,255,255,0.15)" }}
                          />
                        </div>
                      )}
                      <div
                        className="absolute inset-0"
                        style={{ background: "var(--z-gradient-overlay-light)" }}
                      />
                      {/* Badges */}
                      <div className="absolute top-3 left-3 flex gap-2">
                        <span className="z-badge z-badge-gold">
                          <Clock className="w-3 h-3" /> {itin.duration} Days
                        </span>
                        <span className="z-badge z-badge-ocean">
                          {DIFFICULTY_LABELS[itin.difficulty] || itin.difficulty}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="z-card-body flex-1 flex flex-col">
                      <h3
                        className="font-heading mb-1 group-hover:text-[var(--z-aegean)] transition-colors"
                        style={{
                          fontSize: "var(--z-text-heading)",
                          fontWeight: "var(--z-weight-semibold)",
                          color: "var(--z-navy)",
                        }}
                      >
                        {itin.title_en}
                      </h3>

                      {/* Destination */}
                      <div className="flex items-center gap-1.5 mb-3">
                        <MapPin className="w-3.5 h-3.5" style={{ color: "var(--z-gold)" }} />
                        <span className="z-text-caption">{itin.destination.name}</span>
                      </div>

                      {/* Description excerpt */}
                      {itin.description_en && (
                        <p
                          className="z-line-clamp-2 mb-4 font-body flex-1"
                          style={{
                            color: "var(--z-muted)",
                            fontSize: "var(--z-text-body-sm)",
                          }}
                        >
                          {itin.description_en}
                        </p>
                      )}

                      {/* Best season */}
                      {itin.bestSeason && (
                        <div className="mb-3">
                          <span className="z-badge z-badge-outline">{itin.bestSeason}</span>
                        </div>
                      )}

                      {/* Price + CTA */}
                      <div
                        className="flex items-center justify-between pt-3 mt-auto"
                        style={{ borderTop: "1px solid var(--z-border-subtle)" }}
                      >
                        {itin.estimatedCost ? (
                          <div>
                            <span className="z-text-caption">Est. </span>
                            <span
                              className="font-mono"
                              style={{
                                fontSize: "var(--z-text-body)",
                                fontWeight: "var(--z-weight-bold)",
                                color: "var(--z-navy)",
                              }}
                            >
                              {itin.currency === "EUR" ? "\u20ac" : "$"}
                              {Number(itin.estimatedCost).toLocaleString()}
                            </span>
                          </div>
                        ) : (
                          <span className="z-text-caption">Price on request</span>
                        )}
                        <span
                          className="inline-flex items-center gap-1 font-heading group-hover:translate-x-1 transition-transform"
                          style={{
                            fontSize: "var(--z-text-body-sm)",
                            fontWeight: "var(--z-weight-semibold)",
                            color: "var(--z-aegean)",
                          }}
                        >
                          View Itinerary
                          <ChevronRight className="w-4 h-4" />
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              /* ── Empty state ── */
              <div className="text-center py-20">
                <Navigation
                  className="w-16 h-16 mx-auto mb-6"
                  style={{ color: "var(--z-champagne)" }}
                />
                <h2
                  className="font-display mb-3"
                  style={{
                    fontSize: "var(--z-text-title)",
                    fontWeight: "var(--z-weight-bold)",
                    color: "var(--z-navy)",
                  }}
                >
                  Itineraries Coming Soon
                </h2>
                <p
                  className="font-body mb-8 max-w-md mx-auto"
                  style={{
                    color: "var(--z-muted)",
                    fontSize: "var(--z-text-body)",
                    lineHeight: "var(--z-leading-relaxed)",
                  }}
                >
                  Our captains are charting the finest routes across the
                  Mediterranean. In the meantime, our charter experts can plan a
                  bespoke itinerary tailored to your wishes.
                </p>
                <Link href="/charter-planner" className="z-btn z-btn-primary z-btn-lg">
                  <Compass className="w-5 h-5" />
                  Plan a Custom Route
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* ────────────────────────────────────────────────────────────
            CTA
           ──────────────────────────────────────────────────────────── */}
        <section
          style={{ background: "var(--z-gradient-hero)", padding: "var(--z-space-16) 0" }}
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
              Can&apos;t Find Your Ideal Route?
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
              Let us plan a bespoke sailing itinerary matched to your dates,
              preferences, and budget.
            </p>
            <Link href="/charter-planner" className="z-btn z-btn-primary z-btn-lg">
              <Compass className="w-5 h-5" />
              Plan Your Route
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
