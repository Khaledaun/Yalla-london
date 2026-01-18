'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Download, Star, ShoppingCart, Check, Filter, Search,
  ChevronDown, MapPin, Utensils, Plane, ShoppingBag,
  FileText, Crown, Sparkles, ArrowRight, Menu, X
} from 'lucide-react'
import { useLanguage } from '@/components/language-provider'

// Product categories
const categories = [
  { id: 'all', label: { en: 'All Products', ar: 'جميع المنتجات' }, icon: FileText },
  { id: 'guides', label: { en: 'Travel Guides', ar: 'أدلة السفر' }, icon: MapPin },
  { id: 'food', label: { en: 'Food & Dining', ar: 'الطعام والمطاعم' }, icon: Utensils },
  { id: 'shopping', label: { en: 'Shopping', ar: 'التسوق' }, icon: ShoppingBag },
  { id: 'bundles', label: { en: 'Bundle Deals', ar: 'عروض الباقات' }, icon: Crown },
]

// Products data
const products = {
  en: [
    {
      id: '1',
      title: 'Complete London Guide 2026',
      description: 'The ultimate 45-page guide covering everything you need to know for your London visit. Includes halal restaurants, prayer facilities, attractions, and insider tips.',
      price: 9.99,
      originalPrice: 14.99,
      category: 'guides',
      image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600&q=80',
      badge: 'Bestseller',
      pages: 45,
      rating: 4.9,
      reviews: 234,
      features: ['45 Pages', 'Printable PDF', 'Offline Maps', 'Regular Updates']
    },
    {
      id: '2',
      title: 'Halal Restaurant Guide London',
      description: 'Discover 100+ halal restaurants across London. From fine dining to street food, organized by cuisine, location, and price range.',
      price: 7.99,
      originalPrice: null,
      category: 'food',
      image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=80',
      badge: 'New',
      pages: 32,
      rating: 4.8,
      reviews: 156,
      features: ['100+ Restaurants', 'Location Maps', 'Price Ranges', 'Review Scores']
    },
    {
      id: '3',
      title: 'London Shopping Secrets',
      description: 'Your insider guide to shopping in London. Best boutiques, outlet deals, tax-free shopping tips, and exclusive discount codes.',
      price: 6.99,
      originalPrice: 9.99,
      category: 'shopping',
      image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&q=80',
      badge: '30% Off',
      pages: 28,
      rating: 4.7,
      reviews: 189,
      features: ['28 Pages', 'Discount Codes', 'Store Directory', 'Sale Calendar']
    },
    {
      id: '4',
      title: 'Family London Adventure Pack',
      description: 'Complete family travel bundle with kid-friendly attractions, family restaurants, and activity guides.',
      price: 14.99,
      originalPrice: 24.99,
      category: 'bundles',
      image: 'https://images.unsplash.com/photo-1529655683826-aba9b3e77383?w=600&q=80',
      badge: 'Best Value',
      pages: 60,
      rating: 4.9,
      reviews: 312,
      features: ['3 Guides in 1', 'Activity Sheets', 'Family Discounts', 'Itineraries']
    },
    {
      id: '5',
      title: 'Prayer Times & Mosques Guide',
      description: 'Comprehensive guide to mosques and prayer facilities across London. Includes Jummah times, Eid gatherings, and Islamic centers.',
      price: 4.99,
      originalPrice: null,
      category: 'guides',
      image: 'https://images.unsplash.com/photo-1564769625392-651b89c75a66?w=600&q=80',
      badge: null,
      pages: 18,
      rating: 4.8,
      reviews: 98,
      features: ['50+ Mosques', 'Prayer Times', 'Directions', 'Contact Info']
    },
    {
      id: '6',
      title: 'Ultimate London Bundle',
      description: 'All our guides in one discounted package. Save 40% and get everything you need for the perfect London experience.',
      price: 29.99,
      originalPrice: 49.99,
      category: 'bundles',
      image: 'https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=600&q=80',
      badge: 'Save 40%',
      pages: 150,
      rating: 5.0,
      reviews: 87,
      features: ['5 Guides', 'Lifetime Updates', 'Priority Support', 'Bonus Content']
    },
  ],
  ar: [
    {
      id: '1',
      title: 'دليل لندن الشامل 2026',
      description: 'الدليل النهائي المؤلف من 45 صفحة يغطي كل ما تحتاج معرفته لزيارتك للندن. يشمل المطاعم الحلال ومرافق الصلاة والمعالم السياحية.',
      price: 9.99,
      originalPrice: 14.99,
      category: 'guides',
      image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600&q=80',
      badge: 'الأكثر مبيعاً',
      pages: 45,
      rating: 4.9,
      reviews: 234,
      features: ['45 صفحة', 'PDF قابل للطباعة', 'خرائط بدون إنترنت', 'تحديثات مستمرة']
    },
    {
      id: '2',
      title: 'دليل المطاعم الحلال في لندن',
      description: 'اكتشف أكثر من 100 مطعم حلال في لندن. من المطاعم الفاخرة إلى الوجبات السريعة، منظمة حسب المطبخ والموقع والأسعار.',
      price: 7.99,
      originalPrice: null,
      category: 'food',
      image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=80',
      badge: 'جديد',
      pages: 32,
      rating: 4.8,
      reviews: 156,
      features: ['100+ مطعم', 'خرائط المواقع', 'نطاقات الأسعار', 'تقييمات']
    },
    {
      id: '3',
      title: 'أسرار التسوق في لندن',
      description: 'دليلك للتسوق في لندن. أفضل المحلات والعروض ونصائح التسوق المعفى من الضرائب وأكواد الخصم الحصرية.',
      price: 6.99,
      originalPrice: 9.99,
      category: 'shopping',
      image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&q=80',
      badge: 'خصم 30%',
      pages: 28,
      rating: 4.7,
      reviews: 189,
      features: ['28 صفحة', 'أكواد خصم', 'دليل المتاجر', 'جدول التخفيضات']
    },
    {
      id: '4',
      title: 'حزمة مغامرة العائلة في لندن',
      description: 'باقة سفر عائلية كاملة مع معالم مناسبة للأطفال ومطاعم عائلية وأدلة أنشطة.',
      price: 14.99,
      originalPrice: 24.99,
      category: 'bundles',
      image: 'https://images.unsplash.com/photo-1529655683826-aba9b3e77383?w=600&q=80',
      badge: 'أفضل قيمة',
      pages: 60,
      rating: 4.9,
      reviews: 312,
      features: ['3 أدلة في 1', 'أوراق أنشطة', 'خصومات عائلية', 'برامج رحلات']
    },
    {
      id: '5',
      title: 'دليل أوقات الصلاة والمساجد',
      description: 'دليل شامل للمساجد ومرافق الصلاة في لندن. يشمل أوقات الجمعة وتجمعات العيد والمراكز الإسلامية.',
      price: 4.99,
      originalPrice: null,
      category: 'guides',
      image: 'https://images.unsplash.com/photo-1564769625392-651b89c75a66?w=600&q=80',
      badge: null,
      pages: 18,
      rating: 4.8,
      reviews: 98,
      features: ['50+ مسجد', 'أوقات الصلاة', 'اتجاهات', 'معلومات الاتصال']
    },
    {
      id: '6',
      title: 'الباقة الكاملة للندن',
      description: 'جميع أدلتنا في حزمة واحدة بخصم. وفر 40% واحصل على كل ما تحتاجه لتجربة لندن المثالية.',
      price: 29.99,
      originalPrice: 49.99,
      category: 'bundles',
      image: 'https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=600&q=80',
      badge: 'وفر 40%',
      pages: 150,
      rating: 5.0,
      reviews: 87,
      features: ['5 أدلة', 'تحديثات مدى الحياة', 'دعم أولوية', 'محتوى إضافي']
    },
  ]
}

const text = {
  en: {
    title: 'Digital Guides Shop',
    subtitle: 'Expert guides crafted for Arab visitors to London',
    search: 'Search guides...',
    filter: 'Filter',
    addToCart: 'Add to Cart',
    download: 'Download Now',
    pages: 'pages',
    reviews: 'reviews',
    features: 'What\'s Included',
    popular: 'Popular',
    new: 'New',
    sale: 'Sale',
    cartTitle: 'Your Cart',
    checkout: 'Checkout',
    emptyCart: 'Your cart is empty',
    instantDownload: 'Instant digital download',
    securePayment: 'Secure payment',
    lifetime: 'Lifetime access',
  },
  ar: {
    title: 'متجر الأدلة الرقمية',
    subtitle: 'أدلة متخصصة مصممة للزوار العرب في لندن',
    search: 'ابحث في الأدلة...',
    filter: 'تصفية',
    addToCart: 'أضف للسلة',
    download: 'تحميل الآن',
    pages: 'صفحة',
    reviews: 'تقييم',
    features: 'ماذا يتضمن',
    popular: 'شائع',
    new: 'جديد',
    sale: 'تخفيض',
    cartTitle: 'سلة التسوق',
    checkout: 'إتمام الشراء',
    emptyCart: 'سلتك فارغة',
    instantDownload: 'تحميل رقمي فوري',
    securePayment: 'دفع آمن',
    lifetime: 'وصول مدى الحياة',
  }
}

export default function ShopPage() {
  const { language } = useLanguage()
  const locale = (language || 'en') as 'en' | 'ar'
  const isRTL = locale === 'ar'
  const t = text[locale]

  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [cart, setCart] = useState<string[]>([])
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const filteredProducts = products[locale].filter(product => {
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory
    const matchesSearch = !searchQuery ||
      product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const addToCart = (id: string) => {
    if (!cart.includes(id)) {
      setCart([...cart, id])
    }
  }

  const cartTotal = cart.reduce((sum, id) => {
    const product = products[locale].find(p => p.id === id)
    return sum + (product?.price || 0)
  }, 0)

  return (
    <div className="min-h-screen bg-gray-50" dir={isRTL ? 'rtl' : 'ltr'} style={{ fontFamily: isRTL ? 'Cairo, sans-serif' : 'Plus Jakarta Sans, sans-serif' }}>
      {/* Floating Navbar */}
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

          {/* Cart Button */}
          <button className="relative p-2.5 bg-[#1A1F36] text-white rounded-full">
            <ShoppingCart className="w-5 h-5" />
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#E8634B] rounded-full text-xs flex items-center justify-center">
                {cart.length}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Hero Section */}
      <div className="pt-24 pb-12 bg-gradient-to-b from-[#1A1F36] to-[#2d3452]">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">{t.title}</h1>
          <p className="text-xl text-gray-300 mb-8">{t.subtitle}</p>

          {/* Trust Badges */}
          <div className="flex items-center justify-center gap-8 flex-wrap">
            <div className="flex items-center gap-2 text-gray-300">
              <Download className="w-5 h-5 text-[#E8634B]" />
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
                        ? 'bg-[#1A1F36] text-white'
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
                className="pl-10 pr-4 py-2 w-64 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-[#E8634B]/20 focus:border-[#E8634B]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredProducts.map((product) => (
            <div key={product.id} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow border border-gray-100">
              {/* Image */}
              <div className="relative h-48">
                <Image src={product.image} alt={product.title} fill className="object-cover" />
                {product.badge && (
                  <span className="absolute top-3 left-3 px-3 py-1 bg-[#E8634B] text-white text-xs font-semibold rounded-full">
                    {product.badge}
                  </span>
                )}
                <div className="absolute bottom-3 right-3 px-2 py-1 bg-white/90 backdrop-blur rounded-full text-xs font-semibold">
                  {product.pages} {t.pages}
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                {/* Rating */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span className="text-sm font-semibold">{product.rating}</span>
                  </div>
                  <span className="text-sm text-gray-400">({product.reviews} {t.reviews})</span>
                </div>

                {/* Title */}
                <h3 className="text-lg font-bold text-[#1A1F36] mb-2">{product.title}</h3>

                {/* Description */}
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{product.description}</p>

                {/* Features */}
                <div className="flex flex-wrap gap-2 mb-5">
                  {product.features.slice(0, 3).map((feature, i) => (
                    <span key={i} className="px-2 py-1 bg-gray-100 text-xs text-gray-600 rounded">
                      {feature}
                    </span>
                  ))}
                </div>

                {/* Price & CTA */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-[#1A1F36]">£{product.price}</span>
                    {product.originalPrice && (
                      <span className="text-sm text-gray-400 line-through">£{product.originalPrice}</span>
                    )}
                  </div>
                  <button
                    onClick={() => addToCart(product.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors ${
                      cart.includes(product.id)
                        ? 'bg-green-500 text-white'
                        : 'bg-[#E8634B] hover:bg-[#d4543d] text-white'
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
          ))}
        </div>
      </div>

      {/* Floating Cart Summary */}
      {cart.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="flex items-center gap-4 px-6 py-4 bg-[#1A1F36] text-white rounded-full shadow-2xl">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              <span className="font-medium">{cart.length} items</span>
            </div>
            <div className="w-px h-6 bg-gray-600" />
            <span className="text-lg font-bold">£{cartTotal.toFixed(2)}</span>
            <button className="flex items-center gap-2 px-4 py-2 bg-[#E8634B] rounded-full font-semibold hover:bg-[#d4543d] transition-colors">
              {t.checkout} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-[#1A1F36] text-white py-12 mt-16">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center relative">
              <span className="text-[#1A1F36] font-bold text-lg">Y</span>
              <span className="absolute top-2 right-2 w-2 h-2 bg-[#E8634B] rounded-full"></span>
            </div>
            <span className="text-2xl font-bold">Yalla<span className="font-normal text-gray-400">London</span></span>
          </div>
          <p className="text-gray-400 mb-6">Your trusted guide to exploring London</p>
          <div className="text-gray-500 text-sm">
            © 2026 Yalla London. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
