"use client";

/**
 * Yalla London — Editorial Homepage
 *
 * Premium magazine-style homepage with:
 * - Editorial serif typography with gold accent rules
 * - Split hero (text + cinematic image)
 * - Live news ticker bar with trending topics
 * - Magazine-style featured article + sidebar layout
 * - Live Ticketmaster events
 * - Real DB articles replacing fallback content
 * - Full bilingual EN/AR with RTL support
 * - SEO: semantic HTML, proper heading hierarchy, alt texts
 * - GEO: citability paragraphs, self-contained sections
 * - Conversion: affiliate CTAs on experiences + hotels
 */

import React, { useState, useEffect } from "react";
import { TriBar } from "@/components/brand-kit";
import { NewsCarousel } from "@/components/news-carousel";
import { WeatherStrip } from "@/components/weather-strip";
import { FollowUs } from "@/components/follow-us";
import { NewsTicker, EditorialHero, IntentCards } from "./editorial-hero";
import { EditorialArticles } from "./editorial-articles";
import {
  EventsSection,
  ExperiencesSection,
  HotelsSection,
  InfoHubSection,
  TestimonialsSection,
} from "./editorial-sections";
import { FEATURED_ARTICLE, FALLBACK_ARTICLES } from "./editorial-data";

interface Props {
  locale?: "en" | "ar";
}

interface DBArticle {
  id: string;
  slug: string | null;
  title_en: string | null;
  title_ar: string | null;
  meta_description_en: string | null;
  meta_description_ar: string | null;
  seo_score: number | null;
  created_at: string;
  category?: { name: string } | null;
}

interface EventItem {
  id: string;
  title: string;
  day: string;
  month: string;
  venue: string;
  price: string;
  image: string;
  url?: string;
}

function formatRelativeDate(dateStr: string, lang: "en" | "ar"): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (lang === "ar") {
    if (diffDays === 0) return "اليوم";
    if (diffDays === 1) return "أمس";
    if (diffDays < 7) return `قبل ${diffDays} أيام`;
    return d.toLocaleDateString("ar-SA", { month: "long", year: "numeric" });
  }
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

// ─── Fallback events when Ticketmaster not configured ──────────────────────

const FALLBACK_EVENTS: EventItem[] = [
  { id: "1", title: "Chelsea Flower Show", day: "20", month: "May", venue: "Royal Hospital Chelsea", price: "From \u00A340", image: "https://images.unsplash.com/photo-1490750967868-88aa4f44baee?w=500&q=80" },
  { id: "2", title: "Wimbledon Championships", day: "30", month: "Jun", venue: "All England Club", price: "From \u00A360", image: "https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=500&q=80" },
  { id: "3", title: "BBC Proms at Royal Albert Hall", day: "18", month: "Jul", venue: "Royal Albert Hall", price: "From \u00A38", image: "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=500&q=80" },
];

// ─── Main Component ───────────────────────────────────────────────────────

export function YallaHomepageEditorial({ locale = "en" }: Props) {
  const isRTL = locale === "ar";
  const [dbArticles, setDbArticles] = useState<DBArticle[]>([]);
  const [liveEvents, setLiveEvents] = useState<EventItem[]>([]);

  // Fetch real articles from DB
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/blog?limit=6&sort=newest");
        if (res.ok) {
          const json = await res.json();
          const posts = json.posts || json.articles || json.data || [];
          if (Array.isArray(posts) && posts.length > 0) setDbArticles(posts);
        }
      } catch { /* fallback to static */ }
    })();
  }, []);

  // Fetch live Ticketmaster events
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/integrations/events?siteId=yalla-london&limit=6");
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json.events) && json.events.length > 0) {
            setLiveEvents(json.events.map((e: Record<string, unknown>) => ({
              id: String(e.id || Math.random()),
              title: String(e.name || e.title || ""),
              day: String(e.day || ""),
              month: String(e.month || ""),
              venue: String(e.venue || ""),
              price: String(e.price || e.priceRange || ""),
              image: String(e.image || e.imageUrl || "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=500&q=80"),
              url: e.url ? String(e.url) : undefined,
            })));
          }
        }
      } catch { /* fallback to static */ }
    })();
  }, []);

  // Build article list: DB first, then fallback
  const fallback = FALLBACK_ARTICLES[locale];
  const articles = dbArticles.length > 0
    ? dbArticles.slice(0, 3).map((a, i) => ({
        id: a.id || String(i),
        slug: a.slug || "#",
        category: a.category?.name || (locale === "ar" ? "مقال" : "Article"),
        title: (locale === "ar" ? a.title_ar : a.title_en) || a.title_en || "",
        excerpt: (locale === "ar" ? a.meta_description_ar : a.meta_description_en) || a.meta_description_en || "",
        image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600&q=80",
        date: formatRelativeDate(a.created_at, locale),
        readTime: locale === "ar" ? "5 دقائق" : "5 min read",
      }))
    : fallback;

  // Featured article (first DB article or fallback)
  const feat = FEATURED_ARTICLE[locale];
  const featured = dbArticles.length > 0
    ? {
        ...articles[0],
        slug: dbArticles[0].slug || feat.slug || "#",
        author: feat.author,
        image: FEATURED_ARTICLE.image,
      }
    : { id: "0", slug: feat.slug || "#", ...feat, image: FEATURED_ARTICLE.image };

  const events = liveEvents.length > 0 ? liveEvents : FALLBACK_EVENTS;

  return (
    <div className={`bg-yl-cream ${isRTL ? "font-arabic" : "font-body"}`} dir={isRTL ? "rtl" : "ltr"}>

      {/* ═══ NEWS TICKER BAR ═══ */}
      <NewsTicker locale={locale} />

      {/* ═══ EDITORIAL HERO ═══ */}
      <EditorialHero locale={locale} />

      {/* ═══ INTENT CARDS ═══ */}
      <IntentCards locale={locale} />

      {/* ═══ TRI-COLOR DIVIDER ═══ */}
      <TriBar />

      {/* ═══ FEATURED + ARTICLES (magazine layout) ═══ */}
      <EditorialArticles
        locale={locale}
        featured={featured}
        articles={articles.slice(1)}
      />

      <TriBar />

      {/* ═══ HOTELS (highest affiliate value — above fold priority) ═══ */}
      <HotelsSection locale={locale} />

      <TriBar />

      {/* ═══ EXPERIENCES (second-highest affiliate value) ═══ */}
      <ExperiencesSection locale={locale} />

      <TriBar />

      {/* ═══ EVENTS (ticket affiliates) ═══ */}
      <EventsSection locale={locale} events={events} />

      <TriBar />

      {/* ═══ NEWS CAROUSEL (London Today — editorial content) ═══ */}
      <section className="bg-white py-10">
        <div className="max-w-7xl mx-auto px-5">
          <NewsCarousel />
        </div>
      </section>

      {/* ═══ WEATHER ═══ */}
      <div className="min-h-[48px]">
        <WeatherStrip locale={locale} />
      </div>

      <TriBar />

      {/* ═══ INFORMATION HUB (utility — below monetizable content) ═══ */}
      <InfoHubSection locale={locale} />

      <TriBar />

      {/* ═══ TESTIMONIALS (social proof — near CTA/footer) ═══ */}
      <TestimonialsSection locale={locale} />

      <TriBar />

      {/* ═══ FOLLOW US ═══ */}
      <section className="bg-yl-dark-navy py-10">
        <div className="max-w-7xl mx-auto px-5 text-center">
          <FollowUs variant="dark" showLabel={true} />
        </div>
      </section>
    </div>
  );
}

export default YallaHomepageEditorial;
