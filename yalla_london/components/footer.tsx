
'use client'

import { useLanguage } from './language-provider'
import { getTranslation } from '@/lib/i18n'

export function Footer() {
  const { language, isRTL } = useLanguage()
  const t = (key: string) => getTranslation(language, key)

  return (
    <footer className={`bg-gray-900 text-white py-12 ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center">
          <h3 className="text-2xl font-bold text-yellow-400 mb-4">Yalla London</h3>
          <p className="text-gray-300 mb-6">{t('footerText')}</p>
          <div className="border-t border-gray-800 pt-6">
            <p className="text-gray-400 text-sm">
              © 2025 Yalla London. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
