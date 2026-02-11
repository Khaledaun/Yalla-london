'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Download, Star, ShoppingCart, Check, Search,
  MapPin, Utensils, ShoppingBag,
  FileText, Crown, Sparkles, ArrowRight, Loader2
} from 'lucide-react'
import { useLanguage } from '@/components/language-provider'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Product {
  id: string
  name_en: string
  name_ar?: string
  slug: string
  description_en: string
  description_ar?: string
  price: number          // display units (not cents)
  originalPrice: number | null
  currency: string
  type: string
  image: string | null
  features: string[]
  featured: boolean
  salesCount: number
}

// ---------------------------------------------------------------------------
// Fallback products (shown when DB is empty or API unavailable)
// ---------------------------------------------------------------------------

const fallbackProducts: Product[] = [
  {
    id: 'fb-1', name_en: 'Complete London Guide 2026', name_ar: 'دليل لندن الشامل 2026',
    slug: 'complete-london-guide-2026',
    description_en: 'The ultimate 45-page guide covering everything you need to know for your London visit. Includes halal restaurants, prayer facilities, attractions, and insider tips.',
    description_ar: 'الدليل النهائي المؤلف من 45 صفحة يغطي كل ما تحتاج معرفته لزيارتك للندن.',
    price: 9.99, originalPrice: 14.99, currency: 'GBP', type: 'PDF_GUIDE',
    image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600&q=80',
    features: ['45 Pages', 'Printable PDF', 'Offline Maps', 'Regular Updates'],
    featured: true, salesCount: 234,
  },
  {
    id: 'fb-2', name_en: 'Halal Restaurant Guide London', name_ar: 'دليل المطاعم الحلال في لندن',
    slug: 'halal-restaurant-guide-london',
    description_en: 'Discover 100+ halal restaurants across London. From fine dining to street food, organized by cuisine, location, and price range.',
    description_ar: 'اكتشف أكثر من 100 مطعم حلال في لندن.',
    price: 7.99, originalPrice: null, currency: 'GBP', type: 'PDF_GUIDE',
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=80',
    features: ['100+ Restaurants', 'Location Maps', 'Price Ranges', 'Review Scores'],
    featured: false, salesCount: 156,
  },
  {
    id: 'fb-3', name_en: 'London Shopping Secrets', name_ar: 'أسرار التسوق في لندن',
    slug: 'london-shopping-secrets',
    description_en: 'Your insider guide to shopping in London. Best boutiques, outlet deals, tax-free shopping tips, and exclusive discount codes.',
    description_ar: 'دليلك للتسوق في لندن. أفضل المحلات والعروض.',
    price: 6.99, originalPrice: 9.99, currency: 'GBP', type: 'PDF_GUIDE',
    image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&q=80',
    features: ['28 Pages', 'Discount Codes', 'Store Directory', 'Sale Calendar'],
    featured: false, salesCount: 189,
  },
  {
    id: 'fb-4', name_en: 'Family London Adventure Pack', name_ar: 'حزمة مغامرة العائلة في لندن',
    slug: 'family-london-adventure-pack',
    description_en: 'Complete family travel bundle with kid-friendly attractions, family restaurants, and activity guides.',
    description_ar: 'باقة سفر عائلية كاملة مع معالم مناسبة للأطفال.',
    price: 14.99, originalPrice: 24.99, currency: 'GBP', type: 'BUNDLE',
    image: 'https://images.unsplash.com/photo-1529655683826-aba9b3e77383?w=600&q=80',
    features: ['3 Guides in 1', 'Activity Sheets', 'Family Discounts', 'Itineraries'],
    featured: true, salesCount: 312,
  },
  {
    id: 'fb-5', name_en: 'Prayer Times & Mosques Guide', name_ar: 'دليل أوقات الصلاة والمساجد',
    slug: 'prayer-times-mosques-guide',
    description_en: 'Comprehensive guide to mosques and prayer facilities across London.',
    description_ar: 'دليل شامل للمساجد ومرافق الصلاة في لندن.',
    price: 4.99, originalPrice: null, currency: 'GBP', type: 'PDF_GUIDE',
    image: 'https://images.unsplash.com/photo-1564769625392-651b89c75a66?w=600&q=80',
    features: ['50+ Mosques', 'Prayer Times', 'Directions', 'Contact Info'],
    featured: false, salesCount: 98,
  },
  {
    id: 'fb-6', name_en: 'Ultimate London Bundle', name_ar: 'الباقة الكاملة للندن',
    slug: 'ultimate-london-bundle',
    description_en: 'All our guides in one discounted package. Save 40% and get everything you need for the perfect London experience.',
    description_ar: 'جميع أدلتنا في حزمة واحدة بخصم. وفر 40%.',
    price: 29.99, originalPrice: 49.99, currency: 'GBP', type: 'BUNDLE',
    image: 'https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=600&q=80',
    features: ['5 Guides', 'Lifetime Updates', 'Priority Support', 'Bonus Content'],
    featured: true, salesCount: 87,
  },
]

// ---------------------------------------------------------------------------
// Categories & text
// ---------------------------------------------------------------------------

const categories = [
  { id: 'all', label: { en: 'All Products', ar: 'جميع المنتجات' }, icon: FileText },
  { id: 'PDF_GUIDE', label: { en: 'Travel Guides', ar: 'أدلة السفر' }, icon: MapPin },
  { id: 'TEMPLATE', label: { en: 'Templates', ar: 'قوالب' }, icon: Utensils },
  { id: 'BUNDLE', label: { en: 'Bundle Deals', ar: 'عروض الباقات' }, icon: Crown },
  { id: 'SPREADSHEET', label: { en: 'Planners', ar: 'مخططات' }, icon: ShoppingBag },
]

const text = {
  en: {
    title: 'Digital Guides Shop',
    subtitle: 'Expert guides crafted for Arab visitors to London',
    search: 'Search guides...',
    addToCart: 'Add to Cart',
    pages: 'pages',
    reviews: 'reviews',
    checkout: 'Checkout',
    instantDownload: 'Instant digital download',
    securePayment: 'Secure payment',
    lifetime: 'Lifetime access',
    viewDetails: 'View Details',
    loading: 'Loading products...',
    sold: 'sold',
  },
  ar: {
    title: 'متجر الأدلة الرقمية',
    subtitle: 'أدلة متخصصة مصممة للزوار العرب في لندن',
    search: 'ابحث في الأدلة...',
    addToCart: 'أضف للسلة',
    pages: 'صفحة',
    reviews: 'تقييم',
    checkout: 'إتمام الشراء',
    instantDownload: 'تحميل رقمي فوري',
    securePayment: 'دفع آمن',
    lifetime: 'وصول مدى الحياة',
    viewDetails: 'عرض التفاصيل',
    loading: 'جاري تحميل المنتجات...',
    sold: 'مبيعات',
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ShopPage() {
  const { language } = useLanguage()
  const locale = (language || 'en') as 'en' | 'ar'
  const isRTL = locale === 'ar'
  const t = text[locale]

  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [cart, setCart] = useState<string[]>([])
  const [products, setProducts] = useState<Product[]>(fallbackProducts)
  const [loading, setLoading] = useState(true)
  const [checkingOut, setCheckingOut] = useState(false)

  // Fetch products from DB
  useEffect(() => {
    fetch('/api/shop/products')
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to fetch')
        const data = await res.json()
        if (data.products && data.products.length > 0) {
          setProducts(data.products)
        }
      })
      .catch(() => {
        // Keep fallback products
      })
      .finally(() => setLoading(false))
  }, [])

  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === 'all' || product.type === selectedCategory
    const matchesSearch = !searchQuery ||
      product.name_en.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.description_en || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.name_ar || '').includes(searchQuery)
    return matchesCategory && matchesSearch
  })

  const addToCart = (id: string) => {
    if (!cart.includes(id)) {
      setCart([...cart, id])
    }
  }

  const cartTotal = cart.reduce((sum, id) => {
    const product = products.find(p => p.id === id)
    return sum + (product?.price || 0)
  }, 0)

  const currencySymbol = (c: string) => c === 'GBP' ? '£' : c === 'USD' ? '$' : c === 'EUR' ? '€' : c + ' '

  const handleCheckout = useCallback(async () => {
    if (cart.length === 0 || checkingOut) return
    setCheckingOut(true)

    // For MVP: checkout the first item in cart
    // A full cart system would batch these
    const product = products.find(p => p.id === cart[0])
    if (!product) return

    const email = prompt('Enter your email to complete the purchase:')
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
        // Free product
        window.location.href = data.downloadUrl
      } else {
        alert(data.error || 'Checkout failed. Please try again.')
      }
    } catch {
      alert('Checkout failed. Please try again.')
    } finally {
      setCheckingOut(false)
    }
  }, [cart, products, checkingOut])

  return (
    <div className="min-h-screen bg-gray-50" dir={isRTL ? 'rtl' : 'ltr'} style={{ fontFamily: isRTL ? 'IBM Plex Sans Arabic, sans-serif' : 'Anybody, sans-serif' }}>
      {/* Floating Navbar */}
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
            <Link href="/" className="text-sm font-medium text-gray-600 hover:text-[#1C1917]">Home</Link>
            <Link href="/blog" className="text-sm font-medium text-gray-600 hover:text-[#1C1917]">Blog</Link>
            <Link href="/shop" className="text-sm font-medium text-[#1C1917]">Shop</Link>
          </div>

          {/* Cart Button */}
          <button className="relative p-2.5 bg-[#1C1917] text-white rounded-full">
            <ShoppingCart className="w-5 h-5" />
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#C8322B] rounded-full text-xs flex items-center justify-center">
                {cart.length}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Hero Section */}
      <div className="pt-24 pb-12 bg-gradient-to-b from-[#1C1917] to-[#3D3835]">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">{t.title}</h1>
          <p className="text-xl text-gray-300 mb-8">{t.subtitle}</p>

          {/* Trust Badges */}
          <div className="flex items-center justify-center gap-8 flex-wrap">
            <div className="flex items-center gap-2 text-gray-300">
              <Download className="w-5 h-5 text-[#C8322B]" />
              <span className="text-sm">{t.instantDownload}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-300">
              <Check className="w-5 h-5 text-green-500" />
              <span className="text-sm">{t.securePayment}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-300">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span className="text-sm">{t.lifetime}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="sticky top-20 z-40 bg-white shadow-sm py-4 border-b">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Categories */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {categories.map((cat) => {
                const Icon = cat.icon
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                      selectedCategory === cat.id
                        ? 'bg-[#1C1917] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {cat.label[locale]}
                  </button>
                )
              })}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={t.search}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-64 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-[#C8322B]/20 focus:border-[#C8322B]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-[#C8322B] animate-spin" />
            <span className="ml-3 text-gray-500">{t.loading}</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProducts.map((product) => {
              const sym = currencySymbol(product.currency)
              return (
                <div key={product.id} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow border border-gray-100">
                  {/* Image */}
                  <Link href={`/shop/${product.slug}`}>
                    <div className="relative h-48">
                      {product.image ? (
                        <Image src={product.image} alt={isRTL ? (product.name_ar || product.name_en) : product.name_en} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[#1C1917] to-[#C8322B] flex items-center justify-center">
                          <FileText className="w-16 h-16 text-white/30" />
                        </div>
                      )}
                      {product.featured && (
                        <span className="absolute top-3 left-3 px-3 py-1 bg-[#C8322B] text-white text-xs font-semibold rounded-full">
                          {isRTL ? 'مميز' : 'Featured'}
                        </span>
                      )}
                      {product.originalPrice && (
                        <span className="absolute top-3 right-3 px-3 py-1 bg-green-500 text-white text-xs font-semibold rounded-full">
                          {Math.round((1 - product.price / product.originalPrice) * 100)}% Off
                        </span>
                      )}
                    </div>
                  </Link>

                  {/* Content */}
                  <div className="p-6">
                    {/* Sales count */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                        <span className="text-sm font-semibold">{product.salesCount}</span>
                      </div>
                      <span className="text-sm text-gray-400">{t.sold}</span>
                    </div>

                    {/* Title */}
                    <Link href={`/shop/${product.slug}`}>
                      <h3 className="text-lg font-bold text-[#1C1917] mb-2 hover:text-[#C8322B] transition-colors">
                        {isRTL ? (product.name_ar || product.name_en) : product.name_en}
                      </h3>
                    </Link>

                    {/* Description */}
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {isRTL ? (product.description_ar || product.description_en) : product.description_en}
                    </p>

                    {/* Features */}
                    <div className="flex flex-wrap gap-2 mb-5">
                      {(product.features as string[]).slice(0, 3).map((feature, i) => (
                        <span key={i} className="px-2 py-1 bg-gray-100 text-xs text-gray-600 rounded">
                          {feature}
                        </span>
                      ))}
                    </div>

                    {/* Price & CTA */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-[#1C1917]">{sym}{product.price.toFixed(2)}</span>
                        {product.originalPrice && (
                          <span className="text-sm text-gray-400 line-through">{sym}{product.originalPrice.toFixed(2)}</span>
                        )}
                      </div>
                      <button
                        onClick={() => addToCart(product.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors ${
                          cart.includes(product.id)
                            ? 'bg-green-500 text-white'
                            : 'bg-[#C8322B] hover:bg-[#a82520] text-white'
                        }`}
                      >
                        {cart.includes(product.id) ? (
                          <>
                            <Check className="w-4 h-4" /> Added
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="w-4 h-4" /> {t.addToCart}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Floating Cart Summary */}
      {cart.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="flex items-center gap-4 px-6 py-4 bg-[#1C1917] text-white rounded-full shadow-2xl">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              <span className="font-medium">{cart.length} items</span>
            </div>
            <div className="w-px h-6 bg-gray-600" />
            <span className="text-lg font-bold">£{cartTotal.toFixed(2)}</span>
            <button
              onClick={handleCheckout}
              disabled={checkingOut}
              className="flex items-center gap-2 px-4 py-2 bg-[#C8322B] rounded-full font-semibold hover:bg-[#a82520] transition-colors disabled:opacity-50"
            >
              {checkingOut ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {t.checkout} <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-[#1C1917] text-white py-12 mt-16">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center relative">
              <span className="text-[#1C1917] font-bold text-lg">Y</span>
              <span className="absolute top-2 right-2 w-2 h-2 bg-[#C8322B] rounded-full"></span>
            </div>
            <span className="text-2xl font-bold">Yalla<span className="font-normal text-gray-400">London</span></span>
          </div>
          <p className="text-gray-400 mb-6">Your trusted guide to exploring London</p>
          <div className="text-gray-500 text-sm">
            &copy; 2026 Yalla London. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
