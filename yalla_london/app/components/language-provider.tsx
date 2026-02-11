
'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { Language } from '@/lib/types'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  isRTL: boolean
}

const LanguageContext = createContext<LanguageContextType | null>(null)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('en')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('language') as Language
    if (saved && (saved === 'en' || saved === 'ar')) {
      setLanguage(saved)
    }
    setMounted(true)
  }, [])

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
