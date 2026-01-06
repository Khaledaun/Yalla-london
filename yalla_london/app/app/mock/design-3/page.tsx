'use client'

/**
 * Design 3: Modern Arabic Luxury
 * Inspired by: Emirates, Emaar, Qatar Airways, Jumeirah
 * Contemporary minimalism with Arabic design elements, warm gold accents
 */

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

export default function ModernArabicLuxuryDesign() {
  const [language, setLanguage] = useState<'en' | 'ar'>('en')
  const isRTL = language === 'ar'

  const content = {
    en: {
      nav: ['Explore', 'Dine', 'Stay', 'Shop', 'Experiences'],
      hero: {
        subtitle: 'Welcome to',
        title: 'Your London',
        tagline: 'Curated luxury experiences for distinguished travelers',
        cta: 'Start Your Journey'
      },
      services: [
        { title: 'Fine Dining', desc: 'Halal certified restaurants' },
        { title: 'Luxury Hotels', desc: 'Arabic-speaking concierge' },
        { title: 'Private Shopping', desc: 'VIP access & personal stylists' },
        { title: 'Concierge', desc: '24/7 dedicated service' }
      ]
    },
    ar: {
      nav: ['استكشف', 'تناول الطعام', 'الإقامة', 'التسوق', 'التجارب'],
      hero: {
        subtitle: 'مرحباً بكم في',
        title: 'لندنكم',
        tagline: 'تجارب فاخرة منتقاة للمسافرين المميزين',
        cta: 'ابدأ رحلتك'
      },
      services: [
        { title: 'المطاعم الفاخرة', desc: 'مطاعم حلال معتمدة' },
        { title: 'الفنادق الفاخرة', desc: 'كونسيرج يتحدث العربية' },
        { title: 'التسوق الخاص', desc: 'وصول VIP ومصممين شخصيين' },
        { title: 'الكونسيرج', desc: 'خدمة مخصصة على مدار الساعة' }
      ]
    }
  }

  const t = content[language]

  return (
    <div className={`min-h-screen bg-[#0A0A0A] text-white ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Geometric Pattern Overlay */}
      <div
        className="fixed inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23D4AF37' fill-opacity='1'%3E%3Cpath d='M30 30l15-15v30l-15-15zm0 0l-15 15V15l15 15z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0A0A0A]/80 backdrop-blur-xl border-b border-[#D4AF37]/20">
        <div className="max-w-[1400px] mx-auto px-8 py-5 flex items-center justify-between">
          {/* Logo with Arabic Calligraphy Style */}
          <Link href="/mock/design-3" className="flex items-center gap-4">
            <div className="w-12 h-12 border border-[#D4AF37] flex items-center justify-center">
              <span className="text-[#D4AF37] font-serif text-xl">ي</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xl tracking-[0.3em] font-light">YALLA</span>
              <span className="text-xs tracking-[0.4em] text-[#D4AF37]">LONDON</span>
            </div>
          </Link>

          {/* Center Navigation */}
          <div className="hidden lg:flex items-center gap-10">
            {t.nav.map((item, i) => (
              <a
                key={i}
                href="#"
                className="text-sm text-white/60 hover:text-[#D4AF37] transition tracking-wide"
              >
                {item}
              </a>
            ))}
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-6">
            {/* Language Toggle */}
            <button
              onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
              className="flex items-center gap-2 text-sm text-white/60 hover:text-[#D4AF37] transition"
            >
              <span className={language === 'en' ? 'text-[#D4AF37]' : ''}>EN</span>
              <span className="text-white/30">|</span>
              <span className={language === 'ar' ? 'text-[#D4AF37]' : ''}>عربي</span>
            </button>

            <button className="bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-black px-6 py-3 text-sm tracking-wider font-medium hover:shadow-[0_0_30px_rgba(212,175,55,0.3)] transition">
              {language === 'en' ? 'Book Concierge' : 'احجز الكونسيرج'}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-20">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1920"
            alt="London"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0A] via-[#0A0A0A]/80 to-transparent" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-[1400px] mx-auto px-8 w-full">
          <div className="max-w-2xl">
            {/* Decorative Line */}
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-[1px] bg-[#D4AF37]" />
              <span className="text-[#D4AF37] text-sm tracking-[0.4em] uppercase">
                {t.hero.subtitle}
              </span>
            </div>

            {/* Main Title */}
            <h1 className={`${isRTL ? 'text-6xl md:text-8xl' : 'text-7xl md:text-9xl'} font-extralight leading-none mb-8`}>
              <span className="text-white">{t.hero.title.split(' ')[0]}</span>
              <br />
              <span className="text-[#D4AF37]">{t.hero.title.split(' ').slice(1).join(' ')}</span>
            </h1>

            <p className="text-xl text-white/60 leading-relaxed mb-12 max-w-lg">
              {t.hero.tagline}
            </p>

            {/* CTA Buttons */}
            <div className="flex items-center gap-6">
              <button className="group flex items-center gap-4 bg-[#D4AF37] text-black px-8 py-4 tracking-wider font-medium hover:shadow-[0_0_40px_rgba(212,175,55,0.4)] transition">
                {t.hero.cta}
                <svg className={`w-5 h-5 ${isRTL ? 'rotate-180 group-hover:-translate-x-2' : 'group-hover:translate-x-2'} transition`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </button>
              <button className="text-white/60 hover:text-white flex items-center gap-3 transition">
                <div className="w-14 h-14 border border-white/30 rounded-full flex items-center justify-center hover:border-[#D4AF37] hover:bg-[#D4AF37]/10 transition">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
                <span className="text-sm tracking-wide">{language === 'en' ? 'Watch Story' : 'شاهد القصة'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4">
          <div className="w-[1px] h-20 bg-gradient-to-b from-transparent via-[#D4AF37] to-transparent" />
          <span className="text-xs tracking-[0.3em] text-[#D4AF37] uppercase">
            {language === 'en' ? 'Discover' : 'اكتشف'}
          </span>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-32 px-8 bg-[#0A0A0A]">
        <div className="max-w-[1400px] mx-auto">
          {/* Section Header */}
          <div className="text-center mb-20">
            <span className="text-[#D4AF37] text-sm tracking-[0.4em] uppercase">
              {language === 'en' ? 'Our Services' : 'خدماتنا'}
            </span>
            <h2 className="text-4xl md:text-5xl font-extralight mt-4">
              {language === 'en' ? 'Exceptional Experiences' : 'تجارب استثنائية'}
            </h2>
          </div>

          {/* Services Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {t.services.map((service, i) => (
              <div
                key={i}
                className="group p-8 border border-white/10 hover:border-[#D4AF37]/50 bg-gradient-to-b from-white/5 to-transparent transition-all duration-500 hover:shadow-[0_0_60px_rgba(212,175,55,0.1)]"
              >
                {/* Icon */}
                <div className="w-16 h-16 border border-[#D4AF37]/30 flex items-center justify-center mb-6 group-hover:bg-[#D4AF37]/10 transition">
                  <span className="text-[#D4AF37] text-2xl">
                    {['🍽', '🏨', '🛍', '⭐'][i]}
                  </span>
                </div>
                <h3 className="text-xl font-light mb-3 group-hover:text-[#D4AF37] transition">
                  {service.title}
                </h3>
                <p className="text-white/50 text-sm leading-relaxed">{service.desc}</p>

                {/* Arrow */}
                <div className={`mt-6 flex items-center gap-2 text-[#D4AF37] opacity-0 group-hover:opacity-100 transition ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <span className="text-sm">{language === 'en' ? 'Explore' : 'استكشف'}</span>
                  <svg className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Destinations */}
      <section className="py-32 px-8 bg-[#0F0F0F]">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Content */}
            <div>
              <span className="text-[#D4AF37] text-sm tracking-[0.4em] uppercase">
                {language === 'en' ? 'Featured' : 'مميز'}
              </span>
              <h2 className="text-4xl md:text-5xl font-extralight mt-4 mb-8 leading-tight">
                {language === 'en'
                  ? 'Halal Fine Dining at Its Finest'
                  : 'المطاعم الفاخرة الحلال في أفضل حالاتها'
                }
              </h2>
              <p className="text-white/60 text-lg leading-relaxed mb-8">
                {language === 'en'
                  ? 'Discover London\'s most prestigious halal restaurants. From Novikov to Zuma, every venue has been personally vetted for quality, authenticity, and exceptional service.'
                  : 'اكتشف أرقى المطاعم الحلال في لندن. من نوفيكوف إلى زوما، تم فحص كل مكان شخصياً للجودة والأصالة والخدمة الاستثنائية.'
                }
              </p>

              {/* Features List */}
              <ul className="space-y-4 mb-10">
                {[
                  language === 'en' ? '15+ Michelin-starred venues' : '+15 مطعم حائز على نجوم ميشلان',
                  language === 'en' ? '100% Halal certified' : 'حلال معتمد 100%',
                  language === 'en' ? 'Private dining available' : 'غرف طعام خاصة متوفرة'
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-white/70">
                    <div className="w-2 h-2 bg-[#D4AF37]" />
                    {item}
                  </li>
                ))}
              </ul>

              <button className="bg-transparent border border-[#D4AF37] text-[#D4AF37] px-8 py-4 tracking-wider hover:bg-[#D4AF37] hover:text-black transition">
                {language === 'en' ? 'View All Restaurants' : 'عرض جميع المطاعم'}
              </button>
            </div>

            {/* Image Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="relative aspect-[3/4] overflow-hidden">
                  <Image
                    src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600"
                    alt="Restaurant"
                    fill
                    className="object-cover hover:scale-105 transition duration-700"
                  />
                </div>
                <div className="relative aspect-square overflow-hidden">
                  <Image
                    src="https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400"
                    alt="Tea"
                    fill
                    className="object-cover hover:scale-105 transition duration-700"
                  />
                </div>
              </div>
              <div className="space-y-4 pt-8">
                <div className="relative aspect-square overflow-hidden">
                  <Image
                    src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400"
                    alt="Dining"
                    fill
                    className="object-cover hover:scale-105 transition duration-700"
                  />
                </div>
                <div className="relative aspect-[3/4] overflow-hidden">
                  <Image
                    src="https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600"
                    alt="Hotel"
                    fill
                    className="object-cover hover:scale-105 transition duration-700"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-8 bg-gradient-to-r from-[#D4AF37]/10 via-[#D4AF37]/5 to-transparent border-y border-[#D4AF37]/20">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
            {[
              { number: '250+', label: language === 'en' ? 'Curated Venues' : 'مكان منتقى' },
              { number: '100%', label: language === 'en' ? 'Halal Certified' : 'حلال معتمد' },
              { number: '24/7', label: language === 'en' ? 'Concierge Service' : 'خدمة الكونسيرج' },
              { number: '50K+', label: language === 'en' ? 'Happy Guests' : 'ضيف سعيد' }
            ].map((stat, i) => (
              <div key={i}>
                <span className="text-5xl md:text-6xl font-extralight text-[#D4AF37]">{stat.number}</span>
                <p className="text-white/50 mt-2 text-sm tracking-wide">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-32 px-8 bg-[#0A0A0A]">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-20 h-20 border border-[#D4AF37] mx-auto mb-8 flex items-center justify-center">
            <span className="text-3xl text-[#D4AF37] font-serif">ي</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-extralight mb-4">
            {language === 'en' ? 'Join Our Circle' : 'انضم إلى دائرتنا'}
          </h2>
          <p className="text-white/50 mb-10">
            {language === 'en'
              ? 'Exclusive openings, private events, and curated recommendations.'
              : 'افتتاحات حصرية وفعاليات خاصة وتوصيات منتقاة.'
            }
          </p>
          <div className={`flex gap-3 max-w-md mx-auto ${isRTL ? 'flex-row-reverse' : ''}`}>
            <input
              type="email"
              placeholder={language === 'en' ? 'Your email address' : 'بريدك الإلكتروني'}
              className="flex-1 bg-white/5 border border-white/20 px-5 py-4 text-sm focus:outline-none focus:border-[#D4AF37] transition"
            />
            <button className="bg-[#D4AF37] text-black px-8 py-4 text-sm tracking-wider font-medium hover:shadow-[0_0_30px_rgba(212,175,55,0.3)] transition whitespace-nowrap">
              {language === 'en' ? 'Subscribe' : 'اشترك'}
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-8 border-t border-white/10">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 border border-[#D4AF37] flex items-center justify-center">
                <span className="text-[#D4AF37] font-serif">ي</span>
              </div>
              <span className="text-lg tracking-[0.3em] font-light">YALLA LONDON</span>
            </div>

            {/* Links */}
            <div className="flex items-center gap-8 text-sm text-white/50">
              <a href="#" className="hover:text-[#D4AF37] transition">
                {language === 'en' ? 'About' : 'عنا'}
              </a>
              <a href="#" className="hover:text-[#D4AF37] transition">
                {language === 'en' ? 'Contact' : 'تواصل'}
              </a>
              <a href="#" className="hover:text-[#D4AF37] transition">
                {language === 'en' ? 'Privacy' : 'الخصوصية'}
              </a>
            </div>

            {/* Copyright */}
            <p className="text-white/30 text-sm">© 2025 Yalla London</p>
          </div>
        </div>
      </footer>

      {/* Navigation between designs */}
      <div className={`fixed bottom-8 ${isRTL ? 'left-8' : 'right-8'} flex gap-3`}>
        <Link href="/mock/design-1" className="bg-[#D4AF37] text-black shadow-lg px-4 py-2 text-sm hover:shadow-[0_0_20px_rgba(212,175,55,0.5)] transition">
          ← Design 1
        </Link>
        <Link href="/mock/design-2" className="bg-[#D4AF37] text-black shadow-lg px-4 py-2 text-sm hover:shadow-[0_0_20px_rgba(212,175,55,0.5)] transition">
          ← Design 2
        </Link>
      </div>
    </div>
  )
}
