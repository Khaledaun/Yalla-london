'use client'

import { useLanguage } from '@/components/language-provider'
import { YallaHomepage } from '@/components/home/yalla-homepage'

export default function Home() {
  const { language } = useLanguage()

  // Default to 'en' for SSR so crawlers see English content
  return <YallaHomepage locale={(language || 'en') as 'en' | 'ar'} />
}
