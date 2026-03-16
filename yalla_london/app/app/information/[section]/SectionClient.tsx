'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useLanguage } from '@/components/language-provider'
import { getTranslation } from '@/lib/i18n'
import { TriBar, BrandButton, BrandCardLight, SectionLabel, WatermarkStamp, Breadcrumbs } from '@/components/brand-kit'
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Home,
  BookOpen,
  Lightbulb,
  ShoppingBag,
  Clock,
} from 'lucide-react'
import { sanitizeHtml } from '@/lib/html-sanitizer'

// ---------- Types ----------

interface SectionSubsection {
  id: string
  title_en: string
  title_ar: string
  content_en: string
  content_ar: string
}

interface SectionData {
  id: string
  slug: string
  name_en: string
  name_ar: string
  description_en: string
  description_ar: string
  icon: string
  featured_image: string
  subsections: SectionSubsection[]
}

interface RelatedArticle {
  id: string
  slug: string
  title_en: string
  title_ar: string
  excerpt_en: string
  excerpt_ar: string
  featured_image: string
  created_at: string
  reading_time: number
}

interface SectionNav {
  slug: string
  name_en: string
  name_ar: string
}

interface SectionClientProps {
  section: SectionData
  relatedArticles: RelatedArticle[]
  navigation: {
    prev: SectionNav | null
    next: SectionNav | null
  }
}

// ---------- Component ----------

export default function SectionClient({
  section,
  relatedArticles,
  navigation,
}: SectionClientProps) {
  const { language, isRTL } = useLanguage()
  const t = (key: string) => getTranslation(language, key)

  const sectionName = language === 'en' ? section.name_en : section.name_ar
  const sectionDescription =
    language === 'en' ? section.description_en : section.description_ar

  // Determine if this section should show an affiliate disclosure
  const affiliateSections = [
    'coupons-deals',
    'e-document-shop',
    'luxury-experiences',
    'food-restaurants',
  ]
  const showAffiliateDisclosure = affiliateSections.includes(section.slug)

  // Determine if this section should show a tip box for certain subsection indices
  const tipSections = [
    'plan-your-trip',
    'transportation',
    'practical-info',
    'dos-and-donts',
    'emergency-healthcare',
    'family-kids',
  ]
  const showTipBoxes = tipSections.includes(section.slug)

  return (
    <div className={`${isRTL ? 'rtl' : 'ltr'}`}>
      {/* ==================== HERO SECTION ==================== */}
      <section className="relative overflow-hidden pt-28 pb-16">
        <div className="absolute inset-0">
          <Image
            src={section.featured_image}
            alt={sectionName}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-yl-dark-navy/80" />
        </div>

        <WatermarkStamp />

        <div className="relative z-10 flex flex-col justify-end">
          <div className="max-w-7xl mx-auto px-7 w-full">
            {/* Breadcrumb */}
            <div className="mb-6">
              <Breadcrumbs
                items={[
                  { label: language === 'en' ? 'Home' : 'الرئيسية', href: '/' },
                  { label: language === 'en' ? 'Information' : 'المعلومات', href: '/information' },
                  { label: sectionName },
                ]}
              />
            </div>

            {/* Section Label + Title */}
            <div>
              <SectionLabel>
                {language === 'en' ? 'Information Hub' : 'مركز المعلومات'}
              </SectionLabel>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold text-white mb-4">
                {sectionName}
              </h1>
              <p className="text-lg md:text-xl text-yl-gray-200 max-w-2xl leading-relaxed">
                {sectionDescription}
              </p>
            </div>
          </div>
        </div>
      </section>

      <TriBar />

      {/* ==================== BACK TO HUB LINK (TOP) ==================== */}
      <div className="bg-yl-cream border-b border-yl-gray-200">
        <div className="max-w-7xl mx-auto px-7 py-3">
          <Link
            href="/information"
            className="inline-flex items-center gap-2 text-sm text-yl-red hover:text-yl-dark-navy font-medium transition-colors"
          >
            <ArrowLeft className={`h-4 w-4 ${isRTL ? 'rotate-180' : ''}`} />
            {language === 'en'
              ? 'Back to Information Hub'
              : 'العودة إلى مركز المعلومات'}
          </Link>
        </div>
      </div>

      {/* ==================== AFFILIATE DISCLOSURE ==================== */}
      {showAffiliateDisclosure && (
        <div className="bg-yl-gold/10 border-b border-yl-gold/30">
          <div className="max-w-7xl mx-auto px-7 py-3">
            <p className="text-xs text-yl-gray-500 italic">{t('affiliateDisclosure')}</p>
          </div>
        </div>
      )}

      {/* ==================== CONTENT BODY ==================== */}
      <section className="py-12 md:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-7">
          <div>
            {section.subsections.map((subsection, index) => {
              const subTitle =
                language === 'en' ? subsection.title_en : subsection.title_ar
              const subContent =
                language === 'en' ? subsection.content_en : subsection.content_ar

              // Show a tip box after every 3rd subsection in tip-eligible sections
              const showTipAfter =
                showTipBoxes && (index + 1) % 3 === 0 && index < section.subsections.length - 1

              // Show affiliate CTA after certain subsections in affiliate sections
              const showAffiliateCTA =
                showAffiliateDisclosure &&
                index === Math.floor(section.subsections.length / 2) - 1

              return (
                <div key={subsection.id}>
                  {/* Subsection Block */}
                  <div className="mb-10">
                    <h2 className="text-2xl md:text-3xl font-heading font-bold text-yl-red mb-6">
                      {subTitle}
                    </h2>
                    <div
                      className="yalla-article-content font-body"
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(subContent) }}
                    />
                  </div>

                  {/* Tip Box */}
                  {showTipAfter && (
                    <div className="mb-10 border-l-4 border-yl-gold bg-yl-cream rounded-r-[14px] p-6">
                      <div className="flex items-start gap-3">
                        <Lightbulb className="h-5 w-5 text-yl-gold mt-0.5 flex-shrink-0" />
                        <div>
                          <h3 className="font-heading font-semibold text-yl-red mb-1">
                            {t('travelTip')}
                          </h3>
                          <p className="text-sm text-yl-gray-500 leading-relaxed font-body">
                            {language === 'en'
                              ? 'Bookmark this section for quick reference during your London trip. Our guides are regularly updated with the latest information.'
                              : 'احفظ هذا القسم للرجوع إليه بسرعة أثناء رحلتك إلى لندن. يتم تحديث أدلتنا بانتظام بأحدث المعلومات.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Affiliate CTA Box */}
                  {showAffiliateCTA && (
                    <BrandCardLight hoverable={false} className="mb-10 p-8 text-center bg-yl-dark-navy border-none text-white">
                      <ShoppingBag className="h-8 w-8 text-yl-gold mx-auto mb-3" />
                      <h3 className="text-xl font-heading font-bold mb-2">
                        {language === 'en'
                          ? 'Exclusive Deals for Yalla London Visitors'
                          : 'عروض حصرية لزوار يلا لندن'}
                      </h3>
                      <p className="text-yl-gray-200 text-sm mb-4 max-w-md mx-auto">
                        {language === 'en'
                          ? 'Save on London attractions, dining, and experiences with our curated deals and discount codes.'
                          : 'وفر على معالم لندن والمطاعم والتجارب مع عروضنا المختارة ورموز الخصم.'}
                      </p>
                      <BrandButton
                        variant="gold"
                        href="/information/coupons-deals"
                      >
                        {language === 'en' ? 'View Deals & Coupons' : 'عرض العروض والكوبونات'}
                      </BrandButton>
                    </BrandCardLight>
                  )}

                  {/* Divider between subsections (not after last) */}
                  {index < section.subsections.length - 1 &&
                    !showTipAfter &&
                    !showAffiliateCTA && (
                      <hr className="mb-10 border-yl-gray-200" />
                    )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ==================== E-DOCUMENT SHOP CTA ==================== */}
      {section.slug !== 'e-document-shop' && (
        <section className="py-12 bg-yl-cream">
          <div className="max-w-7xl mx-auto px-7">
            <div
              className="bg-yl-dark-navy rounded-[14px] p-8 md:p-10 text-center text-white"
            >
              <BookOpen className="h-10 w-10 text-yl-gold mx-auto mb-4" />
              <h2 className="text-2xl md:text-3xl font-heading font-bold mb-3">
                {language === 'en'
                  ? 'Download Our London Travel Guides'
                  : 'حمّل أدلة السفر إلى لندن'}
              </h2>
              <p className="text-yl-gray-200 mb-6 max-w-lg mx-auto font-body">
                {language === 'en'
                  ? 'Get detailed PDF guides, itinerary planners, and essential checklists for your London trip.'
                  : 'احصل على أدلة PDF مفصلة ومخططات الرحلات وقوائم التحقق الأساسية لرحلتك إلى لندن.'}
              </p>
              <BrandButton
                variant="gold"
                size="lg"
                href="/information/e-document-shop"
                className="inline-flex items-center gap-2"
              >
                {t('eDocumentShop')}
                <ArrowRight className={`h-4 w-4 ${isRTL ? 'rotate-180' : ''}`} />
              </BrandButton>
            </div>
          </div>
        </section>
      )}

      {/* ==================== RELATED ARTICLES ==================== */}
      {relatedArticles.length > 0 && (
        <section className={`py-12 md:py-16 ${section.slug !== 'e-document-shop' ? 'bg-white' : 'bg-yl-cream'}`}>
          <div className="max-w-7xl mx-auto px-7">
            <div>
              <div className="text-center mb-10">
                <h2 className="text-3xl font-heading font-bold text-yl-red mb-3">
                  {t('relatedArticles')}
                </h2>
                <p className="text-yl-gray-500 max-w-lg mx-auto font-body">
                  {language === 'en'
                    ? `Explore more articles about ${section.name_en.toLowerCase()} in London.`
                    : `اكتشف المزيد من المقالات حول ${section.name_ar} في لندن.`}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {relatedArticles.slice(0, 6).map((article) => (
                  <Link
                    key={article.id}
                    href={`/information/articles/${article.slug}`}
                    className="group block"
                  >
                    <BrandCardLight className="overflow-hidden h-full">
                      <div className="relative h-48 overflow-hidden">
                        <Image
                          src={article.featured_image}
                          alt={language === 'en' ? article.title_en : article.title_ar}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                      <div className="p-5">
                        <h3 className="font-heading font-semibold text-yl-red group-hover:text-[#a82924] transition-colors mb-2 line-clamp-2">
                          {language === 'en' ? article.title_en : article.title_ar}
                        </h3>
                        <p className="text-sm text-yl-gray-500 line-clamp-2 mb-3 font-body">
                          {language === 'en' ? article.excerpt_en : article.excerpt_ar}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-yl-gray-500">
                          <Clock className="h-3.5 w-3.5" />
                          <span>
                            {language === 'en'
                              ? `${article.reading_time} min read`
                              : `${article.reading_time} دقائق للقراءة`}
                          </span>
                        </div>
                      </div>
                    </BrandCardLight>
                  </Link>
                ))}
              </div>

              {relatedArticles.length > 6 && (
                <div className="text-center mt-8">
                  <BrandButton
                    variant="outline"
                    href="/information/articles"
                    className="inline-flex items-center gap-2"
                  >
                    {t('viewAllArticles')}
                    <ArrowRight className={`h-4 w-4 ${isRTL ? 'rotate-180' : ''}`} />
                  </BrandButton>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ==================== PREV / NEXT NAVIGATION ==================== */}
      <section className="py-10 bg-yl-cream border-t border-yl-gray-200">
        <div className="max-w-7xl mx-auto px-7">
          <div className="flex items-center justify-between gap-4">
            {/* Previous Section */}
            {navigation.prev ? (
              <Link
                href={`/information/${navigation.prev.slug}`}
                className="group flex items-center gap-3 text-left flex-1 min-w-0"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-yl-red/20 group-hover:bg-yl-red/40 flex items-center justify-center transition-colors">
                  <ArrowLeft className={`h-5 w-5 text-yl-red ${isRTL ? 'rotate-180' : ''}`} />
                </div>
                <div className="min-w-0">
                  <span className="text-xs text-yl-gray-500 block">
                    {language === 'en' ? 'Previous' : 'السابق'}
                  </span>
                  <span className="text-sm font-semibold text-yl-red group-hover:text-[#a82924] transition-colors truncate block">
                    {language === 'en' ? navigation.prev.name_en : navigation.prev.name_ar}
                  </span>
                </div>
              </Link>
            ) : (
              <div className="flex-1" />
            )}

            {/* Back to Hub (center) */}
            <Link
              href="/information"
              className="flex-shrink-0 text-sm font-medium text-yl-gray-500 hover:text-yl-red transition-colors hidden md:block"
            >
              {language === 'en' ? 'All Sections' : 'جميع الأقسام'}
            </Link>

            {/* Next Section */}
            {navigation.next ? (
              <Link
                href={`/information/${navigation.next.slug}`}
                className="group flex items-center gap-3 text-right flex-1 min-w-0 justify-end"
              >
                <div className="min-w-0">
                  <span className="text-xs text-yl-gray-500 block">
                    {language === 'en' ? 'Next' : 'التالي'}
                  </span>
                  <span className="text-sm font-semibold text-yl-red group-hover:text-[#a82924] transition-colors truncate block">
                    {language === 'en' ? navigation.next.name_en : navigation.next.name_ar}
                  </span>
                </div>
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-yl-red/20 group-hover:bg-yl-red/40 flex items-center justify-center transition-colors">
                  <ArrowRight className={`h-5 w-5 text-yl-red ${isRTL ? 'rotate-180' : ''}`} />
                </div>
              </Link>
            ) : (
              <div className="flex-1" />
            )}
          </div>
        </div>
      </section>

      {/* ==================== BACK TO HUB LINK (BOTTOM) ==================== */}
      <div className="bg-white border-t border-yl-gray-200">
        <div className="max-w-7xl mx-auto px-7 py-4 text-center">
          <Link
            href="/information"
            className="inline-flex items-center gap-2 text-sm text-yl-red hover:text-yl-dark-navy font-medium transition-colors"
          >
            <ArrowLeft className={`h-4 w-4 ${isRTL ? 'rotate-180' : ''}`} />
            {language === 'en'
              ? 'Back to Information Hub'
              : 'العودة إلى مركز المعلومات'}
          </Link>
        </div>
      </div>
    </div>
  )
}
