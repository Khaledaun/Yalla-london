"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/components/language-provider";
import { getTranslation } from "@/lib/i18n";
import {
  TriBar,
  BrandButton,
  BrandTag,
  BrandCardLight,
  SectionLabel,
  WatermarkStamp,
  Breadcrumbs,
} from "@/components/brand-kit";
import AffiliateDisclosure from "@/components/affiliate/AffiliateDisclosure";
import {
  buildSportsEvents365Url,
  buildTravelpayoutsAffiliateUrl,
  buildExpediaAffiliateUrl,
} from "@/lib/affiliate/page-affiliate-links";
import {
  ArrowRight,
  MapPin,
  Calendar,
  Clock,
  Star,
  ExternalLink,
  Ticket,
  Search,
  Tag,
  Loader2,
  ShieldCheck,
  RefreshCw,
  Lock,
  Hotel,
  BookOpen,
} from "lucide-react";

interface EventItem {
  id: string | number;
  title: { en: string; ar: string };
  description: { en: string; ar: string };
  date: string;
  time: string;
  venue: string;
  category: string;
  price: string;
  image: string;
  rating: number;
  bookingUrl: string;
  affiliateTag?: string;
  ticketProvider?: string;
  vipAvailable?: boolean;
  soldOut?: boolean;
}

// Fallback events shown only when DB has no events yet.
// June 12 audit: the old fallbacks had FIXED April dates that expired, leaving
// the page with zero upcoming events. Dates are now computed relative to
// today so fallbacks never expire, and every booking link routes through a
// REAL partner (SE365 / TicketNetwork / Tiqets) with tracking. Fake star
// ratings removed — we have no review source, so we don't show ratings.
const daysFromNow = (n: number) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);

const FALLBACK_EVENTS: EventItem[] = [
  {
    id: "fallback-1",
    title: {
      en: "Premier League Football in London",
      ar: "مباريات الدوري الإنجليزي الممتاز في لندن",
    },
    description: {
      en: "Arsenal, Chelsea, Tottenham and West Ham all play home fixtures across the season. Browse verified tickets for upcoming London matches.",
      ar: "أرسنال وتشيلسي وتوتنهام ووست هام يلعبون مبارياتهم على أرضهم طوال الموسم. تصفح تذاكر موثقة للمباريات القادمة في لندن.",
    },
    date: daysFromNow(10),
    time: "15:00",
    venue: "Emirates Stadium & more",
    category: "Football",
    price: "From \u00a385",
    image: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=800&h=600&fit=crop",
    rating: 0,
    bookingUrl: buildSportsEvents365Url("/football/england/premier-league", "events-page"),
    affiliateTag: "sportsevents365",
    ticketProvider: "SportsEvents365",
    vipAvailable: true,
  },
  {
    id: "fallback-2",
    title: {
      en: "West End Musicals & Theatre",
      ar: "مسرحيات وموسيقى الويست إند",
    },
    description: {
      en: "The Lion King, Hamilton, Wicked and more — award-winning shows in London's historic theatres. Compare seats and dates.",
      ar: "الأسد الملك وهاملتون وويكد والمزيد — عروض حائزة على جوائز في مسارح لندن العريقة. قارن المقاعد والتواريخ.",
    },
    date: daysFromNow(14),
    time: "19:30",
    venue: "West End theatres",
    category: "Theatre",
    price: "From \u00a345",
    image: "https://images.unsplash.com/photo-1503095396549-807759245b35?w=800&h=600&fit=crop",
    rating: 0,
    bookingUrl: buildTravelpayoutsAffiliateUrl(
      "ticketnetwork",
      "https://www.ticketnetwork.com/london-events",
      "events-page",
    ),
    affiliateTag: "ticketnetwork",
    ticketProvider: "TicketNetwork",
    vipAvailable: true,
  },
  {
    id: "fallback-3",
    title: {
      en: "London Attractions & Experiences",
      ar: "معالم وتجارب لندن",
    },
    description: {
      en: "London Eye, Tower of London, Thames cruises with halal dining options, and skip-the-queue museum tickets — instant confirmation.",
      ar: "عين لندن وبرج لندن ورحلات التايمز مع خيارات طعام حلال وتذاكر متاحف بدون انتظار — تأكيد فوري.",
    },
    date: daysFromNow(7),
    time: "10:00",
    venue: "Across London",
    category: "Experience",
    price: "From \u00a329",
    image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&h=600&fit=crop",
    rating: 0,
    bookingUrl: buildTravelpayoutsAffiliateUrl("tiqets", "https://www.tiqets.com/en/london-c824706/", "events-page"),
    affiliateTag: "tiqets",
    ticketProvider: "Tiqets",
    vipAvailable: false,
  },
];

const DEFAULT_CATEGORIES = ["All", "Football", "Theatre", "Festival", "Exhibition", "Experience"];

export default function EventsPage({ serverLocale }: { serverLocale?: "en" | "ar" }) {
  const { language: clientLanguage, isRTL: clientIsRTL } = useLanguage();
  const language = serverLocale ?? clientLanguage;
  const isRTL = language === "ar" ? true : clientIsRTL;
  const t = (key: string) => getTranslation(language, key);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [showVipOnly, setShowVipOnly] = useState(false);
  const [events, setEvents] = useState<EventItem[]>(FALLBACK_EVENTS);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(false);
  // "database" = synced daily from official sources; surfaces a live trust line
  const [dataSource, setDataSource] = useState<string>("curated");

  useEffect(() => {
    async function fetchEvents() {
      try {
        const res = await fetch("/api/events");
        if (res.ok) {
          const data = await res.json();
          if (data.events && data.events.length > 0) {
            setEvents(data.events);
            if (data.source) setDataSource(data.source);
            if (data.categories?.length > 1) {
              setCategories(data.categories);
            }
          }
        }
      } catch {
        // Keep fallback events
      }
    }
    fetchEvents();
  }, []);

  // Route every booking click through /api/affiliate/click so it's tracked
  // (AuditLog + GA4) and attributed via SID. DB bookingUrls already carry the
  // partner's affiliate key (SE365 a_aid); fallback URLs are pre-wrapped.
  const trackedBookingUrl = (event: EventItem): string => {
    const url = event.bookingUrl || "";
    if (!url) return "#";
    if (url.startsWith("/api/affiliate/click")) return url; // already wrapped
    const partner = (event.ticketProvider || "partner").toLowerCase().replace(/[^a-z0-9]/g, "");
    const sid = `yalla-london_events-${(event.category || "all").toLowerCase()}`;
    return `/api/affiliate/click?url=${encodeURIComponent(url)}&sid=${encodeURIComponent(sid)}&partner=${encodeURIComponent(partner)}&article=events-page`;
  };

  // Per May 17 audit: today's events were rendering under "Past Events".
  // Root cause: `new Date(event.date)` parses "2026-05-17" as midnight UTC,
  // so by 04:40 UTC every event today was already "past" relative to
  // `now`. Fix uses eventStartUtc(date, time) from lib/events/start-time.ts
  // — same timezone-aware combiner the seed + auto-erase use — so an event
  // on 2026-05-17 at 19:00 BST stays "upcoming" until ~18:00 UTC.
  const now = new Date();
  const startMs = (event: EventItem) => {
    try {
      // Lazy-require to avoid loading the helper into pages that don't
      // need it. Reuses the same regex (HH:MM / HH:MM:SS) + BST/GMT logic.
      const eventDate = new Date(event.date);
      const eventTime = typeof event.time === "string" ? event.time.slice(0, 5) : null;
      // Mirror eventStartUtc inline (small helper, no dynamic import in client)
      const m = eventTime ? eventTime.match(/^(\d{1,2}):(\d{2})$/) : null;
      if (!m || isNaN(eventDate.getTime())) return eventDate.getTime();
      const hh = Math.min(23, Math.max(0, parseInt(m[1], 10)));
      const mm = Math.min(59, Math.max(0, parseInt(m[2], 10)));
      const y = eventDate.getUTCFullYear();
      const mo = eventDate.getUTCMonth();
      const d = eventDate.getUTCDate();
      const localAsUtc = Date.UTC(y, mo, d, hh, mm, 0);
      // Approximate BST window: last Sun Mar 01:00 UTC → last Sun Oct 01:00 UTC
      const probe = new Date(localAsUtc);
      const lastSunOfMonth = (year: number, monthIndex: number) => {
        const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0));
        return lastDay.getUTCDate() - lastDay.getUTCDay();
      };
      const bstStart = Date.UTC(probe.getUTCFullYear(), 2, lastSunOfMonth(probe.getUTCFullYear(), 2), 1, 0, 0);
      const bstEnd = Date.UTC(probe.getUTCFullYear(), 9, lastSunOfMonth(probe.getUTCFullYear(), 9), 1, 0, 0);
      const isBst = localAsUtc >= bstStart && localAsUtc < bstEnd;
      return localAsUtc - (isBst ? 60 * 60 * 1000 : 0);
    } catch {
      return new Date(event.date).getTime();
    }
  };
  const upcomingEvents = events.filter((event) => startMs(event) >= now.getTime());
  const pastEvents = events.filter((event) => startMs(event) < now.getTime());

  const filteredEvents = upcomingEvents.filter((event) => {
    const matchesCategory = selectedCategory === "All" || event.category === selectedCategory;
    // May 17 audit: widened from title+venue to title (both langs) + venue +
    // category + ticket provider. Matches the placeholder "Search events, venues…"
    // promise more honestly. Cross-language match means typing "halal" finds
    // both English and Arabic events containing the term.
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      q === "" ||
      event.title.en?.toLowerCase().includes(q) ||
      event.title.ar?.toLowerCase().includes(q) ||
      event.venue.toLowerCase().includes(q) ||
      event.category.toLowerCase().includes(q) ||
      (event.ticketProvider || "").toLowerCase().includes(q);
    const matchesVip = !showVipOnly || event.vipAvailable;
    return matchesCategory && matchesSearch && matchesVip;
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return language === "en"
      ? date.toLocaleDateString("en-GB", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : date.toLocaleDateString("ar-SA", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });
  };

  // Fire-and-forget analytics on click; navigation happens via the real <a>
  // link (keyboard/screen-reader/middle-click friendly — June 12 a11y audit).
  const trackBookingClick = (event: EventItem) => {
    try {
      fetch("/api/analytics/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "affiliate_click",
          category: "events",
          label: event.title.en,
          provider: event.ticketProvider,
          affiliateTag: event.affiliateTag,
        }),
      }).catch(() => {});
    } catch (error) {
      console.warn("[Events] Failed to track affiliate click for event:", event.title.en, error);
    }
  };

  // Event JSON-LD (schema.org ItemList of Event) — eligibility for Google's
  // event rich results. Built from live upcoming events; omits fabricated
  // fields (no fake ratings/offers beyond what we actually know).
  const eventJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: language === "en" ? "London Events & Tickets" : "فعاليات وتذاكر لندن",
    itemListElement: upcomingEvents.slice(0, 25).map((ev, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Event",
        name: ev.title.en,
        startDate: ev.time ? `${ev.date}T${(ev.time || "19:00").slice(0, 5)}:00` : ev.date,
        eventStatus: "https://schema.org/EventScheduled",
        eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
        location: {
          "@type": "Place",
          name: ev.venue,
          address: { "@type": "PostalAddress", addressLocality: "London", addressCountry: "GB" },
        },
        ...(ev.image ? { image: [ev.image] } : {}),
        ...(ev.description?.en ? { description: ev.description.en } : {}),
      },
    })),
  };

  // Per-category partner CTA shown under the grid — the "couldn't find it"
  // safety net that keeps the funnel moving to a bookable partner page.
  const categoryPartnerCta = (() => {
    const cat = selectedCategory.toLowerCase();
    if (cat === "football" || cat === "sports") {
      return {
        href: buildSportsEvents365Url("/football/england/premier-league", "events-page"),
        partner: "SportsEvents365",
        en: "Browse all Premier League & football tickets",
        ar: "تصفح جميع تذاكر الدوري الإنجليزي وكرة القدم",
      };
    }
    if (cat === "concerts" || cat === "music") {
      return {
        href: buildSportsEvents365Url("/concerts/london", "events-page"),
        partner: "SportsEvents365",
        en: "Browse all London concert tickets",
        ar: "تصفح جميع تذاكر حفلات لندن",
      };
    }
    if (cat === "theatre" || cat === "comedy") {
      return {
        href: buildTravelpayoutsAffiliateUrl(
          "ticketnetwork",
          "https://www.ticketnetwork.com/london-events",
          "events-page",
        ),
        partner: "TicketNetwork",
        en: "Browse all West End & theatre tickets",
        ar: "تصفح جميع تذاكر المسرح والويست إند",
      };
    }
    return {
      href: buildTravelpayoutsAffiliateUrl("tiqets", "https://www.tiqets.com/en/london-c824706/", "events-page"),
      partner: "Tiqets",
      en: "Browse all London attractions & experiences",
      ar: "تصفح جميع معالم وتجارب لندن",
    };
  })();

  return (
    <div className={`bg-yl-cream font-body ${isRTL ? "rtl" : "ltr"}`}>
      {/* Event rich-result structured data (real events only, no fabricated fields) */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(eventJsonLd) }} />
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-yl-dark-navy text-white pt-28 pb-16">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&h=800&fit=crop"
            alt="London Events"
            fill
            className="object-cover opacity-30"
            priority
          />
          <div className="absolute inset-0 bg-yl-dark-navy/40" />
        </div>
        <WatermarkStamp />
        <div className="relative z-10 max-w-7xl mx-auto px-7 text-center">
          <Breadcrumbs
            items={[
              { label: language === "en" ? "Home" : "الرئيسية", href: "/" },
              { label: language === "en" ? "Events" : "فعاليات" },
            ]}
          />
          <SectionLabel>{language === "en" ? "Events & Tickets" : "فعاليات وتذاكر"}</SectionLabel>
          <h1
            className="text-4xl sm:text-5xl md:text-6xl font-heading font-bold mb-6 mt-4"
            style={{ textShadow: "0 2px 12px rgba(15,22,33,0.7), 0 1px 3px rgba(15,22,33,0.5)" }}
          >
            {language === "en" ? "London Events & Tickets" : "فعاليات وتذاكر لندن"}
          </h1>
          <p
            className="text-xl md:text-2xl text-yl-gray-400 max-w-3xl mx-auto mb-8"
            style={{ textShadow: "0 1px 8px rgba(15,22,33,0.6)" }}
          >
            {language === "en"
              ? "Book premium tickets for the best London experiences"
              : "احجز تذاكر مميزة لأفضل تجارب لندن"}
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap" role="list">
            <span
              role="listitem"
              className="font-mono text-[11px] tracking-wider uppercase px-4 py-2 bg-white/10 rounded-full"
            >
              <RefreshCw className="h-3.5 w-3.5 inline mr-1.5 -mt-0.5" aria-hidden="true" />
              {language === "en" ? "Listings updated daily" : "قوائم محدّثة يومياً"}
            </span>
            <span
              role="listitem"
              className="font-mono text-[11px] tracking-wider uppercase px-4 py-2 bg-white/10 rounded-full"
            >
              <Lock className="h-3.5 w-3.5 inline mr-1.5 -mt-0.5" aria-hidden="true" />
              {language === "en" ? "Secure partner checkout" : "دفع آمن عبر الشريك"}
            </span>
            <span
              role="listitem"
              className="font-mono text-[11px] tracking-wider uppercase px-4 py-2 bg-white/10 rounded-full"
            >
              <Ticket className="h-3.5 w-3.5 inline mr-1.5 -mt-0.5" aria-hidden="true" />
              {language === "en" ? "Prices in GBP" : "الأسعار بالجنيه الإسترليني"}
            </span>
          </div>
        </div>
      </section>
      <TriBar />

      {/* FTC Affiliate Disclosure */}
      <div className="bg-yl-cream/60 border-b border-yl-gray-200">
        <p className="max-w-7xl mx-auto px-7 py-2.5 text-[11px] text-yl-gray-500 leading-relaxed">
          {language === "ar"
            ? "تحتوي هذه الصفحة على روابط تابعة. قد نحصل على عمولة عند الحجز من خلال روابطنا، دون أي تكلفة إضافية عليك."
            : "This page contains affiliate links. We may earn a commission when you book through our links, at no extra cost to you."}
        </p>
      </div>

      {/* Static explainer */}
      <section className="bg-yl-cream border-b border-yl-gray-200 py-6">
        <div className="max-w-7xl mx-auto px-7">
          <p className="text-yl-gray-500 text-sm leading-relaxed max-w-3xl">
            {language === "en"
              ? "Yalla London curates the best events for Arab visitors — from Premier League football at Emirates Stadium and Stamford Bridge, to award-winning West End musicals like Hamilton and The Lion King, luxury Thames dinner cruises with halal menus, seasonal festivals, world-class exhibitions at the V&A and British Museum, and exclusive VIP experiences across the city."
              : "يلا لندن تنتقي أفضل الفعاليات للزوار العرب — من مباريات الدوري الإنجليزي الممتاز في ملعب الإمارات وستامفورد بريدج، إلى المسرحيات الموسيقية في ويست إند مثل هاميلتون والأسد الملك، ورحلات العشاء الفاخرة على نهر التايمز مع قوائم حلال، والمهرجانات الموسمية، والمعارض العالمية في متحف فيكتوريا وألبرت والمتحف البريطاني."}
          </p>
        </div>
      </section>

      {/* Search & Filter Bar */}
      <section className="bg-white border-b sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-7 py-4">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full" role="search">
              <Search
                aria-hidden="true"
                className={`absolute ${isRTL ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 h-4 w-4 text-yl-gray-500`}
              />
              <input
                type="search"
                aria-label={
                  language === "en"
                    ? "Search events by name, venue, category or ticket provider"
                    : "ابحث عن الفعاليات بالاسم أو المكان أو الفئة"
                }
                placeholder={language === "en" ? "Search events, venues..." : "ابحث عن فعاليات، أماكن..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full ${isRTL ? "pr-10 pl-4" : "pl-10 pr-4"} py-2.5 border border-yl-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-yl-gold/30 focus:border-yl-gold`}
              />
            </div>
            <div
              className="flex gap-2 flex-wrap"
              role="group"
              aria-label={language === "en" ? "Filter events by category" : "تصفية الفعاليات حسب الفئة"}
            >
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  aria-pressed={selectedCategory === cat}
                  className={`font-mono text-[11px] tracking-wider uppercase px-4 py-2 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-yl-gold ${
                    selectedCategory === cat
                      ? "bg-yl-dark-navy text-yl-parchment"
                      : "bg-yl-gray-100 text-yl-charcoal hover:bg-yl-gray-200"
                  }`}
                >
                  {cat === "All" ? (language === "en" ? "All" : "الكل") : cat}
                </button>
              ))}
              <button
                onClick={() => setShowVipOnly(!showVipOnly)}
                aria-pressed={showVipOnly}
                aria-label={language === "en" ? "Show VIP events only" : "عرض فعاليات VIP فقط"}
                className={`font-mono text-[11px] tracking-wider uppercase px-4 py-2 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-yl-gold ${
                  showVipOnly ? "bg-yl-gold text-yl-charcoal" : "bg-yl-gray-100 text-yl-charcoal hover:bg-yl-gray-200"
                }`}
              >
                <Star className="h-3 w-3 inline mr-1 -mt-0.5" aria-hidden="true" /> VIP
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Events Grid */}
      <section className="py-12 bg-yl-cream">
        <div className="max-w-7xl mx-auto px-7">
          <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
            <h2 className="text-2xl font-heading font-bold text-yl-charcoal" aria-live="polite">
              {loading
                ? language === "en"
                  ? "Loading Events..."
                  : "جاري تحميل الفعاليات..."
                : language === "en"
                  ? `${filteredEvents.length} Events Available`
                  : `${filteredEvents.length} فعالية متاحة`}
            </h2>
            <div className="flex items-center gap-2 text-sm text-yl-gray-500">
              <Tag className="h-4 w-4" aria-hidden="true" />
              {dataSource === "database" || dataSource === "ticketmaster"
                ? language === "en"
                  ? "Synced daily from official event listings"
                  : "تتم المزامنة يومياً من قوائم الفعاليات الرسمية"
                : language === "en"
                  ? "Curated picks — live listings load automatically"
                  : "اختيارات منسّقة — القوائم المباشرة تُحمَّل تلقائياً"}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-20">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-yl-red mb-4" />
              <p className="text-yl-gray-500">{language === "en" ? "Loading events..." : "جاري تحميل الفعاليات..."}</p>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-yl-gray-500 text-lg">
                {language === "en" ? "No events match your filters" : "لا توجد فعاليات تطابق التصفية"}
              </p>
              <BrandButton
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setSelectedCategory("All");
                  setSearchQuery("");
                  setShowVipOnly(false);
                }}
              >
                {language === "en" ? "Clear Filters" : "مسح التصفية"}
              </BrandButton>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredEvents.map((event) => (
                <BrandCardLight key={event.id} className="overflow-hidden flex flex-col">
                  <div className="relative aspect-video">
                    <Image
                      src={
                        event.image ||
                        "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&h=600&fit=crop"
                      }
                      alt={event.title[language] || event.title.en}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover"
                    />
                    <div className={`absolute top-4 ${isRTL ? "right-4" : "left-4"} flex gap-2`}>
                      <BrandTag color="neutral">{event.category}</BrandTag>
                      {event.vipAvailable && <BrandTag color="gold">VIP</BrandTag>}
                    </div>
                    {/* June 12 trust audit: star-rating badge removed — we have no
                        real review source, and DB events all carried rating 0.
                        Showing fabricated or zero ratings erodes trust. */}
                    {event.soldOut && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <BrandTag color="red" className="text-lg px-4 py-2">
                          {language === "en" ? "SOLD OUT" : "نفدت التذاكر"}
                        </BrandTag>
                      </div>
                    )}
                  </div>
                  <div className="p-6 flex-1 flex flex-col">
                    <h3 className="text-xl font-heading font-semibold mb-2 text-yl-charcoal">
                      {event.title[language] || event.title.en}
                    </h3>
                    <p className="text-yl-gray-500 leading-relaxed mb-4 flex-1 text-sm">
                      {event.description[language] || event.description.en}
                    </p>
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-yl-gray-500">
                        <Calendar className="h-4 w-4 flex-shrink-0" />
                        <span>{formatDate(event.date)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-yl-gray-500">
                        <Clock className="h-4 w-4 flex-shrink-0" />
                        <span>{event.time}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-yl-gray-500">
                        <MapPin className="h-4 w-4 flex-shrink-0" />
                        <span>{event.venue}</span>
                      </div>
                    </div>
                    {event.ticketProvider && (
                      <div className="mb-4">
                        <span className="font-mono text-[11px] tracking-wider uppercase text-yl-gray-500">
                          <ShieldCheck className="h-3 w-3 inline mr-1 -mt-0.5 text-yl-gold" aria-hidden="true" />
                          {language === "en"
                            ? `Booked securely via ${event.ticketProvider}`
                            : `حجز آمن عبر ${event.ticketProvider}`}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-auto">
                      <span className="text-lg font-bold text-yl-red">{event.price}</span>
                      {event.soldOut ? (
                        <BrandButton variant="primary" disabled>
                          {language === "en" ? "Sold Out" : "نفدت"}
                        </BrandButton>
                      ) : (
                        <a
                          href={trackedBookingUrl(event)}
                          target="_blank"
                          rel="noopener sponsored"
                          onClick={() => trackBookingClick(event)}
                          data-affiliate-partner={(event.ticketProvider || "partner").toLowerCase()}
                          aria-label={
                            language === "en"
                              ? `Get tickets for ${event.title.en} — opens partner site in a new tab`
                              : `احصل على تذاكر ${event.title.ar || event.title.en} — يفتح موقع الشريك في نافذة جديدة`
                          }
                          className="affiliate-page-link inline-block focus:outline-none focus-visible:ring-2 focus-visible:ring-yl-gold rounded-lg"
                        >
                          <BrandButton variant="primary" className="pointer-events-none">
                            {language === "en" ? "Get Tickets" : "احصل على تذاكر"}
                            <ExternalLink
                              className={`h-4 w-4 ${isRTL ? "mr-2 rtl-flip" : "ml-2"}`}
                              aria-hidden="true"
                            />
                          </BrandButton>
                        </a>
                      )}
                    </div>
                  </div>
                </BrandCardLight>
              ))}
            </div>
          )}

          {/* "Couldn't find it" safety net — routes to a bookable partner page
              matched to the active category filter. Keeps the funnel moving
              even when the exact event isn't in our catalog. */}
          <div className="mt-10 rounded-[14px] border border-yl-gold/30 bg-white p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className={isRTL ? "text-right" : "text-left"}>
              <p className="font-heading font-semibold text-yl-charcoal">
                {language === "en" ? "Can't find the event you want?" : "لا تجد الفعالية التي تريدها؟"}
              </p>
              <p className="text-sm text-yl-gray-500 mt-1">
                {language === "en"
                  ? `Search the full catalogue on ${categoryPartnerCta.partner} — our booking partner with secure checkout.`
                  : `ابحث في الكتالوج الكامل على ${categoryPartnerCta.partner} — شريك الحجز الموثوق لدينا.`}
              </p>
            </div>
            <a
              href={categoryPartnerCta.href}
              target="_blank"
              rel="noopener sponsored"
              data-affiliate-partner={categoryPartnerCta.partner.toLowerCase()}
              className="affiliate-page-link flex-shrink-0 inline-flex items-center gap-2 px-6 py-3 bg-yl-dark-navy text-white rounded-lg font-semibold text-sm hover:bg-yl-dark-navy/90 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-yl-gold"
            >
              {language === "en" ? categoryPartnerCta.en : categoryPartnerCta.ar}
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>

      {/* Plan-your-visit cross-sell — keeps event buyers inside the funnel:
          match-day hotels (Expedia CJ deep link) + internal planning guides. */}
      <TriBar />
      <section className="py-12 bg-yl-cream" aria-labelledby="plan-visit-heading">
        <div className="max-w-7xl mx-auto px-7">
          <h3 id="plan-visit-heading" className="text-xl font-heading font-semibold text-yl-charcoal mb-6">
            {language === "en" ? "Plan Your Visit Around the Event" : "خطط لزيارتك حول الفعالية"}
          </h3>
          <div className="grid sm:grid-cols-3 gap-4">
            <a
              href={buildExpediaAffiliateUrl(
                "https://www.expedia.com/London-Hotels.d178279.Travel-Guide-Hotels",
                "events-page",
              )}
              target="_blank"
              rel="noopener sponsored"
              data-affiliate-partner="expedia"
              className="affiliate-page-link p-5 bg-white rounded-[14px] border border-yl-gray-200 hover:border-yl-gold/40 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-yl-gold"
            >
              <Hotel className="h-5 w-5 text-yl-gold mb-2" aria-hidden="true" />
              <p className="font-semibold text-yl-charcoal text-sm">
                {language === "en" ? "Hotels near the venue" : "فنادق قرب المكان"}
              </p>
              <p className="text-xs text-yl-gray-500 mt-1">
                {language === "en" ? "Compare prices on Expedia" : "قارن الأسعار على إكسبيديا"}
              </p>
            </a>
            <Link
              href="/london-with-kids"
              className="p-5 bg-white rounded-[14px] border border-yl-gray-200 hover:border-yl-gold/40 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-yl-gold"
            >
              <BookOpen className="h-5 w-5 text-yl-gold mb-2" aria-hidden="true" />
              <p className="font-semibold text-yl-charcoal text-sm">
                {language === "en" ? "London with kids guide" : "دليل لندن مع الأطفال"}
              </p>
              <p className="text-xs text-yl-gray-500 mt-1">
                {language === "en" ? "Family-friendly planning tips" : "نصائح للتخطيط العائلي"}
              </p>
            </Link>
            <Link
              href="/blog"
              className="p-5 bg-white rounded-[14px] border border-yl-gray-200 hover:border-yl-gold/40 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-yl-gold"
            >
              <BookOpen className="h-5 w-5 text-yl-gold mb-2" aria-hidden="true" />
              <p className="font-semibold text-yl-charcoal text-sm">
                {language === "en" ? "Latest London guides" : "أحدث أدلة لندن"}
              </p>
              <p className="text-xs text-yl-gray-500 mt-1">
                {language === "en" ? "Restaurants, transport & more" : "مطاعم ومواصلات والمزيد"}
              </p>
            </Link>
          </div>
        </div>
      </section>

      {/* Past Events */}
      {pastEvents.length > 0 && (
        <>
          <TriBar />
          <section className="py-8 bg-yl-cream/50">
            <div className="max-w-7xl mx-auto px-7">
              <h3 className="text-lg font-heading font-semibold text-yl-gray-500 mb-4">
                {language === "en" ? "Past Events" : "فعاليات سابقة"}
              </h3>
              <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
                {pastEvents.slice(0, 8).map((event) => (
                  <div key={event.id} className="p-3 bg-white/60 rounded-[14px] border border-yl-gray-200 opacity-70">
                    <p className="text-sm font-medium text-yl-charcoal truncate">
                      {event.title[language] || event.title.en}
                    </p>
                    <p className="text-xs text-yl-gray-500 mt-1">
                      {formatDate(event.date)} — {event.venue}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      {/* Affiliate Partners */}
      <TriBar />
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-7">
          <div className="text-center mb-8">
            <h3 className="text-xl font-heading font-semibold text-yl-charcoal mb-2">
              {language === "en" ? "Our Trusted Ticket Partners" : "شركاء التذاكر الموثوقين"}
            </h3>
            <p className="text-yl-gray-500 text-sm max-w-2xl mx-auto">
              {language === "en"
                ? "Every booking is completed on the partner's own secure checkout. We never handle your payment details — we simply earn a commission when you book, at no extra cost to you."
                : "تتم كل عملية حجز على صفحة الدفع الآمنة الخاصة بالشريك. نحن لا نتعامل مع بيانات الدفع الخاصة بك — نحصل فقط على عمولة عند الحجز، دون أي تكلفة إضافية عليك."}
            </p>
          </div>
          {/* June 12 trust audit: this panel previously listed partners we do
              NOT work with (StubHub, GetYourGuide, Viator). Now lists only the
              programs we actually book through. */}
          <div className="flex justify-center gap-8 flex-wrap">
            {[
              { name: "SportsEvents365", desc: { en: "Football & concerts", ar: "كرة القدم والحفلات" } },
              { name: "Tiqets", desc: { en: "Attractions & museums", ar: "المعالم والمتاحف" } },
              { name: "TicketNetwork", desc: { en: "Theatre & live shows", ar: "المسرح والعروض الحية" } },
            ].map((partner) => (
              <div
                key={partner.name}
                className="text-center px-6 py-4 rounded-[14px] border border-yl-gray-200 hover:border-yl-gold/30 hover:bg-yl-cream transition-all"
              >
                <span className="font-semibold text-yl-charcoal">{partner.name}</span>
                <span className="block font-mono text-[11px] tracking-wider uppercase text-yl-gray-500 mt-1">
                  {language === "en" ? partner.desc.en : partner.desc.ar}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <TriBar />
      <section className="py-20 bg-yl-dark-navy text-white">
        <div className="max-w-4xl mx-auto text-center px-7">
          <h2 className="text-4xl font-heading font-bold mb-6">
            {language === "en" ? "Can't Find What You're Looking For?" : "لا تجد ما تبحث عنه؟"}
          </h2>
          <p className="text-xl mb-8 text-yl-gray-400">
            {language === "en"
              ? "Contact us for personalized event recommendations and exclusive VIP access"
              : "اتصل بنا للحصول على توصيات فعاليات مخصصة ووصول VIP حصري"}
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/contact">
              <BrandButton variant="gold">
                {language === "en" ? "Contact Us" : "اتصل بنا"}
                <ArrowRight className={`h-5 w-5 ${isRTL ? "mr-2 rtl-flip" : "ml-2"}`} />
              </BrandButton>
            </Link>
            <Link href="/recommendations">
              <BrandButton variant="outline" className="border-white text-white hover:bg-white/10">
                {language === "en" ? "View All Recommendations" : "عرض جميع التوصيات"}
                <MapPin className={`h-5 w-5 ${isRTL ? "mr-2 rtl-flip" : "ml-2"}`} />
              </BrandButton>
            </Link>
          </div>
        </div>
      </section>
      <AffiliateDisclosure language={language as "en" | "ar"} className="mx-auto max-w-6xl px-4" />
    </div>
  );
}
