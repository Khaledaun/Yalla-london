'use client'

import { useLanguage } from '@/components/language-provider'
import { AkeaHomepage } from '@/components/home/akea-homepage'

export default function Home() {
  const { language } = useLanguage()

  return <AkeaHomepage locale={language as 'en' | 'ar'} />
}
