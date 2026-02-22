import Link from "next/link";
import { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getBaseUrl } from "@/lib/url-utils";
import {
  getDefaultSiteId,
  getSiteConfig,
  getSiteDomain,
} from "@/config/sites";
import { StructuredData } from "@/components/structured-data";
import { YachtDetailClient } from "./yacht-detail-client";
import { YachtGallery } from "@/components/zenitha/yacht-gallery";
import { WhatsAppButton } from "@/components/zenitha/whatsapp-button";

// ─── Types ──────────────────────────────────────────────────────────

interface YachtData {
  id: string;
  name: string;
  slug: string;
  type: string;
  length: number | null;
  beam: number | null;
  draft: number | null;
  yearBuilt: number | null;
  builder: string | null;
  model: string | null;
  cabins: number;
  berths: number;
  bathrooms: number;
  crewSize: number;
  pricePerWeekLow: number | null;
  pricePerWeekHigh: number | null;
  currency: string;
  description_en: string | null;
  description_ar: string | null;
  features: string[] | null;
  images: string[] | null;
  waterSports: string[] | null;
  halalCateringAvailable: boolean;
  familyFriendly: boolean;
  crewIncluded: boolean;
  homePort: string | null;
  cruisingArea: string | null;
  rating: number | null;
  reviewCount: number;
  featured: boolean;
  destination: {
    name: string;
    slug: string;
    region: string;
  } | null;
  reviews: {
    id: string;
    authorName: string;
    rating: number;
    title_en: string | null;
    title_ar: string | null;
    review_en: string | null;
    review_ar: string | null;
    charterDate: string | null;
    createdAt: string;
  }[];
}

// ─── Placeholder Data ───────────────────────────────────────────────

const PLACEHOLDER_YACHT: YachtData = {
  id: "placeholder-001",
  name: "Aegean Splendor",
  slug: "aegean-splendor",
  type: "MOTOR_YACHT",
  length: 42,
  beam: 8.5,
  draft: 2.2,
  yearBuilt: 2022,
  builder: "Benetti",
  model: "Oasis 40M",
  cabins: 5,
  berths: 10,
  bathrooms: 5,
  crewSize: 7,
  pricePerWeekLow: 85000,
  pricePerWeekHigh: 120000,
  currency: "EUR",
  description_en:
    "The Aegean Splendor is a masterfully crafted 42-metre motor yacht by Benetti, built in 2022 to the highest standards of Italian maritime craftsmanship. With five luxuriously appointed staterooms accommodating up to ten guests, she offers an intimate yet spacious charter experience across the Mediterranean. Her experienced crew of seven anticipates every need, from arranging private dining on secluded beaches to coordinating seamless transfers between ports.\n\nHer expansive sundeck features a Jacuzzi with panoramic views, a full wet bar, and a shaded dining area perfect for sunset meals. The main deck salon blends contemporary Italian design with warm walnut finishes, creating an atmosphere of refined comfort. A fully equipped water sports platform at the stern provides direct access to the sea, with a tender, jet skis, paddleboards, and snorkelling gear ready for adventure.\n\nCertified halal catering is available upon request, with an onboard chef experienced in preparing traditional Middle Eastern and Mediterranean cuisine using the finest local ingredients sourced from each port of call.",
  description_ar:
    "\u064A\u062E\u062A \u0625\u064A\u062C\u064A\u0627\u0646 \u0633\u0628\u0644\u0646\u062F\u0648\u0631 \u0647\u0648 \u064A\u062E\u062A \u0645\u0648\u062A\u0648\u0631 \u0628\u0637\u0648\u0644 42 \u0645\u062A\u0631\u0627\u064B \u0645\u0646 \u0628\u0646\u064A\u062A\u064A\u060C \u062A\u0645 \u0628\u0646\u0627\u0624\u0647 \u0641\u064A 2022 \u0628\u0623\u0639\u0644\u0649 \u0645\u0639\u0627\u064A\u064A\u0631 \u0627\u0644\u062D\u0631\u0641\u064A\u0629 \u0627\u0644\u0628\u062D\u0631\u064A\u0629 \u0627\u0644\u0625\u064A\u0637\u0627\u0644\u064A\u0629. \u064A\u0636\u0645 \u062E\u0645\u0633 \u063A\u0631\u0641 \u0641\u0627\u062E\u0631\u0629 \u062A\u062A\u0633\u0639 \u0644\u0639\u0634\u0631\u0629 \u0636\u064A\u0648\u0641\u060C \u0645\u0639 \u0637\u0627\u0642\u0645 \u0645\u0643\u0648\u0646 \u0645\u0646 \u0633\u0628\u0639\u0629 \u0623\u0641\u0631\u0627\u062F. \u064A\u062A\u0648\u0641\u0631 \u0637\u0639\u0627\u0645 \u062D\u0644\u0627\u0644 \u0645\u0639\u062A\u0645\u062F \u0639\u0646\u062F \u0627\u0644\u0637\u0644\u0628.",
  features: [
    "Jacuzzi",
    "Stabilizers at anchor",
    "Air conditioning",
    "Wifi",
    "Satellite TV",
    "Gym",
    "BBQ",
    "Underwater lights",
    "Deck Jacuzzi",
    "Sun awning",
    "Tender garage",
    "Zero-speed stabilizers",
  ],
  images: null,
  waterSports: [
    "Jet Ski",
    "Paddleboard",
    "Snorkelling gear",
    "Water skiing",
    "Wakeboard",
    "Fishing gear",
    "Sea scooter",
    "Kayak",
  ],
  halalCateringAvailable: true,
  familyFriendly: true,
  crewIncluded: true,
  homePort: "Athens, Greece",
  cruisingArea: "Greek Islands, Turkish Coast",
  rating: 4.8,
  reviewCount: 24,
  featured: true,
  destination: {
    name: "Greek Islands",
    slug: "greek-islands",
    region: "MEDITERRANEAN",
  },
  reviews: [
    {
      id: "rev-1",
      authorName: "Ahmed K.",
      rating: 5,
      title_en: "An unforgettable family charter",
      title_ar: "\u0631\u062D\u0644\u0629 \u0639\u0627\u0626\u0644\u064A\u0629 \u0644\u0627 \u062A\u064F\u0646\u0633\u0649",
      review_en:
        "We chartered the Aegean Splendor for a week through the Cyclades with our family. The halal catering was outstanding \u2014 the chef prepared fresh grilled fish every day using ingredients from the local markets. The crew was incredibly attentive to our children, and the water sports platform kept everyone entertained for hours.",
      review_ar:
        "\u0627\u0633\u062A\u0623\u062C\u0631\u0646\u0627 \u0627\u0644\u064A\u062E\u062A \u0644\u0645\u062F\u0629 \u0623\u0633\u0628\u0648\u0639 \u0639\u0628\u0631 \u0633\u064A\u0643\u0644\u0627\u062F\u064A\u0632 \u0645\u0639 \u0639\u0627\u0626\u0644\u062A\u0646\u0627. \u0643\u0627\u0646 \u0627\u0644\u0637\u0639\u0627\u0645 \u0627\u0644\u062D\u0644\u0627\u0644 \u0645\u0645\u062A\u0627\u0632\u0627\u064B.",
      charterDate: "2025-08",
      createdAt: "2025-09-15T00:00:00Z",
    },
    {
      id: "rev-2",
      authorName: "Sarah M.",
      rating: 5,
      title_en: "Luxury beyond expectations",
      title_ar: "\u0641\u062E\u0627\u0645\u0629 \u062A\u0641\u0648\u0642 \u0627\u0644\u062A\u0648\u0642\u0639\u0627\u062A",
      review_en:
        "From the moment we stepped aboard, every detail was perfect. The master suite is enormous, and the sundeck Jacuzzi with views of Santorini at sunset was the highlight of our honeymoon. Captain Nikos knew the best hidden bays away from the tourist crowds.",
      review_ar:
        "\u0645\u0646 \u0644\u062D\u0638\u0629 \u0635\u0639\u0648\u062F\u0646\u0627 \u0639\u0644\u0649 \u0645\u062A\u0646 \u0627\u0644\u064A\u062E\u062A\u060C \u0643\u0627\u0646 \u0643\u0644 \u0634\u064A\u0621 \u0645\u062B\u0627\u0644\u064A\u0627\u064B. \u0627\u0644\u062C\u0627\u0643\u0648\u0632\u064A \u0639\u0644\u0649 \u0627\u0644\u0633\u0637\u062D \u0645\u0639 \u0625\u0637\u0644\u0627\u0644\u0629 \u0639\u0644\u0649 \u0633\u0627\u0646\u062A\u0648\u0631\u064A\u0646\u064A \u0639\u0646\u062F \u0627\u0644\u063A\u0631\u0648\u0628 \u0643\u0627\u0646 \u0623\u0641\u0636\u0644 \u0644\u062D\u0638\u0629 \u0641\u064A \u0634\u0647\u0631 \u0639\u0633\u0644\u0646\u0627.",
      charterDate: "2025-07",
      createdAt: "2025-08-02T00:00:00Z",
    },
    {
      id: "rev-3",
      authorName: "Mohammed Al-Rashid",
      rating: 4,
      title_en: "Great yacht, minor wifi issues",
      title_ar:
        "\u064A\u062E\u062A \u0631\u0627\u0626\u0639\u060C \u0645\u0634\u0627\u0643\u0644 \u0628\u0633\u064A\u0637\u0629 \u0641\u064A \u0627\u0644\u0648\u0627\u064A\u0641\u0627\u064A",
      review_en:
        "The yacht itself is beautiful and the crew is top-notch. Only minor complaint was the wifi connectivity dropping between islands, but honestly that forced us to disconnect and enjoy the trip more. The chef's lamb ouzi was the best I have had outside of Jordan.",
      review_ar:
        "\u0627\u0644\u064A\u062E\u062A \u062C\u0645\u064A\u0644 \u0648\u0627\u0644\u0637\u0627\u0642\u0645 \u0645\u0645\u062A\u0627\u0632. \u0627\u0644\u0634\u0643\u0648\u0649 \u0627\u0644\u0648\u062D\u064A\u062F\u0629 \u0643\u0627\u0646\u062A \u0627\u0646\u0642\u0637\u0627\u0639 \u0627\u0644\u0648\u0627\u064A\u0641\u0627\u064A \u0628\u064A\u0646 \u0627\u0644\u062C\u0632\u0631.",
      charterDate: "2025-06",
      createdAt: "2025-07-10T00:00:00Z",
    },
  ],
};

// ─── Related Yachts Placeholder ─────────────────────────────────────

const RELATED_YACHTS = [
  {
    name: "Azure Horizon",
    slug: "azure-horizon",
    type: "CATAMARAN",
    length: 24,
    cabins: 4,
    pricePerWeekLow: 35000,
    currency: "EUR",
    rating: 4.7,
    reviewCount: 18,
    halalCateringAvailable: true,
    image: null,
    cruisingArea: "Greek Islands",
  },
  {
    name: "Sultan's Pearl",
    slug: "sultans-pearl",
    type: "GULET",
    length: 36,
    cabins: 6,
    pricePerWeekLow: 55000,
    currency: "EUR",
    rating: 4.9,
    reviewCount: 31,
    halalCateringAvailable: true,
    image: null,
    cruisingArea: "Turkish Coast",
  },
  {
    name: "Mediterranean Star",
    slug: "mediterranean-star",
    type: "MOTOR_YACHT",
    length: 30,
    cabins: 4,
    pricePerWeekLow: 65000,
    currency: "EUR",
    rating: 4.6,
    reviewCount: 12,
    halalCateringAvailable: false,
    image: null,
    cruisingArea: "French Riviera",
  },
  {
    name: "Cyclades Dream",
    slug: "cyclades-dream",
    type: "SAILBOAT",
    length: 18,
    cabins: 3,
    pricePerWeekLow: 15000,
    currency: "EUR",
    rating: 4.5,
    reviewCount: 42,
    halalCateringAvailable: true,
    image: null,
    cruisingArea: "Cyclades, Greece",
  },
];

// ─── DB Fetch ───────────────────────────────────────────────────────

async function getYachtFromDB(
  slug: string,
  siteId: string
): Promise<YachtData | null> {
  try {
    const { prisma } = await import("@/lib/db");
    const yacht = await prisma.yacht.findFirst({
      where: {
        slug,
        siteId,
        status: "active",
      },
      include: {
        destination: {
          select: {
            name: true,
            slug: true,
            region: true,
          },
        },
        reviews: {
          where: { status: "APPROVED" },
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            authorName: true,
            rating: true,
            title_en: true,
            title_ar: true,
            review_en: true,
            review_ar: true,
            charterDate: true,
            createdAt: true,
          },
        },
      },
    });

    if (!yacht) return null;

    return {
      id: yacht.id,
      name: yacht.name,
      slug: yacht.slug,
      type: yacht.type,
      length: yacht.length ? Number(yacht.length) : null,
      beam: yacht.beam ? Number(yacht.beam) : null,
      draft: yacht.draft ? Number(yacht.draft) : null,
      yearBuilt: yacht.yearBuilt,
      builder: yacht.builder,
      model: yacht.model,
      cabins: yacht.cabins,
      berths: yacht.berths,
      bathrooms: yacht.bathrooms,
      crewSize: yacht.crewSize,
      pricePerWeekLow: yacht.pricePerWeekLow
        ? Number(yacht.pricePerWeekLow)
        : null,
      pricePerWeekHigh: yacht.pricePerWeekHigh
        ? Number(yacht.pricePerWeekHigh)
        : null,
      currency: yacht.currency,
      description_en: yacht.description_en,
      description_ar: yacht.description_ar,
      features: yacht.features as string[] | null,
      images: yacht.images as string[] | null,
      waterSports: yacht.waterSports as string[] | null,
      halalCateringAvailable: yacht.halalCateringAvailable,
      familyFriendly: yacht.familyFriendly,
      crewIncluded: yacht.crewIncluded,
      homePort: yacht.homePort,
      cruisingArea: yacht.cruisingArea,
      rating: yacht.rating ? Number(yacht.rating) : null,
      reviewCount: yacht.reviewCount,
      featured: yacht.featured,
      destination: yacht.destination
        ? {
            name: yacht.destination.name,
            slug: yacht.destination.slug,
            region: yacht.destination.region,
          }
        : null,
      reviews: yacht.reviews.map((r) => ({
        id: r.id,
        authorName: r.authorName,
        rating: r.rating,
        title_en: r.title_en,
        title_ar: r.title_ar,
        review_en: r.review_en,
        review_ar: r.review_ar,
        charterDate: r.charterDate,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  } catch (err) {
    console.warn("[yacht-detail] DB fetch failed, using placeholder:", err);
    return null;
  }
}

// ─── Metadata ───────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const baseUrl = await getBaseUrl();
  const headersList = await headers();
  const siteId = headersList.get("x-site-id") || getDefaultSiteId();
  const siteConfig = getSiteConfig(siteId);
  const siteDomain = getSiteDomain(siteId);
  const siteName = siteConfig?.name || "Zenitha Yachts";

  const yacht = (await getYachtFromDB(slug, siteId)) || PLACEHOLDER_YACHT;
  const yachtType = formatYachtType(yacht.type);
  const title = `${yacht.name} | ${yachtType} Charter | ${siteName}`;
  const description =
    yacht.description_en?.substring(0, 155) ||
    `Charter the ${yacht.name}, a ${yacht.length}m ${yachtType.toLowerCase()} with ${yacht.cabins} cabins. ${yacht.halalCateringAvailable ? "Halal catering available. " : ""}Book your Mediterranean charter today.`;

  return {
    title,
    description,
    alternates: {
      canonical: `${baseUrl}/yachts/${slug}`,
      languages: {
        "en-GB": `${baseUrl}/yachts/${slug}`,
        "ar-SA": `${baseUrl}/ar/yachts/${slug}`,
        "x-default": `${baseUrl}/yachts/${slug}`,
      },
    },
    openGraph: {
      title,
      description,
      url: `${baseUrl}/yachts/${slug}`,
      siteName,
      type: "website",
      locale: "en_GB",
      images: [
        {
          url:
            yacht.images?.[0] ||
            `${siteDomain}/images/zenitha-yachts-og.jpg`,
          width: 1200,
          height: 630,
          alt: `${yacht.name} - ${yachtType} charter`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [
        yacht.images?.[0] ||
          `${siteDomain}/images/zenitha-yachts-og.jpg`,
      ],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

// ─── Helpers ────────────────────────────────────────────────────────

function formatYachtType(type: string): string {
  const MAP: Record<string, string> = {
    SAILBOAT: "Sailing Yacht",
    CATAMARAN: "Catamaran",
    MOTOR_YACHT: "Motor Yacht",
    GULET: "Gulet",
    POWER_CATAMARAN: "Power Catamaran",
  };
  return MAP[type] || type;
}

function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

// ─── Page Component ─────────────────────────────────────────────────

export default async function YachtDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const headersList = await headers();
  const siteId = headersList.get("x-site-id") || getDefaultSiteId();
  const baseUrl = await getBaseUrl();
  const siteConfig = getSiteConfig(siteId);
  const siteName = siteConfig?.name || "Zenitha Yachts";

  const yacht = await getYachtFromDB(slug, siteId);
  if (!yacht) notFound();

  const yachtType = formatYachtType(yacht.type);
  const canonicalUrl = `${baseUrl}/yachts/${slug}`;

  // Structured Data: Product + BreadcrumbList
  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: yacht.name,
    description: yacht.description_en || "",
    image: yacht.images?.[0] || undefined,
    brand: {
      "@type": "Brand",
      name: yacht.builder || siteName,
    },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: yacht.currency,
      lowPrice: yacht.pricePerWeekLow || 0,
      highPrice: yacht.pricePerWeekHigh || yacht.pricePerWeekLow || 0,
      offerCount: 1,
      availability: "https://schema.org/InStock",
    },
    aggregateRating: yacht.rating
      ? {
          "@type": "AggregateRating",
          ratingValue: yacht.rating,
          reviewCount: yacht.reviewCount,
          bestRating: 5,
          worstRating: 1,
        }
      : undefined,
    category: yachtType,
    url: canonicalUrl,
  };

  const breadcrumbItems = [
    { name: "Home", url: baseUrl },
    { name: "Yachts", url: `${baseUrl}/yachts` },
  ];
  if (yacht.destination) {
    breadcrumbItems.push({
      name: yacht.destination.name,
      url: `${baseUrl}/destinations/${yacht.destination.slug}`,
    });
  }
  breadcrumbItems.push({ name: yacht.name, url: canonicalUrl });

  return (
    <>
      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
      <StructuredData
        type="breadcrumb"
        data={{ items: breadcrumbItems }}
        siteId={siteId}
      />

      <main className="min-h-screen" style={{ background: "var(--z-pearl)" }}>
        {/* Breadcrumb Navigation */}
        <nav
          aria-label="Breadcrumb"
          className="z-container py-4"
          style={{ borderBottom: "1px solid var(--z-border)" }}
        >
          <ol className="flex items-center gap-2 flex-wrap z-text-caption">
            <li>
              <Link
                href="/"
                className="hover:underline"
                style={{ color: "var(--z-aegean)" }}
              >
                Home
              </Link>
            </li>
            <li style={{ color: "var(--z-muted)" }} aria-hidden="true">
              /
            </li>
            <li>
              <Link
                href="/yachts"
                className="hover:underline"
                style={{ color: "var(--z-aegean)" }}
              >
                Yachts
              </Link>
            </li>
            {yacht.destination && (
              <>
                <li style={{ color: "var(--z-muted)" }} aria-hidden="true">
                  /
                </li>
                <li>
                  <Link
                    href={`/destinations/${yacht.destination.slug}`}
                    className="hover:underline"
                    style={{ color: "var(--z-aegean)" }}
                  >
                    {yacht.destination.name}
                  </Link>
                </li>
              </>
            )}
            <li style={{ color: "var(--z-muted)" }} aria-hidden="true">
              /
            </li>
            <li style={{ color: "var(--z-navy)" }} aria-current="page">
              {yacht.name}
            </li>
          </ol>
        </nav>

        {/* Photo Gallery */}
        <section className="z-container-wide py-6">
          {yacht.images && yacht.images.length > 0 ? (
            <YachtGallery images={yacht.images} yachtName={yacht.name} />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
              {/* Main placeholder */}
              <div className="lg:col-span-3 relative overflow-hidden rounded-xl" style={{ aspectRatio: "16/10" }}>
                <div
                  className="w-full h-full flex items-center justify-center"
                  style={{ background: "var(--z-gradient-hero)", color: "var(--z-pearl)" }}
                >
                  <div className="text-center p-8">
                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4" style={{ opacity: 0.5 }}>
                      <path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
                    </svg>
                    <p className="font-display text-2xl font-bold">{yacht.name}</p>
                    <p className="z-text-body-sm mt-2" style={{ color: "var(--z-champagne)" }}>Gallery photos coming soon</p>
                  </div>
                </div>
              </div>
              {/* Thumbnail placeholders */}
              <div className="lg:col-span-2 grid grid-cols-2 gap-3">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="rounded-lg overflow-hidden" style={{ aspectRatio: "4/3", background: `linear-gradient(135deg, var(--z-midnight) ${i * 10}%, var(--z-aegean) 100%)` }}>
                    <div className="w-full h-full flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--z-champagne)", opacity: 0.4 }}>
                        <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                        <circle cx="9" cy="9" r="2" />
                        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Main Content + Sidebar */}
        <div className="z-container pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Left: Content */}
            <div className="lg:col-span-2">
              {/* Title Block */}
              <header className="mb-8">
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <span className="z-badge z-badge-ocean">{yachtType}</span>
                  {yacht.halalCateringAvailable && (
                    <span className="z-badge z-badge-success">Halal Catering</span>
                  )}
                  {yacht.familyFriendly && (
                    <span className="z-badge z-badge-gold">Family Friendly</span>
                  )}
                  {yacht.crewIncluded && (
                    <span className="z-badge z-badge-navy">Crew Included</span>
                  )}
                  {yacht.featured && (
                    <span className="z-badge z-badge-warning">Featured</span>
                  )}
                </div>

                <h1
                  className="font-display font-bold mb-3"
                  style={{
                    fontSize: "var(--z-text-title-lg)",
                    lineHeight: "var(--z-leading-tight)",
                    color: "var(--z-navy)",
                  }}
                >
                  {yacht.name}
                </h1>

                {/* Rating Stars */}
                {yacht.rating && (
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <svg
                          key={star}
                          xmlns="http://www.w3.org/2000/svg"
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill={star <= Math.round(yacht.rating!) ? "var(--z-gold)" : "none"}
                          stroke="var(--z-gold)"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                      ))}
                    </div>
                    <span
                      className="font-mono font-bold"
                      style={{ color: "var(--z-navy)" }}
                    >
                      {yacht.rating}
                    </span>
                    <span className="z-text-caption">
                      ({yacht.reviewCount} review{yacht.reviewCount !== 1 ? "s" : ""})
                    </span>
                  </div>
                )}

                {/* Quick Specs Row */}
                <div className="z-spec-grid" style={{ maxWidth: "600px" }}>
                  {yacht.length && (
                    <div className="z-spec-item">
                      <span className="z-spec-item-value">{yacht.length}</span>
                      <span className="z-spec-item-unit">m</span>
                      <span className="z-spec-item-label">Length</span>
                    </div>
                  )}
                  <div className="z-spec-item">
                    <span className="z-spec-item-value">{yacht.cabins}</span>
                    <span className="z-spec-item-unit">&nbsp;</span>
                    <span className="z-spec-item-label">Cabins</span>
                  </div>
                  <div className="z-spec-item">
                    <span className="z-spec-item-value">{yacht.berths}</span>
                    <span className="z-spec-item-unit">&nbsp;</span>
                    <span className="z-spec-item-label">Guests</span>
                  </div>
                  <div className="z-spec-item">
                    <span className="z-spec-item-value">{yacht.crewSize}</span>
                    <span className="z-spec-item-unit">&nbsp;</span>
                    <span className="z-spec-item-label">Crew</span>
                  </div>
                  {yacht.yearBuilt && (
                    <div className="z-spec-item">
                      <span className="z-spec-item-value">{yacht.yearBuilt}</span>
                      <span className="z-spec-item-unit">&nbsp;</span>
                      <span className="z-spec-item-label">Built</span>
                    </div>
                  )}
                </div>
              </header>

              <hr className="z-divider-gold mb-8" />

              {/* Tabbed Content (Client Component) */}
              <YachtDetailClient
                yacht={yacht}
                relatedYachts={RELATED_YACHTS}
                baseUrl={baseUrl}
                siteId={siteId}
                siteName={siteName}
              />
            </div>

            {/* Right: Sticky Sidebar (Desktop) */}
            <aside className="hidden lg:block">
              <div
                className="sticky top-6 z-card-gold p-6 space-y-5"
                style={{ borderRadius: "var(--z-radius-xl)" }}
              >
                {/* Price */}
                <div>
                  <span
                    className="z-text-overline block mb-1"
                  >
                    From
                  </span>
                  <div className="z-price">
                    <span className="z-price-amount">
                      {yacht.pricePerWeekLow
                        ? formatPrice(yacht.pricePerWeekLow, yacht.currency)
                        : "On request"}
                    </span>
                    {yacht.pricePerWeekLow && (
                      <span className="z-price-period">/ week</span>
                    )}
                  </div>
                  {yacht.pricePerWeekHigh &&
                    yacht.pricePerWeekHigh !== yacht.pricePerWeekLow && (
                      <p className="z-text-caption mt-1">
                        High season up to{" "}
                        {formatPrice(yacht.pricePerWeekHigh, yacht.currency)}/week
                      </p>
                    )}
                </div>

                <hr className="z-divider-subtle" style={{ margin: "0" }} />

                {/* Inquiry CTA */}
                <Link
                  href={`/inquiry?yacht=${slug}`}
                  className="z-btn z-btn-primary z-btn-lg z-btn-block"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21.2 8.4c.5.38.8.97.8 1.6v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V10a2 2 0 0 1 .8-1.6l8-6a2 2 0 0 1 2.4 0l8 6Z" />
                    <path d="m22 10-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 10" />
                  </svg>
                  Inquire About This Yacht
                </Link>

                {/* Affiliate Link */}
                <a
                  href={`https://www.boatbookings.com/search?yacht=${encodeURIComponent(yacht.name)}&utm_source=zenithayachts&utm_medium=referral&utm_campaign=yacht_detail`}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className="z-btn z-btn-secondary z-btn-block"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" x2="21" y1="14" y2="3" />
                  </svg>
                  Book on Boatbookings
                </a>

                <hr className="z-divider-subtle" style={{ margin: "0" }} />

                {/* Quick Info */}
                <div className="space-y-3 z-text-body-sm">
                  {yacht.homePort && (
                    <div className="flex items-start gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--z-aegean)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mt-0.5 flex-shrink-0"
                      >
                        <circle cx="12" cy="10" r="3" />
                        <path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 6.9 8 11.7z" />
                      </svg>
                      <div>
                        <span
                          className="block font-semibold"
                          style={{ color: "var(--z-navy)" }}
                        >
                          Home Port
                        </span>
                        {yacht.homePort}
                      </div>
                    </div>
                  )}
                  {yacht.cruisingArea && (
                    <div className="flex items-start gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--z-aegean)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mt-0.5 flex-shrink-0"
                      >
                        <path d="M3 7V5a2 2 0 0 1 2-2h2" />
                        <path d="M17 3h2a2 2 0 0 1 2 2v2" />
                        <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
                        <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                      <div>
                        <span
                          className="block font-semibold"
                          style={{ color: "var(--z-navy)" }}
                        >
                          Cruising Area
                        </span>
                        {yacht.cruisingArea}
                      </div>
                    </div>
                  )}
                  {yacht.builder && (
                    <div className="flex items-start gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--z-aegean)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mt-0.5 flex-shrink-0"
                      >
                        <path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
                      </svg>
                      <div>
                        <span
                          className="block font-semibold"
                          style={{ color: "var(--z-navy)" }}
                        >
                          Builder
                        </span>
                        {yacht.builder}
                        {yacht.model ? ` ${yacht.model}` : ""}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </aside>
          </div>
        </div>

        {/* Mobile Sticky Bottom Bar */}
        <div
          className="lg:hidden fixed bottom-0 left-0 right-0 z-50 p-4"
          style={{
            background: "var(--z-white)",
            borderTop: "1px solid var(--z-border)",
            boxShadow: "0 -4px 20px rgba(10, 22, 40, 0.08)",
          }}
        >
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <span
                className="z-text-overline block"
                style={{ fontSize: "9px" }}
              >
                From
              </span>
              <span
                className="font-display font-bold"
                style={{
                  fontSize: "var(--z-text-subtitle)",
                  color: "var(--z-navy)",
                }}
              >
                {yacht.pricePerWeekLow
                  ? formatPrice(yacht.pricePerWeekLow, yacht.currency)
                  : "Request"}
              </span>
              {yacht.pricePerWeekLow && (
                <span className="z-text-caption"> /week</span>
              )}
            </div>
            <Link
              href={`/inquiry?yacht=${slug}`}
              className="z-btn z-btn-primary z-btn-lg"
              style={{ whiteSpace: "nowrap" }}
            >
              Inquire Now
            </Link>
          </div>
        </div>

        {/* WhatsApp Floating Button — positioned above mobile bar */}
        <div className="hidden lg:block">
          <WhatsAppButton yachtName={yacht.name} />
        </div>
      </main>
    </>
  );
}
