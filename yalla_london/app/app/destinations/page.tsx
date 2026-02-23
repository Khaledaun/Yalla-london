import { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import Image from "next/image";
import { getBaseUrl } from "@/lib/url-utils";
import { getDefaultSiteId, getSiteConfig, getSiteDomain } from "@/config/sites";
import {
  Anchor,
  MapPin,
  Sun,
  Ship,
  Calendar,
  ChevronRight,
  Compass,
  Globe,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════
   UNSPLASH PHOTO MAP — free commercial license
   ═══════════════════════════════════════════════════════════════════ */
const DEST_IMAGES: Record<string, string> = {
  "greek-islands": "https://images.unsplash.com/photo-1696227213867-e16c8e082e8c?w=800&q=80&auto=format&fit=crop",
  "croatian-coast": "https://images.unsplash.com/photo-1626690218773-09d845797704?w=800&q=80&auto=format&fit=crop",
  "turkish-riviera": "https://images.unsplash.com/photo-1569263979104-865ab7cd8d13?w=800&q=80&auto=format&fit=crop",
  "amalfi-coast": "https://images.unsplash.com/photo-1515859005217-8a1f08870f59?w=800&q=80&auto=format&fit=crop",
  "french-riviera": "https://images.unsplash.com/photo-1491166617655-0723a0999cfc?w=800&q=80&auto=format&fit=crop",
  "balearic-islands": "https://images.unsplash.com/photo-1662908773886-f1a25e7a1c95?w=800&q=80&auto=format&fit=crop",
  "arabian-gulf": "https://images.unsplash.com/photo-1732296266498-68a67d84efdc?w=800&q=80&auto=format&fit=crop",
  "red-sea": "https://images.unsplash.com/photo-1580541631950-7282082b53ce?w=800&q=80&auto=format&fit=crop",
};

/* ═══════════════════════════════════════════════════════════════════
   STATIC DESTINATION DATA (DB fallback)
   ═══════════════════════════════════════════════════════════════════ */

interface Destination {
  slug: string;
  name_en: string;
  name_ar: string;
  region: "MEDITERRANEAN" | "ARABIAN_RED_SEA";
  season_en: string;
  season_ar: string;
  priceFrom: string;
  yachtCount: number;
  description_en: string;
  description_ar: string;
  featured: boolean;
}

const STATIC_DESTINATIONS: Destination[] = [
  {
    slug: "greek-islands",
    name_en: "Greek Islands",
    name_ar: "\u0627\u0644\u062c\u0632\u0631 \u0627\u0644\u064a\u0648\u0646\u0627\u0646\u064a\u0629",
    region: "MEDITERRANEAN",
    season_en: "May \u2013 October",
    season_ar: "\u0645\u0627\u064a\u0648 \u2013 \u0623\u0643\u062a\u0648\u0628\u0631",
    priceFrom: "\u20ac8,500",
    yachtCount: 42,
    description_en:
      "Crystal-clear Aegean waters, whitewashed villages, and over 6,000 islands to explore. The Cyclades and Ionian routes are among the world\u2019s finest sailing grounds.",
    description_ar:
      "\u0645\u064a\u0627\u0647 \u0628\u062d\u0631 \u0625\u064a\u062c\u0629 \u0627\u0644\u0635\u0627\u0641\u064a\u0629\u060c \u0642\u0631\u0649 \u0628\u064a\u0636\u0627\u0621 \u0648\u0623\u0643\u062b\u0631 \u0645\u0646 6,000 \u062c\u0632\u064a\u0631\u0629 \u0644\u0627\u0633\u062a\u0643\u0634\u0627\u0641\u0647\u0627.",
    featured: true,
  },
  {
    slug: "croatian-coast",
    name_en: "Croatian Coast",
    name_ar: "\u0627\u0644\u0633\u0627\u062d\u0644 \u0627\u0644\u0643\u0631\u0648\u0627\u062a\u064a",
    region: "MEDITERRANEAN",
    season_en: "June \u2013 September",
    season_ar: "\u064a\u0648\u0646\u064a\u0648 \u2013 \u0633\u0628\u062a\u0645\u0628\u0631",
    priceFrom: "\u20ac7,200",
    yachtCount: 35,
    description_en:
      "Over 1,200 islands dot the Adriatic, from the walled city of Dubrovnik to the pine-forested bays of Hvar. Exceptional marinas and a thriving food scene.",
    description_ar:
      "\u0623\u0643\u062b\u0631 \u0645\u0646 1,200 \u062c\u0632\u064a\u0631\u0629 \u0641\u064a \u0627\u0644\u0623\u062f\u0631\u064a\u0627\u062a\u064a\u0643\u060c \u0645\u0646 \u062f\u0648\u0628\u0631\u0648\u0641\u0646\u064a\u0643 \u0625\u0644\u0649 \u062e\u0644\u062c\u0627\u0646 \u0647\u0641\u0627\u0631.",
    featured: true,
  },
  {
    slug: "turkish-riviera",
    name_en: "Turkish Riviera",
    name_ar: "\u0627\u0644\u0631\u064a\u0641\u064a\u064a\u0631\u0627 \u0627\u0644\u062a\u0631\u0643\u064a\u0629",
    region: "MEDITERRANEAN",
    season_en: "April \u2013 November",
    season_ar: "\u0623\u0628\u0631\u064a\u0644 \u2013 \u0646\u0648\u0641\u0645\u0628\u0631",
    priceFrom: "\u20ac6,800",
    yachtCount: 28,
    description_en:
      "Home of the legendary blue cruise. Traditional gulets, turquoise bays, ancient Lycian ruins, and some of the Mediterranean\u2019s best-value chartering.",
    description_ar:
      "\u0645\u0648\u0637\u0646 \u0627\u0644\u0631\u062d\u0644\u0629 \u0627\u0644\u0632\u0631\u0642\u0627\u0621 \u0627\u0644\u0623\u0633\u0637\u0648\u0631\u064a\u0629. \u0642\u0648\u0627\u0631\u0628 \u0627\u0644\u063a\u0648\u0644\u064a\u062a \u0627\u0644\u062a\u0642\u0644\u064a\u062f\u064a\u0629 \u0648\u062e\u0644\u062c\u0627\u0646 \u0641\u064a\u0631\u0648\u0632\u064a\u0629.",
    featured: true,
  },
  {
    slug: "amalfi-coast",
    name_en: "Amalfi Coast",
    name_ar: "\u0633\u0627\u062d\u0644 \u0623\u0645\u0627\u0644\u0641\u064a",
    region: "MEDITERRANEAN",
    season_en: "May \u2013 October",
    season_ar: "\u0645\u0627\u064a\u0648 \u2013 \u0623\u0643\u062a\u0648\u0628\u0631",
    priceFrom: "\u20ac12,000",
    yachtCount: 18,
    description_en:
      "Dramatic clifftop villages, Capri\u2019s Blue Grotto, and the glamour of Positano. Italy\u2019s most iconic coastal sailing.",
    description_ar:
      "\u0642\u0631\u0649 \u0639\u0644\u0649 \u0642\u0645\u0645 \u0627\u0644\u0645\u0646\u062d\u062f\u0631\u0627\u062a\u060c \u0643\u0647\u0641 \u0643\u0627\u0628\u0631\u064a \u0627\u0644\u0623\u0632\u0631\u0642 \u0648\u0633\u062d\u0631 \u0628\u0648\u0632\u064a\u062a\u0627\u0646\u0648.",
    featured: false,
  },
  {
    slug: "french-riviera",
    name_en: "French Riviera",
    name_ar: "\u0627\u0644\u0631\u064a\u0641\u064a\u064a\u0631\u0627 \u0627\u0644\u0641\u0631\u0646\u0633\u064a\u0629",
    region: "MEDITERRANEAN",
    season_en: "May \u2013 September",
    season_ar: "\u0645\u0627\u064a\u0648 \u2013 \u0633\u0628\u062a\u0645\u0628\u0631",
    priceFrom: "\u20ac15,000",
    yachtCount: 22,
    description_en:
      "From Saint-Tropez to Monaco, the C\u00f4te d\u2019Azur is the pinnacle of yachting glamour. Superyacht marinas, Michelin dining, and endless sunshine.",
    description_ar:
      "\u0645\u0646 \u0633\u0627\u0646 \u062a\u0631\u0648\u0628\u064a\u0647 \u0625\u0644\u0649 \u0645\u0648\u0646\u0627\u0643\u0648\u060c \u0642\u0645\u0629 \u0641\u062e\u0627\u0645\u0629 \u0627\u0644\u064a\u062e\u0648\u062a.",
    featured: false,
  },
  {
    slug: "balearic-islands",
    name_en: "Balearic Islands",
    name_ar: "\u062c\u0632\u0631 \u0627\u0644\u0628\u0644\u064a\u0627\u0631",
    region: "MEDITERRANEAN",
    season_en: "May \u2013 October",
    season_ar: "\u0645\u0627\u064a\u0648 \u2013 \u0623\u0643\u062a\u0648\u0628\u0631",
    priceFrom: "\u20ac9,500",
    yachtCount: 20,
    description_en:
      "Mallorca, Ibiza, Menorca, and Formentera offer a blend of nightlife, hidden coves, and family-friendly sailing in warm Spanish waters.",
    description_ar:
      "\u0645\u0627\u064a\u0648\u0631\u0643\u0627 \u0648\u0625\u064a\u0628\u064a\u0632\u0627 \u0648\u0645\u064a\u0646\u0648\u0631\u0643\u0627 \u062a\u0648\u0641\u0631 \u0645\u0632\u064a\u062c\u0627\u064b \u0645\u0646 \u0627\u0644\u062d\u064a\u0627\u0629 \u0627\u0644\u0644\u064a\u0644\u064a\u0629 \u0648\u0627\u0644\u062e\u0644\u062c\u0627\u0646 \u0627\u0644\u0645\u062e\u0641\u064a\u0629.",
    featured: false,
  },
  {
    slug: "arabian-gulf",
    name_en: "Arabian Gulf",
    name_ar: "\u0627\u0644\u062e\u0644\u064a\u062c \u0627\u0644\u0639\u0631\u0628\u064a",
    region: "ARABIAN_RED_SEA",
    season_en: "October \u2013 April",
    season_ar: "\u0623\u0643\u062a\u0648\u0628\u0631 \u2013 \u0623\u0628\u0631\u064a\u0644",
    priceFrom: "$12,000",
    yachtCount: 15,
    description_en:
      "Dubai, Abu Dhabi, and Qatar offer world-class superyacht experiences. Perfect winter charter with warm waters, stunning skylines, and halal dining throughout.",
    description_ar:
      "\u062f\u0628\u064a \u0648\u0623\u0628\u0648\u0638\u0628\u064a \u0648\u0642\u0637\u0631 \u062a\u0648\u0641\u0631 \u062a\u062c\u0627\u0631\u0628 \u064a\u062e\u0648\u062a \u0641\u0627\u062e\u0631\u0629 \u0639\u0627\u0644\u0645\u064a\u0629 \u0627\u0644\u0645\u0633\u062a\u0648\u0649.",
    featured: false,
  },
  {
    slug: "red-sea",
    name_en: "Red Sea",
    name_ar: "\u0627\u0644\u0628\u062d\u0631 \u0627\u0644\u0623\u062d\u0645\u0631",
    region: "ARABIAN_RED_SEA",
    season_en: "September \u2013 May",
    season_ar: "\u0633\u0628\u062a\u0645\u0628\u0631 \u2013 \u0645\u0627\u064a\u0648",
    priceFrom: "$9,000",
    yachtCount: 10,
    description_en:
      "Pristine coral reefs, Egypt\u2019s Hurghada, and Saudi Arabia\u2019s NEOM coastline. Emerging charter destination with world-class diving and year-round warmth.",
    description_ar:
      "\u0634\u0639\u0627\u0628 \u0645\u0631\u062c\u0627\u0646\u064a\u0629 \u0628\u0643\u0631\u060c \u0627\u0644\u063a\u0631\u062f\u0642\u0629 \u0648\u0633\u0627\u062d\u0644 \u0646\u064a\u0648\u0645 \u0627\u0644\u0633\u0639\u0648\u062f\u064a.",
    featured: false,
  },
];

/* ═══════════════════════════════════════════════════════════════════
   METADATA
   ═══════════════════════════════════════════════════════════════════ */

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = await getBaseUrl();
  const headersList = await headers();
  const siteId = headersList.get("x-site-id") || getDefaultSiteId();
  const siteConfig = getSiteConfig(siteId);
  const siteName = siteConfig?.name || "Zenitha Yachts";
  const canonicalUrl = `${baseUrl}/destinations`;

  return {
    title: `Yacht Charter Destinations | ${siteName}`,
    description:
      "Discover the finest yacht charter destinations across the Mediterranean, Arabian Gulf, and Red Sea. Greek Islands, Croatian Coast, Turkish Riviera, and more.",
    alternates: {
      canonical: canonicalUrl,
      languages: {
        "en-GB": canonicalUrl,
        "ar-SA": `${baseUrl}/ar/destinations`,
        "x-default": canonicalUrl,
      },
    },
    openGraph: {
      title: `Yacht Charter Destinations | ${siteName}`,
      description:
        "Discover the finest yacht charter destinations across the Mediterranean, Arabian Gulf, and Red Sea.",
      url: canonicalUrl,
      siteName,
      locale: "en_GB",
      alternateLocale: "ar_SA",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `Yacht Charter Destinations | ${siteName}`,
      description:
        "Discover the finest yacht charter destinations across the Mediterranean, Arabian Gulf, and Red Sea.",
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

export default async function DestinationsPage() {
  const headersList = await headers();
  const siteId = headersList.get("x-site-id") || getDefaultSiteId();
  const baseUrl = await getBaseUrl();

  /* Try DB first, fall back to static data */
  let destinations: Destination[] = STATIC_DESTINATIONS;
  try {
    const { prisma } = await import("@/lib/db");
    const dbDestinations = await prisma.yachtDestination.findMany({
      where: { siteId, status: "active" },
      orderBy: { name: "asc" },
    });
    if (dbDestinations.length > 0) {
      destinations = dbDestinations.map((d) => ({
        slug: d.slug,
        name_en: d.name,
        name_ar: d.description_ar ? d.name : d.name,
        region: d.region as "MEDITERRANEAN" | "ARABIAN_RED_SEA",
        season_en: d.seasonStart && d.seasonEnd ? `${d.seasonStart} \u2013 ${d.seasonEnd}` : "May \u2013 October",
        season_ar: d.seasonStart && d.seasonEnd ? `${d.seasonStart} \u2013 ${d.seasonEnd}` : "\u0645\u0627\u064a\u0648 \u2013 \u0623\u0643\u062a\u0648\u0628\u0631",
        priceFrom: d.averagePricePerWeek ? `\u20ac${Number(d.averagePricePerWeek).toLocaleString()}` : "\u20ac8,000",
        yachtCount: 0,
        description_en: d.description_en || "",
        description_ar: d.description_ar || "",
        featured: false,
      }));
    }
  } catch (e) {
    console.warn("[destinations-page] DB query failed, using static data:", e);
  }

  const featured = destinations.filter((d) => d.featured);
  const mediterranean = destinations.filter((d) => d.region === "MEDITERRANEAN");
  const arabianRedSea = destinations.filter((d) => d.region === "ARABIAN_RED_SEA");

  /* ItemList structured data */
  const itemListData = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Yacht Charter Destinations",
    description: "Explore premier yacht charter destinations across the Mediterranean, Arabian Gulf, and Red Sea.",
    numberOfItems: destinations.length,
    itemListElement: destinations.map((d, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: d.name_en,
      url: `${baseUrl}/destinations/${d.slug}`,
    })),
  };

  return (
    <>
      {/* ItemList structured data (breadcrumb provided by layout) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListData) }}
      />

      <div className="min-h-screen" style={{ background: "var(--z-bg)" }}>
        {/* ── Hero Section ── */}
        <section
          className="relative overflow-hidden"
          style={{
            background: "var(--z-gradient-hero)",
            minHeight: "60vh",
            display: "flex",
            alignItems: "center",
          }}
        >
          {/* Decorative map placeholder */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full border-2 border-dashed" style={{ borderColor: "var(--z-gold)" }} />
            <div className="absolute top-1/3 right-1/4 w-48 h-48 rounded-full border border-dashed" style={{ borderColor: "var(--z-ocean)" }} />
            <div className="absolute bottom-1/4 left-1/3 w-32 h-32 rounded-full border border-dashed" style={{ borderColor: "var(--z-shallow)" }} />
          </div>

          <div className="z-container relative z-10 py-24">
            <div className="max-w-3xl">
              <p className="z-text-overline mb-4">Charter Destinations</p>
              <h1
                className="font-display mb-6"
                style={{
                  fontSize: "var(--z-text-hero-display)",
                  fontWeight: "var(--z-weight-bold)",
                  lineHeight: "var(--z-leading-tight)",
                  color: "var(--z-pearl)",
                }}
              >
                Discover Your Sailing Destination
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
                From the sun-drenched Greek Islands to the turquoise bays of
                Turkey and the warm waters of the Arabian Gulf &mdash; find your
                perfect charter destination.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="#featured" className="z-btn z-btn-primary z-btn-lg">
                  <Compass className="w-5 h-5" />
                  Explore Destinations
                </Link>
                <Link
                  href="/charter-planner"
                  className="z-btn z-btn-secondary z-btn-lg"
                  style={{ color: "var(--z-pearl)", borderColor: "rgba(255,255,255,0.3)" }}
                >
                  <Ship className="w-5 h-5" />
                  Plan Your Charter
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── Featured Destinations ── */}
        {featured.length > 0 && (
          <section id="featured" className="z-section" style={{ background: "var(--z-pearl)" }}>
            <div className="z-container">
              <div className="text-center mb-12">
                <p className="z-text-overline mb-2">Top Picks</p>
                <h2
                  className="font-display mb-4"
                  style={{
                    fontSize: "var(--z-text-title-lg)",
                    fontWeight: "var(--z-weight-bold)",
                    color: "var(--z-navy)",
                  }}
                >
                  Featured Destinations
                </h2>
                <span className="z-gold-bar z-gold-bar-wide mx-auto" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {featured.map((dest) => (
                  <DestinationCardLarge key={dest.slug} destination={dest} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── Mediterranean ── */}
        <section className="z-section" style={{ background: "var(--z-sand)" }}>
          <div className="z-container">
            <div className="flex items-center gap-3 mb-8">
              <Globe className="w-6 h-6" style={{ color: "var(--z-aegean)" }} />
              <h2
                className="font-heading"
                style={{
                  fontSize: "var(--z-text-title)",
                  fontWeight: "var(--z-weight-bold)",
                  color: "var(--z-navy)",
                }}
              >
                Mediterranean
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {mediterranean.map((dest) => (
                <DestinationCard key={dest.slug} destination={dest} />
              ))}
            </div>
          </div>
        </section>

        {/* ── Arabian & Red Sea ── */}
        {arabianRedSea.length > 0 && (
          <section className="z-section" style={{ background: "var(--z-pearl)" }}>
            <div className="z-container">
              <div className="flex items-center gap-3 mb-8">
                <Anchor className="w-6 h-6" style={{ color: "var(--z-gold)" }} />
                <h2
                  className="font-heading"
                  style={{
                    fontSize: "var(--z-text-title)",
                    fontWeight: "var(--z-weight-bold)",
                    color: "var(--z-navy)",
                  }}
                >
                  Arabian &amp; Red Sea
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {arabianRedSea.map((dest) => (
                  <DestinationCard key={dest.slug} destination={dest} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── CTA ── */}
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
              Not Sure Where to Go?
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
              Our AI charter planner matches your preferences, dates, and budget
              to the perfect destination and yacht.
            </p>
            <Link href="/charter-planner" className="z-btn z-btn-primary z-btn-lg">
              <Compass className="w-5 h-5" />
              Start Planning
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   CARD COMPONENTS
   ═══════════════════════════════════════════════════════════════════ */

function DestinationCardLarge({ destination }: { destination: Destination }) {
  return (
    <Link
      href={`/destinations/${destination.slug}`}
      className="z-card group block"
      style={{ background: "var(--z-surface)" }}
    >
      {/* Destination photo */}
      <div
        className="relative z-aspect-video overflow-hidden"
        style={{ background: "var(--z-gradient-card)" }}
      >
        {DEST_IMAGES[destination.slug] && (
          <Image
            src={DEST_IMAGES[destination.slug]}
            alt={`${destination.name_en} yacht charter destination`}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        )}
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to top, rgba(10,22,40,0.6), transparent)" }}
        />
        <div className="absolute bottom-4 left-4 right-4 z-10">
          <span className="z-badge z-badge-gold">{destination.season_en}</span>
        </div>
      </div>
      <div className="z-card-body">
        <h3
          className="font-heading mb-2 group-hover:text-[var(--z-aegean)] transition-colors"
          style={{
            fontSize: "var(--z-text-subtitle)",
            fontWeight: "var(--z-weight-bold)",
            color: "var(--z-navy)",
          }}
        >
          {destination.name_en}
        </h3>
        <p
          className="z-line-clamp-2 mb-4 font-body"
          style={{ color: "var(--z-muted)", fontSize: "var(--z-text-body-sm)" }}
        >
          {destination.description_en}
        </p>
        <div className="flex items-center justify-between">
          <div>
            <span className="z-text-overline" style={{ fontSize: "var(--z-text-micro)" }}>
              From
            </span>
            <span
              className="font-mono ml-2"
              style={{
                fontSize: "var(--z-text-heading)",
                fontWeight: "var(--z-weight-bold)",
                color: "var(--z-navy)",
              }}
            >
              {destination.priceFrom}
            </span>
            <span className="z-text-caption ml-1">/week</span>
          </div>
          {destination.yachtCount > 0 && (
            <span className="z-badge z-badge-ocean">
              <Ship className="w-3 h-3" />
              {destination.yachtCount} yachts
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function DestinationCard({ destination }: { destination: Destination }) {
  return (
    <Link
      href={`/destinations/${destination.slug}`}
      className="z-card group flex flex-col"
      style={{ background: "var(--z-surface)" }}
    >
      <div
        className="relative z-aspect-photo overflow-hidden"
        style={{ background: "var(--z-gradient-card)" }}
      >
        {DEST_IMAGES[destination.slug] ? (
          <Image
            src={DEST_IMAGES[destination.slug]}
            alt={`${destination.name_en} charter destination`}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <MapPin className="w-8 h-8" style={{ color: "rgba(255,255,255,0.15)" }} />
          </div>
        )}
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to top, rgba(10,22,40,0.5), transparent 60%)" }}
        />
      </div>
      <div className="z-card-body flex-1 flex flex-col">
        <h3
          className="font-heading mb-1 group-hover:text-[var(--z-aegean)] transition-colors"
          style={{
            fontSize: "var(--z-text-heading)",
            fontWeight: "var(--z-weight-semibold)",
            color: "var(--z-navy)",
          }}
        >
          {destination.name_en}
        </h3>
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-3.5 h-3.5" style={{ color: "var(--z-gold)" }} />
          <span className="z-text-caption">{destination.season_en}</span>
        </div>
        <p
          className="z-line-clamp-2 mb-4 font-body flex-1"
          style={{ color: "var(--z-muted)", fontSize: "var(--z-text-body-sm)" }}
        >
          {destination.description_en}
        </p>
        <div className="flex items-center justify-between pt-3" style={{ borderTop: "1px solid var(--z-border-subtle)" }}>
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
              {destination.priceFrom}
            </span>
            <span className="z-text-caption">/wk</span>
          </div>
          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" style={{ color: "var(--z-gold)" }} />
        </div>
      </div>
    </Link>
  );
}
