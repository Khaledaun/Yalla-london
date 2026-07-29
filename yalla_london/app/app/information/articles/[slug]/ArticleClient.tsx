'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useLanguage } from '@/components/language-provider'
import { getTranslation } from '@/lib/i18n'
import { TriBar, BrandButton, BrandTag, BrandCardLight, SectionLabel, WatermarkStamp, Breadcrumbs } from '@/components/brand-kit'
import { Calendar, User, ArrowLeft, Heart, BookOpen, ChevronDown, ChevronUp, ShoppingBag } from 'lucide-react'
import { RelatedArticles, type RelatedArticleData } from '@/components/related-articles'
import { ShareButtons } from '@/components/share-buttons'
import { FollowUs } from '@/components/follow-us'
import { sanitizeHtml } from '@/lib/html-sanitizer'

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
  serverLocale?: 'en' | 'ar'
}

export default function ArticleClient({ article, relatedArticles = [], serverLocale }: ArticleClientProps) {
  const { language: clientLanguage, isRTL } = useLanguage()
  const language = serverLocale ?? clientLanguage
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

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index)
  }

  // Error state - article not found
  if (!article) {
    return (
      <div className={`${isRTL ? 'rtl' : 'ltr'} min-h-screen flex items-center justify-center`}>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-yl-charcoal mb-4">
            {language === 'en' ? 'Article Not Found' : 'المقال غير موجود'}
          </h1>
          <p className="text-yl-gray-500 mb-6">
            {language === 'en'
              ? 'The article you\'re looking for doesn\'t exist or has been removed.'
              : 'المقال الذي تبحث عنه غير موجود أو تم حذفه.'
            }
          </p>
          <Link href="/information/articles">
            <BrandButton className="bg-yl-red hover:bg-[#a82924] text-white">
              <ArrowLeft className={`mr-2 h-4 w-4 ${isRTL ? 'rtl-flip' : ''}`} />
              {language === 'en' ? 'Back to Articles' : 'العودة للمقالات'}
            </BrandButton>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className={`${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Hero Section */}
      <section className="relative h-96 overflow-hidden pt-28">
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
          <div className="max-w-7xl mx-auto px-7 text-white text-center">
            <div>
              <div className="mb-4">
                <BrandTag color="red">
                  {article.category ? (language === 'en' ? article.category.name_en : article.category.name_ar) : ''}
                </BrandTag>
              </div>
              <h1 className="text-4xl md:text-5xl font-heading font-bold mb-6">
                {language === 'en' ? article.title_en : article.title_ar}
              </h1>
              <div className="flex items-center justify-center gap-6 text-yl-gray-200">
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
            </div>
          </div>
        </div>
      </section>

      {/* Article Content */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-7">
          <div className="max-w-none">
            {/* Action Buttons */}
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-yl-gray-200">
              <BrandButton asChild variant="outline" className="border-yl-gray-200 text-yl-charcoal hover:bg-yl-cream">
                <Link href="/information/articles">
                  <ArrowLeft className={`mr-2 h-4 w-4 ${isRTL ? 'rtl-flip' : ''}`} />
                  {language === 'en' ? 'Back to Articles' : 'العودة للمقالات'}
                </Link>
              </BrandButton>

              <div className="flex items-center gap-3">
                <BrandButton
                  variant="outline"
                  onClick={() => setIsLiked(!isLiked)}
                  className={`border-yl-gray-200 ${isLiked ? 'text-red-500 border-red-200' : 'text-yl-charcoal'} hover:bg-yl-cream`}
                >
                  <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
                </BrandButton>
                <ShareButtons
                  title={language === 'en' ? article.title_en : article.title_ar}
                  excerpt={language === 'en' ? article.excerpt_en : article.excerpt_ar}
                />
              </div>
            </div>

            {/* Article Body */}
            <div
              className="yalla-article-content"
              dangerouslySetInnerHTML={{
                __html: sanitizeHtml(language === 'en' ? article.content_en : article.content_ar)
              }}
            />
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      {article.faq_questions && article.faq_questions.length > 0 && (
        <section className="py-12 bg-yl-cream">
          <div className="max-w-7xl mx-auto px-7">
            <div>
              <h2 className="text-3xl font-heading font-bold mb-8 text-yl-charcoal text-center">
                {language === 'en' ? 'Frequently Asked Questions' : 'الأسئلة الشائعة'}
              </h2>
              <div className="space-y-4">
                {article.faq_questions.map((faq, index) => {
                  const question = language === 'en' ? faq.question_en : faq.question_ar
                  const answer = language === 'en' ? faq.answer_en : faq.answer_ar
                  const isOpen = openFaqIndex === index

                  return (
                    <div
                      key={index}
                      className="bg-white rounded-[14px] border border-yl-gray-200 overflow-hidden"
                    >
                      <button
                        onClick={() => toggleFaq(index)}
                        className="w-full flex items-center justify-between p-6 text-left hover:bg-yl-gray-100 transition-colors"
                      >
                        <span className="text-lg font-heading font-semibold text-yl-charcoal pr-4">
                          {question}
                        </span>
                        {isOpen ? (
                          <ChevronUp className="h-5 w-5 text-yl-red flex-shrink-0" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-yl-gray-500 flex-shrink-0" />
                        )}
                      </button>
                      {isOpen && (
                        <div className="overflow-hidden">
                          <div className="px-6 pb-6 text-yl-gray-500 font-body leading-relaxed border-t border-yl-gray-200 pt-4">
                            {answer}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      <TriBar />

      {/* Affiliate CTA Banner */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-7">
          <div className="bg-yl-dark-navy rounded-[14px] p-8 md:p-12 text-white text-center">
            <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-yl-gold" />
            <h3 className="text-2xl md:text-3xl font-heading font-bold mb-4">
              {language === 'en' ? 'Download Our London Planner' : 'حمّل مخطط لندن الخاص بنا'}
            </h3>
            <p className="text-white/80 mb-6 max-w-xl mx-auto font-body">
              {language === 'en'
                ? 'Get our comprehensive London travel planner with insider tips, itineraries, and exclusive recommendations for Arab visitors.'
                : 'احصل على مخطط السفر الشامل للندن مع نصائح من الداخل وجداول الرحلات وتوصيات حصرية للزوار العرب.'
              }
            </p>
            <BrandButton asChild className="bg-yl-gold hover:bg-[#b08a25] text-yl-charcoal font-semibold px-8 py-3">
              <Link href="/shop">
                {language === 'en' ? 'Get the Planner' : 'احصل على المخطط'}
              </Link>
            </BrandButton>
          </div>
        </div>
      </section>

      {/* Follow Us CTA */}
      <section className="py-10 bg-yl-cream border-t border-yl-gray-200">
        <div className="max-w-7xl mx-auto px-7 text-center">
          <FollowUs variant="light" />
        </div>
      </section>

      {/* Related Articles (Internal Backlinks) */}
      {relatedArticles.length > 0 && (
        <section className="py-12 bg-white">
          <div className="max-w-7xl mx-auto px-7">
            <RelatedArticles articles={relatedArticles} currentType="information" />
          </div>
        </section>
      )}
    </div>
  )
}
