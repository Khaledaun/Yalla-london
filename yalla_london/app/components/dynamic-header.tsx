
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { Menu, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBrandConfig, useNavigationTranslations } from '@/hooks/use-brand-config';
import { useLanguage } from '@/components/language-provider';

export function DynamicHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { language, setLanguage, isRTL } = useLanguage();
  const { translations, colors } = useBrandConfig();
  const { navigation } = useNavigationTranslations();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ar' : 'en');
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-white/98 backdrop-blur-md shadow-luxury border-b border-sand/30'
          : 'bg-white/95 backdrop-blur-sm'
      }`}
    >
      {/* V2 Tri-color bar — 3px, full-width */}
      <div className="flex h-[3px] w-full">
        <div className="flex-1 bg-london-600" />
        <div className="flex-1 bg-yalla-gold-500" />
        <div className="flex-1 bg-thames-500" />
      </div>

      <div className="max-w-7xl mx-auto px-5 sm:px-7">
        <div className="flex justify-between items-center py-3.5">
          {/* Logo — v2 brand kit wordmark, 3x size (270px) */}
          <Link href="/" className="flex items-center group">
            <Image
              src="/branding/yalla-london/brand-kit/01-logos-svg/yalla-wordmark-dark.svg"
              alt="Yalla London"
              width={600}
              height={108}
              className="h-auto w-[270px] transition-opacity group-hover:opacity-80"
              priority
            />
          </Link>

          {/* Desktop Navigation — Sans 13px/500, 0.75px tracking, uppercase */}
          <nav className="hidden lg:flex items-center gap-1">
            {navigation.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className={`relative px-3.5 py-2 font-sans text-[13px] font-medium uppercase text-stone-600 transition-all duration-200 hover:text-charcoal group whitespace-nowrap ${
                  isRTL ? 'font-arabic tracking-normal text-[14px] normal-case' : 'tracking-[0.75px]'
                }`}
              >
                <span className="relative z-10">
                  {language === 'en' ? item.labelEn : item.labelAr}
                </span>
                {/* Hover underline — gold accent */}
                <span className="absolute bottom-1 left-3 right-3 h-0.5 bg-yalla-gold-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
              </Link>
            ))}
          </nav>

          {/* Language Toggle & CTA */}
          <div className="flex items-center gap-3">
            {/* Language Toggle — visible on all screen sizes */}
            <button
              onClick={toggleLanguage}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded transition-all duration-200 hover:bg-cream-100 ${
                language === 'en'
                  ? 'font-arabic text-[13px] font-medium text-stone-600 hover:text-charcoal'
                  : 'font-sans text-[12px] font-medium tracking-[0.75px] uppercase text-stone-600 hover:text-charcoal'
              }`}
            >
              {language === 'en' ? 'عربي' : 'EN'}
            </button>

            {/* CTA Button — London Red bg, Cream text, sans 12px/600 */}
            <Link
              href="/contact"
              className={`hidden lg:flex items-center px-4 py-2 bg-london-600 text-cream rounded font-sans text-[12px] font-semibold uppercase transition-all duration-200 hover:bg-london-700 ${
                isRTL ? 'font-arabic tracking-normal text-[13px] normal-case' : 'tracking-[1px]'
              }`}
            >
              {language === 'en' ? 'Get in Touch' : 'تواصل معنا'}
            </Link>

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden p-2 hover:bg-cream-100 rounded"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? (
                <X className="h-5 w-5 text-charcoal" />
              ) : (
                <Menu className="h-5 w-5 text-charcoal" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation — Anybody 18px/600 per v2 spec */}
        <div
          className={`lg:hidden overflow-hidden transition-all duration-300 ease-in-out ${
            isMenuOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="py-4 space-y-1 border-t border-sand/40">
            {navigation.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className={`flex items-center justify-between px-4 py-3 font-display text-lg font-semibold text-charcoal hover:text-london-600 hover:bg-cream-100 rounded transition-all ${
                  isRTL ? 'flex-row-reverse font-arabic' : ''
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                <span>{language === 'en' ? item.labelEn : item.labelAr}</span>
                <ChevronDown className={`h-4 w-4 text-stone ${isRTL ? 'rotate-90' : '-rotate-90'}`} />
              </Link>
            ))}

            {/* Mobile Language Toggle */}
            <button
              onClick={() => {
                toggleLanguage();
                setIsMenuOpen(false);
              }}
              className={`flex items-center gap-3 w-full px-4 py-3 font-display text-lg font-semibold text-charcoal hover:text-london-600 hover:bg-cream-100 rounded transition-all ${
                isRTL ? 'flex-row-reverse' : ''
              }`}
            >
              <span className={language === 'en' ? 'font-arabic' : 'font-mono text-sm tracking-[1.5px] uppercase'}>
                {language === 'en' ? 'العربية' : 'English'}
              </span>
            </button>

            {/* Mobile CTA — full-width Primary button */}
            <div className="pt-3 px-4">
              <Link
                href="/contact"
                className={`flex items-center justify-center w-full px-5 py-3 bg-london-600 text-cream rounded font-sans text-[12px] font-semibold uppercase transition-all duration-200 hover:bg-london-700 ${
                  isRTL ? 'font-arabic tracking-normal text-sm normal-case' : 'tracking-[1px]'
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                {language === 'en' ? 'Get in Touch' : 'تواصل معنا'}
              </Link>
            </div>

            {/* Arabic wordmark + tri-bar below mobile nav per v2 spec */}
            <div className="pt-4 px-4 flex flex-col items-center gap-3">
              <Image
                src="/branding/yalla-london/brand-kit/01-logos-svg/yalla-arabic-dark.svg"
                alt="يلّا لندن"
                width={120}
                height={30}
                className="h-auto w-[80px] opacity-40"
              />
              <div className="flex h-[3px] w-full rounded-full overflow-hidden">
                <div className="flex-1 bg-london-600" />
                <div className="flex-1 bg-yalla-gold-500" />
                <div className="flex-1 bg-thames-500" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
