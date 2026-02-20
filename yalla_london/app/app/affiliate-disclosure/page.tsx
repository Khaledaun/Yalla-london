'use client'

import { useLanguage } from '@/components/language-provider'
import { getTranslation } from '@/lib/i18n'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SITES, getDefaultSiteId } from '@/config/sites'

const SITE_DOMAIN = SITES[getDefaultSiteId()]?.domain || 'yalla-london.com'
const CONTACT_EMAIL = `hello@${SITE_DOMAIN}`

const content = {
  en: {
    title: 'Affiliate Disclosure',
    lastUpdated: 'Last updated',
    intro: `Zenitha.Luxury LLC, operating as ${SITES[getDefaultSiteId()]?.name || 'Yalla London'}, believes in full transparency. This page explains how we earn revenue through affiliate partnerships and how this relates to the content you read on our Website.`,

    whatTitle: 'What Are Affiliate Links?',
    whatItems: [
      `Some of the links on ${SITE_DOMAIN} are affiliate links. This means that if you click on the link and make a purchase or booking, we may receive a small commission from the partner at no additional cost to you.`,
      `Affiliate links are our primary source of revenue and help us keep ${SITES[getDefaultSiteId()]?.name || 'Yalla London'} free to use for all visitors.`,
      'You will never pay more by using our affiliate links. In some cases, our partnerships may provide you with exclusive discounts or deals.',
    ],

    partnersTitle: 'Our Affiliate Partners',
    partnersIntro: 'We currently participate in affiliate programmes with the following partners:',
    partnersItems: [
      'Booking.com — Hotel and accommodation bookings',
      'Expedia — Flights, hotels, and travel packages',
      'HalalBooking — Halal-friendly hotel and villa bookings',
      'GetYourGuide — Tours, activities, and experiences',
      'Viator — Sightseeing tours and travel experiences',
      'StubHub — Event and concert tickets',
      'Ticketmaster — Event tickets and live entertainment',
      'Klook — Travel activities and services',
      'Skyscanner — Flight comparison and bookings',
      'Blacklane — Premium airport transfers and chauffeur services',
      'Allianz Travel Insurance — Travel insurance policies',
      'Additional hotel, restaurant, and experience booking platforms as our partnerships grow',
    ],

    editorialTitle: 'Editorial Independence',
    editorialItems: [
      'Our editorial recommendations are completely independent of our affiliate relationships. We recommend venues, experiences, and services based on genuine research, personal experience, and editorial judgement.',
      'We will never recommend a product, service, or venue solely because it offers a higher affiliate commission. Quality and relevance to our readers always come first.',
      'Not all links on our Website are affiliate links. Many links are provided purely for informational purposes with no financial relationship.',
      'Our content team evaluates each recommendation on its merits before any affiliate link is added.',
    ],

    ftcTitle: 'FTC Compliance',
    ftcItems: [
      'This disclosure is provided in accordance with the Federal Trade Commission (FTC) guidelines on affiliate marketing and endorsements.',
      'Zenitha.Luxury LLC is a Delaware limited liability company. As a US-based entity, we comply with FTC requirements for transparency in affiliate relationships.',
      'We are committed to honest and transparent communication with our readers about how we earn revenue.',
    ],

    questionsTitle: 'Questions?',
    questionsItems: [
      `If you have any questions about our affiliate relationships or this disclosure, please contact us at ${CONTACT_EMAIL}.`,
      'For more details on how we handle your data when you interact with affiliate links, please see our Privacy Policy.',
    ],
  },

  ar: {
    title: 'إفصاح الإحالة',
    lastUpdated: 'آخر تحديث',
    intro: `تؤمن شركة Zenitha.Luxury LLC، التي تعمل باسم ${(SITES[getDefaultSiteId()] as any)?.name_ar || 'يلا لندن'}، بالشفافية الكاملة. توضح هذه الصفحة كيف نحقق الإيرادات من خلال شراكات الإحالة وكيف يرتبط ذلك بالمحتوى الذي تقرأه على موقعنا.`,

    whatTitle: 'ما هي روابط الإحالة؟',
    whatItems: [
      `بعض الروابط على ${SITE_DOMAIN} هي روابط إحالة. هذا يعني أنه إذا نقرت على الرابط وأجريت عملية شراء أو حجز، فقد نتلقى عمولة صغيرة من الشريك دون أي تكلفة إضافية عليك.`,
      `روابط الإحالة هي مصدر إيراداتنا الرئيسي وتساعدنا في الحفاظ على ${(SITES[getDefaultSiteId()] as any)?.name_ar || 'يلا لندن'} مجانياً لجميع الزوار.`,
      'لن تدفع أبداً أكثر باستخدام روابط الإحالة لدينا. في بعض الحالات، قد توفر لك شراكاتنا خصومات أو عروض حصرية.',
    ],

    partnersTitle: 'شركاء الإحالة لدينا',
    partnersIntro: 'نشارك حالياً في برامج إحالة مع الشركاء التاليين:',
    partnersItems: [
      'Booking.com — حجوزات الفنادق والإقامة',
      'Expedia — الرحلات الجوية والفنادق وباقات السفر',
      'HalalBooking — حجوزات الفنادق والفلل المتوافقة مع الشريعة',
      'GetYourGuide — الجولات والأنشطة والتجارب',
      'Viator — جولات مشاهدة المعالم وتجارب السفر',
      'StubHub — تذاكر الفعاليات والحفلات',
      'Ticketmaster — تذاكر الفعاليات والترفيه الحي',
      'Klook — أنشطة وخدمات السفر',
      'Skyscanner — مقارنة وحجز الرحلات الجوية',
      'Blacklane — خدمات النقل المميزة من المطار والسائق الخاص',
      'Allianz Travel Insurance — وثائق تأمين السفر',
      'منصات حجز فنادق ومطاعم وتجارب إضافية مع نمو شراكاتنا',
    ],

    editorialTitle: 'الاستقلال التحريري',
    editorialItems: [
      'توصياتنا التحريرية مستقلة تماماً عن علاقات الإحالة لدينا. نوصي بالأماكن والتجارب والخدمات بناءً على أبحاث حقيقية وتجربة شخصية وحكم تحريري.',
      'لن نوصي أبداً بمنتج أو خدمة أو مكان فقط لأنه يقدم عمولة إحالة أعلى. الجودة والصلة بقرائنا تأتي دائماً أولاً.',
      'ليست جميع الروابط على موقعنا روابط إحالة. يتم توفير العديد من الروابط لأغراض إعلامية بحتة دون أي علاقة مالية.',
      'يقيّم فريق المحتوى لدينا كل توصية بناءً على مزاياها قبل إضافة أي رابط إحالة.',
    ],

    ftcTitle: 'الامتثال لمتطلبات FTC',
    ftcItems: [
      'يتم تقديم هذا الإفصاح وفقاً لإرشادات لجنة التجارة الفيدرالية (FTC) بشأن التسويق بالإحالة والتأييدات.',
      'شركة Zenitha.Luxury LLC هي شركة ذات مسؤولية محدودة في ديلاوير. بصفتنا كياناً أمريكياً، نمتثل لمتطلبات FTC للشفافية في علاقات الإحالة.',
      'نحن ملتزمون بالتواصل الصادق والشفاف مع قرائنا حول كيفية تحقيقنا للإيرادات.',
    ],

    questionsTitle: 'أسئلة؟',
    questionsItems: [
      `إذا كانت لديك أي أسئلة حول علاقات الإحالة لدينا أو هذا الإفصاح، يرجى الاتصال بنا على ${CONTACT_EMAIL}.`,
      'لمزيد من التفاصيل حول كيفية تعاملنا مع بياناتك عند تفاعلك مع روابط الإحالة، يرجى الاطلاع على سياسة الخصوصية الخاصة بنا.',
    ],
  },
}

export default function AffiliateDisclosure() {
  const { language, isRTL } = useLanguage()
  const t = (key: string) => getTranslation(language, key)
  const c = content[language]

  return (
    <div className={`container mx-auto px-6 py-12 max-w-4xl ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-charcoal mb-4">
          {c.title}
        </h1>
        <p className="text-stone">
          {c.lastUpdated}: February 2026
        </p>
        <p className="text-stone mt-4 leading-relaxed">
          {c.intro}
        </p>
      </div>

      <div className="space-y-6">
        {/* What Are Affiliate Links */}
        <Card>
          <CardHeader>
            <CardTitle>{c.whatTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside text-stone space-y-2">
              {c.whatItems.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Our Affiliate Partners */}
        <Card>
          <CardHeader>
            <CardTitle>{c.partnersTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-stone mb-3">
              {c.partnersIntro}
            </p>
            <ul className="list-disc list-inside text-stone space-y-2">
              {c.partnersItems.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Editorial Independence */}
        <Card>
          <CardHeader>
            <CardTitle>{c.editorialTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside text-stone space-y-2">
              {c.editorialItems.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* FTC Compliance */}
        <Card>
          <CardHeader>
            <CardTitle>{c.ftcTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside text-stone space-y-2">
              {c.ftcItems.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Questions */}
        <Card>
          <CardHeader>
            <CardTitle>{c.questionsTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside text-stone space-y-2">
              {c.questionsItems.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
