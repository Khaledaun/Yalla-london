
'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { Language } from '@/lib/types'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  isRTL: boolean
}

const LanguageContext = createContext<LanguageContextType | null>(null)

interface LanguageProviderProps {
  children: React.ReactNode
  /** Server-provided locale from middleware (e.g. /ar/ routes set this to 'ar') */
  initialLocale?: Language
}

export function LanguageProvider({ children, initialLocale }: LanguageProviderProps) {
  const [language, setLanguage] = useState<Language>(initialLocale || 'en')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // When a URL-based locale is provided (e.g. /ar/ routes), always use it.
    // Otherwise fall back to the user's localStorage preference.
    if (!initialLocale) {
      const saved = localStorage.getItem('language') as Language
      if (saved && (saved === 'en' || saved === 'ar')) {
        setLanguage(saved)
      }
    }
    setMounted(true)
  }, [initialLocale])

  useEffect(() => {
    if (mounted) {
      localStorage.setItem('language', language)
      document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
      document.documentElement.lang = language
    }
  }, [language, mounted])

  const isRTL = language === 'ar'

  // Always render children — returning null blocks SSR and makes crawlers see an empty page
  return (
    <LanguageContext.Provider value={{ language, setLanguage, isRTL }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider')
  }
  return context
}
