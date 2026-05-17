"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Star, MapPin, Clock, Compass, Map, Train, Utensils, Users, Gem, BookOpen, Download, Ticket, ArrowRight } from "lucide-react";
import { TriBar, BrandTag, BrandButton, BrandCardLight, WatermarkStamp } from "@/components/brand-kit";
import { SectionHead } from "./editorial-articles";
import { EXPERIENCES, HOTELS, GUIDES, INFO_SECTIONS, TESTIMONIALS, TEXT } from "./editorial-data";
import { getPageAffiliateLink } from "@/lib/affiliate/page-affiliate-links";

const ICON_MAP: Record<string, React.ElementType> = { Compass, Map, Train, Utensils, Users, Gem };

interface Props { locale: "en" | "ar" }
interface EventItem { id: string; title: string; day: string; month: string; venue: string; price: string; image: string; url?: string }

/* ── Events Section ── */
export function EventsSection({ locale, events }: Props & { events: EventItem[] }) {
  const t = TEXT[locale];
  const isRTL = locale === "ar";
  const isLive = events.length > 0 && events[0].url;
  return (
    <section className="relative bg-white py-14 overflow-hidden">
      <WatermarkStamp />
      <div className="relative z-10 max-w-7xl mx-auto px-5">
        <SectionHead title={t.upcomingEvents} href="/events" linkText={t.viewAll} icon={Ticket} isRTL={isRTL} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {events.slice(0, 6).map((ev) => (
            <div key={ev.id} className="group bg-yl-cream rounded-2xl overflow-hidden border border-yl-gray-200 hover:-translate-y-1 hover:border-yl-gold/30 hover:shadow-lg transition-all duration-300">
              <div className="relative h-40">
                <Image src={ev.image} alt={ev.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" unoptimized={ev.image.includes("ticketm")} sizes="(max-width: 640px) 100vw, 33vw" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <div className={`absolute top-3 ${isRTL ? "right-3" : "left-3"} bg-white rounded-xl px-2.5 py-1.5 text-center shadow-md`}>
                  <div className="text-xl font-display font-bold text-yl-charcoal leading-none">{ev.day}</div>
                  <div className="font-mono text-[9px] font-bold text-yl-red uppercase tracking-wider">{ev.month}</div>
                </div>
                {isLive && (
                  <div className={`absolute top-3 ${isRTL ? "left-3" : "right-3"}`}>
                    <span className="bg-green-500 text-white text-[9px] font-mono font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Live</span>
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className={`text-sm font-bold text-yl-charcoal mb-1 group-hover:text-yl-red transition-colors line-clamp-1 ${isRTL ? "font-arabic" : "font-display"}`}>{ev.title}</h3>
                <p className="text-xs text-yl-gray-500 flex items-center gap-1 mb-2 font-body"><MapPin className="w-3 h-3" />{ev.venue}</p>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-yl-charcoal">{ev.price}</span>
                  {ev.url ? (
                    <a href={ev.url} target="_blank" rel="noopener sponsored" className="text-[10px] font-mono font-bold text-yl-red uppercase tracking-wider hover:text-yl-gold transition-colors">{t.getTickets} &rarr;</a>
                  ) : (
                    <Link href="/events" className="text-[10px] font-mono font-bold text-yl-red uppercase tracking-wider hover:text-yl-gold transition-colors">{t.getTickets} &rarr;</Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Experiences Section ── */
export function ExperiencesSection({ locale }: Props) {
  const t = TEXT[locale];
  const isRTL = locale === "ar";
  const exps = EXPERIENCES[locale];
  return (
    <section className="bg-white py-14">
      <div className="max-w-7xl mx-auto px-5">
        <SectionHead title={t.topExperiences} href="/experiences" linkText={t.viewAll} icon={Star} isRTL={isRTL} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {exps.map((exp) => {
            const affLink = getPageAffiliateLink(exp.title, "experience", "yalla-london", "homepage");
            return (
              <div key={exp.id}>
                <Link href="/experiences" className="group">
                  <div className="relative aspect-[3/4] rounded-2xl overflow-hidden mb-2 hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
                    <Image src={exp.image} alt={exp.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="(max-width: 768px) 50vw, 25vw" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3">
                      <h3 className={`text-sm font-bold text-white group-hover:text-yl-gold transition-colors ${isRTL ? "font-arabic" : "font-display"}`}>{exp.title}</h3>
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-1">
                    <span className="font-mono text-xs font-bold text-yl-charcoal">{exp.price}</span>
                    <span className="font-mono text-[10px] font-semibold text-yl-red uppercase tracking-wider">{t.bookNow}</span>
                  </div>
                </Link>
                {affLink && (
                  <a href={affLink.url} target="_blank" rel="noopener sponsored" className={`${affLink.trackingClass} mt-1.5 block text-center py-1.5 bg-yl-red text-white font-mono text-[10px] font-bold tracking-wider uppercase rounded-lg hover:bg-[#a82924] transition-colors`} data-affiliate-partner={affLink.partner}>{affLink.label}</a>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ── Hotels Section ── */
export function HotelsSection({ locale }: Props) {
  const t = TEXT[locale];
  const isRTL = locale === "ar";
  const htls = HOTELS[locale];
  return (
    <section className="bg-yl-cream py-14 relative overflow-hidden">
      <WatermarkStamp />
      <div className="relative z-10 max-w-7xl mx-auto px-5">
        <SectionHead title={t.luxuryHotels} href="/hotels" linkText={t.viewAll} isRTL={isRTL} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {htls.map((h) => {
            const affLink = getPageAffiliateLink(h.name, "hotel", "yalla-london", "homepage");
            return (
              <div key={h.id} className="group">
                <Link href="/hotels">
                  <BrandCardLight className="overflow-hidden">
                    <div className="relative h-48">
                      <Image src={h.image} alt={h.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="(max-width: 768px) 100vw, 33vw" />
                      {h.badge && <span className={`absolute top-3 ${isRTL ? "right-3" : "left-3"}`}><BrandTag color="blue">{h.badge}</BrandTag></span>}
                    </div>
                    <div className="p-4">
                      <div className="flex gap-0.5 text-yl-gold mb-1">{[...Array(h.stars)].map((_, s) => <Star key={s} className="w-3 h-3 fill-current" />)}</div>
                      <h3 className={`text-base font-bold text-yl-charcoal group-hover:text-yl-red transition-colors ${isRTL ? "font-arabic" : "font-display"}`}>{h.name}</h3>
                      <p className="text-xs text-yl-gray-500 flex items-center gap-1 mt-0.5 font-body"><MapPin className="w-3 h-3" />{h.location}</p>
                      <p className="font-mono text-[10px] text-yl-gold tracking-wider uppercase mt-1">{h.category}</p>
                      <div className="flex items-center justify-between pt-3 mt-3 border-t border-yl-gray-200">
                        <span className="font-mono text-sm font-bold text-yl-charcoal">{h.price}</span>
                        <span className="text-[10px] font-mono font-semibold text-yl-red uppercase tracking-wider group-hover:underline">{t.viewDeals}</span>
                      </div>
                    </div>
                  </BrandCardLight>
                </Link>
                {affLink && (
                  <a href={affLink.url} target="_blank" rel="noopener sponsored" className={`${affLink.trackingClass} mt-2 block text-center py-2 bg-yl-red text-white font-mono text-[10px] font-bold tracking-wider uppercase rounded-xl hover:bg-[#a82924] transition-colors`} data-affiliate-partner={affLink.partner}>{affLink.label} &rarr;</a>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ── Information Hub Section ── */
export function InfoHubSection({ locale }: Props) {
  const t = TEXT[locale];
  const isRTL = locale === "ar";
  const sections = INFO_SECTIONS[locale];
  return (
    <section className="bg-yl-cream py-14">
      <div className="max-w-7xl mx-auto px-5">
        <SectionHead title={t.informationHub} href="/information" linkText={t.viewAll} icon={BookOpen} isRTL={isRTL} />
        <p className="text-sm text-yl-gray-500 -mt-5 mb-7 font-body">{t.informationHubSub}</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {sections.map((s, i) => {
            const IconComp = ICON_MAP[s.icon] || BookOpen;
            return (
              <Link key={i} href="/information" className="group">
                <BrandCardLight className="p-4 text-center h-full flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-yl-red/10 flex items-center justify-center group-hover:bg-yl-red transition-colors">
                    <IconComp className="w-5 h-5 text-yl-red group-hover:text-white transition-colors" />
                  </div>
                  <h3 className={`text-xs font-bold text-yl-charcoal group-hover:text-yl-red transition-colors ${isRTL ? "font-arabic" : "font-display"}`}>{s.title}</h3>
                  <p className="text-[10px] text-yl-gray-500 leading-relaxed font-body">{s.desc}</p>
                </BrandCardLight>
              </Link>
            );
          })}
        </div>
        <div className="text-center mt-7">
          <BrandButton variant="primary" size="md" href="/information">
            <BookOpen className="w-4 h-4 mr-2" />{t.exploreHub}<ArrowRight className={`w-4 h-4 ${isRTL ? "rotate-180 mr-2" : "ml-2"}`} />
          </BrandButton>
        </div>
      </div>
    </section>
  );
}

/* ── Testimonials Section ── */
export function TestimonialsSection({ locale }: Props) {
  const t = TEXT[locale];
  const isRTL = locale === "ar";
  return (
    <section className="bg-yl-cream py-14">
      <div className="max-w-7xl mx-auto px-5">
        <div className="text-center mb-8">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-yl-gold">{t.testimonials}</span>
          <h2 className={`text-2xl md:text-3xl font-bold text-yl-charcoal mt-2 ${isRTL ? "font-arabic" : "font-display"}`}>{t.testimonialsTitle}</h2>
          <p className="text-sm text-yl-gray-500 mt-2 max-w-md mx-auto font-body">{t.testimonialsSub}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {TESTIMONIALS.map((item, i) => (
            <BrandCardLight key={i} hoverable={false} className="p-5 relative">
              {/* Large quotation mark */}
              <span className="absolute top-3 right-4 text-4xl text-yl-gold/20 font-display leading-none" aria-hidden="true">&ldquo;</span>
              <div className="flex gap-0.5 mb-3">{[...Array(5)].map((_, s) => <Star key={s} className="w-3.5 h-3.5 text-yl-gold fill-yl-gold" />)}</div>
              <p className={`text-sm text-yl-charcoal leading-relaxed mb-4 italic ${isRTL ? "font-arabic" : "font-body"}`}>
                &ldquo;{item[locale].text}&rdquo;
              </p>
              <div className="flex items-center gap-3 pt-3 border-t border-yl-gray-200">
                <div className="w-8 h-8 rounded-full bg-yl-red text-white flex items-center justify-center font-mono text-[10px] font-bold">{item.initials}</div>
                <div>
                  <p className="text-xs font-display font-bold text-yl-charcoal">{item.name}</p>
                  <p className="font-mono text-[10px] text-yl-gray-400 tracking-wider">{item[locale].location}</p>
                </div>
              </div>
            </BrandCardLight>
          ))}
        </div>
      </div>
    </section>
  );
}
