"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Anchor,
  Users,
  Bed,
  Bath,
  Ship,
  Star,
  Check,
  X as XIcon,
  Crown,
  Search,
  Plus,
  Trash2,
  ExternalLink,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Locale = "en" | "ar";

interface CompareYacht {
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
  features: unknown;
  images: string[] | null;
  waterSports: unknown;
  halalCateringAvailable: boolean;
  familyFriendly: boolean;
  crewIncluded: boolean;
  homePort: string | null;
  cruisingArea: string | null;
  rating: number | null;
  reviewCount: number;
  destination: {
    id: string;
    name: string;
    slug: string;
    region: string;
  } | null;
}

interface SearchYacht {
  id: string;
  name: string;
  slug: string;
  type: string;
  cabins: number;
  berths: number;
  length: number | null;
  pricePerWeekLow: number | null;
  currency: string;
  images: string[] | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TYPE_LABELS: Record<string, Record<Locale, string>> = {
  SAILBOAT: { en: "Sailing Yacht", ar: "يخت شراعي" },
  CATAMARAN: { en: "Catamaran", ar: "كاتاماران" },
  MOTOR_YACHT: { en: "Motor Yacht", ar: "يخت بمحرك" },
  GULET: { en: "Gulet", ar: "قوارب تركية" },
  SUPERYACHT: { en: "Superyacht", ar: "يخت فاخر" },
  POWER_CATAMARAN: { en: "Power Catamaran", ar: "كاتاماران بمحرك" },
};

const T = {
  en: {
    title: "Compare Yachts",
    subtitle: "Side-by-side comparison to find your perfect charter",
    addYacht: "Add Yacht",
    searchPlaceholder: "Search yachts by name...",
    remove: "Remove",
    viewDetails: "View Details",
    inquireNow: "Inquire Now",
    specifications: "Specifications",
    pricing: "Pricing & Value",
    amenities: "Amenities & Features",
    location: "Location",
    noYachts: "Select at least 2 yachts to compare",
    noYachtsHint: "Use the search below to add yachts to your comparison",
    perWeek: "/week",
    from: "From",
    to: "to",
    length: "Length",
    beam: "Beam",
    draftLabel: "Draft",
    yearBuilt: "Year Built",
    builder: "Builder",
    model: "Model",
    type: "Type",
    cabins: "Cabins",
    berths: "Guests",
    bathrooms: "Bathrooms",
    crew: "Crew Size",
    rating: "Rating",
    reviews: "reviews",
    halal: "Halal Catering",
    familyFriendly: "Family Friendly",
    crewIncluded: "Crew Included",
    waterSports: "Water Sports",
    homePort: "Home Port",
    cruisingArea: "Cruising Area",
    destination: "Destination",
    bestValue: "Best Value",
    mostSpacious: "Most Spacious",
    highestRated: "Highest Rated",
    meters: "m",
    yes: "Yes",
    no: "No",
    featured: "Featured",
    back: "Back to Yachts",
    loading: "Loading comparison...",
    error: "Failed to load comparison data",
    maxReached: "Maximum 3 yachts for comparison",
  },
  ar: {
    title: "مقارنة اليخوت",
    subtitle: "مقارنة جنباً إلى جنب لإيجاد يختك المثالي",
    addYacht: "إضافة يخت",
    searchPlaceholder: "ابحث عن يخت بالاسم...",
    remove: "إزالة",
    viewDetails: "عرض التفاصيل",
    inquireNow: "استفسر الآن",
    specifications: "المواصفات",
    pricing: "الأسعار والقيمة",
    amenities: "المرافق والميزات",
    location: "الموقع",
    noYachts: "اختر يختين على الأقل للمقارنة",
    noYachtsHint: "استخدم البحث أدناه لإضافة يخوت إلى المقارنة",
    perWeek: "/أسبوع",
    from: "من",
    to: "إلى",
    length: "الطول",
    beam: "العرض",
    draftLabel: "الغاطس",
    yearBuilt: "سنة البناء",
    builder: "الشركة المصنعة",
    model: "الموديل",
    type: "النوع",
    cabins: "الكبائن",
    berths: "الضيوف",
    bathrooms: "الحمامات",
    crew: "حجم الطاقم",
    rating: "التقييم",
    reviews: "تقييمات",
    halal: "طعام حلال",
    familyFriendly: "مناسب للعائلات",
    crewIncluded: "الطاقم مشمول",
    waterSports: "رياضات مائية",
    homePort: "الميناء الرئيسي",
    cruisingArea: "منطقة الإبحار",
    destination: "الوجهة",
    bestValue: "أفضل قيمة",
    mostSpacious: "الأكثر اتساعاً",
    highestRated: "الأعلى تقييماً",
    meters: "م",
    yes: "نعم",
    no: "لا",
    featured: "مميز",
    back: "العودة لليخوت",
    loading: "جاري تحميل المقارنة...",
    error: "فشل في تحميل بيانات المقارنة",
    maxReached: "الحد الأقصى 3 يخوت للمقارنة",
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPrice(val: number | null, currency: string): string {
  if (val == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(val));
}

function getYachtImage(yacht: CompareYacht | SearchYacht): string {
  const imgs = yacht.images as string[] | null;
  return imgs?.[0] || "/images/yacht-placeholder.jpg";
}

function getHighlight(
  yachts: CompareYacht[],
  key: "price" | "space" | "rating",
): string | null {
  if (yachts.length < 2) return null;
  if (key === "price") {
    let lowest: CompareYacht | null = null;
    for (const y of yachts) {
      if (y.pricePerWeekLow == null) continue;
      if (!lowest || Number(y.pricePerWeekLow) < Number(lowest.pricePerWeekLow))
        lowest = y;
    }
    return lowest?.id ?? null;
  }
  if (key === "space") {
    let best: CompareYacht | null = null;
    for (const y of yachts) {
      if (!best || y.berths > best.berths) best = y;
    }
    return best?.id ?? null;
  }
  if (key === "rating") {
    let best: CompareYacht | null = null;
    for (const y of yachts) {
      if (y.rating == null) continue;
      if (!best || Number(y.rating) > Number(best.rating)) best = y;
    }
    return best?.id ?? null;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CompareClient({ locale }: { locale: Locale }) {
  const t = T[locale];
  const searchParams = useSearchParams();
  const router = useRouter();

  const [yachts, setYachts] = useState<CompareYacht[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search state
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchYacht[]>([]);
  const [searching, setSearching] = useState(false);

  // Fetch comparison data from URL ids
  const fetchComparison = useCallback(
    async (ids: string[]) => {
      if (ids.length < 2) {
        setYachts([]);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/yachts/compare?ids=${ids.join(",")}`);
        if (!res.ok) throw new Error("Failed to load");
        const data = await res.json();
        setYachts(data.yachts || []);
      } catch {
        setError(t.error);
      } finally {
        setLoading(false);
      }
    },
    [t.error],
  );

  // Load from URL on mount
  useEffect(() => {
    const idsParam = searchParams.get("ids");
    if (idsParam) {
      const ids = idsParam.split(",").filter(Boolean);
      fetchComparison(ids);
    }
  }, [searchParams, fetchComparison]);

  // Update URL when yachts change
  const updateUrl = useCallback(
    (ids: string[]) => {
      if (ids.length >= 2) {
        router.replace(`/yachts/compare?ids=${ids.join(",")}`, {
          scroll: false,
        });
      } else if (ids.length === 0) {
        router.replace("/yachts/compare", { scroll: false });
      }
    },
    [router],
  );

  // Search for yachts to add
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/yachts?q=${encodeURIComponent(searchQuery)}&limit=8`,
        );
        if (res.ok) {
          const data = await res.json();
          // Exclude already compared yachts
          const existing = new Set(yachts.map((y) => y.id));
          setSearchResults(
            (data.yachts || []).filter(
              (y: SearchYacht) => !existing.has(y.id),
            ),
          );
        }
      } catch {
        // silent
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, yachts]);

  // Add yacht to comparison
  const addYacht = (id: string) => {
    if (yachts.length >= 3) return;
    const newIds = [...yachts.map((y) => y.id), id];
    setShowSearch(false);
    setSearchQuery("");
    updateUrl(newIds);
    fetchComparison(newIds);
  };

  // Remove yacht from comparison
  const removeYacht = (id: string) => {
    const newIds = yachts.filter((y) => y.id !== id).map((y) => y.id);
    updateUrl(newIds);
    if (newIds.length >= 2) {
      fetchComparison(newIds);
    } else {
      setYachts(yachts.filter((y) => y.id !== id));
    }
  };

  const bestValue = getHighlight(yachts, "price");
  const mostSpacious = getHighlight(yachts, "space");
  const highestRated = getHighlight(yachts, "rating");

  // ─── Empty State ─────────────────────────────────────────────
  if (!loading && yachts.length < 2 && !searchParams.get("ids")) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--z-pearl, #FAFAF7)",
          fontFamily: "var(--font-body, 'Source Sans 3', sans-serif)",
        }}
      >
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 20px" }}>
          <Link
            href="/yachts"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              color: "var(--z-aegean, #2E5A88)",
              textDecoration: "none",
              fontSize: 14,
              marginBottom: 24,
            }}
          >
            <ArrowLeft size={16} /> {t.back}
          </Link>

          <h1
            style={{
              fontFamily: "var(--font-display, 'Playfair Display', serif)",
              fontSize: 36,
              fontWeight: 700,
              color: "var(--z-navy, #0A1628)",
              marginBottom: 8,
            }}
          >
            {t.title}
          </h1>
          <p
            style={{
              color: "var(--z-aegean, #2E5A88)",
              fontSize: 16,
              marginBottom: 40,
            }}
          >
            {t.subtitle}
          </p>

          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              border: "1px solid var(--z-sand, #F5EDE0)",
              padding: "60px 40px",
              textAlign: "center",
            }}
          >
            <Ship
              size={48}
              style={{
                color: "var(--z-gold, #C9A96E)",
                marginBottom: 16,
              }}
            />
            <h2
              style={{
                fontSize: 20,
                fontWeight: 600,
                color: "var(--z-navy, #0A1628)",
                marginBottom: 8,
              }}
            >
              {t.noYachts}
            </h2>
            <p
              style={{
                color: "#666",
                marginBottom: 24,
                fontSize: 14,
              }}
            >
              {t.noYachtsHint}
            </p>

            {/* Search box */}
            <SearchBox
              locale={locale}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              searchResults={searchResults}
              searching={searching}
              onSelect={addYacht}
              yachtCount={yachts.length}
            />
          </div>
        </div>
      </div>
    );
  }

  // ─── Main Comparison View ─────────────────────────────────────
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--z-pearl, #FAFAF7)",
        fontFamily: "var(--font-body, 'Source Sans 3', sans-serif)",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 16px" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 24,
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <Link
              href="/yachts"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                color: "var(--z-aegean, #2E5A88)",
                textDecoration: "none",
                fontSize: 14,
                marginBottom: 8,
              }}
            >
              <ArrowLeft size={16} /> {t.back}
            </Link>
            <h1
              style={{
                fontFamily:
                  "var(--font-display, 'Playfair Display', serif)",
                fontSize: 28,
                fontWeight: 700,
                color: "var(--z-navy, #0A1628)",
              }}
            >
              {t.title}
            </h1>
          </div>

          {yachts.length < 3 && (
            <button
              onClick={() => setShowSearch(!showSearch)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "10px 20px",
                background: "var(--z-gold, #C9A96E)",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              <Plus size={16} /> {t.addYacht}
            </button>
          )}
        </div>

        {/* Search panel (inline) */}
        {showSearch && (
          <div style={{ marginBottom: 24 }}>
            <SearchBox
              locale={locale}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              searchResults={searchResults}
              searching={searching}
              onSelect={addYacht}
              yachtCount={yachts.length}
            />
          </div>
        )}

        {loading && (
          <p style={{ textAlign: "center", color: "#666", padding: 40 }}>
            {t.loading}
          </p>
        )}
        {error && (
          <p
            style={{
              textAlign: "center",
              color: "var(--z-coral, #E07A5F)",
              padding: 40,
            }}
          >
            {error}
          </p>
        )}

        {yachts.length >= 2 && !loading && (
          <>
            {/* Yacht Photo + Name Header Cards */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${yachts.length}, 1fr)`,
                gap: 16,
                marginBottom: 32,
              }}
            >
              {yachts.map((yacht) => (
                <YachtHeaderCard
                  key={yacht.id}
                  yacht={yacht}
                  locale={locale}
                  bestValue={bestValue}
                  mostSpacious={mostSpacious}
                  highestRated={highestRated}
                  onRemove={() => removeYacht(yacht.id)}
                />
              ))}
            </div>

            {/* Comparison Table */}
            <ComparisonTable
              yachts={yachts}
              locale={locale}
              bestValue={bestValue}
              mostSpacious={mostSpacious}
              highestRated={highestRated}
            />

            {/* CTA Row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${yachts.length}, 1fr)`,
                gap: 16,
                marginTop: 32,
              }}
            >
              {yachts.map((yacht) => (
                <div
                  key={yacht.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  <Link
                    href={`/yachts/${yacht.slug}`}
                    style={{
                      display: "block",
                      textAlign: "center",
                      padding: "12px 16px",
                      border: "1px solid var(--z-aegean, #2E5A88)",
                      color: "var(--z-aegean, #2E5A88)",
                      borderRadius: 8,
                      textDecoration: "none",
                      fontSize: 14,
                      fontWeight: 600,
                    }}
                  >
                    {t.viewDetails} <ExternalLink size={14} style={{ verticalAlign: "middle" }} />
                  </Link>
                  <Link
                    href={`/inquiry?yacht=${yacht.slug}`}
                    style={{
                      display: "block",
                      textAlign: "center",
                      padding: "12px 16px",
                      background: "var(--z-gold, #C9A96E)",
                      color: "#fff",
                      borderRadius: 8,
                      textDecoration: "none",
                      fontSize: 14,
                      fontWeight: 600,
                    }}
                  >
                    {t.inquireNow}
                  </Link>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Yacht Header Card
// ---------------------------------------------------------------------------

function YachtHeaderCard({
  yacht,
  locale,
  bestValue,
  mostSpacious,
  highestRated,
  onRemove,
}: {
  yacht: CompareYacht;
  locale: Locale;
  bestValue: string | null;
  mostSpacious: string | null;
  highestRated: string | null;
  onRemove: () => void;
}) {
  const t = T[locale];
  const badges: { label: string; color: string }[] = [];
  if (bestValue === yacht.id) badges.push({ label: t.bestValue, color: "#2D5A3D" });
  if (mostSpacious === yacht.id) badges.push({ label: t.mostSpacious, color: "#2E5A88" });
  if (highestRated === yacht.id) badges.push({ label: t.highestRated, color: "#C9A96E" });

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 12,
        border: "1px solid var(--z-sand, #F5EDE0)",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Remove button */}
      <button
        onClick={onRemove}
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          zIndex: 2,
          background: "rgba(0,0,0,0.5)",
          border: "none",
          borderRadius: "50%",
          width: 28,
          height: 28,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: "#fff",
        }}
        title={t.remove}
      >
        <Trash2 size={14} />
      </button>

      {/* Image */}
      <div style={{ position: "relative", height: 180 }}>
        <Image
          src={getYachtImage(yacht)}
          alt={yacht.name}
          fill
          style={{ objectFit: "cover" }}
          sizes="(max-width: 768px) 100vw, 33vw"
        />
        {/* Badges */}
        {badges.length > 0 && (
          <div
            style={{
              position: "absolute",
              bottom: 8,
              left: 8,
              display: "flex",
              gap: 4,
            }}
          >
            {badges.map((b) => (
              <span
                key={b.label}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  background: b.color,
                  color: "#fff",
                  padding: "3px 8px",
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                <Crown size={10} /> {b.label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: "12px 16px" }}>
        <div style={{ fontSize: 11, color: "var(--z-aegean, #2E5A88)", fontWeight: 600, marginBottom: 4 }}>
          {TYPE_LABELS[yacht.type]?.[locale] || yacht.type}
        </div>
        <h3
          style={{
            fontFamily: "var(--font-display, 'Playfair Display', serif)",
            fontSize: 18,
            fontWeight: 700,
            color: "var(--z-navy, #0A1628)",
            margin: 0,
            marginBottom: 4,
          }}
        >
          {yacht.name}
        </h3>
        {yacht.pricePerWeekLow != null && (
          <div style={{ fontSize: 14, color: "var(--z-gold-dark, #8B6914)", fontWeight: 600 }}>
            {t.from} {formatPrice(yacht.pricePerWeekLow, yacht.currency)}
            {yacht.pricePerWeekHigh != null &&
              Number(yacht.pricePerWeekHigh) !== Number(yacht.pricePerWeekLow) && (
                <span style={{ fontWeight: 400 }}>
                  {" "}{t.to} {formatPrice(yacht.pricePerWeekHigh, yacht.currency)}
                </span>
              )}
            <span style={{ fontWeight: 400, fontSize: 12, color: "#888" }}>
              {" "}{t.perWeek}
            </span>
          </div>
        )}
        {yacht.rating != null && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4, fontSize: 13 }}>
            <Star size={13} fill="var(--z-gold, #C9A96E)" stroke="var(--z-gold, #C9A96E)" />
            <span style={{ fontWeight: 600 }}>{Number(yacht.rating).toFixed(1)}</span>
            <span style={{ color: "#888" }}>({yacht.reviewCount} {t.reviews})</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Comparison Table
// ---------------------------------------------------------------------------

function ComparisonTable({
  yachts,
  locale,
  bestValue,
  mostSpacious,
  highestRated,
}: {
  yachts: CompareYacht[];
  locale: Locale;
  bestValue: string | null;
  mostSpacious: string | null;
  highestRated: string | null;
}) {
  const t = T[locale];
  const count = yachts.length;

  const specRows: { label: string; render: (y: CompareYacht) => React.ReactNode; highlight?: string | null }[] = [
    { label: t.type, render: (y) => TYPE_LABELS[y.type]?.[locale] || y.type },
    { label: t.length, render: (y) => y.length ? `${Number(y.length)}${t.meters}` : "—" },
    { label: t.beam, render: (y) => y.beam ? `${Number(y.beam)}${t.meters}` : "—" },
    { label: t.draftLabel, render: (y) => y.draft ? `${Number(y.draft)}${t.meters}` : "—" },
    { label: t.yearBuilt, render: (y) => y.yearBuilt ?? "—" },
    { label: t.builder, render: (y) => y.builder || "—" },
    { label: t.model, render: (y) => y.model || "—" },
  ];

  const capacityRows: { label: string; render: (y: CompareYacht) => React.ReactNode; highlight?: string | null }[] = [
    { label: t.cabins, render: (y) => <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Bed size={14} /> {y.cabins}</span> },
    { label: t.berths, render: (y) => <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Users size={14} /> {y.berths}</span>, highlight: mostSpacious },
    { label: t.bathrooms, render: (y) => <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Bath size={14} /> {y.bathrooms}</span> },
    { label: t.crew, render: (y) => <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Anchor size={14} /> {y.crewSize}</span> },
    {
      label: t.rating,
      render: (y) =>
        y.rating != null ? (
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Star size={14} fill="var(--z-gold)" stroke="var(--z-gold)" />
            {Number(y.rating).toFixed(1)}
          </span>
        ) : "—",
      highlight: highestRated,
    },
  ];

  const amenityRows: { label: string; render: (y: CompareYacht) => React.ReactNode }[] = [
    { label: t.halal, render: (y) => <BoolCell value={y.halalCateringAvailable} locale={locale} /> },
    { label: t.familyFriendly, render: (y) => <BoolCell value={y.familyFriendly} locale={locale} /> },
    { label: t.crewIncluded, render: (y) => <BoolCell value={y.crewIncluded} locale={locale} /> },
    {
      label: t.waterSports,
      render: (y) => {
        const ws = y.waterSports as string[] | null;
        if (!ws || !Array.isArray(ws) || ws.length === 0) return "—";
        return ws.slice(0, 4).join(", ") + (ws.length > 4 ? ` +${ws.length - 4}` : "");
      },
    },
  ];

  const locationRows: { label: string; render: (y: CompareYacht) => React.ReactNode }[] = [
    { label: t.homePort, render: (y) => y.homePort || "—" },
    { label: t.cruisingArea, render: (y) => y.cruisingArea || "—" },
    { label: t.destination, render: (y) => y.destination?.name || "—" },
  ];

  const pricingRows: { label: string; render: (y: CompareYacht) => React.ReactNode; highlight?: string | null }[] = [
    {
      label: t.from,
      render: (y) => (
        <span style={{ fontWeight: 600, color: "var(--z-gold-dark, #8B6914)" }}>
          {formatPrice(y.pricePerWeekLow, y.currency)}{" "}
          <span style={{ fontWeight: 400, color: "#888", fontSize: 12 }}>{t.perWeek}</span>
        </span>
      ),
      highlight: bestValue,
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <TableSection title={t.specifications} icon={<Ship size={18} />} rows={specRows} yachts={yachts} count={count} />
      <TableSection title={t.pricing} icon={<Crown size={18} />} rows={pricingRows} yachts={yachts} count={count} />
      <TableSection title={`${t.cabins} & ${t.berths}`} icon={<Users size={18} />} rows={capacityRows} yachts={yachts} count={count} />
      <TableSection title={t.amenities} icon={<Anchor size={18} />} rows={amenityRows} yachts={yachts} count={count} />
      <TableSection title={t.location} icon={<Anchor size={18} />} rows={locationRows} yachts={yachts} count={count} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Table Section
// ---------------------------------------------------------------------------

function TableSection({
  title,
  icon,
  rows,
  yachts,
  count,
}: {
  title: string;
  icon: React.ReactNode;
  rows: { label: string; render: (y: CompareYacht) => React.ReactNode; highlight?: string | null }[];
  yachts: CompareYacht[];
  count: number;
}) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 12,
        border: "1px solid var(--z-sand, #F5EDE0)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "12px 16px",
          borderBottom: "1px solid var(--z-sand, #F5EDE0)",
          background: "var(--z-pearl, #FAFAF7)",
        }}
      >
        <span style={{ color: "var(--z-gold, #C9A96E)" }}>{icon}</span>
        <h3
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: "var(--z-navy, #0A1628)",
            margin: 0,
          }}
        >
          {title}
        </h3>
      </div>

      {rows.map((row, i) => (
        <div
          key={row.label}
          style={{
            display: "grid",
            gridTemplateColumns: `140px repeat(${count}, 1fr)`,
            borderBottom: i < rows.length - 1 ? "1px solid var(--z-sand, #F5EDE0)" : undefined,
          }}
        >
          <div
            style={{
              padding: "10px 16px",
              fontSize: 13,
              fontWeight: 600,
              color: "var(--z-navy, #0A1628)",
              background: "var(--z-pearl, #FAFAF7)",
              display: "flex",
              alignItems: "center",
            }}
          >
            {row.label}
          </div>
          {yachts.map((y) => {
            const isHighlighted = row.highlight === y.id;
            return (
              <div
                key={y.id}
                style={{
                  padding: "10px 16px",
                  fontSize: 13,
                  color: "#333",
                  display: "flex",
                  alignItems: "center",
                  background: isHighlighted
                    ? "rgba(201,169,110,0.08)"
                    : undefined,
                  fontWeight: isHighlighted ? 600 : 400,
                }}
              >
                {row.render(y)}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bool Cell
// ---------------------------------------------------------------------------

function BoolCell({ value, locale }: { value: boolean; locale: Locale }) {
  const t = T[locale];
  return value ? (
    <span
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        color: "var(--z-mediterranean, #0EA5A2)",
        fontWeight: 600,
      }}
    >
      <Check size={14} /> {t.yes}
    </span>
  ) : (
    <span style={{ color: "#999" }}>
      <XIcon size={14} style={{ verticalAlign: "middle" }} /> {t.no}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Search Box
// ---------------------------------------------------------------------------

function SearchBox({
  locale,
  searchQuery,
  setSearchQuery,
  searchResults,
  searching,
  onSelect,
  yachtCount,
}: {
  locale: Locale;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  searchResults: SearchYacht[];
  searching: boolean;
  onSelect: (id: string) => void;
  yachtCount: number;
}) {
  const t = T[locale];

  return (
    <div style={{ maxWidth: 500, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "#fff",
          border: "1px solid var(--z-sand, #F5EDE0)",
          borderRadius: 8,
          padding: "8px 12px",
        }}
      >
        <Search size={18} style={{ color: "#999", flexShrink: 0 }} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t.searchPlaceholder}
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            fontSize: 14,
            background: "transparent",
          }}
        />
        {searching && (
          <span style={{ fontSize: 12, color: "#999" }}>...</span>
        )}
      </div>

      {yachtCount >= 3 && (
        <p style={{ fontSize: 12, color: "var(--z-coral, #E07A5F)", marginTop: 8 }}>
          {t.maxReached}
        </p>
      )}

      {searchResults.length > 0 && (
        <div
          style={{
            marginTop: 8,
            background: "#fff",
            border: "1px solid var(--z-sand, #F5EDE0)",
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          {searchResults.map((y) => (
            <button
              key={y.id}
              onClick={() => onSelect(y.id)}
              disabled={yachtCount >= 3}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                width: "100%",
                padding: "10px 12px",
                border: "none",
                borderBottom: "1px solid var(--z-sand, #F5EDE0)",
                background: "transparent",
                cursor: yachtCount >= 3 ? "not-allowed" : "pointer",
                opacity: yachtCount >= 3 ? 0.5 : 1,
                textAlign: "left",
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 36,
                  borderRadius: 4,
                  overflow: "hidden",
                  position: "relative",
                  flexShrink: 0,
                }}
              >
                <Image
                  src={getYachtImage(y)}
                  alt={y.name}
                  fill
                  style={{ objectFit: "cover" }}
                  sizes="48px"
                />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--z-navy)" }}>
                  {y.name}
                </div>
                <div style={{ fontSize: 12, color: "#888" }}>
                  {TYPE_LABELS[y.type]?.[locale] || y.type} &middot; {y.cabins} cab &middot; {y.berths} guests
                  {y.pricePerWeekLow != null && (
                    <> &middot; {formatPrice(y.pricePerWeekLow, y.currency)}/wk</>
                  )}
                </div>
              </div>
              <Plus size={16} style={{ color: "var(--z-gold)", flexShrink: 0 }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
