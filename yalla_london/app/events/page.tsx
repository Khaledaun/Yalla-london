
'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useLanguage } from '@/components/language-provider'
import { getTranslation } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, MapPin, Calendar, Clock, Star, ExternalLink } from 'lucide-react'
import { motion } from 'framer-motion'

const events = [
  {
    id: 1,
    title: {
      en: 'Arsenal vs Chelsea - Premier League',
      ar: 'أرسنال ضد تشيلسي - الدوري الإنجليزي الممتاز'
    },
    description: {
      en: 'Experience the North London derby at the iconic Emirates Stadium with VIP hospitality packages.',
      ar: 'اختبر ديربي شمال لندن في استاد الإمارات الأيقوني مع باقات الضيافة VIP.'
    },
    date: '2024-12-28',
    time: '15:00',
    venue: 'Emirates Stadium',
    category: 'Football',
    price: 'From £120',
    image: 'https://i.ytimg.com/vi/I1vtWKrQgNg/maxresdefault.jpg',
    rating: 4.9,
    bookingUrl: '#'
  },
  {
    id: 2,
    title: {
      en: 'The Lion King - Musical Theatre',
      ar: 'الأسد الملك - مسرح موسيقي'
    },
    description: {
      en: 'The award-winning musical that brings the Pride Lands to life with stunning costumes and music.',
      ar: 'المسرحية الموسيقية الحائزة على جوائز التي تحيي أراضي الكبرياء بالأزياء والموسيقى المذهلة.'
    },
    date: '2025-01-15',
    time: '19:30',
    venue: 'Lyceum Theatre',
    category: 'Theatre',
    price: 'From £45',
    image: 'https://i.ytimg.com/vi/E-Iy4sMGTkE/hq720.jpg?sqp=-oaymwE7CK4FEIIDSFryq4qpAy0IARUAAAAAGAElAADIQj0AgKJD8AEB-AH-CYAC0AWKAgwIABABGHIgXihEMA8=&rs=AOn4CLC_A4RSFYwTpAJ04FDsZqNhhgmmUg',
    rating: 4.8,
    bookingUrl: '#'
  },
  {
    id: 3,
    title: {
      en: 'New Year\'s Eve Fireworks',
      ar: 'الألعاب النارية لليلة رأس السنة'
    },
    description: {
      en: 'Ring in the New Year with spectacular fireworks over the Thames with premium viewing areas.',
      ar: 'استقبل العام الجديد بالألعاب النارية المذهلة فوق نهر التايمز مع مناطق المشاهدة المميزة.'
    },
    date: '2024-12-31',
    time: '23:45',
    venue: 'Thames Riverside',
    category: 'Event',
    price: 'From £25',
    image: 'https://i.ytimg.com/vi/xj42ooABWPg/hqdefault.jpg',
    rating: 4.7,
    bookingUrl: '#'
  },
  {
    id: 4,
    title: {
      en: 'Winter Wonderland Hyde Park',
      ar: 'أرض العجائب الشتوية هايد بارك'
    },
    description: {
      en: 'London\'s magical Christmas market with rides, food, and festive entertainment.',
      ar: 'سوق عيد الميلاد السحري في لندن مع الألعاب والطعام والترفيه الاحتفالي.'
    },
    date: '2024-12-20',
    time: '10:00',
    venue: 'Hyde Park',
    category: 'Festival',
    price: 'Free Entry',
    image: 'https://i.ytimg.com/vi/SolQqtVQ7vA/maxresdefault.jpg',
    rating: 4.6,
    bookingUrl: '#'
  },
  {
    id: 5,
    title: {
      en: 'Tottenham vs Manchester United',
      ar: 'توتنهام ضد مانشستر يونايتد'
    },
    description: {
      en: 'Premier League clash at the state-of-the-art Tottenham Hotspur Stadium.',
      ar: 'صدام الدوري الإنجليزي الممتاز في استاد توتنهام هوتسبر الحديث.'
    },
    date: '2025-01-10',
    time: '16:30',
    venue: 'Tottenham Hotspur Stadium',
    category: 'Football',
    price: 'From £95',
    image: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800&h=600&fit=crop',
    rating: 4.8,
    bookingUrl: '#'
  },
  {
    id: 6,
    title: {
      en: 'Phantom of the Opera',
      ar: 'شبح الأوبرا'
    },
    description: {
      en: 'The longest-running musical in West End history, a timeless tale of romance and mystery.',
      ar: 'أطول مسرحية موسيقية في تاريخ ويست إند، حكاية خالدة من الرومانسية والغموض.'
    },
    date: '2025-01-20',
    time: '19:30',
    venue: 'Her Majesty\'s Theatre',
    category: 'Theatre',
    price: 'From £35',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop',
    rating: 4.9,
    bookingUrl: '#'
  }
]

export default function EventsPage() {
  const { language, isRTL } = useLanguage()
  const t = (key: string) => getTranslation(language, key)

  const categoryColors: Record<string, string> = {
    Football: 'bg-green-100 text-green-800',
    Theatre: 'bg-purple-100 text-purple-800',
    Event: 'bg-yellow-100 text-yellow-800',
    Festival: 'bg-pink-100 text-pink-800'
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return language === 'en' 
      ? date.toLocaleDateString('en-GB', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })
      : date.toLocaleDateString('ar-SA', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })
  }

  return (
    <div className={`${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Hero Section */}
      <section className="relative h-96 flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&h=800&fit=crop"
            alt="London Events"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-black/50" />
        </div>
        
        <motion.div 
          className="relative z-10 text-center text-white px-6 max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
        >
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            {language === 'en' ? 'London Events & Tickets' : 'فعاليات وتذاكر لندن'}
          </h1>
          <p className="text-xl md:text-2xl text-gray-200">
            {language === 'en' 
              ? 'Book premium tickets for the best London experiences'
              : 'احجز تذاكر مميزة لأفضل تجارب لندن'
            }
          </p>
        </motion.div>
      </section>

      {/* Events Grid */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl font-bold gradient-text mb-4">
              {language === 'en' ? 'Upcoming Events' : 'الفعاليات القادمة'}
            </h2>
            <p className="text-xl text-gray-600">
              {language === 'en' 
                ? 'Curated selection of London\'s finest entertainment'
                : 'مجموعة مختارة من أفضل وسائل الترفيه في لندن'
              }
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {events.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                whileHover={{ scale: 1.02 }}
              >
                <Card className="overflow-hidden border-0 luxury-shadow hover:shadow-xl transition-all duration-300 bg-white">
                  <div className="relative aspect-video">
                    <Image
                      src={event.image}
                      alt={event.title[language]}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute top-4 left-4">
                      <Badge className={categoryColors[event.category] || 'bg-gray-100 text-gray-800'}>
                        {event.category}
                      </Badge>
                    </div>
                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full">
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium text-gray-900">{event.rating}</span>
                      </div>
                    </div>
                  </div>
                  
                  <CardContent className="p-6">
                    <h3 className="text-xl font-bold mb-2 text-gray-900">
                      {event.title[language]}
                    </h3>
                    
                    <p className="text-gray-600 leading-relaxed mb-4">
                      {event.description[language]}
                    </p>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(event.date)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Clock className="h-4 w-4" />
                        <span>{event.time}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <MapPin className="h-4 w-4" />
                        <span>{event.venue}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-purple-800">
                        {event.price}
                      </span>
                      <Button 
                        className="bg-purple-800 hover:bg-purple-900"
                        onClick={() => {
                          if (typeof window !== 'undefined') {
                            window.open('/contact?booking=' + encodeURIComponent(event.title[language]), '_blank');
                          }
                        }}
                      >
                        {language === 'en' ? 'Book Now' : 'احجز الآن'}
                        <ExternalLink className={`h-4 w-4 ${isRTL ? 'mr-2 rtl-flip' : 'ml-2'}`} />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 bg-gradient-to-br from-purple-900 via-purple-800 to-yellow-600 text-white">
        <div className="max-w-4xl mx-auto text-center px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl font-bold mb-6">
              {language === 'en' 
                ? 'Can\'t Find What You\'re Looking For?'
                : 'لا تجد ما تبحث عنه؟'
              }
            </h2>
            <p className="text-xl mb-8 text-purple-100">
              {language === 'en'
                ? 'Contact us for personalized event recommendations and exclusive access'
                : 'اتصل بنا للحصول على توصيات فعاليات مخصصة ووصول حصري'
              }
            </p>
            <div className="flex gap-4 justify-center">
              <Button asChild size="lg" className="bg-white text-purple-900 hover:bg-gray-100">
                <Link href="/contact">
                  {language === 'en' ? 'Contact Us' : 'اتصل بنا'}
                  <ArrowRight className={`h-5 w-5 ${isRTL ? 'mr-2 rtl-flip' : 'ml-2'}`} />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                <Link href="/recommendations">
                  {language === 'en' ? 'View All Recommendations' : 'عرض جميع التوصيات'}
                  <MapPin className={`h-5 w-5 ${isRTL ? 'mr-2 rtl-flip' : 'ml-2'}`} />
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
