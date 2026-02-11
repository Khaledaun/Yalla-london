'use client'


import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useLanguage } from '@/components/language-provider'
import { getTranslation } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Search, MapPin, Star, Phone, Globe, ExternalLink, Filter } from 'lucide-react'
import { motion } from 'framer-motion'

const sampleRecommendations = [
  {
    id: '1',
    name_en: 'The Savoy Hotel',
    name_ar: 'فندق السافوي',
    type: 'hotel',
    category: 'luxury',
    description_en: 'An iconic luxury hotel on the Strand, offering legendary service and elegant accommodations with Thames views.',
    description_ar: 'فندق فاخر أيقوني على الستراند، يقدم خدمة أسطورية وإقامة أنيقة مع إطلالات على نهر التايمز.',
    address_en: 'Strand, Covent Garden, London WC2R 0EU',
    address_ar: 'ستراند، كوفنت غاردن، لندن WC2R 0EU',
    rating: 4.9,
    price_range: '£800-2000',
    images: ['https://media.houseandgarden.co.uk/photos/62136a961d28f04fde7897ff/16:9/w_6992,h_3933,c_limit/PRINT%20-%20The%20London%20EDITION%20-%20Lobby%203%20-%20Please%20credit%20Nikolas%20Koenig.jpg'],
    features_en: ['River Thames Views', 'Michelin-starred Dining', 'American Bar', '24/7 Butler Service', 'Spa & Fitness'],
    features_ar: ['إطلالات نهر التايمز', 'مطعم حاصل على نجمة ميشلان', 'البار الأمريكي', 'خدمة الخادم الشخصي ٢٤/٧', 'سبا وصالة رياضية'],
    phone: '+44 20 7836 4343',
    website: 'https://www.thesavoylondon.com'
  },
  {
    id: '2',
    name_en: 'Sketch Restaurant',
    name_ar: 'مطعم سكيتش',
    type: 'restaurant',
    category: 'luxury',
    description_en: 'A surreal dining experience in Mayfair with innovative cuisine and artistic pink pod restrooms.',
    description_ar: 'تجربة طعام سريالية في مايفير مع مأكولات مبتكرة وحمامات فنية وردية.',
    address_en: '9 Conduit St, Mayfair, London W1S 2XG',
    address_ar: '٩ شارع كوندويت، مايفير، لندن W1S 2XG',
    rating: 4.7,
    price_range: '£150-300',
    images: ["https://s3.amazonaws.com/a.storyblok.com/f/116532/1600x900/99055d6381/park-chinois-london-restaurant.webp"],
    features_en: ['Michelin Star', 'Unique Art Installation', 'Afternoon Tea', 'Private Dining Rooms', 'Cocktail Bar'],
    features_ar: ['نجمة ميشلان', 'معرض فني فريد', 'شاي بعد الظهر', 'غرف طعام خاصة', 'بار كوكتيل'],
    phone: '+44 20 7659 4500',
    website: 'https://sketch.london'
  },
  {
    id: '3',
    name_en: 'Harrods',
    name_ar: 'هارودز',
    type: 'attraction',
    category: 'luxury',
    description_en: 'The world\'s most famous luxury department store in Knightsbridge, offering exclusive shopping and dining.',
    description_ar: 'أشهر متجر متعدد الأقسام الفاخر في العالم في نايتسبريدج، يقدم التسوق والطعام الحصري.',
    address_en: '87-135 Brompton Rd, Knightsbridge, London SW1X 7XL',
    address_ar: '٨٧-١٣٥ طريق برومبتون، نايتسبريدج، لندن SW1X 7XL',
    rating: 4.6,
    price_range: '£50-5000',
    images: ['https://images.squarespace-cdn.com/content/v1/5411b34ee4b0aa818cc870ab/1466172908075-A6FV4TX6XWUGBVAK7O8R/image-asset.jpeg'],
    features_en: ['Personal Shopping Service', 'Food Halls', 'Luxury Brands', 'Beauty Concierge', 'Gift Wrapping'],
    features_ar: ['خدمة التسوق الشخصي', 'قاعات الطعام', 'العلامات التجارية الفاخرة', 'كونسيرج الجمال', 'تغليف الهدايا'],
    phone: '+44 20 7730 1234',
    website: 'https://www.harrods.com'
  },
  {
    id: '4',
    name_en: 'Claridge\'s Hotel',
    name_ar: 'فندق كلاريدجز',
    type: 'hotel',
    category: 'luxury',
    description_en: 'Art Deco elegance meets modern luxury in this Mayfair institution, favored by royalty and celebrities.',
    description_ar: 'أناقة آرت ديكو تلتقي بالفخامة الحديثة في هذه المؤسسة في مايفير، المفضلة لدى الملوك والمشاهير.',
    address_en: 'Brook St, Mayfair, London W1K 4HR',
    address_ar: 'شارع بروك، مايفير، لندن W1K 4HR',
    rating: 4.8,
    price_range: '£900-3000',
    images: ['https://cms.inspirato.com/ImageGen.ashx?image=%2Fmedia%2F9420869%2Flondon_shangri-la-hotel-at-the-shard-london-iconic-city-view-king.jpg&width=1081.5'],
    features_en: ['Art Deco Design', 'Michelin-starred Restaurant', 'Afternoon Tea', 'Spa by ESPA', 'Private Dining'],
    features_ar: ['تصميم آرت ديكو', 'مطعم حاصل على نجمة ميشلان', 'شاي بعد الظهر', 'سبا من ESPA', 'طعام خاص'],
    phone: '+44 20 7629 8860',
    website: 'https://www.claridges.co.uk'
  }
]

export default function RecommendationsPage() {
  const { language, isRTL } = useLanguage()
  const t = (key: string) => getTranslation(language, key)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState('all')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [filteredRecommendations, setFilteredRecommendations] = useState(sampleRecommendations)

  useEffect(() => {
    let filtered = sampleRecommendations

    if (searchTerm) {
      filtered = filtered.filter(item =>
        (language === 'en' ? item.name_en : item.name_ar)
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (language === 'en' ? item.description_en : item.description_ar)
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      )
    }

    if (selectedType !== 'all') {
      filtered = filtered.filter(item => item.type === selectedType)
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category === selectedCategory)
    }

    setFilteredRecommendations(filtered)
  }, [searchTerm, selectedType, selectedCategory, language])

  const types = [
    { value: 'all', label: language === 'en' ? 'All Types' : 'جميع الأنواع' },
    { value: 'hotel', label: t('hotels') },
    { value: 'restaurant', label: t('restaurants') },
    { value: 'attraction', label: t('attractions') }
  ]

  const categories = [
    { value: 'all', label: language === 'en' ? 'All Categories' : 'جميع الفئات' },
    { value: 'luxury', label: t('luxury') },
    { value: 'mid-range', label: t('midRange') },
    { value: 'budget', label: t('budget') }
  ]

  const renderStars = (rating: number) => {
    const stars = []
    for (let i = 0; i < 5; i++) {
      stars.push(
        <Star
          key={i}
          className={`h-4 w-4 ${i < Math.floor(rating) ? 'fill-yalla-gold-400 text-yalla-gold-400' : 'text-sand'}`}
        />
      )
    }
    return stars
  }

  return (
    <div className={`py-12 ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Header */}
      <section className="bg-gradient-to-br from-cream to-cream-100 py-16">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-5xl font-display font-bold gradient-text mb-4">
              {t('recommendations')}
            </h1>
            <p className="text-xl text-stone max-w-2xl mx-auto">
              {language === 'en'
                ? 'Handpicked luxury experiences across London\'s finest establishments'
                : 'تجارب فاخرة مختارة يدوياً من أفضل المؤسسات في لندن'
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
                  placeholder={language === 'en' ? 'Search recommendations...' : 'البحث في التوصيات...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full sm:w-80"
                />
              </div>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-full sm:w-48">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {types.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full sm:w-48">
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
              {filteredRecommendations.length} {language === 'en' ? 'recommendations' : 'توصية'}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Recommendations Grid */}
      <section className="py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-8">
            {filteredRecommendations.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                whileHover={{ scale: 1.02 }}
              >
                <Card className="overflow-hidden border-0 luxury-shadow hover:shadow-xl transition-all duration-300 h-full">
                  <div className="relative aspect-video">
                    <Image
                      src={item.images[0]}
                      alt={language === 'en' ? item.name_en : item.name_ar}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute top-4 left-4 flex gap-2">
                      <Badge className="bg-white/90 text-charcoal hover:bg-white">
                        {t(item.type === 'hotel' ? 'hotels' : item.type === 'restaurant' ? 'restaurants' : 'attractions')}
                      </Badge>
                      <Badge variant="secondary" className="bg-yalla-gold-500 text-charcoal hover:bg-yalla-gold-500">
                        {t(item.category)}
                      </Badge>
                    </div>
                  </div>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-charcoal mb-2">
                          {language === 'en' ? item.name_en : item.name_ar}
                        </h3>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex items-center">
                            {renderStars(item.rating)}
                          </div>
                          <span className="text-sm text-stone">
                            {item.rating} / 5
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-london-600">
                          {item.price_range}
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-stone leading-relaxed mb-4">
                      {language === 'en' ? item.description_en : item.description_ar}
                    </p>
                    
                    <div className="flex items-center gap-2 text-sm text-stone mb-4">
                      <MapPin className="h-4 w-4" />
                      <span>{language === 'en' ? item.address_en : item.address_ar}</span>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      {(language === 'en' ? item.features_en : item.features_ar).slice(0, 3).map((feature, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                    
                    <div className="flex items-center gap-2 pt-4 border-t">
                      {item.phone && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => {
                            if (typeof window !== 'undefined') {
                              window.open(`tel:${item.phone}`, '_self');
                            }
                          }}
                        >
                          <Phone className="h-4 w-4 mr-2" />
                          {language === 'en' ? 'Call' : 'اتصل'}
                        </Button>
                      )}
                      {item.website && (
                        <Button asChild size="sm" className="flex-1 bg-london-600 hover:bg-london-700">
                          <a href={item.website} target="_blank" rel="noopener noreferrer">
                            <Globe className="h-4 w-4 mr-2" />
                            {language === 'en' ? 'Visit' : 'زيارة'}
                          </a>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {filteredRecommendations.length === 0 && (
            <motion.div
              className="text-center py-12"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
            >
              <p className="text-xl text-stone">
                {language === 'en' 
                  ? 'No recommendations found matching your criteria.'
                  : 'لم يتم العثور على توصيات تطابق معاييرك.'
                }
              </p>
            </motion.div>
          )}
        </div>
      </section>
    </div>
  )
}
