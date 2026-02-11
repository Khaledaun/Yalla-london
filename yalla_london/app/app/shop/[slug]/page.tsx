'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useParams } from 'next/navigation'
import {
  Download, Star, ShoppingCart, Check, ArrowLeft,
  FileText, Loader2, Shield, Clock, Sparkles
} from 'lucide-react'
import { useLanguage } from '@/components/language-provider'

interface Product {
  id: string
  name_en: string
  name_ar?: string
  slug: string
  description_en: string
  description_ar?: string
  price: number
  originalPrice: number | null
  currency: string
  type: string
  image: string | null
  features: string[]
  featured: boolean
  salesCount: number
}

export default function ProductDetailPage() {
  const params = useParams()
  const slug = params.slug as string
  const { language } = useLanguage()
  const locale = (language || 'en') as 'en' | 'ar'
  const isRTL = locale === 'ar'

  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkingOut, setCheckingOut] = useState(false)

  useEffect(() => {
    fetch(`/api/shop/products?search=${encodeURIComponent(slug)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed')
        const data = await res.json()
        const found = data.products?.find((p: Product) => p.slug === slug)
        if (found) setProduct(found)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [slug])

  const currencySymbol = (c: string) => c === 'GBP' ? '£' : c === 'USD' ? '$' : c === 'EUR' ? '€' : c + ' '

  const handleBuyNow = async () => {
    if (!product || checkingOut) return
    setCheckingOut(true)

    const email = prompt(isRTL ? 'أدخل بريدك الإلكتروني لإتمام الشراء:' : 'Enter your email to complete the purchase:')
    if (!email) {
      setCheckingOut(false)
      return
    }

    try {
      const res = await fetch('/api/checkout/digital-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          customerEmail: email,
        }),
      })

      const data = await res.json()
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      } else if (data.downloadUrl) {
        window.location.href = data.downloadUrl
      } else {
        alert(data.error || 'Checkout failed.')
      }
    } catch {
      alert('Checkout failed. Please try again.')
    } finally {
      setCheckingOut(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#E8634B] animate-spin" />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <FileText className="w-16 h-16 text-gray-300" />
        <h1 className="text-2xl font-bold text-gray-800">Product not found</h1>
        <Link href="/shop" className="text-[#E8634B] hover:underline flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Shop
        </Link>
      </div>
    )
  }

  const sym = currencySymbol(product.currency)
  const name = isRTL ? (product.name_ar || product.name_en) : product.name_en
  const description = isRTL ? (product.description_ar || product.description_en) : product.description_en

  return (
    <div className="min-h-screen bg-gray-50" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Navbar */}
      <div className="fixed top-0 left-0 right-0 z-50 flex justify-center p-4 pointer-events-none">
        <nav className="flex items-center justify-between px-6 py-3 bg-white/95 backdrop-blur-xl rounded-full shadow-lg w-full max-w-4xl pointer-events-auto border border-gray-100">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-[#1A1F36] rounded-lg flex items-center justify-center relative">
              <span className="text-white font-bold">Y</span>
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#E8634B] rounded-full"></span>
            </div>
            <span className="text-xl font-bold text-[#1A1F36]">Yalla<span className="font-normal text-[#A3A3A3]">London</span></span>
          </Link>
          <div className="hidden md:flex items-center gap-4">
            <Link href="/" className="text-sm font-medium text-gray-600 hover:text-[#1A1F36]">Home</Link>
            <Link href="/blog" className="text-sm font-medium text-gray-600 hover:text-[#1A1F36]">Blog</Link>
            <Link href="/shop" className="text-sm font-medium text-[#1A1F36]">Shop</Link>
          </div>
        </nav>
      </div>

      <div className="pt-28 pb-16 max-w-5xl mx-auto px-6">
        {/* Breadcrumb */}
        <Link href="/shop" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#1A1F36] mb-6">
          <ArrowLeft className="w-4 h-4" />
          {isRTL ? 'العودة للمتجر' : 'Back to Shop'}
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Product Image */}
          <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-gray-100">
            {product.image ? (
              <Image src={product.image} alt={name} fill className="object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#1A1F36] to-[#E8634B] flex items-center justify-center">
                <FileText className="w-24 h-24 text-white/30" />
              </div>
            )}
            {product.featured && (
              <span className="absolute top-4 left-4 px-3 py-1 bg-[#E8634B] text-white text-sm font-semibold rounded-full">
                Featured
              </span>
            )}
          </div>

          {/* Product Info */}
          <div>
            <h1 className="text-3xl font-bold text-[#1A1F36] mb-3">{name}</h1>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-1">
                <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                <span className="font-semibold">{product.salesCount}</span>
                <span className="text-gray-400 text-sm">{isRTL ? 'مبيعات' : 'sold'}</span>
              </div>
            </div>

            <p className="text-gray-600 leading-relaxed mb-6">{description}</p>

            {/* Features */}
            {(product.features as string[]).length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-[#1A1F36] mb-3">{isRTL ? 'ماذا يتضمن' : "What's Included"}</h3>
                <div className="space-y-2">
                  {(product.features as string[]).map((f, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm text-gray-600">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Price */}
            <div className="flex items-center gap-3 mb-6">
              <span className="text-4xl font-bold text-[#1A1F36]">{sym}{product.price.toFixed(2)}</span>
              {product.originalPrice && (
                <span className="text-lg text-gray-400 line-through">{sym}{product.originalPrice.toFixed(2)}</span>
              )}
              {product.originalPrice && (
                <span className="px-2 py-1 bg-green-100 text-green-700 text-sm font-semibold rounded">
                  Save {Math.round((1 - product.price / product.originalPrice) * 100)}%
                </span>
              )}
            </div>

            {/* Buy button */}
            <button
              onClick={handleBuyNow}
              disabled={checkingOut}
              className="w-full flex items-center justify-center gap-2 px-8 py-4 bg-[#E8634B] hover:bg-[#d4543d] text-white font-bold text-lg rounded-xl transition-colors disabled:opacity-50 mb-4"
            >
              {checkingOut ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <ShoppingCart className="w-5 h-5" />
                  {product.price === 0
                    ? (isRTL ? 'تحميل مجاني' : 'Download Free')
                    : (isRTL ? 'اشتر الآن' : 'Buy Now')}
                </>
              )}
            </button>

            {/* Trust signals */}
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col items-center gap-1 p-3 bg-gray-50 rounded-lg">
                <Download className="w-5 h-5 text-[#E8634B]" />
                <span className="text-xs text-gray-500 text-center">{isRTL ? 'تحميل فوري' : 'Instant Download'}</span>
              </div>
              <div className="flex flex-col items-center gap-1 p-3 bg-gray-50 rounded-lg">
                <Shield className="w-5 h-5 text-green-500" />
                <span className="text-xs text-gray-500 text-center">{isRTL ? 'دفع آمن' : 'Secure Payment'}</span>
              </div>
              <div className="flex flex-col items-center gap-1 p-3 bg-gray-50 rounded-lg">
                <Clock className="w-5 h-5 text-blue-500" />
                <span className="text-xs text-gray-500 text-center">{isRTL ? 'وصول مدى الحياة' : 'Lifetime Access'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
