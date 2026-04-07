'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Star, MapPin, Search, ChevronDown, ChevronUp } from 'lucide-react'
import Link from 'next/link'
import { useLanguage } from '@/components/language-provider'
import { getPageAffiliateLink } from '@/lib/affiliate/page-affiliate-links'
import { TriBar, BrandButton, BrandTag, BrandCardLight, SectionLabel, WatermarkStamp, Breadcrumbs } from '@/components/brand-kit'
import AffiliateDisclosure from '@/components/affiliate/AffiliateDisclosure'

const hotels = {
  en: [
    {
      id: '1',
      name: 'The Dorchester',
      location: 'Mayfair',
      area: 'Mayfair',
      rating: 4.9,
      reviews: 3412,
      price: 650,
      image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80',
      badge: 'Palace Hotel',
      description: 'Overlooking Hyde Park since 1931, The Dorchester is one of London\'s most iconic luxury hotels. Home to three-Michelin-starred Alain Ducasse at The Dorchester, a world-class spa with nine treatment rooms, and legendary afternoon tea in The Promenade. The hotel\'s 250 rooms and suites blend classic English style with contemporary comfort, many offering direct views over Hyde Park. The Dorchester Rooftop penthouse suite is among London\'s most exclusive, with a private terrace and panoramic skyline views. The Spatisserie offers lighter dining, while The Grill at The Dorchester serves refined British cuisine. During summer, the hotel\'s terraces become a favourite gathering spot for Gulf families enjoying the park.',
      amenities: ['Spa', 'Michelin Dining', 'Hyde Park Views', 'Butler Service'],
      insiderTip: 'Request a Park Suite on the 7th floor for the best unobstructed Hyde Park views. The Dorchester also offers a private VIP entrance on Deanery Street for guests who prefer discretion.',
      gccFeatures: ['Arabic-speaking concierge team', 'Halal room service available 24/7', 'Prayer mats and qibla direction provided on request', 'Family interconnecting suites with separate living areas', '5-minute walk to London Central Mosque via Hyde Park'],
      bestFor: ['Families', 'Couples', 'Extended summer stays'],
      website: 'https://www.dorchestercollection.com/london/the-dorchester'
    },
    {
      id: '2',
      name: 'The Ritz London',
      location: 'Piccadilly',
      area: 'Piccadilly',
      rating: 4.8,
      reviews: 4256,
      price: 750,
      image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=600&q=80',
      badge: '5 Star',
      description: 'The epitome of English grandeur on Piccadilly. Famous for its opulent Louis XVI interiors, the legendary afternoon tea in the Palm Court is a London institution requiring weeks of advance booking. The Ritz Restaurant features a breathtaking gilded ceiling, hand-painted murals, and a menu of refined French cuisine. With 136 individually designed rooms and suites, each adorned with antique furnishings and marble bathrooms, the hotel feels like a private palace. The Ritz Club casino adds an exclusive nightlife dimension, while Green Park is just steps from the front entrance. The hotel\'s dedicated shopping concierge can arrange private after-hours sessions at Bond Street boutiques.',
      amenities: ['Palm Court Tea', 'Fine Dining', 'Casino', 'Concierge'],
      insiderTip: 'Book the Palm Court afternoon tea at least 8 weeks in advance for weekend sittings. Ask for a table near the central fountain for the most photogenic spot. The Ritz also offers a private dining room for families who prefer seclusion.',
      gccFeatures: ['Dedicated Arabic-speaking guest relations team', 'Halal-certified afternoon tea options available on request', 'Walking distance to Jermyn Street and Bond Street luxury shopping', 'Spacious family suites with separate children\'s sleeping areas', 'In-room dining with halal meat options'],
      bestFor: ['Couples', 'Special occasions', 'Shopping trips'],
      website: 'https://www.theritzlondon.com'
    },
    {
      id: '3',
      name: "Claridge's",
      location: 'Mayfair',
      area: 'Mayfair',
      rating: 4.9,
      reviews: 2187,
      price: 580,
      image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=600&q=80',
      badge: 'Art Deco Icon',
      description: 'The quintessential Mayfair hotel. Claridge\'s Art Deco masterpiece has hosted royalty and heads of state since the 1850s, and it remains the London residence of choice for Gulf royal families during summer visits. Gordon Ramsay at Claridge\'s holds a Michelin star and serves exquisite seasonal British cuisine, while the Fumoir bar offers rare cognacs and an intimate jazz atmosphere. The hotel\'s 190 rooms feature the signature black-and-white marble bathrooms and bespoke English furnishings. The Christmas tree designed by a different fashion house each year is a London talking point. Davies and Brook by Daniel Humm adds a contemporary fine dining option, and the Painter\'s Room serves creative afternoon teas.',
      amenities: ['Art Deco Design', 'Gordon Ramsay', 'Fumoir Bar', 'Butler Service'],
      insiderTip: 'The Grand Piano Suite on the 6th floor has its own baby grand piano and a terrace overlooking Mayfair rooftops. Claridge\'s butler service is among the most discreet in London — they will unpack and press your wardrobe on arrival.',
      gccFeatures: ['Long history of hosting Gulf royal families', 'Arabic-speaking staff across front desk and concierge', 'Halal room service menu curated for Gulf guests', 'Adjacent to Mount Street and Bond Street luxury boutiques', 'Private dining rooms for family celebrations'],
      bestFor: ['Royalty and VIPs', 'Families', 'Fashion and culture lovers'],
      website: 'https://www.claridges.co.uk'
    },
    {
      id: '4',
      name: 'The Savoy',
      location: 'Strand',
      area: 'Westminster',
      rating: 4.8,
      reviews: 3876,
      price: 520,
      image: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=600&q=80',
      badge: 'Historic Landmark',
      description: 'London\'s first luxury hotel, opened in 1889 on the banks of the Thames. The Savoy\'s extraordinary history includes hosting Monet, Churchill, and Frank Sinatra. The hotel blends Edwardian grandeur in the River Restaurant with Art Deco glamour in the Beaufort Bar. Thames-view suites on the upper floors offer sweeping panoramas of the South Bank and London Eye. The American Bar, repeatedly voted among the world\'s best cocktail bars, has its own resident pianist every evening. Kaspar\'s seafood bar and grill provides a more relaxed dining experience. The hotel\'s heated indoor pool and full-service spa are an oasis in the heart of the West End, with Covent Garden\'s theatres and boutiques just a two-minute walk away.',
      amenities: ['Thames Views', 'American Bar', 'Pool & Spa', 'River Restaurant'],
      insiderTip: 'Request a river-view room on floors 5-7 for the best Thames panoramas. The Savoy is the only hotel in London where traffic drives on the right — the forecourt entrance is uniquely designed for arriving guests.',
      gccFeatures: ['Halal options available through in-room dining', 'Walking distance to the West End for family entertainment', 'Connecting rooms and suites suitable for larger families', 'Concierge experienced with Gulf visitor requirements', 'Close to Savoy Mosque and Islamic Centre at Regent\'s Park'],
      bestFor: ['Theatre lovers', 'Couples', 'History enthusiasts'],
      website: 'https://www.thesavoylondon.com'
    },
    {
      id: '5',
      name: 'The Langham, London',
      location: 'Marylebone',
      area: 'Marylebone',
      rating: 4.7,
      reviews: 2432,
      price: 480,
      image: 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=600&q=80',
      badge: 'Heritage',
      description: 'Europe\'s first grand hotel, established in 1865 near Regent Street, The Langham set the standard for luxury hospitality that every London hotel has followed since. The award-winning Chuan Body + Soul spa draws on Traditional Chinese Medicine for its treatments, offering a tranquil escape across 16,000 square feet of wellness space. Roux at The Landau, helmed by the legendary Roux family, serves refined European cuisine in a stunning curved dining room. The Artesian cocktail bar has won multiple World\'s Best Bar awards and is famous for its theatrical presentations. Located in Marylebone, guests enjoy easy access to Oxford Street shopping, BBC Broadcasting House, and the quieter boutique charm of Marylebone High Street. The Palm Court here pioneered the tradition of afternoon tea in London.',
      amenities: ['Chuan Spa', 'Roux Restaurant', 'Artesian Bar', 'Gym'],
      insiderTip: 'The Langham\'s Sterling Suite is one of London\'s largest at 5,000 square feet. For a quieter experience, visit the Chuan Spa during weekday mornings when it is nearly empty. The hotel is also just a 10-minute walk to London Central Mosque.',
      gccFeatures: ['10-minute walk to London Central Mosque in Regent\'s Park', 'Halal-friendly dining options at Roux at The Landau', 'Spacious family rooms with Marylebone Village shopping nearby', 'Arabic satellite TV channels available in all rooms', 'Concierge team familiar with arranging halal catering for events'],
      bestFor: ['Families', 'Spa lovers', 'Business travellers'],
      website: 'https://www.langhamhotels.com/london'
    },
    {
      id: '6',
      name: 'Four Seasons Hotel London at Park Lane',
      location: 'Park Lane',
      area: 'Mayfair',
      rating: 4.8,
      reviews: 2845,
      price: 720,
      image: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=600&q=80',
      badge: 'Premium',
      description: 'Commanding the prime stretch of Park Lane with views over Hyde Park, the Four Seasons delivers the brand\'s signature blend of warmth and precision. The rooftop spa on the 10th floor offers treatment rooms with floor-to-ceiling windows overlooking the London skyline, and the vitality pool is one of the city\'s most scenic. Amaranto serves refined Italian cuisine in an intimate setting, while the lounge bar is a favourite for Mayfair power meetings. Rooms are among the largest in London, with the Conservatory Suites featuring private terraces and the Presidential Suite spanning over 3,000 square feet. The hotel\'s Kids For All Seasons programme makes it particularly popular with Gulf families travelling with children during summer holidays.',
      amenities: ['Rooftop Spa', 'Park Views', 'Italian Dining', 'Lounge Bar'],
      insiderTip: 'The Conservatory Suite has a private glass-walled terrace overlooking Hyde Park — one of the most coveted balcony views in London. Ask the concierge about the hotel\'s private guided tours of nearby galleries, tailored for families.',
      gccFeatures: ['Dedicated Kids For All Seasons programme with supervised activities', 'Halal room service and dietary accommodation at Amaranto', 'Arabic-speaking staff and guest relations', 'Direct Hyde Park access for family walks and cycling', 'Prayer mats and qibla cards provided on request'],
      bestFor: ['Families with children', 'Couples', 'Wellness travellers'],
      website: 'https://www.fourseasons.com/london'
    },
    {
      id: '7',
      name: 'Corinthia London',
      location: 'Whitehall Place',
      area: 'Westminster',
      rating: 4.8,
      reviews: 2567,
      price: 550,
      image: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=600&q=80',
      badge: 'Modern Grand',
      description: 'A Victorian grande dame reimagined for modern luxury near Embankment. The Corinthia occupies an 1885 building that once served as the Ministry of Defence, and its restoration blends original grandeur with cutting-edge contemporary design. The ESPA Life spa is one of London\'s largest at over 3,300 square metres, featuring a stainless steel pool, amphitheatre sauna, and Daniel Galvin hair salon. Kerridge\'s Bar & Grill by two-Michelin-starred Tom Kerridge serves elevated British pub classics. The penthouse suites command direct views of Big Ben, the London Eye, and the Houses of Parliament. The hotel\'s lobby, with its dramatic crystal chandeliers and sweeping marble staircase, is one of London\'s most photographed interiors. Northall restaurant offers seasonal British menus with private dining options.',
      amenities: ['ESPA Life Spa', 'Tom Kerridge', 'Penthouse Suites', 'Fitness'],
      insiderTip: 'The Hamilton Penthouse is a 5,000-square-foot duplex with a private roof terrace and views of every major London landmark. The ESPA Life spa offers a Hammam-style experience that is especially popular with Gulf guests.',
      gccFeatures: ['Hammam-inspired treatments at ESPA Life spa', 'Arabic-speaking reception and concierge staff', 'Family suites with kitchenettes for longer stays', 'Halal dining arrangements through in-room dining', 'Central Westminster location near Harrods by taxi in 10 minutes'],
      bestFor: ['Spa lovers', 'Families', 'Sightseeing-focused travellers'],
      website: 'https://www.corinthia.com/london'
    },
    {
      id: '8',
      name: 'The Connaught',
      location: 'Mayfair',
      area: 'Mayfair',
      rating: 4.9,
      reviews: 1876,
      price: 690,
      image: 'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=600&q=80',
      badge: 'Exclusive',
      description: 'Understated elegance in the heart of Mayfair, The Connaught is the hotel of choice for those who value discretion and impeccable taste above all else. Hélène Darroze\'s two-Michelin-starred restaurant showcases Basque-inspired cuisine with British seasonal ingredients in an intimate dining room. The Connaught Bar, designed by the late David Collins, has been named the World\'s Best Bar multiple times and serves bespoke martinis prepared tableside from a gleaming trolley. The Aman Spa brings the serene philosophy of the Aman resort brand to central London, with treatment rooms that feel a world away from Mayfair\'s bustle. The hotel has just 121 rooms, giving it the feel of a private members\' club. Carlos Place, the quiet Mayfair square outside, is home to the Damien Hirst sculpture Charity.',
      amenities: ['Aman Spa', 'Connaught Bar', 'Michelin Dining', 'Butler Service'],
      insiderTip: 'The Connaught\'s butler service is the most personalised in London — your butler will remember your preferences from previous stays. Request the Apartment Suite for a separate living room and study, ideal for extended stays.',
      gccFeatures: ['Ultra-private atmosphere favoured by Gulf dignitaries', 'Aman Spa with serene treatment philosophy', 'Halal room service and bespoke dietary arrangements', 'Butler service that recalls guest preferences across visits', 'Steps from Mount Street\'s designer boutiques and art galleries'],
      bestFor: ['VIPs and dignitaries', 'Couples', 'Extended luxury stays'],
      website: 'https://www.the-connaught.co.uk'
    },
    {
      id: '9',
      name: 'Shangri-La The Shard, London',
      location: 'London Bridge',
      area: 'Southwark',
      rating: 4.7,
      reviews: 3124,
      price: 450,
      image: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=600&q=80',
      badge: 'Sky High',
      description: 'Occupying floors 34 to 52 of The Shard, Western Europe\'s tallest building, this is London\'s most dramatic hotel address. Every one of the 202 rooms offers floor-to-ceiling views stretching up to 40 miles across the capital, with the Tower of London, St Paul\'s Cathedral, and the Thames winding below. The infinity pool on the 52nd floor is the highest in Western Europe, offering a swimming experience unlike anything else in London. TING restaurant on the 35th floor serves Pan-Asian cuisine with views that make every table a window seat. GONG bar on the 52nd floor has become one of London\'s most sought-after cocktail destinations. The hotel\'s Asian heritage means an innate understanding of hospitality for Gulf travellers, with genuine warmth and attentiveness to cultural preferences.',
      amenities: ['Infinity Pool', 'Shard Views', 'TING Restaurant', 'Sky Bar'],
      insiderTip: 'Request a west-facing room above floor 40 for sunset views over the entire City and West End skyline. The infinity pool is quietest before 8am — arrive early for a near-private swim above the clouds.',
      gccFeatures: ['Shangri-La\'s Asian hospitality tradition with cultural sensitivity', 'Halal options available at TING restaurant and room service', 'Prayer mats provided on request with qibla direction', 'Borough Market nearby for diverse halal street food', 'Family rooms with panoramic views and rollaway beds available'],
      bestFor: ['Couples', 'Instagram and photography enthusiasts', 'First-time London visitors'],
      website: 'https://www.shangri-la.com/london/shangrila'
    },
    {
      id: '10',
      name: 'Bulgari Hotel London',
      location: 'Knightsbridge',
      area: 'Knightsbridge',
      rating: 4.8,
      reviews: 1654,
      price: 780,
      image: 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=600&q=80',
      badge: 'Ultra Luxury',
      description: 'Italian craftsmanship meets British heritage just steps from Harrods in the heart of Knightsbridge. The Bulgari Hotel features 85 exquisitely designed rooms clad in mahogany, silver, and silk, with Italian marble bathrooms equipped with Bulgari amenities. The 25-metre swimming pool is one of the finest hotel pools in London, with a stunning silver-leaf ceiling. The Bulgari Spa offers signature Italian treatments including facials using Bulgari skincare. Il Ristorante by three-Michelin-starred Niko Romito delivers contemporary Italian cuisine with a focus on purity and simplicity. The private 47-seat cinema screens first-run films, and the ballroom with its Swarovski crystal chandeliers hosts London\'s most exclusive events. The Niko Romito Bulgari Bar serves aperitivo-style cocktails in a sophisticated setting.',
      amenities: ['Bulgari Spa', '25m Pool', 'Italian Dining', 'Private Cinema'],
      insiderTip: 'The Bulgari Suite has a wraparound terrace with views of Hyde Park and Knightsbridge. Book a private screening in the cinema for your family — they can arrange any film you request, including Arabic-language titles.',
      gccFeatures: ['Steps from Harrods, Harvey Nichols, and Sloane Street luxury shopping', 'Halal room service and bespoke dietary menus', 'Private cinema with Arabic film screenings on request', 'Arabic-speaking concierge and guest services', 'Family suites with Knightsbridge\'s best shopping at the doorstep'],
      bestFor: ['Luxury shoppers', 'Couples', 'Design and fashion enthusiasts'],
      website: 'https://www.bulgarihotels.com/london'
    },
  ],
  ar: [
    {
      id: '1',
      name: 'دورتشستر',
      location: 'مايفير',
      area: 'Mayfair',
      rating: 4.9,
      reviews: 3412,
      price: 650,
      image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80',
      badge: 'فندق قصر',
      description: 'يطل على هايد بارك منذ عام 1931، دورتشستر هو أحد أشهر الفنادق الفاخرة في لندن. يضم مطعم آلان دوكاس الحائز على ثلاث نجوم ميشلان وسبا فاخر يحتوي على تسع غرف علاج وشاي بعد الظهر الأسطوري في البروميناد. يحتوي الفندق على 250 غرفة وجناح تجمع بين الأسلوب الإنجليزي الكلاسيكي والراحة العصرية، والعديد منها يطل مباشرة على هايد بارك. جناح البنتهاوس على السطح من أفخم الأجنحة في لندن مع شرفة خاصة وإطلالات بانورامية. خلال الصيف تصبح شرفات الفندق مكاناً مفضلاً للعائلات الخليجية.',
      amenities: ['سبا', 'مطعم ميشلان', 'إطلالة هايد بارك', 'خدمة الخادم الشخصي'],
      insiderTip: 'اطلب جناح بارك في الطابق السابع لأفضل إطلالة على هايد بارك. يوفر الفندق أيضاً مدخلاً خاصاً على شارع دينيري للضيوف الذين يفضلون الخصوصية.',
      gccFeatures: ['فريق كونسيرج يتحدث العربية', 'خدمة غرف حلال متاحة على مدار الساعة', 'سجادات صلاة واتجاه القبلة عند الطلب', 'أجنحة عائلية متصلة بغرف معيشة منفصلة', '5 دقائق سيراً إلى مسجد لندن المركزي عبر هايد بارك'],
      bestFor: ['العائلات', 'الأزواج', 'الإقامات الصيفية الطويلة'],
      website: 'https://www.dorchestercollection.com/london/the-dorchester'
    },
    {
      id: '2',
      name: 'ريتز لندن',
      location: 'بيكاديلي',
      area: 'Piccadilly',
      rating: 4.8,
      reviews: 4256,
      price: 750,
      image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=600&q=80',
      badge: '5 نجوم',
      description: 'قمة الفخامة الإنجليزية على شارع بيكاديلي. يشتهر بديكوراته الفخمة على طراز لويس السادس عشر وشاي بعد الظهر الأسطوري في بالم كورت الذي يتطلب حجزاً مسبقاً بأسابيع. يضم مطعم ريتز بسقفه المذهب ولوحاته الجدارية المرسومة يدوياً وقائمة طعام فرنسية راقية. يحتوي على 136 غرفة وجناح مصمم بشكل فردي مع أثاث أنتيك وحمامات رخامية. نادي ريتز كازينو يضيف بُعداً حصرياً للحياة الليلية، وحديقة غرين بارك على بعد خطوات من المدخل الرئيسي.',
      amenities: ['شاي بالم كورت', 'مطعم فاخر', 'كازينو', 'كونسيرج'],
      insiderTip: 'احجز شاي بالم كورت قبل 8 أسابيع على الأقل لجلسات نهاية الأسبوع. اطلب طاولة بالقرب من النافورة المركزية للحصول على أفضل صورة. يقدم الفندق غرفة طعام خاصة للعائلات.',
      gccFeatures: ['فريق علاقات ضيوف يتحدث العربية', 'خيارات شاي بعد الظهر حلال متاحة عند الطلب', 'قرب من التسوق الفاخر في شارع بوند وجيرمين', 'أجنحة عائلية واسعة مع مناطق نوم منفصلة للأطفال', 'خدمة طعام في الغرفة مع خيارات لحوم حلال'],
      bestFor: ['الأزواج', 'المناسبات الخاصة', 'رحلات التسوق'],
      website: 'https://www.theritzlondon.com'
    },
    {
      id: '3',
      name: 'كلاريدجز',
      location: 'مايفير',
      area: 'Mayfair',
      rating: 4.9,
      reviews: 2187,
      price: 580,
      image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=600&q=80',
      badge: 'أيقونة آرت ديكو',
      description: 'فندق مايفير المثالي. تحفة آرت ديكو استضافت الملوك ورؤساء الدول منذ خمسينيات القرن التاسع عشر ولا يزال الخيار المفضل للعائلات الملكية الخليجية خلال زياراتهم الصيفية. يحمل مطعم غوردون رامزي في كلاريدجز نجمة ميشلان ويقدم مأكولات بريطانية موسمية رائعة. يحتوي الفندق على 190 غرفة تتميز بحماماتها الرخامية بالأبيض والأسود والمفروشات الإنجليزية المصممة خصيصاً. يضيف مطعم ديفيز أند بروك خيار طعام فاخر معاصر، وتقدم غرفة الرسام شاي بعد الظهر الإبداعي.',
      amenities: ['تصميم آرت ديكو', 'غوردون رامزي', 'بار فومور', 'خادم شخصي'],
      insiderTip: 'جناح البيانو الكبير في الطابق السادس يحتوي على بيانو خاص وشرفة تطل على أسطح مايفير. خدمة الخادم الشخصي من أكثر الخدمات تميزاً في لندن — سيقوم بتفريغ حقائبك وكي ملابسك عند الوصول.',
      gccFeatures: ['تاريخ طويل في استضافة العائلات الملكية الخليجية', 'موظفون يتحدثون العربية في الاستقبال والكونسيرج', 'قائمة طعام حلال في خدمة الغرف مصممة لضيوف الخليج', 'مجاور لبوتيكات ماونت ستريت وبوند ستريت الفاخرة', 'غرف طعام خاصة للاحتفالات العائلية'],
      bestFor: ['الشخصيات المهمة', 'العائلات', 'عشاق الموضة والثقافة'],
      website: 'https://www.claridges.co.uk'
    },
    {
      id: '4',
      name: 'سافوي',
      location: 'ستراند',
      area: 'Westminster',
      rating: 4.8,
      reviews: 3876,
      price: 520,
      image: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=600&q=80',
      badge: 'معلم تاريخي',
      description: 'أول فندق فاخر في لندن، افتتح عام 1889 على ضفاف نهر التايمز. يتضمن تاريخ الفندق الاستثنائي استضافة مونيه وتشرشل وفرانك سيناترا. يمزج بين الفخامة الإدواردية في مطعم النهر وبريق آرت ديكو في بار بوفورت. توفر الأجنحة في الطوابق العليا إطلالات بانورامية على الضفة الجنوبية وعين لندن. البار الأمريكي الشهير يضم عازف بيانو كل مساء. يحتوي الفندق على مسبح داخلي مدفأ وسبا متكامل في قلب الويست إند، مع مسارح ومتاجر كوفنت غاردن على بعد دقيقتين سيراً.',
      amenities: ['إطلالة التايمز', 'البار الأمريكي', 'مسبح وسبا', 'مطعم النهر'],
      insiderTip: 'اطلب غرفة تطل على النهر في الطوابق 5-7 لأفضل إطلالات على التايمز. سافوي هو الفندق الوحيد في لندن حيث تسير السيارات على اليمين — الساحة الأمامية مصممة بشكل فريد.',
      gccFeatures: ['خيارات حلال متاحة من خلال خدمة الغرف', 'قرب من الويست إند للترفيه العائلي', 'غرف متصلة وأجنحة مناسبة للعائلات الكبيرة', 'كونسيرج ذو خبرة في متطلبات الزوار الخليجيين', 'قريب من مسجد ريجنتس بارك المركزي'],
      bestFor: ['عشاق المسرح', 'الأزواج', 'عشاق التاريخ'],
      website: 'https://www.thesavoylondon.com'
    },
    {
      id: '5',
      name: 'لانغهام لندن',
      location: 'ماريليبون',
      area: 'Marylebone',
      rating: 4.7,
      reviews: 2432,
      price: 480,
      image: 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=600&q=80',
      badge: 'تراثي',
      description: 'أول فندق كبير في أوروبا، تأسس عام 1865 بالقرب من شارع ريجنت، وضع لانغهام معيار الضيافة الفاخرة الذي اتبعته كل فنادق لندن. يمتد سبا شوان بودي آند سول الحائز على جوائز على مساحة 16,000 قدم مربع مع علاجات مستوحاة من الطب الصيني التقليدي. مطعم رو في ذا لانداو يقدم مأكولات أوروبية راقية في قاعة طعام منحنية مذهلة. بار أرتيزان فاز بجوائز أفضل بار في العالم عدة مرات. يقع في ماريليبون مع سهولة الوصول إلى تسوق أكسفورد ستريت وسحر بوتيكات شارع ماريليبون الهاي. هنا في بالم كورت بدأ تقليد شاي بعد الظهر في لندن.',
      amenities: ['سبا شوان', 'مطعم رو', 'بار أرتيزان', 'صالة رياضية'],
      insiderTip: 'جناح ستيرلينغ هو واحد من أكبر الأجنحة في لندن بمساحة 5,000 قدم مربع. لتجربة أكثر هدوءاً زر سبا شوان صباح أيام الأسبوع. الفندق على بعد 10 دقائق سيراً من مسجد لندن المركزي.',
      gccFeatures: ['10 دقائق سيراً إلى مسجد لندن المركزي في ريجنتس بارك', 'خيارات طعام حلال في مطعم رو في ذا لانداو', 'غرف عائلية واسعة مع تسوق قرية ماريليبون القريبة', 'قنوات تلفزيونية عربية عبر الأقمار الصناعية في جميع الغرف', 'فريق كونسيرج يرتب تقديم طعام حلال للمناسبات'],
      bestFor: ['العائلات', 'عشاق السبا', 'رجال الأعمال'],
      website: 'https://www.langhamhotels.com/london'
    },
    {
      id: '6',
      name: 'فور سيزونز بارك لين',
      location: 'بارك لين',
      area: 'Mayfair',
      rating: 4.8,
      reviews: 2845,
      price: 720,
      image: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=600&q=80',
      badge: 'مميز',
      description: 'يسيطر على الموقع المتميز من بارك لين مع إطلالات على هايد بارك. يقدم فور سيزونز مزيج العلامة التجارية المميز من الدفء والدقة. يقع السبا على السطح في الطابق العاشر مع غرف علاج بنوافذ من الأرض حتى السقف تطل على أفق لندن. يقدم أمارانتو مأكولات إيطالية راقية. تعد الغرف من الأكبر في لندن، وتتميز أجنحة الكونسيرفاتوري بشرفات خاصة. يجعل برنامج كيدز فور أول سيزونز الفندق محبوباً بشكل خاص لدى العائلات الخليجية المسافرة مع أطفالهم خلال العطلات الصيفية.',
      amenities: ['سبا على السطح', 'إطلالة البارك', 'مطعم إيطالي', 'بار'],
      insiderTip: 'جناح الكونسيرفاتوري يحتوي على شرفة زجاجية خاصة تطل على هايد بارك — من أكثر الإطلالات المرغوبة في لندن. اسأل الكونسيرج عن الجولات الخاصة بالمعارض القريبة المصممة للعائلات.',
      gccFeatures: ['برنامج كيدز فور أول سيزونز مع أنشطة مشرفة للأطفال', 'خدمة غرف حلال وتلبية الاحتياجات الغذائية في أمارانتو', 'موظفون يتحدثون العربية', 'وصول مباشر إلى هايد بارك للمشي العائلي', 'سجادات صلاة وبطاقات قبلة عند الطلب'],
      bestFor: ['العائلات مع أطفال', 'الأزواج', 'مسافرو العافية'],
      website: 'https://www.fourseasons.com/london'
    },
    {
      id: '7',
      name: 'كورينثيا لندن',
      location: 'وايتهول',
      area: 'Westminster',
      rating: 4.8,
      reviews: 2567,
      price: 550,
      image: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=600&q=80',
      badge: 'فخامة عصرية',
      description: 'فندق فيكتوري أعيد تصميمه للفخامة الحديثة بالقرب من إمبانكمنت. يشغل كورينثيا مبنى عام 1885 كان يخدم سابقاً وزارة الدفاع، وترميمه يمزج بين الفخامة الأصلية والتصميم المعاصر المتطور. يعد سبا ESPA Life من أكبر المنتجعات الصحية في لندن بمساحة تزيد عن 3,300 متر مربع مع مسبح من الفولاذ المقاوم للصدأ وساونا مدرج. يقدم مطعم كيريدج بار آند غريل من توم كيريدج أطباقاً بريطانية كلاسيكية راقية. أجنحة البنتهاوس تطل على بيغ بن وعين لندن ومبنى البرلمان.',
      amenities: ['سبا ESPA', 'توم كيريدج', 'أجنحة بنتهاوس', 'صالة رياضية'],
      insiderTip: 'بنتهاوس هاميلتون هو دوبلكس بمساحة 5,000 قدم مربع مع شرفة خاصة على السطح. يقدم سبا ESPA Life تجربة حمام مستوحاة من الحمام التقليدي وهي محبوبة جداً لدى ضيوف الخليج.',
      gccFeatures: ['علاجات مستوحاة من الحمام في سبا ESPA Life', 'موظفو استقبال وكونسيرج يتحدثون العربية', 'أجنحة عائلية مع مطابخ صغيرة للإقامات الطويلة', 'ترتيبات طعام حلال من خلال خدمة الغرف', 'موقع مركزي في ويستمنستر مع وصول سريع لهارودز بالتاكسي'],
      bestFor: ['عشاق السبا', 'العائلات', 'مسافرو مشاهدة المعالم'],
      website: 'https://www.corinthia.com/london'
    },
    {
      id: '8',
      name: 'كونوت',
      location: 'مايفير',
      area: 'Mayfair',
      rating: 4.9,
      reviews: 1876,
      price: 690,
      image: 'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=600&q=80',
      badge: 'حصري',
      description: 'أناقة هادئة في قلب مايفير، كونوت هو الفندق المفضل لمن يقدرون الخصوصية والذوق الرفيع فوق كل شيء. يعرض مطعم هيلين داروز الحائز على نجمتي ميشلان مأكولات مستوحاة من إقليم الباسك مع مكونات بريطانية موسمية. تم تسمية بار كونوت كأفضل بار في العالم عدة مرات ويقدم كوكتيلات مارتيني مخصصة يتم تحضيرها من عربة لامعة بجانب الطاولة. يجلب سبا آمان فلسفة منتجعات آمان الهادئة إلى وسط لندن. يحتوي الفندق على 121 غرفة فقط مما يمنحه أجواء النادي الخاص.',
      amenities: ['سبا آمان', 'بار كونوت', 'مطعم ميشلان', 'خادم شخصي'],
      insiderTip: 'خدمة الخادم الشخصي في كونوت هي الأكثر تخصيصاً في لندن — سيتذكر خادمك الشخصي تفضيلاتك من الإقامات السابقة. اطلب جناح الشقة لغرفة معيشة ومكتب منفصلين.',
      gccFeatures: ['أجواء خصوصية فائقة يفضلها كبار الشخصيات الخليجية', 'سبا آمان بفلسفة علاجية هادئة', 'خدمة غرف حلال وترتيبات غذائية مخصصة', 'خدمة خادم شخصي يتذكر تفضيلات الضيف عبر الزيارات', 'خطوات من بوتيكات ومعارض ماونت ستريت الفنية'],
      bestFor: ['كبار الشخصيات', 'الأزواج', 'الإقامات الفاخرة الطويلة'],
      website: 'https://www.the-connaught.co.uk'
    },
    {
      id: '9',
      name: 'شانغريلا ذا شارد',
      location: 'لندن بريدج',
      area: 'Southwark',
      rating: 4.7,
      reviews: 3124,
      price: 450,
      image: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=600&q=80',
      badge: 'في السماء',
      description: 'يحتل الطوابق 34 إلى 52 من ذا شارد، أطول مبنى في أوروبا الغربية، وهو العنوان الأكثر دراماتيكية في لندن. كل غرفة من الغرف الـ 202 توفر إطلالات من الأرض حتى السقف تمتد حتى 40 ميلاً عبر العاصمة مع برج لندن وكاتدرائية سانت بول ونهر التايمز أسفلها. مسبح الإنفينيتي في الطابق 52 هو الأعلى في أوروبا الغربية. يقدم مطعم TING في الطابق 35 مأكولات آسيوية شاملة. بار GONG في الطابق 52 أصبح من أكثر وجهات الكوكتيل المرغوبة في لندن. تراث الفندق الآسيوي يعني فهماً فطرياً للضيافة والاهتمام بالتفضيلات الثقافية.',
      amenities: ['مسبح إنفينيتي', 'إطلالة الشارد', 'مطعم TING', 'بار السماء'],
      insiderTip: 'اطلب غرفة تواجه الغرب فوق الطابق 40 لإطلالات الغروب على المدينة والويست إند. مسبح الإنفينيتي يكون أهدأ قبل الثامنة صباحاً — تعال مبكراً للسباحة شبه الخاصة فوق الغيوم.',
      gccFeatures: ['تقليد ضيافة شانغريلا الآسيوي مع حساسية ثقافية', 'خيارات حلال متاحة في مطعم TING وخدمة الغرف', 'سجادات صلاة واتجاه القبلة عند الطلب', 'سوق بورو القريب لطعام الشارع الحلال المتنوع', 'غرف عائلية بإطلالات بانورامية وأسرّة إضافية متوفرة'],
      bestFor: ['الأزواج', 'عشاق التصوير والإنستغرام', 'زوار لندن لأول مرة'],
      website: 'https://www.shangri-la.com/london/shangrila'
    },
    {
      id: '10',
      name: 'بولغاري لندن',
      location: 'نايتسبريدج',
      area: 'Knightsbridge',
      rating: 4.8,
      reviews: 1654,
      price: 780,
      image: 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=600&q=80',
      badge: 'فخامة مطلقة',
      description: 'الحرفية الإيطالية تلتقي بالتراث البريطاني على بعد خطوات من هارودز في نايتسبريدج. يقدم بولغاري لندن تجربة فاخرة لا مثيل لها مع مسبح بطول 25 متراً يضاء بإضاءة مزاجية وسبا بولغاري الحصري الذي يستخدم منتجات العناية الإيطالية الفاخرة. يقدم مطعم سيتا موريزا مأكولات إيطالية أصيلة مع مكونات موسمية من أجود الموردين. يضم الفندق أيضاً سينما خاصة بـ 47 مقعداً وبار بولغاري الأنيق. الأجنحة مصممة بأناقة إيطالية معاصرة مع حمامات رخامية وإطلالات على حدائق نايتسبريدج الهادئة.',
      amenities: ['سبا بولغاري', 'مسبح 25م', 'مطعم إيطالي', 'سينما خاصة'],
      insiderTip: 'اطلب جناح بولغاري مع شرفة مطلة على الحديقة — لا يظهر على الموقع الإلكتروني. السينما الخاصة يمكن حجزها بالكامل لعرض خاص لعائلتك مساءً.',
      gccFeatures: ['موقع متميز على بعد دقيقتين سيراً من هارودز للتسوق الفاخر', 'خيارات طعام حلال متاحة عبر خدمة الغرف والمطعم', 'أجنحة فسيحة مناسبة للعائلات مع خدمة خادم شخصي', 'سبا بولغاري مع علاجات خاصة للأزواج', 'سينما خاصة لأمسيات عائلية حصرية'],
      bestFor: ['عشاق الموضة والتسوق', 'الأزواج', 'محبو التصميم الإيطالي'],
      website: 'https://www.bulgarihotels.com/london'
    },
  ]
}

const text = {
  en: {
    title: 'Luxury Hotels in London',
    subtitle: 'Handpicked 5-star hotels perfect for Arab travellers visiting London',
    search: 'Search hotels...',
    reviews: 'reviews',
    perNight: '/night',
    viewDetails: 'View Details',
    bookNow: 'Book Now',
    areas: ['All Areas', 'Mayfair', 'Westminster', 'Piccadilly', 'Knightsbridge', 'Southwark', 'Marylebone'],
    metaNote: 'Prices shown are approximate starting rates and may vary by season.'
  },
  ar: {
    title: 'فنادق فاخرة في لندن',
    subtitle: 'فنادق 5 نجوم مختارة بعناية مثالية للمسافرين العرب الذين يزورون لندن',
    search: 'ابحث في الفنادق...',
    reviews: 'تقييم',
    perNight: '/ليلة',
    viewDetails: 'عرض التفاصيل',
    bookNow: 'احجز الآن',
    areas: ['جميع المناطق', 'مايفير', 'ويستمنستر', 'بيكاديلي', 'نايتسبريدج', 'ساوثوارك', 'ماريليبون'],
    metaNote: 'الأسعار المعروضة هي أسعار تقريبية وقد تختلف حسب الموسم.'
  }
}

const areaMap: Record<string, string> = {
  'Mayfair': 'Mayfair',
  'Westminster': 'Westminster',
  'Piccadilly': 'Piccadilly',
  'Knightsbridge': 'Knightsbridge',
  'Southwark': 'Southwark',
  'Marylebone': 'Marylebone',
}

export default function HotelsPage({ serverLocale }: { serverLocale?: 'en' | 'ar' }) {
  const { language: clientLanguage } = useLanguage()
  const locale = (serverLocale ?? clientLanguage ?? 'en') as 'en' | 'ar'
  const isRTL = locale === 'ar'
  const t = text[locale]

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedArea, setSelectedArea] = useState('All Areas')
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null)

  const areaKeys = Object.keys(areaMap)
  const selectedAreaKey = t.areas.indexOf(selectedArea) > 0 ? areaKeys[t.areas.indexOf(selectedArea) - 1] : null

  const filteredHotels = hotels[locale].filter(hotel => {
    const matchesSearch = !searchQuery || hotel.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesArea = !selectedAreaKey || hotel.area === selectedAreaKey
    return matchesSearch && matchesArea
  })

  return (
    <div className={`bg-yl-cream ${isRTL ? 'font-arabic' : 'font-body'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Hero Section */}
      <section className="relative pb-14 pt-28 bg-gradient-to-b from-yl-dark-navy to-yl-dark-navy-light overflow-hidden">
        <WatermarkStamp />
        <div className="relative z-10 max-w-7xl mx-auto px-7 text-center">
          <Breadcrumbs
            items={[
              { label: isRTL ? 'الرئيسية' : 'Home', href: '/' },
              { label: isRTL ? 'فنادق' : 'Hotels' },
            ]}
            className="justify-center mb-6 text-yl-gray-400"
          />
          <SectionLabel>{isRTL ? 'إقامات فاخرة' : 'Luxury Stays'}</SectionLabel>
          <h1 className={`text-4xl md:text-5xl font-heading font-bold text-yl-parchment mb-4 ${isRTL ? 'font-arabic' : ''}`}>{t.title}</h1>
          <p className="font-body text-lg text-yl-gray-400 mb-8 max-w-2xl mx-auto">{t.subtitle}</p>

          {/* Search Bar */}
          <div className="max-w-xl mx-auto relative">
            <Search className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-5 h-5 text-yl-gray-500`} />
            <input
              type="text"
              placeholder={t.search}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full ${isRTL ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-4 rounded-full text-lg font-body focus:outline-none focus:ring-2 focus:ring-yl-gold`}
            />
          </div>
        </div>
      </section>

      <TriBar />

      {/* FTC Affiliate Disclosure */}
      <div className="bg-yl-cream/60 border-b border-yl-gray-200">
        <p className="max-w-7xl mx-auto px-7 py-2.5 text-[11px] text-yl-gray-500 leading-relaxed">
          {locale === 'ar'
            ? 'تحتوي هذه الصفحة على روابط تابعة. قد نحصل على عمولة عند الحجز من خلال روابطنا، دون أي تكلفة إضافية عليك.'
            : 'This page contains affiliate links. We may earn a commission when you book through our links, at no extra cost to you.'}
        </p>
      </div>

      {/* Editorial Intro Section */}
      <section className="py-12 bg-white">
        <div className="max-w-4xl mx-auto px-7">
          <h2 className={`text-3xl font-heading font-bold text-yl-charcoal mb-6 text-center ${isRTL ? 'font-arabic' : ''}`}>
            {locale === 'en'
              ? "London's Finest Hotels for Arab Travellers"
              : 'أفضل فنادق لندن للمسافرين العرب'}
          </h2>
          <div className="space-y-4 font-body text-base text-yl-gray-600 leading-relaxed">
            {locale === 'en' ? (
              <>
                <p>
                  London has long been one of the most beloved destinations for Arab travellers, and its luxury hotel scene reflects this deep connection. From the gilded lobbies of Mayfair to the sky-high suites of The Shard, the capital offers an extraordinary range of five-star accommodations that cater specifically to the needs and expectations of guests from the Gulf and wider Arab world. Many of these properties employ Arabic-speaking staff, offer halal room service options, and are located within walking distance of mosques and prayer facilities.
                </p>
                <p>
                  The hotels we have selected represent the very best of London hospitality. Each property has been personally evaluated for its suitability for Arab visitors — considering factors like proximity to halal restaurants in Mayfair and Knightsbridge, the availability of Arabic television channels, family-friendly suite configurations, and concierge teams experienced in arranging services for Gulf visitors. Whether you are visiting for Eid, a summer family holiday, or a shopping trip to Harrods and Selfridges, these hotels deliver an experience that feels both authentically British and genuinely welcoming.
                </p>
                <p>
                  Booking during peak Gulf travel season (June through August and around Eid al-Fitr) requires advance planning, as London&apos;s top hotels fill quickly with visitors from Saudi Arabia, the UAE, Kuwait, and Qatar. We recommend securing your reservation at least six to eight weeks ahead. Several of these hotels also offer dedicated Ramadan packages with suhoor and iftar dining arrangements.
                </p>
              </>
            ) : (
              <>
                <p>
                  لطالما كانت لندن واحدة من أكثر الوجهات المحبوبة للمسافرين العرب، ومشهد الفنادق الفاخرة فيها يعكس هذا الارتباط العميق. من ردهات مايفير المذهبة إلى الأجنحة المرتفعة في ذا شارد، تقدم العاصمة مجموعة استثنائية من أماكن الإقامة ذات الخمس نجوم التي تلبي احتياجات وتوقعات الضيوف القادمين من الخليج والعالم العربي. توظف العديد من هذه الفنادق موظفين يتحدثون العربية، وتقدم خيارات خدمة الغرف الحلال، وتقع على مسافة قريبة من المساجد ومرافق الصلاة.
                </p>
                <p>
                  تمثل الفنادق التي اخترناها أفضل ما في ضيافة لندن. تم تقييم كل فندق شخصياً من حيث ملاءمته للزوار العرب — مع مراعاة عوامل مثل القرب من المطاعم الحلال في مايفير ونايتسبريدج، وتوفر القنوات التلفزيونية العربية، وتصميمات الأجنحة المناسبة للعائلات، وفرق الكونسيرج ذوي الخبرة في ترتيب الخدمات لزوار الخليج. سواء كنت تزور في العيد أو في إجازة صيفية عائلية أو رحلة تسوق إلى هارودز وسيلفريدجز، تقدم هذه الفنادق تجربة بريطانية أصيلة ومرحبة حقاً.
                </p>
                <p>
                  يتطلب الحجز خلال موسم السفر الخليجي (من يونيو إلى أغسطس وحول عيد الفطر) تخطيطاً مسبقاً، حيث تمتلئ أفضل فنادق لندن بسرعة بالزوار من السعودية والإمارات والكويت وقطر. نوصي بتأمين حجزك قبل ستة إلى ثمانية أسابيع على الأقل. تقدم العديد من هذه الفنادق أيضاً باقات رمضان مخصصة مع ترتيبات السحور والإفطار.
                </p>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Area Filter */}
      <div className="bg-white border-b border-yl-gray-200 py-4 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-7">
          <div className="flex items-center gap-3 overflow-x-auto pb-2">
            {t.areas.map((area) => (
              <button
                key={area}
                onClick={() => setSelectedArea(area)}
                className={`px-4 py-2 rounded-full font-mono text-[11px] tracking-wider uppercase whitespace-nowrap transition-all duration-300 ease-yl ${
                  selectedArea === area
                    ? 'bg-yl-dark-navy text-yl-parchment'
                    : 'bg-yl-gray-100 text-yl-gray-500 hover:bg-yl-gray-200 hover:text-yl-charcoal'
                }`}
              >
                {area}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Hotels Grid */}
      <div className="max-w-7xl mx-auto px-7 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredHotels.map((hotel) => (
            <BrandCardLight key={hotel.id} className="overflow-hidden group">
              <div className="relative h-56">
                <Image src={hotel.image} alt={hotel.name} fill sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover group-hover:scale-105 transition-transform duration-500 ease-yl" />
                <span className={`absolute top-3 ${isRTL ? 'right-3' : 'left-3'}`}>
                  <BrandTag color="blue">{hotel.badge}</BrandTag>
                </span>
              </div>
              <div className="p-6">
                {/* Rating */}
                <div className="flex items-center gap-1 mb-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-yl-gold fill-yl-gold" />
                  ))}
                  <span className="font-mono text-[11px] text-yl-gray-500 tracking-wider ml-2">{hotel.rating} ({hotel.reviews.toLocaleString()} {t.reviews})</span>
                </div>

                {/* Name & Location */}
                <h3 className={`text-xl font-heading font-bold text-yl-charcoal mb-1 line-clamp-1 group-hover:text-yl-red transition-colors duration-300 ease-yl ${isRTL ? 'font-arabic' : ''}`}>{hotel.name}</h3>
                <p className="font-body text-sm text-yl-gray-500 flex items-center gap-1.5 mb-3">
                  <MapPin className="w-3.5 h-3.5 text-yl-gold" /> {hotel.location}
                </p>

                {/* Description */}
                <p className="font-body text-sm text-yl-gray-500 mb-4 line-clamp-3 leading-relaxed">{hotel.description}</p>

                {/* Amenities */}
                <div className="flex flex-wrap gap-2 mb-5">
                  {hotel.amenities.map((amenity) => (
                    <BrandTag key={amenity} color="neutral">{amenity}</BrandTag>
                  ))}
                </div>

                {/* Price & CTA */}
                <div className="flex items-center justify-between pt-4 border-t border-yl-gray-200">
                  <div>
                    <span className="font-mono text-[11px] text-yl-gray-500 tracking-wider uppercase">{locale === 'en' ? 'From' : 'من'} </span>
                    <span className="text-2xl font-heading font-bold text-yl-charcoal">£{hotel.price}</span>
                    <span className="font-mono text-[11px] text-yl-gray-500 tracking-wider">{t.perNight}</span>
                  </div>
                  {(() => {
                    const affLink = getPageAffiliateLink(hotel.name, 'hotel', 'yalla-london', 'hotels-page');
                    // Always track through /api/affiliate/click — even when no affiliate partner matched
                    const href = affLink?.url || `/api/affiliate/click?url=${encodeURIComponent(hotel.website)}&partner=direct&article=hotels-page&name=${encodeURIComponent(hotel.name)}`;
                    const rel = 'noopener sponsored';
                    return (
                      <a
                        href={href}
                        target="_blank"
                        rel={rel}
                        className={`${affLink ? 'affiliate-page-link' : ''}`}
                        data-affiliate-partner={affLink?.partner || undefined}
                      >
                        <BrandButton variant="primary" size="sm" className="pointer-events-none">
                          {affLink ? affLink.label : t.bookNow}
                        </BrandButton>
                      </a>
                    );
                  })()}
                </div>
              </div>
            </BrandCardLight>
          ))}
        </div>

        {/* Price disclaimer */}
        <p className="font-mono text-[11px] text-yl-gray-500 text-center mt-10 tracking-wider uppercase">{t.metaNote}</p>
      </div>

      {/* Tips for Arab Travellers Section */}
      <section className="py-12 bg-yl-cream">
        <div className="max-w-7xl mx-auto px-7">
          <SectionLabel>{isRTL ? 'نصائح السفر' : 'Travel Tips'}</SectionLabel>
          <h2 className={`text-3xl font-heading font-bold text-yl-charcoal mb-8 text-center ${isRTL ? 'font-arabic' : ''}`}>
            {locale === 'en'
              ? 'Essential Tips for Arab Travellers'
              : 'نصائح أساسية للمسافرين العرب'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Tip 1: Prayer Facilities */}
            <BrandCardLight className="p-6">
              <div className="text-3xl mb-3">🕌</div>
              <h3 className={`text-lg font-heading font-bold text-yl-charcoal mb-2 ${isRTL ? 'font-arabic' : ''}`}>
                {locale === 'en' ? 'Prayer Facilities Near Hotels' : 'مرافق الصلاة بالقرب من الفنادق'}
              </h3>
              <p className="font-body text-sm text-yl-gray-600 leading-relaxed">
                {locale === 'en'
                  ? 'London Central Mosque in Regent\'s Park is accessible from most Mayfair and Marylebone hotels within 15 minutes. Hotels in Knightsbridge are close to the Ismaili Centre in South Kensington. Many luxury hotels also provide prayer mats and qibla direction cards upon request — simply ask the concierge at check-in.'
                  : 'يمكن الوصول إلى مسجد لندن المركزي في ريجنتس بارك من معظم فنادق مايفير وماريليبون في غضون 15 دقيقة. فنادق نايتسبريدج قريبة من المركز الإسماعيلي في ساوث كنسنغتون. توفر العديد من الفنادق الفاخرة أيضاً سجادات صلاة وبطاقات اتجاه القبلة عند الطلب — اسأل الكونسيرج عند تسجيل الوصول.'}
              </p>
            </BrandCardLight>

            {/* Tip 2: Halal Dining */}
            <BrandCardLight className="p-6">
              <div className="text-3xl mb-3">🍽️</div>
              <h3 className={`text-lg font-heading font-bold text-yl-charcoal mb-2 ${isRTL ? 'font-arabic' : ''}`}>
                {locale === 'en' ? 'Halal Dining in Mayfair & Knightsbridge' : 'المطاعم الحلال في مايفير ونايتسبريدج'}
              </h3>
              <p className="font-body text-sm text-yl-gray-600 leading-relaxed">
                {locale === 'en'
                  ? 'Mayfair and Knightsbridge offer London\'s highest concentration of halal-friendly fine dining. Novikov Restaurant, Zuma, Nusr-Et Steakhouse, and Hakkasan all serve halal meat. Edgware Road, a short taxi ride away, is home to dozens of Arabic restaurants serving Lebanese, Egyptian, and Gulf cuisine until late.'
                  : 'تقدم مايفير ونايتسبريدج أعلى تركيز للمطاعم الحلال الراقية في لندن. مطعم نوفيكوف وزوما ونصرت ستيك هاوس وهاكاسان جميعها تقدم لحوماً حلال. شارع إدجوير رود، على بعد رحلة تاكسي قصيرة، يضم عشرات المطاعم العربية التي تقدم المأكولات اللبنانية والمصرية والخليجية حتى ساعة متأخرة.'}
              </p>
            </BrandCardLight>

            {/* Tip 3: Best Booking Times */}
            <BrandCardLight className="p-6">
              <div className="text-3xl mb-3">📅</div>
              <h3 className={`text-lg font-heading font-bold text-yl-charcoal mb-2 ${isRTL ? 'font-arabic' : ''}`}>
                {locale === 'en' ? 'Best Booking Times for Gulf Visitors' : 'أفضل أوقات الحجز لزوار الخليج'}
              </h3>
              <p className="font-body text-sm text-yl-gray-600 leading-relaxed">
                {locale === 'en'
                  ? 'Peak season for Gulf travellers runs from June to August and during Eid al-Fitr and Eid al-Adha. Hotel rates can be 30-50% higher during these periods. For the best rates, book 6-8 weeks in advance or consider shoulder season months like May or September when London weather is pleasant and rates are lower.'
                  : 'يمتد موسم الذروة للمسافرين الخليجيين من يونيو إلى أغسطس وخلال عيد الفطر وعيد الأضحى. قد ترتفع أسعار الفنادق بنسبة 30-50% خلال هذه الفترات. للحصول على أفضل الأسعار، احجز قبل 6-8 أسابيع أو فكر في أشهر الموسم المتوسط مثل مايو أو سبتمبر عندما يكون طقس لندن لطيفاً والأسعار أقل.'}
              </p>
            </BrandCardLight>

            {/* Tip 4: Arabic-Speaking Concierge */}
            <BrandCardLight className="p-6">
              <div className="text-3xl mb-3">🗣️</div>
              <h3 className={`text-lg font-heading font-bold text-yl-charcoal mb-2 ${isRTL ? 'font-arabic' : ''}`}>
                {locale === 'en' ? 'Arabic-Speaking Concierge Availability' : 'توفر كونسيرج يتحدث العربية'}
              </h3>
              <p className="font-body text-sm text-yl-gray-600 leading-relaxed">
                {locale === 'en'
                  ? 'Most five-star hotels in Mayfair and Park Lane employ Arabic-speaking staff, particularly during summer months. The Dorchester, Four Seasons Park Lane, and Corinthia London are known for their dedicated Arab guest services. When booking, request an Arabic-speaking liaison to be assigned to your stay for a smoother experience.'
                  : 'توظف معظم فنادق الخمس نجوم في مايفير وبارك لين موظفين يتحدثون العربية، خاصة خلال أشهر الصيف. يشتهر فندق دورتشستر وفور سيزونز بارك لين وكورينثيا لندن بخدماتهم المخصصة للضيوف العرب. عند الحجز، اطلب تعيين منسق يتحدث العربية لإقامتك لتجربة أكثر سلاسة.'}
              </p>
            </BrandCardLight>

            {/* Tip 5: Airport Transfers */}
            <BrandCardLight className="p-6">
              <div className="text-3xl mb-3">✈️</div>
              <h3 className={`text-lg font-heading font-bold text-yl-charcoal mb-2 ${isRTL ? 'font-arabic' : ''}`}>
                {locale === 'en' ? 'Airport Transfer Services' : 'خدمات النقل من المطار'}
              </h3>
              <p className="font-body text-sm text-yl-gray-600 leading-relaxed">
                {locale === 'en'
                  ? 'All hotels featured here offer luxury airport transfer services, typically using Mercedes S-Class or Rolls-Royce vehicles. Heathrow Terminal 4 and 5 handle most Gulf carrier flights (Emirates, Qatar Airways, Etihad, Saudia). Journey time to Mayfair is approximately 45-60 minutes. Book your transfer through the hotel concierge for meet-and-greet service at arrivals.'
                  : 'تقدم جميع الفنادق المعروضة هنا خدمات نقل فاخرة من المطار، عادة باستخدام سيارات مرسيدس إس-كلاس أو رولز رويس. يتعامل مبنى 4 و5 في هيثرو مع معظم رحلات الناقلات الخليجية (الإمارات، القطرية، الاتحاد، السعودية). وقت الرحلة إلى مايفير حوالي 45-60 دقيقة. احجز النقل عبر كونسيرج الفندق لخدمة الاستقبال عند الوصول.'}
              </p>
            </BrandCardLight>

            {/* Tip 6: Tipping Etiquette */}
            <BrandCardLight className="p-6">
              <div className="text-3xl mb-3">💷</div>
              <h3 className={`text-lg font-heading font-bold text-yl-charcoal mb-2 ${isRTL ? 'font-arabic' : ''}`}>
                {locale === 'en' ? 'Tipping Etiquette in UK Hotels' : 'آداب البقشيش في فنادق بريطانيا'}
              </h3>
              <p className="font-body text-sm text-yl-gray-600 leading-relaxed">
                {locale === 'en'
                  ? 'Tipping in London hotels is appreciated but not obligatory — service charges are often included. A general guideline: £5-10 for porters per bag, £5-10 per day for housekeeping, 10-15% at hotel restaurants if service is not included, and £10-20 for exceptional concierge assistance. Cash tips in pounds sterling are preferred over card tips.'
                  : 'البقشيش في فنادق لندن موضع تقدير لكنه ليس إلزامياً — غالباً ما تكون رسوم الخدمة مشمولة. إرشادات عامة: 5-10 جنيهات لحاملي الحقائب لكل حقيبة، 5-10 جنيهات يومياً لخدمة الغرف، 10-15% في مطاعم الفندق إذا لم تكن الخدمة مشمولة، و10-20 جنيهاً لمساعدة الكونسيرج الاستثنائية. يُفضل البقشيش النقدي بالجنيه الإسترليني.'}
              </p>
            </BrandCardLight>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-12 bg-white">
        <div className="max-w-3xl mx-auto px-7">
          <SectionLabel>{isRTL ? 'أسئلة شائعة' : 'FAQ'}</SectionLabel>
          <h2 className={`text-3xl font-heading font-bold text-yl-charcoal mb-8 text-center ${isRTL ? 'font-arabic' : ''}`}>
            {locale === 'en'
              ? 'Frequently Asked Questions'
              : 'الأسئلة الشائعة'}
          </h2>
          <div className="space-y-3">
            {[
              {
                q: locale === 'en' ? 'Which London hotels offer halal room service?' : 'أي فنادق لندن تقدم خدمة غرف حلال؟',
                a: locale === 'en'
                  ? 'The Dorchester, Four Seasons Park Lane, Corinthia London, and Shangri-La The Shard all offer halal room service options. The Dorchester is particularly well-regarded for its halal menu, which includes dishes prepared in a dedicated halal kitchen. At other hotels, halal options may be available upon advance request — we recommend contacting the concierge at least 48 hours before arrival to confirm arrangements.'
                  : 'يقدم فندق دورتشستر وفور سيزونز بارك لين وكورينثيا لندن وشانغريلا ذا شارد جميعها خيارات خدمة غرف حلال. يشتهر دورتشستر بشكل خاص بقائمته الحلال التي تشمل أطباقاً محضرة في مطبخ حلال مخصص. في الفنادق الأخرى، قد تتوفر خيارات حلال عند الطلب المسبق — نوصي بالتواصل مع الكونسيرج قبل 48 ساعة على الأقل من الوصول.',
              },
              {
                q: locale === 'en' ? 'Are there luxury hotels near mosques in London?' : 'هل توجد فنادق فاخرة قريبة من المساجد في لندن؟',
                a: locale === 'en'
                  ? 'Yes. Hotels in Mayfair and Marylebone (The Dorchester, Claridge\'s, The Langham, The Connaught) are all within a 15-minute drive of London Central Mosque in Regent\'s Park, the largest mosque in the UK. Hotels near Knightsbridge (Bulgari, Four Seasons) are close to the Ismaili Centre. The East London Mosque in Whitechapel is accessible from Shangri-La The Shard in under 10 minutes by taxi.'
                  : 'نعم. فنادق مايفير وماريليبون (دورتشستر، كلاريدجز، لانغهام، كونوت) كلها على بعد 15 دقيقة بالسيارة من مسجد لندن المركزي في ريجنتس بارك، أكبر مسجد في بريطانيا. فنادق نايتسبريدج (بولغاري، فور سيزونز) قريبة من المركز الإسماعيلي. يمكن الوصول إلى مسجد شرق لندن في وايت تشابل من شانغريلا ذا شارد في أقل من 10 دقائق بالتاكسي.',
              },
              {
                q: locale === 'en' ? 'What is the best area to stay for shopping?' : 'ما هي أفضل منطقة للإقامة بالقرب من التسوق؟',
                a: locale === 'en'
                  ? 'For shopping, Knightsbridge and Mayfair are the two best areas. Knightsbridge puts you steps from Harrods and Harvey Nichols, while Mayfair places you near Bond Street, Mount Street, and the Burlington Arcade. Bulgari Hotel is ideal for Harrods shoppers, while Claridge\'s and The Connaught are perfectly positioned for Bond Street and the designer boutiques of Mayfair. Oxford Street is easily reached from hotels in Marylebone, particularly The Langham.'
                  : 'للتسوق، نايتسبريدج ومايفير هما أفضل منطقتين. نايتسبريدج تضعك على بعد خطوات من هارودز وهارفي نيكولز، بينما مايفير تضعك بالقرب من شارع بوند وشارع ماونت وممر بيرلينغتون. فندق بولغاري مثالي لمتسوقي هارودز، بينما كلاريدجز وكونوت في موقع مثالي لشارع بوند وبوتيكات المصممين في مايفير. يمكن الوصول بسهولة إلى شارع أكسفورد من فنادق ماريليبون، خاصة لانغهام.',
              },
              {
                q: locale === 'en' ? 'Do London hotels provide prayer mats and qibla direction?' : 'هل توفر فنادق لندن سجادات صلاة واتجاه القبلة؟',
                a: locale === 'en'
                  ? 'Most five-star London hotels can provide prayer mats upon request. The Dorchester and Four Seasons Park Lane keep them readily available for guests. For qibla direction, some hotels place directional stickers inside wardrobes or nightstands. If not available in your room, the concierge desk can provide this information. You can also use smartphone compass apps that indicate qibla direction from your exact location.'
                  : 'يمكن لمعظم فنادق لندن ذات الخمس نجوم توفير سجادات صلاة عند الطلب. يحتفظ فندق دورتشستر وفور سيزونز بارك لين بها جاهزة للضيوف. بالنسبة لاتجاه القبلة، تضع بعض الفنادق ملصقات اتجاه داخل الخزائن أو طاولات السرير. إذا لم تكن متوفرة في غرفتك، يمكن لمكتب الكونسيرج تقديم هذه المعلومات. يمكنك أيضاً استخدام تطبيقات البوصلة على الهاتف التي تشير إلى اتجاه القبلة من موقعك.',
              },
              {
                q: locale === 'en' ? "What is the best time to visit London?" : 'ما هو أفضل وقت لزيارة لندن؟',
                a: locale === 'en'
                  ? 'London is a year-round destination, but the best months for Gulf visitors are May through September when days are long and temperatures are mild (18-25°C). July and August coincide with school holidays in the Gulf, making it ideal for family trips. Spring (April-May) offers beautiful parks and fewer crowds. Ramadan timing varies yearly — London hotels increasingly offer suhoor and iftar services. Winter (November-January) brings festive decorations, Christmas markets at Hyde Park, and the Harrods winter sale.'
                  : 'لندن وجهة على مدار العام، لكن أفضل الأشهر لزوار الخليج هي من مايو إلى سبتمبر عندما تكون الأيام طويلة ودرجات الحرارة معتدلة (18-25 درجة مئوية). يتزامن يوليو وأغسطس مع العطلة المدرسية في الخليج، مما يجعله مثالياً للرحلات العائلية. الربيع (أبريل-مايو) يقدم حدائق جميلة وزحام أقل. يختلف توقيت رمضان سنوياً — تقدم فنادق لندن بشكل متزايد خدمات السحور والإفطار. الشتاء (نوفمبر-يناير) يجلب الزينة الاحتفالية وأسواق الكريسماس في هايد بارك وتخفيضات هارودز الشتوية.',
              },
            ].map((faq, index) => (
              <div key={index} className="border border-yl-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
                  className={`w-full flex items-center justify-between p-5 text-left bg-white hover:bg-yl-cream/50 transition-colors ${isRTL ? 'text-right' : ''}`}
                >
                  <span className={`font-heading font-bold text-yl-charcoal ${isRTL ? 'font-arabic' : ''}`}>{faq.q}</span>
                  {openFaqIndex === index ? (
                    <ChevronUp className="w-5 h-5 text-yl-gold flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-yl-gray-400 flex-shrink-0" />
                  )}
                </button>
                {openFaqIndex === index && (
                  <div className="px-5 pb-5 font-body text-sm text-yl-gray-600 leading-relaxed border-t border-yl-gray-100">
                    <p className="pt-4">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cross-Links Section */}
      <section className="py-12 bg-yl-cream">
        <div className="max-w-7xl mx-auto px-7">
          <h2 className={`text-3xl font-heading font-bold text-yl-charcoal mb-8 text-center ${isRTL ? 'font-arabic' : ''}`}>
            {locale === 'en' ? 'Explore More' : 'اكتشف المزيد'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link href="/experiences" className="block group">
              <BrandCardLight className="p-6 h-full transition-shadow hover:shadow-lg">
                <div className="text-3xl mb-3">🎭</div>
                <h3 className={`text-lg font-heading font-bold text-yl-charcoal mb-2 group-hover:text-yl-red transition-colors ${isRTL ? 'font-arabic' : ''}`}>
                  {locale === 'en' ? 'London Experiences' : 'تجارب لندن'}
                </h3>
                <p className="font-body text-sm text-yl-gray-600 leading-relaxed">
                  {locale === 'en'
                    ? 'Discover curated luxury experiences in London — from private Thames river cruises to exclusive backstage tours at the Royal Opera House and bespoke shopping appointments.'
                    : 'اكتشف تجارب فاخرة مختارة في لندن — من رحلات نهر التايمز الخاصة إلى جولات خلف الكواليس في دار الأوبرا الملكية ومواعيد التسوق المخصصة.'}
                </p>
              </BrandCardLight>
            </Link>
            <Link href="/recommendations" className="block group">
              <BrandCardLight className="p-6 h-full transition-shadow hover:shadow-lg">
                <div className="text-3xl mb-3">⭐</div>
                <h3 className={`text-lg font-heading font-bold text-yl-charcoal mb-2 group-hover:text-yl-red transition-colors ${isRTL ? 'font-arabic' : ''}`}>
                  {locale === 'en' ? 'Our Recommendations' : 'توصياتنا'}
                </h3>
                <p className="font-body text-sm text-yl-gray-600 leading-relaxed">
                  {locale === 'en'
                    ? 'Our editorial team\'s hand-picked recommendations for restaurants, attractions, day trips, and hidden gems that make a London visit truly memorable for Arab travellers.'
                    : 'توصيات فريقنا التحريري المختارة بعناية للمطاعم والمعالم السياحية والرحلات اليومية والجواهر المخفية التي تجعل زيارة لندن لا تُنسى حقاً للمسافرين العرب.'}
                </p>
              </BrandCardLight>
            </Link>
            <Link href="/information" className="block group">
              <BrandCardLight className="p-6 h-full transition-shadow hover:shadow-lg">
                <div className="text-3xl mb-3">📖</div>
                <h3 className={`text-lg font-heading font-bold text-yl-charcoal mb-2 group-hover:text-yl-red transition-colors ${isRTL ? 'font-arabic' : ''}`}>
                  {locale === 'en' ? 'Travel Information' : 'معلومات السفر'}
                </h3>
                <p className="font-body text-sm text-yl-gray-600 leading-relaxed">
                  {locale === 'en'
                    ? 'Everything you need to know before visiting London — visa requirements for GCC nationals, currency exchange tips, transport guides, weather expectations, and essential contact numbers.'
                    : 'كل ما تحتاج معرفته قبل زيارة لندن — متطلبات التأشيرة لمواطني الخليج، نصائح صرف العملات، أدلة النقل، توقعات الطقس، وأرقام الاتصال الأساسية.'}
                </p>
              </BrandCardLight>
            </Link>
          </div>
        </div>
      </section>

      <AffiliateDisclosure language={locale} className="mx-auto max-w-6xl px-4" />
      <TriBar />
    </div>
  )
}
