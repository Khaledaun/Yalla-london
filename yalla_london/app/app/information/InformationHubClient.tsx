'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useLanguage } from '@/components/language-provider'
import { getTranslation } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import { motion } from 'framer-motion'
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
    <div className={`py-12 ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-cream to-cream-200 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-4xl sm:text-5xl font-display font-bold gradient-text mb-4">
              {t('informationHub')}
            </h1>
            <p className="text-xl text-stone max-w-2xl mx-auto">
              {t('informationHubSubtitle')}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Sections Grid */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sections.map((section, index) => {
              const IconComponent = iconMap[section.icon] || Info
              const name = language === 'en' ? section.name_en : section.name_ar
              const description = language === 'en' ? section.description_en : section.description_ar

              return (
                <motion.div
                  key={section.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.05 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <Link href={`/information/${section.slug}`}>
                    <Card className="overflow-hidden border-0 luxury-shadow hover:shadow-xl transition-all duration-300 h-full group cursor-pointer">
                      <CardContent className="p-6 flex flex-col h-full">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-12 h-12 rounded-xl bg-cream flex items-center justify-center group-hover:bg-yalla-gold-400/10 transition-colors duration-300">
                            <IconComponent className="h-6 w-6 text-london-800 group-hover:text-yalla-gold-400 transition-colors duration-300" />
                          </div>
                          <h3 className="text-lg font-semibold text-charcoal group-hover:text-london-800 transition-colors duration-300">
                            {name}
                          </h3>
                        </div>
                        <p className="text-stone text-sm leading-relaxed flex-1 mb-4">
                          {description}
                        </p>
                        <div className={`flex items-center text-sm font-medium text-london-800 group-hover:text-yalla-gold-400 transition-colors duration-300 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <span>{t('learnMore')}</span>
                          <ArrowRight className={`h-4 w-4 ${isRTL ? 'mr-2 rotate-180' : 'ml-2'} group-hover:translate-x-1 transition-transform duration-300`} />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Featured Articles */}
      <section className="py-16 bg-gradient-to-b from-white to-cream/30">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-charcoal mb-3">
              {t('informationArticles')}
            </h2>
            <p className="text-stone max-w-xl mx-auto">
              {language === 'en'
                ? 'In-depth guides and tips to help you make the most of your London adventure'
                : 'أدلة ونصائح متعمقة لمساعدتك على الاستفادة القصوى من مغامرتك في لندن'
              }
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredArticles.map((article, index) => {
              const title = language === 'en' ? article.title_en : article.title_ar
              const excerpt = language === 'en' ? article.excerpt_en : article.excerpt_ar
              const categoryName = article.category
                ? (language === 'en' ? article.category.name_en : article.category.name_ar)
                : (language === 'en' ? 'General' : 'عام')

              return (
                <motion.div
                  key={article.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <Card className="overflow-hidden border-0 luxury-shadow hover:shadow-xl transition-all duration-300 h-full group">
                    <div className="relative aspect-video">
                      <Image
                        src={article.featured_image || '/images/placeholder-blog.jpg'}
                        alt={title}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className={`absolute top-4 ${isRTL ? 'right-4' : 'left-4'}`}>
                        <span className="bg-white/90 px-3 py-1 rounded-full text-xs font-medium text-brand-primary">
                          {categoryName}
                        </span>
                      </div>
                    </div>
                    <CardContent className="p-6 flex-1 flex flex-col">
                      <div className="flex items-center gap-4 text-sm text-stone mb-3">
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {article.reading_time} {language === 'en' ? 'min read' : 'دقيقة للقراءة'}
                        </span>
                      </div>
                      <h3 className="text-xl font-semibold mb-3 text-charcoal group-hover:text-brand-primary transition-colors line-clamp-2">
                        {title}
                      </h3>
                      <p className="text-stone leading-relaxed flex-1 mb-4 line-clamp-3">
                        {excerpt}
                      </p>
                      <Button asChild variant="ghost" className="self-start p-0 h-auto text-brand-primary hover:text-london-800 transition-colors">
                        <Link href={`/information/articles/${article.slug}`}>
                          {t('readMore')}
                          <ArrowRight className={`ml-2 h-4 w-4 ${isRTL ? 'rtl-flip' : ''}`} />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>

          {/* View All Articles Button */}
          <motion.div
            className="text-center mt-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Button asChild size="lg" className="bg-london-800 hover:bg-london-800/90 text-white px-8">
              <Link href="/information/articles">
                {t('viewAllArticles')}
                <ArrowRight className={`h-4 w-4 ${isRTL ? 'mr-2 rotate-180' : 'ml-2'}`} />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* E-Document Shop CTA */}
      <section className="py-16 bg-london-800">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            className="flex flex-col md:flex-row items-center justify-between gap-8"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="text-center md:text-left">
              <div className="flex items-center gap-3 justify-center md:justify-start mb-4">
                <div className="w-12 h-12 rounded-xl bg-yalla-gold-400/20 flex items-center justify-center">
                  <Download className="h-6 w-6 text-yalla-gold-400" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-display font-bold text-white">
                  {t('downloadPlanner')}
                </h2>
              </div>
              <p className="text-white/80 max-w-lg">
                {language === 'en'
                  ? 'Get our beautifully designed London travel planner, packing checklists, and itinerary templates \u2014 everything you need for a perfect trip.'
                  : 'احصل على مخطط السفر إلى لندن المصمم بشكل جميل، وقوائم التعبئة، وقوالب البرامج السياحية \u2014 كل ما تحتاجه لرحلة مثالية.'
                }
              </p>
            </div>
            <Button asChild size="lg" className="bg-yalla-gold-400 hover:bg-yalla-gold-400/90 text-london-800 font-semibold px-8 whitespace-nowrap">
              <Link href="/shop">
                <FileText className={`h-5 w-5 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                {language === 'en' ? 'Visit the Shop' : 'زيارة المتجر'}
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Newsletter Signup */}
      <section className="py-16 bg-gradient-to-br from-cream to-cream-200">
        <div className="max-w-2xl mx-auto px-6">
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="w-16 h-16 rounded-full bg-london-800/10 flex items-center justify-center mx-auto mb-6">
              <Mail className="h-8 w-8 text-london-800" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-charcoal mb-3">
              {language === 'en'
                ? 'Stay Updated with London Tips'
                : 'ابقَ على اطلاع بنصائح لندن'
              }
            </h2>
            <p className="text-stone mb-8 max-w-md mx-auto">
              {language === 'en'
                ? 'Subscribe to our newsletter for the latest London travel tips, exclusive deals, and seasonal guides delivered to your inbox.'
                : 'اشترك في نشرتنا الإخبارية للحصول على أحدث نصائح السفر إلى لندن والعروض الحصرية والأدلة الموسمية مباشرة إلى بريدك الإلكتروني.'
              }
            </p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                placeholder={language === 'en' ? 'Enter your email' : 'أدخل بريدك الإلكتروني'}
                className="flex-1 px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-yalla-gold-400 focus:border-transparent text-sm"
                dir={isRTL ? 'rtl' : 'ltr'}
              />
              <Button className="bg-london-800 hover:bg-london-800/90 text-white px-6">
                {language === 'en' ? 'Subscribe' : 'اشترك'}
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Affiliate Disclosure */}
      <section className="py-6 bg-white border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-6">
          <motion.p
            className="text-xs text-stone/60 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            {t('affiliateDisclosure')}
          </motion.p>
        </div>
      </section>
    </div>
  )
}
