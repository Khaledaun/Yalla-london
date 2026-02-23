'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { Menu, X, ChevronDown, Globe, Phone, Anchor, Compass, Ship, Waves, ShieldCheck, Users, MapPin, HelpCircle, MessageCircle } from 'lucide-react';
import { useLanguage } from '@/components/language-provider';

// ─── Navigation Config ──────────────────────────────────────────
const NAV_ITEMS = [
  {
    label: { en: 'Yachts', ar: 'اليخوت' },
    href: '/yachts',
    megaMenu: {
      sections: [
        {
          title: { en: 'By Type', ar: 'حسب النوع' },
          items: [
            { label: { en: 'Sailing Yachts', ar: 'يخوت شراعية' }, href: '/yachts?type=SAILBOAT', icon: Anchor },
            { label: { en: 'Catamarans', ar: 'كاتاماران' }, href: '/yachts?type=CATAMARAN', icon: Ship },
            { label: { en: 'Motor Yachts', ar: 'يخوت بمحرك' }, href: '/yachts?type=MOTOR_YACHT', icon: Waves },
            { label: { en: 'Gulets', ar: 'قوارب تركية' }, href: '/yachts?type=GULET', icon: Compass },
            { label: { en: 'Superyachts', ar: 'يخوت فاخرة' }, href: '/yachts?type=SUPERYACHT', icon: Ship },
          ],
        },
        {
          title: { en: 'By Feature', ar: 'حسب الميزة' },
          items: [
            { label: { en: 'Halal Catering', ar: 'طعام حلال' }, href: '/yachts?halal=true', icon: ShieldCheck },
            { label: { en: 'Family Friendly', ar: 'مناسب للعائلات' }, href: '/yachts?family=true', icon: Users },
            { label: { en: 'With Crew', ar: 'مع طاقم' }, href: '/yachts?crew=true', icon: Users },
            { label: { en: 'Water Sports', ar: 'رياضات مائية' }, href: '/yachts?watersports=true', icon: Waves },
          ],
        },
        {
          title: { en: 'Popular', ar: 'الأكثر شعبية' },
          items: [
            { label: { en: 'Most Viewed', ar: 'الأكثر مشاهدة' }, href: '/yachts?sort=popular', icon: Ship },
            { label: { en: 'New Arrivals', ar: 'وصل حديثاً' }, href: '/yachts?sort=newest', icon: Ship },
            { label: { en: 'Special Offers', ar: 'عروض خاصة' }, href: '/yachts?featured=true', icon: Ship },
          ],
        },
      ],
    },
  },
  {
    label: { en: 'Destinations', ar: 'الوجهات' },
    href: '/destinations',
    megaMenu: {
      sections: [
        {
          title: { en: 'Mediterranean', ar: 'البحر المتوسط' },
          items: [
            { label: { en: 'Greek Islands', ar: 'الجزر اليونانية' }, href: '/destinations/greek-islands' },
            { label: { en: 'Croatian Coast', ar: 'ساحل كرواتيا' }, href: '/destinations/croatian-coast' },
            { label: { en: 'Turkish Riviera', ar: 'الريفيرا التركية' }, href: '/destinations/turkish-riviera' },
            { label: { en: 'French Riviera', ar: 'الريفيرا الفرنسية' }, href: '/destinations/french-riviera' },
            { label: { en: 'Amalfi Coast', ar: 'ساحل أمالفي' }, href: '/destinations/italian-amalfi' },
            { label: { en: 'Balearic Islands', ar: 'جزر البليار' }, href: '/destinations/balearic-islands' },
          ],
        },
        {
          title: { en: 'Arabian & Red Sea', ar: 'الخليج والبحر الأحمر' },
          items: [
            { label: { en: 'Arabian Gulf', ar: 'الخليج العربي' }, href: '/destinations/arabian-gulf' },
            { label: { en: 'Red Sea', ar: 'البحر الأحمر' }, href: '/destinations/red-sea' },
          ],
        },
        {
          title: { en: 'Planning', ar: 'التخطيط' },
          items: [
            { label: { en: 'AI Trip Planner', ar: 'مخطط الرحلات' }, href: '/charter-planner', icon: Compass },
            { label: { en: 'Sample Itineraries', ar: 'مسارات نموذجية' }, href: '/itineraries', icon: MapPin },
            { label: { en: 'How It Works', ar: 'كيف يعمل' }, href: '/how-it-works', icon: HelpCircle },
          ],
        },
      ],
    },
  },
  { label: { en: 'Itineraries', ar: 'المسارات' }, href: '/itineraries' },
  { label: { en: 'Charter Planner', ar: 'مخطط الرحلات' }, href: '/charter-planner' },
  { label: { en: 'Blog', ar: 'المدونة' }, href: '/blog' },
];

// ─── Logo Component ──────────────────────────────────────────
function ZenithaLogo({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Compass Rose Icon */}
      <svg width="36" height="36" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
        <circle cx="50" cy="50" r="48" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
        <path d="M50 8L56 44L50 38L44 44L50 8Z" fill="var(--z-gold, #C9A96E)" />
        <path d="M92 50L56 56L62 50L56 44L92 50Z" fill="currentColor" opacity="0.6" />
        <path d="M50 92L44 56L50 62L56 56L50 92Z" fill="currentColor" opacity="0.6" />
        <path d="M8 50L44 44L38 50L44 56L8 50Z" fill="currentColor" opacity="0.6" />
        <circle cx="50" cy="50" r="4" fill="var(--z-gold, #C9A96E)" />
      </svg>
      {/* Wordmark */}
      <div className="flex flex-col leading-none">
        <span className="font-display text-[22px] font-bold tracking-tight" style={{ letterSpacing: '-0.02em' }}>
          ZENITHA
        </span>
        <span className="text-[10px] font-heading font-semibold tracking-[0.2em] uppercase opacity-60">
          YACHTS
        </span>
      </div>
    </div>
  );
}

// ─── Mega Menu Component ─────────────────────────────────────
function MegaMenu({ sections, isOpen, language }: {
  sections: typeof NAV_ITEMS[0]['megaMenu']['sections'];
  isOpen: boolean;
  language: string;
}) {
  if (!isOpen) return null;

  return (
    <div className="absolute top-full left-0 w-full bg-white shadow-elevated border-t border-[var(--z-champagne)] z-50 animate-fadeIn">
      <div className="max-w-[1280px] mx-auto px-6 py-8">
        <div className="grid grid-cols-3 gap-8">
          {sections.map((section, i) => (
            <div key={i}>
              <h3 className="text-xs font-heading font-semibold uppercase tracking-[0.12em] text-[var(--z-gold-dark)] mb-4">
                {section.title[language as 'en' | 'ar'] || section.title.en}
              </h3>
              <ul className="space-y-2">
                {section.items.map((item, j) => (
                  <li key={j}>
                    <Link
                      href={item.href}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm font-body text-[var(--z-navy)] hover:bg-[var(--z-sand)] hover:text-[var(--z-aegean)] transition-colors duration-200"
                    >
                      {'icon' in item && item.icon && <item.icon size={16} className="opacity-50" />}
                      {item.label[language as 'en' | 'ar'] || item.label.en}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Header ─────────────────────────────────────────────
export function ZenithaHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeMegaMenu, setActiveMegaMenu] = useState<number | null>(null);
  const megaMenuTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { language, setLanguage, isRTL } = useLanguage();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mega menu on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveMegaMenu(null);
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const handleMegaMenuEnter = (index: number) => {
    if (megaMenuTimeoutRef.current) clearTimeout(megaMenuTimeoutRef.current);
    setActiveMegaMenu(index);
  };

  const handleMegaMenuLeave = () => {
    megaMenuTimeoutRef.current = setTimeout(() => setActiveMegaMenu(null), 200);
  };

  const toggleLanguage = () => setLanguage(language === 'en' ? 'ar' : 'en');

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-white/98 backdrop-blur-md shadow-elevated'
          : 'bg-white/95 backdrop-blur-sm'
      }`}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Gold accent line */}
      <div className="h-[2px] w-full bg-gradient-to-r from-[var(--z-navy)] via-[var(--z-gold)] to-[var(--z-aegean)]" />

      <div className="max-w-[1280px] mx-auto px-6">
        <div className={`flex justify-between items-center transition-all duration-300 ${isScrolled ? 'py-3' : 'py-4'}`}>
          {/* Logo */}
          <Link href="/" className="flex items-center group text-[var(--z-navy)] hover:text-[var(--z-aegean)] transition-colors">
            <ZenithaLogo />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1" role="navigation" aria-label="Main navigation">
            {NAV_ITEMS.map((item, index) => (
              <div
                key={index}
                className="relative"
                onMouseEnter={() => item.megaMenu ? handleMegaMenuEnter(index) : undefined}
                onMouseLeave={() => item.megaMenu ? handleMegaMenuLeave() : undefined}
              >
                <Link
                  href={item.href}
                  className={`flex items-center gap-1 px-3 py-2 text-sm font-heading font-medium text-[var(--z-navy)] hover:text-[var(--z-aegean)] transition-colors duration-200 ${
                    activeMegaMenu === index ? 'text-[var(--z-aegean)]' : ''
                  }`}
                >
                  {item.label[language as 'en' | 'ar'] || item.label.en}
                  {item.megaMenu && <ChevronDown size={14} className={`transition-transform duration-200 ${activeMegaMenu === index ? 'rotate-180' : ''}`} />}
                </Link>
              </div>
            ))}
          </nav>

          {/* Right Actions */}
          <div className="hidden lg:flex items-center gap-3">
            {/* Language Toggle */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-heading font-medium text-[var(--z-navy)] hover:text-[var(--z-aegean)] transition-colors"
              aria-label={language === 'en' ? 'Switch to Arabic' : 'Switch to English'}
            >
              <Globe size={16} />
              {language === 'en' ? 'AR' : 'EN'}
            </button>

            {/* CTA Button */}
            <Link
              href="/inquiry"
              className="z-btn-primary text-sm px-5 py-2.5"
            >
              {language === 'ar' ? 'استفسر الآن' : 'Inquire Now'}
              <span className="ml-1.5" aria-hidden="true">&rarr;</span>
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="lg:hidden p-2 text-[var(--z-navy)]"
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMenuOpen}
            aria-haspopup="menu"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Desktop Mega Menus */}
      {NAV_ITEMS.map((item, index) => (
        item.megaMenu && (
          <div
            key={index}
            onMouseEnter={() => handleMegaMenuEnter(index)}
            onMouseLeave={handleMegaMenuLeave}
          >
            <MegaMenu
              sections={item.megaMenu.sections}
              isOpen={activeMegaMenu === index}
              language={language}
            />
          </div>
        )
      ))}

      {/* Mobile Drawer */}
      {isMenuOpen && (
        <div className="lg:hidden fixed inset-0 top-0 z-50 bg-white overflow-y-auto animate-fadeIn">
          <div className="px-6 py-4 flex justify-between items-center border-b border-[var(--z-champagne)]">
            <ZenithaLogo />
            <button onClick={() => setIsMenuOpen(false)} className="p-2 text-[var(--z-navy)]" aria-label="Close menu">
              <X size={24} />
            </button>
          </div>

          <nav className="px-6 py-6 space-y-1" role="navigation" aria-label="Mobile navigation">
            <Link href="/" onClick={() => setIsMenuOpen(false)} className="block px-3 py-3 text-base font-heading font-medium text-[var(--z-navy)] hover:bg-[var(--z-sand)] rounded-lg">
              {language === 'ar' ? 'الرئيسية' : 'Home'}
            </Link>
            {NAV_ITEMS.map((item, index) => (
              <div key={index}>
                <Link
                  href={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className="block px-3 py-3 text-base font-heading font-medium text-[var(--z-navy)] hover:bg-[var(--z-sand)] rounded-lg"
                >
                  {item.label[language as 'en' | 'ar'] || item.label.en}
                </Link>
                {item.megaMenu && (
                  <div className="pl-6 space-y-0.5">
                    {item.megaMenu.sections.map((section, si) => (
                      <div key={si} className="py-2">
                        <div className="text-xs font-heading font-semibold uppercase tracking-[0.12em] text-[var(--z-gold-dark)] px-3 mb-1">
                          {section.title[language as 'en' | 'ar'] || section.title.en}
                        </div>
                        {section.items.map((subItem, sj) => (
                          <Link
                            key={sj}
                            href={subItem.href}
                            onClick={() => setIsMenuOpen(false)}
                            className="block px-3 py-2 text-sm text-[var(--z-midnight)] hover:text-[var(--z-aegean)] hover:bg-[var(--z-sand)] rounded"
                          >
                            {subItem.label[language as 'en' | 'ar'] || subItem.label.en}
                          </Link>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <hr className="my-4 border-[var(--z-champagne)]" />

            {/* Mobile extras */}
            <Link href="/about" onClick={() => setIsMenuOpen(false)} className="block px-3 py-3 text-base font-heading text-[var(--z-navy)] hover:bg-[var(--z-sand)] rounded-lg">
              {language === 'ar' ? 'عن زينيثا' : 'About'}
            </Link>
            <Link href="/faq" onClick={() => setIsMenuOpen(false)} className="block px-3 py-3 text-base font-heading text-[var(--z-navy)] hover:bg-[var(--z-sand)] rounded-lg">
              {language === 'ar' ? 'الأسئلة الشائعة' : 'FAQ'}
            </Link>
            <Link href="/contact" onClick={() => setIsMenuOpen(false)} className="block px-3 py-3 text-base font-heading text-[var(--z-navy)] hover:bg-[var(--z-sand)] rounded-lg">
              {language === 'ar' ? 'تواصل معنا' : 'Contact'}
            </Link>

            <hr className="my-4 border-[var(--z-champagne)]" />

            {/* Language toggle */}
            <button
              onClick={() => { toggleLanguage(); setIsMenuOpen(false); }}
              className="flex items-center gap-2 px-3 py-3 text-base font-heading text-[var(--z-navy)] w-full hover:bg-[var(--z-sand)] rounded-lg"
            >
              <Globe size={18} />
              {language === 'en' ? 'العربية' : 'English'}
            </button>

            {/* Contact options — CTA links to inquiry page since phone numbers pending */}
            <div className="flex items-center gap-3 px-3 py-3">
              <Link href="/contact" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-1.5 text-sm text-[var(--z-aegean)]">
                <Phone size={16} /> {language === 'ar' ? 'اتصل بنا' : 'Contact Us'}
              </Link>
              <Link href="/inquiry" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-1.5 text-sm text-[var(--z-aegean)]">
                <MessageCircle size={16} /> {language === 'ar' ? 'استفسار' : 'Enquire'}
              </Link>
            </div>

            {/* CTA */}
            <div className="px-3 pt-4">
              <Link
                href="/inquiry"
                onClick={() => setIsMenuOpen(false)}
                className="z-btn-primary w-full text-center block text-base py-3.5"
              >
                {language === 'ar' ? 'استفسر الآن' : 'Inquire Now'} &rarr;
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
