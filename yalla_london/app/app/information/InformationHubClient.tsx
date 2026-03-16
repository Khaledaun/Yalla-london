'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useLanguage } from '@/components/language-provider'
import { getTranslation } from '@/lib/i18n'
import { TriBar, BrandButton, BrandTag, BrandCardLight, SectionLabel, WatermarkStamp, Breadcrumbs } from '@/components/brand-kit'
import {
  Map,
  Landmark,
  MapPin,
  Train,
  UtensilsCrossed,
  Baby,
  Gem,
  AlertCircle,
  Info,
  Ticket,
  Shield,
  FileText,
  BookOpen,
  Crown,
  ArrowRight,
  Clock,
  Download,
  Mail,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// Map icon string names to Lucide components
const iconMap: Record<string, LucideIcon> = {
  'map': Map,
  'landmark': Landmark,
  'map-pin': MapPin,
  'train': Train,
  'utensils-crossed': UtensilsCrossed,
  'baby': Baby,
  'gem': Gem,
  'alert-circle': AlertCircle,
  'info': Info,
  'ticket': Ticket,
  'shield': Shield,
  'file-text': FileText,
  'book-open': BookOpen,
  'crown': Crown,
}

interface SectionData {
  id: string
  slug: string
  name_en: string
  name_ar: string
  description_en: string
  description_ar: string
  icon: string
}

interface ArticleData {
  id: string
  slug: string
  section_id: string
  title_en: string
  title_ar: string
  excerpt_en: string
  excerpt_ar: string
  featured_image: string
  reading_time: number
  created_at: string
  category: {
    id: string
    name_en: string
    name_ar: string
    slug: string
  } | null
}

interface InformationHubClientProps {
  sections: SectionData[]
  articles: ArticleData[]
}

export default function InformationHubClient({ sections, articles }: InformationHubClientProps) {
  const { language, isRTL } = useLanguage()
  const t = (key: string) => getTranslation(language, key)

  const featuredArticles = articles.slice(0, 6)

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    if (language === 'en') {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    } else {
      return date.toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    }
  }

  return (
    <div className={`${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Hero Section */}
      <section className="bg-yl-dark-navy pt-28 pb-16 relative overflow-hidden">
        <WatermarkStamp position="right" />
        <div className="max-w-7xl mx-auto px-7 relative z-10">
          <Breadcrumbs items={[
            { label: language === 'en' ? 'Home' : 'الرئيسية', href: '/' },
            { label: t('informationHub') },
          ]} />
          <div className="text-center mt-6">
            <SectionLabel>{language === 'en' ? 'Your London Guide' : 'دليلك في لندن'}</SectionLabel>
            <h1 className="text-4xl sm:text-5xl font-heading font-bold text-white mb-4">
              {t('informationHub')}
            </h1>
            <p className="text-xl text-white/70 max-w-2xl mx-auto">
              {t('informationHubSubtitle')}
            </p>
          </div>
        </div>
      </section>
      <TriBar />

      {/* Sections Grid */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-7">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sections.map((section) => {
              const IconComponent = iconMap[section.icon] || Info
              const name = language === 'en' ? section.name_en : section.name_ar
              const description = language === 'en' ? section.description_en : section.description_ar

              return (
                <div key={section.id}>
                  <Link href={`/information/${section.slug}`}>
                    <BrandCardLight className="p-6 h-full group cursor-pointer hover:shadow-xl transition-all duration-300">
                      <div className="flex flex-col h-full">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-12 h-12 rounded-[14px] bg-yl-cream flex items-center justify-center group-hover:bg-yl-gold/10 transition-colors duration-300">
                            <IconComponent className="h-6 w-6 text-yl-red group-hover:text-yl-gold transition-colors duration-300" />
                          </div>
                          <h3 className="text-lg font-semibold text-yl-charcoal group-hover:text-yl-red transition-colors duration-300">
                            {name}
                          </h3>
                        </div>
                        <p className="text-yl-gray-500 text-sm font-body leading-relaxed flex-1 mb-4">
                          {description}
                        </p>
                        <div className={`flex items-center text-sm font-medium text-yl-red group-hover:text-yl-gold transition-colors duration-300 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <span>{t('learnMore')}</span>
                          <ArrowRight className={`h-4 w-4 ${isRTL ? 'mr-2 rotate-180' : 'ml-2'} group-hover:translate-x-1 transition-transform duration-300`} />
                        </div>
                      </div>
                    </BrandCardLight>
                  </Link>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Featured Articles */}
      <section className="py-16 bg-yl-cream/30">
        <div className="max-w-7xl mx-auto px-7">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-heading font-bold text-yl-charcoal mb-3">
              {t('informationArticles')}
            </h2>
            <p className="text-yl-gray-500 max-w-xl mx-auto font-body">
              {language === 'en'
                ? 'In-depth guides and tips to help you make the most of your London adventure'
                : 'أدلة ونصائح متعمقة لمساعدتك على الاستفادة القصوى من مغامرتك في لندن'
              }
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredArticles.map((article) => {
              const title = language === 'en' ? article.title_en : article.title_ar
              const excerpt = language === 'en' ? article.excerpt_en : article.excerpt_ar
              const categoryName = article.category
                ? (language === 'en' ? article.category.name_en : article.category.name_ar)
                : (language === 'en' ? 'General' : '\u0639\u0627\u0645')

              return (
                <div key={article.id}>
                  <BrandCardLight className="overflow-hidden h-full group hover:shadow-xl transition-all duration-300">
                    <div className="relative aspect-video">
                      <Image
                        src={article.featured_image || '/images/placeholder-blog.jpg'}
                        alt={title}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className={`absolute top-4 ${isRTL ? 'right-4' : 'left-4'}`}>
                        <BrandTag color="red">{categoryName}</BrandTag>
                      </div>
                    </div>
                    <div className="p-6 flex-1 flex flex-col">
                      <div className="flex items-center gap-4 text-sm text-yl-gray-500 mb-3">
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {article.reading_time} {language === 'en' ? 'min read' : '\u062f\u0642\u064a\u0642\u0629 \u0644\u0644\u0642\u0631\u0627\u0621\u0629'}
                        </span>
                      </div>
                      <h3 className="text-xl font-semibold mb-3 text-yl-charcoal group-hover:text-yl-red transition-colors line-clamp-2">
                        {title}
                      </h3>
                      <p className="text-yl-gray-500 font-body leading-relaxed flex-1 mb-4 line-clamp-3">
                        {excerpt}
                      </p>
                      <Link href={`/information/articles/${article.slug}`} className="self-start p-0 h-auto text-yl-red hover:text-[#a82924] transition-colors inline-flex items-center text-sm font-medium">
                        {t('readMore')}
                        <ArrowRight className={`ml-2 h-4 w-4 ${isRTL ? 'rtl-flip' : ''}`} />
                      </Link>
                    </div>
                  </BrandCardLight>
                </div>
              )
            })}
          </div>

          {/* View All Articles Button */}
          <div className="text-center mt-12">
            <BrandButton asChild size="lg" className="bg-yl-red hover:bg-[#a82924] text-white px-8">
              <Link href="/information/articles">
                {t('viewAllArticles')}
                <ArrowRight className={`h-4 w-4 ${isRTL ? 'mr-2 rotate-180' : 'ml-2'}`} />
              </Link>
            </BrandButton>
          </div>
        </div>
      </section>

      <TriBar />

      {/* E-Document Shop CTA */}
      <section className="py-16 bg-yl-dark-navy">
        <div className="max-w-7xl mx-auto px-7">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left">
              <div className="flex items-center gap-3 justify-center md:justify-start mb-4">
                <div className="w-12 h-12 rounded-[14px] bg-yl-gold/20 flex items-center justify-center">
                  <Download className="h-6 w-6 text-yl-gold" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-heading font-bold text-white">
                  {t('downloadPlanner')}
                </h2>
              </div>
              <p className="text-white/80 max-w-lg font-body">
                {language === 'en'
                  ? 'Get our beautifully designed London travel planner, packing checklists, and itinerary templates \u2014 everything you need for a perfect trip.'
                  : '\u0627\u062d\u0635\u0644 \u0639\u0644\u0649 \u0645\u062e\u0637\u0637 \u0627\u0644\u0633\u0641\u0631 \u0625\u0644\u0649 \u0644\u0646\u062f\u0646 \u0627\u0644\u0645\u0635\u0645\u0645 \u0628\u0634\u0643\u0644 \u062c\u0645\u064a\u0644\u060c \u0648\u0642\u0648\u0627\u0626\u0645 \u0627\u0644\u062a\u0639\u0628\u0626\u0629\u060c \u0648\u0642\u0648\u0627\u0644\u0628 \u0627\u0644\u0628\u0631\u0627\u0645\u062c \u0627\u0644\u0633\u064a\u0627\u062d\u064a\u0629 \u2014 \u0643\u0644 \u0645\u0627 \u062a\u062d\u062a\u0627\u062c\u0647 \u0644\u0631\u062d\u0644\u0629 \u0645\u062b\u0627\u0644\u064a\u0629.'
                }
              </p>
            </div>
            <BrandButton asChild size="lg" className="bg-yl-gold hover:bg-[#b08a25] text-yl-charcoal font-semibold px-8 whitespace-nowrap">
              <Link href="/shop">
                <FileText className={`h-5 w-5 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                {language === 'en' ? 'Visit the Shop' : '\u0632\u064a\u0627\u0631\u0629 \u0627\u0644\u0645\u062a\u062c\u0631'}
              </Link>
            </BrandButton>
          </div>
        </div>
      </section>

      {/* Newsletter Signup */}
      <section className="py-16 bg-yl-cream">
        <div className="max-w-2xl mx-auto px-7">
          <div className="text-center">
            <div className="w-16 h-16 rounded-[14px] bg-yl-red/10 flex items-center justify-center mx-auto mb-6">
              <Mail className="h-8 w-8 text-yl-red" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-heading font-bold text-yl-charcoal mb-3">
              {language === 'en'
                ? 'Stay Updated with London Tips'
                : '\u0627\u0628\u0642\u064e \u0639\u0644\u0649 \u0627\u0637\u0644\u0627\u0639 \u0628\u0646\u0635\u0627\u0626\u062d \u0644\u0646\u062f\u0646'
              }
            </h2>
            <p className="text-yl-gray-500 mb-8 max-w-md mx-auto font-body">
              {language === 'en'
                ? 'Subscribe to our newsletter for the latest London travel tips, exclusive deals, and seasonal guides delivered to your inbox.'
                : '\u0627\u0634\u062a\u0631\u0643 \u0641\u064a \u0646\u0634\u0631\u062a\u0646\u0627 \u0627\u0644\u0625\u062e\u0628\u0627\u0631\u064a\u0629 \u0644\u0644\u062d\u0635\u0648\u0644 \u0639\u0644\u0649 \u0623\u062d\u062f\u062b \u0646\u0635\u0627\u0626\u062d \u0627\u0644\u0633\u0641\u0631 \u0625\u0644\u0649 \u0644\u0646\u062f\u0646 \u0648\u0627\u0644\u0639\u0631\u0648\u0636 \u0627\u0644\u062d\u0635\u0631\u064a\u0629 \u0648\u0627\u0644\u0623\u062f\u0644\u0629 \u0627\u0644\u0645\u0648\u0633\u0645\u064a\u0629 \u0645\u0628\u0627\u0634\u0631\u0629 \u0625\u0644\u0649 \u0628\u0631\u064a\u062f\u0643 \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a.'
              }
            </p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                placeholder={language === 'en' ? 'Enter your email' : '\u0623\u062f\u062e\u0644 \u0628\u0631\u064a\u062f\u0643 \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a'}
                className="flex-1 px-4 py-2.5 border border-yl-gray-200 rounded-[14px] font-body focus:outline-none focus:ring-2 focus:ring-yl-gold/30 focus:border-yl-gold text-sm"
                dir={isRTL ? 'rtl' : 'ltr'}
              />
              <BrandButton className="bg-yl-red hover:bg-[#a82924] text-white px-6">
                {language === 'en' ? 'Subscribe' : '\u0627\u0634\u062a\u0631\u0643'}
              </BrandButton>
            </div>
          </div>
        </div>
      </section>

      {/* Affiliate Disclosure */}
      <section className="py-6 bg-white border-t border-yl-gray-200">
        <div className="max-w-7xl mx-auto px-7">
          <p className="text-xs text-yl-gray-500/60 text-center font-body">
            {t('affiliateDisclosure')}
          </p>
        </div>
      </section>
    </div>
  )
}
