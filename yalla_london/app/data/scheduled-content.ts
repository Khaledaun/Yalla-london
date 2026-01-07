/**
 * Scheduled Content for Yalla London
 *
 * Auto-publishing at:
 * - 10:04 Jerusalem Time (08:04 UTC in winter, 07:04 UTC in summer)
 * - 17:55 Jerusalem Time (15:55 UTC in winter, 14:55 UTC in summer)
 */

import { BlogPost } from './blog-content';

export interface ScheduledPost extends BlogPost {
  scheduled_at: Date;
  publish_status: 'scheduled' | 'published' | 'failed';
  timezone: string;
}

// Jerusalem timezone offset (UTC+2 winter, UTC+3 summer)
export const JERUSALEM_TIMEZONE = 'Asia/Jerusalem';

// Publishing times in Jerusalem local time
export const PUBLISH_TIMES = {
  morning: { hour: 10, minute: 4 },
  evening: { hour: 17, minute: 55 },
};

// ============================================
// SCHEDULED ARTICLES
// ============================================
export const scheduledPosts: ScheduledPost[] = [
  // Article 1: English - Premier League Guide
  {
    id: 'scheduled-post-001',
    slug: 'how-to-buy-premier-league-tickets-london-2026',
    title_en: 'How to Buy Premier League Tickets in London 2026: Complete Guide',
    title_ar: 'كيفية شراء تذاكر الدوري الإنجليزي في لندن 2026: دليل شامل',
    excerpt_en: 'Your ultimate guide to securing Premier League match tickets in London. Learn the best strategies for Arsenal, Chelsea, and Tottenham games.',
    excerpt_ar: 'دليلك الشامل للحصول على تذاكر مباريات الدوري الإنجليزي في لندن.',
    meta_title_en: 'Buy Premier League Tickets London 2026 | Step-by-Step Guide',
    meta_title_ar: 'شراء تذاكر الدوري الإنجليزي لندن 2026',
    meta_description_en: 'Complete guide to buying Premier League tickets in London. Arsenal, Chelsea, Tottenham - learn official channels, prices, and insider tips.',
    meta_description_ar: 'دليل شامل لشراء تذاكر الدوري الإنجليزي في لندن. أرسنال وتشيلسي وتوتنهام.',
    content_en: `# How to Buy Premier League Tickets in London 2026

Watching a Premier League match in London is a bucket-list experience for football fans worldwide. With six top-flight clubs in the capital, there's always a match to catch. Here's your complete guide to securing tickets.

## London's Premier League Clubs

| Club | Stadium | Capacity | Avg. Ticket Price |
|------|---------|----------|-------------------|
| Arsenal | Emirates Stadium | 60,704 | £50-150 |
| Chelsea | Stamford Bridge | 40,341 | £55-175 |
| Tottenham | Tottenham Hotspur Stadium | 62,850 | £45-140 |
| West Ham | London Stadium | 62,500 | £40-100 |
| Fulham | Craven Cottage | 25,700 | £35-85 |
| Crystal Palace | Selhurst Park | 25,486 | £30-75 |

## Official Ticket Channels

### 1. Club Membership
The most reliable way to get tickets:
- **Arsenal Red Membership**: £50/year - access to member sales
- **Chelsea True Blue**: £29/year - priority booking
- **Tottenham One Hotspur+**: £50/year - member ballot access

### 2. General Sale
Tickets occasionally go on general sale for less popular fixtures:
- Check club websites 3-4 weeks before matches
- Be ready at release time (usually 9:00 AM)
- Payment details pre-saved speeds checkout

### 3. Official Resale Platforms
- Arsenal Ticket Exchange
- Chelsea Ticket Exchange
- Tottenham Ticket Exchange

## Step-by-Step: Buying Arsenal Tickets

1. Create account at arsenal.com
2. Purchase Red Membership (£50)
3. Check fixture release schedule
4. Log in at sale time (usually Tuesday 10:00 AM)
5. Select match → Choose seats → Checkout

## Tips for Arab Visitors

- **Plan Ahead**: Book 4-6 weeks before travel
- **Match Day Experience**: Arrive 2 hours early for atmosphere
- **Halal Food**: Emirates has halal options; other stadiums limited
- **Prayer Facilities**: Contact clubs in advance
- **Family Sections**: All clubs offer family-friendly areas

## Avoid Ticket Scams

- ONLY buy from official club websites
- Never buy from street sellers
- Avoid Facebook/Instagram ticket offers
- Check viagogo carefully (high fees)

## Best Matches for Atmosphere

1. **North London Derby**: Arsenal vs Tottenham
2. **West London Derby**: Chelsea vs Fulham
3. **Any Big Six Match**: Liverpool, Man City, Man United visits

## Stadium Tour Alternative

Can't get match tickets? Stadium tours available daily:
- Emirates Stadium Tour: £30
- Chelsea Stadium Tour: £28
- Tottenham Stadium Tour: £35

Book these easily without membership!`,
    content_ar: `# كيفية شراء تذاكر الدوري الإنجليزي في لندن 2026

مشاهدة مباراة في الدوري الإنجليزي الممتاز في لندن تجربة لا تُنسى لمحبي كرة القدم حول العالم.

## أندية لندن في الدوري الممتاز

| النادي | الملعب | السعة | متوسط السعر |
|--------|--------|-------|-------------|
| أرسنال | ملعب الإمارات | 60,704 | £50-150 |
| تشيلسي | ستامفورد بريدج | 40,341 | £55-175 |
| توتنهام | ملعب توتنهام | 62,850 | £45-140 |

## القنوات الرسمية للتذاكر

### 1. عضوية النادي
الطريقة الأكثر موثوقية:
- **عضوية أرسنال الحمراء**: £50/سنة
- **تشيلسي ترو بلو**: £29/سنة
- **توتنهام ون هوتسبير**: £50/سنة

### 2. البيع العام
التذاكر متاحة أحياناً للمباريات الأقل شعبية

## نصائح للزوار العرب

- **خطط مبكراً**: احجز قبل 4-6 أسابيع
- **تجربة يوم المباراة**: احضر قبل ساعتين
- **طعام حلال**: ملعب الإمارات يوفر خيارات حلال
- **مرافق الصلاة**: تواصل مع الأندية مسبقاً`,
    featured_image: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=1200&h=630&fit=crop',
    category_id: 'cat-guides',
    tags: ['premier-league', 'tickets', 'arsenal', 'chelsea', 'tottenham', 'football'],
    keywords: ['premier league tickets london', 'buy arsenal tickets', 'chelsea tickets', 'تذاكر الدوري الإنجليزي'],
    page_type: 'how-to',
    seo_score: 94,
    reading_time: 8,
    published: false,
    created_at: new Date('2026-01-07'),
    updated_at: new Date('2026-01-07'),
    scheduled_at: new Date('2026-01-08T08:04:00Z'), // 10:04 Jerusalem
    publish_status: 'scheduled',
    timezone: JERUSALEM_TIMEZONE,
  },

  // Article 2: Arabic - Hyde Park Guide
  {
    id: 'scheduled-post-002',
    slug: 'hyde-park-london-complete-guide-2026',
    title_en: 'Hyde Park London: Complete Visitor Guide 2026',
    title_ar: 'حديقة هايد بارك لندن: دليل الزائر الشامل 2026',
    excerpt_en: 'Discover everything about Hyde Park - London\'s most famous royal park. Activities, attractions, and seasonal events.',
    excerpt_ar: 'اكتشف كل شيء عن هايد بارك - أشهر حديقة ملكية في لندن. الأنشطة والمعالم والفعاليات الموسمية.',
    meta_title_en: 'Hyde Park London Guide 2026 | Things to Do & See',
    meta_title_ar: 'دليل هايد بارك لندن 2026 | أشياء تفعلها وتراها',
    meta_description_en: 'Complete Hyde Park guide: Serpentine Lake, Speaker\'s Corner, Diana Memorial, Winter Wonderland. Free activities and family attractions.',
    meta_description_ar: 'دليل هايد بارك الشامل: بحيرة سربنتين، ركن المتحدثين، نصب ديانا التذكاري. أنشطة مجانية ومعالم عائلية.',
    content_en: `# Hyde Park London: Complete Visitor Guide 2026

Hyde Park is London's largest Royal Park, spanning 350 acres of beautiful green space in the heart of the city. Whether you're looking for peaceful walks, water activities, or cultural attractions, this guide covers it all.

## Quick Facts

- **Size**: 350 acres (142 hectares)
- **Location**: Central London (Westminster/Kensington)
- **Opening Hours**: 5:00 AM - Midnight daily
- **Entry**: FREE
- **Nearest Tubes**: Hyde Park Corner, Marble Arch, Lancaster Gate

## Top Attractions

### 1. The Serpentine
The 40-acre lake is perfect for:
- Pedal boat rental (£14/hour)
- Swimming at Serpentine Lido (summer)
- Lakeside café dining

### 2. Speaker's Corner
Historic free speech area near Marble Arch. Sunday mornings are most active.

### 3. Diana Memorial Fountain
Beautiful tribute to Princess Diana. Free to visit.

### 4. Kensington Palace
Royal residence at the park's western edge. Tours from £20.

## Family Activities

- **Playground**: Diana Memorial Playground (Peter Pan themed)
- **Horse Riding**: Hyde Park Stables offers lessons
- **Cycling**: Rent Santander bikes (£1.65 per 30 min)
- **Picnics**: Designated areas throughout

## Seasonal Events

| Event | When | Highlights |
|-------|------|------------|
| Winter Wonderland | Nov-Jan | Christmas market, ice skating |
| British Summer Time | July | Major concerts |
| Serpentine Pavilion | Summer | Architecture exhibition |

## Tips for Visitors

- **Best Time**: Early morning for peaceful walks
- **Photography**: Sunrise at the Serpentine is magical
- **Food**: The Serpentine Bar & Kitchen recommended
- **Combine With**: Kensington Gardens (connected)`,
    content_ar: `# حديقة هايد بارك لندن: دليل الزائر الشامل 2026

هايد بارك هي أكبر حديقة ملكية في لندن، تمتد على مساحة 350 فداناً من المساحات الخضراء الجميلة في قلب المدينة.

## معلومات سريعة

- **المساحة**: 350 فدان (142 هكتار)
- **الموقع**: وسط لندن (ويستمنستر/كنسينغتون)
- **ساعات العمل**: 5:00 صباحاً - منتصف الليل يومياً
- **الدخول**: مجاني
- **أقرب محطات المترو**: هايد بارك كورنر، ماربل آرتش، لانكستر غيت

## أهم المعالم

### 1. بحيرة سربنتين
البحيرة التي تبلغ مساحتها 40 فداناً مثالية لـ:
- استئجار قوارب البدال (£14/ساعة)
- السباحة في شاطئ سربنتين (صيفاً)
- تناول الطعام في المقاهي المطلة

### 2. ركن المتحدثين
منطقة تاريخية لحرية التعبير بالقرب من ماربل آرتش. صباح الأحد هو الأكثر نشاطاً.

### 3. نافورة الأميرة ديانا التذكارية
تكريم جميل للأميرة ديانا. الزيارة مجانية.

### 4. قصر كنسينغتون
المقر الملكي على الحافة الغربية للحديقة. الجولات من £20.

## أنشطة للعائلات

- **ملعب الأطفال**: ملعب ديانا التذكاري (بطابع بيتر بان)
- **ركوب الخيل**: اسطبلات هايد بارك تقدم دروساً
- **ركوب الدراجات**: استئجار دراجات سانتاندر
- **النزهات**: مناطق مخصصة في جميع أنحاء الحديقة

## الفعاليات الموسمية

| الفعالية | الموعد | أبرز النقاط |
|----------|--------|-------------|
| وينتر وندرلاند | نوفمبر-يناير | سوق عيد الميلاد، التزلج |
| بريتيش سمر تايم | يوليو | حفلات كبرى |

## نصائح للزوار

- **أفضل وقت**: الصباح الباكر للمشي الهادئ
- **التصوير**: شروق الشمس على سربنتين ساحر
- **الطعام**: مطعم سربنتين بار آند كيتشن موصى به
- **ادمج مع**: حدائق كنسينغتون (متصلة)

## للعائلات العربية

- مساحات واسعة للأطفال
- مناطق هادئة للاسترخاء
- قريبة من مناطق التسوق
- إطلالات جميلة للصور العائلية`,
    featured_image: 'https://images.unsplash.com/photo-1510137600163-2729bc6959b6?w=1200&h=630&fit=crop',
    category_id: 'cat-attractions',
    tags: ['hyde-park', 'london-parks', 'attractions', 'free-activities', 'family'],
    keywords: ['hyde park london', 'london parks', 'هايد بارك', 'حدائق لندن'],
    page_type: 'guide',
    seo_score: 92,
    reading_time: 6,
    published: false,
    created_at: new Date('2026-01-07'),
    updated_at: new Date('2026-01-07'),
    scheduled_at: new Date('2026-01-08T15:55:00Z'), // 17:55 Jerusalem
    publish_status: 'scheduled',
    timezone: JERUSALEM_TIMEZONE,
  },

  // Article 3: English - Harrods Shopping Guide
  {
    id: 'scheduled-post-003',
    slug: 'harrods-shopping-guide-arab-visitors-2026',
    title_en: 'Harrods Shopping Guide for Arab Visitors 2026',
    title_ar: 'دليل التسوق في هارودز للزوار العرب 2026',
    excerpt_en: 'Navigate Harrods like a pro. Arabic services, halal dining, prayer facilities, and insider tips for the ultimate shopping experience.',
    excerpt_ar: 'تنقل في هارودز باحترافية. الخدمات العربية والطعام الحلال ومرافق الصلاة ونصائح من الداخل.',
    meta_title_en: 'Harrods Guide for Arab Visitors 2026 | Arabic Services & Halal',
    meta_title_ar: 'دليل هارودز للزوار العرب 2026 | خدمات عربية وحلال',
    meta_description_en: 'Complete Harrods guide for Arab shoppers. Arabic-speaking staff, halal food options, prayer rooms, VAT refund, and luxury brand locations.',
    meta_description_ar: 'دليل هارودز الشامل للمتسوقين العرب. طاقم يتحدث العربية، خيارات طعام حلال، غرف صلاة، استرداد ضريبة.',
    content_en: `# Harrods Shopping Guide for Arab Visitors 2026

Harrods isn't just a department store—it's a London landmark and a must-visit destination for Arab visitors. With dedicated Arabic services and halal options, here's how to make the most of your visit.

## Essential Information

- **Address**: 87-135 Brompton Road, Knightsbridge, SW1X 7XL
- **Hours**: Mon-Sat 10am-9pm, Sun 11:30am-6pm
- **Nearest Tube**: Knightsbridge (Piccadilly Line)
- **Floors**: 7 floors, 330+ departments

## Arabic Services at Harrods

### Arabic-Speaking Staff
- Available on all luxury floors
- Welcome desk assistance
- Personal shopping in Arabic

### GCC Customer Lounge
- Exclusive area for Gulf visitors
- Complimentary refreshments
- Private shopping assistance
- Available during peak seasons

## Store Directory by Floor

| Floor | Highlights |
|-------|------------|
| LG | Food halls, Wine, Chocolate |
| G | Accessories, Fragrance, Jewelry |
| 1 | Women's Designer Fashion |
| 2 | Women's Collections |
| 3 | Menswear |
| 4 | Children, Toys, Home |
| 5 | Technology, Furniture |

## Luxury Brands to Visit

### Fashion
- Chanel (Ground floor)
- Louis Vuitton (Ground floor)
- Hermès (Ground floor)
- Gucci (Ground floor)
- Dior (First floor)

### Watches & Jewelry
- Rolex
- Patek Philippe
- Cartier
- Van Cleef & Arpels
- Bulgari

## Halal Dining Options

### The Harrods Food Hall
- Fresh halal meat counter
- Halal-certified prepared foods
- Middle Eastern cuisine section

### Restaurants
- **The Georgian**: Traditional tea, halal options available
- **Harrods Rotisserie**: Halal chicken available
- **Pizza & Pasta**: Vegetarian options

## Prayer Facilities

- Request prayer room access at Welcome Desk
- Nearest mosque: Knightsbridge Mosque (10 min walk)
- Wudu facilities available on request

## VAT Refund Guide

Arab visitors can claim 12.5% VAT back:

1. **Minimum spend**: £30 per transaction
2. **Request VAT form** at any till
3. **Process at airport** before departure
4. **Harrods Tax Free desk**: Ground floor

## Insider Tips

1. **Avoid Weekends**: Tuesday-Thursday less crowded
2. **Early Bird**: First hour (10-11am) quietest
3. **Personal Shopping**: Free service, book 48hrs ahead
4. **Dress Code**: Smart casual recommended
5. **Photography**: Not allowed inside store

## Nearby Attractions

- Harvey Nichols (5 min walk)
- Hyde Park (2 min walk)
- Victoria & Albert Museum (10 min walk)
- Natural History Museum (12 min walk)`,
    content_ar: `# دليل التسوق في هارودز للزوار العرب 2026

هارودز ليس مجرد متجر—إنه معلم لندني ووجهة لا بد من زيارتها للزوار العرب.

## معلومات أساسية

- **العنوان**: 87-135 Brompton Road, Knightsbridge
- **الساعات**: الإثنين-السبت 10ص-9م، الأحد 11:30ص-6م
- **أقرب مترو**: نايتسبريدج (خط بيكاديلي)
- **الطوابق**: 7 طوابق، أكثر من 330 قسم

## الخدمات العربية في هارودز

### طاقم يتحدث العربية
- متوفر في جميع طوابق الفخامة
- مساعدة مكتب الاستقبال
- تسوق شخصي بالعربية

### صالة عملاء الخليج
- منطقة حصرية لزوار الخليج
- مرطبات مجانية
- مساعدة تسوق خاصة

## دليل المتجر حسب الطابق

| الطابق | أبرز النقاط |
|--------|-------------|
| السفلي | قاعات الطعام، الشوكولاتة |
| الأرضي | الإكسسوارات، العطور، المجوهرات |
| الأول | أزياء المصممين النسائية |
| الثالث | أزياء الرجال |
| الرابع | الأطفال، الألعاب، المنزل |

## خيارات الطعام الحلال

### قاعة طعام هارودز
- منضدة لحوم حلال طازجة
- أطعمة جاهزة معتمدة حلال
- قسم المأكولات الشرق أوسطية

## مرافق الصلاة

- اطلب غرفة الصلاة من مكتب الاستقبال
- أقرب مسجد: مسجد نايتسبريدج (10 دقائق سيراً)
- مرافق وضوء متوفرة عند الطلب

## دليل استرداد ضريبة القيمة المضافة

يمكن للزوار العرب استرداد 12.5%:

1. **الحد الأدنى للإنفاق**: £30 لكل معاملة
2. **اطلب نموذج VAT** من أي كاشير
3. **المعالجة في المطار** قبل المغادرة

## نصائح من الداخل

1. **تجنب عطلة نهاية الأسبوع**: الثلاثاء-الخميس أقل ازدحاماً
2. **البكور**: الساعة الأولى (10-11ص) الأهدأ
3. **التسوق الشخصي**: خدمة مجانية، احجز قبل 48 ساعة`,
    featured_image: 'https://images.unsplash.com/photo-1569163139599-0f4517e36f51?w=1200&h=630&fit=crop',
    category_id: 'cat-shopping',
    tags: ['harrods', 'shopping', 'luxury', 'arab-visitors', 'halal', 'knightsbridge'],
    keywords: ['harrods arab visitors', 'harrods arabic', 'harrods halal', 'هارودز', 'التسوق في لندن'],
    page_type: 'guide',
    seo_score: 95,
    reading_time: 7,
    published: false,
    created_at: new Date('2026-01-07'),
    updated_at: new Date('2026-01-07'),
    scheduled_at: new Date('2026-01-09T08:04:00Z'), // 10:04 Jerusalem
    publish_status: 'scheduled',
    timezone: JERUSALEM_TIMEZONE,
  },

  // Article 4: Arabic - British Museum Guide
  {
    id: 'scheduled-post-004',
    slug: 'british-museum-complete-guide-2026',
    title_en: 'British Museum Complete Guide 2026: Free Entry & Must-See Exhibits',
    title_ar: 'دليل المتحف البريطاني الشامل 2026: دخول مجاني وأهم المعروضات',
    excerpt_en: 'Everything you need to know about visiting the British Museum. Free entry, Islamic art collection, Egyptian mummies, and practical tips.',
    excerpt_ar: 'كل ما تحتاج معرفته عن زيارة المتحف البريطاني. دخول مجاني، مجموعة الفن الإسلامي، المومياوات المصرية، ونصائح عملية.',
    meta_title_en: 'British Museum Guide 2026 | Free Entry, Best Exhibits',
    meta_title_ar: 'دليل المتحف البريطاني 2026 | دخول مجاني وأفضل المعروضات',
    meta_description_en: 'Free British Museum guide: Egyptian mummies, Rosetta Stone, Islamic galleries. Opening hours, tips, and must-see artifacts for 2026 visitors.',
    meta_description_ar: 'دليل المتحف البريطاني المجاني: المومياوات المصرية، حجر رشيد، صالات الفن الإسلامي. ساعات العمل ونصائح للزوار.',
    content_en: `# British Museum Complete Guide 2026

The British Museum houses over 8 million works spanning human history. Best of all? Entry is completely FREE. Here's your complete guide to making the most of your visit.

## Essential Information

- **Address**: Great Russell Street, WC1B 3DG
- **Hours**: Daily 10:00-17:00 (Fridays until 20:30)
- **Entry**: FREE (donations appreciated)
- **Nearest Tube**: Tottenham Court Road, Holborn, Russell Square

## Top 10 Must-See Exhibits

### 1. Rosetta Stone (Room 4)
The key to deciphering Egyptian hieroglyphics. Most famous object in the museum.

### 2. Egyptian Mummies (Rooms 62-63)
Over 100 mummies and coffins. Fascinating insight into ancient Egyptian burial practices.

### 3. Parthenon Sculptures (Room 18)
Stunning marble sculptures from ancient Athens' Parthenon temple.

### 4. Islamic Art Gallery (Room 34)
Beautiful collection of Islamic ceramics, textiles, and manuscripts.

### 5. Assyrian Lion Hunt Reliefs (Room 10)
Incredible 2,700-year-old carvings from ancient Iraq.

### 6. Lewis Chessmen (Room 40)
Medieval chess pieces carved from walrus ivory.

### 7. Sutton Hoo Helmet (Room 41)
Anglo-Saxon burial treasures from 7th century England.

### 8. Samurai Armour (Room 93)
Japanese warrior equipment from feudal Japan.

### 9. Easter Island Statue (Room 24)
Hoa Hakananai'a - one of the famous moai statues.

### 10. The Great Court
Norman Foster's stunning glass-roofed courtyard.

## Islamic Art Collection Highlights

Room 34 features remarkable Islamic artifacts:
- **Iznik ceramics** from Ottoman Turkey
- **Persian manuscripts** with intricate calligraphy
- **Mosque lamps** from medieval Cairo
- **Textiles** from across the Islamic world

## Suggested Routes

### Quick Visit (2 hours)
Rosetta Stone → Egyptian Mummies → Parthenon → Islamic Gallery → Great Court

### Half Day (4 hours)
Add: Assyrian galleries, Asian collections, Lewis Chessmen

### Full Day
Explore all major galleries, take breaks in the Great Court café

## Practical Tips

1. **Arrive Early**: 10:00 opening is quietest
2. **Friday Evenings**: Open until 20:30, much less crowded
3. **Audio Guide**: £7, available in Arabic
4. **Free Tours**: Daily highlights tours at 11:30 & 14:00
5. **Photography**: Allowed without flash

## Facilities

- **Cloakroom**: Free bag storage
- **Café**: Great Court Restaurant (halal options limited)
- **Gift Shop**: Excellent books and replicas
- **Wheelchair Access**: Full accessibility

## Nearby Attractions

- British Library (15 min walk)
- Covent Garden (10 min walk)
- West End theatres (10 min walk)`,
    content_ar: `# دليل المتحف البريطاني الشامل 2026

يضم المتحف البريطاني أكثر من 8 ملايين قطعة تمتد عبر التاريخ البشري. والأفضل؟ الدخول مجاني تماماً.

## معلومات أساسية

- **العنوان**: Great Russell Street, WC1B 3DG
- **الساعات**: يومياً 10:00-17:00 (الجمعة حتى 20:30)
- **الدخول**: مجاني (التبرعات مرحب بها)
- **أقرب مترو**: توتنهام كورت رود، هولبورن

## أهم 10 معروضات يجب مشاهدتها

### 1. حجر رشيد (غرفة 4)
مفتاح فك رموز الهيروغليفية المصرية. أشهر قطعة في المتحف.

### 2. المومياوات المصرية (غرف 62-63)
أكثر من 100 مومياء وتابوت. نظرة رائعة على ممارسات الدفن المصرية القديمة.

### 3. منحوتات البارثينون (غرفة 18)
منحوتات رخامية مذهلة من معبد البارثينون في أثينا القديمة.

### 4. صالة الفن الإسلامي (غرفة 34)
مجموعة جميلة من السيراميك والمنسوجات والمخطوطات الإسلامية.

### 5. نقوش صيد الأسود الآشورية (غرفة 10)
نقوش مذهلة عمرها 2,700 عام من العراق القديم.

## أبرز مجموعة الفن الإسلامي

الغرفة 34 تضم قطعاً إسلامية رائعة:
- **سيراميك إزنيق** من تركيا العثمانية
- **مخطوطات فارسية** بخط عربي متقن
- **مصابيح المساجد** من القاهرة في العصور الوسطى
- **منسوجات** من أنحاء العالم الإسلامي

## مسارات مقترحة

### زيارة سريعة (ساعتان)
حجر رشيد ← المومياوات ← البارثينون ← الفن الإسلامي ← الفناء الكبير

### نصف يوم (4 ساعات)
أضف: الصالات الآشورية، المجموعات الآسيوية

## نصائح عملية

1. **احضر مبكراً**: الافتتاح الساعة 10:00 الأهدأ
2. **مساء الجمعة**: مفتوح حتى 20:30، أقل ازدحاماً
3. **الدليل الصوتي**: £7، متوفر بالعربية
4. **جولات مجانية**: يومياً الساعة 11:30 و 14:00
5. **التصوير**: مسموح بدون فلاش

## المرافق

- **غرفة الأمانات**: تخزين حقائب مجاني
- **المقهى**: مطعم الفناء الكبير
- **متجر الهدايا**: كتب ونسخ ممتازة
- **وصول الكراسي المتحركة**: إمكانية وصول كاملة

## للزوار العرب

- الدليل الصوتي متوفر بالعربية
- صالة الفن الإسلامي لا تُفوت
- المعروضات المصرية والعراقية تربطنا بتاريخنا
- المتحف مجاني - استمتع بالزيارة!`,
    featured_image: 'https://images.unsplash.com/photo-1574322499259-68d6f6f194a8?w=1200&h=630&fit=crop',
    category_id: 'cat-attractions',
    tags: ['british-museum', 'free-attractions', 'islamic-art', 'egyptian', 'london-museums'],
    keywords: ['british museum', 'british museum free', 'المتحف البريطاني', 'متاحف لندن المجانية'],
    page_type: 'guide',
    seo_score: 93,
    reading_time: 9,
    published: false,
    created_at: new Date('2026-01-07'),
    updated_at: new Date('2026-01-07'),
    scheduled_at: new Date('2026-01-09T15:55:00Z'), // 17:55 Jerusalem
    publish_status: 'scheduled',
    timezone: JERUSALEM_TIMEZONE,
  },
];

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get posts scheduled for a specific date
 */
export function getPostsForDate(date: Date): ScheduledPost[] {
  return scheduledPosts.filter(post => {
    const postDate = new Date(post.scheduled_at);
    return postDate.toDateString() === date.toDateString();
  });
}

/**
 * Get all pending scheduled posts
 */
export function getPendingPosts(): ScheduledPost[] {
  return scheduledPosts.filter(post => post.publish_status === 'scheduled');
}

/**
 * Get next post to publish
 */
export function getNextScheduledPost(): ScheduledPost | undefined {
  const now = new Date();
  return scheduledPosts
    .filter(post => post.publish_status === 'scheduled' && new Date(post.scheduled_at) > now)
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())[0];
}

/**
 * Convert UTC to Jerusalem time for display
 */
export function toJerusalemTime(utcDate: Date): string {
  return utcDate.toLocaleString('en-GB', { timeZone: JERUSALEM_TIMEZONE });
}

// ============================================
// CRON CONFIGURATION
// ============================================
export const cronConfig = {
  // Vercel Cron syntax for Jerusalem times
  // Note: Vercel uses UTC, so we convert:
  // 10:04 Jerusalem (winter UTC+2) = 08:04 UTC
  // 17:55 Jerusalem (winter UTC+2) = 15:55 UTC
  morning: '4 8 * * *',  // 08:04 UTC daily
  evening: '55 15 * * *', // 15:55 UTC daily

  // For vercel.json
  vercelCrons: [
    {
      path: '/api/cron/publish',
      schedule: '4 8 * * *'
    },
    {
      path: '/api/cron/publish',
      schedule: '55 15 * * *'
    }
  ]
};

export default {
  scheduledPosts,
  JERUSALEM_TIMEZONE,
  PUBLISH_TIMES,
  cronConfig,
  getPostsForDate,
  getPendingPosts,
  getNextScheduledPost,
  toJerusalemTime,
};
