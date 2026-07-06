
'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { useLanguage } from './language-provider'
import { LanguageSwitcher } from './language-switcher'
import { getTranslation } from '@/lib/i18n'
import { Menu, X } from 'lucide-react'

export function Header() {
  const { language, isRTL } = useLanguage()
  const t = (key: string) => getTranslation(language, key)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const navigation = [
    { name: t('home'), href: '/' },
    { name: t('information'), href: '/information' },
    { name: t('blog'), href: '/blog' },
    { name: t('recommendations'), href: '/recommendations' },
    { name: t('londonByFoot'), href: '/london-by-foot' },
    { name: t('eventsTickets'), href: '/events' },
    { name: t('about'), href: '/about' },
  ]

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Tri-color bar at very top */}
      <div className="flex h-[3px]" aria-hidden="true">
        <span className="flex-1 bg-yl-red" />
        <span className="flex-1 bg-yl-gold" />
        <span className="flex-1 bg-yl-blue" />
      </div>

      {/* Main nav */}
      <div className="bg-white/95 backdrop-blur-md border-b border-yl-gray-200">
        <div className="max-w-7xl mx-auto px-5">
          <div className="flex items-center justify-between h-14">
            {/* Logo — SVG brand mark + wordmark */}
            <Link href="/" className="flex items-center gap-2.5 group" aria-label="Yalla London Home">
              <Image
                src="/branding/yalla-london/brand-kit/01-logos-svg/yalla-primary-light.svg"
                alt="Yalla London"
                width={36}
                height={36}
                className="transition-transform duration-300 group-hover:scale-105"
                priority
              />
              <span className="hidden sm:flex items-baseline gap-1 font-display text-lg font-bold tracking-tight">
                <span className="text-yl-charcoal">Yalla</span>
                <span className="text-yl-red">London</span>
              </span>
            </Link>

            {/* Desktop Navigation — editorial style */}
            <nav className="hidden lg:flex items-center gap-1" aria-label="Main navigation">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="px-3 py-1.5 text-[13px] font-body text-yl-gray-600 hover:text-yl-red rounded-lg hover:bg-yl-red/[0.04] transition-colors duration-200"
                >
                  {item.name}
                </Link>
              ))}
            </nav>

            {/* Right side: Language + Mobile menu */}
            <div className="flex items-center gap-2">
              <div className="hidden md:block">
                <LanguageSwitcher />
              </div>
              <button
                className="lg:hidden p-2 rounded-lg text-yl-gray-500 hover:text-yl-charcoal hover:bg-yl-cream transition-colors"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={isMobileMenuOpen}
              >
                {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation — slide down */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-white/98 backdrop-blur-md border-b border-yl-gray-200 shadow-lg">
          <nav className="max-w-7xl mx-auto px-5 py-3" aria-label="Mobile navigation">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="block py-2.5 text-sm font-body text-yl-gray-600 hover:text-yl-red border-b border-yl-gray-100 last:border-b-0 transition-colors"
              >
                {item.name}
              </Link>
            ))}
            <div className="pt-3 mt-1 border-t border-yl-gray-200">
              <LanguageSwitcher />
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
