'use client'

import Link from 'next/link'
import Image from 'next/image'
import { WifiOff, RefreshCw, Home } from 'lucide-react'
import { BrandButton, BrandCardLight } from '@/components/brand-kit'

export default function OfflinePage() {
  const handleRetry = () => {
    window.location.reload()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-yl-cream">
      <div className="max-w-md w-full mx-auto px-7 text-center">
        <div className="mb-8">
          <Image
            src="/images/yalla-london-logo.svg"
            alt="Yalla London"
            width={200}
            height={36}
            className="mx-auto mb-6 h-9 w-auto"
          />
          <div className="mx-auto w-16 h-16 bg-yl-cream rounded-full flex items-center justify-center mb-6">
            <WifiOff className="h-8 w-8 text-yl-gray-500" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-yl-charcoal mb-4">
            You&apos;re offline
          </h1>
          <p className="text-yl-gray-500 font-body mb-8">
            It looks like you&apos;ve lost your internet connection. Don&apos;t worry, you can still browse some content that we&apos;ve saved for you.
          </p>
        </div>

        <div className="space-y-4">
          <BrandButton variant="primary" onClick={handleRetry} className="w-full">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </BrandButton>

          <Link href="/">
            <BrandButton variant="outline" className="w-full">
              <Home className="mr-2 h-4 w-4" />
              Go to Home
            </BrandButton>
          </Link>
        </div>

        <BrandCardLight className="mt-8 p-6 text-left">
          <h3 className="font-heading font-semibold text-yl-charcoal mb-3">Available Offline:</h3>
          <div className="space-y-2">
            <Link href="/" className="block text-sm text-yl-red hover:underline font-body">
              • Home page
            </Link>
            <Link href="/blog" className="block text-sm text-yl-red hover:underline font-body">
              • Recent blog posts
            </Link>
            <Link href="/recommendations" className="block text-sm text-yl-red hover:underline font-body">
              • London recommendations
            </Link>
          </div>
        </BrandCardLight>

        <div className="mt-8">
          <p className="text-xs text-yl-gray-500 font-body">
            Your connection will be restored automatically when you&apos;re back online.
          </p>
        </div>
      </div>
    </div>
  )
}
