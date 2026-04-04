'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useLanguage } from '@/components/language-provider'
import { getTranslation } from '@/lib/i18n'
import { Search, Calendar, User, ArrowRight, Filter } from 'lucide-react'
import { FollowUs } from '@/components/follow-us'
import { TriBar, BrandButton, BrandTag, BrandCardLight, SectionLabel, WatermarkStamp, Breadcrumbs } from '@/components/brand-kit'

interface BlogPostData {
  id: string
  slug: string
  title_en: string
  title_ar: string
  excerpt_en: string
  excerpt_ar: string
  featured_image: string
  created_at: string
  reading_time: number
  category: {
    id: string
    name_en: string
    name_ar: string
    slug: string
  } | null
}

interface BlogListClientProps {
  posts: BlogPostData[]
}

// Format raw-slug or all-lowercase titles into readable Title Case.
const SMALL_WORDS = new Set(['in', 'for', 'and', 'the', 'of', 'to', 'a', 'an', 'with', 'by', 'at', 'on', 'is']);
const formatTitle = (title: string) => {
  const isSlug = !title.includes(' ') && title.includes('-') && !/[A-Z]/.test(title);
  const isAllLowercase = title === title.toLowerCase() && title.length > 10 && !/[A-Z]/.test(title);

  if (isSlug || isAllLowercase) {
    const words = title.replace(/-/g, ' ').split(/\s+/);
    return words
      .map((w, i) => {
        if (i === 0) return w.charAt(0).toUpperCase() + w.slice(1);
        if (/^\d{4}$/.test(w)) return w;
        if (SMALL_WORDS.has(w)) return w;
        return w.charAt(0).toUpperCase() + w.slice(1);
      })
      .join(' ');
  }
  return title;
};

export default function BlogListClient({ posts }: BlogListClientProps) {
  const { language, isRTL } = useLanguage()
  const t = (key: string) => getTranslation(language, key)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [filteredPosts, setFilteredPosts] = useState<BlogPostData[]>(posts)

  useEffect(() => {
    let filtered = posts

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(post => {
        const title = language === 'en' ? post.title_en : post.title_ar
        const excerpt = language === 'en' ? post.excerpt_en : post.excerpt_ar
        return title.toLowerCase().includes(term) || excerpt.toLowerCase().includes(term)
      })
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(post => post.category?.slug === selectedCategory)
    }

    setFilteredPosts(filtered)
  }, [searchTerm, selectedCategory, posts, language])

  const categories = [
    { value: 'all', label: language === 'en' ? 'All Categories' : 'جميع الفئات' },
    { value: 'restaurants', label: language === 'en' ? 'Restaurants & Dining' : 'المطاعم والمأكولات' },
    { value: 'hotels', label: language === 'en' ? 'Hotels & Accommodation' : 'الفنادق والإقامة' },
    { value: 'shopping', label: language === 'en' ? 'Shopping & Fashion' : 'التسوق والأزياء' },
    { value: 'attractions', label: language === 'en' ? 'Attractions & Tours' : 'المعالم والجولات' },
    { value: 'guides', label: language === 'en' ? 'Travel Guides' : 'أدلة السفر' },
    { value: 'events', label: language === 'en' ? 'Events & Celebrations' : 'الفعاليات والاحتفالات' },
  ]

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    if (language === 'en') {
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    } else {
      return date.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })
    }
  }

  return (
    <div className={`${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Header */}
      <section className="bg-yl-dark-navy pt-28 pb-16 relative overflow-hidden">
        <WatermarkStamp />
        <div className="relative z-10 max-w-7xl mx-auto px-7 text-center">
          <Breadcrumbs items={[
            { label: language === 'en' ? 'Home' : 'الرئيسية', href: '/' },
            { label: t('blog') },
          ]} />
          <SectionLabel>{language === 'en' ? 'Stories & Guides' : 'قصص وأدلة'}</SectionLabel>
          <h1 className="text-4xl sm:text-5xl font-heading font-bold text-white mb-4">
            {t('blog')}
          </h1>
          <p className="text-xl text-yl-gray-400 max-w-2xl mx-auto font-body">
            {language === 'en'
              ? 'Discover the stories behind London\'s most luxurious experiences'
              : 'اكتشف القصص وراء أكثر التجارب الفاخرة في لندن'
            }
          </p>
        </div>
      </section>

      <TriBar />

      {/* Search and Filter */}
      <section className="py-6 bg-white border-b border-yl-gray-200 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-7">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-yl-gray-500" />
                <input
                  placeholder={language === 'en' ? 'Search stories...' : 'البحث في القصص...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2.5 w-full sm:w-80 border border-yl-gray-200 rounded-[14px] font-body focus:outline-none focus:ring-2 focus:ring-yl-gold/30 focus:border-yl-gold"
                />
              </div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-yl-gray-500" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="pl-10 pr-8 py-2.5 w-full sm:w-48 border border-yl-gray-200 rounded-[14px] font-body text-sm appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-yl-gold/30 focus:border-yl-gold"
                >
                  {categories.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="font-mono text-[11px] tracking-wider uppercase text-yl-gray-500">
              {filteredPosts.length} {language === 'en' ? 'stories found' : 'قصة موجودة'}
            </div>
          </div>
        </div>
      </section>

      {/* Blog Posts Grid */}
      <section className="py-12 bg-yl-cream">
        <div className="max-w-7xl mx-auto px-7">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredPosts.map((post) => {
              const title = formatTitle(language === 'en' ? post.title_en : post.title_ar)
              const excerpt = language === 'en' ? post.excerpt_en : post.excerpt_ar
              const categoryName = post.category
                ? (language === 'en' ? post.category.name_en : post.category.name_ar)
                : (language === 'en' ? 'General' : 'عام')

              return (
                <BrandCardLight key={post.id} className="overflow-hidden group h-full flex flex-col">
                  <div className="relative aspect-video">
                    <Image
                      src={post.featured_image || '/images/placeholder-blog.svg'}
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
                    <div className="flex items-center gap-4 font-mono text-[11px] tracking-wider uppercase text-yl-gray-500 mb-3">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-yl-gold" />
                        {formatDate(post.created_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="h-4 w-4 text-yl-gold" />
                        {language === 'en' ? 'Editorial Team' : 'فريق التحرير'}
                      </span>
                    </div>
                    <h3 className="text-xl font-heading font-semibold mb-3 text-yl-charcoal group-hover:text-yl-red transition-colors line-clamp-2">
                      {title}
                    </h3>
                    <p className="text-yl-gray-500 font-body leading-relaxed flex-1 mb-4 line-clamp-3">
                      {excerpt}
                    </p>
                    <Link href={`/blog/${post.slug}`} className="self-start flex items-center gap-2 text-yl-red font-heading font-medium text-sm group-hover:gap-3 transition-all">
                      {t('readMore')}
                      <ArrowRight className={`h-4 w-4 ${isRTL ? 'rtl-flip' : ''}`} />
                    </Link>
                  </div>
                </BrandCardLight>
              )
            })}
          </div>

          {filteredPosts.length === 0 && (
            <div className="text-center py-12">
              <p className="text-xl text-yl-gray-500 font-body">
                {language === 'en'
                  ? 'No stories found matching your criteria.'
                  : 'لم يتم العثور على قصص تطابق معاييرك.'
                }
              </p>
            </div>
          )}
        </div>
      </section>

      <TriBar />

      {/* Follow Us */}
      <section className="py-10 bg-yl-dark-navy">
        <div className="max-w-7xl mx-auto px-7 text-center">
          <FollowUs variant="dark" showLabel={true} />
        </div>
      </section>
    </div>
  )
}
