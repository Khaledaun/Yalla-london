"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Clock, ArrowRight, BookOpen, Sparkles } from "lucide-react";
import { BrandTag, BrandCardLight, BrandCard, BrandButton } from "@/components/brand-kit";
import { TEXT } from "./editorial-data";

interface Article {
  id: string;
  slug: string;
  category: string;
  title: string;
  excerpt: string;
  image: string;
  date: string;
  readTime: string;
  author?: string;
}

interface Props {
  locale: "en" | "ar";
  featured: Article;
  articles: Article[];
}

/* ── Section Header (editorial style) ── */
function SectionHead({ title, href, linkText, icon: Icon, isRTL }: {
  title: string; href: string; linkText: string; icon?: React.ElementType; isRTL?: boolean;
}) {
  return (
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-[2px] bg-yl-gold" />
        {Icon && <Icon className="w-5 h-5 text-yl-gold" />}
        <h2 className={`text-2xl md:text-3xl font-bold text-yl-charcoal ${isRTL ? "font-arabic" : "font-display"}`}>
          {title}
        </h2>
      </div>
      <Link href={href} className="group flex items-center gap-1.5 font-mono text-xs font-semibold tracking-wider uppercase text-yl-red hover:text-yl-gold transition-colors">
        {linkText}
        <ArrowRight className={`w-4 h-4 group-hover:translate-x-0.5 transition-transform ${isRTL ? "rotate-180" : ""}`} />
      </Link>
    </div>
  );
}

export { SectionHead };

/* ── Featured + Articles Grid (magazine editorial layout) ── */
export function EditorialArticles({ locale, featured, articles }: Props) {
  const t = TEXT[locale];
  const isRTL = locale === "ar";

  return (
    <section className="relative bg-yl-cream">
      {/* Watermark */}
      <div
        className="absolute -right-20 top-10 w-[250px] h-[250px] opacity-[0.03] rotate-[8deg] pointer-events-none bg-contain bg-no-repeat bg-center"
        style={{ backgroundImage: "url('/branding/yalla-london/brand-kit-v2/yalla-brand-kit/logos/yalla-watermark-500px.png')" }}
        aria-hidden="true"
      />
      <div className="relative z-10 max-w-7xl mx-auto px-5 py-14">
        <SectionHead title={t.latestStories} href="/blog" linkText={t.viewAll} icon={BookOpen} isRTL={isRTL} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Featured — large card */}
          <Link href={`/blog/${featured.slug}`} className="lg:col-span-7 group">
            <article className="relative h-full min-h-[360px] rounded-2xl overflow-hidden">
              <Image src={featured.image} alt={featured.title} fill className="object-cover group-hover:scale-[1.03] transition-transform duration-500" sizes="(max-width: 1024px) 100vw, 58vw" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                <BrandTag color="red" className="mb-3">{featured.category}</BrandTag>
                <h3 className={`text-xl md:text-2xl font-bold text-white mb-2 group-hover:text-yl-gold transition-colors leading-snug ${isRTL ? "font-arabic" : "font-display"}`}>
                  {featured.title}
                </h3>
                <p className="text-white/50 text-sm line-clamp-2 max-w-lg font-body">{featured.excerpt}</p>
                <div className="flex items-center gap-3 mt-3 font-mono text-[10px] tracking-wider uppercase text-white/40">
                  {featured.author && <span>{featured.author}</span>}
                  <span className="w-1 h-1 bg-white/30 rounded-full" />
                  <span>{featured.date}</span>
                  <span className="w-1 h-1 bg-white/30 rounded-full" />
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{featured.readTime}</span>
                </div>
              </div>
            </article>
          </Link>

          {/* Sidebar — article list + newsletter */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            {articles.map((a) => (
              <Link key={a.id} href={`/blog/${a.slug}`} className="group">
                <BrandCardLight hoverable className="p-0">
                  <article className="flex gap-3 p-3">
                    <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                      <Image src={a.image} alt={a.title} fill className="object-cover" sizes="80px" />
                    </div>
                    <div className="flex flex-col justify-center min-w-0">
                      <span className="font-mono text-[10px] font-semibold text-yl-red uppercase tracking-wider">{a.category}</span>
                      <h4 className={`text-sm font-bold text-yl-charcoal mt-0.5 line-clamp-2 group-hover:text-yl-red transition-colors leading-snug ${isRTL ? "font-arabic" : "font-display"}`}>
                        {a.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-1 font-mono text-[10px] text-yl-gray-400 tracking-wider">
                        <span>{a.date}</span>
                        <Clock className="w-3 h-3" />
                        <span>{a.readTime}</span>
                      </div>
                    </div>
                  </article>
                </BrandCardLight>
              </Link>
            ))}

            {/* Newsletter compact */}
            <BrandCard hoverable={false} className="p-5 flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-yl-gold" />
                <h3 className={`text-sm font-bold text-white ${isRTL ? "font-arabic" : "font-display"}`}>{t.newsletter}</h3>
              </div>
              <p className="text-xs text-white/40 mb-3 font-body line-clamp-2">{t.newsletterDesc}</p>
              <form className="flex gap-2" onSubmit={(e) => e.preventDefault()}>
                <input
                  type="email"
                  placeholder={t.emailPlaceholder}
                  className="flex-1 min-w-0 px-3 py-2 text-sm rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-yl-gold transition-colors font-body"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-yl-red text-white font-mono text-[10px] font-bold tracking-wider uppercase rounded-lg hover:bg-[#a82924] transition-colors whitespace-nowrap"
                >
                  {t.subscribeBtn}
                </button>
              </form>
            </BrandCard>
          </div>
        </div>
      </div>
    </section>
  );
}
