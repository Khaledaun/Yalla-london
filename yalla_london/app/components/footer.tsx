
'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useLanguage } from './language-provider'
import { getTranslation } from '@/lib/i18n'
import { Mail, MapPin } from 'lucide-react'
import { FollowUs } from './follow-us'
import { ENTITY, getCopyrightLine, getBrandDisclosure } from '@/config/entity'
import { SITES, getDefaultSiteId } from '@/config/sites'

const SITE_DOMAIN = SITES[getDefaultSiteId()]?.domain || 'yalla-london.com'
const CONTACT_EMAIL = `hello@${SITE_DOMAIN}`

export function Footer() {
  const { language, isRTL } = useLanguage()
  const t = (key: string) => getTranslation(language, key)

  return (
    <footer className={`bg-charcoal text-cream-100 ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* V2 Tri-color divider — 3px, full-width */}
      <div className="flex h-[3px] w-full">
        <div className="flex-1 bg-london-600" />
        <div className="flex-1 bg-yalla-gold-500" />
        <div className="flex-1 bg-thames-500" />
      </div>

      {/* Main Footer Content — 32px × 28px padding per v2 spec */}
      <div className="max-w-7xl mx-auto px-7 py-8">
        {/* V2 Column grid: 2fr 1fr 1fr 1fr */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr] gap-10 mb-8">
          {/* Brand Column (2fr) */}
          <div>
            {/* Logo — v2 stacked SVG (dark variant for dark bg), scale 0.7 */}
            <div className="mb-5">
              <Image
                src="/branding/yalla-london/brand-kit/01-logos-svg/yalla-stacked-dark.svg"
                alt="Yalla London — يلّا لندن"
                width={220}
                height={130}
                className="h-auto w-[154px] mb-2"
              />
            </div>
            {/* Description — Source Serif 4, 12px, weight 300, Stone */}
            <p className="font-editorial text-xs font-light text-stone leading-relaxed mb-5 max-w-sm">
              {language === 'en'
                ? 'Your curated guide to the finest luxury experiences in London. Discover hidden gems, exclusive events, and unforgettable moments.'
                : 'دليلك المنسق لأفضل التجارب الفاخرة في لندن. اكتشف الكنوز المخفية والفعاليات الحصرية واللحظات التي لا تُنسى.'
              }
            </p>
            {/* Social Links */}
            <FollowUs variant="dark" showLabel={false} size="sm" />
          </div>

          {/* Explore Links — Column header: Anybody 12px/700, Cream; Links: Source Serif 4 11px/300, Stone */}
          <div>
            <h4 className="font-display text-xs font-bold text-cream-100 uppercase tracking-wider mb-4">
              {language === 'en' ? 'Explore' : 'استكشف'}
            </h4>
            <ul className="space-y-2.5">
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
                    className="font-editorial text-[11px] font-light text-stone hover:text-yalla-gold-500 transition-colors duration-200"
                  >
                    {language === 'en' ? link.en : link.ar}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h4 className="font-display text-xs font-bold text-cream-100 uppercase tracking-wider mb-4">
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
                    className="font-editorial text-[11px] font-light text-stone hover:text-yalla-gold-500 transition-colors duration-200"
                  >
                    {language === 'en' ? link.en : link.ar}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h4 className="font-display text-xs font-bold text-cream-100 uppercase tracking-wider mb-4">
              {language === 'en' ? 'Connect' : 'تواصل'}
            </h4>

            {/* Contact Info */}
            <div className="space-y-3 mb-5">
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="flex items-center gap-2.5 font-editorial text-[11px] font-light text-stone hover:text-yalla-gold-500 transition-colors"
              >
                <Mail size={14} className="text-yalla-gold-500 shrink-0" />
                <span>{CONTACT_EMAIL}</span>
              </a>
              <div className="flex items-center gap-2.5 font-editorial text-[11px] font-light text-stone">
                <MapPin size={14} className="text-yalla-gold-500 shrink-0" />
                <span>{language === 'en' ? 'London, United Kingdom' : 'لندن، المملكة المتحدة'}</span>
              </div>
            </div>

            {/* Newsletter */}
            <div className="bg-graphite/50 rounded p-3 border border-stone/10">
              <p className="font-editorial text-[11px] font-light text-stone mb-2.5">
                {language === 'en'
                  ? 'Subscribe for exclusive updates'
                  : 'اشترك للحصول على تحديثات حصرية'
                }
              </p>
              <form className="flex gap-1.5">
                <input
                  type="email"
                  placeholder={language === 'en' ? 'Your email' : 'بريدك الإلكتروني'}
                  className="flex-1 px-3 py-1.5 bg-charcoal border border-stone/20 rounded text-cream-100 placeholder:text-stone/50 focus:outline-none focus:border-yalla-gold-500 transition-colors font-editorial text-[11px]"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-yalla-gold-500 text-charcoal rounded font-mono text-[8px] font-semibold uppercase tracking-[1.5px] hover:bg-yalla-gold-400 transition-colors"
                >
                  <Mail size={14} />
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* V2 Tri-color divider — 3px, full-width (replaces gold diamond) */}
        <div className="flex h-[3px] w-full mb-6">
          <div className="flex-1 bg-london-600" />
          <div className="flex-1 bg-yalla-gold-500" />
          <div className="flex-1 bg-thames-500" />
        </div>

        {/* Bottom Bar — Copyright: IBM Plex Mono 8px/400, Stone */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-3">
          <div className="text-center md:text-left">
            <p className="font-mono text-[8px] font-normal text-stone tracking-[1px] uppercase">
              {getCopyrightLine(language)}
            </p>
            <p className="font-mono text-[7px] font-normal text-stone/70 tracking-[0.5px] mt-1">
              {getBrandDisclosure('Yalla London', language)}
            </p>
          </div>
          <div className="flex items-center gap-5">
            <Link href="/privacy" className="font-mono text-[8px] font-normal text-stone tracking-[1px] uppercase hover:text-yalla-gold-500 transition-colors">
              {language === 'en' ? 'Privacy Policy' : 'سياسة الخصوصية'}
            </Link>
            <Link href="/terms" className="font-mono text-[8px] font-normal text-stone tracking-[1px] uppercase hover:text-yalla-gold-500 transition-colors">
              {language === 'en' ? 'Terms of Use' : 'شروط الاستخدام'}
            </Link>
            <Link href="/affiliate-disclosure" className="font-mono text-[8px] font-normal text-stone tracking-[1px] uppercase hover:text-yalla-gold-500 transition-colors">
              {language === 'en' ? 'Affiliate Disclosure' : 'إفصاح الإحالة'}
            </Link>
            <a
              href={`mailto:${ENTITY.contact.legalEmail}`}
              className="font-mono text-[8px] font-normal text-stone tracking-[1px] uppercase hover:text-yalla-gold-500 transition-colors"
            >
              {language === 'en' ? 'Legal' : 'القانونية'}
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
