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
import { TriBar, BrandButton, BrandTag, BrandCardLight, SectionLabel, WatermarkStamp, Breadcrumbs } from '@/components/brand-kit'

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
  price: number
  originalPrice: number | null
  currency: string
  type: string
  image: string | null
  features: string[]
  featured: boolean
  salesCount: number
}

// ---------------------------------------------------------------------------
// Fallback products
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

const categoriesList = [
  { id: 'all', label: { en: 'All Products', ar: 'جميع المنتجات' }, icon: FileText },
  { id: 'PDF_GUIDE', label: { en: 'Travel Guides', ar: 'أدلة السفر' }, icon: MapPin },
  { id: 'TEMPLATE', label: { en: 'Templates', ar: 'قوالب' }, icon: Utensils },
  { id: 'BUNDLE', label: { en: 'Bundle Deals', ar: 'عروض الباقات' }, icon: Crown },
  { id: 'SPREADSHEET', label: { en: 'Planners', ar: 'مخططات' }, icon: ShoppingBag },
]

const text = {
  en: {
    title: 'Digital Guides Shop',
    subtitle: 'Expert guides crafted for visitors to London',
    search: 'Search guides...',
    addToCart: 'Add to Cart',
    checkout: 'Checkout',
    instantDownload: 'Instant digital download',
    securePayment: 'Secure payment',
    lifetime: 'Lifetime access',
    loading: 'Loading products...',
    sold: 'sold',
  },
  ar: {
    title: 'متجر الأدلة الرقمية',
    subtitle: 'أدلة متخصصة مصممة للزوار في لندن',
    search: 'ابحث في الأدلة...',
    addToCart: 'أضف للسلة',
    checkout: 'إتمام الشراء',
    instantDownload: 'تحميل رقمي فوري',
    securePayment: 'دفع آمن',
    lifetime: 'وصول مدى الحياة',
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

  useEffect(() => {
    fetch('/api/shop/products')
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to fetch')
        const data = await res.json()
        if (data.products && data.products.length > 0) {
          setProducts(data.products)
        }
      })
      .catch(() => { /* Keep fallback products */ })
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
    if (!cart.includes(id)) setCart([...cart, id])
  }

  const cartTotal = cart.reduce((sum, id) => {
    const product = products.find(p => p.id === id)
    return sum + (product?.price || 0)
  }, 0)

  const currencySymbol = (c: string) => c === 'GBP' ? '£' : c === 'USD' ? '$' : c === 'EUR' ? '€' : c + ' '

  const handleCheckout = useCallback(async () => {
    if (cart.length === 0 || checkingOut) return
    setCheckingOut(true)
    const product = products.find(p => p.id === cart[0])
    if (!product) return
    const email = prompt('Enter your email to complete the purchase:')
    if (!email) { setCheckingOut(false); return }
    try {
      const res = await fetch('/api/checkout/digital-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id, customerEmail: email }),
      })
      const data = await res.json()
      if (data.checkoutUrl) { window.location.href = data.checkoutUrl }
      else if (data.downloadUrl) { window.location.href = data.downloadUrl }
      else { alert(data.error || 'Checkout failed. Please try again.') }
    } catch { alert('Checkout failed. Please try again.') }
    finally { setCheckingOut(false) }
  }, [cart, products, checkingOut])

  return (
    <div className={`bg-yl-cream min-h-screen ${isRTL ? 'font-arabic' : 'font-body'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Hero Section */}
      <section className="bg-yl-dark-navy pt-28 pb-12 relative overflow-hidden">
        <WatermarkStamp />
        <div className="relative z-10 max-w-7xl mx-auto px-7 text-center">
          <Breadcrumbs items={[
            { label: isRTL ? 'الرئيسية' : 'Home', href: '/' },
            { label: isRTL ? 'المتجر' : 'Shop' },
          ]} />
          <SectionLabel>{isRTL ? 'أدلة رقمية' : 'Digital Guides'}</SectionLabel>
          <h1 className="text-4xl md:text-5xl font-heading font-bold text-white mb-4">{t.title}</h1>
          <p className="text-xl text-yl-gray-400 font-body mb-4">{t.subtitle}</p>
          {/* Coming Soon Banner */}
          <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-yl-gold/20 border border-yl-gold/40 rounded-full mb-8">
            <Sparkles className="w-4 h-4 text-yl-gold" />
            <span className="text-sm font-heading font-semibold text-yl-gold">
              {isRTL ? 'قريباً — الأدلة قيد التطوير' : 'Coming Soon — Guides are being prepared'}
            </span>
          </div>

          {/* Trust Badges */}
          <div className="flex items-center justify-center gap-8 flex-wrap">
            <div className="flex items-center gap-2 text-yl-gray-400">
              <Download className="w-5 h-5 text-yl-gold" />
              <span className="text-sm font-body">{t.instantDownload}</span>
            </div>
            <div className="flex items-center gap-2 text-yl-gray-400">
              <Check className="w-5 h-5 text-yl-gold" />
              <span className="text-sm font-body">{t.securePayment}</span>
            </div>
            <div className="flex items-center gap-2 text-yl-gray-400">
              <Sparkles className="w-5 h-5 text-yl-gold" />
              <span className="text-sm font-body">{t.lifetime}</span>
            </div>
          </div>
        </div>
      </section>

      <TriBar />

      {/* Filters & Search */}
      <div className="sticky top-16 z-40 bg-white shadow-sm py-4 border-b border-yl-gray-200">
        <div className="max-w-7xl mx-auto px-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {categoriesList.map((cat) => {
                const Icon = cat.icon
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full font-mono text-[10px] tracking-wider uppercase whitespace-nowrap transition-colors ${
                      selectedCategory === cat.id
                        ? 'bg-yl-dark-navy text-yl-parchment'
                        : 'bg-yl-gray-100 text-yl-gray-500 hover:bg-yl-gray-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {cat.label[locale]}
                  </button>
                )
              })}
            </div>
            <div className="relative">
              <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-yl-gray-500`} />
              <input
                type="text"
                placeholder={t.search}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2 w-64 border border-yl-gray-200 rounded-[14px] font-body focus:outline-none focus:ring-2 focus:ring-yl-gold/30 focus:border-yl-gold`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="max-w-7xl mx-auto px-7 py-12">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-yl-red animate-spin" />
            <span className="ml-3 text-yl-gray-500 font-body">{t.loading}</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProducts.map((product) => {
              const sym = currencySymbol(product.currency)
              return (
                <BrandCardLight key={product.id} className="overflow-hidden group">
                  {/* Image */}
                  <Link href={`/shop/${product.slug}`}>
                    <div className="relative h-48">
                      {product.image ? (
                        <Image src={product.image} alt={isRTL ? (product.name_ar || product.name_en) : product.name_en} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full bg-yl-dark-navy flex items-center justify-center">
                          <FileText className="w-16 h-16 text-white/30" />
                        </div>
                      )}
                      {product.featured && (
                        <div className="absolute top-3 left-3">
                          <BrandTag color="red">{isRTL ? 'مميز' : 'Featured'}</BrandTag>
                        </div>
                      )}
                      {product.originalPrice && (
                        <div className="absolute top-3 right-3">
                          <BrandTag color="blue">
                            {Math.round((1 - product.price / product.originalPrice) * 100)}% Off
                          </BrandTag>
                        </div>
                      )}
                    </div>
                  </Link>

                  {/* Content */}
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Star className="w-4 h-4 text-yl-gold fill-yl-gold" />
                      <span className="font-mono text-[10px] tracking-wider uppercase">
                        {product.salesCount} {t.sold}
                      </span>
                    </div>

                    <Link href={`/shop/${product.slug}`}>
                      <h3 className="text-lg font-heading font-bold text-yl-charcoal mb-2 group-hover:text-yl-red transition-colors">
                        {isRTL ? (product.name_ar || product.name_en) : product.name_en}
                      </h3>
                    </Link>

                    <p className="text-sm text-yl-gray-500 font-body mb-4 line-clamp-2">
                      {isRTL ? (product.description_ar || product.description_en) : product.description_en}
                    </p>

                    <div className="flex flex-wrap gap-2 mb-5">
                      {(product.features as string[]).slice(0, 3).map((feature, i) => (
                        <span key={i} className="px-2 py-1 bg-yl-cream font-mono text-[10px] tracking-wider uppercase text-yl-gray-500 rounded-full border border-yl-gray-200/50">
                          {feature}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-heading font-bold text-yl-charcoal">{sym}{product.price.toFixed(2)}</span>
                        {product.originalPrice && (
                          <span className="text-sm text-yl-gray-500 line-through">{sym}{product.originalPrice.toFixed(2)}</span>
                        )}
                      </div>
                      <button
                        onClick={() => addToCart(product.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-[14px] font-heading font-medium text-sm transition-all ${
                          cart.includes(product.id)
                            ? 'bg-yl-dark-navy text-white'
                            : 'bg-yl-red text-white hover:bg-[#a82924] hover:-translate-y-0.5 shadow-lg'
                        }`}
                      >
                        {cart.includes(product.id) ? (
                          <><Check className="w-4 h-4" /> Added</>
                        ) : (
                          <><ShoppingCart className="w-4 h-4" /> {t.addToCart}</>
                        )}
                      </button>
                    </div>
                  </div>
                </BrandCardLight>
              )
            })}
          </div>
        )}
      </div>

      {/* Floating Cart Summary */}
      {cart.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="flex items-center gap-4 px-6 py-4 bg-yl-dark-navy text-white rounded-full shadow-lg">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              <span className="font-heading font-medium">{cart.length} items</span>
            </div>
            <div className="w-px h-6 bg-white/20" />
            <span className="text-lg font-heading font-bold">£{cartTotal.toFixed(2)}</span>
            <button
              onClick={handleCheckout}
              disabled={checkingOut}
              className="flex items-center gap-2 px-4 py-2 bg-yl-red rounded-full font-heading font-semibold text-sm hover:bg-[#a82924] transition-colors disabled:opacity-50"
            >
              {checkingOut ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>{t.checkout} <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
