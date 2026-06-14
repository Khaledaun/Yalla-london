'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useLanguage } from '@/components/language-provider'
import { getTranslation } from '@/lib/i18n'
import { TriBar, BrandButton, BrandTag, BrandCardLight, SectionLabel, WatermarkStamp, Breadcrumbs } from '@/components/brand-kit'
import { Search, Calendar, BookOpen, ArrowRight, Filter } from 'lucide-react'

interface ArticleData {
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

interface ArticleListClientProps {
  articles: ArticleData[]
  serverLocale?: 'en' | 'ar'
}

export default function ArticleListClient({ articles, serverLocale }: ArticleListClientProps) {
  const { language: clientLanguage, isRTL } = useLanguage()
  const language = serverLocale ?? clientLanguage
  const t = (key: string) => getTranslation(language, key)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [filteredArticles, setFilteredArticles] = useState<ArticleData[]>(articles)

  // Filter articles based on search and category
  useEffect(() => {
    let filtered = articles

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(article => {
        const title = language === 'en' ? article.title_en : article.title_ar
        const excerpt = language === 'en' ? article.excerpt_en : article.excerpt_ar
        return title.toLowerCase().includes(term) || excerpt.toLowerCase().includes(term)
      })
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(article => article.category?.slug === selectedCategory)
    }

    setFilteredArticles(filtered)
  }, [searchTerm, selectedCategory, articles, language])

  const categories = [
    { value: 'all', label: language === 'en' ? 'All Categories' : 'جميع الفئات' },
    { value: 'planning', label: language === 'en' ? 'Planning & Logistics' : 'التخطيط واللوجستيات' },
    { value: 'places', label: language === 'en' ? 'Places & Attractions' : 'الأماكن والمعالم' },
    { value: 'transport', label: language === 'en' ? 'Getting Around' : 'التنقل والمواصلات' },
    { value: 'food', label: language === 'en' ? 'Food & Dining' : 'الطعام والمطاعم' },
    { value: 'family', label: language === 'en' ? 'Family & Activities' : 'العائلة والأنشطة' },
    { value: 'practical', label: language === 'en' ? 'Practical Tips' : 'نصائح عملية' },
    { value: 'culture', label: language === 'en' ? 'Culture & Events' : 'الثقافة والفعاليات' },
    { value: 'luxury', label: language === 'en' ? 'Luxury & Shopping' : 'الفخامة والتسوق' },
  ]

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

  return (
    <div className={`${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Hero Section */}
      <section className="bg-yl-dark-navy pt-28 pb-16 relative overflow-hidden">
        <WatermarkStamp />
        <div className="max-w-7xl mx-auto px-7 relative z-10">
          <Breadcrumbs items={[
            { label: language === 'en' ? 'Home' : 'الرئيسية', href: '/' },
            { label: language === 'en' ? 'Information Hub' : 'مركز المعلومات', href: '/information' },
            { label: language === 'en' ? 'Articles' : 'المقالات' },
          ]} />
          <div className="text-center mt-6">
            <SectionLabel>{language === 'en' ? 'Knowledge Base' : 'قاعدة المعرفة'}</SectionLabel>
            <h1 className="text-4xl sm:text-5xl font-heading font-bold text-white mb-4">
              {language === 'en' ? 'Information Hub' : 'مركز المعلومات'}
            </h1>
            <p className="text-xl text-white/70 max-w-2xl mx-auto font-body">
              {language === 'en'
                ? 'Your comprehensive guide to visiting London — from planning to exploring'
                : 'دليلك الشامل لزيارة لندن — من التخطيط إلى الاستكشاف'
              }
            </p>
          </div>
        </div>
      </section>
      <TriBar />

      {/* Search and Filter */}
      <section className="py-8 bg-white border-b border-yl-gray-200">
        <div className="max-w-7xl mx-auto px-7">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-yl-gray-500" />
                <input
                  placeholder={language === 'en' ? 'Search articles...' : 'البحث في المقالات...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full sm:w-80 px-4 py-2.5 border border-yl-gray-200 rounded-[14px] font-body focus:outline-none focus:ring-2 focus:ring-yl-gold/30 focus:border-yl-gold text-sm"
                />
              </div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-yl-gray-500 pointer-events-none" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full sm:w-48 pl-10 pr-4 py-2.5 border border-yl-gray-200 rounded-[14px] font-body text-sm appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-yl-gold/30 focus:border-yl-gold"
                >
                  {categories.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="text-sm text-yl-gray-500 font-body">
              {filteredArticles.length} {language === 'en' ? 'articles found' : 'مقالة موجودة'}
            </div>
          </div>
        </div>
      </section>

      {/* Articles Grid */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-7">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredArticles.map((article) => {
              const title = language === 'en' ? article.title_en : article.title_ar
              const excerpt = language === 'en' ? article.excerpt_en : article.excerpt_ar
              const categoryName = article.category
                ? (language === 'en' ? article.category.name_en : article.category.name_ar)
                : (language === 'en' ? 'General' : 'عام')

              return (
                <div key={article.id}>
                  <BrandCardLight className="overflow-hidden h-full group hover:shadow-xl transition-all duration-300">
                    <div className="relative aspect-video">
                      <Image
                        src={article.featured_image || '/images/placeholder-article.jpg'}
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
                          <Calendar className="h-4 w-4" />
                          {formatDate(article.created_at)}
                        </span>
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-4 w-4" />
                          {language === 'en' ? `${article.reading_time} min read` : `${article.reading_time} دقائق للقراءة`}
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

          {filteredArticles.length === 0 && (
            <div className="text-center py-12">
              <p className="text-xl text-yl-gray-500 font-body">
                {language === 'en'
                  ? 'No articles found matching your criteria.'
                  : 'لم يتم العثور على مقالات تطابق معاييرك.'
                }
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
