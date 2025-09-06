
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

const samplePosts = [
  {
    id: '1',
    title_en: 'The Ultimate Guide to Michelin-Starred Dining in London',
    title_ar: 'الدليل الشامل لتناول الطعام في مطاعم لندن الحاصلة على نجمة ميشلان',
    excerpt_en: 'Discover London\'s finest restaurants that have earned the prestigious Michelin stars, from innovative tasting menus to classic fine dining.',
    excerpt_ar: 'اكتشف أفضل مطاعم لندن التي حصلت على نجوم ميشلان المرموقة، من قوائم التذوق المبتكرة إلى المأكولات الراقية الكلاسيكية.',
    slug: 'michelin-starred-dining-london',
    category: 'food-drink',
    featured_image: categoryImages['food-drink'],
    created_at: '2024-12-20T10:00:00Z'
  },
  {
    id: '2',
    title_en: 'Shopping Like Royalty: London\'s Most Exclusive Boutiques',
    title_ar: 'التسوق كالملوك: أكثر البوتيكات حصرية في لندن',
    excerpt_en: 'From Savile Row to Harrods, explore the luxury shopping destinations where London\'s elite find their perfect pieces.',
    excerpt_ar: 'من شارع سافيل رو إلى هارودز، استكشف وجهات التسوق الفاخرة حيث تجد نخبة لندن قطعها المثالية.',
    slug: 'exclusive-boutiques-london',
    category: 'style-shopping',
    featured_image: categoryImages['style-shopping'],
    created_at: '2024-12-18T15:30:00Z'
  },
  {
    id: '3',
    title_en: 'Art After Dark: London\'s Private Gallery Exhibitions',
    title_ar: 'الفن بعد الظلام: معارض الأعمال الفنية الخاصة في لندن',
    excerpt_en: 'Experience London\'s vibrant art scene through exclusive evening exhibitions and private gallery viewings.',
    excerpt_ar: 'اختبر مشهد الفن النابض بالحياة في لندن من خلال المعارض المسائية الحصرية وعروض الأعمال الفنية الخاصة.',
    slug: 'private-gallery-exhibitions-london',
    category: 'culture-art',
    featured_image: categoryImages['culture-art'],
    created_at: '2024-12-15T12:00:00Z'
  },
  {
    id: '4',
    title_en: 'Premier League VIP: The Ultimate Football Experience',
    title_ar: 'بريمير ليغ في آي بي: تجربة كرة القدم المطلقة',
    excerpt_en: 'Get behind-the-scenes access to London\'s top football clubs and experience matches like never before.',
    excerpt_ar: 'احصل على إمكانية الوصول وراء الكواليس لأفضل أندية كرة القدم في لندن واختبر المباريات كما لم تفعل من قبل.',
    slug: 'premier-league-vip-experience',
    category: 'football',
    featured_image: categoryImages['football'],
    created_at: '2024-12-12T09:15:00Z'
  },
  {
    id: '5',
    title_en: 'Country Estates and Manor Houses: Day Trips from London',
    title_ar: 'العقارات الريفية والمنازل الأرستقراطية: رحلات يومية من لندن',
    excerpt_en: 'Escape the city to discover Britain\'s most magnificent country estates and historic manor houses.',
    excerpt_ar: 'اهرب من المدينة لاكتشاف أروع العقارات الريفية والمنازل الأرستقراطية التاريخية في بريطانيا.',
    slug: 'country-estates-day-trips',
    category: 'uk-travel',
    featured_image: categoryImages['uk-travel'],
    created_at: '2024-12-10T14:45:00Z'
  }
]

export default function BlogPage() {
  const { language, isRTL } = useLanguage()
  const t = (key: string) => getTranslation(language, key)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [filteredPosts, setFilteredPosts] = useState(samplePosts)

  useEffect(() => {
    let filtered = samplePosts

    if (searchTerm) {
      filtered = filtered.filter(post =>
        (language === 'en' ? post.title_en : post.title_ar)
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (language === 'en' ? post.excerpt_en : post.excerpt_ar)
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      )
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(post => post.category === selectedCategory)
    }

    setFilteredPosts(filtered)
  }, [searchTerm, selectedCategory, language])

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
                      src={post.featured_image}
                      alt={language === 'en' ? post.title_en : post.title_ar}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute top-4 left-4">
                      <span className="bg-white/90 px-3 py-1 rounded-full text-xs font-medium text-purple-800">
                        {t(`categories.${post.category}`)}
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
                        {language === 'en' ? 'Founder' : 'المؤسسة'}
                      </span>
                    </div>
                    <h3 className="text-xl font-semibold mb-3 text-gray-900 group-hover:text-purple-800 transition-colors">
                      {language === 'en' ? post.title_en : post.title_ar}
                    </h3>
                    <p className="text-gray-600 leading-relaxed flex-1 mb-4">
                      {language === 'en' ? post.excerpt_en : post.excerpt_ar}
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
