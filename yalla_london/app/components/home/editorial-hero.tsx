"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Gem, Utensils, Compass, TrendingUp } from "lucide-react";
import { TriBar, BrandButton } from "@/components/brand-kit";
import { HERO, INTENTS, TEXT } from "./editorial-data";

const ICON_MAP: Record<string, React.ElementType> = { Gem, Utensils, Compass };

interface Props { locale: "en" | "ar" }

/* ── News Ticker Bar ── */
export function NewsTicker({ locale }: Props) {
  const t = TEXT[locale];
  return (
    <div className="bg-yl-dark-navy border-b border-white/10 overflow-hidden">
      <div className="max-w-7xl mx-auto px-5 py-2 flex items-center gap-3" style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", msOverflowStyle: "none", scrollbarWidth: "none" }}>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yl-red opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-yl-red" />
          </span>
          <span className="font-mono text-[10px] font-bold text-yl-red uppercase tracking-[0.2em]">{t.trending}</span>
        </div>
        <div className="w-px h-3 bg-white/15 flex-shrink-0" />
        {t.trendingItems.map((item, i) => (
          <React.Fragment key={i}>
            <Link
              href={`/blog?q=${encodeURIComponent(item)}`}
              className="flex-shrink-0 text-xs text-white/40 hover:text-yl-gold whitespace-nowrap transition-colors font-body"
            >
              {item}
            </Link>
            {i < t.trendingItems.length - 1 && (
              <span className="flex-shrink-0 text-white/15 text-[10px]">|</span>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

/* ── Editorial Hero ── */
export function EditorialHero({ locale }: Props) {
  const h = HERO[locale];
  const isRTL = locale === "ar";

  return (
    <section className="relative bg-yl-cream overflow-hidden">
      <div className="max-w-7xl mx-auto px-5 py-12 md:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
          {/* Text */}
          <div className={isRTL ? "order-2 md:order-2" : ""}>
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-yl-gold">
              {h.kicker}
            </span>
            <h1
              className={`text-[2.5rem] md:text-[3.5rem] font-bold leading-[1.1] mt-3 text-yl-charcoal ${isRTL ? "font-arabic" : "font-display"}`}
            >
              {h.title1},<br />
              <span className="text-yl-red">{h.title2}</span>
            </h1>
            <div className="w-14 h-[2px] bg-yl-gold mt-5" />
            <p className={`text-lg text-yl-gray-500 mt-5 leading-relaxed max-w-md ${isRTL ? "font-arabic" : "font-body"}`}>
              {h.description}
            </p>
            <BrandButton variant="primary" size="lg" href="/blog" className="mt-7">
              {h.cta} <ArrowRight className={`w-4 h-4 ${isRTL ? "rotate-180 mr-2" : "ml-2"}`} />
            </BrandButton>
          </div>

          {/* Hero Image */}
          <div className={`relative aspect-[4/5] md:aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl ${isRTL ? "order-1 md:order-1" : ""}`}>
            <Image
              src="/images/hero/london-city-night.jpg"
              alt="London cityscape at night"
              fill
              className="object-cover"
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            {/* LDN Stamp watermark */}
            <div className="absolute bottom-4 right-4 w-16 h-16 rounded-full border-2 border-white/20 flex items-center justify-center rotate-[-12deg]">
              <span className="text-white/30 text-[9px] font-mono font-bold tracking-[0.15em]">LDN</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Intent Cards (below hero) ── */
export function IntentCards({ locale }: Props) {
  const isRTL = locale === "ar";
  return (
    <section className="bg-yl-dark-navy py-8 px-5">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
        {INTENTS.map((card) => {
          const IconComp = ICON_MAP[card.icon] || Compass;
          const t = card[locale];
          return (
            <Link
              key={card.href}
              href={card.href}
              className="group flex items-center gap-4 rounded-xl bg-white/[0.04] border border-white/[0.06] p-5 hover:border-yl-gold/30 hover:bg-white/[0.06] transition-all duration-300"
            >
              <div className="w-11 h-11 rounded-lg bg-yl-gold/10 flex items-center justify-center flex-shrink-0">
                <IconComp className="w-5 h-5 text-yl-gold" />
              </div>
              <div className="min-w-0">
                <h3 className={`font-bold text-white text-sm group-hover:text-yl-gold transition-colors ${isRTL ? "font-arabic" : "font-display"}`}>
                  {t.title}
                </h3>
                <p className="text-white/30 text-xs mt-0.5 font-body">{t.subtitle}</p>
              </div>
              <ArrowRight className={`w-4 h-4 text-white/20 group-hover:text-yl-gold transition-colors flex-shrink-0 ${isRTL ? "rotate-180" : "ml-auto"}`} />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
