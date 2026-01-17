'use client'


import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useLanguage } from '@/components/language-provider'
import { getTranslation } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Calendar, User, ArrowLeft, Share2, Heart, BookOpen } from 'lucide-react'
import { motion } from 'framer-motion'
import { useParams } from 'next/navigation'

interface BlogPost {
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
  published: boolean;
  page_type: string;
  seo_score: number;
  tags: string[];
  category: {
    id: string;
    name_en: string;
    name_ar: string;
    slug: string;
  } | null;
  author: {
    id: string;
    name: string;
    email: string;
    image: string;
  } | null;
  place: any;
}

export default function BlogPostClient() {
  const { language, isRTL } = useLanguage()
  const t = (key: string) => getTranslation(language, key)
  const params = useParams()
  const [post, setPost] = useState<BlogPost | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isLiked, setIsLiked] = useState(false)

  // Fetch blog post data based on slug
  useEffect(() => {
    const fetchPost = async () => {
      if (!params.slug) return

      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/content/blog/${params.slug}`)

        if (!response.ok) {
          if (response.status === 404) {
            setError('Post not found')
          } else {
            setError('Failed to load post')
          }
          return
        }

        const data = await response.json()

        if (data.success) {
          setPost(data.data)
        } else {
          setError(data.error || 'Failed to load post')
        }
      } catch (err) {
        console.error('Error fetching blog post:', err)
        setError('Failed to load post')
      } finally {
        setLoading(false)
      }
    }

    fetchPost()
  }, [params.slug])

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
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className={`${isRTL ? 'rtl' : 'ltr'} min-h-screen flex items-center justify-center`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-900 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {language === 'en' ? 'Loading post...' : 'جاري تحميل المقال...'}
          </p>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !post) {
    return (
      <div className={`${isRTL ? 'rtl' : 'ltr'} min-h-screen flex items-center justify-center`}>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {language === 'en' ? 'Post Not Found' : 'المقال غير موجود'}
          </h1>
          <p className="text-gray-600 mb-6">
            {language === 'en'
              ? 'The blog post you\'re looking for doesn\'t exist or has been removed.'
              : 'المقال الذي تبحث عنه غير موجود أو تم حذفه.'
            }
          </p>
          <Link href="/blog">
            <Button className="bg-purple-900 hover:bg-purple-800">
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
                <span className="bg-yellow-500 text-gray-900 px-4 py-2 rounded-full text-sm font-medium">
                  {post.category ? (language === 'en' ? post.category.name_en : post.category.name_ar) : ''}
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-playfair font-bold mb-6">
                {language === 'en' ? post.title_en : post.title_ar}
              </h1>
              <div className="flex items-center justify-center gap-6 text-gray-200">
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {formatDate(post.created_at)}
                </span>
                <span className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {post.author ? post.author.name : (language === 'en' ? 'Author' : 'الكاتب')}
                </span>
                <span className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  {language === 'en' ? '5 min read' : '٥ دقائق للقراءة'}
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
              className="text-gray-800 leading-relaxed"
              dangerouslySetInnerHTML={{
                __html: language === 'en' ? post.content_en : post.content_ar
              }}
            />
          </motion.div>
        </div>
      </section>

      {/* Related Posts */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <h3 className="text-3xl font-playfair font-bold mb-8 gradient-text">
              {language === 'en' ? 'More London Stories' : 'المزيد من حكايات لندن'}
            </h3>

            <div className="bg-white rounded-lg p-8 luxury-shadow">
              <p className="text-gray-600 mb-6">
                {language === 'en'
                  ? 'Discover more curated London experiences and insider stories on our blog.'
                  : 'اكتشف المزيد من التجارب المنسقة والقصص الداخلية في لندن على مدونتنا.'
                }
              </p>
              <Button asChild className="bg-purple-900 hover:bg-purple-800">
                <Link href="/blog">
                  <ArrowLeft className={`mr-2 h-4 w-4 ${isRTL ? 'rtl-flip' : ''}`} />
                  {language === 'en' ? 'View All Stories' : 'عرض جميع القصص'}
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
