
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { useBrandConfig, useNavigationTranslations } from '@/hooks/use-brand-config';
import { useLanguage } from '@/components/language-provider';
import { TriBar } from '@/components/brand-kit';

export function DynamicHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { language, setLanguage, isRTL } = useLanguage();
  const { translations, colors, logos } = useBrandConfig();
  const { navigation } = useNavigationTranslations();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ar' : 'en');
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      {/* V2 Tri-color bar — fixed at z-101 */}
      <TriBar className="relative z-[101]" />

      <div
        className={`transition-all duration-300 ease-yl ${
          isScrolled
            ? 'bg-yl-dark-navy/95 backdrop-blur-xl shadow-lg'
            : 'bg-yl-dark-navy/95 backdrop-blur-xl'
        }`}
      >
        <div className="max-w-7xl mx-auto px-5 sm:px-7">
          <div className="flex justify-between items-center py-3.5">
            {/* Logo — stamp + "YALLA LONDON" wordmark */}
            <Link href="/" className="flex items-center gap-2.5 group">
              <Image
                src="/branding/yalla-london/brand-kit-v2/yalla-brand-kit/logos/yalla-stamp-100px.png"
                alt="Yalla London"
                width={36}
                height={36}
                className="rounded-full"
                priority
              />
              <span className="font-heading font-bold text-xl tracking-wider">
                <span className="text-yl-parchment">YALLA</span>
                <span className="text-yl-red ml-1">LONDON</span>
              </span>
            </Link>

            {/* Desktop Navigation — mono 10px, 1.5px tracking, uppercase */}
            <nav className="hidden lg:flex items-center gap-1">
              {navigation.map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`relative px-3.5 py-2 font-mono text-[10px] font-medium uppercase text-yl-gray-400 transition-all duration-300 ease-yl hover:text-yl-parchment group whitespace-nowrap ${
                    isRTL ? 'font-arabic tracking-normal text-[13px] normal-case' : 'tracking-[1.5px]'
                  }`}
                >
                  <span className="relative z-10">
                    {language === 'en' ? item.labelEn : item.labelAr}
                  </span>
                  {/* Hover underline — gold accent, width 0→100% */}
                  <span className="absolute bottom-1 left-3 right-3 h-0.5 bg-yl-gold scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-yl origin-left" />
                </Link>
              ))}
            </nav>

            {/* Language Toggle & CTA */}
            <div className="flex items-center gap-3">
              {/* Language Toggle */}
              <button
                onClick={toggleLanguage}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded transition-all duration-300 ease-yl hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yl-gold ${
                  language === 'en'
                    ? 'font-arabic text-[13px] font-medium text-yl-gray-400 hover:text-yl-parchment'
                    : 'font-mono text-[10px] font-medium tracking-[1.5px] uppercase text-yl-gray-400 hover:text-yl-parchment'
                }`}
              >
                {language === 'en' ? 'عربي' : 'EN'}
              </button>

              {/* CTA Button — Red bg, white text, mono */}
              <Link
                href="/contact"
                className={`hidden lg:flex items-center px-4 py-2 bg-yl-red text-white rounded-lg font-mono text-[11px] font-semibold uppercase transition-all duration-300 ease-yl hover:bg-[#a82924] hover:-translate-y-0.5 shadow-lg ${
                  isRTL ? 'font-arabic tracking-normal text-[13px] normal-case' : 'tracking-wider'
                }`}
              >
                {language === 'en' ? 'Get in Touch' : 'تواصل معنا'}
              </Link>

              {/* Mobile menu button — select dropdown per v2 spec */}
              <button
                className="lg:hidden p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-yl-parchment hover:text-white transition-colors"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
              >
                {isMenuOpen ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          <div
            className={`lg:hidden overflow-hidden transition-all duration-300 ease-yl ${
              isMenuOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="py-4 space-y-1 border-t border-white/10">
              {navigation.map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`flex items-center justify-between px-4 py-3 font-heading text-lg font-semibold text-yl-parchment hover:text-yl-gold rounded transition-all duration-300 ease-yl ${
                    isRTL ? 'flex-row-reverse font-arabic' : ''
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <span>{language === 'en' ? item.labelEn : item.labelAr}</span>
                  <ChevronDown className={`h-4 w-4 text-yl-gray-500 ${isRTL ? 'rotate-90' : '-rotate-90'}`} />
                </Link>
              ))}

              {/* Mobile Language Toggle */}
              <button
                onClick={() => {
                  toggleLanguage();
                  setIsMenuOpen(false);
                }}
                className={`flex items-center gap-3 w-full px-4 py-3 font-heading text-lg font-semibold text-yl-parchment hover:text-yl-gold rounded transition-all duration-300 ease-yl ${
                  isRTL ? 'flex-row-reverse' : ''
                }`}
              >
                <span className={language === 'en' ? 'font-arabic' : 'font-mono text-sm tracking-[1.5px] uppercase'}>
                  {language === 'en' ? 'العربية' : 'English'}
                </span>
              </button>

              {/* Mobile CTA */}
              <div className="pt-3 px-4">
                <Link
                  href="/contact"
                  className={`flex items-center justify-center w-full px-5 py-3 bg-yl-red text-white rounded-lg font-mono text-[11px] font-semibold uppercase transition-all duration-300 ease-yl hover:bg-[#a82924] ${
                    isRTL ? 'font-arabic tracking-normal text-sm normal-case' : 'tracking-wider'
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {language === 'en' ? 'Get in Touch' : 'تواصل معنا'}
                </Link>
              </div>

              {/* Arabic wordmark + tri-bar below mobile nav */}
              <div className="pt-4 px-4 flex flex-col items-center gap-3">
                <span className="font-arabic text-yl-gray-500 text-sm opacity-40">يلّا لندن</span>
                <TriBar className="rounded-full overflow-hidden" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
