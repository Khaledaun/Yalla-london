
'use client'

import Link from 'next/link'
import { useLanguage } from './language-provider'
import { Mail, MapPin } from 'lucide-react'
import { FollowUs } from './follow-us'
import { ENTITY, getCopyrightLine, getBrandDisclosure } from '@/config/entity'
import { SITES, getDefaultSiteId } from '@/config/sites'
import { TriBar } from '@/components/brand-kit'

const SITE_DOMAIN = SITES[getDefaultSiteId()]?.domain || Object.values(SITES)[0]?.domain || 'zenitha.luxury'
const CONTACT_EMAIL = `info@${SITE_DOMAIN}`

export function Footer() {
  const { language, isRTL } = useLanguage()

  return (
    <footer className={`bg-yl-dark-navy text-yl-parchment ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* V2 Tri-color divider */}
      <TriBar />

      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-7 py-10">
        {/* Column grid: 2fr 1fr 1fr 1fr → 2 cols tablet → 1 col mobile */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr] gap-10 mb-8">
          {/* Brand Column */}
          <div>
            <div className="mb-5">
              <span className="font-heading font-bold text-2xl tracking-wider">
                <span className="text-yl-parchment">YALLA</span>
                <span className="text-yl-red ml-1.5">LONDON</span>
              </span>
            </div>
            <p className="font-body text-sm font-light text-yl-gray-400 leading-relaxed mb-5 max-w-sm">
              {language === 'en'
                ? 'Your curated guide to the finest luxury experiences in London. Discover hidden gems, exclusive events, and unforgettable moments.'
                : 'دليلك المنسق لأفضل التجارب الفاخرة في لندن. اكتشف الكنوز المخفية والفعاليات الحصرية واللحظات التي لا تُنسى.'
              }
            </p>
            <FollowUs variant="dark" showLabel={false} size="sm" />
          </div>

          {/* Explore Links */}
          <div>
            <h4 className="font-heading text-xs font-bold text-yl-parchment uppercase tracking-wider mb-4">
              {language === 'en' ? 'Explore' : 'استكشف'}
            </h4>
            <ul className="space-y-2.5">
              {[
                { href: '/information', en: 'Info Hub', ar: 'مركز المعلومات' },
                { href: '/blog', en: 'London Stories', ar: 'حكايات لندن' },
                { href: '/events', en: 'Events & Tickets', ar: 'الفعاليات والتذاكر' },
                { href: '/london-by-foot', en: 'London by Foot', ar: 'لندن سيرًا على الأقدام' },
                { href: '/recommendations', en: 'Recommendations', ar: 'التوصيات' },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="font-mono text-[11px] tracking-wider uppercase text-yl-gray-400 hover:text-yl-gold transition-colors duration-300 ease-yl"
                  >
                    {language === 'en' ? link.en : link.ar}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h4 className="font-heading text-xs font-bold text-yl-parchment uppercase tracking-wider mb-4">
              {language === 'en' ? 'Categories' : 'التصنيفات'}
            </h4>
            <ul className="space-y-2.5">
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
                    className="font-mono text-[11px] tracking-wider uppercase text-yl-gray-400 hover:text-yl-gold transition-colors duration-300 ease-yl"
                  >
                    {language === 'en' ? link.en : link.ar}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h4 className="font-heading text-xs font-bold text-yl-parchment uppercase tracking-wider mb-4">
              {language === 'en' ? 'Connect' : 'تواصل'}
            </h4>

            <div className="space-y-3 mb-5">
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="flex items-center gap-2.5 font-mono text-[11px] tracking-wider text-yl-gray-400 hover:text-yl-gold transition-colors duration-300 ease-yl"
              >
                <Mail size={14} className="text-yl-gold shrink-0" />
                <span>{CONTACT_EMAIL}</span>
              </a>
              <div className="flex items-center gap-2.5 font-mono text-[11px] tracking-wider text-yl-gray-400">
                <MapPin size={14} className="text-yl-gold shrink-0" />
                <span>{language === 'en' ? 'London, United Kingdom' : 'لندن، المملكة المتحدة'}</span>
              </div>
            </div>

            {/* About links */}
            <ul className="space-y-2.5">
              <li>
                <Link href="/about" className="font-mono text-[11px] tracking-wider uppercase text-yl-gray-400 hover:text-yl-gold transition-colors duration-300 ease-yl">
                  {language === 'en' ? 'The Founder' : 'المؤسس'}
                </Link>
              </li>
              <li>
                <Link href="/contact" className="font-mono text-[11px] tracking-wider uppercase text-yl-gray-400 hover:text-yl-gold transition-colors duration-300 ease-yl">
                  {language === 'en' ? 'Contact' : 'تواصل معنا'}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Tri-bar above copyright */}
        <TriBar className="mb-6" />

        {/* Bottom Bar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-4 text-center md:text-left">
            <p className="font-mono text-[11px] text-yl-gray-500 tracking-wider uppercase">
              © 2025–2026 Zenitha.Luxury LLC. All rights reserved.
            </p>
            {/* Arabic brand name on the right */}
            <span className="font-arabic text-yl-gray-500 text-sm">يلّا لندن</span>
          </div>
          <div className="flex items-center gap-5 flex-wrap justify-center">
            {[
              { href: '/privacy', en: 'Privacy', ar: 'الخصوصية' },
              { href: '/terms', en: 'Terms', ar: 'الشروط' },
              { href: '/affiliate-disclosure', en: 'Affiliates', ar: 'الإحالة' },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="font-mono text-[11px] text-yl-gray-500 tracking-wider uppercase hover:text-yl-gold transition-colors duration-300 ease-yl"
              >
                {language === 'en' ? link.en : link.ar}
              </Link>
            ))}
            <a
              href={`mailto:${ENTITY.contact.legalEmail}`}
              className="font-mono text-[11px] text-yl-gray-500 tracking-wider uppercase hover:text-yl-gold transition-colors duration-300 ease-yl"
            >
              {language === 'en' ? 'Legal' : 'القانونية'}
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
