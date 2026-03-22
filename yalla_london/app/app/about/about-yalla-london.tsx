'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useLanguage } from '@/components/language-provider'
import { getTranslation } from '@/lib/i18n'
import { Mail, MapPin, Heart, Crown, Star, Coffee } from 'lucide-react'
import { ENTITY, getBrandDisclosure } from '@/config/entity'
import { SITES, getDefaultSiteId } from '@/config/sites'
import { TriBar, BrandButton, BrandCardLight, SectionLabel, WatermarkStamp, Breadcrumbs } from '@/components/brand-kit'

const SITE_DOMAIN = SITES[getDefaultSiteId()]?.domain || Object.values(SITES)[0]?.domain || 'zenitha.luxury'
const CONTACT_EMAIL = `info@${SITE_DOMAIN}`

// Hero background — self-hosted or brand gradient (no external stock photos)
const HERO_BG = '/images/hero/london-city-night.jpg'

export default function AboutYallaLondon() {
  const { language, isRTL } = useLanguage()
  const t = (key: string) => getTranslation(language, key)

  const stats = [
    { number: '500+', label_en: 'Places Explored', label_ar: 'مكان مستكشف', icon: MapPin },
    { number: '50+', label_en: 'Michelin Restaurants', label_ar: 'مطعم ميشلان', icon: Star },
    { number: '10+', label_en: 'Years in London', label_ar: 'سنوات في لندن', icon: Heart },
    { number: '1000+', label_en: 'Happy Travelers', label_ar: 'مسافر سعيد', icon: Crown }
  ]

  const values = [
    {
      title_en: 'Authenticity', title_ar: 'الأصالة',
      description_en: 'Every recommendation comes from personal experience and genuine passion for London\'s culture.',
      description_ar: 'كل توصية تأتي من التجربة الشخصية والشغف الحقيقي لثقافة لندن.',
      icon: Heart
    },
    {
      title_en: 'Excellence', title_ar: 'التميز',
      description_en: 'Only the finest establishments make it to our curated list of recommendations.',
      description_ar: 'فقط أفضل المؤسسات تصل إلى قائمة التوصيات المنسقة الخاصة بنا.',
      icon: Crown
    },
    {
      title_en: 'Cultural Bridge', title_ar: 'جسر ثقافي',
      description_en: 'Connecting Arab travelers with London\'s rich heritage through bilingual insights.',
      description_ar: 'ربط المسافرين العرب بالتراث الغني للندن من خلال رؤى ثنائية اللغة.',
      icon: Coffee
    }
  ]

  return (
    <div className={`${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-28 pb-20">
        <div className="absolute inset-0">
          <Image
            src={HERO_BG}
            alt="London cityscape"
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-yl-dark-navy/85" />
        </div>
        <WatermarkStamp />

        <div className="relative z-10 max-w-7xl mx-auto px-7">
          <Breadcrumbs items={[
            { label: language === 'en' ? 'Home' : 'الرئيسية', href: '/' },
            { label: language === 'en' ? 'About' : 'حول' },
          ]} />
          <div className="max-w-2xl">
            <SectionLabel>{language === 'en' ? 'Our Story' : 'قصتنا'}</SectionLabel>
            <h1
              className="text-4xl sm:text-5xl md:text-6xl font-heading font-bold text-white mb-6"
              style={{ textShadow: '0 2px 12px rgba(15,22,33,0.7), 0 1px 3px rgba(15,22,33,0.5)' }}
            >
              {t('founderTitle')}
            </h1>
            <p className="text-xl md:text-2xl text-yl-gray-400 font-body" style={{ textShadow: '0 1px 8px rgba(15,22,33,0.6)' }}>
              {language === 'en'
                ? 'Your personal guide to London\'s most exclusive experiences'
                : 'دليلك الشخصي للتجارب الأكثر حصرية في لندن'
              }
            </p>
          </div>
        </div>
      </section>

      <TriBar />

      {/* Founder Story */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-7">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <SectionLabel>{language === 'en' ? 'The Founder' : 'المؤسس'}</SectionLabel>
              <h2 className="text-4xl font-heading font-bold text-yl-charcoal">
                {language === 'en' ? 'A Passionate Explorer' : 'مستكشف شغوف'}
              </h2>
              <div className="space-y-4 text-lg text-yl-gray-500 font-body leading-relaxed">
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
                <p className="text-base text-yl-gray-500/80 italic font-body">
                  {language === 'en'
                    ? `— ${ENTITY.founder.name}, ${ENTITY.founder.title} of ${ENTITY.legalName}`
                    : `— خالد عون، المؤسس والرئيس التنفيذي لشركة ${ENTITY.legalName}`
                  }
                </p>
              </div>
              <a href={`mailto:${CONTACT_EMAIL}`}>
                <BrandButton variant="primary">
                  <Mail className="mr-2 h-5 w-5" />
                  {language === 'en' ? 'Get in Touch' : 'تواصل معي'}
                </BrandButton>
              </a>
            </div>

            <div className="relative">
              <div className="aspect-[3/4] rounded-[14px] overflow-hidden shadow-lg bg-gradient-to-br from-yl-dark-navy via-yl-navy to-yl-charcoal flex items-center justify-center">
                {/* Brand stamp placeholder — replace with actual founder photo when available */}
                <Image
                  src="/branding/yalla-london/brand-kit-v2/yalla-brand-kit/logos/yalla-stamp-500px.png"
                  alt="Yalla London"
                  width={200}
                  height={200}
                  className="opacity-20"
                />
              </div>
              <div className="absolute -bottom-6 -left-6 bg-yl-dark-navy text-white p-4 rounded-[14px] shadow-lg">
                <div className="text-2xl font-heading font-bold">10+</div>
                <div className="text-sm font-body">
                  {language === 'en' ? 'Years Experience' : 'سنوات خبرة'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <TriBar />

      {/* Stats Section */}
      <section className="py-20 bg-yl-cream">
        <div className="max-w-7xl mx-auto px-7">
          <div className="text-center mb-16">
            <SectionLabel>{language === 'en' ? 'Our Impact' : 'تأثيرنا'}</SectionLabel>
            <h2 className="text-4xl font-heading font-bold text-yl-charcoal mb-4">
              {language === 'en' ? 'By the Numbers' : 'بالأرقام'}
            </h2>
            <p className="text-xl text-yl-gray-500 font-body">
              {language === 'en'
                ? 'A testament to years of exploration and discovery'
                : 'شهادة على سنوات من الاستكشاف والاكتشاف'
              }
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <BrandCardLight key={index} className="p-6 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-yl-cream rounded-full flex items-center justify-center">
                  <stat.icon className="h-8 w-8 text-yl-red" />
                </div>
                <div className="text-3xl font-heading font-bold text-yl-red mb-2">
                  {stat.number}
                </div>
                <div className="text-yl-gray-500 font-body font-medium">
                  {language === 'en' ? stat.label_en : stat.label_ar}
                </div>
              </BrandCardLight>
            ))}
          </div>
        </div>
      </section>

      <TriBar />

      {/* Values Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-7">
          <div className="text-center mb-16">
            <SectionLabel>{language === 'en' ? 'What We Believe' : 'ما نؤمن به'}</SectionLabel>
            <h2 className="text-4xl font-heading font-bold text-yl-charcoal mb-4">
              {language === 'en' ? 'My Values' : 'قيمي'}
            </h2>
            <p className="text-xl text-yl-gray-500 font-body">
              {language === 'en'
                ? 'The principles that guide every recommendation'
                : 'المبادئ التي توجه كل توصية'
              }
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {values.map((value, index) => (
              <BrandCardLight key={index} className="p-8 text-center h-full">
                <div className="w-20 h-20 mx-auto mb-6 bg-yl-cream rounded-full flex items-center justify-center">
                  <value.icon className="h-10 w-10 text-yl-red" />
                </div>
                <h3 className="text-2xl font-heading font-bold mb-4 text-yl-charcoal">
                  {language === 'en' ? value.title_en : value.title_ar}
                </h3>
                <p className="text-yl-gray-500 font-body leading-relaxed">
                  {language === 'en' ? value.description_en : value.description_ar}
                </p>
              </BrandCardLight>
            ))}
          </div>
        </div>
      </section>

      <TriBar />

      {/* Company Imprint */}
      <section className="py-16 bg-yl-cream">
        <div className="max-w-4xl mx-auto px-7">
          <SectionLabel className="text-center">{language === 'en' ? 'Legal' : 'قانوني'}</SectionLabel>
          <h2 className="text-3xl font-heading font-bold text-yl-charcoal mb-6 text-center">
            {language === 'en' ? 'Company Information' : 'معلومات الشركة'}
          </h2>
          <BrandCardLight className="p-8">
            <div className="space-y-3 text-yl-gray-500 font-body">
              <p className="font-heading font-semibold text-yl-charcoal text-lg">{ENTITY.legalName}</p>
              <p>
                {language === 'en'
                  ? `A ${ENTITY.jurisdiction} ${ENTITY.entityType}, United States`
                  : `شركة ذات مسؤولية محدودة مسجلة في ${ENTITY.jurisdiction}، الولايات المتحدة`
                }
              </p>
              <p>{getBrandDisclosure('Yalla London', language)}</p>
              <div className="pt-3 border-t border-yl-gray-200">
                <p className="text-sm">
                  {language === 'en' ? 'Contact: ' : 'تواصل: '}
                  <a href={`mailto:${CONTACT_EMAIL}`} className="text-yl-red hover:underline">{CONTACT_EMAIL}</a>
                </p>
              </div>
            </div>
          </BrandCardLight>
        </div>
      </section>

      <TriBar />

      {/* Contact CTA */}
      <section className="py-20 bg-yl-dark-navy text-white">
        <div className="max-w-4xl mx-auto text-center px-7">
          <SectionLabel>{language === 'en' ? 'Get Started' : 'ابدأ'}</SectionLabel>
          <h2 className="text-4xl font-heading font-bold mb-6">
            {language === 'en'
              ? 'Let\'s Explore London Together'
              : 'دعونا نستكشف لندن معاً'
            }
          </h2>
          <p className="text-xl mb-8 text-yl-gray-400 font-body">
            {language === 'en'
              ? 'Have questions about London? Looking for personalized recommendations? I\'d love to help you discover this amazing city.'
              : 'لديك أسئلة حول لندن؟ تبحث عن توصيات شخصية؟ أود أن أساعدك في اكتشاف هذه المدينة المذهلة.'
            }
          </p>
          <a href={`mailto:${CONTACT_EMAIL}`}>
            <BrandButton variant="primary">
              <Mail className="mr-2 h-5 w-5" />
              {language === 'en' ? 'Send a Message' : 'أرسل رسالة'}
            </BrandButton>
          </a>
        </div>
      </section>
    </div>
  )
}
