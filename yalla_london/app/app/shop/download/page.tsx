'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Download, Check, AlertCircle, RefreshCw, ArrowLeft, FileText } from 'lucide-react'

interface DownloadInfo {
  success: boolean
  product: {
    name: string
    name_ar?: string
    type: string
    slug: string
  }
  downloadsUsed: number
  downloadsRemaining: number
  fileUrl: string | null
}

export default function DownloadPage() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [info, setInfo] = useState<DownloadInfo | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setErrorMsg('No download token provided.')
      return
    }

    fetch(`/api/products/pdf/download?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) {
          setStatus('error')
          setErrorMsg(
            data.code === 'LIMIT_REACHED'
              ? 'You have reached the maximum number of downloads for this product.'
              : data.code === 'PAYMENT_PENDING'
                ? 'Your payment has not been confirmed yet. Please wait a moment and refresh.'
                : data.error || 'Download failed'
          )
          return
        }
        setInfo(data)
        setStatus('ready')
      })
      .catch(() => {
        setStatus('error')
        setErrorMsg('Failed to validate your download. Please try again.')
      })
  }, [token])

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 bg-charcoal rounded-lg flex items-center justify-center relative">
            <span className="text-white font-bold text-lg">Y</span>
            <span className="absolute top-2 right-2 w-2 h-2 bg-london-600 rounded-full"></span>
          </div>
          <span className="text-2xl font-bold text-charcoal">
            Yalla<span className="font-normal text-stone">London</span>
          </span>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-sand overflow-hidden">
          {/* Accent bar */}
          <div className="h-1 bg-gradient-luxury" />

          <div className="p-8 text-center">
            {status === 'loading' && (
              <>
                <div className="w-16 h-16 mx-auto mb-4 bg-cream-100 rounded-full flex items-center justify-center animate-pulse">
                  <RefreshCw className="w-8 h-8 text-stone animate-spin" />
                </div>
                <h1 className="text-xl font-bold text-charcoal mb-2">
                  Preparing your download...
                </h1>
                <p className="text-stone">Please wait while we validate your purchase.</p>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="w-16 h-16 mx-auto mb-4 bg-london-50 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-london-600" />
                </div>
                <h1 className="text-xl font-bold text-charcoal mb-2">
                  Download Unavailable
                </h1>
                <p className="text-stone mb-6">{errorMsg}</p>
                <Link
                  href="/shop"
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-london-600 hover:underline"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Shop
                </Link>
              </>
            )}

            {status === 'ready' && info && (
              <>
                <div className="w-16 h-16 mx-auto mb-4 bg-forest/10 rounded-full flex items-center justify-center">
                  <Check className="w-8 h-8 text-forest" />
                </div>
                <h1 className="text-xl font-bold text-charcoal mb-2">
                  Your Download is Ready!
                </h1>

                {/* Product info */}
                <div className="bg-cream rounded-xl p-4 mb-6 text-left">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-london-600/10 rounded-lg">
                      <FileText className="w-6 h-6 text-london-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-charcoal">{info.product.name}</p>
                      <p className="text-sm text-stone">
                        {info.downloadsRemaining} downloads remaining
                      </p>
                    </div>
                  </div>
                </div>

                {/* Download button */}
                {info.fileUrl ? (
                  <a
                    href={info.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-8 py-3 bg-london-600 hover:bg-london-700 text-white font-semibold rounded-xl transition-colors w-full justify-center"
                  >
                    <Download className="w-5 h-5" /> Download File
                  </a>
                ) : (
                  <p className="text-sm text-stone">
                    Your file is being prepared. You will receive an email when it is ready.
                  </p>
                )}

                <div className="mt-6 pt-4 border-t border-sand">
                  <Link
                    href="/shop"
                    className="inline-flex items-center gap-2 text-sm text-stone hover:text-charcoal"
                  >
                    <ArrowLeft className="w-4 h-4" /> Browse more guides
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
