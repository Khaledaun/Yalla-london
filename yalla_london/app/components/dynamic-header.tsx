
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { Menu, X, Globe, ChevronDown } from 'lucide-react';
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
          ? 'bg-white/98 backdrop-blur-md shadow-luxury border-b border-yalla-gold-300/20'
          : 'bg-white/95 backdrop-blur-sm'
      }`}
    >
      {/* Decorative gold line at top */}
      <div className="h-1 w-full bg-gradient-to-r from-transparent via-yalla-gold-400 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-18 py-3">
          {/* Logo */}
          <Link href="/" className="flex items-center group">
            <Image
              src="/images/yalla-london-logo.svg"
              alt="Yalla London"
              width={200}
              height={36}
              className="h-9 w-auto transition-opacity group-hover:opacity-80"
              priority
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navigation.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className="relative px-4 py-2 text-charcoal font-medium transition-all duration-300 hover:text-london-800 group"
              >
                <span className="relative z-10">
                  {language === 'en' ? item.labelEn : item.labelAr}
                </span>
                {/* Hover underline effect */}
                <span className="absolute bottom-1 left-4 right-4 h-0.5 bg-gradient-to-r from-yalla-gold-400 to-yalla-gold-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
              </Link>
            ))}
          </nav>

          {/* Language Toggle & CTA */}
          <div className="flex items-center gap-3">
            {/* Language Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleLanguage}
              className="hidden sm:flex items-center gap-2 text-charcoal hover:text-london-800 hover:bg-cream-100 rounded-lg transition-all"
            >
              <Globe className="h-4 w-4 text-yalla-gold-500" />
              <span className="font-medium">{language === 'en' ? 'العربية' : 'English'}</span>
            </Button>

            {/* CTA Button - Desktop */}
            <Link
              href="/contact"
              className="hidden md:flex items-center gap-2 px-5 py-2.5 bg-london-800 text-white rounded-lg font-medium shadow-luxury hover:bg-london-900 hover:shadow-elegant transition-all duration-300 hover:-translate-y-0.5"
            >
              <span>{language === 'en' ? 'Get in Touch' : 'تواصل معنا'}</span>
            </Link>

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden p-2 hover:bg-cream-100 rounded-lg"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? (
                <X className="h-6 w-6 text-london-800" />
              ) : (
                <Menu className="h-6 w-6 text-london-800" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div
          className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
            isMenuOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="py-4 space-y-1 border-t border-yalla-gold-200/30">
            {navigation.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className="flex items-center justify-between px-4 py-3 text-charcoal hover:text-london-800 hover:bg-cream-100 rounded-lg font-medium transition-all"
                onClick={() => setIsMenuOpen(false)}
              >
                <span>{language === 'en' ? item.labelEn : item.labelAr}</span>
                <ChevronDown className={`h-4 w-4 text-yalla-gold-500 ${isRTL ? 'rotate-90' : '-rotate-90'}`} />
              </Link>
            ))}

            {/* Mobile Language Toggle */}
            <button
              onClick={() => {
                toggleLanguage();
                setIsMenuOpen(false);
              }}
              className="flex items-center gap-3 w-full px-4 py-3 text-charcoal hover:text-london-800 hover:bg-cream-100 rounded-lg font-medium transition-all"
            >
              <Globe className="h-5 w-5 text-yalla-gold-500" />
              <span>{language === 'en' ? 'العربية' : 'English'}</span>
            </button>

            {/* Mobile CTA */}
            <div className="pt-3 px-4">
              <Link
                href="/contact"
                className="flex items-center justify-center gap-2 w-full px-5 py-3 bg-london-800 text-white rounded-lg font-medium shadow-luxury hover:bg-london-900 transition-all"
                onClick={() => setIsMenuOpen(false)}
              >
                <span>{language === 'en' ? 'Get in Touch' : 'تواصل معنا'}</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
