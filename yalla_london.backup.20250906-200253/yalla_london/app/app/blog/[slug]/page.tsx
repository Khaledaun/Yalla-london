
'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useLanguage } from '@/components/language-provider'
import { getTranslation } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Calendar, User, ArrowLeft, Share2, Heart, BookOpen } from 'lucide-react'
import { motion } from 'framer-motion'
import { useParams } from 'next/navigation'

const samplePost = {
  id: '1',
  title_en: 'The Ultimate Guide to Michelin-Starred Dining in London',
  title_ar: 'الدليل الشامل لتناول الطعام في مطاعم لندن الحاصلة على نجمة ميشلان',
  content_en: `
    <p>London's culinary landscape has evolved into one of the world's most sophisticated dining scenes, with numerous restaurants earning the coveted Michelin stars. From intimate chef's tables to grand dining rooms, these establishments represent the pinnacle of culinary excellence.</p>
    
    <h2>Three-Star Excellence</h2>
    <p>At the apex of London's dining scene sits Restaurant Gordon Ramsay, the city's only three-Michelin-starred establishment. Located in Chelsea, this restaurant offers an extraordinary tasting menu that showcases Chef Gordon Ramsay's innovative approach to modern European cuisine.</p>
    
    <h2>Two-Star Sensations</h2>
    <p>The Ledbury, Alain Ducasse at The Dorchester, and Sketch (Lecture Room) represent London's two-star establishments. Each offers a unique perspective on fine dining, from The Ledbury's modern British cuisine to Alain Ducasse's refined French techniques.</p>
    
    <h2>One-Star Gems</h2>
    <p>London boasts over 60 one-Michelin-starred restaurants, each offering exceptional cuisine and service. Notable mentions include Dishoom's elevated Indian cuisine, Core by Clare Smyth's British-focused menu, and Ikoyi's innovative West African flavors.</p>
    
    <h2>Making Reservations</h2>
    <p>Securing a table at these prestigious establishments requires planning. Most Michelin-starred restaurants accept reservations 2-3 months in advance, and some operate on a ballot system for their most sought-after tables.</p>
  `,
  content_ar: `
    <p>تطورت المناظر الطبيعية الطهوية في لندن لتصبح واحدة من أكثر مشاهد الطعام تطوراً في العالم، مع العديد من المطاعم التي تحصل على نجوم ميشلان المرغوبة. من طاولات الطهاة الحميمة إلى قاعات الطعام الكبرى، تمثل هذه المؤسسات قمة التميز في الطهي.</p>
    
    <h2>التميز بثلاث نجوم</h2>
    <p>في قمة مشهد تناول الطعام في لندن يقع مطعم غوردون رامزي، المؤسسة الوحيدة في المدينة التي تحمل ثلاث نجوم ميشلان. يقع هذا المطعم في تشيلسي، ويقدم قائمة تذوق استثنائية تعرض نهج الشيف غوردون رامزي المبتكر للمأكولات الأوروبية الحديثة.</p>
    
    <h2>إحساس النجمتين</h2>
    <p>يمثل The Ledbury وAlain Ducasse في فندق The Dorchester وSketch (Lecture Room) مؤسسات لندن ذات النجمتين. كل منها يقدم منظوراً فريداً للطعام الراقي، من المأكولات البريطانية الحديثة في The Ledbury إلى التقنيات الفرنسية المنقحة لآلان دوكاس.</p>
    
    <h2>جواهر النجمة الواحدة</h2>
    <p>تفتخر لندن بأكثر من 60 مطعماً حاصلاً على نجمة ميشلان واحدة، كل منها يقدم مأكولات وخدمة استثنائية. تشمل الإشارات البارزة المأكولات الهندية المرتفعة في Dishoom، وقائمة Core by Clare Smyth المركزة على الطعام البريطاني، ونكهات Ikoyi المبتكرة لغرب أفريقيا.</p>
    
    <h2>إجراء الحجوزات</h2>
    <p>يتطلب الحصول على طاولة في هذه المؤسسات المرموقة التخطيط. معظم المطاعم الحاصلة على نجمة ميشلان تقبل الحجوزات قبل 2-3 أشهر، وبعضها يعمل بنظام الاقتراع لطاولاتها الأكثر طلباً.</p>
  `,
  excerpt_en: 'Discover London\'s finest restaurants that have earned the prestigious Michelin stars, from innovative tasting menus to classic fine dining.',
  excerpt_ar: 'اكتشف أفضل مطاعم لندن التي حصلت على نجوم ميشلان المرموقة، من قوائم التذوق المبتكرة إلى المأكولات الراقية الكلاسيكية.',
  slug: 'michelin-starred-dining-london',
  category: 'food-drink',
  featured_image: 'https://www.thecityofldn.com/wp-content/uploads/2023/04/FM_Helen-Lowe_Resize.jpg',
  created_at: '2024-12-20T10:00:00Z'
}

export default function BlogPostPage() {
  const { language, isRTL } = useLanguage()
  const t = (key: string) => getTranslation(language, key)
  const params = useParams()
  const [isLiked, setIsLiked] = useState(false)

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

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: language === 'en' ? samplePost.title_en : samplePost.title_ar,
          text: language === 'en' ? samplePost.excerpt_en : samplePost.excerpt_ar,
          url: window.location.href,
        })
      } catch (error) {
        console.log('Error sharing:', error)
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href)
    }
  }

  return (
    <div className={`${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Hero Section */}
      <section className="relative h-96 overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src={samplePost.featured_image}
            alt={language === 'en' ? samplePost.title_en : samplePost.title_ar}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-black/50" />
        </div>
        
        <div className="relative z-10 h-full flex items-center">
          <div className="max-w-4xl mx-auto px-6 text-white text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="mb-4">
                <span className="bg-yellow-500 text-gray-900 px-4 py-2 rounded-full text-sm font-medium">
                  {t(`categories.${samplePost.category}`)}
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-playfair font-bold mb-6">
                {language === 'en' ? samplePost.title_en : samplePost.title_ar}
              </h1>
              <div className="flex items-center justify-center gap-6 text-gray-200">
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {formatDate(samplePost.created_at)}
                </span>
                <span className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {language === 'en' ? 'Founder' : 'المؤسسة'}
                </span>
                <span className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  {language === 'en' ? '5 min read' : '٥ دقائق للقراءة'}
                </span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Article Content */}
      <section className="py-12 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="prose prose-lg max-w-none"
          >
            {/* Action Buttons */}
            <div className="flex items-center justify-between mb-8 pb-6 border-b">
              <Button asChild variant="outline" size="sm">
                <Link href="/blog">
                  <ArrowLeft className={`mr-2 h-4 w-4 ${isRTL ? 'rtl-flip' : ''}`} />
                  {language === 'en' ? 'Back to Stories' : 'العودة للقصص'}
                </Link>
              </Button>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsLiked(!isLiked)}
                  className={`${isLiked ? 'text-red-500 border-red-200' : ''}`}
                >
                  <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
                </Button>
                <Button variant="outline" size="sm" onClick={handleShare}>
                  <Share2 className="h-4 w-4" />
                  <span className="ml-2">{t('share')}</span>
                </Button>
              </div>
            </div>

            {/* Article Body */}
            <div 
              className="text-gray-800 leading-relaxed"
              dangerouslySetInnerHTML={{ 
                __html: language === 'en' ? samplePost.content_en : samplePost.content_ar 
              }}
            />
          </motion.div>
        </div>
      </section>

      {/* Related Posts */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h3 className="text-3xl font-playfair font-bold text-center mb-12 gradient-text">
              {language === 'en' ? 'More London Stories' : 'المزيد من حكايات لندن'}
            </h3>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map((item, index) => (
                <motion.div
                  key={item}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.2 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="bg-white rounded-lg overflow-hidden luxury-shadow hover:shadow-xl transition-all duration-300">
                    <div className="relative aspect-video">
                      <Image
                        src={samplePost.featured_image}
                        alt="Related post"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="p-6">
                      <h4 className="text-lg font-semibold mb-3 text-gray-900">
                        {language === 'en' 
                          ? 'Discover London\'s Hidden Gems'
                          : 'اكتشف الكنوز المخفية في لندن'
                        }
                      </h4>
                      <p className="text-gray-600 text-sm mb-4">
                        {language === 'en'
                          ? 'Explore the secret spots that only locals know about...'
                          : 'استكشف الأماكن السرية التي لا يعرفها سوى المحليون...'
                        }
                      </p>
                      <Button asChild variant="ghost" size="sm" className="p-0 h-auto text-purple-800">
                        <Link href="/blog/sample-post">
                          {t('readMore')}
                          <ArrowLeft className={`ml-2 h-4 w-4 ${isRTL ? 'rtl-flip' : ''}`} />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
