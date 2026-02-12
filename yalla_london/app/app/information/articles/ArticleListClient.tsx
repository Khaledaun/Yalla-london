'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useLanguage } from '@/components/language-provider'
import { getTranslation } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Calendar, BookOpen, ArrowRight, Filter } from 'lucide-react'
import { motion } from 'framer-motion'

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
}

export default function ArticleListClient({ articles }: ArticleListClientProps) {
  const { language, isRTL } = useLanguage()
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
    <div className={`py-12 ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Header */}
      <section className="bg-gradient-to-br from-cream to-cream-200 py-16">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-4xl sm:text-5xl font-display font-bold gradient-text mb-4">
              {language === 'en' ? 'Information Hub' : 'مركز المعلومات'}
            </h1>
            <p className="text-xl text-stone max-w-2xl mx-auto">
              {language === 'en'
                ? 'Your comprehensive guide to visiting London — from planning to exploring'
                : 'دليلك الشامل لزيارة لندن — من التخطيط إلى الاستكشاف'
              }
            </p>
          </motion.div>
        </div>
      </section>

      {/* Search and Filter */}
      <section className="py-8 bg-white border-b">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            className="flex flex-col md:flex-row gap-4 items-center justify-between"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-stone" />
                <Input
                  placeholder={language === 'en' ? 'Search articles...' : 'البحث في المقالات...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full sm:w-80"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full sm:w-48">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-stone">
              {filteredArticles.length} {language === 'en' ? 'articles found' : 'مقالة موجودة'}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Articles Grid */}
      <section className="py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredArticles.map((article, index) => {
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
                        src={article.featured_image || '/images/placeholder-article.jpg'}
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
                          <Calendar className="h-4 w-4" />
                          {formatDate(article.created_at)}
                        </span>
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-4 w-4" />
                          {language === 'en' ? `${article.reading_time} min read` : `${article.reading_time} دقائق للقراءة`}
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

          {filteredArticles.length === 0 && (
            <motion.div
              className="text-center py-12"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
            >
              <p className="text-xl text-stone">
                {language === 'en'
                  ? 'No articles found matching your criteria.'
                  : 'لم يتم العثور على مقالات تطابق معاييرك.'
                }
              </p>
            </motion.div>
          )}
        </div>
      </section>
    </div>
  )
}
