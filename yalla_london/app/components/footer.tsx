
'use client'

import Link from 'next/link'
import { useLanguage } from './language-provider'
import { getTranslation } from '@/lib/i18n'

export function Footer() {
  const { language, isRTL } = useLanguage()
  const t = (key: string) => getTranslation(language, key)

  return (
    <footer className={`bg-gray-900 text-white py-12 ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Column */}
          <div className="md:col-span-2">
            <h3 className="text-2xl font-bold text-yellow-400 mb-4">Yalla London</h3>
            <p className="text-gray-300 mb-4">{t('footerText') || 'Your ultimate guide to London lifestyle, travel, and experiences.'}</p>
            <p className="text-gray-400 text-sm">
              Discover the best of London with curated recommendations, insider tips, and local insights.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold text-white mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/blog" className="text-gray-300 hover:text-yellow-400 transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/events" className="text-gray-300 hover:text-yellow-400 transition-colors">
                  Events
                </Link>
              </li>
              <li>
                <Link href="/recommendations" className="text-gray-300 hover:text-yellow-400 transition-colors">
                  Recommendations
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-gray-300 hover:text-yellow-400 transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Support */}
          <div>
            <h4 className="text-lg font-semibold text-white mb-4">Legal & Support</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/privacy" className="text-gray-300 hover:text-yellow-400 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-gray-300 hover:text-yellow-400 transition-colors">
                  Terms of Use
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-gray-300 hover:text-yellow-400 transition-colors">
                  Support
                </Link>
              </li>
              <li>
                <a 
                  href="mailto:privacy@yalla-london.com" 
                  className="text-gray-300 hover:text-yellow-400 transition-colors"
                >
                  Data Rights
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm mb-2 md:mb-0">
              © 2025 Yalla London. All rights reserved.
            </p>
            <div className="flex space-x-4 text-sm text-gray-400">
              <Link href="/privacy" className="hover:text-yellow-400 transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-yellow-400 transition-colors">
                Terms
              </Link>
              <a href="mailto:legal@yalla-london.com" className="hover:text-yellow-400 transition-colors">
                Legal
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
