'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useLanguage } from '@/components/language-provider'
import { getTranslation } from '@/lib/i18n'
import { TriBar, BrandButton, BrandTag, BrandCardLight, SectionLabel, WatermarkStamp } from '@/components/brand-kit'
import {
  Calendar, User, ArrowLeft, Heart, BookOpen, ChevronRight,
  Tag, Clock, Share2,
} from 'lucide-react'
import { ShareButtons } from '@/components/share-buttons'
import { FollowUs } from '@/components/follow-us'

interface AuthorData {
  name_en: string;
  name_ar: string;
  title_en: string;
  bio_en: string;
  bio_ar: string;
  slug: string;
  avatar_url: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  instagram_url: string | null;
}

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
  author: AuthorData | null;
}

interface BlogPostClientProps {
  post: BlogPostData | null;
  /** Server-determined locale from x-locale header — ensures correct content in initial SSR HTML for Google */
  serverLocale?: 'en' | 'ar';
}

/**
 * Lightweight script/event-handler strip for SSR — runs instantly (no jsdom).
 * Full DOMPurify sanitization runs client-side only (where it uses native DOM
 * and is ~100x faster than isomorphic-dompurify's jsdom fallback).
 */
function fastStripScripts(html: string): string {
  if (!html) return '';
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\bon\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
}

export default function BlogPostClient({ post, serverLocale }: BlogPostClientProps) {
  const { language, isRTL } = useLanguage()
  // For SSR: use serverLocale to ensure correct language in initial HTML that Google indexes.
  // After hydration, the client-side language context takes over (allows user toggle).
  const effectiveLanguage = (serverLocale ?? language) as 'en' | 'ar'
  const t = (key: string) => getTranslation(language, key)
  const [isLiked, setIsLiked] = useState(false)
  const [readProgress, setReadProgress] = useState(0)
  const [showStickyShare, setShowStickyShare] = useState(false)
  const articleRef = useRef<HTMLDivElement>(null)

  // Reading progress bar — debounced with requestAnimationFrame to improve INP
  useEffect(() => {
    let rafId: number | null = null
    const handleScroll = () => {
      if (rafId !== null) return
      rafId = requestAnimationFrame(() => {
        rafId = null
        if (!articleRef.current) return
        const el = articleRef.current
        const rect = el.getBoundingClientRect()
        const total = el.scrollHeight
        const visible = window.innerHeight
        const scrolled = Math.max(0, -rect.top)
        const progress = Math.min(100, (scrolled / (total - visible)) * 100)
        setReadProgress(progress)
        setShowStickyShare(rect.top < -200 && rect.bottom > 200)
      })
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (rafId !== null) cancelAnimationFrame(rafId)
    }
  }, [])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString(
      language === 'en' ? 'en-GB' : 'ar-SA',
      { year: 'numeric', month: 'long', day: 'numeric' }
    )
  }

  // Internal pipeline tags that should never be shown to visitors
  const INTERNAL_TAGS = new Set(["auto-generated", "reservoir-pipeline", "needs-review", "needs-expansion"]);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- INTERNAL_TAGS is a module-level constant, not a reactive dependency
  const publicTags = useMemo(
    () => (post?.tags || []).filter((t: string) => !INTERNAL_TAGS.has(t) && !t.startsWith("site-") && !t.startsWith("primary-") && !t.startsWith("missing-")),
    [post?.tags],
  );

  // Content sanitization — hooks must be before any conditional returns
  // Demote <h1> to <h2> at render time — the page template already provides
  // the H1 via the article title. This is a safety net for articles not yet
  // cleaned by the content-auto-fix-lite cron.
  // Use effectiveLanguage (server-determined on initial render, client-context after hydration)
  // Fall back to content_en when content_ar is empty (incomplete translations)
  const rawContentPreH1 = post
    ? (effectiveLanguage === 'ar' && post.content_ar ? post.content_ar : post.content_en)
    : ''

  // Safety net: convert markdown syntax to HTML if content was stored as
  // markdown instead of HTML (some older or failed pipeline runs). This
  // prevents raw `# Heading` and `**bold**` from showing as plain text.
  const markdownToHtml = (text: string): string => {
    // Skip if content is already HTML (has at least one HTML tag)
    if (/<[a-z][\s\S]*?>/i.test(text) && !text.startsWith('# ')) return text;
    // Only convert if content looks like markdown (starts with # or has markdown patterns)
    const hasMarkdown = /^#{1,6}\s|^\*\*|^\-\s|^\d+\.\s|\*\*[^*]+\*\*|\[.+\]\(.+\)/m.test(text);
    if (!hasMarkdown) return text;

    let html = text;
    // Headings: # H1 → <h2> (demoted), ## H2 → <h2>, ### H3 → <h3>, etc.
    html = html.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>');
    html = html.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>');
    html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^#\s+(.+)$/gm, '<h2>$1</h2>'); // H1 → H2 (page template has H1)
    // Bold and italic
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    // Links: [text](url) → <a href="url">text</a>
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    // Unordered lists
    html = html.replace(/^[\-\*]\s+(.+)$/gm, '<li>$1</li>');
    // Ordered lists
    html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');
    // Wrap consecutive <li> blocks in <ul>
    html = html.replace(/((?:<li>.*?<\/li>\s*)+)/g, '<ul>$1</ul>');
    // Paragraphs: wrap non-tag lines in <p>
    html = html.replace(/^(?!<[a-z/])((?!$).+)$/gm, '<p>$1</p>');
    // Clean up empty paragraphs
    html = html.replace(/<p>\s*<\/p>/g, '');
    return html;
  };

  const rawContentMd = markdownToHtml(rawContentPreH1);
  const rawContent = rawContentMd
    .replace(/<h1(\s[^>]*)?>|<h1>/gi, '<h2$1>')
    .replace(/<\/h1>/gi, '</h2>')
  const [sanitizedContent, setSanitizedContent] = useState(() => fastStripScripts(rawContent))
  useEffect(() => {
    if (!rawContent) return undefined;
    let cancelled = false;
    import('@/lib/html-sanitizer').then(({ sanitizeHtml }) => {
      if (!cancelled) setSanitizedContent(sanitizeHtml(rawContent));
    });
    return () => { cancelled = true; };
  }, [rawContent]);

  // Check if content is too thin to display (empty or placeholder articles)
  const strippedContent = rawContent.replace(/<[^>]*>/g, '').trim();
  const isThinContent = !strippedContent || strippedContent.length < 100;

  // Not found state
  if (!post) {
    return (
      <div className={`${isRTL ? 'rtl' : 'ltr'} min-h-screen flex items-center justify-center bg-yl-cream`}>
        <div className="text-center px-6">
          <div className="w-16 h-16 rounded-full bg-yl-red/10 flex items-center justify-center mx-auto mb-6">
            <BookOpen className="h-8 w-8 text-yl-red" />
          </div>
          <h1 className={`text-2xl font-bold text-yl-charcoal mb-3 ${isRTL ? 'font-arabic' : 'font-heading'}`}>
            {language === 'en' ? 'Article Not Found' : 'المقال غير موجود'}
          </h1>
          <p className={`text-yl-gray-500 mb-8 max-w-md ${isRTL ? 'font-arabic' : 'font-body'}`}>
            {language === 'en'
              ? 'The article you\'re looking for doesn\'t exist or has been moved.'
              : 'المقال الذي تبحث عنه غير موجود أو تم نقله.'}
          </p>
          <BrandButton variant="primary" href="/blog" className="gap-2">
            <ArrowLeft className={`h-4 w-4 ${isRTL ? 'rotate-180' : ''}`} />
            {language === 'en' ? 'Back to Stories' : 'العودة للقصص'}
          </BrandButton>
        </div>
      </div>
    )
  }

  // Use effectiveLanguage for content — correct in both SSR (Arabic HTML for Google) and client
  const title = effectiveLanguage === 'ar' && post.title_ar ? post.title_ar : post.title_en
  const excerpt = effectiveLanguage === 'ar' && post.excerpt_ar ? post.excerpt_ar : post.excerpt_en
  const categoryName = post.category
    ? (effectiveLanguage === 'ar' && post.category.name_ar ? post.category.name_ar : post.category.name_en)
    : ''
  const readingTime = post.reading_time || 5

  return (
    <div className={`${isRTL ? 'rtl' : 'ltr'} bg-yl-cream`}>

      {/* ═══ Reading Progress Bar ═══ */}
      <div className="fixed top-0 left-0 right-0 z-50 h-[3px] bg-transparent">
        <div
          className="h-full bg-gradient-to-r from-yl-red via-yl-gold to-yl-blue transition-[width] duration-150"
          style={{ width: `${readProgress}%` }}
        />
      </div>

      {/* ═══ Breadcrumb ═══ */}
      <nav className="bg-white border-b border-yl-gray-200/50">
        <div className="max-w-7xl mx-auto px-7 py-3">
          <ol className="flex items-center gap-1.5 text-xs font-body tracking-wide text-yl-gray-500/60">
            <li>
              <Link href="/" className="hover:text-yl-red transition-colors">
                {language === 'en' ? 'Home' : 'الرئيسية'}
              </Link>
            </li>
            <li><ChevronRight className={`h-3 w-3 ${isRTL ? 'rotate-180' : ''}`} /></li>
            <li>
              <Link href="/blog" className="hover:text-yl-red transition-colors">
                {language === 'en' ? 'Stories' : 'القصص'}
              </Link>
            </li>
            {post.category && (
              <>
                <li><ChevronRight className={`h-3 w-3 ${isRTL ? 'rotate-180' : ''}`} /></li>
                <li>
                  <Link
                    href={`/blog/category/${post.category.slug}`}
                    className="hover:text-yl-red transition-colors"
                  >
                    {categoryName}
                  </Link>
                </li>
              </>
            )}
            <li><ChevronRight className={`h-3 w-3 ${isRTL ? 'rotate-180' : ''}`} /></li>
            <li className="text-yl-charcoal truncate max-w-[200px]">{title}</li>
          </ol>
        </div>
      </nav>

      {/* ═══ Hero Section — Magazine Style ═══ */}
      {/* Explicit height prevents CLS (Cumulative Layout Shift) when hero image loads */}
      <section className="relative h-[28rem] md:h-[34rem] overflow-hidden pt-28">
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
            <div className="w-full h-full bg-gradient-to-br from-[#a82924] via-yl-dark-navy to-yl-dark-navy" />
          )}
          {/* Cinematic gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
        </div>

        {/* Hero content — aligned bottom-left, editorial style */}
        <div className="relative z-10 h-full flex items-end">
          <div className="max-w-7xl mx-auto px-7 pb-10 md:pb-14 w-full">
            <div>
              {/* Category + Reading Time */}
              <div className="flex flex-wrap items-center gap-3 mb-5">
                {categoryName && (
                  <Link
                    href={`/blog/category/${post.category?.slug}`}
                    className="inline-flex items-center gap-1.5"
                  >
                    <BrandTag color="gold">{categoryName}</BrandTag>
                  </Link>
                )}
                <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm text-white/90 px-3 py-1.5 rounded-[14px] text-xs font-body tracking-wide">
                  <Clock className="h-3 w-3" />
                  {language === 'en' ? `${readingTime} min read` : `${readingTime} دقائق قراءة`}
                </span>
              </div>

              {/* Title */}
              <h1 className={`text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-5 leading-[1.15] max-w-4xl ${isRTL ? 'font-arabic tracking-normal' : 'font-heading'}`}>
                {title}
              </h1>

              {/* Excerpt */}
              {excerpt && (
                <p className={`text-white/75 text-lg md:text-xl leading-relaxed max-w-3xl mb-6 ${isRTL ? 'font-arabic tracking-normal' : 'font-body'}`}>
                  {excerpt}
                </p>
              )}

              {/* Author row */}
              <div className="flex flex-wrap items-center gap-4 text-white/60 text-sm">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-yl-red flex items-center justify-center text-white font-bold text-sm">
                    {post.author?.name_en ? post.author.name_en.split(' ').map(w => w[0]).join('').slice(0, 2) : 'YL'}
                  </div>
                  <div>
                    <span className="text-white/90 font-medium block text-sm leading-tight">
                      {language === 'en'
                        ? (post.author?.name_en || 'Yalla London Editorial')
                        : (post.author?.name_ar || 'تحرير يلا لندن')}
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
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Tri-color Bar ═══ */}
      <TriBar />

      {/* ═══ Article Body — Two Column Layout ═══ */}
      <section className="py-10 md:py-14 bg-white" ref={articleRef}>
        <div className="max-w-7xl mx-auto px-7">
          <div className="flex flex-col lg:flex-row gap-10 lg:gap-14">

            {/* ─── Main Content Column ─── */}
            <article className="flex-1 min-w-0 max-w-3xl">
              <div>
                {/* Mobile share bar */}
                <div className="flex items-center justify-between mb-8 pb-6 border-b border-yl-gray-200 lg:hidden">
                  <BrandButton variant="outline" size="sm" href="/blog" className="gap-2">
                    <ArrowLeft className={`h-4 w-4 ${isRTL ? 'rotate-180' : ''}`} />
                    {language === 'en' ? 'All Stories' : 'كل القصص'}
                  </BrandButton>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsLiked(!isLiked)}
                      className={`p-2 rounded-full border transition-colors ${isLiked ? 'text-red-500 border-red-200 bg-red-50' : 'text-yl-gray-500 border-yl-gray-200 hover:border-yl-red/60'}`}
                    >
                      <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* ─── Article HTML Content ─── */}
                {isThinContent ? (
                  <div className="text-center py-12">
                    <p className="text-yl-gray-500 text-lg">
                      {language === 'en'
                        ? 'This article is being updated. Please check back soon.'
                        : 'هذا المقال قيد التحديث. يرجى العودة قريباً.'}
                    </p>
                  </div>
                ) : (
                  <div
                    className="yalla-article-content"
                    dangerouslySetInnerHTML={{
                      __html: sanitizedContent
                    }}
                  />
                )}

                {/* ─── Tags ─── */}
                {publicTags.length > 0 && (
                  <div className="mt-12 pt-8 border-t border-yl-gray-200">
                    <div className="flex items-center gap-2 mb-4">
                      <Tag className="h-4 w-4 text-yl-gray-500/50" />
                      <span className={`text-xs font-medium uppercase tracking-wider text-yl-gray-500/60 ${isRTL ? 'font-arabic tracking-normal' : 'font-body'}`}>
                        {language === 'en' ? 'Topics' : 'المواضيع'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {publicTags.map((tag) => (
                        <Link
                          key={tag}
                          href={`/blog?tag=${encodeURIComponent(tag)}`}
                          className="px-3.5 py-1.5 text-sm rounded-full bg-yl-cream border border-yl-gray-200 text-yl-gray-500 hover:border-yl-red/80 hover:text-yl-red hover:bg-yl-red/5 transition-all duration-200"
                        >
                          #{tag}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* ─── Author Card ─── */}
                <BrandCardLight className="mt-10 p-6 md:p-8" hoverable={false}>
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-yl-red to-[#a82924] flex items-center justify-center text-white font-heading font-bold text-lg shrink-0">
                      {post.author?.name_en ? post.author.name_en.split(' ').map(w => w[0]).join('').slice(0, 2) : 'YL'}
                    </div>
                    <div className="flex-1">
                      <h4 className={`font-bold text-yl-charcoal mb-1 ${isRTL ? 'font-arabic tracking-normal' : 'font-heading'}`}>
                        {language === 'en'
                          ? (post.author?.name_en || 'Yalla London Editorial')
                          : (post.author?.name_ar || 'فريق تحرير يلا لندن')}
                      </h4>
                      {post.author?.title_en && (
                        <p className={`text-xs text-yl-gray-500/70 mb-1.5 ${isRTL ? 'font-arabic tracking-normal' : 'font-body'}`}>
                          {post.author.title_en}
                        </p>
                      )}
                      <p className={`text-sm text-yl-gray-500 leading-relaxed ${isRTL ? 'font-arabic tracking-normal' : 'font-body'}`}>
                        {language === 'en'
                          ? (post.author?.bio_en || 'Curating the best of London for Arab travellers — luxury hotels, halal dining, hidden gems, and insider tips from our editorial team.')
                          : (post.author?.bio_ar || 'نقدم أفضل ما في لندن للمسافرين العرب — فنادق فاخرة، مطاعم حلال، أماكن مخفية، ونصائح من فريقنا التحريري.')}
                      </p>
                      {post.author && (post.author.linkedin_url || post.author.twitter_url || post.author.instagram_url) && (
                        <div className="flex gap-3 mt-3">
                          {post.author.linkedin_url && (
                            <a href={post.author.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-yl-gray-500/50 hover:text-yl-red transition-colors text-xs font-medium">
                              LinkedIn
                            </a>
                          )}
                          {post.author.twitter_url && (
                            <a href={post.author.twitter_url} target="_blank" rel="noopener noreferrer" className="text-yl-gray-500/50 hover:text-yl-red transition-colors text-xs font-medium">
                              X/Twitter
                            </a>
                          )}
                          {post.author.instagram_url && (
                            <a href={post.author.instagram_url} target="_blank" rel="noopener noreferrer" className="text-yl-gray-500/50 hover:text-yl-red transition-colors text-xs font-medium">
                              Instagram
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </BrandCardLight>

                {/* ─── Mobile Share Buttons (bottom) ─── */}
                <div className="lg:hidden">
                  <BrandCardLight className="mt-8 p-5 bg-yl-gray-100" hoverable={false}>
                    <p className={`text-xs font-medium text-yl-gray-500/60 mb-3 ${isRTL ? 'font-arabic tracking-normal' : 'font-body uppercase tracking-wider'}`}>
                      {language === 'en' ? 'Share This Story' : 'شارك هذه القصة'}
                    </p>
                    <ShareButtons title={title} excerpt={excerpt} variant="bar" />
                  </BrandCardLight>
                </div>
              </div>
            </article>

            {/* ─── Sidebar ─── */}
            <aside className="hidden lg:block w-72 shrink-0">
              <div className="sticky top-24 space-y-6">
                {/* Back button */}
                <BrandButton variant="outline" size="sm" href="/blog" className="w-full justify-start gap-2">
                  <ArrowLeft className={`h-4 w-4 ${isRTL ? 'rotate-180' : ''}`} />
                  {language === 'en' ? 'All Stories' : 'كل القصص'}
                </BrandButton>

                {/* Share card */}
                <BrandCardLight className="p-5" hoverable={false}>
                  <div className="flex items-center gap-2 mb-4">
                    <Share2 className="h-4 w-4 text-yl-gray-500/50" />
                    <span className="text-xs font-body font-medium uppercase tracking-wider text-yl-gray-500/60">
                      {language === 'en' ? 'Share' : 'مشاركة'}
                    </span>
                  </div>
                  <ShareButtons title={title} excerpt={excerpt} variant="bar" />
                  <div className="mt-4 pt-4 border-t border-yl-gray-200/40">
                    <button
                      onClick={() => setIsLiked(!isLiked)}
                      className={`flex items-center gap-2 text-sm transition-colors w-full ${
                        isLiked ? 'text-red-500' : 'text-yl-gray-500 hover:text-red-500'
                      }`}
                    >
                      <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
                      {language === 'en'
                        ? (isLiked ? 'Liked!' : 'Like this article')
                        : (isLiked ? 'أُعجبت!' : 'أعجبني هذا المقال')}
                    </button>
                  </div>
                </BrandCardLight>

                {/* Category banner */}
                {post.category && (
                  <Link
                    href={`/blog/category/${post.category.slug}`}
                    className="block p-5 rounded-[14px] bg-gradient-to-br from-yl-red to-[#a82924] text-white hover:from-yl-red hover:to-yl-dark-navy transition-all duration-300 group"
                  >
                    <span className="text-xs font-body font-medium uppercase tracking-widest text-white/50 block mb-2">
                      {language === 'en' ? 'Category' : 'الفئة'}
                    </span>
                    <span className={`text-lg font-bold block mb-1 ${isRTL ? 'font-arabic tracking-normal' : 'font-heading'}`}>
                      {categoryName}
                    </span>
                    <span className="text-xs text-white/60 flex items-center gap-1 group-hover:gap-2 transition-all">
                      {language === 'en' ? 'Explore more' : 'اكتشف المزيد'}
                      <ChevronRight className={`h-3 w-3 ${isRTL ? 'rotate-180' : ''}`} />
                    </span>
                  </Link>
                )}

                {/* Tags */}
                {publicTags.length > 0 && (
                  <BrandCardLight className="p-5" hoverable={false}>
                    <div className="flex items-center gap-2 mb-3">
                      <Tag className="h-3.5 w-3.5 text-yl-gray-500/50" />
                      <span className="text-xs font-body font-medium uppercase tracking-wider text-yl-gray-500/60">
                        {language === 'en' ? 'Topics' : 'المواضيع'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {publicTags.slice(0, 8).map((tag) => (
                        <Link
                          key={tag}
                          href={`/blog?tag=${encodeURIComponent(tag)}`}
                          className="px-2.5 py-1 text-xs rounded-full bg-white border border-yl-gray-200 text-yl-gray-500 hover:border-yl-red/80 hover:text-yl-red transition-all duration-200"
                        >
                          {tag}
                        </Link>
                      ))}
                    </div>
                  </BrandCardLight>
                )}

                {/* CTA banner */}
                <BrandCardLight className="p-5 bg-yl-gold/10 border-yl-gold/30" hoverable={false}>
                  <span className={`text-sm font-bold text-yl-charcoal block mb-2 ${isRTL ? 'font-arabic tracking-normal' : 'font-heading'}`}>
                    {language === 'en' ? 'Planning a London Trip?' : 'تخطط لرحلة لندن؟'}
                  </span>
                  <p className={`text-xs text-yl-gray-500 leading-relaxed mb-3 ${isRTL ? 'font-arabic tracking-normal' : 'font-body'}`}>
                    {language === 'en'
                      ? 'Browse our curated guides for hotels, restaurants, and experiences.'
                      : 'تصفح أدلتنا المختارة للفنادق والمطاعم والتجارب.'}
                  </p>
                  <Link
                    href="/information"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-yl-red hover:text-[#a82924] transition-colors"
                  >
                    {language === 'en' ? 'Information Hub' : 'مركز المعلومات'}
                    <ChevronRight className={`h-3 w-3 ${isRTL ? 'rotate-180' : ''}`} />
                  </Link>
                </BrandCardLight>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* ═══ Explore More CTA ═══ */}
      <section className="py-16 bg-yl-dark-navy">
        <div className="max-w-7xl mx-auto px-7 text-center">
          <h2 className={`text-2xl md:text-3xl font-bold text-yl-gray-100 mb-4 ${isRTL ? 'font-arabic tracking-normal' : 'font-heading'}`}>
            {language === 'en' ? 'Discover More London Stories' : 'اكتشف المزيد من قصص لندن'}
          </h2>
          <p className={`text-yl-gray-500 text-base mb-8 max-w-xl mx-auto ${isRTL ? 'font-arabic tracking-normal' : 'font-body'}`}>
            {language === 'en'
              ? 'From hidden restaurants to luxury hotels — explore our curated guides to London\'s finest experiences.'
              : 'من المطاعم المخفية إلى الفنادق الفاخرة — اكتشف أدلتنا المختارة لأفضل تجارب لندن.'}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <BrandButton variant="primary" href="/blog">
              {language === 'en' ? 'Browse All Stories' : 'تصفح جميع القصص'}
            </BrandButton>
            <BrandButton variant="outline" href="/information">
              {language === 'en' ? 'Travel Guides' : 'أدلة السفر'}
            </BrandButton>
          </div>
          <div className="mt-10">
            <FollowUs variant="dark" showLabel={true} />
          </div>
        </div>
      </section>

      {/* ═══ Sticky Mobile Share Bar ═══ */}
      {showStickyShare && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-t border-yl-gray-200 py-3 px-6 lg:hidden">
          <ShareButtons title={title} excerpt={excerpt} variant="bar" />
        </div>
      )}
    </div>
  )
}
