'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { WifiOff, RefreshCw, Home } from 'lucide-react'

export default function OfflinePage() {
  const handleRetry = () => {
    window.location.reload()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cream to-cream-100">
      <div className="max-w-md w-full mx-auto px-6 text-center">
        <div className="mb-8">
          <Image
            src="/images/yalla-london-logo.svg"
            alt="Yalla London"
            width={200}
            height={36}
            className="mx-auto mb-6 h-9 w-auto"
          />
          <div className="mx-auto w-16 h-16 bg-cream-100 rounded-full flex items-center justify-center mb-6">
            <WifiOff className="h-8 w-8 text-stone" />
          </div>
          <h1 className="text-3xl font-bold text-charcoal mb-4">
            You're offline
          </h1>
          <p className="text-stone mb-8">
            It looks like you've lost your internet connection. Don't worry, you can still browse some content that we've saved for you.
          </p>
        </div>

        <div className="space-y-4">
          <Button onClick={handleRetry} className="w-full">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
          
          <Button variant="outline" asChild className="w-full">
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Go to Home
            </Link>
          </Button>
        </div>

        <div className="mt-8 pt-8 border-t border-sand">
          <h3 className="font-semibold text-charcoal mb-3">Available Offline:</h3>
          <div className="space-y-2 text-left">
            <Link href="/" className="block text-sm text-thames-500 hover:text-thames-700">
              • Home page
            </Link>
            <Link href="/blog" className="block text-sm text-thames-500 hover:text-thames-700">
              • Recent blog posts
            </Link>
            <Link href="/recommendations" className="block text-sm text-thames-500 hover:text-thames-700">
              • London recommendations
            </Link>
          </div>
        </div>

        <div className="mt-8">
          <p className="text-xs text-stone">
            Your connection will be restored automatically when you're back online.
          </p>
        </div>
      </div>
    </div>
  )
}