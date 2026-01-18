'use client'

import { useLanguage } from '@/components/language-provider'
import { YallaHomepage } from '@/components/home/yalla-homepage'

export default function Home() {
  const { language } = useLanguage()

  return <YallaHomepage locale={language as 'en' | 'ar'} />
}
