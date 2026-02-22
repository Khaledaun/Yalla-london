"use client";

import { useState } from "react";
import { useLanguage } from "@/components/language-provider";
import {
  Anchor,
  Waves,
  Wind,
  Compass,
  Wifi,
  Dumbbell,
  Sun,
  UtensilsCrossed,
  Snowflake,
  Tv,
  Shield,
  Droplets,
  Star,
  ChevronRight,
  Globe,
  Check,
} from "lucide-react";

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

interface RelatedYacht {
  name: string;
  slug: string;
  type: string;
  length: number;
  cabins: number;
  pricePerWeekLow: number;
  currency: string;
  rating: number;
  reviewCount: number;
  halalCateringAvailable: boolean;
  image: string | null;
  cruisingArea: string;
}

interface YachtDetailClientProps {
  yacht: YachtData;
  relatedYachts: RelatedYacht[];
  baseUrl: string;
  siteId: string;
  siteName: string;
}

// ─── Content Map for i18n ───────────────────────────────────────────

const t = {
  en: {
    overview: "Overview",
    specifications: "Specifications",
    amenities: "Amenities",
    reviews: "Reviews",
    description: "Description",
    keyFeatures: "Key Features",
    waterSports: "Water Sports & Toys",
    technicalSpecs: "Technical Specifications",
    dimensions: "Dimensions",
    lengthOverall: "Length Overall",
    beam: "Beam",
    draft: "Draft",
    capacity: "Capacity",
    cabins: "Cabins",
    berths: "Berths / Guests",
    bathrooms: "Bathrooms",
    crewSize: "Crew",
    construction: "Construction",
    builder: "Builder",
    model: "Model",
    yearBuilt: "Year Built",
    charter: "Charter",
    homePort: "Home Port",
    cruisingArea: "Cruising Area",
    priceRange: "Price Range",
    perWeek: "per week",
    guestReviews: "Guest Reviews",
    noReviews: "No reviews yet. Be the first to share your experience.",
    charteredIn: "Chartered in",
    relatedYachts: "You Might Also Like",
    viewYacht: "View Yacht",
    fromPrice: "From",
    halalAvailable: "Halal",
    languageToggle: "View in Arabic",
    amenitiesOnboard: "Onboard Amenities",
    noAmenities: "Amenities information will be available soon.",
    metres: "m",
    ratingBreakdown: "Rating Breakdown",
    overallRating: "Overall Rating",
  },
  ar: {
    overview: "\u0646\u0638\u0631\u0629 \u0639\u0627\u0645\u0629",
    specifications: "\u0627\u0644\u0645\u0648\u0627\u0635\u0641\u0627\u062A",
    amenities: "\u0627\u0644\u0645\u0631\u0627\u0641\u0642",
    reviews: "\u0627\u0644\u062A\u0642\u064A\u064A\u0645\u0627\u062A",
    description: "\u0627\u0644\u0648\u0635\u0641",
    keyFeatures: "\u0627\u0644\u0645\u064A\u0632\u0627\u062A \u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0629",
    waterSports: "\u0627\u0644\u0631\u064A\u0627\u0636\u0627\u062A \u0627\u0644\u0645\u0627\u0626\u064A\u0629",
    technicalSpecs: "\u0627\u0644\u0645\u0648\u0627\u0635\u0641\u0627\u062A \u0627\u0644\u0641\u0646\u064A\u0629",
    dimensions: "\u0627\u0644\u0623\u0628\u0639\u0627\u062F",
    lengthOverall: "\u0627\u0644\u0637\u0648\u0644 \u0627\u0644\u0643\u0644\u064A",
    beam: "\u0627\u0644\u0639\u0631\u0636",
    draft: "\u0627\u0644\u063A\u0627\u0637\u0633",
    capacity: "\u0627\u0644\u0633\u0639\u0629",
    cabins: "\u0627\u0644\u0643\u0628\u0627\u0626\u0646",
    berths: "\u0627\u0644\u0636\u064A\u0648\u0641",
    bathrooms: "\u0627\u0644\u062D\u0645\u0627\u0645\u0627\u062A",
    crewSize: "\u0627\u0644\u0637\u0627\u0642\u0645",
    construction: "\u0627\u0644\u0628\u0646\u0627\u0621",
    builder: "\u0627\u0644\u0634\u0631\u0643\u0629 \u0627\u0644\u0645\u0635\u0646\u0639\u0629",
    model: "\u0627\u0644\u0645\u0648\u062F\u064A\u0644",
    yearBuilt: "\u0633\u0646\u0629 \u0627\u0644\u0628\u0646\u0627\u0621",
    charter: "\u0627\u0644\u062A\u0623\u062C\u064A\u0631",
    homePort: "\u0627\u0644\u0645\u064A\u0646\u0627\u0621 \u0627\u0644\u0631\u0626\u064A\u0633\u064A",
    cruisingArea: "\u0645\u0646\u0637\u0642\u0629 \u0627\u0644\u0625\u0628\u062D\u0627\u0631",
    priceRange: "\u0646\u0637\u0627\u0642 \u0627\u0644\u0633\u0639\u0631",
    perWeek: "\u0641\u064A \u0627\u0644\u0623\u0633\u0628\u0648\u0639",
    guestReviews: "\u062A\u0642\u064A\u064A\u0645\u0627\u062A \u0627\u0644\u0636\u064A\u0648\u0641",
    noReviews: "\u0644\u0627 \u062A\u0648\u062C\u062F \u062A\u0642\u064A\u064A\u0645\u0627\u062A \u0628\u0639\u062F. \u0643\u0646 \u0623\u0648\u0644 \u0645\u0646 \u064A\u0634\u0627\u0631\u0643 \u062A\u062C\u0631\u0628\u062A\u0647.",
    charteredIn: "\u0627\u0644\u0625\u0628\u062D\u0627\u0631 \u0641\u064A",
    relatedYachts: "\u0642\u062F \u064A\u0639\u062C\u0628\u0643 \u0623\u064A\u0636\u0627\u064B",
    viewYacht: "\u0639\u0631\u0636 \u0627\u0644\u064A\u062E\u062A",
    fromPrice: "\u0645\u0646",
    halalAvailable: "\u062D\u0644\u0627\u0644",
    languageToggle: "View in English",
    amenitiesOnboard: "\u0645\u0631\u0627\u0641\u0642 \u0639\u0644\u0649 \u0645\u062A\u0646 \u0627\u0644\u064A\u062E\u062A",
    noAmenities: "\u0633\u062A\u062A\u0648\u0641\u0631 \u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0627\u0644\u0645\u0631\u0627\u0641\u0642 \u0642\u0631\u064A\u0628\u0627\u064B.",
    metres: "\u0645",
    ratingBreakdown: "\u062A\u0641\u0635\u064A\u0644 \u0627\u0644\u062A\u0642\u064A\u064A\u0645",
    overallRating: "\u0627\u0644\u062A\u0642\u064A\u064A\u0645 \u0627\u0644\u0639\u0627\u0645",
  },
};

// ─── Amenity Icon Map ───────────────────────────────────────────────

const amenityIcons: Record<string, React.ReactNode> = {
  Jacuzzi: <Droplets size={20} />,
  "Air conditioning": <Snowflake size={20} />,
  Wifi: <Wifi size={20} />,
  "Satellite TV": <Tv size={20} />,
  Gym: <Dumbbell size={20} />,
  BBQ: <UtensilsCrossed size={20} />,
  "Sun awning": <Sun size={20} />,
  "Deck Jacuzzi": <Droplets size={20} />,
  "Stabilizers at anchor": <Anchor size={20} />,
  "Zero-speed stabilizers": <Shield size={20} />,
  "Underwater lights": <Waves size={20} />,
  "Tender garage": <Compass size={20} />,
};

// ─── Helpers ────────────────────────────────────────────────────────

function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

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

// ─── Component ──────────────────────────────────────────────────────

export function YachtDetailClient({
  yacht,
  relatedYachts,
  baseUrl,
}: YachtDetailClientProps) {
  const { language, setLanguage } = useLanguage();
  const [activeTab, setActiveTab] = useState<"overview" | "specifications" | "amenities" | "reviews">("overview");
  const lang = language === "ar" ? "ar" : "en";
  const labels = t[lang];
  const isRTL = lang === "ar";

  const tabs = [
    { id: "overview" as const, label: labels.overview },
    { id: "specifications" as const, label: labels.specifications },
    { id: "amenities" as const, label: labels.amenities },
    { id: "reviews" as const, label: labels.reviews },
  ];

  // Rating breakdown computation
  const ratingCounts = [0, 0, 0, 0, 0]; // index 0 = 1 star, 4 = 5 stars
  yacht.reviews.forEach((r) => {
    if (r.rating >= 1 && r.rating <= 5) {
      ratingCounts[r.rating - 1]++;
    }
  });
  const totalReviews = yacht.reviews.length;

  return (
    <div dir={isRTL ? "rtl" : "ltr"}>
      {/* Language Toggle */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setLanguage(lang === "en" ? "ar" : "en")}
          className="z-btn z-btn-ghost z-btn-sm flex items-center gap-1.5"
          aria-label={labels.languageToggle}
        >
          <Globe size={14} />
          <span>{labels.languageToggle}</span>
        </button>
      </div>

      {/* Tabs */}
      <div
        className="flex gap-1 mb-8 overflow-x-auto z-scrollbar-hidden"
        role="tablist"
        style={{
          borderBottom: "2px solid var(--z-border)",
          paddingBottom: "0",
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className="px-5 py-3 font-heading font-semibold whitespace-nowrap transition-colors relative"
            style={{
              fontSize: "var(--z-text-body-sm)",
              letterSpacing: "var(--z-tracking-wide)",
              color:
                activeTab === tab.id ? "var(--z-navy)" : "var(--z-muted)",
              borderBottom:
                activeTab === tab.id
                  ? "2px solid var(--z-gold)"
                  : "2px solid transparent",
              marginBottom: "-2px",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Panels */}

      {/* Overview */}
      {activeTab === "overview" && (
        <div
          id="panel-overview"
          role="tabpanel"
          className="space-y-8"
        >
          {/* Description */}
          <div>
            <h2
              className="z-text-subtitle mb-4"
              style={{ color: "var(--z-navy)" }}
            >
              {labels.description}
            </h2>
            <div
              className="z-prose"
              style={{ whiteSpace: "pre-line" }}
            >
              {lang === "ar"
                ? yacht.description_ar || yacht.description_en
                : yacht.description_en || ""}
            </div>
          </div>

          {/* Key Features */}
          {yacht.features && yacht.features.length > 0 && (
            <div>
              <h2
                className="z-text-subtitle mb-4"
                style={{ color: "var(--z-navy)" }}
              >
                {labels.keyFeatures}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {yacht.features.map((feature, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 p-3 rounded-lg"
                    style={{
                      background: "var(--z-surface)",
                      border: "1px solid var(--z-border)",
                    }}
                  >
                    <Check
                      size={16}
                      style={{ color: "var(--z-mediterranean)", flexShrink: 0 }}
                    />
                    <span className="z-text-body-sm" style={{ color: "var(--z-navy)" }}>
                      {feature}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Water Sports */}
          {yacht.waterSports && yacht.waterSports.length > 0 && (
            <div>
              <h2
                className="z-text-subtitle mb-4"
                style={{ color: "var(--z-navy)" }}
              >
                {labels.waterSports}
              </h2>
              <div className="flex flex-wrap gap-2">
                {yacht.waterSports.map((sport, i) => (
                  <span key={i} className="z-badge z-badge-ocean">
                    <Waves size={12} />
                    {sport}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Specifications */}
      {activeTab === "specifications" && (
        <div
          id="panel-specifications"
          role="tabpanel"
          className="space-y-8"
        >
          <h2 className="z-text-subtitle" style={{ color: "var(--z-navy)" }}>
            {labels.technicalSpecs}
          </h2>

          {/* Dimensions */}
          <div>
            <h3
              className="z-text-heading mb-4 flex items-center gap-2"
              style={{ color: "var(--z-aegean)" }}
            >
              <Compass size={18} />
              {labels.dimensions}
            </h3>
            <div
              className="overflow-hidden rounded-lg"
              style={{ border: "1px solid var(--z-border)" }}
            >
              <table className="w-full">
                <tbody>
                  {yacht.length && (
                    <SpecRow label={labels.lengthOverall} value={`${yacht.length} ${labels.metres}`} />
                  )}
                  {yacht.beam && (
                    <SpecRow label={labels.beam} value={`${yacht.beam} ${labels.metres}`} />
                  )}
                  {yacht.draft && (
                    <SpecRow label={labels.draft} value={`${yacht.draft} ${labels.metres}`} />
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Capacity */}
          <div>
            <h3
              className="z-text-heading mb-4 flex items-center gap-2"
              style={{ color: "var(--z-aegean)" }}
            >
              <Wind size={18} />
              {labels.capacity}
            </h3>
            <div
              className="overflow-hidden rounded-lg"
              style={{ border: "1px solid var(--z-border)" }}
            >
              <table className="w-full">
                <tbody>
                  <SpecRow label={labels.cabins} value={String(yacht.cabins)} />
                  <SpecRow label={labels.berths} value={String(yacht.berths)} />
                  <SpecRow label={labels.bathrooms} value={String(yacht.bathrooms)} />
                  <SpecRow label={labels.crewSize} value={String(yacht.crewSize)} />
                </tbody>
              </table>
            </div>
          </div>

          {/* Construction */}
          {(yacht.builder || yacht.model || yacht.yearBuilt) && (
            <div>
              <h3
                className="z-text-heading mb-4 flex items-center gap-2"
                style={{ color: "var(--z-aegean)" }}
              >
                <Anchor size={18} />
                {labels.construction}
              </h3>
              <div
                className="overflow-hidden rounded-lg"
                style={{ border: "1px solid var(--z-border)" }}
              >
                <table className="w-full">
                  <tbody>
                    {yacht.builder && <SpecRow label={labels.builder} value={yacht.builder} />}
                    {yacht.model && <SpecRow label={labels.model} value={yacht.model} />}
                    {yacht.yearBuilt && (
                      <SpecRow label={labels.yearBuilt} value={String(yacht.yearBuilt)} />
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Charter Info */}
          <div>
            <h3
              className="z-text-heading mb-4 flex items-center gap-2"
              style={{ color: "var(--z-aegean)" }}
            >
              <Waves size={18} />
              {labels.charter}
            </h3>
            <div
              className="overflow-hidden rounded-lg"
              style={{ border: "1px solid var(--z-border)" }}
            >
              <table className="w-full">
                <tbody>
                  {yacht.homePort && (
                    <SpecRow label={labels.homePort} value={yacht.homePort} />
                  )}
                  {yacht.cruisingArea && (
                    <SpecRow label={labels.cruisingArea} value={yacht.cruisingArea} />
                  )}
                  {yacht.pricePerWeekLow && (
                    <SpecRow
                      label={labels.priceRange}
                      value={
                        yacht.pricePerWeekHigh &&
                        yacht.pricePerWeekHigh !== yacht.pricePerWeekLow
                          ? `${formatPrice(yacht.pricePerWeekLow, yacht.currency)} - ${formatPrice(yacht.pricePerWeekHigh, yacht.currency)} ${labels.perWeek}`
                          : `${formatPrice(yacht.pricePerWeekLow, yacht.currency)} ${labels.perWeek}`
                      }
                    />
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Amenities */}
      {activeTab === "amenities" && (
        <div id="panel-amenities" role="tabpanel" className="space-y-8">
          <h2 className="z-text-subtitle" style={{ color: "var(--z-navy)" }}>
            {labels.amenitiesOnboard}
          </h2>

          {yacht.features && yacht.features.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {yacht.features.map((feature, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-4 rounded-lg transition-colors"
                  style={{
                    background: "var(--z-surface)",
                    border: "1px solid var(--z-border)",
                  }}
                >
                  <div
                    className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{
                      background: "rgba(201, 169, 110, 0.1)",
                      color: "var(--z-gold)",
                    }}
                  >
                    {amenityIcons[feature] || <Check size={20} />}
                  </div>
                  <span
                    className="font-heading font-medium"
                    style={{
                      fontSize: "var(--z-text-body-sm)",
                      color: "var(--z-navy)",
                    }}
                  >
                    {feature}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="z-text-body" style={{ color: "var(--z-muted)" }}>
              {labels.noAmenities}
            </p>
          )}

          {/* Water Sports Section */}
          {yacht.waterSports && yacht.waterSports.length > 0 && (
            <div>
              <h3 className="z-text-heading mb-4" style={{ color: "var(--z-navy)" }}>
                {labels.waterSports}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {yacht.waterSports.map((sport, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-4 rounded-lg"
                    style={{
                      background: "rgba(14, 165, 162, 0.05)",
                      border: "1px solid rgba(14, 165, 162, 0.15)",
                    }}
                  >
                    <div
                      className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{
                        background: "rgba(14, 165, 162, 0.12)",
                        color: "var(--z-mediterranean)",
                      }}
                    >
                      <Waves size={20} />
                    </div>
                    <span
                      className="font-heading font-medium"
                      style={{
                        fontSize: "var(--z-text-body-sm)",
                        color: "var(--z-navy)",
                      }}
                    >
                      {sport}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reviews */}
      {activeTab === "reviews" && (
        <div id="panel-reviews" role="tabpanel" className="space-y-8">
          <h2 className="z-text-subtitle" style={{ color: "var(--z-navy)" }}>
            {labels.guestReviews}
          </h2>

          {yacht.reviews.length > 0 ? (
            <>
              {/* Rating Breakdown */}
              <div
                className="p-6 rounded-xl"
                style={{
                  background: "var(--z-surface)",
                  border: "1px solid var(--z-border)",
                }}
              >
                <div className="flex flex-col sm:flex-row gap-8">
                  {/* Overall Score */}
                  <div className="text-center sm:text-left flex-shrink-0">
                    <div
                      className="font-display font-bold"
                      style={{
                        fontSize: "var(--z-text-display)",
                        color: "var(--z-navy)",
                        lineHeight: 1,
                      }}
                    >
                      {yacht.rating || "N/A"}
                    </div>
                    <div className="flex items-center justify-center sm:justify-start gap-0.5 my-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={16}
                          fill={
                            star <= Math.round(yacht.rating || 0)
                              ? "var(--z-gold)"
                              : "none"
                          }
                          stroke="var(--z-gold)"
                          strokeWidth={1.5}
                        />
                      ))}
                    </div>
                    <p className="z-text-caption">
                      {labels.overallRating} ({yacht.reviewCount} review
                      {yacht.reviewCount !== 1 ? "s" : ""})
                    </p>
                  </div>

                  {/* Bar Chart */}
                  <div className="flex-1 space-y-2">
                    {[5, 4, 3, 2, 1].map((stars) => {
                      const count = ratingCounts[stars - 1];
                      const pct =
                        totalReviews > 0
                          ? Math.round((count / totalReviews) * 100)
                          : 0;
                      return (
                        <div key={stars} className="flex items-center gap-3">
                          <span
                            className="font-mono text-xs w-8 text-right"
                            style={{ color: "var(--z-muted)" }}
                          >
                            {stars}
                          </span>
                          <Star
                            size={12}
                            fill="var(--z-gold)"
                            stroke="var(--z-gold)"
                          />
                          <div
                            className="flex-1 h-2 rounded-full overflow-hidden"
                            style={{ background: "var(--z-surface-sunken)" }}
                          >
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${pct}%`,
                                background: "var(--z-gold)",
                              }}
                            />
                          </div>
                          <span
                            className="font-mono text-xs w-8"
                            style={{ color: "var(--z-muted)" }}
                          >
                            {count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Review Cards */}
              <div className="space-y-4">
                {yacht.reviews.map((review) => (
                  <div
                    key={review.id}
                    className="p-6 rounded-xl"
                    style={{
                      background: "var(--z-surface)",
                      border: "1px solid var(--z-border)",
                    }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p
                          className="font-heading font-semibold"
                          style={{
                            fontSize: "var(--z-text-body)",
                            color: "var(--z-navy)",
                          }}
                        >
                          {review.authorName}
                        </p>
                        {review.charterDate && (
                          <p className="z-text-caption">
                            {labels.charteredIn} {review.charterDate}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={14}
                            fill={
                              star <= review.rating ? "var(--z-gold)" : "none"
                            }
                            stroke="var(--z-gold)"
                            strokeWidth={1.5}
                          />
                        ))}
                      </div>
                    </div>
                    {(lang === "ar"
                      ? review.title_ar || review.title_en
                      : review.title_en) && (
                      <h4
                        className="font-heading font-semibold mb-2"
                        style={{
                          fontSize: "var(--z-text-body)",
                          color: "var(--z-navy)",
                        }}
                      >
                        {lang === "ar"
                          ? review.title_ar || review.title_en
                          : review.title_en}
                      </h4>
                    )}
                    <p
                      className="z-text-body"
                      style={{ color: "var(--z-muted)" }}
                    >
                      {lang === "ar"
                        ? review.review_ar || review.review_en
                        : review.review_en}
                    </p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div
              className="text-center py-12 rounded-xl"
              style={{
                background: "var(--z-surface)",
                border: "1px solid var(--z-border)",
              }}
            >
              <Star
                size={40}
                style={{ color: "var(--z-champagne)", margin: "0 auto 12px" }}
              />
              <p className="z-text-body" style={{ color: "var(--z-muted)" }}>
                {labels.noReviews}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Related Yachts */}
      <section className="mt-16">
        <hr className="z-divider-gold mb-8" />
        <h2 className="z-text-title mb-6" style={{ color: "var(--z-navy)" }}>
          {labels.relatedYachts}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-5">
          {relatedYachts.map((ry) => (
            <a
              key={ry.slug}
              href={`/yachts/${ry.slug}`}
              className="z-card group"
            >
              {/* Image placeholder */}
              <div
                className="w-full relative overflow-hidden"
                style={{
                  aspectRatio: "16/10",
                  background: "var(--z-gradient-card)",
                }}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <Waves
                    size={32}
                    style={{ color: "var(--z-champagne)", opacity: 0.4 }}
                  />
                </div>
                {ry.halalCateringAvailable && (
                  <div className="absolute top-3 left-3">
                    <span className="z-badge z-badge-success">
                      {labels.halalAvailable}
                    </span>
                  </div>
                )}
              </div>
              <div className="z-card-body">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3
                      className="font-heading font-bold mb-1"
                      style={{
                        fontSize: "var(--z-text-heading)",
                        color: "var(--z-navy)",
                      }}
                    >
                      {ry.name}
                    </h3>
                    <p className="z-text-caption">
                      {formatYachtType(ry.type)} &middot; {ry.length}m &middot;{" "}
                      {ry.cabins} cabins
                    </p>
                    <p className="z-text-caption">{ry.cruisingArea}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="z-text-overline block">{labels.fromPrice}</span>
                    <span
                      className="font-display font-bold"
                      style={{
                        fontSize: "var(--z-text-heading)",
                        color: "var(--z-navy)",
                      }}
                    >
                      {formatPrice(ry.pricePerWeekLow, ry.currency)}
                    </span>
                    <span className="z-text-caption block">/week</span>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: "1px solid var(--z-border)" }}>
                  <div className="flex items-center gap-1">
                    <Star size={14} fill="var(--z-gold)" stroke="var(--z-gold)" />
                    <span className="font-mono text-sm font-bold" style={{ color: "var(--z-navy)" }}>
                      {ry.rating}
                    </span>
                    <span className="z-text-caption">({ry.reviewCount})</span>
                  </div>
                  <span
                    className="z-text-caption flex items-center gap-1 group-hover:underline"
                    style={{ color: "var(--z-aegean)" }}
                  >
                    {labels.viewYacht}
                    <ChevronRight size={14} />
                  </span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <tr
      style={{ borderBottom: "1px solid var(--z-border)" }}
    >
      <td
        className="px-4 py-3 font-heading font-medium"
        style={{
          fontSize: "var(--z-text-body-sm)",
          color: "var(--z-muted)",
          width: "40%",
        }}
      >
        {label}
      </td>
      <td
        className="px-4 py-3 font-body"
        style={{
          fontSize: "var(--z-text-body)",
          color: "var(--z-navy)",
        }}
      >
        {value}
      </td>
    </tr>
  );
}
