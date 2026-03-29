"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/components/language-provider";
import { getTranslation } from "@/lib/i18n";
import { TriBar, BrandButton, BrandTag, BrandCardLight, SectionLabel, WatermarkStamp, Breadcrumbs } from "@/components/brand-kit";
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

// Fallback events shown only when DB has no events yet
// Dates should be kept in the future — update quarterly
const FALLBACK_EVENTS: EventItem[] = [
  {
    id: "fallback-1",
    title: {
      en: "London Marathon 2026",
      ar: "ماراثون لندن 2026",
    },
    description: {
      en: "The world's most iconic marathon runs from Greenwich to The Mall. Free to watch from many vantage points along the route.",
      ar: "أشهر ماراثون في العالم من غرينيتش إلى ذا مول. مجاني للمشاهدة من نقاط عديدة على الطريق.",
    },
    date: "2026-04-26",
    time: "09:00",
    venue: "Greenwich to The Mall",
    category: "Experience",
    price: "Free to watch",
    image:
      "https://images.unsplash.com/photo-1513593771513-7b58b6c4af38?w=800&h=600&fit=crop",
    rating: 4.9,
    bookingUrl: "https://www.tcslondonmarathon.com/",
    affiliateTag: "",
    ticketProvider: "Official",
    vipAvailable: false,
  },
  {
    id: "fallback-2",
    title: {
      en: "The Lion King - Musical Theatre",
      ar: "الأسد الملك - مسرح موسيقي",
    },
    description: {
      en: "The award-winning musical that brings the Pride Lands to life with stunning costumes and music.",
      ar: "المسرحية الموسيقية الحائزة على جوائز التي تنقل أراضي العزة إلى الحياة.",
    },
    date: "2026-04-15",
    time: "19:30",
    venue: "Lyceum Theatre",
    category: "Theatre",
    price: "From \u00a345",
    image:
      "https://images.unsplash.com/photo-1503095396549-807759245b35?w=800&h=600&fit=crop",
    rating: 4.8,
    bookingUrl:
      "https://www.ticketmaster.co.uk/the-lion-king-tickets/artist/805987",
    affiliateTag: "ticketmaster",
    ticketProvider: "Ticketmaster",
    vipAvailable: true,
  },
  {
    id: "fallback-3",
    title: {
      en: "Thames Luxury Dinner Cruise",
      ar: "رحلة عشاء فاخرة على نهر التايمز",
    },
    description: {
      en: "Fine dining on the Thames with views of Tower Bridge, Big Ben, and the London Eye. Halal menu available.",
      ar: "عشاء فاخر على التايمز مع إطلالة على تاور بريدج وبيج بن ولندن آي.",
    },
    date: "2026-04-20",
    time: "19:00",
    venue: "Westminster Pier",
    category: "Experience",
    price: "From \u00a389",
    image:
      "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&h=600&fit=crop",
    rating: 4.7,
    bookingUrl: "https://www.viator.com/London/d737",
    affiliateTag: "viator",
    ticketProvider: "Viator",
    vipAvailable: true,
  },
];

const DEFAULT_CATEGORIES = [
  "All",
  "Football",
  "Theatre",
  "Festival",
  "Exhibition",
  "Experience",
];

export default function EventsPage({ serverLocale }: { serverLocale?: 'en' | 'ar' }) {
  const { language: clientLanguage, isRTL: clientIsRTL } = useLanguage();
  const language = serverLocale ?? clientLanguage;
  const isRTL = language === 'ar' ? true : clientIsRTL;
  const t = (key: string) => getTranslation(language, key);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [showVipOnly, setShowVipOnly] = useState(false);
  const [events, setEvents] = useState<EventItem[]>(FALLBACK_EVENTS);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const res = await fetch("/api/events");
        if (res.ok) {
          const data = await res.json();
          if (data.events && data.events.length > 0) {
            setEvents(data.events);
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

  const now = new Date();
  const upcomingEvents = events.filter((event) => new Date(event.date) >= now);
  const pastEvents = events.filter((event) => new Date(event.date) < now);

  const filteredEvents = upcomingEvents.filter((event) => {
    const matchesCategory =
      selectedCategory === "All" || event.category === selectedCategory;
    const matchesSearch =
      searchQuery === "" ||
      event.title[language]
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      event.venue.toLowerCase().includes(searchQuery.toLowerCase());
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

  const handleBooking = (event: EventItem) => {
    if (typeof window !== "undefined") {
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
        console.warn('[Events] Failed to track affiliate click for event:', event.title.en, error);
      }
      window.open(event.bookingUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className={`bg-yl-cream font-body ${isRTL ? "rtl" : "ltr"}`}>
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
          <Breadcrumbs items={[
            { label: language === "en" ? "Home" : "الرئيسية", href: "/" },
            { label: language === "en" ? "Events" : "فعاليات" },
          ]} />
          <SectionLabel>{language === "en" ? "Events & Tickets" : "فعاليات وتذاكر"}</SectionLabel>
          <h1
            className="text-4xl sm:text-5xl md:text-6xl font-heading font-bold mb-6 mt-4"
            style={{ textShadow: '0 2px 12px rgba(15,22,33,0.7), 0 1px 3px rgba(15,22,33,0.5)' }}
          >
            {language === "en"
              ? "London Events & Tickets"
              : "فعاليات وتذاكر لندن"}
          </h1>
          <p className="text-xl md:text-2xl text-yl-gray-400 max-w-3xl mx-auto mb-8" style={{ textShadow: '0 1px 8px rgba(15,22,33,0.6)' }}>
            {language === "en"
              ? "Book premium tickets for the best London experiences"
              : "احجز تذاكر مميزة لأفضل تجارب لندن"}
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <span className="font-mono text-[10px] tracking-wider uppercase px-4 py-2 bg-white/10 rounded-full">
              <Ticket className="h-3.5 w-3.5 inline mr-1.5 -mt-0.5" />
              {language === "en" ? "Verified Tickets" : "تذاكر معتمدة"}
            </span>
            <span className="font-mono text-[10px] tracking-wider uppercase px-4 py-2 bg-white/10 rounded-full">
              <Star className="h-3.5 w-3.5 inline mr-1.5 -mt-0.5" />
              {language === "en" ? "VIP Packages" : "باقات VIP"}
            </span>
          </div>
        </div>
      </section>
      <TriBar />

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
            <div className="relative flex-1 w-full">
              <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 h-4 w-4 text-yl-gray-500`} />
              <input
                placeholder={
                  language === "en"
                    ? "Search events, venues..."
                    : "ابحث عن فعاليات، أماكن..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 border border-yl-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-yl-gold/30 focus:border-yl-gold`}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`font-mono text-[10px] tracking-wider uppercase px-4 py-2 rounded-full transition-colors ${
                    selectedCategory === cat
                      ? "bg-yl-dark-navy text-yl-parchment"
                      : "bg-yl-gray-100 text-yl-charcoal hover:bg-yl-gray-200"
                  }`}
                >
                  {cat === "All"
                    ? language === "en"
                      ? "All"
                      : "الكل"
                    : cat}
                </button>
              ))}
              <button
                onClick={() => setShowVipOnly(!showVipOnly)}
                className={`font-mono text-[10px] tracking-wider uppercase px-4 py-2 rounded-full transition-colors ${
                  showVipOnly ? "bg-yl-gold text-yl-charcoal" : "bg-yl-gray-100 text-yl-charcoal hover:bg-yl-gray-200"
                }`}
              >
                <Star className="h-3 w-3 inline mr-1 -mt-0.5" /> VIP
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Events Grid */}
      <section className="py-12 bg-yl-cream">
        <div className="max-w-7xl mx-auto px-7">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-heading font-bold text-yl-charcoal">
              {loading
                ? language === "en"
                  ? "Loading Events..."
                  : "جاري تحميل الفعاليات..."
                : language === "en"
                  ? `${filteredEvents.length} Events Available`
                  : `${filteredEvents.length} فعالية متاحة`}
            </h2>
            <div className="flex items-center gap-2 text-sm text-yl-gray-500">
              <Tag className="h-4 w-4" />
              {language === "en"
                ? "Powered by trusted ticket partners"
                : "مدعوم من شركاء التذاكر الموثوقين"}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-20">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-yl-red mb-4" />
              <p className="text-yl-gray-500">
                {language === "en"
                  ? "Loading events..."
                  : "جاري تحميل الفعاليات..."}
              </p>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-yl-gray-500 text-lg">
                {language === "en"
                  ? "No events match your filters"
                  : "لا توجد فعاليات تطابق التصفية"}
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
                    <div className={`absolute top-4 ${isRTL ? 'right-4' : 'left-4'} flex gap-2`}>
                      <BrandTag color="neutral">{event.category}</BrandTag>
                      {event.vipAvailable && (
                        <BrandTag color="gold">VIP</BrandTag>
                      )}
                    </div>
                    <div className={`absolute top-4 ${isRTL ? 'left-4' : 'right-4'} bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full`}>
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yl-gold text-yl-gold" />
                        <span className="text-sm font-medium text-yl-charcoal">
                          {event.rating}
                        </span>
                      </div>
                    </div>
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
                        <span className="font-mono text-[10px] tracking-wider uppercase text-yl-gray-500">
                          <Ticket className="h-3 w-3 inline mr-1 -mt-0.5" />
                          {language === "en" ? "via" : "عبر"}{" "}
                          {event.ticketProvider}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-auto">
                      <span className="text-lg font-bold text-yl-red">
                        {event.price}
                      </span>
                      <BrandButton
                        variant="primary"
                        disabled={event.soldOut}
                        onClick={() => handleBooking(event)}
                      >
                        {event.soldOut
                          ? language === "en"
                            ? "Sold Out"
                            : "نفدت"
                          : language === "en"
                            ? "Get Tickets"
                            : "احصل على تذاكر"}
                        {!event.soldOut && (
                          <ExternalLink
                            className={`h-4 w-4 ${isRTL ? "mr-2 rtl-flip" : "ml-2"}`}
                          />
                        )}
                      </BrandButton>
                    </div>
                  </div>
                </BrandCardLight>
              ))}
            </div>
          )}
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
                    <p className="text-sm font-medium text-yl-charcoal truncate">{event.title[language] || event.title.en}</p>
                    <p className="text-xs text-yl-gray-500 mt-1">{formatDate(event.date)} — {event.venue}</p>
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
              {language === "en"
                ? "Our Trusted Ticket Partners"
                : "شركاء التذاكر الموثوقين"}
            </h3>
            <p className="text-yl-gray-500 text-sm">
              {language === "en"
                ? "We partner with leading ticket providers to bring you the best deals"
                : "نتعاون مع مزودي التذاكر الرائدين لنقدم لك أفضل العروض"}
            </p>
          </div>
          <div className="flex justify-center gap-8 flex-wrap">
            {["StubHub", "Ticketmaster", "GetYourGuide", "Viator"].map(
              (partner) => (
                <div
                  key={partner}
                  className="text-center px-6 py-4 rounded-[14px] border border-yl-gray-200 hover:border-yl-gold/30 hover:bg-yl-cream transition-all"
                >
                  <span className="font-semibold text-yl-gray-500">{partner}</span>
                  <span className="block font-mono text-[10px] tracking-wider uppercase text-yl-gray-500 mt-1">
                    {language === "en" ? "Verified Partner" : "شريك معتمد"}
                  </span>
                </div>
              ),
            )}
          </div>
        </div>
      </section>

      {/* CTA */}
      <TriBar />
      <section className="py-20 bg-yl-dark-navy text-white">
        <div className="max-w-4xl mx-auto text-center px-7">
          <h2 className="text-4xl font-heading font-bold mb-6">
            {language === "en"
              ? "Can't Find What You're Looking For?"
              : "لا تجد ما تبحث عنه؟"}
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
    </div>
  );
}
