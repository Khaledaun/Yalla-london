'use client'


import Image from 'next/image'
import Link from 'next/link'
import { useLanguage } from '@/components/language-provider'
import { getTranslation } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowRight, MapPin, Star, Calendar } from 'lucide-react'
import { motion, useInView } from 'framer-motion'
import { useRef, useEffect, useState } from 'react'
import { NewsletterSignup } from '@/components/newsletter-signup'

const heroImages = [
  'https://thumbs.dreamstime.com/b/breathtaking-golden-hour-sunset-over-iconic-london-skyline-viewed-leaves-tree-tranquil-river-thames-reflects-warm-367271565.jpg',
  'https://media.houseandgarden.co.uk/photos/62136a961d28f04fde7897ff/16:9/w_6992,h_3933,c_limit/PRINT%20-%20The%20London%20EDITION%20-%20Lobby%203%20-%20Please%20credit%20Nikolas%20Koenig.jpg',
  'https://www.visitlondon.com/-/media/images/london/visit/things-to-do/london-areas/mayfair/bond-street-mayfair-640x360.jpg?h=360&w=640&rev=b3e4ae94260648e3a41c5a0267b428fc&hash=E8C2F09FDFAC70EEE46180BA23E94299'
]

const categoryImages = {
  'food-drink': 'https://www.thecityofldn.com/wp-content/uploads/2023/04/FM_Helen-Lowe_Resize.jpg',
  'style-shopping': 'https://images.squarespace-cdn.com/content/v1/5411b34ee4b0aa818cc870ab/1466172908075-A6FV4TX6XWUGBVAK7O8R/image-asset.jpeg',
  'culture-art': 'https://media.cntraveler.com/photos/6362cedae53ecbfee10ea662/16:9/w_3200,h_1800,c_limit/museums.jpg',
  'uk-travel': 'https://media.houseandgarden.co.uk/photos/64de03217863f90371b7b1bf/16:9/w_2752,h_1548,c_limit/Shot-05-254.jpg'
}

export default function Home() {
  const { language, isRTL } = useLanguage()
  const t = (key: string) => getTranslation(language, key)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const heroRef = useRef(null)
  const isHeroInView = useInView(heroRef, { once: true })

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % heroImages.length)
    }, 5000)
    
    return () => clearInterval(interval)
  }, [])

  const featuredCategories = [
    {
      slug: 'food-drink',
      title: t('categories.food-drink'),
      description: language === 'en' 
        ? 'Discover London\'s finest restaurants and hidden culinary gems' 
        : 'اكتشف أفضل مطاعم لندن والكنوز الطهوية المخفية',
      image: categoryImages['food-drink']
    },
    {
      slug: 'style-shopping',
      title: t('categories.style-shopping'),
      description: language === 'en'
        ? 'Explore luxury boutiques and exclusive shopping destinations'
        : 'استكشف البوتيكات الفاخرة ووجهات التسوق الحصرية',
      image: categoryImages['style-shopping']
    },
    {
      slug: 'culture-art',
      title: t('categories.culture-art'),
      description: language === 'en'
        ? 'Immerse yourself in London\'s rich cultural and artistic heritage'
        : 'انغمس في التراث الثقافي والفني الغني في لندن',
      image: categoryImages['culture-art']
    },
    {
      slug: 'uk-travel',
      title: t('categories.uk-travel'),
      description: language === 'en'
        ? 'Venture beyond London to discover Britain\'s luxury escapes'
        : 'تجول خارج لندن لاكتشاف الملاذات الفاخرة في بريطانيا',
      image: categoryImages['uk-travel']
    }
  ]

  return (
    <div className={`${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Hero Section */}
      <section ref={heroRef} className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Background Images with Parallax */}
        <div className="absolute inset-0">
          {heroImages.map((image, index) => (
            <div
              key={index}
              className={`absolute inset-0 transition-opacity duration-1000 ${
                index === currentImageIndex ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <div className="relative w-full h-full">
                <Image
                  src={image}
                  alt="London luxury"
                  fill
                  className="object-cover"
                  priority={index === 0}
                />
                <div className="absolute inset-0 bg-black/40" />
              </div>
            </div>
          ))}
        </div>

        {/* Hero Content */}
        <motion.div 
          className="relative z-10 text-center text-white px-6 max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 50 }}
          animate={isHeroInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1, delay: 0.2 }}
        >
          <motion.h1 
            className="text-5xl md:text-7xl font-bold mb-6"
            initial={{ opacity: 0, y: 30 }}
            animate={isHeroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1, delay: 0.4 }}
          >
            {t('heroTitle')}
          </motion.h1>
          <motion.p 
            className="text-xl md:text-2xl mb-8 text-gray-200"
            initial={{ opacity: 0, y: 30 }}
            animate={isHeroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1, delay: 0.6 }}
          >
            {t('heroSubtitle')}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isHeroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1, delay: 0.8 }}
          >
            <Button asChild size="lg" className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-semibold px-8 py-4 text-lg">
              <Link href="/recommendations">
                {t('exploreButton')}
                <ArrowRight className={`ml-2 h-5 w-5 ${isRTL ? 'rtl-flip' : ''}`} />
              </Link>
            </Button>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div 
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
          initial={{ opacity: 0 }}
          animate={isHeroInView ? { opacity: 1 } : {}}
          transition={{ duration: 1, delay: 1.2 }}
        >
          <div className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-white/50 rounded-full mt-2 animate-bounce" />
          </div>
        </motion.div>
      </section>

      {/* Latest Experiences Section */}
      <section className="py-20 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl font-bold gradient-text mb-4">
              {t('latestExperiences')}
            </h2>
            <p className="text-xl text-gray-600">
              {language === 'en' 
                ? 'Discover the newest luxury experiences London has to offer'
                : 'اكتشف أحدث التجارب الفاخرة التي تقدمها لندن'
              }
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: language === 'en' ? 'Exclusive Rooftop Dining at Sky Garden' : 'تناول طعام حصري في سكاي جاردن',
                description: language === 'en' ? 'Experience London\'s skyline while dining at the highest restaurant in the city' : 'استمتع بأفق لندن أثناء تناول الطعام في أعلى مطعم في المدينة',
                image: 'https://media.timeout.com/images/105658049/image.jpg',
                price: '£120'
              },
              {
                title: language === 'en' ? 'Private Thames Luxury Cruise' : 'رحلة فاخرة خاصة على نهر التايمز',
                description: language === 'en' ? 'Sail through London\'s heart on a private luxury yacht with champagne service' : 'أبحر عبر قلب لندن على يخت فاخر خاص مع خدمة الشمبانيا',
                image: 'https://i.ytimg.com/vi/yeXNCdnaxhA/maxresdefault.jpg',
                price: '£300'
              },
              {
                title: language === 'en' ? 'Behind-the-Scenes Tower of London' : 'جولة خلف الكواليس في برج لندن',
                description: language === 'en' ? 'Exclusive access to areas of the Tower closed to the general public' : 'دخول حصري إلى مناطق البرج المغلقة أمام الجمهور',
                image: 'https://images.pexels.com/photos/1796706/pexels-photo-1796706.jpeg?auto=compress&cs=tinysrgb&h=627&fit=crop&w=1200',
                price: '£85'
              }
            ].map((experience, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                whileHover={{ scale: 1.02 }}
              >
                <Card className="overflow-hidden border-0 luxury-shadow hover:shadow-xl transition-all duration-300 bg-white">
                  <div className="relative aspect-video">
                    <Image
                      src={experience.image}
                      alt={experience.title}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute top-4 right-4 bg-yellow-500 text-gray-900 px-3 py-1 rounded-full font-bold text-sm">
                      {experience.price}
                    </div>
                  </div>
                  <CardContent className="p-6">
                    <h3 className="text-xl font-bold mb-3 text-gray-900">
                      {experience.title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed mb-4">
                      {experience.description}
                    </p>
                    <Button 
                      className="w-full bg-purple-800 hover:bg-purple-900"
                      onClick={() => {
                        // Track booking click
                        if (typeof window !== 'undefined') {
                          window.open('/contact?booking=' + encodeURIComponent(experience.title), '_blank');
                        }
                      }}
                    >
                      {t('bookNow')}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Upcoming Events Section */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl font-bold gradient-text mb-4">
              {t('upcomingEvents')}
            </h2>
            <p className="text-xl text-gray-600">
              {language === 'en' 
                ? 'Don\'t miss these exclusive London events'
                : 'لا تفوت هذه الفعاليات الحصرية في لندن'
              }
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: language === 'en' ? 'Arsenal vs Chelsea' : 'أرسنال ضد تشيلسي',
                date: language === 'en' ? 'Dec 28, 2024' : '٢٨ ديسمبر ٢٠٢٤',
                venue: 'Emirates Stadium',
                image: 'https://i.ytimg.com/vi/I1vtWKrQgNg/maxresdefault.jpg',
                category: language === 'en' ? 'Football' : 'كرة القدم'
              },
              {
                title: language === 'en' ? 'The Lion King Musical' : 'مسرحية الأسد الملك الموسيقية',
                date: language === 'en' ? 'Jan 15, 2025' : '١٥ يناير ٢٠٢٥',
                venue: 'Lyceum Theatre',
                image: 'https://i.ytimg.com/vi/E-Iy4sMGTkE/hq720.jpg?sqp=-oaymwE7CK4FEIIDSFryq4qpAy0IARUAAAAAGAElAADIQj0AgKJD8AEB-AH-CYAC0AWKAgwIABABGHIgXihEMA8=&rs=AOn4CLC_A4RSFYwTpAJ04FDsZqNhhgmmUg',
                category: language === 'en' ? 'Theatre' : 'مسرح'
              },
              {
                title: language === 'en' ? 'New Year\'s Fireworks' : 'الألعاب النارية للعام الجديد',
                date: language === 'en' ? 'Dec 31, 2024' : '٣١ ديسمبر ٢٠٢٤',
                venue: 'Thames Riverside',
                image: 'https://upload.wikimedia.org/wikipedia/commons/b/bb/The_London_Fireworks_Display.jpg',
                category: language === 'en' ? 'Event' : 'فعالية'
              },
              {
                title: language === 'en' ? 'Winter Wonderland' : 'أرض العجائب الشتوية',
                date: language === 'en' ? 'Until Jan 5' : 'حتى ٥ يناير',
                venue: 'Hyde Park',
                image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/Winter_Wonderland%2C_Hyde_Park%2C_London_-_geograph.org.uk_-_4749324.jpg/960px-Winter_Wonderland%2C_Hyde_Park%2C_London_-_geograph.org.uk_-_4749324.jpg',
                category: language === 'en' ? 'Festival' : 'مهرجان'
              }
            ].map((event, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                whileHover={{ scale: 1.02 }}
              >
                <Card className="overflow-hidden border-0 luxury-shadow hover:shadow-xl transition-all duration-300 bg-white">
                  <div className="relative aspect-[4/3]">
                    <Image
                      src={event.image}
                      alt={event.title}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute top-4 left-4 bg-white/90 text-gray-900 px-3 py-1 rounded-full font-medium text-sm">
                      {event.category}
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                      <Calendar className="h-4 w-4" />
                      <span>{event.date}</span>
                    </div>
                    <h3 className="font-bold mb-2 text-gray-900 text-sm">
                      {event.title}
                    </h3>
                    <p className="text-gray-600 text-sm mb-3 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {event.venue}
                    </p>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="w-full border-purple-200 text-purple-800 hover:bg-purple-50"
                      onClick={() => {
                        if (typeof window !== 'undefined') {
                          window.open('/events?event=' + encodeURIComponent(event.title), '_blank');
                        }
                      }}
                    >
                      {t('learnMore')}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Categories */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl font-bold gradient-text mb-4">
              {language === 'en' ? 'Discover London By Category' : 'اكتشف لندن بالفئات'}
            </h2>
            <p className="text-xl text-gray-600">
              {language === 'en' 
                ? 'Curated experiences tailored to your interests'
                : 'تجارب منسقة مصممة خصيصاً لاهتماماتك'
              }
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {featuredCategories.map((category, index) => (
              <motion.div
                key={category.slug}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                whileHover={{ scale: 1.05 }}
                className="group cursor-pointer"
              >
                <Card className="overflow-hidden border-0 luxury-shadow hover:shadow-2xl transition-all duration-300">
                  <div className="relative aspect-[4/3]">
                    <Image
                      src={category.image}
                      alt={category.title}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4 text-white">
                      <h3 className="text-xl font-bold mb-2">
                        {category.title}
                      </h3>
                      <p className="text-sm text-gray-200 opacity-90">
                        {category.description}
                      </p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Latest Stories Preview */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div 
            className="flex justify-between items-center mb-12"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl font-bold gradient-text">
              {language === 'en' ? 'Latest London Stories' : 'أحدث حكايات لندن'}
            </h2>
            <Button asChild variant="outline" className="border-purple-200 text-purple-800 hover:bg-purple-50">
              <Link href="/blog">
                {t('viewAll')}
                <ArrowRight className={`ml-2 h-4 w-4 ${isRTL ? 'rtl-flip' : ''}`} />
              </Link>
            </Button>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[1, 2, 3].map((item, index) => (
              <motion.div
                key={item}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                whileHover={{ scale: 1.02 }}
              >
                <Card className="overflow-hidden border-0 luxury-shadow hover:shadow-xl transition-all duration-300 bg-white">
                  <div className="relative aspect-video">
                    <Image
                      src={heroImages[index % heroImages.length]}
                      alt="Blog post"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {language === 'en' ? 'Dec 25, 2024' : '٢٥ ديسمبر ٢٠٢٤'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Star className="h-4 w-4" />
                        {t('categories.food-drink')}
                      </span>
                    </div>
                    <h3 className="text-xl font-semibold mb-3 text-gray-900">
                      {language === 'en' 
                        ? 'The Ultimate Guide to London\'s Hidden Gems'
                        : 'الدليل الشامل للكنوز المخفية في لندن'
                      }
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {language === 'en'
                        ? 'Discover the secret spots that only locals know about...'
                        : 'اكتشف الأماكن السرية التي لا يعرفها سوى المحليون...'
                      }
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
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
              {t('testimonials')}
            </h2>
            <p className="text-xl text-gray-600">
              {t('testimonialsCTA')}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: language === 'en' ? 'Sarah Al-Zahra' : 'سارة الزهراء',
                location: language === 'en' ? 'Dubai, UAE' : 'دبي، الإمارات',
                review: language === 'en' 
                  ? 'The recommendations were absolutely perfect! Every restaurant and hotel was exactly what we were looking for - luxury with authenticity.'
                  : 'كانت التوصيات مثالية تماماً! كل مطعم وفندق كان بالضبط ما نبحث عنه - الفخامة مع الأصالة.',
                rating: 5,
                avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?fm=jpg&q=60&w=3000&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTV8fGF2YXRhcnxlbnwwfHwwfHx8MA%3D%3D'
              },
              {
                name: language === 'en' ? 'James Mitchell' : 'جيمس ميتشل',
                location: language === 'en' ? 'London, UK' : 'لندن، المملكة المتحدة',
                review: language === 'en' 
                  ? 'As a Londoner, I thought I knew my city well. Yalla London showed me hidden gems I never knew existed!'
                  : 'كلندني، اعتقدت أنني أعرف مدينتي جيداً. يالا لندن أراني كنوزاً مخفية لم أعرف بوجودها من قبل!',
                rating: 5,
                avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face'
              },
              {
                name: language === 'en' ? 'Amira Hassan' : 'أميرة حسن',
                location: language === 'en' ? 'Cairo, Egypt' : 'القاهرة، مصر',
                review: language === 'en' 
                  ? 'The bilingual website made planning our London trip so easy. Every detail was perfectly curated for Arab travelers.'
                  : 'جعل الموقع ثنائي اللغة التخطيط لرحلتنا إلى لندن سهلاً جداً. كل التفاصيل كانت منسقة بشكل مثالي للمسافرين العرب.',
                rating: 5,
                avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face'
              }
            ].map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
              >
                <Card className="border-0 luxury-shadow bg-white p-6 h-full">
                  <div className="flex items-center mb-4">
                    <div className="relative w-12 h-12 rounded-full overflow-hidden mr-4">
                      <Image
                        src={testimonial.avatar}
                        alt={testimonial.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">{testimonial.name}</h4>
                      <p className="text-sm text-gray-500">{testimonial.location}</p>
                    </div>
                  </div>
                  <div className="flex mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-gray-700 leading-relaxed italic">
                    "{testimonial.review}"
                  </p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter Signup */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <NewsletterSignup />
          </motion.div>
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
                ? 'Ready to Explore Luxury London?'
                : 'هل أنت مستعد لاستكشاف لندن الفاخرة؟'
              }
            </h2>
            <p className="text-xl mb-8 text-purple-100">
              {language === 'en'
                ? 'Join thousands of discerning travelers who trust our curated recommendations'
                : 'انضم إلى آلاف المسافرين المميزين الذين يثقون بتوصياتنا المنسقة'
              }
            </p>
            <div className="flex gap-4 justify-center">
              <Button asChild size="lg" className="bg-white text-purple-900 hover:bg-gray-100">
                <Link href="/recommendations">
                  {language === 'en' ? 'View Recommendations' : 'عرض التوصيات'}
                  <MapPin className={`ml-2 h-5 w-5 ${isRTL ? 'rtl-flip' : ''}`} />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                <Link href="/blog">
                  {language === 'en' ? 'Read Stories' : 'اقرأ القصص'}
                  <ArrowRight className={`ml-2 h-5 w-5 ${isRTL ? 'rtl-flip' : ''}`} />
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
