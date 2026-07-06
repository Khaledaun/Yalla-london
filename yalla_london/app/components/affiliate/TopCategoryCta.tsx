"use client";

/**
 * Top-of-page affiliate hero CTA for category landing pages
 * (/hotels, /experiences, /recommendations).
 *
 * Why it exists: Perplexity re-audit (May 17 2026) found these priority-0.9
 * pages had $0 revenue despite per-item CTAs on each card. Users landing
 * directly on /hotels see 15+ hotel cards and most leave without scrolling
 * to find a CTA. A prominent above-the-fold "Browse all London hotels"
 * button captures impatient browsers and routes them through /api/affiliate/click
 * for full SID attribution.
 *
 * Routes through Expedia (highest EPC among CJ-approved hotel partners) for
 * hotel CTAs, Tiqets for experiences. SID format: {siteId}_{pageSlug}-hero
 * so CjClickEvent reports show per-page hero performance separately from
 * per-card clicks.
 *
 * NEVER converts GBP to AED/SAR — Khaled's explicit constraint (May 17):
 * "i want to keep everything here in London in gbp".
 */

import React from "react";
import { buildExpediaAffiliateUrl, buildTravelpayoutsAffiliateUrl } from "@/lib/affiliate/page-affiliate-links";

type Variant = "hotel" | "experience" | "restaurant" | "all";

interface Props {
  variant: Variant;
  locale: "en" | "ar";
  /** Page identifier used in SID — e.g., "hotels", "experiences", "recommendations" */
  pageSlug: string;
}

interface Copy {
  badge: string;
  headline: string;
  sub: string;
  cta: string;
}

const COPY: Record<Variant, { en: Copy; ar: Copy }> = {
  hotel: {
    en: {
      badge: "Featured booking partner",
      headline: "Compare 1,000+ London luxury hotels",
      sub: "Real-time availability and prices from the world's largest booking platforms.",
      cta: "Browse all London hotels →",
    },
    ar: {
      badge: "شريك الحجز المميز",
      headline: "قارن أكثر من 1,000 فندق فاخر في لندن",
      sub: "أسعار وتوافر فوري من أكبر منصات الحجز في العالم.",
      cta: "تصفح جميع فنادق لندن ←",
    },
  },
  experience: {
    en: {
      badge: "Featured experiences partner",
      headline: "Skip-the-queue tickets to London's best attractions",
      sub: "Tower of London, London Eye, West End shows, Premier League matches — secure your spot.",
      cta: "Browse all experiences →",
    },
    ar: {
      badge: "شريك التجارب المميز",
      headline: "تذاكر بدون انتظار لأفضل معالم لندن",
      sub: "برج لندن، عين لندن، عروض الويست إند، مباريات الدوري الإنجليزي — احجز مقعدك.",
      cta: "تصفح جميع التجارب ←",
    },
  },
  restaurant: {
    en: {
      badge: "Featured dining partner",
      headline: "Book London's most sought-after restaurants",
      sub: "Michelin-starred dining, halal-friendly venues, afternoon tea at iconic hotels.",
      cta: "Reserve a table →",
    },
    ar: {
      badge: "شريك المطاعم المميز",
      headline: "احجز أكثر مطاعم لندن طلباً",
      sub: "مطاعم حائزة على نجوم ميشلان، أماكن صديقة للحلال، شاي بعد الظهر في فنادق أيقونية.",
      cta: "احجز طاولة ←",
    },
  },
  all: {
    en: {
      badge: "Featured booking partner",
      headline: "Plan your perfect London stay",
      sub: "Hotels, experiences, restaurants — all in one place with verified availability.",
      cta: "Start planning →",
    },
    ar: {
      badge: "شريك الحجز المميز",
      headline: "خطط لإقامتك المثالية في لندن",
      sub: "الفنادق والتجارب والمطاعم — كل ذلك في مكان واحد مع توافر مؤكد.",
      cta: "ابدأ التخطيط ←",
    },
  },
};

/**
 * Builds the affiliate-tracked URL. We hand the Expedia/Tiqets London search
 * URL to /api/affiliate/click which:
 *   1. logs the click to AuditLog (direct URLs lack CjLink FK so we can't
 *      use CjClickEvent — see rule #232)
 *   2. fires GA4 Measurement Protocol event
 *   3. 302-redirects to the partner with utm tags
 *
 * The SID encodes site + page + position so per-page hero performance is
 * trackable separately from per-card CTAs in the same article.
 */
function buildAffiliateUrl(variant: Variant, pageSlug: string, siteId: string): { url: string; partner: string } {
  const sid = `${siteId}_${pageSlug}-hero`;

  if (variant === "hotel" || variant === "all") {
    // CJ deep link — utm-only Expedia URLs pay nothing (June 12 audit)
    const dest = encodeURIComponent("London, United Kingdom");
    return {
      url: buildExpediaAffiliateUrl(
        `https://www.expedia.com/Hotel-Search?destination=${dest}`,
        `${pageSlug}-hero`,
        siteId,
      ),
      partner: "expedia",
    };
  }

  if (variant === "experience") {
    // Travelpayouts marker — without it the Tiqets click pays nothing
    return {
      url: buildTravelpayoutsAffiliateUrl(
        "tiqets",
        "https://www.tiqets.com/en/london-c70972/",
        `${pageSlug}-hero`,
        siteId,
      ),
      partner: "tiqets",
    };
  }

  // restaurant
  const target = `https://www.thefork.com/restaurants/london-c560204?utm_source=${siteId}&utm_medium=affiliate&utm_campaign=${pageSlug}-hero`;
  return {
    url: `/api/affiliate/click?url=${encodeURIComponent(target)}&partner=thefork&article=${encodeURIComponent(pageSlug + "-hero")}&sid=${encodeURIComponent(sid)}`,
    partner: "thefork",
  };
}

export default function TopCategoryCta({ variant, locale, pageSlug }: Props) {
  const copy = COPY[variant][locale];
  const { url, partner } = buildAffiliateUrl(variant, pageSlug, "yalla-london");
  const isRtl = locale === "ar";

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className="my-8 rounded-xl overflow-hidden shadow-md"
      style={{
        background: "linear-gradient(135deg, #1A2238 0%, #2D3F66 100%)",
        color: "#fff",
      }}
    >
      <div
        className="px-6 py-7 sm:px-8 sm:py-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        style={{ alignItems: isRtl ? "flex-end" : undefined }}
      >
        <div className={`flex-1 min-w-0 ${isRtl ? "text-right" : "text-left"}`}>
          <div
            className="inline-block text-[11px] uppercase tracking-wider font-semibold mb-2 px-2 py-0.5 rounded"
            style={{ background: "rgba(196, 154, 42, 0.20)", color: "#E5C470" }}
          >
            {copy.badge}
          </div>
          <h2
            className="text-xl sm:text-2xl font-bold mb-1.5"
            style={{
              fontFamily: isRtl ? "'IBM Plex Sans Arabic', sans-serif" : "'Anybody', sans-serif",
              lineHeight: 1.25,
            }}
          >
            {copy.headline}
          </h2>
          <p className="text-sm sm:text-base text-white/80 leading-snug">{copy.sub}</p>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener sponsored"
          className="affiliate-page-link flex-shrink-0 inline-block px-5 py-3 rounded-lg font-semibold text-sm sm:text-base text-center whitespace-nowrap"
          style={{ background: "#C49A2A", color: "#1A2238", minWidth: "180px" }}
          data-affiliate-partner={partner}
          data-sid={`yalla-london_${pageSlug}-hero`}
        >
          {copy.cta}
        </a>
      </div>
      <div
        className="px-6 sm:px-8 py-2 text-[11px] text-white/60"
        style={{ background: "rgba(0,0,0,0.20)", textAlign: isRtl ? "right" : "left" }}
      >
        {locale === "ar"
          ? "إفصاح: قد نحصل على عمولة عند الحجز عبر روابطنا. لا تكلفك شيئاً إضافياً."
          : "Disclosure: We may earn a commission when you book through our links — at no extra cost to you."}
      </div>
    </div>
  );
}
