
'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useLanguage } from './language-provider'
import { getTranslation } from '@/lib/i18n'
import { Instagram, Facebook, Twitter, Youtube, Mail, MapPin, Phone } from 'lucide-react'

export function Footer() {
  const { language, isRTL } = useLanguage()
  const t = (key: string) => getTranslation(language, key)

  const currentYear = new Date().getFullYear()

  const socialLinks = [
    { icon: Instagram, href: 'https://instagram.com/yallalondon', label: 'Instagram', labelAr: 'انستغرام' },
    { icon: Facebook, href: 'https://facebook.com/yallalondon', label: 'Facebook', labelAr: 'فيسبوك' },
    { icon: Twitter, href: 'https://twitter.com/yallalondon', label: 'Twitter', labelAr: 'تويتر' },
    { icon: Youtube, href: 'https://youtube.com/yallalondon', label: 'YouTube', labelAr: 'يوتيوب' },
  ]

  return (
    <footer className={`bg-london-900 text-cream-100 ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Decorative top border */}
      <div className="h-1 w-full bg-gradient-to-r from-transparent via-yalla-gold-400 to-transparent" />

      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Brand Column */}
          <div className="lg:col-span-1">
            <div className="mb-6">
              <Image
                src="/images/yalla-london-logo-white.svg"
                alt="Yalla London"
                width={200}
                height={36}
                className="h-9 w-auto mb-2"
              />
              <p className="text-yalla-gold-400 text-sm font-medium">
                {language === 'en' ? 'Luxury London Guide' : 'دليل لندن الفاخر'}
              </p>
            </div>
            <p className="text-cream-300 mb-6 leading-relaxed">
              {language === 'en'
                ? 'Your curated guide to the finest luxury experiences in London. Discover hidden gems, exclusive events, and unforgettable moments.'
                : 'دليلك المنسق لأفضل التجارب الفاخرة في لندن. اكتشف الكنوز المخفية والفعاليات الحصرية واللحظات التي لا تُنسى.'
              }
            </p>
            {/* Social Links */}
            <div className="flex items-center gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-lg bg-london-800 hover:bg-yalla-gold-400 text-cream-200 hover:text-london-900 flex items-center justify-center transition-all duration-300 hover:-translate-y-1"
                  aria-label={language === 'ar' ? social.labelAr : social.label}
                >
                  <social.icon size={18} />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <span className="w-8 h-0.5 bg-yalla-gold-400" />
              {language === 'en' ? 'Explore' : 'استكشف'}
            </h4>
            <ul className="space-y-3">
              {[
                { href: '/information', en: 'Information Hub', ar: 'مركز المعلومات' },
                { href: '/blog', en: 'London Stories', ar: 'حكايات لندن' },
                { href: '/recommendations', en: 'Recommendations', ar: 'التوصيات' },
                { href: '/events', en: 'Events & Tickets', ar: 'الفعاليات والتذاكر' },
                { href: '/about', en: 'The Founder', ar: 'المؤسس' },
                { href: '/contact', en: 'Contact Us', ar: 'تواصل معنا' },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-cream-300 hover:text-yalla-gold-400 transition-colors duration-300 flex items-center gap-2 group"
                  >
                    <span className="w-0 group-hover:w-2 h-0.5 bg-yalla-gold-400 transition-all duration-300" />
                    {language === 'en' ? link.en : link.ar}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h4 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <span className="w-8 h-0.5 bg-yalla-gold-400" />
              {language === 'en' ? 'Categories' : 'التصنيفات'}
            </h4>
            <ul className="space-y-3">
              {[
                { href: '/blog?category=food', en: 'Food & Dining', ar: 'الطعام والمطاعم' },
                { href: '/blog?category=travel', en: 'Travel & Explore', ar: 'السفر والاستكشاف' },
                { href: '/blog?category=culture', en: 'Culture & Art', ar: 'الثقافة والفن' },
                { href: '/blog?category=shopping', en: 'Style & Shopping', ar: 'الأناقة والتسوق' },
                { href: '/blog?category=lifestyle', en: 'Lifestyle', ar: 'نمط الحياة' },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-cream-300 hover:text-yalla-gold-400 transition-colors duration-300 flex items-center gap-2 group"
                  >
                    <span className="w-0 group-hover:w-2 h-0.5 bg-yalla-gold-400 transition-all duration-300" />
                    {language === 'en' ? link.en : link.ar}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact & Newsletter */}
          <div>
            <h4 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <span className="w-8 h-0.5 bg-yalla-gold-400" />
              {language === 'en' ? 'Stay Connected' : 'ابق على تواصل'}
            </h4>

            {/* Contact Info */}
            <div className="space-y-4 mb-6">
              <a
                href="mailto:hello@yallalondon.com"
                className="flex items-center gap-3 text-cream-300 hover:text-yalla-gold-400 transition-colors"
              >
                <Mail size={18} className="text-yalla-gold-400" />
                <span>hello@yallalondon.com</span>
              </a>
              <div className="flex items-center gap-3 text-cream-300">
                <MapPin size={18} className="text-yalla-gold-400" />
                <span>{language === 'en' ? 'London, United Kingdom' : 'لندن، المملكة المتحدة'}</span>
              </div>
            </div>

            {/* Newsletter */}
            <div className="bg-london-800/50 rounded-xl p-4 border border-yalla-gold-400/10">
              <p className="text-sm text-cream-300 mb-3">
                {language === 'en'
                  ? 'Subscribe to our newsletter for exclusive updates'
                  : 'اشترك في نشرتنا الإخبارية للحصول على تحديثات حصرية'
                }
              </p>
              <form className="flex gap-2">
                <input
                  type="email"
                  placeholder={language === 'en' ? 'Your email' : 'بريدك الإلكتروني'}
                  className="flex-1 px-4 py-2 bg-london-900 border border-yalla-gold-400/20 rounded-lg text-cream-100 placeholder:text-cream-500 focus:outline-none focus:border-yalla-gold-400 transition-colors text-sm"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-yalla-gold-400 text-london-900 rounded-lg font-medium hover:bg-yalla-gold-300 transition-colors"
                >
                  <Mail size={18} />
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Decorative Divider */}
        <div className="flex items-center gap-4 my-8">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-yalla-gold-400/30 to-transparent" />
          <div className="w-2 h-2 bg-yalla-gold-400 rotate-45" />
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-yalla-gold-400/30 to-transparent" />
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-cream-400 text-sm">
            © {currentYear} Yalla London. {language === 'en' ? 'All rights reserved.' : 'جميع الحقوق محفوظة.'}
          </p>
          <div className="flex items-center gap-6 text-sm">
            <Link href="/privacy" className="text-cream-400 hover:text-yalla-gold-400 transition-colors">
              {language === 'en' ? 'Privacy Policy' : 'سياسة الخصوصية'}
            </Link>
            <Link href="/terms" className="text-cream-400 hover:text-yalla-gold-400 transition-colors">
              {language === 'en' ? 'Terms of Use' : 'شروط الاستخدام'}
            </Link>
            <a
              href="mailto:legal@yalla-london.com"
              className="text-cream-400 hover:text-yalla-gold-400 transition-colors"
            >
              {language === 'en' ? 'Legal' : 'القانونية'}
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
