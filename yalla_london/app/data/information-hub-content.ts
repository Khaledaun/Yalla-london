/**
 * Information Hub Content for Yalla London
 * Main data file: interfaces, sections (with subsections), categories, and articles 1-10.
 */

// ===================== INTERFACES =====================

export interface InformationSubsection {
  id: string;
  title_en: string;
  title_ar: string;
  content_en: string;
  content_ar: string;
}

export interface InformationSection {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
  description_en: string;
  description_ar: string;
  icon: string;
  featured_image: string;
  sort_order: number;
  published: boolean;
  subsections: InformationSubsection[];
}

export interface FAQQuestion {
  question_en: string;
  question_ar: string;
  answer_en: string;
  answer_ar: string;
}

export interface InformationArticle {
  id: string;
  slug: string;
  section_id: string;
  category_id: string;
  title_en: string;
  title_ar: string;
  excerpt_en: string;
  excerpt_ar: string;
  content_en: string;
  content_ar: string;
  featured_image: string;
  reading_time: number;
  published: boolean;
  created_at: Date;
  updated_at: Date;
  meta_title_en: string;
  meta_title_ar: string;
  meta_description_en: string;
  meta_description_ar: string;
  tags: string[];
  keywords: string[];
  page_type: string;
  seo_score: number;
  faq_questions: FAQQuestion[];
}

export interface InformationCategory {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
}

// ===================== SECTIONS =====================

export const informationSections: InformationSection[] = [
  {
    id: 'sec-plan-your-trip',
    slug: 'plan-your-trip',
    name_en: 'Plan Your Trip',
    name_ar: 'خطط لرحلتك',
    description_en: 'Everything you need to plan the perfect London trip — visas, best times to visit, packing tips, and itineraries.',
    description_ar: 'كل ما تحتاجه للتخطيط لرحلة لندن المثالية — التأشيرات، أفضل أوقات الزيارة، نصائح التعبئة، والبرامج السياحية.',
    icon: 'map',
    featured_image: '/images/information/plan-your-trip.jpg',
    sort_order: 1,
    published: true,
    subsections: [
      {
        id: 'sub-visa-entry',
        title_en: 'Visa & Entry Requirements',
        title_ar: 'التأشيرات ومتطلبات الدخول',
        content_en: `Most GCC nationals can enter the UK visa-free for up to 6 months. Citizens of other Arab countries typically need a Standard Visitor Visa. Apply online through the UK Government website at least 3 weeks before travel.\n\n**Key documents:** Valid passport (6+ months), return flight booking, hotel confirmation, proof of funds, and travel insurance.\n\n> **Tip:** The Electronic Travel Authorisation (ETA) system now applies to GCC nationals — apply online before travel.`,
        content_ar: `يمكن لمعظم مواطني دول مجلس التعاون الخليجي دخول المملكة المتحدة بدون تأشيرة لمدة تصل إلى 6 أشهر. يحتاج مواطنو الدول العربية الأخرى عادةً إلى تأشيرة زائر قياسية.\n\n**المستندات المطلوبة:** جواز سفر ساري (6 أشهر+)، حجز طيران العودة، تأكيد الفندق، إثبات الأموال، وتأمين السفر.`,
      },
      {
        id: 'sub-best-time',
        title_en: 'Best Time to Visit London',
        title_ar: 'أفضل وقت لزيارة لندن',
        content_en: `**Spring (April–May):** Mild weather, blooming parks, fewer crowds. Perfect for sightseeing.\n\n**Summer (June–August):** Warmest weather (18–25°C), longest days, but peak tourist season with higher prices.\n\n**Autumn (September–October):** Beautiful foliage, cultural season begins, moderate prices.\n\n**Winter (November–March):** Christmas markets, sales season, but cold and dark. Great for shopping at Harrods and Selfridges.\n\n> **Ramadan note:** If visiting during Ramadan, many halal restaurants offer special iftar menus. Check our [Food section](/information/food-restaurants) for details.`,
        content_ar: `**الربيع (أبريل–مايو):** طقس معتدل، حدائق مزهرة، ازدحام أقل.\n\n**الصيف (يونيو–أغسطس):** أدفأ طقس (18-25 درجة)، أطول أيام، لكنه موسم الذروة.\n\n**الخريف (سبتمبر–أكتوبر):** أوراق شجر جميلة، بداية الموسم الثقافي.\n\n**الشتاء (نوفمبر–مارس):** أسواق عيد الميلاد، موسم التخفيضات، لكنه بارد ومظلم.`,
      },
      {
        id: 'sub-packing',
        title_en: 'Packing & Preparation',
        title_ar: 'التعبئة والتحضير',
        content_en: `**Essentials:** Layers (London weather changes quickly), waterproof jacket, comfortable walking shoes, UK power adapter (Type G, 3-pin).\n\n**Tech:** Download the TfL Go app, Google Maps offline, and a currency converter. Get an Oyster card or use contactless payment.\n\n**Health:** Bring any prescription medications, basic first aid. EU/EHIC cards no longer valid post-Brexit — get travel insurance.`,
        content_ar: `**الأساسيات:** ملابس متعددة الطبقات، سترة مقاومة للماء، أحذية مريحة للمشي، محول كهرباء بريطاني.\n\n**التقنية:** حمّل تطبيق TfL Go وخرائط Google غير المتصلة ومحول العملات.\n\n**الصحة:** أحضر أي أدوية موصوفة واحصل على تأمين سفر.`,
      },
    ],
  },
  {
    id: 'sec-attractions-landmarks',
    slug: 'attractions-landmarks',
    name_en: 'Attractions & Landmarks',
    name_ar: 'المعالم والأماكن السياحية',
    description_en: 'Iconic landmarks, world-class museums, royal palaces, and must-see sights across London.',
    description_ar: 'المعالم الشهيرة، المتاحف العالمية، القصور الملكية، والأماكن التي يجب زيارتها في لندن.',
    icon: 'landmark',
    featured_image: '/images/information/attractions-landmarks.jpg',
    sort_order: 2,
    published: true,
    subsections: [
      {
        id: 'sub-iconic-landmarks',
        title_en: 'Iconic Landmarks',
        title_ar: 'المعالم الشهيرة',
        content_en: `**Big Ben & Houses of Parliament:** The iconic clock tower on the Thames. Free to photograph from Westminster Bridge.\n\n**Tower of London:** Home to the Crown Jewels. Book online to skip queues (£33 adults). Allow 3 hours.\n\n**Buckingham Palace:** Watch the Changing of the Guard (free, 11am most days). State Rooms open in summer (£30).\n\n**Tower Bridge:** Free to walk across; the Exhibition costs £11.40 with stunning glass-floor views.\n\n**The London Eye:** 30-minute ride with panoramic views. Book online for £30+ and skip the queue.`,
        content_ar: `**بيغ بن ومبنى البرلمان:** برج الساعة الشهير على نهر التايمز. التصوير مجاني من جسر وستمنستر.\n\n**برج لندن:** موطن جواهر التاج. احجز أونلاين لتجنب الطوابير.\n\n**قصر باكنغهام:** شاهد تبديل الحرس (مجاني، الساعة 11 صباحاً).\n\n**جسر البرج:** المشي مجاني؛ المعرض بإطلالات زجاجية مذهلة.\n\n**عين لندن:** جولة 30 دقيقة بإطلالات بانورامية.`,
      },
      {
        id: 'sub-museums',
        title_en: 'World-Class Museums',
        title_ar: 'متاحف عالمية',
        content_en: `London has some of the world's best museums — and many are **completely free**.\n\n- **British Museum:** Ancient Egyptian, Greek, and Middle Eastern artefacts. Free entry.\n- **Natural History Museum:** Dinosaurs, wildlife, and the stunning Hintze Hall. Free.\n- **Victoria & Albert Museum:** Art, fashion, and design across 5,000 years. Free.\n- **Science Museum:** Interactive exhibits perfect for families. Free.\n- **Tate Modern:** Contemporary art in a converted power station. Free.\n\n> **Tip:** Visit on weekday mornings to avoid crowds. Most museums open 10am–5:30pm.`,
        content_ar: `تمتلك لندن بعض أفضل المتاحف في العالم — والعديد منها **مجاني تماماً**.\n\n- **المتحف البريطاني:** آثار مصرية ويونانية وشرق أوسطية. دخول مجاني.\n- **متحف التاريخ الطبيعي:** ديناصورات وحياة برية. مجاني.\n- **متحف فيكتوريا وألبرت:** فن وأزياء وتصميم. مجاني.\n- **متحف العلوم:** معارض تفاعلية مثالية للعائلات. مجاني.`,
      },
    ],
  },
  {
    id: 'sec-neighbourhood-guides',
    slug: 'neighbourhood-guides',
    name_en: 'Neighbourhood Guides',
    name_ar: 'أدلة الأحياء',
    description_en: 'Explore London neighbourhood by neighbourhood — from Mayfair and Knightsbridge to Camden and Shoreditch.',
    description_ar: 'استكشف لندن حياً بحي — من مايفير ونايتسبريدج إلى كامدن وشورديتش.',
    icon: 'map-pin',
    featured_image: '/images/information/neighbourhood-guides.jpg',
    sort_order: 3,
    published: true,
    subsections: [
      {
        id: 'sub-central-london',
        title_en: 'Central London: Mayfair, Knightsbridge & Kensington',
        title_ar: 'وسط لندن: مايفير ونايتسبريدج وكنسينغتون',
        content_en: `**Mayfair:** Luxury shopping on Bond Street, 5-star hotels (The Dorchester, Claridge's), high-end dining. Popular with Gulf visitors.\n\n**Knightsbridge:** Home to Harrods. Many Arabic-speaking shops, restaurants, and services. Excellent for families.\n\n**Kensington:** Museums, Hyde Park, Kensington Palace. The Arab community hub — Edgware Road is nearby with halal restaurants, shisha cafés, and Arabic grocery stores.`,
        content_ar: `**مايفير:** تسوق فاخر في شارع بوند، فنادق 5 نجوم، مطاعم راقية. مفضلة لدى زوار الخليج.\n\n**نايتسبريدج:** موطن هارودز. العديد من المتاجر والمطاعم الناطقة بالعربية.\n\n**كنسينغتون:** متاحف، هايد بارك، قصر كنسينغتون. مركز المجتمع العربي.`,
      },
      {
        id: 'sub-east-south-london',
        title_en: 'East & South London',
        title_ar: 'شرق وجنوب لندن',
        content_en: `**Shoreditch & Brick Lane:** Street art, vintage markets, curry houses. Vibrant nightlife and creative scene.\n\n**South Bank:** Thames riverside walk from London Eye to Tate Modern. Street performers, food stalls, and the Southbank Centre.\n\n**Greenwich:** Maritime history, the Prime Meridian, and stunning views from Greenwich Park. Take the Thames Clipper for a scenic journey.`,
        content_ar: `**شورديتش وبريك لين:** فن الشارع، أسواق عتيقة، مطاعم كاري.\n\n**الضفة الجنوبية:** ممشى نهر التايمز من عين لندن إلى تيت مودرن.\n\n**غرينتش:** تاريخ بحري، خط غرينتش، وإطلالات خلابة.`,
      },
    ],
  },
  {
    id: 'sec-transportation',
    slug: 'transportation',
    name_en: 'Transportation',
    name_ar: 'المواصلات',
    description_en: 'Navigate London like a local — Oyster cards, the Tube, buses, taxis, and airport transfers.',
    description_ar: 'تنقل في لندن كالمحليين — بطاقة أويستر، المترو، الحافلات، سيارات الأجرة، والتنقل من المطار.',
    icon: 'train',
    featured_image: '/images/information/transportation.jpg',
    sort_order: 4,
    published: true,
    subsections: [
      {
        id: 'sub-tube',
        title_en: 'The London Underground (Tube)',
        title_ar: 'مترو لندن (التيوب)',
        content_en: `The Tube is the fastest way to get around London. It runs from approximately 5am to midnight (later on Fridays/Saturdays on some lines).\n\n**Payment:** Use contactless bank card or Oyster card. Never buy paper tickets — they cost double. Daily caps apply automatically (Zone 1-2: ~£8.10/day).\n\n**Tips:** Avoid rush hours (7:30-9:30am, 5-7pm). Stand on the right on escalators. Mind the gap between train and platform.\n\n**Step-free access:** Check the TfL website for step-free stations if you have pushchairs or mobility needs.`,
        content_ar: `المترو هو أسرع وسيلة للتنقل في لندن. يعمل من الساعة 5 صباحاً حتى منتصف الليل تقريباً.\n\n**الدفع:** استخدم بطاقة بنكية لاتلامسية أو بطاقة أويستر. لا تشترِ تذاكر ورقية — تكلفتها ضعف.\n\n**نصائح:** تجنب ساعات الذروة. قف على اليمين على السلالم المتحركة.`,
      },
      {
        id: 'sub-buses-taxis',
        title_en: 'Buses, Taxis & Ride-Sharing',
        title_ar: 'الحافلات وسيارات الأجرة',
        content_en: `**Buses:** Great for sightseeing (especially routes 11 and 24). Contactless/Oyster only — no cash. £1.75 per ride, daily cap £5.25.\n\n**Black cabs:** Iconic London taxis. Metered fares, can be hailed on the street. Reliable but expensive (£15-30 for central trips).\n\n**Uber/Bolt:** Widely available and usually cheaper than black cabs. Download the apps before arriving.\n\n**Airport transfers:** Heathrow Express to Paddington (15 min, £25). Gatwick Express to Victoria (30 min, £20). Or take the Tube from Heathrow for £5.50.`,
        content_ar: `**الحافلات:** رائعة لمشاهدة المعالم. الدفع اللاتلامسي/أويستر فقط — لا نقد.\n\n**التاكسي الأسود:** سيارات أجرة لندن الشهيرة. موثوقة لكنها مكلفة.\n\n**أوبر/بولت:** متوفرة على نطاق واسع وعادةً أرخص.\n\n**التنقل من المطار:** هيثرو إكسبرس إلى بادينغتون (15 دقيقة). أو المترو بتكلفة أقل.`,
      },
    ],
  },
  {
    id: 'sec-food-restaurants',
    slug: 'food-restaurants',
    name_en: 'Food & Restaurants',
    name_ar: 'الطعام والمطاعم',
    description_en: 'Halal dining, fine restaurants, street food markets, and the best culinary experiences in London.',
    description_ar: 'المطاعم الحلال، المطاعم الفاخرة، أسواق الطعام، وأفضل التجارب الغذائية في لندن.',
    icon: 'utensils-crossed',
    featured_image: '/images/information/food-restaurants.jpg',
    sort_order: 5,
    published: true,
    subsections: [
      {
        id: 'sub-halal-dining',
        title_en: 'Halal Dining Guide',
        title_ar: 'دليل المطاعم الحلال',
        content_en: `London is one of the best cities in Europe for halal dining, with hundreds of certified halal restaurants.\n\n**Top areas for halal food:**\n- **Edgware Road:** The heart of Arab London — Lebanese, Egyptian, Iraqi cuisine\n- **Whitechapel & Brick Lane:** Bangladeshi, Pakistani, and Indian halal restaurants\n- **Shepherd's Bush:** Diverse halal options from Middle Eastern to Somali\n\n**Apps to use:** HalalTrip, Zabihah, and Google Maps (search "halal" + cuisine type).\n\n> **Tip:** Always confirm halal certification status when dining at upscale or chain restaurants — look for HMC or HFA certificates.`,
        content_ar: `لندن واحدة من أفضل المدن في أوروبا للطعام الحلال، مع مئات المطاعم الحلال المعتمدة.\n\n**أفضل المناطق للطعام الحلال:**\n- **إدجوير رود:** قلب لندن العربية — مأكولات لبنانية ومصرية وعراقية\n- **وايتتشابل وبريك لين:** مطاعم بنغلاديشية وباكستانية وهندية حلال\n- **شيبردز بوش:** خيارات حلال متنوعة`,
      },
      {
        id: 'sub-street-food',
        title_en: 'Street Food & Markets',
        title_ar: 'طعام الشارع والأسواق',
        content_en: `**Borough Market:** London's most famous food market. Artisan produce, international street food, and halal stalls. Open Wed-Sat.\n\n**Camden Market:** Eclectic mix of cuisines from around the world. Several halal options available.\n\n**Brick Lane Market:** Sunday market with amazing Bangladeshi and Indian street food.\n\n**Portobello Road Market:** Notting Hill's famous market — antiques, fashion, and food stalls (Saturdays).`,
        content_ar: `**سوق بورو:** أشهر سوق طعام في لندن. منتجات حرفية وأكل شارع عالمي.\n\n**سوق كامدن:** مزيج انتقائي من المأكولات من جميع أنحاء العالم.\n\n**سوق بريك لين:** سوق يوم الأحد مع أطعمة شارع بنغلاديشية وهندية رائعة.`,
      },
    ],
  },
  {
    id: 'sec-family-kids',
    slug: 'family-kids',
    name_en: 'Family & Kids',
    name_ar: 'العائلة والأطفال',
    description_en: 'Family-friendly attractions, kids\' activities, theme parks, and tips for travelling with children.',
    description_ar: 'الأماكن المناسبة للعائلات، أنشطة الأطفال، المتنزهات الترفيهية، ونصائح السفر مع الأطفال.',
    icon: 'baby',
    featured_image: '/images/information/family-kids.jpg',
    sort_order: 6,
    published: true,
    subsections: [
      {
        id: 'sub-family-attractions',
        title_en: 'Family-Friendly Attractions',
        title_ar: 'أماكن مناسبة للعائلات',
        content_en: `**Free museums:** Natural History Museum, Science Museum, and V&A — all free, all amazing for kids.\n\n**London Zoo:** Regent's Park, 750+ species. Book online for discounts (£27 adults, £17 children).\n\n**SEA LIFE London Aquarium:** South Bank, 600+ species. Combined tickets available with London Eye.\n\n**Warner Bros. Studio Tour (Harry Potter):** Must-book in advance. Located in Watford, 20 min by train from Euston. £53 adults.\n\n**KidZania:** Indoor city for kids to role-play jobs. Westfield London, Shepherd's Bush.`,
        content_ar: `**متاحف مجانية:** متحف التاريخ الطبيعي ومتحف العلوم — مجانية ورائعة للأطفال.\n\n**حديقة حيوان لندن:** في ريجنت بارك، أكثر من 750 نوع.\n\n**جولة وارنر بروس (هاري بوتر):** يجب الحجز مسبقاً.\n\n**كيدزانيا:** مدينة داخلية للأطفال لتمثيل الأدوار المهنية.`,
      },
      {
        id: 'sub-family-tips',
        title_en: 'Practical Tips for Families',
        title_ar: 'نصائح عملية للعائلات',
        content_en: `**Pushchairs:** Most central London is pushchair-friendly, but the Tube has limited step-free access. Buses are easier.\n\n**Baby changing:** Available in most museums, department stores, and restaurants. Harrods has excellent family facilities.\n\n**Kids eat free:** Many restaurants offer free kids' meals — check individual restaurant websites.\n\n**Oyster for kids:** Children under 11 travel free on the Tube and buses with an adult Oyster cardholder.`,
        content_ar: `**عربات الأطفال:** معظم وسط لندن مناسب لعربات الأطفال، لكن المترو محدود. الحافلات أسهل.\n\n**تغيير الحفاضات:** متوفر في معظم المتاحف والمتاجر الكبرى.\n\n**أطفال يأكلون مجاناً:** العديد من المطاعم تقدم وجبات مجانية للأطفال.\n\n**أويستر للأطفال:** الأطفال دون 11 عاماً يسافرون مجاناً في المترو والحافلات.`,
      },
    ],
  },
  {
    id: 'sec-hidden-gems',
    slug: 'hidden-gems',
    name_en: 'Hidden Gems & Free Activities',
    name_ar: 'الجواهر الخفية والأنشطة المجانية',
    description_en: 'Secret spots, free museums, beautiful parks, and off-the-beaten-path experiences.',
    description_ar: 'الأماكن السرية، المتاحف المجانية، الحدائق الجميلة، والتجارب البعيدة عن المسارات التقليدية.',
    icon: 'gem',
    featured_image: '/images/information/hidden-gems.jpg',
    sort_order: 7,
    published: true,
    subsections: [
      {
        id: 'sub-secret-spots',
        title_en: 'Secret Spots & Viewpoints',
        title_ar: 'أماكن سرية ونقاط مشاهدة',
        content_en: `**Sky Garden:** Free rooftop garden at 20 Fenchurch Street with stunning 360° views. Book free tickets in advance.\n\n**Little Venice:** Charming canal area near Paddington with narrowboat cafés. Take a boat to Camden Market.\n\n**Kyoto Garden:** A hidden Japanese garden in Holland Park — peaceful and beautiful, especially in spring.\n\n**Neal's Yard:** Colourful hidden courtyard in Covent Garden with independent shops and cafés.\n\n**Hampstead Heath:** Panoramic views of the London skyline from Parliament Hill — best at sunset.`,
        content_ar: `**سكاي غاردن:** حديقة سطحية مجانية بإطلالات 360 درجة. احجز تذاكر مجانية مسبقاً.\n\n**ليتل فينيس:** منطقة قنوات ساحرة بالقرب من بادينغتون.\n\n**حديقة كيوتو:** حديقة يابانية مخفية في هولاند بارك.\n\n**نيلز يارد:** فناء ملون مخفي في كوفنت غاردن.`,
      },
      {
        id: 'sub-free-activities',
        title_en: 'Free Museums & Activities',
        title_ar: 'متاحف وأنشطة مجانية',
        content_en: `London offers more free attractions than almost any other city:\n\n- **Major free museums:** British Museum, National Gallery, Tate Modern, Natural History Museum, Science Museum, V&A\n- **Parks:** Hyde Park, Regent's Park, St James's Park, Greenwich Park — all free\n- **Changing of the Guard:** Free ceremony at Buckingham Palace\n- **Street markets:** Window-shop at Portobello Road, Camden, and Borough Market\n- **Southbank walk:** Free riverside walk from Westminster to Tower Bridge\n- **Speakers' Corner:** Sunday morning debates at Hyde Park`,
        content_ar: `تقدم لندن أماكن مجانية أكثر من أي مدينة أخرى تقريباً:\n\n- **متاحف مجانية:** المتحف البريطاني، المعرض الوطني، تيت مودرن، متحف التاريخ الطبيعي\n- **حدائق:** هايد بارك، ريجنت بارك، حديقة سانت جيمس — كلها مجانية\n- **تبديل الحرس:** حفل مجاني في قصر باكنغهام\n- **ممشى الضفة الجنوبية:** ممشى نهري مجاني`,
      },
    ],
  },
  {
    id: 'sec-dos-and-donts',
    slug: 'dos-and-donts',
    name_en: 'Dos & Don\'ts',
    name_ar: 'ما يجب فعله وما يجب تجنبه',
    description_en: 'Cultural etiquette, tipping customs, safety tips, and common mistakes to avoid in London.',
    description_ar: 'آداب السلوك الثقافي، عادات البقشيش، نصائح السلامة، والأخطاء الشائعة التي يجب تجنبها في لندن.',
    icon: 'alert-circle',
    featured_image: '/images/information/dos-and-donts.jpg',
    sort_order: 8,
    published: true,
    subsections: [
      {
        id: 'sub-etiquette',
        title_en: 'Cultural Etiquette',
        title_ar: 'آداب السلوك الثقافي',
        content_en: `**Queuing:** The British take queuing very seriously. Always join the back of the line and wait your turn.\n\n**Personal space:** Maintain a comfortable distance when talking. British people value personal space.\n\n**Greetings:** A smile and "hello" or "good morning" is standard. Handshakes for formal meetings. Avoid hugging strangers.\n\n**Please and thank you:** Use these constantly — it's essential to British politeness.\n\n**Indoor voice:** Keep voices moderate in public spaces, especially on public transport.`,
        content_ar: `**الطوابير:** البريطانيون يأخذون الطوابير بجدية كبيرة. انضم دائماً لنهاية الصف.\n\n**المساحة الشخصية:** حافظ على مسافة مريحة عند التحدث.\n\n**التحيات:** ابتسامة و"مرحباً" أو "صباح الخير" هي المعيار.\n\n**من فضلك وشكراً:** استخدمها باستمرار — إنها أساسية في الأدب البريطاني.`,
      },
      {
        id: 'sub-tipping',
        title_en: 'Tipping & Common Mistakes',
        title_ar: 'البقشيش والأخطاء الشائعة',
        content_en: `**Tipping guide:**\n- Restaurants: 10-15% (check if service charge is included)\n- Taxis: Round up to nearest £1\n- Hotels: £1-2 per bag for porters\n- Pubs/bars: Not expected for drinks at the bar\n\n**Common mistakes to avoid:**\n- Don't stand on the left side of escalators\n- Don't block the doors on the Tube — let people off first\n- Don't eat on the Tube (it's frowned upon)\n- Don't assume all restaurants are halal — always check\n- Don't forget to tap out with your Oyster card`,
        content_ar: `**دليل البقشيش:**\n- المطاعم: 10-15% (تحقق من رسوم الخدمة)\n- التاكسي: قرّب للجنيه الأقرب\n- الفنادق: 1-2 جنيه لكل حقيبة\n\n**أخطاء شائعة يجب تجنبها:**\n- لا تقف على الجانب الأيسر من السلالم المتحركة\n- لا تسد أبواب المترو\n- لا تفترض أن جميع المطاعم حلال`,
      },
    ],
  },
  {
    id: 'sec-practical-info',
    slug: 'practical-info',
    name_en: 'Practical Information',
    name_ar: 'معلومات عملية',
    description_en: 'Currency, weather, SIM cards, Wi-Fi, electricity, and essential practical tips for London.',
    description_ar: 'العملة، الطقس، شرائح الاتصال، الواي فاي، الكهرباء، ونصائح عملية أساسية للندن.',
    icon: 'info',
    featured_image: '/images/information/practical-info.jpg',
    sort_order: 9,
    published: true,
    subsections: [
      {
        id: 'sub-money-currency',
        title_en: 'Money, Currency & Cards',
        title_ar: 'المال والعملة والبطاقات',
        content_en: `**Currency:** British Pound Sterling (£/GBP). 1 GBP ≈ 4.6 SAR / 13.3 AED (check current rates).\n\n**Cards:** Contactless payment is accepted almost everywhere — Visa, Mastercard, Apple Pay, Google Pay. Many places are cashless.\n\n**ATMs:** Widely available. Use bank-branded ATMs to avoid fees. Avoid currency conversion at ATMs — choose to be charged in GBP.\n\n**VAT refunds:** Non-UK residents may be eligible for VAT refunds on purchases. Keep receipts and claim at the airport before departure.`,
        content_ar: `**العملة:** الجنيه الإسترليني (£). 1 جنيه ≈ 4.6 ريال سعودي / 13.3 درهم إماراتي.\n\n**البطاقات:** الدفع اللاتلامسي مقبول في كل مكان تقريباً.\n\n**الصراف الآلي:** متوفر على نطاق واسع. استخدم أجهزة البنوك لتجنب الرسوم.\n\n**استرداد الضريبة:** قد يكون غير المقيمين مؤهلين لاسترداد ضريبة القيمة المضافة.`,
      },
      {
        id: 'sub-connectivity',
        title_en: 'SIM Cards, Wi-Fi & Connectivity',
        title_ar: 'شرائح الاتصال والواي فاي',
        content_en: `**SIM cards:** Buy a UK SIM at the airport or any phone shop. Recommended providers: Three, EE, Vodafone. Prices start from £10 for 10GB data.\n\n**Free Wi-Fi:** Available at most cafés (Starbucks, Costa, Pret), museums, shopping centres, and on the Elizabeth Line.\n\n**Roaming:** Check with your home provider — many GCC carriers offer UK roaming packages.\n\n**Power adapters:** UK uses Type G (3-pin) plugs. Voltage is 230V. Buy an adapter before arrival or at any Boots/WHSmith.`,
        content_ar: `**شرائح الاتصال:** اشترِ شريحة بريطانية من المطار أو أي متجر هواتف. مقدمو خدمة موصى بهم: Three، EE، Vodafone.\n\n**واي فاي مجاني:** متوفر في معظم المقاهي والمتاحف ومراكز التسوق.\n\n**التجوال:** تحقق مع مزود خدمتك — العديد من شركات الخليج تقدم باقات تجوال.\n\n**محولات الكهرباء:** المملكة المتحدة تستخدم قابس Type G ثلاثي الأسنان.`,
      },
    ],
  },
  {
    id: 'sec-coupons-deals',
    slug: 'coupons-deals',
    name_en: 'Coupons & Deals',
    name_ar: 'كوبونات وعروض',
    description_en: 'Exclusive discounts, London Pass deals, outlet shopping, and money-saving tips.',
    description_ar: 'خصومات حصرية، عروض بطاقة لندن، التسوق من المنافذ، ونصائح لتوفير المال.',
    icon: 'ticket',
    featured_image: '/images/information/coupons-deals.jpg',
    sort_order: 10,
    published: true,
    subsections: [
      {
        id: 'sub-london-pass',
        title_en: 'London Pass & Attraction Bundles',
        title_ar: 'بطاقة لندن وحزم المعالم',
        content_en: `**London Pass:** Includes 80+ attractions for one price. Best value for 3+ day visits. Buy online for instant digital delivery.\n\n**Merlin Annual Pass:** Covers Madame Tussauds, SEA LIFE, London Eye, Shrek's Adventure. Great for families making multiple visits.\n\n**2-for-1 offers:** National Rail offers 2-for-1 entry to many London attractions when you travel by train. Download vouchers from daysoutguide.co.uk.\n\n> **Tip:** Compare individual ticket prices before buying a pass — it's only worth it if you plan to visit 3+ attractions.`,
        content_ar: `**بطاقة لندن:** تشمل 80+ معلم سياحي بسعر واحد. أفضل قيمة لزيارات 3 أيام فأكثر.\n\n**بطاقة ميرلين السنوية:** تغطي مدام توسو وعين لندن. رائعة للعائلات.\n\n**عروض 2 بسعر 1:** تقدم السكك الحديدية عروض دخول 2 بسعر 1 لمعالم عديدة.`,
      },
      {
        id: 'sub-shopping-deals',
        title_en: 'Outlet Shopping & Sales',
        title_ar: 'التسوق من المنافذ والتخفيضات',
        content_en: `**Bicester Village:** Designer outlet 1 hour from London by train (Marylebone to Bicester Village station). Up to 60% off luxury brands. Tax-free shopping for tourists.\n\n**London Designer Outlet (Wembley):** 50+ stores with year-round discounts.\n\n**Sales seasons:** January sales (Boxing Day–end of January), Summer sales (late June–July), Black Friday (November).\n\n**Department stores:** Harrods, Selfridges, and Liberty often have mid-season sales with significant reductions.`,
        content_ar: `**قرية بيستر:** منفذ مصممين على بعد ساعة من لندن بالقطار. خصومات تصل إلى 60% على العلامات الفاخرة.\n\n**منفذ لندن للمصممين (ويمبلي):** 50+ متجر بخصومات على مدار السنة.\n\n**مواسم التخفيضات:** تخفيضات يناير، تخفيضات الصيف، الجمعة السوداء.`,
      },
    ],
  },
  {
    id: 'sec-emergency-healthcare',
    slug: 'emergency-healthcare',
    name_en: 'Emergency & Healthcare',
    name_ar: 'الطوارئ والرعاية الصحية',
    description_en: 'NHS access, pharmacies, emergency numbers, travel insurance, and healthcare for visitors.',
    description_ar: 'الوصول إلى الخدمات الصحية، الصيدليات، أرقام الطوارئ، تأمين السفر، والرعاية الصحية للزوار.',
    icon: 'shield',
    featured_image: '/images/information/emergency-healthcare.jpg',
    sort_order: 11,
    published: true,
    subsections: [
      {
        id: 'sub-emergency-numbers',
        title_en: 'Emergency Numbers & Services',
        title_ar: 'أرقام الطوارئ والخدمات',
        content_en: `**Emergency (police, fire, ambulance):** 999 or 112\n\n**Non-emergency police:** 101\n\n**NHS non-emergency health advice:** 111 (free, 24/7, interpreters available)\n\n**Nearest hospital/A&E:** Search "A&E near me" on Google Maps. Major central London A&E departments: St Thomas' (Westminster), UCH (Euston), St Mary's (Paddington).\n\n**Embassy contacts:** Keep your embassy's London contact details saved on your phone.`,
        content_ar: `**الطوارئ (شرطة، إطفاء، إسعاف):** 999 أو 112\n\n**الشرطة غير الطارئة:** 101\n\n**استشارات صحية NHS:** 111 (مجاني، 24/7، مترجمون متوفرون)\n\n**أقرب مستشفى/طوارئ:** ابحث "A&E near me" على خرائط Google.`,
      },
      {
        id: 'sub-pharmacies-insurance',
        title_en: 'Pharmacies & Travel Insurance',
        title_ar: 'الصيدليات وتأمين السفر',
        content_en: `**Pharmacies:** Boots and Superdrug are everywhere. Some are open late. Pharmacists can advise on minor illnesses and sell basic medications without prescription.\n\n**Prescription medicines:** Bring a letter from your doctor for prescription medications (especially controlled substances).\n\n**Travel insurance:** Essential for all visitors. NHS A&E treatment is free for emergencies, but follow-up care and hospital stays are charged. Ensure your policy covers:\n- Medical treatment (£1M+ recommended)\n- Repatriation\n- Lost/stolen belongings\n- Trip cancellation`,
        content_ar: `**الصيدليات:** بوتس وسوبردراغ منتشرة في كل مكان. بعضها مفتوح متأخراً.\n\n**الأدوية الموصوفة:** أحضر رسالة من طبيبك للأدوية الموصوفة.\n\n**تأمين السفر:** ضروري لجميع الزوار. علاج طوارئ NHS مجاني، لكن المتابعة تُفرض عليها رسوم.`,
      },
    ],
  },
  {
    id: 'sec-e-document-shop',
    slug: 'e-document-shop',
    name_en: 'E-Document Shop',
    name_ar: 'متجر المستندات الإلكترونية',
    description_en: 'Downloadable travel planners, checklists, itinerary templates, and London pocket guides.',
    description_ar: 'مخططات سفر قابلة للتحميل، قوائم تحقق، قوالب برامج سياحية، وأدلة لندن الجيبية.',
    icon: 'file-text',
    featured_image: '/images/information/e-document-shop.jpg',
    sort_order: 12,
    published: true,
    subsections: [
      {
        id: 'sub-travel-planners',
        title_en: 'Travel Planners & Itineraries',
        title_ar: 'مخططات السفر والبرامج السياحية',
        content_en: `Download our professionally designed travel planners to make the most of your London trip:\n\n- **3-Day London Itinerary** — Perfect for first-time visitors covering all major landmarks\n- **7-Day Comprehensive London Plan** — In-depth exploration including day trips\n- **Family London Planner** — Tailored for families with children of all ages\n- **Luxury London Weekend** — Curated high-end experiences and fine dining\n- **Ramadan in London Guide** — Iftar spots, prayer times, and mosque locations\n\nAll planners are available in English and Arabic, and include maps, timings, and budget estimates.`,
        content_ar: `حمّل مخططات السفر المصممة باحترافية لتحقيق أقصى استفادة من رحلتك:\n\n- **برنامج لندن لـ 3 أيام** — مثالي للزوار لأول مرة\n- **خطة لندن الشاملة لـ 7 أيام** — استكشاف عميق يشمل رحلات يومية\n- **مخطط لندن العائلي** — مصمم للعائلات مع أطفال\n- **عطلة لندن الفاخرة** — تجارب راقية ومطاعم فاخرة\n- **دليل رمضان في لندن** — أماكن الإفطار وأوقات الصلاة`,
      },
      {
        id: 'sub-checklists',
        title_en: 'Downloadable Checklists & Guides',
        title_ar: 'قوائم تحقق وأدلة قابلة للتحميل',
        content_en: `**Free downloads:**\n- London Packing Checklist (PDF)\n- Essential London Phrases (EN/AR)\n- Tube Map with Arab-Friendly Annotations\n\n**Premium guides:**\n- Complete Halal Restaurant Directory (150+ restaurants)\n- London Shopping Tax Refund Guide\n- Neighbourhood Walking Tours (5 self-guided routes)\n\nVisit our [E-Document Shop](/shop) to browse all available downloads.`,
        content_ar: `**تحميلات مجانية:**\n- قائمة تعبئة لندن (PDF)\n- عبارات لندن الأساسية (EN/AR)\n- خريطة المترو مع تعليقات عربية\n\n**أدلة مميزة:**\n- دليل المطاعم الحلال الكامل (150+ مطعم)\n- دليل استرداد ضريبة التسوق\n\nقم بزيارة [متجر المستندات](/shop) لتصفح جميع التحميلات.`,
      },
    ],
  },
  {
    id: 'sec-luxury-experiences',
    slug: 'luxury-experiences',
    name_en: 'Luxury Experiences',
    name_ar: 'التجارب الفاخرة',
    description_en: 'Exclusive VIP experiences, private tours, luxury shopping, and high-end London living.',
    description_ar: 'تجارب VIP حصرية، جولات خاصة، تسوق فاخر، والحياة الراقية في لندن.',
    icon: 'crown',
    featured_image: '/images/information/luxury-experiences.jpg',
    sort_order: 13,
    published: true,
    subsections: [
      {
        id: 'sub-vip-tours',
        title_en: 'VIP Tours & Private Experiences',
        title_ar: 'جولات VIP وتجارب خاصة',
        content_en: `**Private city tours:** Arabic-speaking guides available for private tours of London's landmarks. Full-day tours from £500.\n\n**Helicopter tours:** See London from above — 30-minute flights from £200/person (The London Helicopter).\n\n**Private Thames cruise:** Charter a luxury boat for a private cruise on the Thames. Perfect for special occasions.\n\n**Exclusive access:** Book private after-hours tours at the Tower of London, British Museum, or Kensington Palace.`,
        content_ar: `**جولات خاصة:** مرشدون ناطقون بالعربية متاحون لجولات خاصة في معالم لندن.\n\n**جولات هليكوبتر:** شاهد لندن من الأعلى — رحلات 30 دقيقة.\n\n**رحلة خاصة على التايمز:** استأجر قارباً فاخراً لرحلة خاصة.\n\n**وصول حصري:** احجز جولات خاصة بعد ساعات العمل في برج لندن أو المتحف البريطاني.`,
      },
      {
        id: 'sub-luxury-shopping',
        title_en: 'Luxury Shopping & Hotels',
        title_ar: 'التسوق الفاخر والفنادق',
        content_en: `**Shopping:** Bond Street (Chanel, Louis Vuitton, Cartier), Harrods, Selfridges, Harvey Nichols. Many stores offer Arabic-speaking personal shoppers and tax-free shopping.\n\n**5-Star hotels popular with Arab visitors:**\n- The Dorchester (Park Lane) — Arabic-speaking staff, halal room service\n- The Savoy — Iconic Thames-side luxury\n- Claridge's — Art Deco elegance in Mayfair\n- The Ritz — Classic British luxury\n- Mandarin Oriental Hyde Park — Contemporary luxury with spa`,
        content_ar: `**التسوق:** شارع بوند (شانيل، لويس فيتون، كارتييه)، هارودز، سيلفريدجز. العديد من المتاجر تقدم متسوقين شخصيين ناطقين بالعربية.\n\n**فنادق 5 نجوم مفضلة لدى الزوار العرب:**\n- ذا دورتشستر — طاقم ناطق بالعربية، خدمة غرف حلال\n- ذا سافوي — فخامة أيقونية\n- كلاريدجز — أناقة آرت ديكو في مايفير\n- ذا ريتز — فخامة بريطانية كلاسيكية`,
      },
    ],
  },
];

// ===================== CATEGORIES =====================

export const informationCategories: InformationCategory[] = [
  { id: 'icat-planning', slug: 'planning', name_en: 'Planning & Travel', name_ar: 'التخطيط والسفر' },
  { id: 'icat-places', slug: 'places', name_en: 'Places & Landmarks', name_ar: 'الأماكن والمعالم' },
  { id: 'icat-transport', slug: 'transport', name_en: 'Transportation', name_ar: 'المواصلات' },
  { id: 'icat-food', slug: 'food', name_en: 'Food & Dining', name_ar: 'الطعام والمطاعم' },
  { id: 'icat-family', slug: 'family', name_en: 'Family Travel', name_ar: 'سفر عائلي' },
  { id: 'icat-practical', slug: 'practical', name_en: 'Practical Tips', name_ar: 'نصائح عملية' },
  { id: 'icat-culture', slug: 'culture', name_en: 'Culture & Etiquette', name_ar: 'ثقافة وآداب' },
  { id: 'icat-luxury', slug: 'luxury', name_en: 'Luxury', name_ar: 'الفخامة' },
];

// ===================== ARTICLES 1-10 =====================

export const informationArticles: InformationArticle[] = [
  {
    id: 'iart-001',
    slug: 'complete-london-guide-arab-visitors',
    section_id: 'sec-plan-your-trip',
    category_id: 'icat-planning',
    title_en: 'The Complete London Guide for Arab Visitors (2025)',
    title_ar: 'الدليل الشامل للندن للزوار العرب (2025)',
    excerpt_en: 'Everything you need to know before your London trip — visas, flights, best areas, halal dining, and cultural tips.',
    excerpt_ar: 'كل ما تحتاج معرفته قبل رحلتك إلى لندن — التأشيرات والرحلات وأفضل المناطق والمطاعم الحلال والنصائح الثقافية.',
    content_en: `# The Complete London Guide for Arab Visitors

London welcomes millions of Arab visitors every year, and for good reason. From world-class shopping at Harrods and Selfridges to the vibrant halal dining scene on Edgware Road, London offers a uniquely welcoming experience for Arab travellers.

## Before You Travel

**Visa requirements:** GCC nationals can enter visa-free for up to 6 months with the new ETA system. Other Arab nationalities need a Standard Visitor Visa — apply at least 3 weeks in advance.

**Best time to visit:** Summer (June–August) offers the best weather but highest prices. Spring and autumn provide a great balance of mild weather and fewer crowds.

**Flights:** Direct flights from Dubai (7h), Riyadh (7h), Cairo (5h), and most Arab capitals. Heathrow is the main airport, well-connected by the Elizabeth Line and Heathrow Express.

## Where to Stay

- **Mayfair & Park Lane:** Ultra-luxury. The Dorchester, Claridge's — Arabic-speaking staff, halal room service.
- **Knightsbridge & Kensington:** Near Harrods and museums. Many Arabic services available.
- **Edgware Road & Marble Arch:** Budget-friendly with excellent halal food and Arabic atmosphere.
- **Westminster:** Central location near Big Ben, London Eye, and government landmarks.

## Getting Around

Use contactless payment or an Oyster card for the Tube, buses, and trains. The daily cap ensures you never overpay. Download the TfL Go app for live journey planning.

## Halal Dining

London is Europe's best city for halal food. Key areas: Edgware Road (Lebanese/Egyptian), Brick Lane (Bangladeshi), Shepherd's Bush (Somali/Middle Eastern). Use the HalalTrip or Zabihah apps.

## Essential Tips

- Carry layers — London weather changes rapidly
- Tap in AND out on the Tube
- Tipping: 10-15% at restaurants
- Queue properly — it's sacred in Britain
- Download Google Maps offline for navigation

> **Pro Tip:** Get our [downloadable London planner](/shop) for a day-by-day itinerary tailored to Arab visitors.`,
    content_ar: `# الدليل الشامل للندن للزوار العرب

تستقبل لندن ملايين الزوار العرب كل عام، ولسبب وجيه. من التسوق الراقي في هارودز وسيلفريدجز إلى مشهد المطاعم الحلال النابض بالحياة في إدجوير رود، توفر لندن تجربة ترحيبية فريدة للمسافرين العرب.

## قبل السفر

**متطلبات التأشيرة:** يمكن لمواطني دول الخليج الدخول بدون تأشيرة لمدة 6 أشهر مع نظام ETA الجديد.

**أفضل وقت للزيارة:** الصيف يوفر أفضل طقس لكن بأعلى الأسعار. الربيع والخريف يوفران توازناً جيداً.

## أين تقيم

- **مايفير وبارك لين:** فخامة فائقة مع طاقم ناطق بالعربية
- **نايتسبريدج وكنسينغتون:** بالقرب من هارودز والمتاحف
- **إدجوير رود:** أجواء عربية وطعام حلال ممتاز

## التنقل

استخدم الدفع اللاتلامسي أو بطاقة أويستر للمترو والحافلات.

## نصائح أساسية

- احمل ملابس متعددة الطبقات
- البقشيش: 10-15% في المطاعم
- احترم الطوابير — إنها مقدسة في بريطانيا`,
    featured_image: '/images/information/london-guide-arab-visitors.jpg',
    reading_time: 15,
    published: true,
    created_at: new Date('2025-01-15'),
    updated_at: new Date('2025-01-20'),
    meta_title_en: 'Complete London Guide for Arab Visitors 2025 | Yalla London',
    meta_title_ar: 'الدليل الشامل للندن للزوار العرب 2025 | يلا لندن',
    meta_description_en: 'Plan your perfect London trip with our comprehensive guide for Arab visitors — visas, halal dining, best areas to stay, transport tips, and cultural advice.',
    meta_description_ar: 'خطط لرحلتك المثالية إلى لندن مع دليلنا الشامل للزوار العرب — التأشيرات والمطاعم الحلال وأفضل مناطق الإقامة.',
    tags: ['london-guide', 'arab-visitors', 'travel-planning', 'halal', 'visa'],
    keywords: ['london guide arab visitors', 'london travel guide 2025', 'arab london tourism', 'halal london', 'london visa gcc'],
    page_type: 'article',
    seo_score: 95,
    faq_questions: [
      { question_en: 'Do Arab visitors need a visa for London?', question_ar: 'هل يحتاج الزوار العرب تأشيرة للندن؟', answer_en: 'GCC nationals can enter visa-free for up to 6 months with an ETA. Other Arab nationalities typically need a Standard Visitor Visa.', answer_ar: 'يمكن لمواطني دول الخليج الدخول بدون تأشيرة لمدة 6 أشهر مع ETA. الجنسيات العربية الأخرى تحتاج عادةً تأشيرة زائر.' },
      { question_en: 'What is the best area in London for Arab visitors?', question_ar: 'ما أفضل منطقة في لندن للزوار العرب؟', answer_en: 'Edgware Road and Knightsbridge are the most popular areas, with Arabic restaurants, shops, and services readily available.', answer_ar: 'إدجوير رود ونايتسبريدج هما الأكثر شعبية، مع مطاعم ومتاجر وخدمات عربية متوفرة بسهولة.' },
      { question_en: 'Is halal food easy to find in London?', question_ar: 'هل من السهل العثور على طعام حلال في لندن؟', answer_en: 'Yes, London has hundreds of halal restaurants. Edgware Road, Brick Lane, and Shepherd\'s Bush are top areas for halal dining.', answer_ar: 'نعم، لندن لديها مئات المطاعم الحلال. إدجوير رود وبريك لين وشيبردز بوش هي أفضل المناطق.' },
    ],
  },
  {
    id: 'iart-002',
    slug: 'best-halal-restaurants-london',
    section_id: 'sec-food-restaurants',
    category_id: 'icat-food',
    title_en: 'Best Halal Restaurants in London: A Complete Guide',
    title_ar: 'أفضل المطاعم الحلال في لندن: دليل شامل',
    excerpt_en: 'Discover the finest halal restaurants in London — from Michelin-starred dining to neighbourhood gems trusted by the Arab community.',
    excerpt_ar: 'اكتشف أرقى المطاعم الحلال في لندن — من المطاعم الحائزة على نجوم ميشلان إلى الجواهر المحلية.',
    content_en: `# Best Halal Restaurants in London

London's halal dining scene is one of the most diverse in the world, offering everything from traditional Middle Eastern cuisine to modern British fine dining.

## Top Halal Restaurants by Area

### Edgware Road & Marble Arch
- **Maroush:** Iconic Lebanese chain with multiple locations. Famous for shawarma and mixed grills.
- **Al Arez:** Authentic Lebanese restaurant popular with Arab families.
- **Ranoush Juice Bar:** Fresh juices, mezze, and late-night shawarma — open until 3am.

### Knightsbridge & Mayfair
- **Novikov:** Upscale Asian and Italian restaurants. Halal options available.
- **Zuma:** Japanese fine dining with halal meat options (confirm when booking).
- **The Dorchester Grill:** Five-star halal dining with Arabic-speaking staff.

### Brick Lane & East London
- **Tayyabs:** Famous Punjabi restaurant — queue for their legendary lamb chops.
- **Lahore Kebab House:** No-frills, incredible Pakistani food at great prices.
- **Gunpowder:** Modern Indian with selected halal dishes.

## Street Food Markets with Halal Options
- Borough Market (Wed-Sat)
- Camden Market (daily)
- Brick Lane Sunday Market

## Tips for Halal Dining
- Use **HalalTrip** and **Zabihah** apps to verify certification
- Look for **HMC** (Halal Monitoring Committee) or **HFA** certificates
- Call ahead for upscale restaurants to confirm halal options
- Many chain restaurants (Nando's, GBK) offer halal at selected locations

> **Insider Tip:** Download our [Halal Restaurant Map](/shop) with 150+ verified halal restaurants across London.`,
    content_ar: `# أفضل المطاعم الحلال في لندن

مشهد المطاعم الحلال في لندن من أكثر المشاهد تنوعاً في العالم، يقدم كل شيء من المأكولات الشرق أوسطية التقليدية إلى المطاعم البريطانية الفاخرة.

## أفضل المطاعم حسب المنطقة

### إدجوير رود وماربل آرتش
- **ماروش:** سلسلة لبنانية شهيرة. مشهورة بالشاورما والمشاوي.
- **الأرز:** مطعم لبناني أصيل محبوب من العائلات العربية.

### نايتسبريدج ومايفير
- **نوفيكوف:** مطاعم آسيوية وإيطالية راقية مع خيارات حلال.
- **زوما:** مطعم ياباني فاخر مع خيارات لحوم حلال.

### بريك لين وشرق لندن
- **طيبات:** مطعم بنجابي شهير — انتظر في الطابور لريش اللحم الأسطورية.
- **لاهور كباب هاوس:** طعام باكستاني رائع بأسعار ممتازة.

## نصائح
- استخدم تطبيقات **HalalTrip** و **Zabihah** للتحقق
- ابحث عن شهادات **HMC** أو **HFA**
- اتصل مسبقاً بالمطاعم الراقية للتأكد`,
    featured_image: '/images/information/halal-restaurants-london.jpg',
    reading_time: 12,
    published: true,
    created_at: new Date('2025-01-12'),
    updated_at: new Date('2025-01-18'),
    meta_title_en: 'Best Halal Restaurants in London 2025 | Complete Guide | Yalla London',
    meta_title_ar: 'أفضل المطاعم الحلال في لندن 2025 | دليل شامل | يلا لندن',
    meta_description_en: 'Discover 50+ best halal restaurants in London — from Edgware Road Lebanese to Brick Lane curry houses and Mayfair fine dining.',
    meta_description_ar: 'اكتشف أفضل 50+ مطعم حلال في لندن — من المطاعم اللبنانية في إدجوير رود إلى مطاعم الكاري في بريك لين.',
    tags: ['halal-restaurants', 'london-food', 'halal-dining', 'edgware-road', 'arab-food'],
    keywords: ['halal restaurants london', 'best halal food london', 'halal dining london 2025', 'edgware road restaurants'],
    page_type: 'article',
    seo_score: 93,
    faq_questions: [
      { question_en: 'Where is the best halal food in London?', question_ar: 'أين أفضل طعام حلال في لندن؟', answer_en: 'Edgware Road for Lebanese/Middle Eastern, Brick Lane for South Asian, and Shepherd\'s Bush for diverse halal options.', answer_ar: 'إدجوير رود للبناني/شرق أوسطي، بريك لين للجنوب آسيوي، وشيبردز بوش لخيارات حلال متنوعة.' },
      { question_en: 'Are there halal fine dining options in London?', question_ar: 'هل توجد مطاعم حلال فاخرة في لندن؟', answer_en: 'Yes, restaurants like Novikov, The Dorchester Grill, and Zuma offer halal fine dining experiences.', answer_ar: 'نعم، مطاعم مثل نوفيكوف وذا دورتشستر غريل وزوما تقدم تجارب طعام حلال فاخرة.' },
    ],
  },
  {
    id: 'iart-003',
    slug: 'london-with-kids-family-guide',
    section_id: 'sec-family-kids',
    category_id: 'icat-family',
    title_en: 'London with Kids: The Ultimate Family Guide',
    title_ar: 'لندن مع الأطفال: الدليل العائلي الشامل',
    excerpt_en: 'Top family-friendly attractions, activities for all ages, pushchair-friendly routes, and tips for making London magical for your little ones.',
    excerpt_ar: 'أفضل الأماكن المناسبة للعائلات، أنشطة لجميع الأعمار، ومسارات مناسبة لعربات الأطفال.',
    content_en: `# London with Kids: The Ultimate Family Guide

London is one of the world's best cities for families. With free museums, magnificent parks, and world-famous attractions, there's something to delight children of every age.

## Top Attractions for Kids

### Free Museums (Yes, Really Free!)
- **Natural History Museum:** Dinosaur gallery, wildlife garden, earthquake simulator
- **Science Museum:** Interactive galleries, IMAX cinema, Wonderlab (paid)
- **V&A Museum of Childhood (Young V&A):** Bethnal Green, designed specifically for children

### Paid Attractions Worth Every Penny
- **Warner Bros. Studio Tour:** Harry Potter magic. Book weeks in advance (£53 adults, £43 children)
- **London Zoo:** 750+ species in Regent's Park
- **SEA LIFE London Aquarium:** Sharks, penguins, and touch pools on the South Bank
- **KidZania Westfield:** Role-play city where kids can be pilots, firefighters, or chefs
- **London Eye:** 30-minute ride with views across the city

## Best Parks for Families
- **Hyde Park & Kensington Gardens:** Diana Memorial Playground, Peter Pan statue, Serpentine boating
- **Regent's Park:** Playground, boating lake, and London Zoo
- **St James's Park:** Feed the pelicans (daily at 2:30pm)

## Practical Tips
- **Under-11s ride free** on buses and Tube with an adult Oyster holder
- **Pushchair-friendly routes:** Use buses instead of the Tube for easier access
- **Baby changing:** Available at all major museums, department stores (Harrods has a full nursery)
- **Rainy day options:** Hamleys toy store, Kidzania, indoor soft play centres

> **Family Tip:** Check our [E-Document Shop](/shop) for printable family itineraries and activity checklists.`,
    content_ar: `# لندن مع الأطفال: الدليل العائلي الشامل

لندن واحدة من أفضل المدن في العالم للعائلات. مع متاحف مجانية وحدائق رائعة ومعالم شهيرة عالمياً.

## أفضل المعالم للأطفال

### متاحف مجانية
- **متحف التاريخ الطبيعي:** معرض الديناصورات ومحاكي الزلازل
- **متحف العلوم:** معارض تفاعلية وسينما IMAX
- **متحف V&A للطفولة:** مصمم خصيصاً للأطفال

### معالم مدفوعة تستحق كل قرش
- **جولة وارنر بروس:** سحر هاري بوتر. احجز مسبقاً
- **حديقة حيوان لندن:** 750+ نوع
- **كيدزانيا:** مدينة لعب أدوار للأطفال

## أفضل الحدائق للعائلات
- **هايد بارك:** ملعب الأميرة ديانا التذكاري
- **ريجنت بارك:** ملعب وبحيرة قوارب وحديقة الحيوان

## نصائح عملية
- **الأطفال دون 11 عاماً يسافرون مجاناً** في الحافلات والمترو
- **مسارات عربات الأطفال:** استخدم الحافلات بدلاً من المترو`,
    featured_image: '/images/information/london-family-kids.jpg',
    reading_time: 10,
    published: true,
    created_at: new Date('2025-01-10'),
    updated_at: new Date('2025-01-15'),
    meta_title_en: 'London with Kids: Ultimate Family Guide 2025 | Yalla London',
    meta_title_ar: 'لندن مع الأطفال: الدليل العائلي الشامل 2025 | يلا لندن',
    meta_description_en: 'Plan a perfect family trip to London — free museums, kid-friendly attractions, pushchair routes, and tips for travelling with children.',
    meta_description_ar: 'خطط لرحلة عائلية مثالية إلى لندن — متاحف مجانية ومعالم مناسبة للأطفال ونصائح السفر مع الأطفال.',
    tags: ['family-travel', 'kids-london', 'family-attractions', 'free-museums'],
    keywords: ['london with kids', 'family guide london', 'london attractions children', 'free museums london kids'],
    page_type: 'article',
    seo_score: 92,
    faq_questions: [
      { question_en: 'Are London museums free for children?', question_ar: 'هل المتاحف في لندن مجانية للأطفال؟', answer_en: 'Yes! Major museums like Natural History Museum, Science Museum, and British Museum are free for everyone.', answer_ar: 'نعم! المتاحف الكبرى مثل متحف التاريخ الطبيعي ومتحف العلوم والمتحف البريطاني مجانية للجميع.' },
      { question_en: 'Do kids ride free on London transport?', question_ar: 'هل يسافر الأطفال مجاناً في مواصلات لندن؟', answer_en: 'Children under 11 travel free on buses and the Tube when accompanied by an adult with an Oyster card or contactless payment.', answer_ar: 'الأطفال دون 11 عاماً يسافرون مجاناً في الحافلات والمترو عند مرافقة شخص بالغ ببطاقة أويستر.' },
    ],
  },
  {
    id: 'iart-004',
    slug: 'london-underground-guide-tourists',
    section_id: 'sec-transportation',
    category_id: 'icat-transport',
    title_en: 'Mastering the London Underground: A Tourist\'s Guide',
    title_ar: 'إتقان مترو لندن: دليل السائح',
    excerpt_en: 'Navigate the Tube with confidence — Oyster cards vs contactless, peak hours to avoid, step-free stations, and insider tips.',
    excerpt_ar: 'تنقل في المترو بثقة — بطاقة أويستر مقابل الدفع اللاتلامسي وساعات الذروة ونصائح المحليين.',
    content_en: `# Mastering the London Underground

The London Underground (the "Tube") is the fastest and most efficient way to navigate the city. With 11 lines and 272 stations, it can seem overwhelming — but these tips will have you riding like a local.

## Payment Options

**Contactless bank card (recommended):** Simply tap your Visa, Mastercard, or phone (Apple Pay/Google Pay) at the yellow reader. Daily and weekly caps apply automatically — you'll never pay more than a daily Travelcard.

**Oyster card:** Reloadable smart card available at stations (£7 deposit). Same fares and caps as contactless. Good if you don't have a contactless card.

**Paper tickets:** Avoid these — they cost nearly double the Oyster/contactless fare.

## Key Tips for Tourists

### Zones
London is divided into zones 1-9. Most tourist attractions are in Zones 1-2. The fare depends on which zones you travel through.

### Peak vs Off-Peak
- **Peak:** Mon-Fri 6:30-9:30am, 4-7pm (higher fares)
- **Off-Peak:** All other times, weekends, bank holidays (lower fares)

### Etiquette
- **Stand on the right** on escalators — walk on the left
- **Let passengers off** before boarding
- **Move down inside the carriage** — don't block the doors
- **Give up priority seats** for elderly, pregnant, or disabled passengers

## Useful Lines for Tourists
- **Piccadilly Line:** Heathrow → Piccadilly Circus → Covent Garden
- **Circle/District:** Paddington → South Kensington → Westminster
- **Central Line:** Oxford Circus → Bond Street → Notting Hill Gate
- **Jubilee Line:** Baker Street → Westminster → London Bridge

## Step-Free Stations
Limited but growing. Key step-free stations: King's Cross, Westminster, Stratford, Green Park, London Bridge.

> **Transport Tip:** Download the free **TfL Go** app for real-time journey planning and service updates.`,
    content_ar: `# إتقان مترو لندن

مترو لندن (التيوب) هو أسرع وأكفأ وسيلة للتنقل في المدينة. مع 11 خطاً و272 محطة.

## خيارات الدفع

**بطاقة بنكية لاتلامسية (موصى بها):** انقر بطاقتك أو هاتفك على القارئ الأصفر. الحدود اليومية والأسبوعية تُطبق تلقائياً.

**بطاقة أويستر:** بطاقة ذكية قابلة لإعادة الشحن (وديعة 7 جنيهات).

**تذاكر ورقية:** تجنبها — تكلفتها تقريباً ضعف السعر.

## نصائح أساسية

### المناطق
لندن مقسمة إلى مناطق 1-9. معظم المعالم السياحية في المنطقتين 1-2.

### آداب المترو
- **قف على اليمين** على السلالم المتحركة
- **دع الركاب ينزلون** قبل الصعود
- **تحرك داخل العربة** — لا تسد الأبواب

## خطوط مفيدة للسياح
- **خط بيكاديلي:** هيثرو ← ساحة بيكاديلي ← كوفنت غاردن
- **خط الدائرة/الحي:** بادينغتون ← ساوث كنسينغتون ← وستمنستر`,
    featured_image: '/images/information/london-underground-guide.jpg',
    reading_time: 8,
    published: true,
    created_at: new Date('2025-01-08'),
    updated_at: new Date('2025-01-12'),
    meta_title_en: 'London Underground Guide for Tourists 2025 | Tube Tips | Yalla London',
    meta_title_ar: 'دليل مترو لندن للسياح 2025 | يلا لندن',
    meta_description_en: 'Master the London Underground — Oyster vs contactless, zone maps, peak hours, step-free access, and essential Tube etiquette for visitors.',
    meta_description_ar: 'أتقن مترو لندن — أويستر مقابل اللاتلامسي، خرائط المناطق، ساعات الذروة، ونصائح أساسية للزوار.',
    tags: ['london-tube', 'underground', 'transport', 'oyster-card', 'travel-tips'],
    keywords: ['london underground guide', 'tube tips tourists', 'oyster card london', 'london transport guide'],
    page_type: 'article',
    seo_score: 91,
    faq_questions: [
      { question_en: 'Should I get an Oyster card or use contactless?', question_ar: 'هل أحصل على أويستر أم أستخدم اللاتلامسي؟', answer_en: 'Contactless is recommended if your bank card supports it — same fares, no deposit needed. Oyster is good as a backup.', answer_ar: 'اللاتلامسي موصى به إذا كانت بطاقتك البنكية تدعمه — نفس الأسعار بدون وديعة.' },
      { question_en: 'How much does the Tube cost per day?', question_ar: 'كم تكلفة المترو في اليوم؟', answer_en: 'With contactless or Oyster, the daily cap for Zones 1-2 is about £8.10. You\'ll never pay more than this in a day.', answer_ar: 'مع اللاتلامسي أو أويستر، الحد اليومي للمنطقتين 1-2 حوالي 8.10 جنيه.' },
    ],
  },
  {
    id: 'iart-005',
    slug: 'luxury-shopping-london-guide',
    section_id: 'sec-luxury-experiences',
    category_id: 'icat-luxury',
    title_en: 'Luxury Shopping in London: Harrods, Selfridges & Beyond',
    title_ar: 'التسوق الفاخر في لندن: هارودز، سيلفريدجز وأكثر',
    excerpt_en: 'Your guide to London\'s most prestigious shopping — Bond Street, Harrods, Bicester Village, and VAT refund tips.',
    excerpt_ar: 'دليلك لأرقى وجهات التسوق في لندن — شارع بوند وهارودز وقرية بيستر ونصائح استرداد الضريبة.',
    content_en: `# Luxury Shopping in London

London is a world capital of luxury shopping, and for Arab visitors it offers a uniquely welcoming experience with Arabic-speaking staff, tax-free shopping, and an incredible range of designer brands.

## Top Shopping Destinations

### Harrods (Knightsbridge)
The world's most famous department store. 7 floors of luxury across 330 departments. Don't miss the Egyptian Escalator and the Food Halls. Many Arabic-speaking staff available.

### Selfridges (Oxford Street)
Iconic department store with cutting-edge fashion. The Wonder Room showcases fine jewellery and watches. Personal shopping service available in Arabic.

### Bond Street (Mayfair)
London's premier luxury shopping street. Cartier, Tiffany, Chanel, Louis Vuitton, Burberry, and more. Both Old Bond Street and New Bond Street.

### Harvey Nichols (Knightsbridge)
Fashion-forward department store across from Harrods. Excellent beauty department and rooftop restaurant.

## Outlet Shopping

### Bicester Village
One hour from London by train (Marylebone station). 160+ boutiques with 30-60% off: Gucci, Prada, Burberry, Valentino. Free tax-free shopping service. Arabic-speaking assistants available.

### London Designer Outlet (Wembley)
50+ stores including Nike, Adidas, Gap, and Levi's. Easy to reach by Tube.

## VAT Tax Refund

Non-UK visitors can claim back the 20% VAT on purchases:
1. Ask for a VAT refund form at the store
2. Get it stamped at customs before checking in luggage at the airport
3. Claim your refund at the VAT refund desk after security

> **Shopping Tip:** Many luxury stores offer private shopping appointments — book in advance for a VIP experience with Arabic-speaking personal shoppers.`,
    content_ar: `# التسوق الفاخر في لندن

لندن عاصمة عالمية للتسوق الفاخر، وللزوار العرب توفر تجربة ترحيبية فريدة مع طاقم ناطق بالعربية وتسوق معفى من الضرائب.

## أفضل وجهات التسوق

### هارودز (نايتسبريدج)
أشهر متجر في العالم. 7 طوابق من الفخامة. لا تفوت السلم المتحرك المصري وقاعات الطعام.

### سيلفريدجز (شارع أوكسفورد)
متجر أيقوني مع أحدث الأزياء. خدمة تسوق شخصية متاحة بالعربية.

### شارع بوند (مايفير)
شارع التسوق الفاخر الأول في لندن. كارتييه، شانيل، لويس فيتون، بربري والمزيد.

## التسوق من المنافذ

### قرية بيستر
ساعة من لندن بالقطار. 160+ بوتيك بخصومات 30-60%. مساعدون ناطقون بالعربية.

## استرداد ضريبة القيمة المضافة

يمكن للزوار استرداد 20% VAT:
1. اطلب نموذج استرداد في المتجر
2. اختمه في الجمارك بالمطار
3. استلم المبلغ من مكتب الاسترداد`,
    featured_image: '/images/information/luxury-shopping-london.jpg',
    reading_time: 11,
    published: true,
    created_at: new Date('2025-01-05'),
    updated_at: new Date('2025-01-10'),
    meta_title_en: 'Luxury Shopping London: Harrods, Bond Street & VAT Refunds | Yalla London',
    meta_title_ar: 'التسوق الفاخر في لندن: هارودز وشارع بوند | يلا لندن',
    meta_description_en: 'Complete guide to luxury shopping in London — Harrods, Selfridges, Bond Street, Bicester Village, and how to claim VAT tax refunds.',
    meta_description_ar: 'دليل شامل للتسوق الفاخر في لندن — هارودز وسيلفريدجز وشارع بوند وقرية بيستر واسترداد الضريبة.',
    tags: ['luxury-shopping', 'harrods', 'bond-street', 'vat-refund', 'designer-shopping'],
    keywords: ['luxury shopping london', 'harrods london', 'bond street shopping', 'bicester village', 'vat refund london'],
    page_type: 'article',
    seo_score: 94,
    faq_questions: [
      { question_en: 'Can I get a tax refund on shopping in London?', question_ar: 'هل يمكنني استرداد الضريبة على التسوق في لندن؟', answer_en: 'Yes, non-UK residents can claim back the 20% VAT. Ask for a form in-store and get it stamped at the airport.', answer_ar: 'نعم، يمكن لغير المقيمين استرداد 20% ضريبة القيمة المضافة.' },
      { question_en: 'Does Harrods have Arabic-speaking staff?', question_ar: 'هل يوجد في هارودز طاقم ناطق بالعربية؟', answer_en: 'Yes, Harrods has Arabic-speaking staff and personal shoppers available, especially in luxury departments.', answer_ar: 'نعم، هارودز لديه طاقم ومتسوقون شخصيون ناطقون بالعربية.' },
    ],
  },
  {
    id: 'iart-006',
    slug: 'british-etiquette-arab-travellers',
    section_id: 'sec-dos-and-donts',
    category_id: 'icat-culture',
    title_en: 'British Etiquette: What Every Arab Traveller Should Know',
    title_ar: 'آداب السلوك البريطانية: ما يجب أن يعرفه كل مسافر عربي',
    excerpt_en: 'Understand British customs, tipping culture, queuing etiquette, and social norms for a smooth London experience.',
    excerpt_ar: 'افهم العادات البريطانية وثقافة البقشيش وآداب الطوابير والأعراف الاجتماعية.',
    content_en: `# British Etiquette: What Every Arab Traveller Should Know

Understanding British culture and customs will make your London trip smoother and more enjoyable. Here's what you need to know.

## The Art of Queuing

The British take queuing (standing in line) very seriously. Always join the back of the queue and wait patiently. Cutting in line is considered extremely rude. You'll encounter queues at bus stops, shops, attractions, and restaurants.

## Greetings & Social Interaction

- A simple "Hello" or "Good morning/afternoon" is standard
- Handshakes are common for first meetings
- British people value personal space — maintain a comfortable distance
- Small talk about weather is very common and expected
- "Please," "thank you," and "sorry" are used constantly

## Tipping Guide

- **Restaurants:** 10-15% if service charge isn't included (check the bill)
- **Taxis/Uber:** Round up to the nearest pound
- **Hotels:** £1-2 per bag for porters, £2-5/day for housekeeping
- **Pubs/Bars:** Not expected when ordering at the bar
- **Hairdressers/Spas:** 10-15%

## Cultural Dos & Don'ts

### Do:
- Queue patiently everywhere
- Say please and thank you
- Stand on the right on escalators
- Let people off the train before boarding
- Respect personal space
- Be punctual for appointments

### Don't:
- Talk loudly on public transport
- Push in queues
- Block escalators or doorways
- Eat on the Tube (it's frowned upon)
- Snap fingers to call a waiter
- Assume all food is halal

## Understanding British Humour

The British are known for dry, sarcastic humour and understatement. If someone says "not bad" about something, they probably mean it's quite good. Self-deprecating humour is very common.

> **Cultural Tip:** When a British person says "I'm fine, thanks" they may still want help — it's just polite deflection. Context matters!`,
    content_ar: `# آداب السلوك البريطانية: ما يجب أن يعرفه كل مسافر عربي

فهم الثقافة والعادات البريطانية سيجعل رحلتك إلى لندن أكثر سلاسة ومتعة.

## فن الطوابير

البريطانيون يأخذون الطوابير بجدية كبيرة. انضم دائماً لنهاية الطابور وانتظر بصبر. القفز في الطابور يعتبر وقاحة شديدة.

## التحيات والتفاعل الاجتماعي

- "مرحباً" أو "صباح الخير" هي المعيار
- المصافحة شائعة عند اللقاء الأول
- البريطانيون يقدرون المساحة الشخصية
- "من فضلك" و"شكراً" و"آسف" تُستخدم باستمرار

## دليل البقشيش

- **المطاعم:** 10-15% إذا لم تكن رسوم الخدمة مشمولة
- **التاكسي:** قرّب للجنيه الأقرب
- **الفنادق:** 1-2 جنيه لكل حقيبة
- **الحانات:** غير متوقع عند الطلب من البار

## افعل ولا تفعل

### افعل:
- انتظر في الطابور بصبر
- قل من فضلك وشكراً
- قف على اليمين على السلالم المتحركة

### لا تفعل:
- لا تتحدث بصوت عالٍ في المواصلات
- لا تقفز في الطوابير
- لا تأكل في المترو`,
    featured_image: '/images/information/british-etiquette-guide.jpg',
    reading_time: 7,
    published: true,
    created_at: new Date('2025-01-03'),
    updated_at: new Date('2025-01-08'),
    meta_title_en: 'British Etiquette Guide for Arab Travellers | Yalla London',
    meta_title_ar: 'دليل آداب السلوك البريطانية للمسافرين العرب | يلا لندن',
    meta_description_en: 'Essential guide to British etiquette for Arab visitors — queuing, tipping, greetings, and cultural dos and don\'ts in London.',
    meta_description_ar: 'دليل أساسي لآداب السلوك البريطانية للزوار العرب — الطوابير والبقشيش والتحيات وما يجب فعله وتجنبه.',
    tags: ['british-culture', 'etiquette', 'tipping', 'cultural-guide', 'dos-donts'],
    keywords: ['british etiquette arab travellers', 'tipping london', 'london cultural guide', 'queuing etiquette uk'],
    page_type: 'article',
    seo_score: 90,
    faq_questions: [
      { question_en: 'How much should I tip in London restaurants?', question_ar: 'كم يجب أن أترك بقشيشاً في مطاعم لندن؟', answer_en: '10-15% is standard, but check if a service charge is already included in the bill first.', answer_ar: '10-15% هو المعيار، لكن تحقق أولاً إذا كانت رسوم الخدمة مشمولة في الفاتورة.' },
      { question_en: 'Is queuing really important in Britain?', question_ar: 'هل الطوابير مهمة حقاً في بريطانيا؟', answer_en: 'Absolutely. Queue-jumping is considered very rude. Always join the back and wait your turn.', answer_ar: 'بالتأكيد. القفز في الطابور يعتبر وقاحة شديدة. انضم دائماً لنهاية الطابور وانتظر دورك.' },
    ],
  },
  {
    id: 'iart-007',
    slug: 'free-things-to-do-london',
    section_id: 'sec-hidden-gems',
    category_id: 'icat-practical',
    title_en: '25 Free Things to Do in London That Tourists Often Miss',
    title_ar: '25 شيئاً مجانياً يمكنك فعله في لندن يفوتها السياح عادةً',
    excerpt_en: 'From world-class museums to stunning parks and secret viewpoints — discover the best free experiences London offers.',
    excerpt_ar: 'من المتاحف العالمية إلى الحدائق الخلابة ونقاط المشاهدة السرية — اكتشف أفضل التجارب المجانية.',
    content_en: `# 25 Free Things to Do in London

London can be expensive, but many of its best experiences are completely free. Here are 25 amazing free things to do.

## Free Museums & Galleries
1. **British Museum** — World's most comprehensive collection of human history
2. **Natural History Museum** — Dinosaurs, blue whale skeleton, wildlife galleries
3. **National Gallery** — Van Gogh, Monet, da Vinci masterpieces in Trafalgar Square
4. **Tate Modern** — Contemporary art in a stunning converted power station
5. **V&A Museum** — Art, design, and fashion spanning 5,000 years
6. **Science Museum** — Interactive exhibits, space gallery, flight simulator
7. **Imperial War Museum** — Moving exhibits about war and conflict

## Free Parks & Gardens
8. **Hyde Park** — 350 acres, Serpentine Lake, Diana Memorial Fountain
9. **Regent's Park** — Rose garden, boating lake, open-air theatre (summer)
10. **Kensington Gardens** — Italian Gardens, Peter Pan statue, Diana Playground
11. **St James's Park** — Best views of Buckingham Palace, pelican feeding at 2:30pm
12. **Greenwich Park** — Prime Meridian views, Royal Observatory grounds

## Free Landmarks & Experiences
13. **Changing of the Guard** — Buckingham Palace, 11am most days
14. **Sky Garden** — Free rooftop garden with 360° views (book online)
15. **Southbank walk** — Westminster to Tower Bridge along the Thames
16. **Borough Market browsing** — Free to explore London's best food market
17. **Speakers' Corner** — Sunday morning debates in Hyde Park
18. **Street art in Shoreditch** — Self-guided walking tour of stunning murals

## Hidden Free Gems
19. **Neal's Yard** — Colourful courtyard in Covent Garden
20. **Little Venice** — Canal boats and cafés near Paddington
21. **Kyoto Garden** — Secret Japanese garden in Holland Park
22. **Hampstead Heath viewpoint** — Panoramic London skyline from Parliament Hill
23. **Leadenhall Market** — Stunning Victorian market (Harry Potter filming location)
24. **Sir John Soane's Museum** — Architect's personal collection, Lincoln's Inn Fields
25. **Ceremony of the Keys** — Free (book months ahead) at the Tower of London

> **Money-Saving Tip:** Check our [Coupons & Deals](/information/coupons-deals) section for attraction discounts and 2-for-1 offers.`,
    content_ar: `# 25 شيئاً مجانياً يمكنك فعله في لندن

لندن قد تكون مكلفة، لكن العديد من أفضل تجاربها مجانية تماماً.

## متاحف ومعارض مجانية
1. **المتحف البريطاني** — أشمل مجموعة في تاريخ البشرية
2. **متحف التاريخ الطبيعي** — ديناصورات وهيكل الحوت الأزرق
3. **المعرض الوطني** — لوحات فان جوخ ومونيه ودا فينشي
4. **تيت مودرن** — فن معاصر في محطة طاقة محولة
5. **متحف V&A** — فن وتصميم وأزياء عبر 5000 عام

## حدائق مجانية
8. **هايد بارك** — 350 فداناً، بحيرة سربنتاين، نافورة ديانا التذكارية
9. **ريجنت بارك** — حديقة ورد وبحيرة قوارب
11. **حديقة سانت جيمس** — أفضل إطلالة على قصر باكنغهام

## معالم وتجارب مجانية
13. **تبديل الحرس** — قصر باكنغهام، 11 صباحاً
14. **سكاي غاردن** — حديقة سطحية بإطلالات 360 درجة
15. **ممشى الضفة الجنوبية** — من وستمنستر إلى جسر البرج

## جواهر مخفية مجانية
19. **نيلز يارد** — فناء ملون في كوفنت غاردن
20. **ليتل فينيس** — قوارب قنوات بالقرب من بادينغتون`,
    featured_image: '/images/information/free-london-activities.jpg',
    reading_time: 9,
    published: true,
    created_at: new Date('2025-01-01'),
    updated_at: new Date('2025-01-05'),
    meta_title_en: '25 Free Things to Do in London 2025 | Hidden Gems | Yalla London',
    meta_title_ar: '25 شيئاً مجانياً في لندن 2025 | يلا لندن',
    meta_description_en: 'Discover 25 amazing free things to do in London — free museums, secret viewpoints, beautiful parks, and hidden gems tourists miss.',
    meta_description_ar: 'اكتشف 25 شيئاً مجانياً رائعاً يمكنك فعله في لندن — متاحف مجانية وإطلالات سرية وحدائق جميلة.',
    tags: ['free-london', 'budget-travel', 'hidden-gems', 'free-museums', 'parks'],
    keywords: ['free things london', 'free museums london', 'london free activities', 'hidden gems london', 'budget london'],
    page_type: 'article',
    seo_score: 93,
    faq_questions: [
      { question_en: 'Are London museums really free?', question_ar: 'هل متاحف لندن مجانية حقاً؟', answer_en: 'Yes! Major national museums including British Museum, Natural History Museum, National Gallery, and Tate Modern are free. Some special exhibitions charge a fee.', answer_ar: 'نعم! المتاحف الوطنية الكبرى مجانية تماماً. بعض المعارض الخاصة تفرض رسوماً.' },
      { question_en: 'What is the best free viewpoint in London?', question_ar: 'ما أفضل نقطة مشاهدة مجانية في لندن؟', answer_en: 'Sky Garden offers stunning free 360° views — book online in advance. Parliament Hill on Hampstead Heath is also excellent for skyline views.', answer_ar: 'سكاي غاردن يقدم إطلالات مجانية مذهلة 360 درجة — احجز مسبقاً أونلاين.' },
    ],
  },
  {
    id: 'iart-008',
    slug: 'london-neighbourhood-guide-arab-families',
    section_id: 'sec-neighbourhood-guides',
    category_id: 'icat-places',
    title_en: 'Best London Neighbourhoods for Arab Families',
    title_ar: 'أفضل أحياء لندن للعائلات العربية',
    excerpt_en: 'Discover which London neighbourhoods are most welcoming for Arab families — halal options, Arabic services, and family-friendly areas.',
    excerpt_ar: 'اكتشف أكثر أحياء لندن ترحيباً بالعائلات العربية — خيارات حلال وخدمات عربية ومناطق عائلية.',
    content_en: `# Best London Neighbourhoods for Arab Families

Choosing the right neighbourhood can make or break your London trip. Here are the best areas for Arab families, rated by halal food availability, Arabic services, and family-friendliness.

## Edgware Road & Marble Arch
**Best for:** Arabic atmosphere, halal food, budget-friendly
The heart of Arab London. Lebanese, Egyptian, and Iraqi restaurants line the street. Arabic-speaking shops, shisha cafés, and grocery stores. Close to Hyde Park and Oxford Street.

## Knightsbridge & South Kensington
**Best for:** Luxury shopping, museums, family activities
Home to Harrods, Natural History Museum, Science Museum, and V&A. Hyde Park and Kensington Gardens nearby. Many Arabic-speaking services in shops and restaurants.

## Mayfair & Park Lane
**Best for:** Ultra-luxury, fine dining, high-end shopping
5-star hotels with Arabic-speaking staff. Bond Street luxury shopping. The Dorchester and Claridge's are Arab visitor favourites. Green Park and Hyde Park steps away.

## Bayswater & Queensway
**Best for:** Central location, diverse food options, good value
Close to Hyde Park and Kensington Gardens. Mix of Middle Eastern and international restaurants. More affordable than Knightsbridge with excellent transport links.

## Kensington High Street
**Best for:** Families with children, parks, quieter atmosphere
Holland Park, Kensington Palace, and Design Museum nearby. Good mix of shops and restaurants. Less crowded than central tourist areas.

## Westminster & Victoria
**Best for:** Sightseeing, landmarks, central access
Walking distance to Big Ben, London Eye, Buckingham Palace, and St James's Park. Excellent transport connections to all of London.

## Choosing Your Neighbourhood

| Priority | Best Area |
|----------|-----------|
| Halal food | Edgware Road |
| Luxury shopping | Knightsbridge |
| Museums & kids | South Kensington |
| Budget-friendly | Bayswater |
| Central sightseeing | Westminster |

> **Accommodation Tip:** Book apartments through our recommended partners for family-sized accommodation with kitchens — ideal for longer stays.`,
    content_ar: `# أفضل أحياء لندن للعائلات العربية

اختيار الحي المناسب يمكن أن يصنع أو يفسد رحلتك. إليك أفضل المناطق للعائلات العربية.

## إدجوير رود وماربل آرتش
**الأفضل لـ:** الأجواء العربية والطعام الحلال والميزانية المعتدلة
قلب لندن العربية. مطاعم لبنانية ومصرية وعراقية. متاجر ومقاهي ناطقة بالعربية.

## نايتسبريدج وساوث كنسينغتون
**الأفضل لـ:** التسوق الفاخر والمتاحف والأنشطة العائلية
موطن هارودز ومتحف التاريخ الطبيعي ومتحف العلوم.

## مايفير وبارك لين
**الأفضل لـ:** الفخامة الفائقة والمطاعم الراقية
فنادق 5 نجوم بطاقم ناطق بالعربية. تسوق شارع بوند.

## بايزووتر وكوينزواي
**الأفضل لـ:** الموقع المركزي وخيارات الطعام المتنوعة والقيمة الجيدة

## اختيار الحي المناسب

| الأولوية | أفضل منطقة |
|----------|-----------|
| طعام حلال | إدجوير رود |
| تسوق فاخر | نايتسبريدج |
| متاحف وأطفال | ساوث كنسينغتون |`,
    featured_image: '/images/information/london-neighbourhoods-arab.jpg',
    reading_time: 10,
    published: true,
    created_at: new Date('2024-12-28'),
    updated_at: new Date('2025-01-02'),
    meta_title_en: 'Best London Neighbourhoods for Arab Families 2025 | Yalla London',
    meta_title_ar: 'أفضل أحياء لندن للعائلات العربية 2025 | يلا لندن',
    meta_description_en: 'Find the best London neighbourhoods for Arab families — Edgware Road, Knightsbridge, Mayfair, and more with halal food and Arabic services.',
    meta_description_ar: 'اعثر على أفضل أحياء لندن للعائلات العربية — إدجوير رود ونايتسبريدج ومايفير مع طعام حلال وخدمات عربية.',
    tags: ['neighbourhoods', 'arab-families', 'edgware-road', 'knightsbridge', 'accommodation'],
    keywords: ['london neighbourhoods arab', 'best area london arab families', 'edgware road', 'knightsbridge arab', 'london halal area'],
    page_type: 'article',
    seo_score: 91,
    faq_questions: [
      { question_en: 'What is the best area in London for Arab families?', question_ar: 'ما أفضل منطقة في لندن للعائلات العربية؟', answer_en: 'Edgware Road for Arabic atmosphere and halal food, Knightsbridge for luxury and museums, or Bayswater for good value with central access.', answer_ar: 'إدجوير رود للأجواء العربية والطعام الحلال، نايتسبريدج للفخامة والمتاحف، أو بايزووتر للقيمة الجيدة.' },
      { question_en: 'Where can I find Arabic-speaking services in London?', question_ar: 'أين أجد خدمات ناطقة بالعربية في لندن؟', answer_en: 'Edgware Road, Knightsbridge (Harrods), and Mayfair hotels all have extensive Arabic-speaking staff and services.', answer_ar: 'إدجوير رود ونايتسبريدج (هارودز) وفنادق مايفير جميعها لديها طاقم وخدمات ناطقة بالعربية.' },
    ],
  },
  {
    id: 'iart-009',
    slug: 'london-weather-packing-guide',
    section_id: 'sec-practical-info',
    category_id: 'icat-planning',
    title_en: 'London Weather & Packing Guide: What to Expect Each Season',
    title_ar: 'دليل طقس لندن والتعبئة: ماذا تتوقع في كل موسم',
    excerpt_en: 'What to pack for London in every season — weather patterns, clothing tips, and essential items for Arab travellers.',
    excerpt_ar: 'ماذا تحزم للندن في كل موسم — أنماط الطقس ونصائح الملابس والعناصر الأساسية.',
    content_en: `# London Weather & Packing Guide

London weather is famously unpredictable. Even in summer you might need a jacket. Here's what to expect and pack for each season.

## Weather by Season

### Spring (March–May)
- Temperature: 8-15°C
- Mix of sunny and rainy days
- Cherry blossoms in parks (April)
- **Pack:** Layers, light waterproof jacket, comfortable walking shoes

### Summer (June–August)
- Temperature: 18-25°C (occasionally 30°C+)
- Longest daylight hours (sunset ~9pm)
- Occasional heatwaves
- **Pack:** Light clothing, sunscreen, sunglasses, water bottle, one warm layer for evenings

### Autumn (September–November)
- Temperature: 8-16°C
- Beautiful foliage in parks
- Increasing rain
- **Pack:** Warm layers, waterproof jacket, scarf, umbrella

### Winter (December–February)
- Temperature: 2-8°C
- Short days (sunset ~4pm)
- Occasional frost, rare snow
- **Pack:** Warm coat, hat, gloves, scarf, waterproof boots, thermal layers

## Essential Packing List

### Must-Have Items
- UK power adapter (Type G, 3-pin)
- Waterproof jacket (all seasons)
- Comfortable walking shoes (you'll walk 10,000+ steps daily)
- Layers (temperature changes through the day)
- Umbrella (compact, easy to carry)

### Tech Essentials
- Phone charger and portable battery
- TfL Go app (pre-downloaded)
- Google Maps offline maps
- Currency converter app

### For Arab Travellers Specifically
- Prayer mat (compact travel version)
- Qibla compass or app
- Modest clothing options for mosque visits
- Any prescription medications with doctor's letter

> **Weather Tip:** Check the BBC Weather app for the most accurate London forecasts. Weather can change hour by hour!`,
    content_ar: `# دليل طقس لندن والتعبئة

طقس لندن معروف بعدم قابليته للتنبؤ. حتى في الصيف قد تحتاج سترة.

## الطقس حسب الموسم

### الربيع (مارس–مايو)
- درجة الحرارة: 8-15 درجة
- مزيج من الأيام المشمسة والممطرة
- **احزم:** طبقات، سترة مقاومة للماء خفيفة

### الصيف (يونيو–أغسطس)
- درجة الحرارة: 18-25 درجة
- أطول ساعات النهار
- **احزم:** ملابس خفيفة، واقي شمس، نظارات شمسية

### الخريف (سبتمبر–نوفمبر)
- درجة الحرارة: 8-16 درجة
- أوراق شجر جميلة وأمطار متزايدة
- **احزم:** طبقات دافئة، سترة مقاومة للماء، مظلة

### الشتاء (ديسمبر–فبراير)
- درجة الحرارة: 2-8 درجات
- أيام قصيرة (غروب ~4 مساءً)
- **احزم:** معطف دافئ، قبعة، قفازات، أحذية مقاومة للماء

## قائمة التعبئة الأساسية
- محول كهرباء بريطاني (Type G)
- سترة مقاومة للماء (كل المواسم)
- أحذية مريحة للمشي
- مظلة مدمجة`,
    featured_image: '/images/information/london-weather-packing.jpg',
    reading_time: 7,
    published: true,
    created_at: new Date('2024-12-25'),
    updated_at: new Date('2025-01-01'),
    meta_title_en: 'London Weather & Packing Guide by Season | Yalla London',
    meta_title_ar: 'دليل طقس لندن والتعبئة حسب الموسم | يلا لندن',
    meta_description_en: 'What to pack for London in spring, summer, autumn, and winter — weather guide, clothing tips, and essential items for visitors.',
    meta_description_ar: 'ماذا تحزم للندن في الربيع والصيف والخريف والشتاء — دليل الطقس ونصائح الملابس.',
    tags: ['london-weather', 'packing-guide', 'travel-tips', 'seasons', 'preparation'],
    keywords: ['london weather guide', 'what to pack london', 'london packing list', 'london seasons weather'],
    page_type: 'article',
    seo_score: 88,
    faq_questions: [
      { question_en: 'What is the best month to visit London?', question_ar: 'ما أفضل شهر لزيارة لندن؟', answer_en: 'June and September offer the best balance of good weather, moderate prices, and fewer crowds.', answer_ar: 'يونيو وسبتمبر يوفران أفضل توازن بين الطقس الجيد والأسعار المعتدلة والازدحام الأقل.' },
      { question_en: 'Does it rain a lot in London?', question_ar: 'هل تمطر كثيراً في لندن؟', answer_en: 'London gets about 106 rainy days per year. Rain is usually light drizzle rather than heavy downpours. Always carry a compact umbrella.', answer_ar: 'لندن تشهد حوالي 106 يوم ممطر سنوياً. المطر عادةً رذاذ خفيف. احمل مظلة مدمجة دائماً.' },
    ],
  },
  {
    id: 'iart-010',
    slug: 'top-london-attractions-landmarks',
    section_id: 'sec-attractions-landmarks',
    category_id: 'icat-places',
    title_en: 'Top London Attractions: Must-See Landmarks for First-Time Visitors',
    title_ar: 'أهم معالم لندن: أماكن يجب زيارتها للمرة الأولى',
    excerpt_en: 'The essential London bucket list — Big Ben, Tower of London, Buckingham Palace, and more with tips on tickets and timing.',
    excerpt_ar: 'قائمة لندن الأساسية — بيغ بن، برج لندن، قصر باكنغهام والمزيد مع نصائح التذاكر والتوقيت.',
    content_en: `# Top London Attractions: Must-See Landmarks

Whether it's your first or fifth visit, these iconic London attractions never disappoint. Here's your essential guide with booking tips and insider advice.

## The Big 5 Landmarks

### 1. Big Ben & Houses of Parliament
The iconic clock tower overlooking the Thames. Best photos from Westminster Bridge or the South Bank. Free to admire from outside. UK residents can book tours inside — visitors can watch debates from the public gallery.

### 2. Tower of London
Nearly 1,000 years of history. See the Crown Jewels, the White Tower, and hear tales from the Yeoman Warders (Beefeaters). **Book online** for £33 (adults) and arrive early to beat the Crown Jewels queue.

### 3. Buckingham Palace
The King's official London residence. Watch the **Changing of the Guard** ceremony (free, 11am, check schedule). State Rooms open to visitors in summer for £30.

### 4. Tower Bridge
Walk across for free and enjoy Thames views. The Tower Bridge Exhibition (£11.40) includes the glass-floor walkway and Victorian engine rooms.

### 5. The London Eye
30-minute rotation with stunning city views. Book online from £30. Best at sunset. Consider a champagne experience for special occasions.

## More Must-Visit Attractions

- **Westminster Abbey:** Where kings and queens are crowned. £27.
- **St Paul's Cathedral:** Climb to the dome for panoramic views. £21.
- **British Museum:** Free. See the Rosetta Stone and Egyptian mummies.
- **Natural History Museum:** Free. The Hintze Hall blue whale is breathtaking.
- **Kensington Palace:** Princess Diana's former home. £21.
- **The Shard:** Western Europe's tallest building. Viewing gallery from £28.

## Money-Saving Tips
- Buy a **London Pass** for 3+ attractions (saves up to 50%)
- Book everything **online in advance** for cheaper prices
- Visit **free museums** (British Museum, National Gallery, Tate Modern)
- Use **2-for-1 offers** with National Rail tickets

## Best Itinerary Order
**Day 1:** Westminster — Big Ben, Westminster Abbey, Buckingham Palace, St James's Park
**Day 2:** Tower area — Tower of London, Tower Bridge, Borough Market
**Day 3:** South Kensington — Museums (NHM, Science, V&A), Harrods

> **Insider Tip:** Download our [3-Day London Itinerary](/shop) for a complete day-by-day plan with timings, maps, and restaurant suggestions.`,
    content_ar: `# أهم معالم لندن: أماكن يجب زيارتها

سواء كانت زيارتك الأولى أو الخامسة، هذه المعالم الأيقونية لا تخيب الآمال أبداً.

## أهم 5 معالم

### 1. بيغ بن ومبنى البرلمان
برج الساعة الشهير المطل على التايمز. أفضل الصور من جسر وستمنستر.

### 2. برج لندن
ما يقارب 1000 عام من التاريخ. شاهد جواهر التاج والبرج الأبيض.

### 3. قصر باكنغهام
المقر الرسمي للملك في لندن. شاهد حفل تبديل الحرس (مجاني، 11 صباحاً).

### 4. جسر البرج
المشي عبره مجاني. المعرض يشمل أرضية زجاجية مذهلة.

### 5. عين لندن
جولة 30 دقيقة بإطلالات مذهلة على المدينة.

## معالم أخرى يجب زيارتها
- **دير وستمنستر:** حيث يُتوج الملوك
- **كاتدرائية سانت بول:** اصعد للقبة لإطلالات بانورامية
- **المتحف البريطاني:** مجاني. حجر رشيد والمومياوات المصرية

## نصائح لتوفير المال
- اشترِ **بطاقة لندن** لـ 3+ معالم
- احجز **أونلاين مسبقاً** لأسعار أرخص
- زُر **المتاحف المجانية**`,
    featured_image: '/images/information/london-attractions-landmarks.jpg',
    reading_time: 12,
    published: true,
    created_at: new Date('2024-12-20'),
    updated_at: new Date('2024-12-28'),
    meta_title_en: 'Top London Attractions & Landmarks 2025 | Must-See Guide | Yalla London',
    meta_title_ar: 'أهم معالم لندن 2025 | دليل يجب مشاهدته | يلا لندن',
    meta_description_en: 'Complete guide to London\'s top attractions — Big Ben, Tower of London, Buckingham Palace, London Eye, and more with tickets and tips.',
    meta_description_ar: 'دليل شامل لأهم معالم لندن — بيغ بن وبرج لندن وقصر باكنغهام وعين لندن والمزيد.',
    tags: ['london-attractions', 'landmarks', 'sightseeing', 'big-ben', 'tower-of-london'],
    keywords: ['london attractions', 'london landmarks', 'big ben', 'tower of london', 'buckingham palace', 'london eye'],
    page_type: 'article',
    seo_score: 95,
    faq_questions: [
      { question_en: 'What are the top 5 things to see in London?', question_ar: 'ما أهم 5 أشياء يجب مشاهدتها في لندن؟', answer_en: 'Big Ben, Tower of London (Crown Jewels), Buckingham Palace (Changing of the Guard), Tower Bridge, and the London Eye.', answer_ar: 'بيغ بن، برج لندن (جواهر التاج)، قصر باكنغهام (تبديل الحرس)، جسر البرج، وعين لندن.' },
      { question_en: 'How much does it cost to visit London attractions?', question_ar: 'كم تكلفة زيارة معالم لندن؟', answer_en: 'Many museums are free. Paid attractions range from £11-53. A London Pass can save money if visiting 3+ attractions.', answer_ar: 'العديد من المتاحف مجانية. المعالم المدفوعة تتراوح بين 11-53 جنيه. بطاقة لندن توفر المال عند زيارة 3+ معالم.' },
    ],
  },
];
