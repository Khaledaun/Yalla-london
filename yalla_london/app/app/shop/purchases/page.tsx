'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  Download, FileText, Search, ArrowLeft,
  Loader2, Package, Check, Clock, AlertCircle
} from 'lucide-react'
import { useLanguage } from '@/components/language-provider'

interface PurchaseItem {
  id: string
  product: {
    name_en: string
    name_ar?: string
    slug: string
    type: string
    image: string | null
  }
  amount: number
  currency: string
  status: string
  downloadUrl: string | null
  downloadsUsed: number
  downloadsRemaining: number
  purchasedAt: string
}

export default function PurchasesPage() {
  const { language } = useLanguage()
  const locale = (language || 'en') as 'en' | 'ar'
  const isRTL = locale === 'ar'

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [purchases, setPurchases] = useState<PurchaseItem[] | null>(null)
  const [error, setError] = useState('')

  const lookupPurchases = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setLoading(true)
    setError('')
    setPurchases(null)

    try {
      const res = await fetch(`/api/shop/purchases?email=${encodeURIComponent(email)}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setPurchases(data.purchases || [])
    } catch {
      setError(isRTL ? 'فشل في تحميل المشتريات. حاول مرة أخرى.' : 'Failed to load purchases. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const sym = (c: string) => c === 'GBP' ? '£' : c === 'USD' ? '$' : c + ' '

  const statusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED': return <Check className="w-4 h-4 text-green-500" />
      case 'PENDING': return <Clock className="w-4 h-4 text-yellow-500" />
      default: return <AlertCircle className="w-4 h-4 text-red-500" />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Navbar */}
      <div className="fixed top-0 left-0 right-0 z-50 flex justify-center p-4 pointer-events-none">
        <nav className="flex items-center justify-between px-6 py-3 bg-white/95 backdrop-blur-xl rounded-full shadow-lg w-full max-w-4xl pointer-events-auto border border-gray-100">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-[#1C1917] rounded-lg flex items-center justify-center relative">
              <span className="text-white font-bold">Y</span>
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#C8322B] rounded-full"></span>
            </div>
            <span className="text-xl font-bold text-[#1C1917]">Yalla<span className="font-normal text-[#A3A3A3]">London</span></span>
          </Link>
          <div className="hidden md:flex items-center gap-4">
            <Link href="/shop" className="text-sm font-medium text-gray-600 hover:text-[#1C1917]">Shop</Link>
            <Link href="/shop/purchases" className="text-sm font-medium text-[#1C1917]">My Purchases</Link>
          </div>
        </nav>
      </div>

      <div className="pt-28 pb-16 max-w-2xl mx-auto px-6">
        <Link href="/shop" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#1C1917] mb-6">
          <ArrowLeft className="w-4 h-4" />
          {isRTL ? 'العودة للمتجر' : 'Back to Shop'}
        </Link>

        <h1 className="text-3xl font-bold text-[#1C1917] mb-2">
          {isRTL ? 'مشترياتي' : 'My Purchases'}
        </h1>
        <p className="text-gray-500 mb-8">
          {isRTL ? 'أدخل بريدك الإلكتروني لعرض مشترياتك وروابط التحميل' : 'Enter your email to view your purchases and download links'}
        </p>

        {/* Email lookup form */}
        <form onSubmit={lookupPurchases} className="flex gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="email"
              required
              placeholder={isRTL ? 'أدخل بريدك الإلكتروني...' : 'Enter your email address...'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C8322B]/20 focus:border-[#C8322B]"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-[#C8322B] hover:bg-[#a82520] text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isRTL ? 'بحث' : 'Look Up')}
          </button>
        </form>

        {error && (
          <div className="p-4 bg-red-50 text-red-700 rounded-xl mb-6">{error}</div>
        )}

        {/* Results */}
        {purchases !== null && (
          <>
            {purchases.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h2 className="text-xl font-bold text-gray-800 mb-2">
                  {isRTL ? 'لا توجد مشتريات' : 'No purchases found'}
                </h2>
                <p className="text-gray-500 mb-4">
                  {isRTL ? 'لم نجد أي مشتريات لهذا البريد الإلكتروني.' : 'No purchases found for this email address.'}
                </p>
                <Link href="/shop" className="text-[#C8322B] hover:underline font-medium">
                  {isRTL ? 'تصفح المتجر' : 'Browse Shop'}
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {purchases.map((purchase) => (
                  <div key={purchase.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className="w-12 h-12 bg-[#C8322B]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileText className="w-6 h-6 text-[#C8322B]" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-[#1C1917] truncate">
                            {isRTL ? (purchase.product.name_ar || purchase.product.name_en) : purchase.product.name_en}
                          </h3>
                          {statusIcon(purchase.status)}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                          <span>{sym(purchase.currency)}{purchase.amount.toFixed(2)}</span>
                          <span>&middot;</span>
                          <span>{new Date(purchase.purchasedAt).toLocaleDateString()}</span>
                          {purchase.status === 'COMPLETED' && (
                            <>
                              <span>&middot;</span>
                              <span>{purchase.downloadsRemaining} {isRTL ? 'تحميلات متبقية' : 'downloads left'}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Download button */}
                      {purchase.downloadUrl && purchase.downloadsRemaining > 0 && (
                        <a
                          href={purchase.downloadUrl}
                          className="flex items-center gap-2 px-4 py-2 bg-[#C8322B] hover:bg-[#a82520] text-white font-medium rounded-lg transition-colors flex-shrink-0"
                        >
                          <Download className="w-4 h-4" />
                          {isRTL ? 'تحميل' : 'Download'}
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
