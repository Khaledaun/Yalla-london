'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useLanguage } from '@/components/language-provider'
import { getTranslation } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Calendar, User, ArrowLeft, Share2, Heart, BookOpen } from 'lucide-react'
import { motion } from 'framer-motion'
import { RelatedArticles, type RelatedArticleData } from '@/components/related-articles'

interface BlogPostData {
  id: string;
  title_en: string;
  title_ar: string;
  content_en: string;
  content_ar: string;
  excerpt_en: string;
  excerpt_ar: string;
  slug: string;
  featured_image: string;
  created_at: string;
  updated_at: string;
  reading_time?: number;
  tags: string[];
  category: {
    id: string;
    name_en: string;
    name_ar: string;
    slug: string;
  } | null;
}

interface BlogPostClientProps {
  post: BlogPostData | null;
  relatedArticles?: RelatedArticleData[];
}

export default function BlogPostClient({ post, relatedArticles = [] }: BlogPostClientProps) {
  const { language, isRTL } = useLanguage()
  const t = (key: string) => getTranslation(language, key)
  const [isLiked, setIsLiked] = useState(false)

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
    if (!post) return

    if (navigator.share) {
      try {
        await navigator.share({
          title: language === 'en' ? post.title_en : post.title_ar,
          text: language === 'en' ? post.excerpt_en : post.excerpt_ar,
          url: window.location.href,
        })
      } catch (error) {
        console.log('Error sharing:', error)
      }
    } else {
      navigator.clipboard.writeText(window.location.href)
    }
  }

  // Error state - post not found
  if (!post) {
    return (
      <div className={`${isRTL ? 'rtl' : 'ltr'} min-h-screen flex items-center justify-center`}>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-charcoal mb-4">
            {language === 'en' ? 'Post Not Found' : 'المقال غير موجود'}
          </h1>
          <p className="text-stone mb-6">
            {language === 'en'
              ? 'The blog post you\'re looking for doesn\'t exist or has been removed.'
              : 'المقال الذي تبحث عنه غير موجود أو تم حذفه.'
            }
          </p>
          <Link href="/blog">
            <Button className="bg-london-600 hover:bg-london-700">
              <ArrowLeft className={`mr-2 h-4 w-4 ${isRTL ? 'rtl-flip' : ''}`} />
              {language === 'en' ? 'Back to Stories' : 'العودة للقصص'}
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
            src={post.featured_image}
            alt={language === 'en' ? post.title_en : post.title_ar}
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
                  {post.category ? (language === 'en' ? post.category.name_en : post.category.name_ar) : ''}
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-display font-bold mb-6">
                {language === 'en' ? post.title_en : post.title_ar}
              </h1>
              <div className="flex items-center justify-center gap-6 text-cream-200">
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {formatDate(post.created_at)}
                </span>
                <span className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {language === 'en' ? 'Yalla London' : 'يلا لندن'}
                </span>
                <span className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  {language === 'en' ? `${post.reading_time || 5} min read` : `${post.reading_time || 5} دقائق للقراءة`}
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
                <Link href="/blog">
                  <ArrowLeft className={`mr-2 h-4 w-4 ${isRTL ? 'rtl-flip' : ''}`} />
                  {language === 'en' ? 'Back to Stories' : 'العودة للقصص'}
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
                __html: language === 'en' ? post.content_en : post.content_ar
              }}
            />
          </motion.div>
        </div>
      </section>

      {/* Related Articles (Internal Backlinks) */}
      {relatedArticles.length > 0 && (
        <section className="py-12 bg-cream">
          <div className="max-w-6xl mx-auto px-6">
            <RelatedArticles articles={relatedArticles} currentType="blog" />
          </div>
        </section>
      )}
    </div>
  )
}
