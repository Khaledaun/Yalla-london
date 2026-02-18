'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useLanguage } from '@/components/language-provider'
import { getTranslation } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import {
  Calendar, User, ArrowLeft, Heart, BookOpen, ChevronRight,
  Tag, Clock, Share2,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { RelatedArticles, type RelatedArticleData } from '@/components/related-articles'
import { ShareButtons } from '@/components/share-buttons'
import { FollowUs } from '@/components/follow-us'
import { sanitizeHtml } from '@/lib/html-sanitizer'

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
  const [readProgress, setReadProgress] = useState(0)
  const [showStickyShare, setShowStickyShare] = useState(false)
  const articleRef = useRef<HTMLDivElement>(null)

  // Reading progress bar
  useEffect(() => {
    const handleScroll = () => {
      if (!articleRef.current) return
      const el = articleRef.current
      const rect = el.getBoundingClientRect()
      const total = el.scrollHeight
      const visible = window.innerHeight
      const scrolled = Math.max(0, -rect.top)
      const progress = Math.min(100, (scrolled / (total - visible)) * 100)
      setReadProgress(progress)
      setShowStickyShare(rect.top < -200 && rect.bottom > 200)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString(
      language === 'en' ? 'en-GB' : 'ar-SA',
      { year: 'numeric', month: 'long', day: 'numeric' }
    )
  }

  // Not found state
  if (!post) {
    return (
      <div className={`${isRTL ? 'rtl' : 'ltr'} min-h-screen flex items-center justify-center bg-cream`}>
        <div className="text-center px-6">
          <div className="w-16 h-16 rounded-full bg-london-600/10 flex items-center justify-center mx-auto mb-6">
            <BookOpen className="h-8 w-8 text-london-600" />
          </div>
          <h1 className={`text-2xl font-bold text-charcoal mb-3 ${isRTL ? 'font-arabic' : 'font-display'}`}>
            {language === 'en' ? 'Article Not Found' : 'المقال غير موجود'}
          </h1>
          <p className={`text-stone mb-8 max-w-md ${isRTL ? 'font-arabic' : 'font-editorial'}`}>
            {language === 'en'
              ? 'The article you\'re looking for doesn\'t exist or has been moved.'
              : 'المقال الذي تبحث عنه غير موجود أو تم نقله.'}
          </p>
          <Button asChild className="bg-london-600 hover:bg-london-700 text-white">
            <Link href="/blog">
              <ArrowLeft className={`mr-2 h-4 w-4 ${isRTL ? 'rotate-180' : ''}`} />
              {language === 'en' ? 'Back to Stories' : 'العودة للقصص'}
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  const title = language === 'en' ? post.title_en : post.title_ar
  const excerpt = language === 'en' ? post.excerpt_en : post.excerpt_ar
  const content = language === 'en' ? post.content_en : post.content_ar
  const categoryName = post.category
    ? (language === 'en' ? post.category.name_en : post.category.name_ar)
    : ''
  const readingTime = post.reading_time || 5

  return (
    <div className={`${isRTL ? 'rtl' : 'ltr'} bg-cream`}>

      {/* ═══ Reading Progress Bar ═══ */}
      <div className="fixed top-0 left-0 right-0 z-50 h-[3px] bg-transparent">
        <div
          className="h-full bg-gradient-to-r from-london-600 via-yalla-gold-500 to-thames-500 transition-[width] duration-150"
          style={{ width: `${readProgress}%` }}
        />
      </div>

      {/* ═══ Breadcrumb ═══ */}
      <nav className="bg-white border-b border-sand/50">
        <div className="max-w-5xl mx-auto px-6 py-3">
          <ol className="flex items-center gap-1.5 text-xs font-mono tracking-wide text-stone/60">
            <li>
              <Link href="/" className="hover:text-london-600 transition-colors">
                {language === 'en' ? 'Home' : 'الرئيسية'}
              </Link>
            </li>
            <li><ChevronRight className={`h-3 w-3 ${isRTL ? 'rotate-180' : ''}`} /></li>
            <li>
              <Link href="/blog" className="hover:text-london-600 transition-colors">
                {language === 'en' ? 'Stories' : 'القصص'}
              </Link>
            </li>
            {post.category && (
              <>
                <li><ChevronRight className={`h-3 w-3 ${isRTL ? 'rotate-180' : ''}`} /></li>
                <li>
                  <Link
                    href={`/blog/category/${post.category.slug}`}
                    className="hover:text-london-600 transition-colors"
                  >
                    {categoryName}
                  </Link>
                </li>
              </>
            )}
            <li><ChevronRight className={`h-3 w-3 ${isRTL ? 'rotate-180' : ''}`} /></li>
            <li className="text-charcoal truncate max-w-[200px]">{title}</li>
          </ol>
        </div>
      </nav>

      {/* ═══ Hero Section — Magazine Style ═══ */}
      <section className="relative min-h-[28rem] md:min-h-[34rem] overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0">
          {post.featured_image ? (
            <Image
              src={post.featured_image}
              alt={title}
              fill
              className="object-cover"
              sizes="100vw"
              priority
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-london-800 via-charcoal to-london-900" />
          )}
          {/* Cinematic gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
        </div>

        {/* Hero content — aligned bottom-left, editorial style */}
        <div className="relative z-10 h-full flex items-end">
          <div className="max-w-5xl mx-auto px-6 pb-10 md:pb-14 w-full">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              {/* Category + Reading Time */}
              <div className="flex flex-wrap items-center gap-3 mb-5">
                {categoryName && (
                  <Link
                    href={`/blog/category/${post.category?.slug}`}
                    className="inline-flex items-center gap-1.5 bg-yalla-gold-500 text-charcoal px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider hover:bg-yalla-gold-400 transition-colors"
                  >
                    {categoryName}
                  </Link>
                )}
                <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm text-white/90 px-3 py-1.5 rounded text-xs font-mono tracking-wide">
                  <Clock className="h-3 w-3" />
                  {language === 'en' ? `${readingTime} min read` : `${readingTime} دقائق قراءة`}
                </span>
              </div>

              {/* Title */}
              <h1 className={`text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-5 leading-[1.15] max-w-4xl ${isRTL ? 'font-arabic' : 'font-display'}`}>
                {title}
              </h1>

              {/* Excerpt */}
              {excerpt && (
                <p className={`text-white/75 text-lg md:text-xl leading-relaxed max-w-3xl mb-6 ${isRTL ? 'font-arabic' : 'font-editorial'}`}>
                  {excerpt}
                </p>
              )}

              {/* Author row */}
              <div className="flex flex-wrap items-center gap-4 text-white/60 text-sm">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-london-600 flex items-center justify-center text-white font-bold text-sm">
                    YL
                  </div>
                  <div>
                    <span className="text-white/90 font-medium block text-sm leading-tight">
                      {language === 'en' ? 'Yalla London Editorial' : 'تحرير يلا لندن'}
                    </span>
                    <span className="text-white/50 text-xs">
                      {formatDate(post.created_at)}
                    </span>
                  </div>
                </div>
                <span className="hidden sm:inline text-white/20">|</span>
                <span className="text-white/50 text-xs">
                  {language === 'en'
                    ? `Updated ${formatDate(post.updated_at)}`
                    : `تحديث ${formatDate(post.updated_at)}`}
                </span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══ Tri-color Bar ═══ */}
      <div className="flex h-[3px] w-full">
        <div className="flex-1 bg-london-600" />
        <div className="flex-1 bg-yalla-gold-500" />
        <div className="flex-1 bg-thames-500" />
      </div>

      {/* ═══ Article Body — Two Column Layout ═══ */}
      <section className="py-10 md:py-14 bg-white" ref={articleRef}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row gap-10 lg:gap-14">

            {/* ─── Main Content Column ─── */}
            <article className="flex-1 min-w-0 max-w-3xl">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                {/* Mobile share bar */}
                <div className="flex items-center justify-between mb-8 pb-6 border-b border-sand lg:hidden">
                  <Button asChild variant="outline" size="sm">
                    <Link href="/blog">
                      <ArrowLeft className={`mr-2 h-4 w-4 ${isRTL ? 'rotate-180' : ''}`} />
                      {language === 'en' ? 'All Stories' : 'كل القصص'}
                    </Link>
                  </Button>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsLiked(!isLiked)}
                      className={`p-2 rounded-full border transition-colors ${isLiked ? 'text-red-500 border-red-200 bg-red-50' : 'text-stone border-sand hover:border-london-300'}`}
                    >
                      <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* ─── Article HTML Content ─── */}
                <div
                  className="yalla-article-content"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHtml(content)
                  }}
                />

                {/* ─── Tags ─── */}
                {post.tags.length > 0 && (
                  <div className="mt-12 pt-8 border-t border-sand">
                    <div className="flex items-center gap-2 mb-4">
                      <Tag className="h-4 w-4 text-stone/50" />
                      <span className={`text-xs font-medium uppercase tracking-wider text-stone/60 ${isRTL ? 'font-arabic' : 'font-mono'}`}>
                        {language === 'en' ? 'Topics' : 'المواضيع'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {post.tags.map((tag) => (
                        <Link
                          key={tag}
                          href={`/blog?tag=${encodeURIComponent(tag)}`}
                          className="px-3.5 py-1.5 text-sm rounded-full bg-cream border border-sand text-stone hover:border-london-400 hover:text-london-600 hover:bg-london-50 transition-all duration-200"
                        >
                          #{tag}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* ─── Author Card ─── */}
                <div className="mt-10 p-6 md:p-8 rounded-xl bg-cream border border-sand/60">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-london-600 to-london-800 flex items-center justify-center text-white font-display font-bold text-lg shrink-0">
                      YL
                    </div>
                    <div className="flex-1">
                      <h4 className={`font-bold text-charcoal mb-1 ${isRTL ? 'font-arabic' : 'font-display'}`}>
                        {language === 'en' ? 'Yalla London Editorial' : 'فريق تحرير يلا لندن'}
                      </h4>
                      <p className={`text-sm text-stone leading-relaxed ${isRTL ? 'font-arabic' : 'font-editorial'}`}>
                        {language === 'en'
                          ? 'Curating the best of London for Arab travellers — luxury hotels, halal dining, hidden gems, and insider tips from our editorial team.'
                          : 'نقدم أفضل ما في لندن للمسافرين العرب — فنادق فاخرة، مطاعم حلال، أماكن مخفية، ونصائح من فريقنا التحريري.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* ─── Mobile Share Buttons (bottom) ─── */}
                <div className="mt-8 p-5 rounded-xl bg-cream-100 border border-sand/40 lg:hidden">
                  <p className={`text-xs font-medium text-stone/60 mb-3 ${isRTL ? 'font-arabic' : 'font-mono uppercase tracking-wider'}`}>
                    {language === 'en' ? 'Share This Story' : 'شارك هذه القصة'}
                  </p>
                  <ShareButtons title={title} excerpt={excerpt} variant="bar" />
                </div>
              </motion.div>
            </article>

            {/* ─── Sidebar ─── */}
            <aside className="hidden lg:block w-72 shrink-0">
              <div className="sticky top-24 space-y-6">
                {/* Back button */}
                <Button asChild variant="outline" size="sm" className="w-full justify-start">
                  <Link href="/blog">
                    <ArrowLeft className={`mr-2 h-4 w-4 ${isRTL ? 'rotate-180' : ''}`} />
                    {language === 'en' ? 'All Stories' : 'كل القصص'}
                  </Link>
                </Button>

                {/* Share card */}
                <div className="p-5 rounded-xl bg-cream border border-sand/60">
                  <div className="flex items-center gap-2 mb-4">
                    <Share2 className="h-4 w-4 text-stone/50" />
                    <span className="text-xs font-mono font-medium uppercase tracking-wider text-stone/60">
                      {language === 'en' ? 'Share' : 'مشاركة'}
                    </span>
                  </div>
                  <ShareButtons title={title} excerpt={excerpt} variant="bar" />
                  <div className="mt-4 pt-4 border-t border-sand/40">
                    <button
                      onClick={() => setIsLiked(!isLiked)}
                      className={`flex items-center gap-2 text-sm transition-colors w-full ${
                        isLiked ? 'text-red-500' : 'text-stone hover:text-red-500'
                      }`}
                    >
                      <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
                      {language === 'en'
                        ? (isLiked ? 'Liked!' : 'Like this article')
                        : (isLiked ? 'أُعجبت!' : 'أعجبني هذا المقال')}
                    </button>
                  </div>
                </div>

                {/* Category banner */}
                {post.category && (
                  <Link
                    href={`/blog/category/${post.category.slug}`}
                    className="block p-5 rounded-xl bg-gradient-to-br from-london-600 to-london-800 text-white hover:from-london-700 hover:to-london-900 transition-all duration-300 group"
                  >
                    <span className="text-[10px] font-mono font-medium uppercase tracking-widest text-white/50 block mb-2">
                      {language === 'en' ? 'Category' : 'الفئة'}
                    </span>
                    <span className={`text-lg font-bold block mb-1 ${isRTL ? 'font-arabic' : 'font-display'}`}>
                      {categoryName}
                    </span>
                    <span className="text-xs text-white/60 flex items-center gap-1 group-hover:gap-2 transition-all">
                      {language === 'en' ? 'Explore more' : 'اكتشف المزيد'}
                      <ChevronRight className={`h-3 w-3 ${isRTL ? 'rotate-180' : ''}`} />
                    </span>
                  </Link>
                )}

                {/* Tags */}
                {post.tags.length > 0 && (
                  <div className="p-5 rounded-xl bg-cream border border-sand/60">
                    <div className="flex items-center gap-2 mb-3">
                      <Tag className="h-3.5 w-3.5 text-stone/50" />
                      <span className="text-xs font-mono font-medium uppercase tracking-wider text-stone/60">
                        {language === 'en' ? 'Topics' : 'المواضيع'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {post.tags.slice(0, 8).map((tag) => (
                        <Link
                          key={tag}
                          href={`/blog?tag=${encodeURIComponent(tag)}`}
                          className="px-2.5 py-1 text-xs rounded-full bg-white border border-sand text-stone hover:border-london-400 hover:text-london-600 transition-all duration-200"
                        >
                          {tag}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* CTA banner */}
                <div className="p-5 rounded-xl bg-yalla-gold-500/10 border border-yalla-gold-400/30">
                  <span className={`text-sm font-bold text-charcoal block mb-2 ${isRTL ? 'font-arabic' : 'font-display'}`}>
                    {language === 'en' ? 'Planning a London Trip?' : 'تخطط لرحلة لندن؟'}
                  </span>
                  <p className={`text-xs text-stone leading-relaxed mb-3 ${isRTL ? 'font-arabic' : 'font-editorial'}`}>
                    {language === 'en'
                      ? 'Browse our curated guides for hotels, restaurants, and experiences.'
                      : 'تصفح أدلتنا المختارة للفنادق والمطاعم والتجارب.'}
                  </p>
                  <Link
                    href="/information"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-london-600 hover:text-london-700 transition-colors"
                  >
                    {language === 'en' ? 'Information Hub' : 'مركز المعلومات'}
                    <ChevronRight className={`h-3 w-3 ${isRTL ? 'rotate-180' : ''}`} />
                  </Link>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* ═══ Related Articles ═══ */}
      {relatedArticles.length > 0 && (
        <section className="py-14 bg-cream border-t border-sand/50">
          <div className="max-w-6xl mx-auto px-6">
            <RelatedArticles articles={relatedArticles} currentType="blog" />
          </div>
        </section>
      )}

      {/* ═══ Explore More CTA ═══ */}
      <section className="py-16 bg-charcoal">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className={`text-2xl md:text-3xl font-bold text-cream-100 mb-4 ${isRTL ? 'font-arabic' : 'font-display'}`}>
            {language === 'en' ? 'Discover More London Stories' : 'اكتشف المزيد من قصص لندن'}
          </h2>
          <p className={`text-stone text-base mb-8 max-w-xl mx-auto ${isRTL ? 'font-arabic' : 'font-editorial'}`}>
            {language === 'en'
              ? 'From hidden restaurants to luxury hotels — explore our curated guides to London\'s finest experiences.'
              : 'من المطاعم المخفية إلى الفنادق الفاخرة — اكتشف أدلتنا المختارة لأفضل تجارب لندن.'}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/blog"
              className="px-6 py-3 bg-london-600 text-white rounded hover:bg-london-700 transition-colors font-medium text-sm"
            >
              {language === 'en' ? 'Browse All Stories' : 'تصفح جميع القصص'}
            </Link>
            <Link
              href="/information"
              className="px-6 py-3 border border-cream-100/30 text-cream-100 rounded hover:bg-cream-100/10 transition-colors font-medium text-sm"
            >
              {language === 'en' ? 'Travel Guides' : 'أدلة السفر'}
            </Link>
          </div>
          <div className="mt-10">
            <FollowUs variant="dark" showLabel={true} />
          </div>
        </div>
      </section>

      {/* ═══ Sticky Mobile Share Bar ═══ */}
      {showStickyShare && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-t border-sand py-3 px-6 lg:hidden">
          <ShareButtons title={title} excerpt={excerpt} variant="bar" />
        </div>
      )}
    </div>
  )
}
