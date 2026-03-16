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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yl-cream to-yl-gray-100">
      <div className="max-w-md w-full mx-auto px-6 text-center">
        <div className="mb-8">
          <Image
            src="/images/yalla-london-logo.svg"
            alt="Yalla London"
            width={200}
            height={36}
            className="mx-auto mb-6 h-9 w-auto"
          />
          <div className="mx-auto w-16 h-16 bg-yl-gray-100 rounded-full flex items-center justify-center mb-6">
            <WifiOff className="h-8 w-8 text-yl-gray-500" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-yl-charcoal mb-4">
            You&apos;re offline
          </h1>
          <p className="text-yl-gray-500 mb-8">
            It looks like you&apos;ve lost your internet connection. Don&apos;t worry, you can still browse some content that we&apos;ve saved for you.
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

        <div className="mt-8 pt-8 border-t border-yl-gray-200">
          <h3 className="font-heading font-semibold text-yl-charcoal mb-3">Available Offline:</h3>
          <div className="space-y-2 text-left">
            <Link href="/" className="block text-sm text-yl-blue hover:text-yl-blue">
              • Home page
            </Link>
            <Link href="/blog" className="block text-sm text-yl-blue hover:text-yl-blue">
              • Recent blog posts
            </Link>
            <Link href="/recommendations" className="block text-sm text-yl-blue hover:text-yl-blue">
              • London recommendations
            </Link>
          </div>
        </div>

        <div className="mt-8">
          <p className="text-xs text-yl-gray-500">
            Your connection will be restored automatically when you&apos;re back online.
          </p>
        </div>
      </div>
    </div>
  )
}