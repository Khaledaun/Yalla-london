'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  ChevronDown,
  Calendar,
  Ship,
  Compass,
  Info,
  Search,
  Anchor,
  MessageCircle,
} from 'lucide-react';
import { useLanguage } from '@/components/language-provider';

// ─── Types ──────────────────────────────────────────────────
type Locale = 'en' | 'ar';

interface FAQItem {
  question: { en: string; ar: string };
  answer: { en: string; ar: string };
}

interface FAQSection {
  title: { en: string; ar: string };
  icon: string;
  items: FAQItem[];
}

interface Props {
  sections: FAQSection[];
  siteName: string;
  siteId: string;
  isYachtSite: boolean;
  serverLocale: Locale;
  baseUrl: string;
}

// ─── Icon Resolver ──────────────────────────────────────────
function SectionIcon({ name, size = 20 }: { name: string; size?: number }) {
  const props = { size, className: 'text-[var(--z-gold)]' };
  switch (name) {
    case 'calendar':
      return <Calendar {...props} />;
    case 'ship':
      return <Ship {...props} />;
    case 'compass':
      return <Compass {...props} />;
    case 'info':
      return <Info {...props} />;
    default:
      return <Anchor {...props} />;
  }
}

// ─── Accordion Item ─────────────────────────────────────────
function AccordionItem({
  question,
  answer,
  isOpen,
  onToggle,
}: {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (contentRef.current) {
      setHeight(isOpen ? contentRef.current.scrollHeight : 0);
    }
  }, [isOpen]);

  return (
    <div
      className={`border-b border-[var(--z-champagne)] last:border-b-0 transition-colors ${
        isOpen ? 'bg-[var(--z-pearl)]' : ''
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-start justify-between gap-4 py-5 px-5 sm:px-6 text-left group"
        aria-expanded={isOpen}
      >
        <span
          className={`font-heading text-sm sm:text-base font-semibold transition-colors ${
            isOpen ? 'text-[var(--z-navy)]' : 'text-[var(--z-aegean)] group-hover:text-[var(--z-navy)]'
          }`}
        >
          {question}
        </span>
        <ChevronDown
          size={18}
          className={`flex-shrink-0 mt-0.5 text-[var(--z-gold)] transition-transform duration-300 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>
      <div
        style={{ height: `${height}px` }}
        className="overflow-hidden transition-[height] duration-300 ease-[var(--z-ease-gentle)]"
      >
        <div ref={contentRef} className="px-5 sm:px-6 pb-5">
          <p className="font-body text-sm sm:text-base leading-relaxed text-[var(--z-muted)]">
            {answer}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Main FAQ Client Page ───────────────────────────────────
export function FAQClientPage({
  sections,
  siteName,
  siteId,
  isYachtSite,
  serverLocale,
  baseUrl,
}: Props) {
  const { language } = useLanguage();
  const locale = (language || serverLocale) as Locale;
  const t = (obj: { en: string; ar: string }) => obj[locale] || obj.en;
  const isRTL = locale === 'ar';

  // Track which items are open: `${sectionIdx}-${itemIdx}`
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState<number | null>(null);

  const toggleItem = (key: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Filter FAQ items by search query
  const filteredSections = sections
    .map((section, sIdx) => {
      if (!searchQuery.trim()) return { section, sIdx, items: section.items.map((item, iIdx) => ({ item, iIdx })) };
      const q = searchQuery.toLowerCase();
      const matchingItems = section.items
        .map((item, iIdx) => ({ item, iIdx }))
        .filter(
          ({ item }) =>
            item.question.en.toLowerCase().includes(q) ||
            item.question.ar.includes(q) ||
            item.answer.en.toLowerCase().includes(q) ||
            item.answer.ar.includes(q)
        );
      return { section, sIdx, items: matchingItems };
    })
    .filter(({ items }) => items.length > 0);

  const totalQuestions = sections.reduce((acc, s) => acc + s.items.length, 0);

  return (
    <div className="min-h-screen bg-[var(--z-pearl)]" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* ─── Hero Header ─── */}
      <div className="relative bg-[var(--z-gradient-hero)] text-white overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute -top-20 -right-20 w-80 h-80 border border-white/20 rounded-full" />
          <div className="absolute bottom-0 left-1/4 w-60 h-60 border border-white/10 rounded-full" />
        </div>
        <div className="z-container relative py-12 sm:py-16 text-center">
          <div className="z-text-overline text-[var(--z-gold)] mb-3">
            {isYachtSite
              ? t({ en: 'Yacht Charter FAQ', ar: 'الأسئلة الشائعة عن تأجير اليخوت' })
              : t({ en: 'Help Centre', ar: 'مركز المساعدة' })}
          </div>
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            {t({ en: 'Frequently Asked Questions', ar: 'الأسئلة الشائعة' })}
          </h1>
          <p className="font-body text-[var(--z-champagne)] max-w-2xl mx-auto text-base sm:text-lg mb-8">
            {isYachtSite
              ? t({
                  en: 'Everything you need to know about booking a yacht charter, what to expect on board, Mediterranean destinations, and practical sailing information.',
                  ar: 'كل ما تحتاج معرفته عن حجز تأجير اليخوت وما يمكن توقعه على متن اليخت ووجهات البحر المتوسط ومعلومات الإبحار العملية.',
                })
              : t({
                  en: `Find answers to common questions about ${siteName} and our services.`,
                  ar: `اعثر على إجابات للأسئلة الشائعة حول ${siteName} وخدماتنا.`,
                })}
          </p>

          {/* Search Bar */}
          <div className="max-w-lg mx-auto relative">
            <Search
              size={18}
              className={`absolute top-1/2 -translate-y-1/2 text-[var(--z-champagne)]/60 ${
                isRTL ? 'right-4' : 'left-4'
              }`}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t({ en: 'Search questions...', ar: 'ابحث عن سؤال...' })}
              className={`w-full py-3.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-white font-body text-sm placeholder:text-white/40 focus:outline-none focus:border-[var(--z-gold)] focus:bg-white/15 transition-colors ${
                isRTL ? 'pr-12 pl-4' : 'pl-12 pr-4'
              }`}
            />
          </div>

          {/* Quick stats */}
          <div className="flex justify-center gap-6 sm:gap-10 mt-6 text-xs sm:text-sm font-heading text-[var(--z-champagne)]">
            <span>
              {totalQuestions} {t({ en: 'answers', ar: 'إجابة' })}
            </span>
            <span className="text-[var(--z-gold)]">|</span>
            <span>
              {sections.length} {t({ en: 'categories', ar: 'فئات' })}
            </span>
          </div>
        </div>
        <div className="h-[2px] bg-[var(--z-bar-gradient)]" />
      </div>

      {/* ─── Section Navigation (for yacht site) ─── */}
      {isYachtSite && !searchQuery && (
        <div className="bg-white border-b border-[var(--z-champagne)] sticky top-0 z-10">
          <div className="z-container">
            <div className="flex gap-1 overflow-x-auto py-3 z-scrollbar-hidden">
              <button
                type="button"
                onClick={() => setActiveSection(null)}
                className={`flex-shrink-0 px-4 py-2 rounded-lg text-xs sm:text-sm font-heading font-semibold transition-colors ${
                  activeSection === null
                    ? 'bg-[var(--z-navy)] text-white'
                    : 'text-[var(--z-aegean)] hover:bg-[var(--z-sand)]'
                }`}
              >
                {t({ en: 'All', ar: 'الكل' })}
              </button>
              {sections.map((section, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveSection(idx)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs sm:text-sm font-heading font-semibold transition-colors ${
                    activeSection === idx
                      ? 'bg-[var(--z-navy)] text-white'
                      : 'text-[var(--z-aegean)] hover:bg-[var(--z-sand)]'
                  }`}
                >
                  <SectionIcon name={section.icon} size={14} />
                  {t(section.title)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── FAQ Content ─── */}
      <div className="z-container py-10 sm:py-14">
        <div className="max-w-[840px] mx-auto space-y-10">
          {filteredSections.length === 0 ? (
            <div className="text-center py-16">
              <Search size={48} className="text-[var(--z-champagne)] mx-auto mb-4" />
              <h3 className="font-heading text-lg font-semibold text-[var(--z-navy)] mb-2">
                {t({ en: 'No results found', ar: 'لم يتم العثور على نتائج' })}
              </h3>
              <p className="font-body text-sm text-[var(--z-muted)]">
                {t({
                  en: 'Try a different search term or browse all categories.',
                  ar: 'جرب مصطلح بحث مختلف أو تصفح جميع الفئات.',
                })}
              </p>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="z-btn z-btn-secondary mt-4"
              >
                {t({ en: 'Clear Search', ar: 'مسح البحث' })}
              </button>
            </div>
          ) : (
            filteredSections
              .filter(({ sIdx }) => activeSection === null || sIdx === activeSection || searchQuery)
              .map(({ section, sIdx, items }) => (
                <div key={sIdx} id={`section-${sIdx}`}>
                  {/* Section Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-[var(--z-sand)] flex items-center justify-center">
                      <SectionIcon name={section.icon} />
                    </div>
                    <div>
                      <h2 className="font-heading text-lg sm:text-xl font-bold text-[var(--z-navy)]">
                        {t(section.title)}
                      </h2>
                      <p className="text-xs font-body text-[var(--z-muted)]">
                        {items.length}{' '}
                        {items.length === 1
                          ? t({ en: 'question', ar: 'سؤال' })
                          : t({ en: 'questions', ar: 'أسئلة' })}
                      </p>
                    </div>
                  </div>

                  {/* Accordion */}
                  <div className="bg-white rounded-xl border border-[var(--z-champagne)] shadow-[var(--z-shadow-card)] overflow-hidden">
                    {items.map(({ item, iIdx }) => {
                      const key = `${sIdx}-${iIdx}`;
                      return (
                        <AccordionItem
                          key={key}
                          question={t(item.question)}
                          answer={t(item.answer)}
                          isOpen={openItems.has(key)}
                          onToggle={() => toggleItem(key)}
                        />
                      );
                    })}
                  </div>
                </div>
              ))
          )}
        </div>

        {/* ─── CTA Section ─── */}
        {isYachtSite && (
          <div className="max-w-[840px] mx-auto mt-14">
            <div className="bg-[var(--z-gradient-card)] rounded-xl p-8 sm:p-10 text-center">
              <h3 className="font-display text-2xl sm:text-3xl font-bold text-white mb-3">
                {t({ en: "Can't find your answer?", ar: 'لم تجد إجابتك؟' })}
              </h3>
              <p className="font-body text-[var(--z-champagne)] max-w-md mx-auto mb-6">
                {t({
                  en: 'Our charter specialists are here to help. Reach out and we will respond within 24 hours.',
                  ar: 'متخصصو التأجير لدينا هنا للمساعدة. تواصل معنا وسنرد خلال 24 ساعة.',
                })}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link href="/inquiry" className="z-btn z-btn-primary z-btn-lg flex items-center gap-2">
                  <Anchor size={18} />
                  {t({ en: 'Submit an Inquiry', ar: 'أرسل استفسارك' })}
                </Link>
                <a
                  href="https://wa.me/447000000000?text=Hi%20Zenitha%20Yachts%2C%20I%20have%20a%20question"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="z-btn z-btn-ghost text-white hover:text-[var(--z-gold)] flex items-center gap-2"
                >
                  <MessageCircle size={18} />
                  {t({ en: 'Chat on WhatsApp', ar: 'تحدث عبر واتساب' })}
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
