'use client'

import Link from 'next/link'
import { useLanguage } from '@/components/language-provider'
import { getTranslation } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Home, ArrowLeft, Search } from 'lucide-react'

export default function NotFound() {
  const { language, isRTL } = useLanguage()
  const t = (key: string) => getTranslation(language, key)

  return (
    <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br from-cream to-cream-100 ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className="max-w-md w-full mx-auto px-6 text-center">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-sand select-none">404</h1>
          <div className="relative -mt-8">
            <h2 className="text-2xl font-bold text-charcoal mb-4">
              {t('pageNotFound') || 'Page Not Found'}
            </h2>
            <p className="text-stone mb-8">
              {t('pageNotFoundMessage') || 'The page you are looking for does not exist or has been moved.'}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <Button asChild className="w-full">
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              {t('backHome') || 'Back to Home'}
            </Link>
          </Button>
          
          <div className="flex gap-2">
            <Button variant="outline" asChild className="flex-1">
              <Link href="/blog">
                <Search className="mr-2 h-4 w-4" />
                {t('exploreBlog') || 'Explore Blog'}
              </Link>
            </Button>
            
            <Button variant="outline" asChild className="flex-1">
              <Link href="/contact">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('contact') || 'Contact'}
              </Link>
            </Button>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-sand">
          <p className="text-sm text-stone">
            {t('errorCode') || 'Error Code'}: 404 | {t('pageNotFound') || 'Page Not Found'}
          </p>
        </div>
      </div>
    </div>
  )
}