'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Clock, ArrowRight, ArrowLeft } from 'lucide-react'
import { useLanguage } from '@/components/language-provider'
import { getTranslation } from '@/lib/i18n'

interface RelatedArticleData {
  slug: string
  title_en: string
  title_ar: string
  excerpt_en: string
  excerpt_ar: string
  featured_image: string
  type: 'blog' | 'information'
  category_name_en?: string
  category_name_ar?: string
  reading_time?: number
}

interface RelatedArticlesProps {
  articles: RelatedArticleData[]
  currentType: 'blog' | 'information'
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: 'easeOut',
    },
  },
}

function getArticleHref(article: RelatedArticleData): string {
  if (article.type === 'blog') {
    return `/blog/${article.slug}`
  }
  return `/information/articles/${article.slug}`
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trimEnd() + '...'
}

export function RelatedArticles({ articles, currentType }: RelatedArticlesProps) {
  const { language, isRTL } = useLanguage()
  const t = (key: string) => getTranslation(language, key)

  if (!articles || articles.length === 0) {
    return null
  }

  const sectionTitle = language === 'en' ? 'You Might Also Like' : 'قد يعجبك أيضاً'
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight

  return (
    <section className="py-16" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Section header */}
      <div className="text-center mb-10">
        <div className="flex items-center justify-center gap-3 mb-4">
          <span className="h-px w-12 bg-yalla-gold-400" />
          <span className="text-sm font-medium uppercase tracking-widest text-yalla-gold-400">
            {t('relatedArticles')}
          </span>
          <span className="h-px w-12 bg-yalla-gold-400" />
        </div>
        <h2 className={`text-3xl font-bold text-charcoal ${isRTL ? 'font-arabic' : 'font-display'}`}>
          {sectionTitle}
        </h2>
      </div>

      {/* Cards grid */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-50px' }}
      >
        {articles.slice(0, 3).map((article) => {
          const title = language === 'en' ? article.title_en : article.title_ar
          const excerpt = language === 'en' ? article.excerpt_en : article.excerpt_ar
          const categoryName = language === 'en'
            ? article.category_name_en
            : article.category_name_ar
          const href = getArticleHref(article)
          const isCrossType = article.type !== currentType
          const typeBadgeLabel = language === 'en'
            ? (article.type === 'blog' ? 'Blog' : 'Guide')
            : (article.type === 'blog' ? 'مدونة' : 'دليل')

          return (
            <motion.div key={article.slug} variants={cardVariants}>
              <Link href={href} className="group block h-full">
                <article className="h-full bg-cream rounded-card overflow-hidden shadow-card transition-shadow duration-300 hover:shadow-hover flex flex-col">
                  {/* Image */}
                  <div className="relative overflow-hidden">
                    <Image
                      src={article.featured_image}
                      alt={title}
                      width={400}
                      height={250}
                      className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105"
                    />

                    {/* Badges overlay */}
                    <div className={`absolute top-3 ${isRTL ? 'right-3' : 'left-3'} flex gap-2`}>
                      {/* Category badge */}
                      {categoryName && (
                        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-london-600 text-white">
                          {categoryName}
                        </span>
                      )}

                      {/* Cross-type badge */}
                      {isCrossType && (
                        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-yalla-gold-400 text-charcoal">
                          {typeBadgeLabel}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex flex-col flex-1 p-5">
                    <h3
                      className={`text-lg font-bold text-charcoal mb-2 line-clamp-2 group-hover:text-london-600 transition-colors duration-200 ${
                        isRTL ? 'font-arabic' : 'font-display'
                      }`}
                    >
                      {title}
                    </h3>

                    <p className="text-sm text-stone leading-relaxed mb-4 line-clamp-3 flex-1">
                      {truncateText(excerpt, 120)}
                    </p>

                    {/* Footer: reading time + read more */}
                    <div className="flex items-center justify-between pt-3 border-t border-sand">
                      {article.reading_time ? (
                        <span className="flex items-center gap-1.5 text-xs text-stone">
                          <Clock className="w-3.5 h-3.5" />
                          {article.reading_time} {language === 'en' ? 'min read' : 'دقيقة للقراءة'}
                        </span>
                      ) : (
                        <span />
                      )}

                      <span className="flex items-center gap-1 text-sm font-medium text-london-600 group-hover:gap-2 transition-all duration-200">
                        {t('readMore')}
                        <ArrowIcon className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </article>
              </Link>
            </motion.div>
          )
        })}
      </motion.div>
    </section>
  )
}

export type { RelatedArticleData, RelatedArticlesProps }
