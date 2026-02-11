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
import { Search, Calendar, User, ArrowRight, Filter } from 'lucide-react'
import { motion } from 'framer-motion'

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

export default function BlogListClient({ posts }: BlogListClientProps) {
  const { language, isRTL } = useLanguage()
  const t = (key: string) => getTranslation(language, key)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [filteredPosts, setFilteredPosts] = useState<BlogPostData[]>(posts)

  // Filter posts based on search and category
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
      <section className="bg-gradient-to-br from-purple-50 to-yellow-50 py-16">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-5xl font-playfair font-bold gradient-text mb-4">
              {t('blog')}
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              {language === 'en'
                ? 'Discover the stories behind London\'s most luxurious experiences'
                : 'اكتشف القصص وراء أكثر التجارب الفاخرة في لندن'
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
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={language === 'en' ? 'Search stories...' : 'البحث في القصص...'}
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
            <div className="text-sm text-gray-500">
              {filteredPosts.length} {language === 'en' ? 'stories found' : 'قصة موجودة'}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Blog Posts Grid */}
      <section className="py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredPosts.map((post, index) => {
              const title = language === 'en' ? post.title_en : post.title_ar
              const excerpt = language === 'en' ? post.excerpt_en : post.excerpt_ar
              const categoryName = post.category
                ? (language === 'en' ? post.category.name_en : post.category.name_ar)
                : (language === 'en' ? 'General' : 'عام')

              return (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <Card className="overflow-hidden border-0 luxury-shadow hover:shadow-xl transition-all duration-300 h-full group">
                    <div className="relative aspect-video">
                      <Image
                        src={post.featured_image || '/images/placeholder-blog.jpg'}
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
                      <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDate(post.created_at)}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {language === 'en' ? 'Editorial Team' : 'فريق التحرير'}
                        </span>
                      </div>
                      <h3 className="text-xl font-semibold mb-3 text-gray-900 group-hover:text-brand-primary transition-colors line-clamp-2">
                        {title}
                      </h3>
                      <p className="text-gray-600 leading-relaxed flex-1 mb-4 line-clamp-3">
                        {excerpt}
                      </p>
                      <Button asChild variant="ghost" className="self-start p-0 h-auto text-brand-primary hover:text-[#5C0A23]">
                        <Link href={`/blog/${post.slug}`}>
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

          {filteredPosts.length === 0 && (
            <motion.div
              className="text-center py-12"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
            >
              <p className="text-xl text-gray-500">
                {language === 'en'
                  ? 'No stories found matching your criteria.'
                  : 'لم يتم العثور على قصص تطابق معاييرك.'
                }
              </p>
            </motion.div>
          )}
        </div>
      </section>
    </div>
  )
}
