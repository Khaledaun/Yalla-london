'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Facebook, Instagram, Twitter, Youtube, MapPin, Mail, Phone } from 'lucide-react'

interface AkeaFooterProps {
  locale?: 'en' | 'ar'
}

// Instagram feed placeholders - in production, connect to Instagram API
const instagramImages = [
  'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1529180184525-78f99adb8e98?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1529604278261-8bfcdb00a7b9?w=400&h=400&fit=crop&q=80',
]

export function AkeaFooter({ locale = 'en' }: AkeaFooterProps) {
  const isRTL = locale === 'ar'
  const currentYear = new Date().getFullYear()

  const text = {
    en: {
      tagline: 'Your Guide to London',
      description: 'Yalla London is your ultimate guide to experiencing London through an Arabic lens. Discover the best halal restaurants, cultural events, hidden gems, and everything you need to make the most of your time in this incredible city.',
      quickLinks: 'Quick Links',
      categories: 'Categories',
      contact: 'Contact Us',
      instagram: 'My New Stories',
      home: 'Home',
      about: 'About',
      blog: 'Blog',
      contact_link: 'Contact',
      privacy: 'Privacy Policy',
      terms: 'Terms of Service',
      food: 'Food & Dining',
      travel: 'Travel',
      events: 'Events',
      shopping: 'Shopping',
      lifestyle: 'Lifestyle',
      copyright: `© ${currentYear} Yalla London. All rights reserved.`,
      designedBy: 'Designed with love in London',
    },
    ar: {
      tagline: 'دليلك إلى لندن',
      description: 'يلا لندن هو دليلك الشامل لاستكشاف لندن من منظور عربي. اكتشف أفضل المطاعم الحلال والفعاليات الثقافية والأماكن المخفية وكل ما تحتاجه للاستمتاع بوقتك في هذه المدينة الرائعة.',
      quickLinks: 'روابط سريعة',
      categories: 'التصنيفات',
      contact: 'اتصل بنا',
      instagram: 'قصصي الجديدة',
      home: 'الرئيسية',
      about: 'من نحن',
      blog: 'المدونة',
      contact_link: 'اتصل بنا',
      privacy: 'سياسة الخصوصية',
      terms: 'شروط الخدمة',
      food: 'طعام و مطاعم',
      travel: 'سفر',
      events: 'فعاليات',
      shopping: 'تسوق',
      lifestyle: 'نمط الحياة',
      copyright: `© ${currentYear} يلا لندن. جميع الحقوق محفوظة.`,
      designedBy: 'صمم بحب في لندن',
    }
  }

  const t = text[locale]

  return (
    <footer className="bg-gray-900" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Instagram Section */}
      <div className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h3 className="text-lg font-serif text-white mb-4 text-center">
            {t.instagram}
          </h3>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-1">
            {instagramImages.map((image, index) => (
              <a
                key={index}
                href="https://instagram.com/yallalondon"
                target="_blank"
                rel="noopener noreferrer"
                className="relative aspect-square overflow-hidden group"
              >
                <Image
                  src={image}
                  alt={`Instagram ${index + 1}`}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-orange-500/0 group-hover:bg-orange-500/50 transition-colors flex items-center justify-center">
                  <Instagram className="text-white opacity-0 group-hover:opacity-100 transition-opacity" size={24} />
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand Column */}
          <div className="lg:col-span-1">
            <Link href={locale === 'ar' ? '/ar' : '/'} className="inline-block mb-4">
              <span className="text-3xl font-serif font-bold text-white">
                Yalla<span className="text-orange-500">.</span>
              </span>
            </Link>
            <p className="text-sm text-orange-400 mb-4">{t.tagline}</p>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              {t.description}
            </p>
            <div className="flex items-center gap-3">
              <a
                href="https://facebook.com/yallalondon"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-gray-800 text-gray-400 flex items-center justify-center hover:bg-orange-500 hover:text-white transition-colors"
              >
                <Facebook size={16} />
              </a>
              <a
                href="https://instagram.com/yallalondon"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-gray-800 text-gray-400 flex items-center justify-center hover:bg-orange-500 hover:text-white transition-colors"
              >
                <Instagram size={16} />
              </a>
              <a
                href="https://twitter.com/yallalondon"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-gray-800 text-gray-400 flex items-center justify-center hover:bg-orange-500 hover:text-white transition-colors"
              >
                <Twitter size={16} />
              </a>
              <a
                href="https://youtube.com/yallalondon"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-gray-800 text-gray-400 flex items-center justify-center hover:bg-orange-500 hover:text-white transition-colors"
              >
                <Youtube size={16} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-medium mb-4 pb-2 border-b border-gray-800">
              {t.quickLinks}
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href={locale === 'ar' ? '/ar' : '/'} className="text-gray-400 hover:text-orange-500 transition-colors text-sm">
                  {t.home}
                </Link>
              </li>
              <li>
                <Link href={`/${locale === 'ar' ? 'ar/' : ''}about`} className="text-gray-400 hover:text-orange-500 transition-colors text-sm">
                  {t.about}
                </Link>
              </li>
              <li>
                <Link href={`/${locale === 'ar' ? 'ar/' : ''}blog`} className="text-gray-400 hover:text-orange-500 transition-colors text-sm">
                  {t.blog}
                </Link>
              </li>
              <li>
                <Link href={`/${locale === 'ar' ? 'ar/' : ''}contact`} className="text-gray-400 hover:text-orange-500 transition-colors text-sm">
                  {t.contact_link}
                </Link>
              </li>
              <li>
                <Link href={`/${locale === 'ar' ? 'ar/' : ''}privacy`} className="text-gray-400 hover:text-orange-500 transition-colors text-sm">
                  {t.privacy}
                </Link>
              </li>
              <li>
                <Link href={`/${locale === 'ar' ? 'ar/' : ''}terms`} className="text-gray-400 hover:text-orange-500 transition-colors text-sm">
                  {t.terms}
                </Link>
              </li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h4 className="text-white font-medium mb-4 pb-2 border-b border-gray-800">
              {t.categories}
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href={`/${locale === 'ar' ? 'ar/' : ''}blog?category=food`} className="text-gray-400 hover:text-orange-500 transition-colors text-sm">
                  {t.food}
                </Link>
              </li>
              <li>
                <Link href={`/${locale === 'ar' ? 'ar/' : ''}blog?category=travel`} className="text-gray-400 hover:text-orange-500 transition-colors text-sm">
                  {t.travel}
                </Link>
              </li>
              <li>
                <Link href={`/${locale === 'ar' ? 'ar/' : ''}events`} className="text-gray-400 hover:text-orange-500 transition-colors text-sm">
                  {t.events}
                </Link>
              </li>
              <li>
                <Link href={`/${locale === 'ar' ? 'ar/' : ''}blog?category=shopping`} className="text-gray-400 hover:text-orange-500 transition-colors text-sm">
                  {t.shopping}
                </Link>
              </li>
              <li>
                <Link href={`/${locale === 'ar' ? 'ar/' : ''}blog?category=lifestyle`} className="text-gray-400 hover:text-orange-500 transition-colors text-sm">
                  {t.lifestyle}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-medium mb-4 pb-2 border-b border-gray-800">
              {t.contact}
            </h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-sm text-gray-400">
                <MapPin size={18} className="text-orange-500 flex-shrink-0 mt-0.5" />
                <span>London, United Kingdom</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-gray-400">
                <Mail size={18} className="text-orange-500 flex-shrink-0" />
                <a href="mailto:hello@yallalondon.com" className="hover:text-orange-500 transition-colors">
                  hello@yallalondon.com
                </a>
              </li>
              <li className="flex items-center gap-3 text-sm text-gray-400">
                <Phone size={18} className="text-orange-500 flex-shrink-0" />
                <a href="tel:+442012345678" className="hover:text-orange-500 transition-colors">
                  +44 20 1234 5678
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-500 text-sm">
              {t.copyright}
            </p>
            <p className="text-gray-500 text-sm">
              {t.designedBy} 🧡
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
