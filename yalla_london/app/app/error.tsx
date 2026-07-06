'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Home, RotateCcw, AlertTriangle } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[global-error]', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#FAF8F4] to-[#F0EDE6] px-6">
      <div className="max-w-md w-full text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-[#C8322B]/10 flex items-center justify-center mb-6">
          <AlertTriangle className="h-8 w-8 text-[#C8322B]" />
        </div>
        <h1 className="text-2xl font-bold text-[#1C2B39] mb-2">Something went wrong</h1>
        <p className="text-[#6B7280] mb-8">
          We encountered an unexpected error. Please try again or return to the homepage.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-[#C8322B] text-white rounded-full font-medium hover:bg-[#A82922] transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            Try Again
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 border border-[#D6D0C4] text-[#1C2B39] rounded-full font-medium hover:bg-white transition-colors"
          >
            <Home className="h-4 w-4" />
            Back to Home
          </Link>
        </div>
        {error.digest && (
          <p className="mt-8 text-xs text-[#9CA3AF]">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  )
}
