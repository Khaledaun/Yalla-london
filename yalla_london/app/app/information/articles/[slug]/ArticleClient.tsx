'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useLanguage } from '@/components/language-provider'
import { getTranslation } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Calendar, User, ArrowLeft, Share2, Heart, BookOpen, ChevronDown, ChevronUp, ShoppingBag } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { RelatedArticles, type RelatedArticleData } from '@/components/related-articles'

interface FAQQuestion {
  question_en: string
  question_ar: string
  answer_en: string
  answer_ar: string
}

interface ArticleData {
  id: string
  title_en: string
  title_ar: string
  content_en: string
  content_ar: string
  excerpt_en: string
  excerpt_ar: string
  slug: string
  featured_image: string
  created_at: string
  updated_at: string
  reading_time: number
  tags: string[]
  category: {
    id: string
    name_en: string
    name_ar: string
    slug: string
  } | null
  faq_questions: FAQQuestion[]
}

interface ArticleClientProps {
  article: ArticleData | null
  relatedArticles?: RelatedArticleData[]
}

export default function ArticleClient({ article, relatedArticles = [] }: ArticleClientProps) {
  const { language, isRTL } = useLanguage()
  const t = (key: string) => getTranslation(language, key)
  const [isLiked, setIsLiked] = useState(false)
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null)

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    if (language === 'en') {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } else {
      return date.toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }
  }

  const handleShare = async () => {
    if (!article) return

    if (navigator.share) {
      try {
        await navigator.share({
          title: language === 'en' ? article.title_en : article.title_ar,
          text: language === 'en' ? article.excerpt_en : article.excerpt_ar,
          url: window.location.href,
        })
      } catch (error) {
        console.log('Error sharing:', error)
      }
    } else {
      navigator.clipboard.writeText(window.location.href)
    }
  }

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index)
  }

  // Error state - article not found
  if (!article) {
    return (
      <div className={`${isRTL ? 'rtl' : 'ltr'} min-h-screen flex items-center justify-center`}>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-charcoal mb-4">
            {language === 'en' ? 'Article Not Found' : 'المقال غير موجود'}
          </h1>
          <p className="text-stone mb-6">
            {language === 'en'
              ? 'The article you\'re looking for doesn\'t exist or has been removed.'
              : 'المقال الذي تبحث عنه غير موجود أو تم حذفه.'
            }
          </p>
          <Link href="/information/articles">
            <Button className="bg-london-600 hover:bg-london-700">
              <ArrowLeft className={`mr-2 h-4 w-4 ${isRTL ? 'rtl-flip' : ''}`} />
              {language === 'en' ? 'Back to Articles' : 'العودة للمقالات'}
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className={`${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Hero Section */}
      <section className="relative h-96 overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src={article.featured_image}
            alt={language === 'en' ? article.title_en : article.title_ar}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-black/50" />
        </div>

        <div className="relative z-10 h-full flex items-center">
          <div className="max-w-4xl mx-auto px-6 text-white text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="mb-4">
                <span className="bg-yalla-gold-500 text-charcoal px-4 py-2 rounded-full text-sm font-medium">
                  {article.category ? (language === 'en' ? article.category.name_en : article.category.name_ar) : ''}
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-display font-bold mb-6">
                {language === 'en' ? article.title_en : article.title_ar}
              </h1>
              <div className="flex items-center justify-center gap-6 text-cream-200">
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {formatDate(article.created_at)}
                </span>
                <span className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {language === 'en' ? 'Yalla London' : 'يلا لندن'}
                </span>
                <span className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  {language === 'en' ? `${article.reading_time} min read` : `${article.reading_time} دقائق للقراءة`}
                </span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Article Content */}
      <section className="py-12 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="prose prose-lg max-w-none"
          >
            {/* Action Buttons */}
            <div className="flex items-center justify-between mb-8 pb-6 border-b">
              <Button asChild variant="outline" size="sm">
                <Link href="/information/articles">
                  <ArrowLeft className={`mr-2 h-4 w-4 ${isRTL ? 'rtl-flip' : ''}`} />
                  {language === 'en' ? 'Back to Articles' : 'العودة للمقالات'}
                </Link>
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsLiked(!isLiked)}
                  className={`${isLiked ? 'text-red-500 border-red-200' : ''}`}
                >
                  <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
                </Button>
                <Button variant="outline" size="sm" onClick={handleShare}>
                  <Share2 className="h-4 w-4" />
                  <span className="ml-2">{t('share')}</span>
                </Button>
              </div>
            </div>

            {/* Article Body */}
            <div
              className="text-charcoal leading-relaxed prose-headings:font-display prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-a:text-london-600 prose-strong:text-charcoal"
              dangerouslySetInnerHTML={{
                __html: language === 'en' ? article.content_en : article.content_ar
              }}
            />
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      {article.faq_questions && article.faq_questions.length > 0 && (
        <section className="py-12 bg-cream">
          <div className="max-w-4xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="text-3xl font-display font-bold mb-8 gradient-text text-center">
                {language === 'en' ? 'Frequently Asked Questions' : 'الأسئلة الشائعة'}
              </h2>
              <div className="space-y-4">
                {article.faq_questions.map((faq, index) => {
                  const question = language === 'en' ? faq.question_en : faq.question_ar
                  const answer = language === 'en' ? faq.answer_en : faq.answer_ar
                  const isOpen = openFaqIndex === index

                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className="bg-white rounded-lg luxury-shadow overflow-hidden"
                    >
                      <button
                        onClick={() => toggleFaq(index)}
                        className="w-full flex items-center justify-between p-6 text-left hover:bg-cream-100 transition-colors"
                      >
                        <span className="text-lg font-semibold text-charcoal pr-4">
                          {question}
                        </span>
                        {isOpen ? (
                          <ChevronUp className="h-5 w-5 text-london-600 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-stone flex-shrink-0" />
                        )}
                      </button>
                      <AnimatePresence>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                          >
                            <div className="px-6 pb-6 text-stone leading-relaxed border-t border-cream-200 pt-4">
                              {answer}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* Affiliate CTA Banner */}
      <section className="py-12 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="bg-gradient-to-r from-london-600 to-london-800 rounded-2xl p-8 md:p-12 text-white text-center luxury-shadow"
          >
            <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-yalla-gold-500" />
            <h3 className="text-2xl md:text-3xl font-display font-bold mb-4">
              {language === 'en' ? 'Download Our London Planner' : 'حمّل مخطط لندن الخاص بنا'}
            </h3>
            <p className="text-cream-200 mb-6 max-w-xl mx-auto">
              {language === 'en'
                ? 'Get our comprehensive London travel planner with insider tips, itineraries, and exclusive recommendations for Arab visitors.'
                : 'احصل على مخطط السفر الشامل للندن مع نصائح من الداخل وجداول الرحلات وتوصيات حصرية للزوار العرب.'
              }
            </p>
            <Button asChild className="bg-yalla-gold-500 hover:bg-yalla-gold-600 text-charcoal font-semibold px-8 py-3">
              <Link href="/shop">
                {language === 'en' ? 'Get the Planner' : 'احصل على المخطط'}
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Related Articles (Internal Backlinks) */}
      {relatedArticles.length > 0 && (
        <section className="py-12 bg-cream">
          <div className="max-w-6xl mx-auto px-6">
            <RelatedArticles articles={relatedArticles} currentType="information" />
          </div>
        </section>
      )}
    </div>
  )
}
