'use client'



import Image from 'next/image'
import { useLanguage } from '@/components/language-provider'
import { getTranslation } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Mail, MapPin, Heart, Crown, Star, Coffee } from 'lucide-react'
import { motion } from 'framer-motion'

const founderImages = [
  'https://media.cntraveller.com/photos/66b1f6248feace68eac032f7/16:9/w_3200,h_1800,c_limit/south%20asian%20heritage%20month.jpg',
  'https://studioindigo.co.uk/wp-content/uploads/2024/10/StudioIndigo_portfolio_MayfairGallery_HERO.jpg'
]

export default function AboutPage() {
  const { language, isRTL } = useLanguage()
  const t = (key: string) => getTranslation(language, key)

  const stats = [
    {
      number: '500+',
      label_en: 'Places Explored',
      label_ar: 'مكان مستكشف',
      icon: MapPin
    },
    {
      number: '50+',
      label_en: 'Michelin Restaurants',
      label_ar: 'مطعم ميشلان',
      icon: Star
    },
    {
      number: '10+',
      label_en: 'Years in London',
      label_ar: 'سنوات في لندن',
      icon: Heart
    },
    {
      number: '1000+',
      label_en: 'Happy Travelers',
      label_ar: 'مسافر سعيد',
      icon: Crown
    }
  ]

  const values = [
    {
      title_en: 'Authenticity',
      title_ar: 'الأصالة',
      description_en: 'Every recommendation comes from personal experience and genuine passion for London\'s culture.',
      description_ar: 'كل توصية تأتي من التجربة الشخصية والشغف الحقيقي لثقافة لندن.',
      icon: Heart
    },
    {
      title_en: 'Excellence',
      title_ar: 'التميز',
      description_en: 'Only the finest establishments make it to our curated list of recommendations.',
      description_ar: 'فقط أفضل المؤسسات تصل إلى قائمة التوصيات المنسقة الخاصة بنا.',
      icon: Crown
    },
    {
      title_en: 'Cultural Bridge',
      title_ar: 'جسر ثقافي',
      description_en: 'Connecting Arab travelers with London\'s rich heritage through bilingual insights.',
      description_ar: 'ربط المسافرين العرب بالتراث الغني للندن من خلال رؤى ثنائية اللغة.',
      icon: Coffee
    }
  ]

  return (
    <div className={`${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Hero Section */}
      <section className="relative h-96 overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src={founderImages[1]}
            alt="Founder workspace"
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#5C0A23]/85 to-[#D4AF37]/70" />
        </div>
        
        <div className="relative z-10 h-full flex items-center">
          <div className="max-w-6xl mx-auto px-6 text-white">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="max-w-2xl"
            >
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-playfair font-bold mb-6">
                {t('founderTitle')}
              </h1>
              <p className="text-xl md:text-2xl text-amber-50/90">
                {language === 'en'
                  ? 'Your personal guide to London\'s most exclusive experiences'
                  : 'دليلك الشخصي للتجارب الأكثر حصرية في لندن'
                }
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Founder Story */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="space-y-6"
            >
              <h2 className="text-4xl font-playfair font-bold gradient-text">
                {language === 'en' ? 'A Passionate Explorer' : 'مستكشفة شغوفة'}
              </h2>
              <div className="space-y-4 text-lg text-gray-700 leading-relaxed">
                <p>
                  {language === 'en'
                    ? 'After moving to London over a decade ago, I fell deeply in love with this incredible city. What started as personal curiosity evolved into an expertise in discovering London\'s most refined experiences.'
                    : 'بعد الانتقال إلى لندن منذ أكثر من عقد، وقعت في حب عميق مع هذه المدينة المذهلة. ما بدأ كفضول شخصي تطور إلى خبرة في اكتشاف أكثر التجارب تطوراً في لندن.'
                  }
                </p>
                <p>
                  {language === 'en'
                    ? 'From secret speakeasies in Shoreditch to private viewings at world-renowned galleries, I\'ve spent years building relationships with London\'s most exclusive venues. My bilingual background allows me to bridge cultures, making London accessible to both English and Arabic-speaking travelers.'
                    : 'من البارات السرية في شورديتش إلى العروض الخاصة في الصالات المشهورة عالمياً، قضيت سنوات في بناء علاقات مع أكثر الأماكن حصرية في لندن. خلفيتي ثنائية اللغة تسمح لي بربط الثقافات، مما يجعل لندن في متناول المسافرين الذين يتحدثون الإنجليزية والعربية.'
                  }
                </p>
                <p>
                  {language === 'en'
                    ? 'Yalla London represents my commitment to sharing the sophisticated side of this magnificent city with discerning travelers who appreciate quality, authenticity, and exceptional experiences.'
                    : 'يالا لندن يمثل التزامي بمشاركة الجانب المتطور من هذه المدينة الرائعة مع المسافرين المميزين الذين يقدرون الجودة والأصالة والتجارب الاستثنائية.'
                  }
                </p>
              </div>
              <Button asChild size="lg" className="bg-brand-primary hover:bg-[#5C0A23] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8B1538]">
                <a href="mailto:hello@yalla-london.com">
                  <Mail className="mr-2 h-5 w-5" />
                  {language === 'en' ? 'Get in Touch' : 'تواصل معي'}
                </a>
              </Button>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative"
            >
              <div className="aspect-[3/4] rounded-2xl overflow-hidden luxury-shadow">
                <Image
                  src={founderImages[0]}
                  alt="Founder portrait"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="absolute -bottom-6 -left-6 bg-yellow-500 text-gray-900 p-4 rounded-xl luxury-shadow">
                <div className="text-2xl font-bold">10+</div>
                <div className="text-sm font-medium">
                  {language === 'en' ? 'Years Experience' : 'سنوات خبرة'}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl font-playfair font-bold gradient-text mb-4">
              {language === 'en' ? 'By the Numbers' : 'بالأرقام'}
            </h2>
            <p className="text-xl text-gray-600">
              {language === 'en'
                ? 'A testament to years of exploration and discovery'
                : 'شهادة على سنوات من الاستكشاف والاكتشاف'
              }
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="text-center"
              >
                <Card className="p-6 border-0 luxury-shadow hover:shadow-xl transition-shadow duration-300">
                  <CardContent className="p-0">
                    <div className="w-16 h-16 mx-auto mb-4 bg-purple-100 rounded-full flex items-center justify-center">
                      <stat.icon className="h-8 w-8 text-purple-800" />
                    </div>
                    <div className="text-3xl font-bold text-purple-800 mb-2">
                      {stat.number}
                    </div>
                    <div className="text-gray-600 font-medium">
                      {language === 'en' ? stat.label_en : stat.label_ar}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl font-playfair font-bold gradient-text mb-4">
              {language === 'en' ? 'My Values' : 'قيمي'}
            </h2>
            <p className="text-xl text-gray-600">
              {language === 'en'
                ? 'The principles that guide every recommendation'
                : 'المبادئ التي توجه كل توصية'
              }
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {values.map((value, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                className="text-center"
              >
                <Card className="p-8 border-0 luxury-shadow hover:shadow-xl transition-all duration-300 h-full">
                  <CardContent className="p-0">
                    <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-purple-100 to-yellow-50 rounded-full flex items-center justify-center">
                      <value.icon className="h-10 w-10 text-purple-800" />
                    </div>
                    <h3 className="text-2xl font-playfair font-bold mb-4 text-gray-900">
                      {language === 'en' ? value.title_en : value.title_ar}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {language === 'en' ? value.description_en : value.description_ar}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-20 bg-gradient-to-br from-[#5C0A23] via-[#8B1538] to-[#D4AF37] text-white">
        <div className="max-w-4xl mx-auto text-center px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl font-playfair font-bold mb-6">
              {language === 'en' 
                ? 'Let\'s Explore London Together'
                : 'دعونا نستكشف لندن معاً'
              }
            </h2>
            <p className="text-xl mb-8 text-amber-50/90">
              {language === 'en'
                ? 'Have questions about London? Looking for personalized recommendations? I\'d love to help you discover this amazing city.'
                : 'لديك أسئلة حول لندن؟ تبحث عن توصيات شخصية؟ أود أن أساعدك في اكتشاف هذه المدينة المذهلة.'
              }
            </p>
            <Button asChild size="lg" className="bg-white text-[#5C0A23] hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
              <a href="mailto:hello@yalla-london.com">
                <Mail className="mr-2 h-5 w-5" />
                {language === 'en' ? 'Send a Message' : 'أرسل رسالة'}
              </a>
            </Button>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
