
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
  // URL-based locale (from middleware x-locale header) ALWAYS wins.
  // localStorage is ONLY used when no URL locale is set (i.e. user hasn't
  // navigated to /ar/ but previously toggled the language switcher).
  // This prevents Arabic showing on the English homepage just because
  // localStorage has language=ar from a previous session.
  const [language, setLanguage] = useState<Language>(initialLocale || 'en')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Only read localStorage when there's NO server-provided locale.
    // If the URL says English (/blog/foo), respect it — don't let a stale
    // localStorage preference flip the page to Arabic.
    if (!initialLocale) {
      const saved = localStorage.getItem('language') as Language
      if (saved && (saved === 'en' || saved === 'ar')) {
        setLanguage(saved)
      }
    } else {
      // URL locale provided — force it and sync localStorage so the
      // preference stays consistent with the URL the user is on.
      setLanguage(initialLocale)
      try { localStorage.setItem('language', initialLocale) } catch { /* SSR */ }
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
