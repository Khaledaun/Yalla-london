'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { Menu, X, ChevronDown, Globe, Compass } from 'lucide-react';
import { useLanguage } from '@/components/language-provider';

/* ════════════════════════════════════════════════════════════════════
   NAV CONFIG — matches the URL structure in the user specification.
   Primary: Home, Destinations, Fleet, How It Works, Journal, About, Contact
   CTA: "Plan Your Charter" → /contact
   ════════════════════════════════════════════════════════════════════ */

interface NavLink {
  label: { en: string; ar: string };
  href: string;
  children?: { label: { en: string; ar: string }; href: string }[];
}

const NAV_LINKS: NavLink[] = [
  {
    label: { en: 'Destinations', ar: 'الوجهات' },
    href: '/destinations',
    children: [
      { label: { en: 'Greek Islands', ar: 'الجزر اليونانية' }, href: '/destinations/greek-islands' },
      { label: { en: 'Croatian Coast', ar: 'ساحل كرواتيا' }, href: '/destinations/croatian-coast' },
      { label: { en: 'Turkish Riviera', ar: 'الريفيرا التركية' }, href: '/destinations/turkish-riviera' },
      { label: { en: 'French Riviera', ar: 'الريفيرا الفرنسية' }, href: '/destinations/french-riviera' },
      { label: { en: 'Amalfi Coast', ar: 'ساحل أمالفي' }, href: '/destinations/amalfi-coast' },
      { label: { en: 'Dubai & Abu Dhabi', ar: 'دبي وأبوظبي' }, href: '/destinations/arabian-gulf' },
      { label: { en: 'Ibiza & Balearics', ar: 'إيبيزا والبليار' }, href: '/destinations/balearic-islands' },
      { label: { en: 'View All Destinations', ar: 'جميع الوجهات' }, href: '/destinations' },
    ],
  },
  {
    label: { en: 'Fleet', ar: 'الأسطول' },
    href: '/fleet',
  },
  {
    label: { en: 'How It Works', ar: 'كيف يعمل' },
    href: '/how-it-works',
  },
  {
    label: { en: 'Journal', ar: 'المجلة' },
    href: '/journal',
  },
  {
    label: { en: 'About', ar: 'من نحن' },
    href: '/about',
  },
  {
    label: { en: 'Contact', ar: 'تواصل معنا' },
    href: '/contact',
  },
];

/* ════════════════════════════════════════════════════════════════════
   LOGO — Compass rose + wordmark (placeholder SVG)
   ════════════════════════════════════════════════════════════════════ */

function ZenithaLogo({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <svg
        width="34"
        height="34"
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
        aria-hidden="true"
      >
        <circle cx="50" cy="50" r="48" stroke="currentColor" strokeWidth="1.5" opacity="0.25" />
        <path d="M50 8L56 44L50 38L44 44L50 8Z" fill="var(--z-gold, #C9A96E)" />
        <path d="M92 50L56 56L62 50L56 44L92 50Z" fill="currentColor" opacity="0.55" />
        <path d="M50 92L44 56L50 62L56 56L50 92Z" fill="currentColor" opacity="0.55" />
        <path d="M8 50L44 44L38 50L44 56L8 50Z" fill="currentColor" opacity="0.55" />
        <circle cx="50" cy="50" r="4" fill="var(--z-gold, #C9A96E)" />
      </svg>
      <div className="flex flex-col leading-none">
        <span className="font-display text-[20px] font-bold tracking-tight" style={{ letterSpacing: '-0.02em' }}>
          ZENITHA
        </span>
        <span className="text-[10px] font-heading font-semibold tracking-[0.22em] uppercase opacity-55">
          YACHTS
        </span>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   DROPDOWN — Desktop dropdown for nav items with children
   ════════════════════════════════════════════════════════════════════ */

function NavDropdown({
  items,
  language,
  isOpen,
}: {
  items: { label: { en: string; ar: string }; href: string }[];
  language: string;
  isOpen: boolean;
}) {
  if (!isOpen) return null;

  return (
    <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 z-50">
      <div
        className="min-w-[240px] rounded-xl bg-white shadow-lg border border-[var(--z-champagne,#e8e0d0)] py-2"
        style={{ animation: 'fadeIn 150ms ease-out' }}
      >
        {items.map((item, i) => (
          <Link
            key={i}
            href={item.href}
            className="block px-5 py-2.5 text-sm font-body text-[var(--z-navy,#0a1628)] hover:bg-[var(--z-sand,#f5f0e8)] hover:text-[var(--z-sea,#0ea5a2)] transition-colors"
          >
            {item.label[language as 'en' | 'ar'] || item.label.en}
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   HEADER (MAIN EXPORT)
   ════════════════════════════════════════════════════════════════════ */

export function ZenithaHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null);
  const dropdownTimeout = useRef<NodeJS.Timeout | null>(null);
  const { language, setLanguage, isRTL } = useLanguage();

  /* Track scroll for sticky header styling */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* Close on Escape */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveDropdown(null);
        setMobileOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const openDropdown = (idx: number) => {
    if (dropdownTimeout.current) clearTimeout(dropdownTimeout.current);
    setActiveDropdown(idx);
  };
  const closeDropdown = () => {
    dropdownTimeout.current = setTimeout(() => setActiveDropdown(null), 180);
  };
  const t = (obj: { en: string; ar: string }) => obj[language as 'en' | 'ar'] || obj.en;

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/[0.98] backdrop-blur-md shadow-lg'
          : 'bg-white/95 backdrop-blur-sm'
      }`}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Top accent line */}
      <div
        className="h-[2px] w-full"
        style={{ background: 'linear-gradient(to right, var(--z-navy,#0a1628), var(--z-gold,#c9a96e), var(--z-sea,#0ea5a2))' }}
      />

      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className={`flex items-center justify-between transition-all duration-300 ${scrolled ? 'h-16' : 'h-[72px]'}`}>
          {/* ── Logo ── */}
          <Link href="/" className="text-[var(--z-navy,#0a1628)] hover:text-[var(--z-sea,#0ea5a2)] transition-colors">
            <ZenithaLogo />
          </Link>

          {/* ── Desktop Nav ── */}
          <nav className="hidden lg:flex items-center gap-1" aria-label="Main navigation">
            {NAV_LINKS.map((item, idx) => (
              <div
                key={idx}
                className="relative"
                onMouseEnter={() => item.children ? openDropdown(idx) : undefined}
                onMouseLeave={() => item.children ? closeDropdown() : undefined}
              >
                <Link
                  href={item.href}
                  className={`flex items-center gap-1 px-3.5 py-2 text-[14px] font-heading font-medium transition-colors duration-200 ${
                    activeDropdown === idx
                      ? 'text-[var(--z-sea,#0ea5a2)]'
                      : 'text-[var(--z-navy,#0a1628)] hover:text-[var(--z-sea,#0ea5a2)]'
                  }`}
                >
                  {t(item.label)}
                  {item.children && (
                    <ChevronDown
                      size={14}
                      className={`transition-transform duration-200 ${activeDropdown === idx ? 'rotate-180' : ''}`}
                    />
                  )}
                </Link>

                {item.children && (
                  <NavDropdown
                    items={item.children}
                    language={language}
                    isOpen={activeDropdown === idx}
                  />
                )}
              </div>
            ))}
          </nav>

          {/* ── Right side: language + CTA ── */}
          <div className="hidden lg:flex items-center gap-3">
            <button
              onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-heading font-medium text-[var(--z-navy,#0a1628)] hover:text-[var(--z-sea,#0ea5a2)] transition-colors"
              aria-label={language === 'en' ? 'Switch to Arabic' : 'Switch to English'}
            >
              <Globe size={16} />
              {language === 'en' ? 'AR' : 'EN'}
            </button>

            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-[14px] font-heading font-semibold text-white transition-all duration-200 hover:brightness-110"
              style={{ background: 'var(--z-sea, #0ea5a2)' }}
            >
              <Compass size={16} />
              {t({ en: 'Plan Your Charter', ar: 'خطط رحلتك' })}
            </Link>
          </div>

          {/* ── Mobile hamburger ── */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2 text-[var(--z-navy,#0a1628)]"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* ── Mobile Drawer ── */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 top-0 z-50 bg-white overflow-y-auto" style={{ animation: 'fadeIn 200ms ease-out' }}>
          {/* Mobile header */}
          <div className="px-5 py-4 flex items-center justify-between border-b border-[var(--z-champagne,#e8e0d0)]">
            <ZenithaLogo />
            <button onClick={() => setMobileOpen(false)} className="p-2 text-[var(--z-navy,#0a1628)]" aria-label="Close menu">
              <X size={24} />
            </button>
          </div>

          <nav className="px-5 py-6 space-y-1" aria-label="Mobile navigation">
            {/* Home */}
            <Link
              href="/"
              onClick={() => setMobileOpen(false)}
              className="block px-4 py-3 text-base font-heading font-medium text-[var(--z-navy,#0a1628)] hover:bg-[var(--z-sand,#f5f0e8)] rounded-lg"
            >
              {t({ en: 'Home', ar: 'الرئيسية' })}
            </Link>

            {NAV_LINKS.map((item, idx) => (
              <div key={idx}>
                <Link
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="block px-4 py-3 text-base font-heading font-medium text-[var(--z-navy,#0a1628)] hover:bg-[var(--z-sand,#f5f0e8)] rounded-lg"
                >
                  {t(item.label)}
                </Link>
                {item.children && (
                  <div className="ml-4 space-y-0.5 mb-2">
                    {item.children.map((child, ci) => (
                      <Link
                        key={ci}
                        href={child.href}
                        onClick={() => setMobileOpen(false)}
                        className="block px-4 py-2 text-sm text-[var(--z-navy,#0a1628)]/80 hover:text-[var(--z-sea,#0ea5a2)] hover:bg-[var(--z-sand,#f5f0e8)] rounded"
                      >
                        {t(child.label)}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <hr className="my-4 border-[var(--z-champagne,#e8e0d0)]" />

            {/* Language */}
            <button
              onClick={() => { setLanguage(language === 'en' ? 'ar' : 'en'); setMobileOpen(false); }}
              className="flex items-center gap-2 px-4 py-3 text-base font-heading text-[var(--z-navy,#0a1628)] w-full hover:bg-[var(--z-sand,#f5f0e8)] rounded-lg"
            >
              <Globe size={18} />
              {language === 'en' ? 'العربية' : 'English'}
            </button>

            {/* CTA */}
            <div className="px-2 pt-4">
              <Link
                href="/contact"
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center gap-2 w-full text-center text-base font-heading font-semibold text-white rounded-lg py-3.5 transition-all hover:brightness-110"
                style={{ background: 'var(--z-sea, #0ea5a2)' }}
              >
                <Compass size={18} />
                {t({ en: 'Plan Your Charter', ar: 'خطط رحلتك' })}
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
