
'use client'

import { useLanguage } from './language-provider'
import { Button } from './ui/button'
import { Globe } from 'lucide-react'

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage()

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ar' : 'en')
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleLanguage}
      className="flex items-center gap-2 bg-white/80 hover:bg-white border-gray-200 hover:border-gray-300"
    >
      <Globe className="h-4 w-4" />
      <span className="font-medium">
        {language === 'en' ? 'العربية' : 'EN'}
      </span>
    </Button>
  )
}
