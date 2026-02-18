'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useLanguage } from '@/components/language-provider'
import { getTranslation } from '@/lib/i18n'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
import { motion } from 'framer-motion'
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

// ---------- Animation Variants ----------

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
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
      <section className="relative h-[28rem] md:h-[32rem] overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src={section.featured_image}
            alt={sectionName}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70" />
        </div>

        <div className="relative z-10 h-full flex flex-col justify-end pb-12">
          <div className="max-w-4xl mx-auto px-6 w-full">
            {/* Breadcrumb */}
            <motion.nav
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              aria-label="Breadcrumb"
              className="mb-6"
            >
              <ol className="flex items-center gap-2 text-sm text-cream-200">
                <li>
                  <Link
                    href="/"
                    className="hover:text-yalla-gold-400 transition-colors flex items-center gap-1"
                  >
                    <Home className="h-3.5 w-3.5" />
                    {t('home')}
                  </Link>
                </li>
                <li>
                  <ChevronRight className={`h-3.5 w-3.5 text-cream-300 ${isRTL ? 'rotate-180' : ''}`} />
                </li>
                <li>
                  <Link
                    href="/information"
                    className="hover:text-yalla-gold-400 transition-colors"
                  >
                    {t('informationHub')}
                  </Link>
                </li>
                <li>
                  <ChevronRight className={`h-3.5 w-3.5 text-cream-300 ${isRTL ? 'rotate-180' : ''}`} />
                </li>
                <li className="text-yalla-gold-400 font-medium">{sectionName}</li>
              </ol>
            </motion.nav>

            {/* Section Title */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
            >
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-white mb-4">
                {sectionName}
              </h1>
              <p className="text-lg md:text-xl text-cream-200 max-w-2xl leading-relaxed">
                {sectionDescription}
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ==================== BACK TO HUB LINK (TOP) ==================== */}
      <div className="bg-cream border-b border-sand">
        <div className="max-w-4xl mx-auto px-6 py-3">
          <Link
            href="/information"
            className="inline-flex items-center gap-2 text-sm text-london-700 hover:text-london-900 font-medium transition-colors"
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
        <div className="bg-yalla-gold-400/10 border-b border-yalla-gold-400/30">
          <div className="max-w-4xl mx-auto px-6 py-3">
            <p className="text-xs text-stone italic">{t('affiliateDisclosure')}</p>
          </div>
        </div>
      )}

      {/* ==================== CONTENT BODY ==================== */}
      <section className="py-12 md:py-16 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
          >
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
                <motion.div key={subsection.id} variants={staggerItem}>
                  {/* Subsection Block */}
                  <div className="mb-10">
                    <h2 className="text-2xl md:text-3xl font-display font-bold text-london-800 mb-6">
                      {subTitle}
                    </h2>
                    <div
                      className="prose prose-lg max-w-none text-charcoal leading-relaxed prose-headings:font-display prose-h3:text-xl prose-h4:text-lg prose-a:text-london-600 prose-strong:text-charcoal prose-blockquote:border-london-600"
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(subContent) }}
                    />
                  </div>

                  {/* Tip Box */}
                  {showTipAfter && (
                    <div className="mb-10 border-l-4 border-yalla-gold-400 bg-yalla-gold-400/5 rounded-r-lg p-6">
                      <div className="flex items-start gap-3">
                        <Lightbulb className="h-5 w-5 text-yalla-gold-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <h3 className="font-display font-semibold text-london-800 mb-1">
                            {t('travelTip')}
                          </h3>
                          <p className="text-sm text-stone leading-relaxed">
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
                    <div className="mb-10 bg-london-800 text-white rounded-xl p-8 text-center">
                      <ShoppingBag className="h-8 w-8 text-yalla-gold-400 mx-auto mb-3" />
                      <h3 className="text-xl font-display font-bold mb-2">
                        {language === 'en'
                          ? 'Exclusive Deals for Yalla London Visitors'
                          : 'عروض حصرية لزوار يلا لندن'}
                      </h3>
                      <p className="text-cream-200 text-sm mb-4 max-w-md mx-auto">
                        {language === 'en'
                          ? 'Save on London attractions, dining, and experiences with our curated deals and discount codes.'
                          : 'وفر على معالم لندن والمطاعم والتجارب مع عروضنا المختارة ورموز الخصم.'}
                      </p>
                      <Button
                        asChild
                        className="bg-yalla-gold-400 text-london-900 hover:bg-yalla-gold-500 font-semibold"
                      >
                        <Link href="/information/coupons-deals">
                          {language === 'en' ? 'View Deals & Coupons' : 'عرض العروض والكوبونات'}
                        </Link>
                      </Button>
                    </div>
                  )}

                  {/* Divider between subsections (not after last) */}
                  {index < section.subsections.length - 1 &&
                    !showTipAfter &&
                    !showAffiliateCTA && (
                      <hr className="mb-10 border-sand" />
                    )}
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </section>

      {/* ==================== E-DOCUMENT SHOP CTA ==================== */}
      {section.slug !== 'e-document-shop' && (
        <section className="py-12 bg-cream">
          <div className="max-w-4xl mx-auto px-6">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeInUp}
              transition={{ duration: 0.6 }}
              className="bg-gradient-to-br from-london-800 to-london-900 rounded-2xl p-8 md:p-10 text-center text-white"
            >
              <BookOpen className="h-10 w-10 text-yalla-gold-400 mx-auto mb-4" />
              <h2 className="text-2xl md:text-3xl font-display font-bold mb-3">
                {language === 'en'
                  ? 'Download Our London Travel Guides'
                  : 'حمّل أدلة السفر إلى لندن'}
              </h2>
              <p className="text-cream-200 mb-6 max-w-lg mx-auto">
                {language === 'en'
                  ? 'Get detailed PDF guides, itinerary planners, and essential checklists for your London trip.'
                  : 'احصل على أدلة PDF مفصلة ومخططات الرحلات وقوائم التحقق الأساسية لرحلتك إلى لندن.'}
              </p>
              <Button
                asChild
                size="lg"
                className="bg-yalla-gold-400 text-london-900 hover:bg-yalla-gold-500 font-semibold"
              >
                <Link href="/information/e-document-shop">
                  {t('eDocumentShop')}
                  <ArrowRight className={`h-4 w-4 ${isRTL ? 'rotate-180' : ''} ml-2`} />
                </Link>
              </Button>
            </motion.div>
          </div>
        </section>
      )}

      {/* ==================== RELATED ARTICLES ==================== */}
      {relatedArticles.length > 0 && (
        <section className={`py-12 md:py-16 ${section.slug !== 'e-document-shop' ? 'bg-white' : 'bg-cream'}`}>
          <div className="max-w-6xl mx-auto px-6">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeInUp}
              transition={{ duration: 0.6 }}
            >
              <div className="text-center mb-10">
                <h2 className="text-3xl font-display font-bold gradient-text mb-3">
                  {t('relatedArticles')}
                </h2>
                <p className="text-stone max-w-lg mx-auto">
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
                    <Card className="overflow-hidden h-full hover:shadow-lg transition-shadow duration-300">
                      <div className="relative h-48 overflow-hidden">
                        <Image
                          src={article.featured_image}
                          alt={language === 'en' ? article.title_en : article.title_ar}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                      <CardContent className="p-5">
                        <h3 className="font-display font-semibold text-london-800 group-hover:text-london-600 transition-colors mb-2 line-clamp-2">
                          {language === 'en' ? article.title_en : article.title_ar}
                        </h3>
                        <p className="text-sm text-stone line-clamp-2 mb-3">
                          {language === 'en' ? article.excerpt_en : article.excerpt_ar}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-stone">
                          <Clock className="h-3.5 w-3.5" />
                          <span>
                            {language === 'en'
                              ? `${article.reading_time} min read`
                              : `${article.reading_time} دقائق للقراءة`}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>

              {relatedArticles.length > 6 && (
                <div className="text-center mt-8">
                  <Button asChild variant="outline">
                    <Link href="/information/articles">
                      {t('viewAllArticles')}
                      <ArrowRight className={`h-4 w-4 ${isRTL ? 'rotate-180' : ''} ml-2`} />
                    </Link>
                  </Button>
                </div>
              )}
            </motion.div>
          </div>
        </section>
      )}

      {/* ==================== PREV / NEXT NAVIGATION ==================== */}
      <section className="py-10 bg-cream border-t border-sand">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex items-center justify-between gap-4">
            {/* Previous Section */}
            {navigation.prev ? (
              <Link
                href={`/information/${navigation.prev.slug}`}
                className="group flex items-center gap-3 text-left flex-1 min-w-0"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-london-100 group-hover:bg-london-200 flex items-center justify-center transition-colors">
                  <ArrowLeft className={`h-5 w-5 text-london-700 ${isRTL ? 'rotate-180' : ''}`} />
                </div>
                <div className="min-w-0">
                  <span className="text-xs text-stone block">
                    {language === 'en' ? 'Previous' : 'السابق'}
                  </span>
                  <span className="text-sm font-semibold text-london-800 group-hover:text-london-600 transition-colors truncate block">
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
              className="flex-shrink-0 text-sm font-medium text-stone hover:text-london-800 transition-colors hidden md:block"
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
                  <span className="text-xs text-stone block">
                    {language === 'en' ? 'Next' : 'التالي'}
                  </span>
                  <span className="text-sm font-semibold text-london-800 group-hover:text-london-600 transition-colors truncate block">
                    {language === 'en' ? navigation.next.name_en : navigation.next.name_ar}
                  </span>
                </div>
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-london-100 group-hover:bg-london-200 flex items-center justify-center transition-colors">
                  <ArrowRight className={`h-5 w-5 text-london-700 ${isRTL ? 'rotate-180' : ''}`} />
                </div>
              </Link>
            ) : (
              <div className="flex-1" />
            )}
          </div>
        </div>
      </section>

      {/* ==================== BACK TO HUB LINK (BOTTOM) ==================== */}
      <div className="bg-white border-t border-sand">
        <div className="max-w-4xl mx-auto px-6 py-4 text-center">
          <Link
            href="/information"
            className="inline-flex items-center gap-2 text-sm text-london-700 hover:text-london-900 font-medium transition-colors"
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
