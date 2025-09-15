'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { WifiOff, RefreshCw, Home } from 'lucide-react'

export default function OfflinePage() {
  const handleRetry = () => {
    window.location.reload()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-md w-full mx-auto px-6 text-center">
        <div className="mb-8">
          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-6">
            <WifiOff className="h-8 w-8 text-gray-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            You're offline
          </h1>
          <p className="text-gray-600 mb-8">
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

        <div className="mt-8 pt-8 border-t border-gray-200">
          <h3 className="font-semibold text-gray-800 mb-3">Available Offline:</h3>
          <div className="space-y-2 text-left">
            <Link href="/" className="block text-sm text-blue-600 hover:text-blue-800">
              • Home page
            </Link>
            <Link href="/blog" className="block text-sm text-blue-600 hover:text-blue-800">
              • Recent blog posts
            </Link>
            <Link href="/recommendations" className="block text-sm text-blue-600 hover:text-blue-800">
              • London recommendations
            </Link>
          </div>
        </div>

        <div className="mt-8">
          <p className="text-xs text-gray-500">
            Your connection will be restored automatically when you're back online.
          </p>
        </div>
      </div>
    </div>
  )
}