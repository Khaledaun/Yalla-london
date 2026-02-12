
'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useLanguage } from './language-provider'
import { LanguageSwitcher } from './language-switcher'
import { getTranslation } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
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
    { name: t('eventsTickets'), href: '/events' },
    { name: t('about'), href: '/about' },
  ]

  const handleMobileMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const handleMobileLinkClick = () => {
    setIsMobileMenuOpen(false)
  }

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-sand ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="text-2xl font-bold text-london-800 hover:text-london-900 transition-colors font-prestige">
              Yalla London
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-stone hover:text-london-800 font-medium transition-colors"
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Desktop Language Switcher & Mobile Menu Button */}
          <div className="flex items-center gap-4">
            <div className="hidden md:block">
              <LanguageSwitcher />
            </div>
            
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={handleMobileMenuToggle}
              aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6 text-stone" />
              ) : (
                <Menu className="h-6 w-6 text-stone" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-16 left-0 right-0 bg-white/95 backdrop-blur-sm border-b border-sand shadow-lg">
            <nav className="px-6 py-4 space-y-4">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={handleMobileLinkClick}
                  className="block text-stone hover:text-london-800 font-medium transition-colors py-2 border-b border-sand last:border-b-0"
                >
                  {item.name}
                </Link>
              ))}
              <div className="pt-4 border-t border-sand">
                <LanguageSwitcher />
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}
