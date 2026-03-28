'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Star, MapPin, Phone, Globe, Search, ChevronDown, ChevronUp, Utensils, Users, CalendarCheck, ShoppingBag, Banknote, Train } from 'lucide-react'
import { useLanguage } from '@/components/language-provider'
import { getPageAffiliateLink, type AffiliateCategory } from '@/lib/affiliate/page-affiliate-links'
import { TriBar, BrandButton, BrandTag, BrandCardLight, SectionLabel, WatermarkStamp, Breadcrumbs } from '@/components/brand-kit'

const recommendations = [
  {
    id: '1',
    name_en: 'The Dorchester',
    name_ar: 'دورتشستر',
    type: 'hotel',
    description_en: 'Overlooking Hyde Park since 1931, The Dorchester is London\'s crown jewel. Home to Alain Ducasse\'s three-Michelin-starred restaurant, a world-class spa, and the legendary Promenade afternoon tea.',
    description_ar: 'يطل على هايد بارك منذ 1931، دورتشستر هو جوهرة تاج لندن. يضم مطعم آلان دوكاس الحائز على ثلاث نجوم ميشلان وسبا عالمي وشاي بعد الظهر الأسطوري.',
    address_en: 'Park Lane, Mayfair, London W1K 1QA',
    address_ar: 'بارك لين، مايفير، لندن W1K 1QA',
    rating: 4.9,
    price_range: '£650-3,500',
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80',
    features_en: ['Michelin-Starred Dining', 'Hyde Park Views', 'World-Class Spa', 'Butler Service'],
    features_ar: ['مطعم بنجمة ميشلان', 'إطلالة هايد بارك', 'سبا عالمي', 'خدمة الخادم الشخصي'],
    phone: '+44 20 7629 8888',
    website: 'https://www.dorchestercollection.com/london/the-dorchester'
  },
  {
    id: '2',
    name_en: 'Sketch — The Lecture Room & Library',
    name_ar: 'سكيتش — قاعة المحاضرات والمكتبة',
    type: 'restaurant',
    description_en: 'A Michelin-starred culinary journey inside a surreal Mayfair townhouse. The Lecture Room serves dazzling French cuisine, while the Gallery (with its famous pink pods) offers an Instagram-famous afternoon tea.',
    description_ar: 'رحلة طهوية حائزة على نجمة ميشلان داخل منزل مايفير السريالي. تقدم قاعة المحاضرات المأكولات الفرنسية المبهرة بينما يقدم المعرض شاي بعد الظهر الشهير.',
    address_en: '9 Conduit Street, Mayfair, London W1S 2XG',
    address_ar: '9 شارع كوندويت، مايفير، لندن W1S 2XG',
    rating: 4.7,
    price_range: '£120-300',
    image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80',
    features_en: ['Michelin Star', 'Art Installation', 'Afternoon Tea', 'Cocktail Bar'],
    features_ar: ['نجمة ميشلان', 'معرض فني', 'شاي بعد الظهر', 'بار كوكتيل'],
    phone: '+44 20 7659 4500',
    website: 'https://sketch.london'
  },
  {
    id: '3',
    name_en: 'Harrods',
    name_ar: 'هارودز',
    type: 'attraction',
    description_en: 'The world\'s most famous luxury department store in Knightsbridge. Spanning 1 million sq ft across 330 departments, Harrods offers everything from couture fashion to its legendary Food Halls.',
    description_ar: 'أشهر متجر فاخر في العالم في نايتسبريدج. يمتد على مليون قدم مربع عبر 330 قسمًا، يقدم هارودز كل شيء من الأزياء الراقية إلى قاعات الطعام الأسطورية.',
    address_en: '87-135 Brompton Road, Knightsbridge, London SW1X 7XL',
    address_ar: '87-135 طريق برومبتون، نايتسبريدج، لندن SW1X 7XL',
    rating: 4.6,
    price_range: '£50-50,000+',
    image: 'https://images.unsplash.com/photo-1513467535987-fd81bc7d62f8?w=600&q=80',
    features_en: ['Personal Shopping', 'Food Halls', 'Luxury Brands', 'Beauty Concierge'],
    features_ar: ['تسوق شخصي', 'قاعات الطعام', 'علامات فاخرة', 'كونسيرج الجمال'],
    phone: '+44 20 7730 1234',
    website: 'https://www.harrods.com'
  },
  {
    id: '4',
    name_en: "Claridge's",
    name_ar: 'كلاريدجز',
    type: 'hotel',
    description_en: 'Art Deco elegance meets modern luxury in this Mayfair institution. Favoured by royalty since the 1850s, Claridge\'s features Gordon Ramsay\'s restaurant, the iconic foyer, and immaculate butler service.',
    description_ar: 'أناقة آرت ديكو تلتقي بالفخامة الحديثة في هذه المؤسسة العريقة في مايفير. مفضلة لدى الملوك منذ 1850، تضم مطعم غوردون رامزي والبهو الأيقوني.',
    address_en: 'Brook Street, Mayfair, London W1K 4HR',
    address_ar: 'شارع بروك، مايفير، لندن W1K 4HR',
    rating: 4.9,
    price_range: '£580-4,000',
    image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=600&q=80',
    features_en: ['Art Deco Design', 'Gordon Ramsay', 'Afternoon Tea', 'Butler Service'],
    features_ar: ['تصميم آرت ديكو', 'غوردون رامزي', 'شاي بعد الظهر', 'خادم شخصي'],
    phone: '+44 20 7629 8860',
    website: 'https://www.claridges.co.uk'
  },
  {
    id: '5',
    name_en: 'Dinner by Heston Blumenthal',
    name_ar: 'دينر باي هيستون بلومنثال',
    type: 'restaurant',
    description_en: 'Two-Michelin-starred restaurant at the Mandarin Oriental, Hyde Park. Chef Heston Blumenthal reimagines historic British recipes with modern techniques — the Meat Fruit starter is legendary.',
    description_ar: 'مطعم حائز على نجمتي ميشلان في ماندارين أورينتال، هايد بارك. الشيف هيستون بلومنثال يعيد تخيل الوصفات البريطانية التاريخية بتقنيات حديثة.',
    address_en: 'Mandarin Oriental, 66 Knightsbridge, London SW1X 7LA',
    address_ar: 'ماندارين أورينتال، 66 نايتسبريدج، لندن SW1X 7LA',
    rating: 4.8,
    price_range: '£80-200',
    image: 'https://images.unsplash.com/photo-1550966871-3ed3cdb51f3a?w=600&q=80',
    features_en: ['Two Michelin Stars', 'Historic Recipes', 'Park Views', 'Tasting Menu'],
    features_ar: ['نجمتا ميشلان', 'وصفات تاريخية', 'إطلالة الحديقة', 'قائمة تذوق'],
    phone: '+44 20 7201 3833',
    website: 'https://www.dinnerbyheston.co.uk'
  },
  {
    id: '6',
    name_en: 'The View from The Shard',
    name_ar: 'المنظر من ذا شارد',
    type: 'attraction',
    description_en: 'Western Europe\'s highest viewing platform at 244 metres. On a clear day, see up to 40 miles across London from the open-air Sky Deck on level 72 of The Shard.',
    description_ar: 'أعلى منصة مشاهدة في أوروبا الغربية على ارتفاع 244 مترًا. في يوم صافٍ، شاهد حتى 64 كم عبر لندن من سطح السماء المفتوح في الطابق 72.',
    address_en: '32 London Bridge Street, London SE1 9SG',
    address_ar: '32 شارع جسر لندن، لندن SE1 9SG',
    rating: 4.5,
    price_range: '£28-40',
    image: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=600&q=80',
    features_en: ['360° Views', 'Open-Air Sky Deck', 'Champagne Bar', 'Interactive Telescopes'],
    features_ar: ['إطلالات 360°', 'سطح سماء مفتوح', 'بار شامبانيا', 'تلسكوبات تفاعلية'],
    phone: '+44 844 499 7111',
    website: 'https://www.the-shard.com/viewing-gallery'
  },
  {
    id: '7',
    name_en: 'The Connaught',
    name_ar: 'كونوت',
    type: 'hotel',
    description_en: 'Understated perfection in Mayfair\'s quietest corner. Features the Connaught Bar (consistently ranked World\'s Best), Hélène Darroze\'s two-Michelin-starred restaurant, and an exclusive Aman Spa.',
    description_ar: 'كمال هادئ في أهدأ زاوية من مايفير. يضم بار كونوت (المصنف باستمرار كأفضل بار في العالم) ومطعم هيلين داروز بنجمتي ميشلان وسبا آمان الحصري.',
    address_en: 'Carlos Place, Mayfair, London W1K 2AL',
    address_ar: 'كارلوس بلايس، مايفير، لندن W1K 2AL',
    rating: 4.9,
    price_range: '£690-5,000',
    image: 'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=600&q=80',
    features_en: ['World\'s Best Bar', 'Aman Spa', 'Michelin Dining', 'Butler Service'],
    features_ar: ['أفضل بار في العالم', 'سبا آمان', 'مطعم ميشلان', 'خادم شخصي'],
    phone: '+44 20 7499 7070',
    website: 'https://www.the-connaught.co.uk'
  },
  {
    id: '8',
    name_en: 'NOBU London',
    name_ar: 'نوبو لندن',
    type: 'restaurant',
    description_en: 'The original London outpost of Nobu Matsuhisa\'s iconic Japanese-Peruvian restaurant in the Metropolitan Hotel. Famous for Black Cod Miso, yellowtail sashimi, and a buzzy Mayfair atmosphere.',
    description_ar: 'الفرع الأصلي في لندن لمطعم نوبو ماتسوهيسا الأيقوني الياباني-البيروفي في فندق متروبوليتان. مشهور بسمك القد الأسود بالميسو وساشيمي الهمور.',
    address_en: 'Metropolitan Hotel, 19 Old Park Lane, London W1K 1LB',
    address_ar: 'فندق متروبوليتان، 19 أولد بارك لين، لندن W1K 1LB',
    rating: 4.6,
    price_range: '£80-200',
    image: 'https://images.unsplash.com/photo-1579027989536-b7b1f875659b?w=600&q=80',
    features_en: ['Japanese-Peruvian Cuisine', 'Celebrity Scene', 'Omakase Menu', 'Cocktail Bar'],
    features_ar: ['مطبخ ياباني-بيروفي', 'أجواء المشاهير', 'قائمة أوماكاسي', 'بار كوكتيل'],
    phone: '+44 20 7447 4747',
    website: 'https://www.noburestaurants.com/london'
  },
  {
    id: '9',
    name_en: 'Kensington Palace',
    name_ar: 'قصر كنسينغتون',
    type: 'attraction',
    description_en: 'The official London residence of the Prince and Princess of Wales, set within the beautiful Kensington Gardens. Explore the King\'s and Queen\'s State Apartments and the stunning Sunken Garden.',
    description_ar: 'المقر الرسمي في لندن لأمير وأميرة ويلز، داخل حدائق كنسينغتون الجميلة. استكشف شقق الملك والملكة الرسمية والحديقة الغارقة المذهلة.',
    address_en: 'Kensington Gardens, London W8 4PX',
    address_ar: 'حدائق كنسينغتون، لندن W8 4PX',
    rating: 4.5,
    price_range: '£21-25',
    image: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=600&q=80',
    features_en: ['Royal Residence', 'State Apartments', 'Fashion Exhibitions', 'Sunken Garden'],
    features_ar: ['مقر ملكي', 'شقق رسمية', 'معارض أزياء', 'الحديقة الغارقة'],
    phone: '+44 33 3320 6000',
    website: 'https://www.hrp.org.uk/kensington-palace'
  },
  {
    id: '10',
    name_en: 'Shangri-La The Shard',
    name_ar: 'شانغريلا ذا شارد',
    type: 'hotel',
    description_en: 'London\'s highest hotel occupying floors 34-52 of The Shard. Every room offers floor-to-ceiling views across the entire city. The 52nd-floor infinity pool is the highest in Western Europe.',
    description_ar: 'أعلى فندق في لندن يحتل الطوابق 34-52 من ذا شارد. كل غرفة توفر إطلالات بانورامية على المدينة بأكملها. مسبح الإنفينيتي في الطابق 52 هو الأعلى في أوروبا الغربية.',
    address_en: '31 St Thomas Street, London SE1 9QU',
    address_ar: '31 شارع سانت توماس، لندن SE1 9QU',
    rating: 4.7,
    price_range: '£450-2,500',
    image: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=600&q=80',
    features_en: ['Infinity Pool', 'Panoramic Views', 'TING Restaurant', 'Sky Bar'],
    features_ar: ['مسبح إنفينيتي', 'إطلالات بانورامية', 'مطعم TING', 'بار السماء'],
    phone: '+44 20 7234 8000',
    website: 'https://www.shangri-la.com/london/shangrila'
  },
]

const typeLabels = {
  en: { all: 'All', hotel: 'Hotels', restaurant: 'Restaurants', attraction: 'Attractions' },
  ar: { all: 'الكل', hotel: 'فنادق', restaurant: 'مطاعم', attraction: 'معالم' },
}

export default function RecommendationsPage({ serverLocale }: { serverLocale?: 'en' | 'ar' }) {
  const { language: clientLanguage } = useLanguage()
  const locale = (serverLocale ?? clientLanguage ?? 'en') as 'en' | 'ar'
  const isRTL = locale === 'ar'

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState('all')
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null)

  const labels = typeLabels[locale]

  const insiderTips = [
    {
      icon: Utensils,
      title_en: 'Halal Dining Etiquette in London',
      title_ar: 'آداب تناول الطعام الحلال في لندن',
      desc_en: 'Many high-end London restaurants do not advertise halal options but will accommodate requests when asked. Always call ahead to confirm halal meat availability, especially for Michelin-starred venues. Apps like HalalTrip and Zabihah are reliable for finding certified restaurants. During Ramadan, several luxury hotels offer dedicated Iftar and Suhoor menus — book early as these fill quickly with the local Arab community.',
      desc_ar: 'كثير من مطاعم لندن الراقية لا تعلن عن خيارات حلال لكنها تلبي الطلبات عند السؤال. اتصل دائمًا مسبقًا للتأكد من توفر اللحوم الحلال، خاصة في مطاعم ميشلان. تطبيقات مثل HalalTrip وZabihah موثوقة لإيجاد المطاعم المعتمدة. خلال رمضان، تقدم عدة فنادق فاخرة قوائم إفطار وسحور خاصة — احجز مبكرًا لأنها تمتلئ بسرعة.',
    },
    {
      icon: Users,
      title_en: 'Best Neighbourhoods for Arab Families',
      title_ar: 'أفضل الأحياء للعائلات العربية',
      desc_en: 'Knightsbridge and Mayfair remain the top choices for Gulf families, with easy walking access to Harrods, Hyde Park, and halal restaurants on Edgware Road. Kensington offers a quieter alternative with excellent family suites at The Milestone and Royal Garden hotels. Bayswater and Marble Arch feature the highest concentration of Arabic-speaking shops, cafes, and grocery stores — ideal for longer stays where a sense of home matters.',
      desc_ar: 'تبقى نايتسبريدج ومايفير الخيارين الأفضل للعائلات الخليجية، مع سهولة الوصول سيرًا إلى هارودز وهايد بارك ومطاعم حلال في إدجوير رود. كنسينغتون تقدم بديلًا أهدأ مع أجنحة عائلية ممتازة. بايزواتر وماربل آرتش تضم أعلى تركيز للمحلات والمقاهي والبقالات الناطقة بالعربية — مثالية للإقامات الطويلة.',
    },
    {
      icon: CalendarCheck,
      title_en: 'Booking Restaurants During Peak Season',
      title_ar: 'حجز المطاعم في موسم الذروة',
      desc_en: 'London\'s top restaurants book out 4-6 weeks in advance during summer (June-August) when Gulf visitors peak. For Michelin-starred venues like Sketch or Dinner by Heston, book the moment your travel dates are confirmed. Many restaurants release cancellation slots at midnight — check OpenTable or Resy at 00:01 for last-minute availability. Hotel concierges at five-star properties can often secure tables at short notice through their direct relationships.',
      desc_ar: 'تُحجز أفضل مطاعم لندن قبل 4-6 أسابيع خلال الصيف (يونيو-أغسطس) عندما يبلغ زوار الخليج ذروتهم. لمطاعم ميشلان مثل سكيتش أو دينر باي هيستون، احجز فور تأكيد تواريخ سفرك. تطلق كثير من المطاعم مواعيد الإلغاء منتصف الليل — تحقق من OpenTable أو Resy عند 00:01. كونسيرج الفنادق الخمس نجوم يمكنهم تأمين طاولات بإشعار قصير.',
    },
    {
      icon: ShoppingBag,
      title_en: 'Shopping Tax-Free with VAT Refund',
      title_ar: 'التسوق المعفى من الضرائب مع استرداد ضريبة القيمة المضافة',
      desc_en: 'As a non-UK resident, you may be eligible for VAT refund on purchases over a certain threshold. Major stores like Harrods, Selfridges, and Harvey Nichols have dedicated VAT refund desks. Ask for a VAT 407 form at the point of sale, get it stamped at the airport customs desk before departure, and submit it at the refund counter. Digital solutions like Wevat allow you to claim refunds via your phone, often with better rates than traditional paper forms.',
      desc_ar: 'كمقيم خارج المملكة المتحدة، قد تكون مؤهلًا لاسترداد ضريبة القيمة المضافة على المشتريات فوق حد معين. المتاجر الكبرى مثل هارودز وسيلفريدجز وهارفي نيكولز لديها مكاتب مخصصة لاسترداد الضريبة. اطلب نموذج VAT 407 عند الشراء، واحصل على ختمه في مكتب الجمارك بالمطار قبل المغادرة. حلول رقمية مثل Wevat تتيح لك المطالبة عبر هاتفك بأسعار أفضل غالبًا.',
    },
    {
      icon: Banknote,
      title_en: 'Currency Exchange Tips',
      title_ar: 'نصائح تحويل العملات',
      desc_en: 'Avoid exchanging money at Heathrow Airport — rates are consistently 5-8% worse than in central London. The best rates are found at specialist bureaux on Edgware Road and Queensway, where competition keeps margins tight. Contactless payment is accepted virtually everywhere in London including the Tube, buses, and black cabs. Gulf bank cards (Visa/Mastercard) work seamlessly. For larger purchases, TransferWise (Wise) or Revolut offer near-interbank rates with zero markup.',
      desc_ar: 'تجنب تحويل العملات في مطار هيثرو — الأسعار أسوأ بنسبة 5-8% من وسط لندن. أفضل الأسعار في مكاتب الصرافة المتخصصة في إدجوير رود وكوينزواي حيث المنافسة تحافظ على هوامش منخفضة. الدفع بدون تلامس مقبول في كل مكان في لندن بما في ذلك المترو والحافلات وسيارات الأجرة السوداء. بطاقات البنوك الخليجية (فيزا/ماستركارد) تعمل بسلاسة. للمشتريات الكبيرة، Wise أو Revolut تقدم أسعارًا قريبة من سعر البنك المركزي.',
    },
    {
      icon: Train,
      title_en: 'Getting Around London Efficiently',
      title_ar: 'التنقل في لندن بكفاءة',
      desc_en: 'The Elizabeth Line (opened 2022) transformed London travel — it connects Heathrow to Bond Street in 28 minutes and Paddington to Canary Wharf in 17 minutes, all without changing trains. Use a contactless bank card instead of buying an Oyster card; daily and weekly caps are identical and you avoid the £7 deposit. For short trips in central London, black cabs are easiest with families (they fit 5 passengers plus luggage). Uber works well but surge pricing applies during theatre hours (6-8pm).',
      desc_ar: 'خط إليزابيث (افتُتح 2022) غيّر التنقل في لندن — يربط هيثرو ببوند ستريت في 28 دقيقة وبادينغتون بكناري وارف في 17 دقيقة بدون تغيير القطارات. استخدم بطاقة بنكية بدون تلامس بدلًا من شراء بطاقة أويستر؛ الحدود اليومية والأسبوعية متطابقة وتتجنب وديعة 7 جنيهات. للرحلات القصيرة وسط لندن، سيارات الأجرة السوداء الأسهل مع العائلات (تتسع لـ5 ركاب مع أمتعة). أوبر يعمل جيدًا لكن التسعير المرتفع ينطبق خلال ساعات المسرح (6-8 مساءً).',
    },
  ]

  const faqItems = [
    {
      q_en: 'How are these recommendations selected?',
      q_ar: 'كيف يتم اختيار هذه التوصيات؟',
      a_en: 'Our editorial team personally visits and evaluates every venue on this page. We assess quality of service, cultural sensitivity, halal availability, family-friendliness, location convenience, and value for money. Venues must meet our standards across at least four of these six criteria to earn a recommendation. We also incorporate feedback from our community of Arab travellers who share their real experiences with us. No venue can pay for placement — every recommendation is earned through consistent excellence.',
      a_ar: 'يزور فريقنا التحريري شخصيًا ويقيّم كل مكان في هذه الصفحة. نقيّم جودة الخدمة والحساسية الثقافية وتوفر الحلال وملاءمة العائلات وملاءمة الموقع والقيمة مقابل المال. يجب أن تستوفي الأماكن معاييرنا في أربعة على الأقل من هذه المعايير الستة لتحصل على توصية. لا يمكن لأي مكان الدفع للظهور — كل توصية مكتسبة من خلال التميز المستمر.',
    },
    {
      q_en: 'Are all the listed restaurants halal?',
      q_ar: 'هل جميع المطاعم المدرجة حلال؟',
      a_en: 'Not all restaurants on our list are fully halal-certified, but each one either offers halal menu options or can accommodate halal dietary requirements when requested in advance. We clearly note halal availability in each restaurant\'s description and features. For fully halal-certified restaurants, we recommend checking our dedicated halal dining guide which focuses exclusively on certified venues. When in doubt, always call ahead — London\'s top restaurants are experienced in accommodating diverse dietary needs.',
      a_ar: 'ليست جميع المطاعم في قائمتنا معتمدة حلال بالكامل، لكن كل منها إما يقدم خيارات حلال في القائمة أو يمكنه تلبية متطلبات الطعام الحلال عند الطلب مسبقًا. نوضح توفر الحلال في وصف كل مطعم. للمطاعم المعتمدة حلال بالكامل، ننصح بمراجعة دليلنا المخصص للمطاعم الحلال. عند الشك، اتصل دائمًا مسبقًا — أفضل مطاعم لندن لديها خبرة في تلبية الاحتياجات الغذائية المتنوعة.',
    },
    {
      q_en: 'Which areas of London are best for families with children?',
      q_ar: 'ما هي أفضل مناطق لندن للعائلات مع أطفال؟',
      a_en: 'Kensington is our top pick for families — it offers the Natural History Museum, Science Museum, and Victoria & Albert Museum (all free), plus Kensington Gardens and Diana Memorial Playground. South Kensington has excellent family-friendly restaurants and is well-connected by Tube. Knightsbridge combines shopping (Harrods) with Hyde Park activities including boating, cycling, and the Serpentine Gallery. For older children, the South Bank area offers the London Eye, SEA LIFE Aquarium, and Shrek\'s Adventure, all within walking distance of each other.',
      a_ar: 'كنسينغتون هي خيارنا الأول للعائلات — توفر متحف التاريخ الطبيعي ومتحف العلوم ومتحف فيكتوريا وألبرت (جميعها مجانية)، بالإضافة إلى حدائق كنسينغتون وملعب ديانا التذكاري. ساوث كنسينغتون بها مطاعم عائلية ممتازة ومتصلة جيدًا بالمترو. نايتسبريدج تجمع بين التسوق (هارودز) وأنشطة هايد بارك. للأطفال الأكبر، منطقة ساوث بانك توفر عين لندن وأكواريوم SEA LIFE ومغامرة شريك، كلها على مسافة مشي.',
    },
    {
      q_en: 'Can I book directly through Yalla London?',
      q_ar: 'هل يمكنني الحجز مباشرة عبر يلا لندن؟',
      a_en: 'We provide direct links to each venue\'s official website and booking platforms where available. For hotels, we partner with trusted booking services like Booking.com and HalalBooking that offer competitive rates and flexible cancellation policies. Restaurant reservations should be made directly with the venue or through platforms like OpenTable. While we do not handle bookings ourselves, our affiliate partnerships ensure you get the best available rates, and a portion of the booking supports our work in keeping this guide free and up-to-date.',
      a_ar: 'نوفر روابط مباشرة لموقع كل مكان ومنصات الحجز المتاحة. للفنادق، نتشارك مع خدمات حجز موثوقة مثل Booking.com وHalalBooking التي تقدم أسعارًا تنافسية وسياسات إلغاء مرنة. حجوزات المطاعم يجب أن تتم مباشرة مع المكان أو عبر منصات مثل OpenTable. بينما لا نتعامل مع الحجوزات بأنفسنا، شراكاتنا تضمن لك أفضل الأسعار المتاحة، وجزء من الحجز يدعم عملنا في إبقاء هذا الدليل مجانيًا ومحدثًا.',
    },
    {
      q_en: 'How often are recommendations updated?',
      q_ar: 'كم مرة يتم تحديث التوصيات؟',
      a_en: 'We conduct a full review of all recommendations every quarter (January, April, July, and October). During each review, our team revisits venues, checks for changes in service quality, menu updates, and pricing adjustments. Between quarterly reviews, we make immediate updates if a venue closes, changes ownership, or receives significant negative feedback from our community. Seasonal additions — such as Ramadan-specific restaurants, Eid celebration venues, and summer pop-ups — are added as they become available and removed when they end.',
      a_ar: 'نجري مراجعة شاملة لجميع التوصيات كل ربع سنة (يناير، أبريل، يوليو، وأكتوبر). خلال كل مراجعة، يعيد فريقنا زيارة الأماكن ويتحقق من التغييرات في جودة الخدمة وتحديثات القائمة وتعديلات الأسعار. بين المراجعات الفصلية، نجري تحديثات فورية إذا أغلق مكان أو تغيرت ملكيته أو تلقى ملاحظات سلبية كبيرة. الإضافات الموسمية — مثل مطاعم رمضان وأماكن احتفال العيد — تُضاف عند توفرها وتُزال عند انتهائها.',
    },
  ]

  const filtered = recommendations.filter(item => {
    const name = locale === 'en' ? item.name_en : item.name_ar
    const desc = locale === 'en' ? item.description_en : item.description_ar
    const matchesSearch = !searchTerm || name.toLowerCase().includes(searchTerm.toLowerCase()) || desc.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = selectedType === 'all' || item.type === selectedType
    return matchesSearch && matchesType
  })

  return (
    <div className={`bg-yl-cream min-h-screen ${isRTL ? 'font-arabic' : 'font-body'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Hero */}
      <section className="relative bg-yl-dark-navy pb-12 pt-28 overflow-hidden">
        <WatermarkStamp />
        <div className="relative z-10 max-w-7xl mx-auto px-7 text-center">
          <Breadcrumbs items={[
            { label: locale === 'en' ? 'Home' : 'الرئيسية', href: '/' },
            { label: locale === 'en' ? 'Recommendations' : 'توصياتنا' },
          ]} />
          <SectionLabel>{locale === 'en' ? 'Curated for You' : 'مختارة لك'}</SectionLabel>
          <h1 className="text-4xl md:text-5xl font-heading font-bold text-white mb-4">
            {locale === 'en' ? 'Our Recommendations' : 'توصياتنا'}
          </h1>
          <p className="text-xl text-yl-gray-400 mb-8 max-w-2xl mx-auto font-body">
            {locale === 'en'
              ? 'Handpicked luxury hotels, restaurants, and experiences across London — curated for discerning travellers'
              : 'فنادق ومطاعم وتجارب فاخرة مختارة بعناية في جميع أنحاء لندن — مختارة للمسافرين المميزين'}
          </p>
          <div className="max-w-xl mx-auto relative">
            <Search className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-5 h-5 text-yl-gray-500`} />
            <input
              type="text"
              placeholder={locale === 'en' ? 'Search recommendations...' : 'ابحث في التوصيات...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full ${isRTL ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-4 rounded-[14px] text-lg font-body focus:outline-none focus:ring-2 focus:ring-yl-gold/30 focus:border-yl-gold`}
            />
          </div>
        </div>
      </section>

      <TriBar />

      {/* Editorial Intro */}
      <section className="py-12 bg-white">
        <div className="max-w-4xl mx-auto px-7">
          <h2 className="text-3xl font-heading font-bold text-yl-charcoal mb-6 text-center">
            {locale === 'en' ? 'Our Curated London Picks' : 'اختياراتنا المنتقاة في لندن'}
          </h2>
          <div className="space-y-4 text-base text-yl-gray-500 font-body leading-relaxed">
            {locale === 'en' ? (
              <>
                <p>
                  Every recommendation on this page has been personally vetted by our editorial team, drawing on years of experience guiding Arab and Gulf travellers through the best of London. We do not simply list popular venues — we select places that consistently deliver exceptional experiences with genuine cultural sensitivity, halal dining options, Arabic-speaking staff, and prayer-friendly arrangements. Whether you are visiting London for the first time with your family or returning for a seasonal getaway, these are the establishments that earn our trust.
                </p>
                <p>
                  Our hotel selections prioritise privacy, generous suite configurations for families, proximity to major attractions, and a track record of welcoming Gulf guests. For restaurants, we focus on Michelin-quality dining that either offers fully halal menus or clearly labelled halal choices alongside outstanding service. Our attraction picks balance iconic London landmarks with lesser-known gems that reward curiosity — from royal palaces to panoramic viewpoints that transform your understanding of the city.
                </p>
                <p>
                  We update these recommendations quarterly, revisiting each venue to confirm standards have been maintained. Seasonal promotions, Ramadan packages, and Eid offers are highlighted as they become available. If you have visited any of these places and have feedback, we would love to hear from you — your insights help us keep this guide honest and useful for every traveller in our community.
                </p>
              </>
            ) : (
              <>
                <p>
                  كل توصية في هذه الصفحة تم تقييمها شخصيًا من قبل فريقنا التحريري، بالاعتماد على سنوات من الخبرة في إرشاد المسافرين العرب والخليجيين إلى أفضل ما تقدمه لندن. نحن لا نكتفي بسرد الأماكن الشائعة — بل نختار المنشآت التي تقدم تجارب استثنائية باستمرار مع حساسية ثقافية حقيقية وخيارات طعام حلال وموظفين يتحدثون العربية وترتيبات ملائمة للصلاة. سواء كنت تزور لندن لأول مرة مع عائلتك أو تعود لقضاء إجازة موسمية، فهذه هي المنشآت التي تحظى بثقتنا.
                </p>
                <p>
                  تعطي اختياراتنا للفنادق الأولوية للخصوصية وتوفر أجنحة عائلية واسعة وقربها من المعالم الرئيسية وسجل حافل في استقبال ضيوف الخليج. أما المطاعم فنركز على مطاعم بمستوى ميشلان تقدم قوائم حلال بالكامل أو خيارات حلال واضحة إلى جانب خدمة متميزة. واختياراتنا للمعالم توازن بين معالم لندن الأيقونية والجواهر الأقل شهرة التي تكافئ الفضول — من القصور الملكية إلى نقاط المشاهدة البانورامية التي تغير فهمك للمدينة.
                </p>
                <p>
                  نقوم بتحديث هذه التوصيات كل ثلاثة أشهر، ونعيد زيارة كل مكان للتأكد من الحفاظ على المعايير. يتم إبراز العروض الموسمية وباقات رمضان وعروض العيد فور توفرها. إذا زرت أيًا من هذه الأماكن ولديك ملاحظات، يسعدنا أن نسمع منك — رؤيتك تساعدنا في الحفاظ على هذا الدليل صادقًا ومفيدًا لكل مسافر في مجتمعنا.
                </p>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Type Filter */}
      <div className="bg-white border-b border-yl-gray-200 py-4 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-7">
          <div className="flex items-center gap-3 overflow-x-auto pb-2">
            {(['all', 'hotel', 'restaurant', 'attraction'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-4 py-2 rounded-full font-mono text-[10px] tracking-wider uppercase whitespace-nowrap transition-colors ${
                  selectedType === type
                    ? 'bg-yl-dark-navy text-yl-parchment'
                    : 'bg-yl-gray-100 text-yl-gray-500 hover:bg-yl-gray-200'
                }`}
              >
                {labels[type]}
              </button>
            ))}
            <span className="font-mono text-[10px] tracking-wider uppercase text-yl-gray-500 ml-auto">
              {filtered.length} {locale === 'en' ? 'results' : 'نتيجة'}
            </span>
          </div>
        </div>
      </div>

      {/* Recommendations Grid */}
      <section className="max-w-7xl mx-auto px-7 py-12">
        <div className="grid md:grid-cols-2 gap-8">
          {filtered.map((item) => (
            <BrandCardLight key={item.id} className="overflow-hidden group">
              <div className="relative aspect-video">
                <Image
                  src={item.image}
                  alt={locale === 'en' ? item.name_en : item.name_ar}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className={`absolute top-4 ${isRTL ? 'right-4' : 'left-4'}`}>
                  <BrandTag color="neutral">
                    {labels[item.type as keyof typeof labels]}
                  </BrandTag>
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-xl font-heading font-semibold text-yl-charcoal mb-2">
                      {locale === 'en' ? item.name_en : item.name_ar}
                    </h3>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${i < Math.floor(item.rating) ? 'fill-yl-gold text-yl-gold' : 'text-yl-gray-300'}`}
                          />
                        ))}
                      </div>
                      <span className="font-mono text-[10px] tracking-wider text-yl-gray-500">{item.rating}</span>
                    </div>
                  </div>
                  <div className={`${isRTL ? 'text-left' : 'text-right'}`}>
                    <div className="text-lg font-heading font-semibold text-yl-red">{item.price_range}</div>
                  </div>
                </div>

                <p className="text-sm text-yl-gray-500 font-body leading-relaxed mb-4">
                  {locale === 'en' ? item.description_en : item.description_ar}
                </p>

                <div className="flex items-center gap-2 text-sm text-yl-gray-500 mb-4">
                  <MapPin className="h-4 w-4 shrink-0 text-yl-gold" />
                  <span className="font-body">{locale === 'en' ? item.address_en : item.address_ar}</span>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {(locale === 'en' ? item.features_en : item.features_ar).map((feature) => (
                    <span key={feature} className="px-2 py-1 bg-yl-cream font-mono text-[10px] tracking-wider uppercase text-yl-gray-500 rounded-full border border-yl-gray-200/50">
                      {feature}
                    </span>
                  ))}
                </div>

                {(() => {
                  const affLink = getPageAffiliateLink(item.name_en, item.type as AffiliateCategory, 'yalla-london', 'recommendations');
                  return (
                  <div className="flex flex-col gap-2 pt-4 border-t border-yl-gray-200">
                    <div className="flex items-center gap-2">
                      {item.phone && (
                        <a
                          href={`tel:${item.phone}`}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-yl-gray-200 rounded-[14px] text-sm text-yl-gray-500 font-body hover:bg-yl-cream transition-colors"
                        >
                          <Phone className="h-4 w-4" />
                          {locale === 'en' ? 'Call' : 'اتصل'}
                        </a>
                      )}
                      <a
                        href={item.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-yl-gray-200 rounded-[14px] text-sm text-yl-gray-500 font-body hover:bg-yl-cream transition-colors"
                      >
                        <Globe className="h-4 w-4" />
                        {locale === 'en' ? 'Official Site' : 'الموقع الرسمي'}
                      </a>
                    </div>
                    {affLink && (
                      <a
                        href={affLink.url}
                        target="_blank"
                        rel="noopener sponsored"
                        className={`${affLink.trackingClass} flex items-center justify-center gap-2 px-4 py-2.5 bg-yl-red text-white text-sm font-heading font-semibold rounded-[14px] hover:bg-[#a82924] hover:-translate-y-0.5 transition-all shadow-lg`}
                        data-affiliate-partner={affLink.partner}
                      >
                        {affLink.label} →
                      </a>
                    )}
                  </div>
                  );
                })()}
              </div>
            </BrandCardLight>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <p className="text-xl text-yl-gray-500 font-body">
              {locale === 'en' ? 'No recommendations found matching your search.' : 'لم يتم العثور على توصيات تطابق بحثك.'}
            </p>
          </div>
        )}
      </section>

      {/* Insider Tips for Arab Travellers */}
      <section className="py-12 bg-yl-cream">
        <div className="max-w-7xl mx-auto px-7">
          <div className="text-center mb-10">
            <SectionLabel>{locale === 'en' ? 'Practical Advice' : 'نصائح عملية'}</SectionLabel>
            <h2 className="text-3xl font-heading font-bold text-yl-charcoal">
              {locale === 'en' ? 'Insider Tips for Arab Travellers' : 'نصائح من الداخل للمسافرين العرب'}
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {insiderTips.map((tip, idx) => {
              const TipIcon = tip.icon
              return (
                <BrandCardLight key={idx} className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-yl-gold/10 flex items-center justify-center shrink-0">
                      <TipIcon className="w-5 h-5 text-yl-gold" />
                    </div>
                    <h3 className="text-lg font-heading font-semibold text-yl-charcoal">
                      {locale === 'en' ? tip.title_en : tip.title_ar}
                    </h3>
                  </div>
                  <p className="text-sm text-yl-gray-500 font-body leading-relaxed">
                    {locale === 'en' ? tip.desc_en : tip.desc_ar}
                  </p>
                </BrandCardLight>
              )
            })}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-12 bg-white">
        <div className="max-w-3xl mx-auto px-7">
          <div className="text-center mb-10">
            <SectionLabel>{locale === 'en' ? 'Common Questions' : 'أسئلة شائعة'}</SectionLabel>
            <h2 className="text-3xl font-heading font-bold text-yl-charcoal">
              {locale === 'en' ? 'Frequently Asked Questions' : 'الأسئلة الشائعة'}
            </h2>
          </div>
          <div className="space-y-3">
            {faqItems.map((faq, idx) => (
              <div key={idx} className="border border-yl-gray-200 rounded-[14px] overflow-hidden bg-yl-cream/50">
                <button
                  onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-yl-cream transition-colors"
                >
                  <span className="font-heading font-semibold text-yl-charcoal pr-4">
                    {locale === 'en' ? faq.q_en : faq.q_ar}
                  </span>
                  {openFaqIndex === idx ? (
                    <ChevronUp className="w-5 h-5 text-yl-gold shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-yl-gray-400 shrink-0" />
                  )}
                </button>
                {openFaqIndex === idx && (
                  <div className="px-6 pb-5">
                    <p className="text-sm text-yl-gray-500 font-body leading-relaxed">
                      {locale === 'en' ? faq.a_en : faq.a_ar}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <TriBar />

      {/* Cross-linking */}
      <section className="bg-yl-dark-navy py-16">
        <div className="max-w-7xl mx-auto px-7 text-center">
          <SectionLabel>{locale === 'en' ? 'Explore More' : 'استكشف المزيد'}</SectionLabel>
          <h2 className="text-3xl font-heading font-bold text-white mb-8">
            {locale === 'en' ? 'Looking for more?' : 'تبحث عن المزيد؟'}
          </h2>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/hotels">
              <BrandButton variant="outline" className="border-white/30 text-white hover:bg-white/10">
                {locale === 'en' ? 'All Luxury Hotels' : 'جميع الفنادق الفاخرة'}
              </BrandButton>
            </Link>
            <Link href="/experiences">
              <BrandButton variant="outline" className="border-white/30 text-white hover:bg-white/10">
                {locale === 'en' ? 'All Experiences' : 'جميع التجارب'}
              </BrandButton>
            </Link>
            <Link href="/london-by-foot">
              <BrandButton variant="primary">
                {locale === 'en' ? 'London Walking Guides' : 'أدلة المشي في لندن'}
              </BrandButton>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
