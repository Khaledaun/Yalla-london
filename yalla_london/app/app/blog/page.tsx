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

const categoryImages = {
  'food-drink': 'https://www.thecityofldn.com/wp-content/uploads/2023/04/FM_Helen-Lowe_Resize.jpg',
  'style-shopping': 'https://images.squarespace-cdn.com/content/v1/5411b34ee4b0aa818cc870ab/1466172908075-A6FV4TX6XWUGBVAK7O8R/image-asset.jpeg',
  'culture-art': 'https://media.cntraveler.com/photos/6362cedae53ecbfee10ea662/16:9/w_3200,h_1800,c_limit/museums.jpg',
  'football': 'https://i.ytimg.com/vi/3GI_ICZY56k/maxresdefault.jpg',
  'uk-travel': 'https://media.houseandgarden.co.uk/photos/64de03217863f90371b7b1bf/16:9/w_2752,h_1548,c_limit/Shot-05-254.jpg'
}

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  slug: string;
  featured_image: string;
  page_type: string;
  created_at: string;
  category: {
    name_en: string;
    name_ar: string;
    slug: string;
  } | null;
  author: {
    name: string;
  } | null;
  url: string;
}

export default function BlogPage() {
  const { language, isRTL } = useLanguage()
  const t = (key: string) => getTranslation(language, key)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [filteredPosts, setFilteredPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch blog posts from API
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const params = new URLSearchParams({
          locale: language,
          limit: '50', // Get enough posts for client-side filtering
          sort: 'newest'
        })
        
        const response = await fetch(`/api/content?${params}`)
        const data = await response.json()
        
        if (data.success) {
          setPosts(data.data)
          setFilteredPosts(data.data)
        } else {
          throw new Error(data.error || 'Failed to fetch posts')
        }
      } catch (err) {
        console.error('Error fetching blog posts:', err)
        setError('Failed to load blog posts. Please try again later.')
        // Fallback to empty array instead of sample data
        setPosts([])
        setFilteredPosts([])
      } finally {
        setLoading(false)
      }
    }

    fetchPosts()
  }, [language])

  // Filter posts based on search and category
  useEffect(() => {
    let filtered = posts

    if (searchTerm) {
      filtered = filtered.filter(post =>
        post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.excerpt.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(post => 
        post.category?.slug === selectedCategory
      )
    }

    setFilteredPosts(filtered)
  }, [searchTerm, selectedCategory, posts])

  const categories = [
    { value: 'all', label: language === 'en' ? 'All Categories' : 'جميع الفئات' },
    { value: 'food-drink', label: t('categories.food-drink') },
    { value: 'style-shopping', label: t('categories.style-shopping') },
    { value: 'culture-art', label: t('categories.culture-art') },
    { value: 'football', label: t('categories.football') },
    { value: 'uk-travel', label: t('categories.uk-travel') }
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
          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-gray-200 aspect-video rounded-t-lg"></div>
                  <div className="p-6 space-y-4">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-200 rounded"></div>
                      <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <motion.div
              className="text-center py-12"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
            >
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
                <p className="text-red-800 font-medium">
                  {language === 'en' ? 'Error Loading Content' : 'خطأ في تحميل المحتوى'}
                </p>
                <p className="text-red-600 text-sm mt-2">{error}</p>
                <Button 
                  onClick={() => window.location.reload()} 
                  className="mt-4"
                  variant="outline"
                >
                  {language === 'en' ? 'Try Again' : 'حاول مرة أخرى'}
                </Button>
              </div>
            </motion.div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredPosts.map((post, index) => (
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
                        alt={post.title}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute top-4 left-4">
                        <span className="bg-white/90 px-3 py-1 rounded-full text-xs font-medium text-purple-800">
                          {post.category ? 
                            (language === 'en' ? post.category.name_en : post.category.name_ar) : 
                            t('categories.general')
                          }
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
                          {post.author?.name || (language === 'en' ? 'Editorial Team' : 'فريق التحرير')}
                        </span>
                      </div>
                      <h3 className="text-xl font-semibold mb-3 text-gray-900 group-hover:text-purple-800 transition-colors">
                        {post.title}
                      </h3>
                      <p className="text-gray-600 leading-relaxed flex-1 mb-4">
                        {post.excerpt}
                      </p>
                      <Button asChild variant="ghost" className="self-start p-0 h-auto text-purple-800 hover:text-purple-900">
                        <Link href={`/blog/${post.slug}`}>
                          {t('readMore')}
                          <ArrowRight className={`ml-2 h-4 w-4 ${isRTL ? 'rtl-flip' : ''}`} />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}

          {!loading && !error && filteredPosts.length === 0 && (
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
              {posts.length === 0 && (
                <p className="text-gray-400 mt-2">
                  {language === 'en' 
                    ? 'Blog posts will appear here once content is published.'
                    : 'ستظهر المقالات هنا بمجرد نشر المحتوى.'
                  }
                </p>
              )}
            </motion.div>
          )}
        </div>
      </section>
    </div>
  )
}
