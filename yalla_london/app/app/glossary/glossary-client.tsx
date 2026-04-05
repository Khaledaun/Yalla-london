'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  ChevronDown,
  Ship,
  FileText,
  Banknote,
  Compass,
  Users,
  Search,
  Anchor,
  MessageCircle,
} from 'lucide-react';
import { useLanguage } from '@/components/language-provider';

// ─── Types ─────────────────────────────────────────────────
type Locale = 'en' | 'ar';

interface GlossaryTerm {
  term: { en: string; ar: string };
  definition: { en: string; ar: string };
}

interface GlossaryCategory {
  title: { en: string; ar: string };
  icon: string;
  terms: GlossaryTerm[];
}

interface Props {
  categories: GlossaryCategory[];
  siteName: string;
  siteId: string;
  isYachtSite: boolean;
  serverLocale: Locale;
  baseUrl: string;
}

// ─── Icon Resolver ─────────────────────────────────────────
function CategoryIcon({ name, size = 20 }: { name: string; size?: number }) {
  const props = { size, className: 'text-[var(--z-gold)]' };
  switch (name) {
    case 'ship':
      return <Ship {...props} />;
    case 'file-text':
      return <FileText {...props} />;
    case 'banknote':
      return <Banknote {...props} />;
    case 'compass':
      return <Compass {...props} />;
    case 'users':
      return <Users {...props} />;
    default:
      return <Anchor {...props} />;
  }
}

// ─── Term Card ─────────────────────────────────────────────
function TermCard({
  term,
  definition,
  isOpen,
  onToggle,
}: {
  term: string;
  definition: string;
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
        isOpen ? 'bg-white/60' : ''
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left group"
        aria-expanded={isOpen}
      >
        <span
          className="font-heading font-semibold text-base"
          style={{ color: 'var(--z-navy)' }}
        >
          {term}
        </span>
        <ChevronDown
          size={18}
          className={`flex-shrink-0 transition-transform duration-300 ${
            isOpen ? 'rotate-180' : ''
          }`}
          style={{ color: 'var(--z-gold)' }}
        />
      </button>

      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: height }}
      >
        <div ref={contentRef} className="px-5 pb-4">
          <p
            className="text-sm leading-relaxed"
            style={{ color: 'var(--z-midnight, #334155)' }}
          >
            {definition}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────
export function GlossaryClientPage({
  categories,
  siteName,
  siteId,
  isYachtSite,
  serverLocale,
  baseUrl,
}: Props) {
  const { language } = useLanguage();
  const lang: Locale = serverLocale || language || 'en';
  const isRtl = lang === 'ar';

  const [search, setSearch] = useState('');
  const [openTerms, setOpenTerms] = useState<Set<string>>(new Set());
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const toggleTerm = (key: string) => {
    setOpenTerms((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Filter terms by search
  const filteredCategories = categories
    .map((cat) => ({
      ...cat,
      terms: cat.terms.filter((t) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          t.term.en.toLowerCase().includes(q) ||
          t.term.ar.includes(search) ||
          t.definition.en.toLowerCase().includes(q) ||
          t.definition.ar.includes(search)
        );
      }),
    }))
    .filter((cat) => cat.terms.length > 0);

  const totalTerms = categories.reduce((sum, c) => sum + c.terms.length, 0);

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="min-h-screen" style={{ background: 'var(--z-sand, #FAF8F4)' }}>
      {/* Hero */}
      <section
        className="relative py-20 px-4"
        style={{
          background: 'linear-gradient(135deg, var(--z-navy) 0%, var(--z-midnight, #1e293b) 100%)',
        }}
      >
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Anchor size={24} style={{ color: 'var(--z-gold)' }} />
            <span
              className="text-xs font-heading font-semibold uppercase tracking-[0.2em]"
              style={{ color: 'var(--z-gold)' }}
            >
              {isRtl ? 'مسرد المصطلحات' : 'Glossary'}
            </span>
          </div>
          <h1
            className="text-3xl md:text-4xl font-display font-bold mb-4"
            style={{ color: 'var(--z-champagne, #f5f0e8)' }}
          >
            {isRtl ? 'مسرد مصطلحات تأجير اليخوت' : 'Yacht Charter Glossary'}
          </h1>
          <p
            className="text-base md:text-lg max-w-2xl mx-auto mb-8"
            style={{ color: 'rgba(255,255,255,0.7)' }}
          >
            {isRtl
              ? `${totalTerms} مصطلحاً أساسياً تحتاج معرفتها قبل حجز رحلتك البحرية في المتوسط`
              : `${totalTerms} essential terms to know before booking your Mediterranean yacht charter`}
          </p>

          {/* Search */}
          <div className="relative max-w-md mx-auto">
            <Search
              size={18}
              className="absolute top-1/2 -translate-y-1/2 text-white/40"
              style={{ [isRtl ? 'right' : 'left']: '14px' }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isRtl ? 'ابحث عن مصطلح...' : 'Search terms...'}
              className="w-full rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm px-4 py-3 text-sm text-white placeholder-white/40 focus:outline-none focus:border-[var(--z-gold)] transition-colors"
              style={{ [isRtl ? 'paddingRight' : 'paddingLeft']: '42px' }}
            />
          </div>
        </div>
      </section>

      {/* Category Pills */}
      <div className="max-w-4xl mx-auto px-4 -mt-5">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button
            type="button"
            onClick={() => setActiveCategory(null)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-heading font-semibold transition-all ${
              activeCategory === null
                ? 'text-white shadow-md'
                : 'bg-white text-[var(--z-navy)] border border-[var(--z-champagne)] hover:border-[var(--z-gold)]'
            }`}
            style={activeCategory === null ? { background: 'var(--z-navy)' } : {}}
          >
            {isRtl ? 'الكل' : 'All'}
          </button>
          {categories.map((cat) => (
            <button
              type="button"
              key={cat.title.en}
              onClick={() =>
                setActiveCategory(activeCategory === cat.title.en ? null : cat.title.en)
              }
              className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-heading font-semibold transition-all ${
                activeCategory === cat.title.en
                  ? 'text-white shadow-md'
                  : 'bg-white text-[var(--z-navy)] border border-[var(--z-champagne)] hover:border-[var(--z-gold)]'
              }`}
              style={activeCategory === cat.title.en ? { background: 'var(--z-navy)' } : {}}
            >
              {cat.title[lang]}
            </button>
          ))}
        </div>
      </div>

      {/* Term Sections */}
      <main className="max-w-4xl mx-auto px-4 py-10 space-y-8">
        {filteredCategories
          .filter((cat) => !activeCategory || cat.title.en === activeCategory)
          .map((cat) => (
            <section key={cat.title.en}>
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ background: 'var(--z-navy)' }}
                >
                  <CategoryIcon name={cat.icon} size={18} />
                </div>
                <h2
                  className="text-xl font-display font-bold"
                  style={{ color: 'var(--z-navy)' }}
                >
                  {cat.title[lang]}
                </h2>
                <span
                  className="text-xs font-heading px-2 py-0.5 rounded-full"
                  style={{
                    background: 'var(--z-champagne)',
                    color: 'var(--z-navy)',
                  }}
                >
                  {cat.terms.length}
                </span>
              </div>

              <div
                className="rounded-xl overflow-hidden border"
                style={{
                  background: 'white',
                  borderColor: 'var(--z-champagne)',
                }}
              >
                {cat.terms.map((t, i) => {
                  const key = `${cat.title.en}-${i}`;
                  return (
                    <TermCard
                      key={key}
                      term={t.term[lang]}
                      definition={t.definition[lang]}
                      isOpen={openTerms.has(key) === true}
                      onToggle={() => toggleTerm(key)}
                    />
                  );
                })}
              </div>
            </section>
          ))}

        {filteredCategories.length === 0 && (
          <div className="text-center py-16">
            <Search size={40} className="mx-auto mb-4" style={{ color: 'var(--z-gold)', opacity: 0.5 }} />
            <p className="text-lg font-heading" style={{ color: 'var(--z-navy)' }}>
              {isRtl ? 'لم يتم العثور على مصطلحات' : 'No terms found'}
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--z-midnight, #64748b)' }}>
              {isRtl ? 'جرب كلمة بحث مختلفة' : 'Try a different search term'}
            </p>
          </div>
        )}
      </main>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-4 pb-16">
        <div
          className="rounded-2xl p-8 text-center"
          style={{
            background: 'linear-gradient(135deg, var(--z-navy) 0%, var(--z-aegean, #2563eb) 100%)',
          }}
        >
          <MessageCircle size={28} className="mx-auto mb-3" style={{ color: 'var(--z-gold)' }} />
          <h3
            className="text-xl font-display font-bold mb-2"
            style={{ color: 'var(--z-champagne, #f5f0e8)' }}
          >
            {isRtl ? 'هل لديك أسئلة حول التأجير؟' : 'Have questions about chartering?'}
          </h3>
          <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.7)' }}>
            {isRtl
              ? 'متخصصو التأجير لدينا يتحدثون العربية والإنجليزية ومستعدون لمساعدتك'
              : 'Our charter specialists speak Arabic and English and are ready to help'}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/inquiry"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-heading font-semibold transition-all hover:scale-105"
              style={{
                background: 'var(--z-gold)',
                color: 'var(--z-navy)',
              }}
            >
              {isRtl ? 'أرسل استفساراً' : 'Send an Inquiry'}
            </Link>
            <Link
              href="/faq"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-heading font-semibold border transition-all hover:bg-white/10"
              style={{
                borderColor: 'rgba(255,255,255,0.3)',
                color: 'white',
              }}
            >
              {isRtl ? 'الأسئلة الشائعة' : 'View FAQ'}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
