
'use client'

import { useLanguage } from './language-provider'
import { Button } from './ui/button'
import { Globe } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'

export function LanguageSwitcher() {
  const { language } = useLanguage()
  const pathname = usePathname()
  const router = useRouter()

  const toggleLanguage = () => {
    if (language === 'en') {
      // English → Arabic: prefix /ar/
      router.push(`/ar${pathname === '/' ? '' : pathname}`)
    } else {
      // Arabic → English: strip /ar prefix
      const enPath = pathname.replace(/^\/ar\/?/, '/') || '/'
      router.push(enPath)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleLanguage}
      className="flex items-center gap-2 bg-white/80 hover:bg-white border-sand hover:border-stone"
    >
      <Globe className="h-4 w-4" />
      <span className="font-medium">
        {language === 'en' ? 'العربية' : 'EN'}
      </span>
    </Button>
  )
}
