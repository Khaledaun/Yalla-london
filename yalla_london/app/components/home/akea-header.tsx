'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Menu, X, Search, Facebook, Instagram, Twitter, Youtube } from 'lucide-react'

interface AkeaHeaderProps {
  locale?: 'en' | 'ar'
}

const navigation = {
  en: [
    { name: 'Home', href: '/' },
    { name: 'Explore', href: '/blog', children: [
      { name: 'Food & Dining', href: '/blog?category=food' },
      { name: 'Travel', href: '/blog?category=travel' },
      { name: 'Events', href: '/events' },
      { name: 'Shopping', href: '/blog?category=shopping' },
      { name: 'Lifestyle', href: '/blog?category=lifestyle' },
    ]},
    { name: 'Blog', href: '/blog' },
    { name: 'About', href: '/about' },
    { name: 'Contact', href: '/contact' },
  ],
  ar: [
    { name: 'الرئيسية', href: '/ar' },
    { name: 'استكشف', href: '/ar/blog', children: [
      { name: 'طعام و مطاعم', href: '/ar/blog?category=food' },
      { name: 'سفر', href: '/ar/blog?category=travel' },
      { name: 'فعاليات', href: '/ar/events' },
      { name: 'تسوق', href: '/ar/blog?category=shopping' },
      { name: 'نمط الحياة', href: '/ar/blog?category=lifestyle' },
    ]},
    { name: 'المدونة', href: '/ar/blog' },
    { name: 'من نحن', href: '/ar/about' },
    { name: 'اتصل بنا', href: '/ar/contact' },
  ]
}

export function AkeaHeader({ locale = 'en' }: AkeaHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const isRTL = locale === 'ar'
  const nav = navigation[locale]

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      window.location.href = `/${locale === 'ar' ? 'ar/' : ''}blog?search=${encodeURIComponent(searchQuery)}`
    }
  }

  return (
    <>
      {/* Search Overlay */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900 flex items-center justify-center">
          <button
            onClick={() => setSearchOpen(false)}
            className="absolute top-6 right-6 p-2 text-gray-500 hover:text-gray-900 dark:hover:text-white"
          >
            <X size={28} />
          </button>
          <form onSubmit={handleSearch} className="w-full max-w-2xl px-6">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={locale === 'ar' ? 'ابحث في يلا لندن...' : 'Search Yalla London...'}
              className="w-full text-3xl md:text-4xl font-light border-b-2 border-gray-300 dark:border-gray-600 bg-transparent py-4 focus:outline-none focus:border-orange-500 text-gray-900 dark:text-white placeholder-gray-400"
              autoFocus
              dir={isRTL ? 'rtl' : 'ltr'}
            />
            <p className="mt-4 text-gray-500 text-sm">
              {locale === 'ar' ? 'اضغط Enter للبحث' : 'Press Enter to search'}
            </p>
          </form>
        </div>
      )}

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900" dir={isRTL ? 'rtl' : 'ltr'}>
          <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
            <Link href={locale === 'ar' ? '/ar' : '/'} className="flex items-center">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                Yalla<span className="text-orange-500">.</span>
              </span>
            </Link>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 text-gray-500 hover:text-gray-900 dark:hover:text-white"
            >
              <X size={24} />
            </button>
          </div>
          <nav className="p-6 space-y-4">
            {nav.map((item) => (
              <div key={item.name}>
                <Link
                  href={item.href}
                  className="block text-2xl font-medium text-gray-900 dark:text-white hover:text-orange-500 py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
                {item.children && (
                  <div className={`${isRTL ? 'pr-4' : 'pl-4'} mt-2 space-y-2`}>
                    {item.children.map((child) => (
                      <Link
                        key={child.name}
                        href={child.href}
                        className="block text-lg text-gray-600 dark:text-gray-400 hover:text-orange-500 py-1"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {child.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
          <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-center space-x-4">
              <a href="https://facebook.com/yallalondon" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-orange-500">
                <Facebook size={20} />
              </a>
              <a href="https://instagram.com/yallalondon" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-orange-500">
                <Instagram size={20} />
              </a>
              <a href="https://twitter.com/yallalondon" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-orange-500">
                <Twitter size={20} />
              </a>
              <a href="https://youtube.com/yallalondon" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-orange-500">
                <Youtube size={20} />
              </a>
            </div>
            <div className="mt-4 flex justify-center">
              <Link
                href={locale === 'ar' ? '/' : '/ar'}
                className="text-sm text-gray-500 hover:text-orange-500"
              >
                {locale === 'ar' ? 'English' : 'العربية'}
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
          scrolled
            ? 'bg-white dark:bg-gray-900 shadow-sm py-3'
            : 'bg-transparent py-6'
        }`}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            {/* Social Icons - Left */}
            <div className="hidden lg:flex items-center space-x-3">
              <a href="https://facebook.com/yallalondon" target="_blank" rel="noopener noreferrer" className={`${scrolled ? 'text-gray-500' : 'text-gray-600'} hover:text-orange-500 transition-colors`}>
                <Facebook size={18} />
              </a>
              <a href="https://instagram.com/yallalondon" target="_blank" rel="noopener noreferrer" className={`${scrolled ? 'text-gray-500' : 'text-gray-600'} hover:text-orange-500 transition-colors`}>
                <Instagram size={18} />
              </a>
              <a href="https://twitter.com/yallalondon" target="_blank" rel="noopener noreferrer" className={`${scrolled ? 'text-gray-500' : 'text-gray-600'} hover:text-orange-500 transition-colors`}>
                <Twitter size={18} />
              </a>
              <a href="https://youtube.com/yallalondon" target="_blank" rel="noopener noreferrer" className={`${scrolled ? 'text-gray-500' : 'text-gray-600'} hover:text-orange-500 transition-colors`}>
                <Youtube size={18} />
              </a>
            </div>

            {/* Navigation - Left */}
            <nav className="hidden lg:flex items-center space-x-8">
              {nav.slice(0, Math.ceil(nav.length / 2)).map((item) => (
                <div key={item.name} className="relative group">
                  <Link
                    href={item.href}
                    className={`text-sm font-medium transition-colors ${
                      scrolled ? 'text-gray-700 dark:text-gray-300' : 'text-gray-700'
                    } hover:text-orange-500`}
                  >
                    {item.name}
                  </Link>
                  {item.children && (
                    <div className={`absolute top-full ${isRTL ? 'right-0' : 'left-0'} mt-2 w-48 bg-white dark:bg-gray-800 shadow-lg rounded-lg py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200`}>
                      {item.children.map((child) => (
                        <Link
                          key={child.name}
                          href={child.href}
                          className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-orange-500"
                        >
                          {child.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </nav>

            {/* Logo - Center */}
            <Link href={locale === 'ar' ? '/ar' : '/'} className="flex-shrink-0">
              <div className="flex flex-col items-center">
                {!scrolled && (
                  <div className="mb-2 w-20 h-20 rounded-full overflow-hidden border-2 border-orange-500 hidden lg:block">
                    <Image
                      src="/images/london-logo.jpg"
                      alt="Yalla London"
                      width={80}
                      height={80}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <span className={`font-serif font-bold transition-all ${scrolled ? 'text-2xl' : 'text-3xl'} text-gray-900 dark:text-white`}>
                  Yalla<span className="text-orange-500">.</span>
                </span>
              </div>
            </Link>

            {/* Navigation - Right */}
            <nav className="hidden lg:flex items-center space-x-8">
              {nav.slice(Math.ceil(nav.length / 2)).map((item) => (
                <div key={item.name} className="relative group">
                  <Link
                    href={item.href}
                    className={`text-sm font-medium transition-colors ${
                      scrolled ? 'text-gray-700 dark:text-gray-300' : 'text-gray-700'
                    } hover:text-orange-500`}
                  >
                    {item.name}
                  </Link>
                </div>
              ))}
            </nav>

            {/* Right Icons */}
            <div className="flex items-center space-x-4">
              {/* Language Switcher */}
              <Link
                href={locale === 'ar' ? '/' : '/ar'}
                className={`hidden lg:block text-sm font-medium transition-colors ${
                  scrolled ? 'text-gray-700 dark:text-gray-300' : 'text-gray-700'
                } hover:text-orange-500`}
              >
                {locale === 'ar' ? 'EN' : 'ع'}
              </Link>

              {/* Search */}
              <button
                onClick={() => setSearchOpen(true)}
                className={`p-2 transition-colors ${
                  scrolled ? 'text-gray-700 dark:text-gray-300' : 'text-gray-700'
                } hover:text-orange-500`}
              >
                <Search size={20} />
              </button>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(true)}
                className={`lg:hidden p-2 transition-colors ${
                  scrolled ? 'text-gray-700 dark:text-gray-300' : 'text-gray-700'
                } hover:text-orange-500`}
              >
                <Menu size={24} />
              </button>
            </div>
          </div>
        </div>
      </header>
    </>
  )
}
