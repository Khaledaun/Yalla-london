
'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBrandConfig, useNavigationTranslations } from '@/hooks/use-brand-config';
import { useLanguage } from '@/components/language-provider';

export function DynamicHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { language, setLanguage, isRTL } = useLanguage();
  const { translations, colors } = useBrandConfig();
  const { navigation } = useNavigationTranslations();

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ar' : 'en');
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
              style={{ backgroundColor: colors.primary }}
            >
              {translations.siteName.charAt(0)}
            </div>
            <span 
              className="text-xl font-bold"
              style={{ color: colors.primary }}
            >
              {translations.siteName}
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className="text-gray-700 hover:text-gray-900 font-medium transition-colors duration-200"
                style={{
                  '--hover-color': colors.primary
                } as React.CSSProperties}
                onMouseEnter={(e) => {
                  (e.target as HTMLElement).style.color = colors.primary;
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.color = '';
                }}
              >
                {language === 'en' ? item.labelEn : item.labelAr}
              </Link>
            ))}
          </nav>

          {/* Language Toggle & Mobile Menu */}
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleLanguage}
              className="hidden sm:flex items-center space-x-2"
            >
              <Globe className="h-4 w-4" />
              <span>{language === 'en' ? 'العربية' : 'English'}</span>
            </Button>

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {language === 'en' ? item.labelEn : item.labelAr}
                </Link>
              ))}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  toggleLanguage();
                  setIsMenuOpen(false);
                }}
                className="flex items-center space-x-2 w-full justify-start px-3 py-2"
              >
                <Globe className="h-4 w-4" />
                <span>{language === 'en' ? 'العربية' : 'English'}</span>
              </Button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
