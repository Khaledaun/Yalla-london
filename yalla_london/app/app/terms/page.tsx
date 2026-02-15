'use client'

import { useLanguage } from '@/components/language-provider'
import { getTranslation } from '@/lib/i18n'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const content = {
  en: {
    title: 'Terms of Use',
    lastUpdated: 'Last updated',
    intro: 'Welcome to Yalla London, operated by Zenitha.Luxury LLC ("Company", "we", "us", or "our"). By accessing and using our website at yallalondon.com (the "Website"), you agree to be bound by these Terms of Use. If you do not agree with any part of these terms, please do not use our Website. These terms apply to all visitors, users, and subscribers regardless of language preference.',

    aboutTitle: 'About Our Service',
    aboutIntro: 'Yalla London is a bilingual (English/Arabic) luxury London travel guide providing curated, editorially independent content:',
    aboutItems: [
      'We provide curated recommendations for London hotels, restaurants, attractions, experiences, and events. Our editorial team personally vets each recommendation through first-hand visits and research before it appears on our Website',
      'We publish informational articles, neighbourhood guides, practical travel advice, seasonal guides, and long-form features about London lifestyle and culture through our "London Stories" blog',
      'We maintain a comprehensive information hub covering trip planning, transportation, attractions, food, family activities, hidden gems, and practical information for London visitors',
      'We list and link to upcoming events and experiences in London, including concerts, exhibitions, sporting events, theatre, and cultural happenings, with ticketing links to partner platforms',
      'We offer digital travel documents and e-documents for purchase through our shop, designed to help visitors plan and organise their London trips',
      'All content is available in both English and Arabic, reflecting our mission to serve Arabic-speaking travellers discovering London as well as the broader international audience',
    ],

    affiliateTitle: 'Affiliate Relationships',
    affiliateIntro: 'Yalla London earns revenue through affiliate partnerships. We believe in full transparency about how this works:',
    affiliateItems: [
      'We participate in affiliate programmes with Booking.com, Expedia, HalalBooking, GetYourGuide, Viator, StubHub, Ticketmaster, Klook, Skyscanner, Blacklane, Allianz Travel Insurance, and select hotel and restaurant booking platforms. When you click an affiliate link on our Website and complete a purchase or booking on the partner platform, we earn a commission from that partner',
      'Affiliate commissions never affect the price you pay. You pay the same price whether you arrive at a partner site through our link or directly. In some cases, our partnerships may give you access to exclusive offers or discounts',
      'Our editorial recommendations are completely independent of our affiliate relationships. We select venues, experiences, and services to feature based on quality, personal experience, and editorial merit. We will never recommend a venue or experience solely because it offers higher commission',
      'Pages that contain affiliate links include a disclosure notice. Affiliate links within our content may be identified through standard URL parameters. We encourage you to be aware that clicking outbound links in our recommendations and event listings may be affiliate links',
      'Affiliate revenue is essential to sustaining Yalla London as a free resource. It funds our editorial team, venue research, photography, content production, and the bilingual infrastructure that makes our service unique',
    ],

    accuracyTitle: 'Content Accuracy',
    accuracyIntro: 'We work hard to keep our content accurate and current, but London is a dynamic city. Please understand the following:',
    accuracyItems: [
      'London businesses change frequently: restaurants update menus and prices, attractions adjust opening hours and admission fees, hotels renovate and rebrand, and venues close permanently. While we update our content regularly, we cannot guarantee real-time accuracy of all details',
      'Users should always verify critical details directly with venues before visiting, including current opening hours, pricing, dress codes, reservation requirements, accessibility provisions, and availability. This is especially important for information that is time-sensitive',
      'Event listings and ticket links are provided for informational purposes. Event details (dates, times, lineups, pricing) are subject to change by event organisers and ticketing platforms. We are not responsible for changes made by event organisers after publication',
      'Restaurant and hotel recommendations reflect our editorial assessment at the time of publication or most recent update. Quality, service, and management at any venue can change over time',
      'Yalla London is not liable for any losses, disappointments, or inconveniences arising from outdated or inaccurate information on our Website. We provide content for informational and inspirational purposes to help you discover London',
    ],

    userTitle: 'User Responsibilities',
    userIntro: 'By using our Website, you agree to the following responsibilities:',
    userItems: [
      'Use our Website lawfully and in accordance with these Terms of Use. Do not use our Website for any purpose that is illegal under the laws of England and Wales or any applicable jurisdiction',
      'Do not scrape, crawl, or use automated tools to extract content from our Website. Our articles, guides, recommendations, and images are protected by copyright and intended for individual personal use only',
      'Do not reproduce, redistribute, republish, or commercially exploit our content without prior written permission from Yalla London. This includes copying articles, guides, or images to other websites, social media accounts, or publications',
      'Provide truthful and accurate information when submitting contact forms, signing up for our newsletter, or otherwise communicating with us. Do not impersonate another person or entity',
      'Do not attempt to interfere with, disrupt, or compromise the security or functionality of our Website, including its servers, databases, or connected networks',
      'Respect the experience of other users. Do not transmit spam, malicious code, phishing attempts, or any content intended to deceive or harm through any communication channel we provide',
    ],

    ipTitle: 'Intellectual Property',
    ipOurContentTitle: 'Our Content and Brand',
    ipOurContentIntro: 'All intellectual property on this Website belongs to Yalla London unless otherwise stated:',
    ipOurContentItems: [
      'All written content, including articles, guides, recommendations, descriptions, and reviews, is original work created by the Yalla London editorial team and protected by copyright. Unauthorised reproduction is prohibited',
      'The YALLA [LDN] brand, including the name "Yalla London", all logos, wordmarks, and visual brand elements, is the proprietary property of Yalla London. You may not use our brand assets without written permission',
      'Our v2 brand system is proprietary, including the specific use of Anybody, Source Serif 4, and IBM Plex Mono typography; the tri-colour bar design element; the boarding pass visual motif; and the overall visual identity. These elements may not be replicated or adapted',
      'Photographs and images on our Website are either owned by Yalla London, licensed for our use, or used with attribution. They may not be downloaded, reproduced, or used elsewhere without permission',
      'The bilingual (English/Arabic) content, translations, and the structural approach to our dual-language experience represent significant editorial investment and are protected as original works',
    ],
    ipUserContentTitle: 'User-Submitted Content',
    ipUserContentItems: [
      'Any content you submit to us through contact forms, emails, or other communication channels (feedback, suggestions, questions) may be used by Yalla London to improve our services without restriction or compensation',
      'You warrant that any content you submit is your own original work or that you have the right to share it, and that it does not infringe on any third party\'s intellectual property rights',
      'We reserve the right not to respond to or act upon any user-submitted content at our discretion',
    ],

    digitalTitle: 'Digital Products and E-Documents',
    digitalIntro: 'Our shop offers digital travel documents and e-documents. The following terms apply to all digital product purchases:',
    digitalItems: [
      'Digital products purchased from Yalla London are for personal, non-commercial use only. You may not resell, redistribute, share publicly, or commercially exploit any digital product purchased from us',
      'All digital product sales are final. Due to the nature of digital goods, we do not offer refunds once a product has been delivered. By completing your purchase, you acknowledge and accept this no-refund policy',
      'Digital products are delivered instantly via email to the address you provide at checkout. It is your responsibility to ensure you provide a valid and accessible email address. Check your spam/junk folder if you do not receive your product',
      'Yalla London retains all intellectual property rights in digital products. Your purchase grants you a personal licence to use the product, not ownership of the underlying content or design',
      'We reserve the right to update digital products after purchase. Updated versions may be made available to previous purchasers at our discretion, but we are not obligated to do so',
    ],

    liabilityTitle: 'Limitation of Liability',
    liabilityIntro: 'Please understand the scope and limitations of our service:',
    liabilityItems: [
      'Yalla London provides informational and editorial content only. We are not a travel agency, tour operator, booking platform, or concierge service. We do not arrange, manage, or guarantee any bookings, reservations, or travel arrangements',
      'We are not liable for your experiences at any venue, hotel, restaurant, attraction, or event that we recommend or link to. Our recommendations are editorial opinions based on personal experience and research, not guarantees of quality or satisfaction',
      'We are not responsible for the products, services, content, or practices of our affiliate partners (Booking.com, Expedia, HalalBooking, GetYourGuide, Viator, StubHub, Ticketmaster, Klook, Skyscanner, Blacklane, Allianz Travel Insurance, or any other linked platform). Your use of third-party platforms is governed by their own terms and conditions',
      'To the fullest extent permitted by applicable law, Zenitha.Luxury LLC (operating as Yalla London) shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of our Website, reliance on our content, or interaction with our affiliate partners',
      'Our Website is provided on an "as is" and "as available" basis without warranties of any kind, either express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, or non-infringement',
    ],

    newsletterTitle: 'Newsletter',
    newsletterIntro: 'Our newsletter keeps you updated with curated London content. By subscribing, you agree to the following:',
    newsletterItems: [
      'By entering your email address and subscribing, you consent to receiving periodic emails from Yalla London. These may include curated London recommendations, new article announcements, event highlights, seasonal guides, exclusive content, and occasional promotional messages',
      'We send newsletters no more than twice per week. We respect your inbox and aim to deliver only content that adds value to your London experience',
      'You may unsubscribe at any time by clicking the "unsubscribe" link at the bottom of any newsletter email, or by contacting us at hello@yallalondon.com. Your email address will be removed from our mailing list within 7 days of your request',
      'We do not sell, rent, or share your email address with third parties for their marketing purposes. Your email is shared only with our email service provider for the sole purpose of delivering the newsletters you subscribed to',
      'Please refer to our Privacy Policy for full details on how we handle your email address and personal data',
    ],

    governingTitle: 'Governing Law and Jurisdiction',
    governingIntro: 'These Terms of Use are governed by the laws of the State of Delaware, United States:',
    governingItems: [
      'These terms are governed by and construed in accordance with the laws of the State of Delaware, United States, without regard to conflict of law principles. Zenitha.Luxury LLC is a Delaware limited liability company',
      'Any disputes arising from or relating to these terms or your use of our Website shall be subject to the exclusive jurisdiction of the courts located in the State of Delaware, United States',
      'If any provision of these terms is found to be unenforceable by a court of competent jurisdiction, the remaining provisions shall continue in full force and effect',
      'Our failure to enforce any right or provision of these terms shall not be considered a waiver of that right or provision',
    ],

    changesTitle: 'Changes to These Terms',
    changesIntro: 'We may update these terms from time to time:',
    changesItems: [
      'We reserve the right to modify, update, or replace any part of these Terms of Use at any time. Changes will be effective immediately upon posting on this page',
      'When we make material changes, we will update the "Last updated" date at the top of this page. For significant changes, we may provide additional notice via a banner on the Website',
      'Your continued use of the Website after changes are posted constitutes your acceptance of the updated terms. If you do not agree with the updated terms, you should discontinue using the Website',
      'We encourage you to review these terms periodically to stay informed of any changes that may affect your use of our Website',
    ],

    contactTitle: 'Contact Us',
    contactIntro: 'If you have questions about these Terms of Use, need to request permission for content use, or have any other inquiries, please contact us:',
    contactItems: [
      'Email: hello@yallalondon.com',
      'Location: London, United Kingdom',
      'We aim to respond to all inquiries within 48 hours during business days',
      'For intellectual property or content licensing inquiries, please include "IP Inquiry" in your email subject line to help us route your request appropriately',
    ],
  },

  ar: {
    title: 'شروط الاستخدام',
    lastUpdated: 'آخر تحديث',
    intro: 'مرحباً بك في يلا لندن، الذي تديره شركة Zenitha.Luxury LLC ("الشركة" أو "نحن" أو "لنا" أو "خاصتنا"). بالوصول إلى موقعنا واستخدامه على yallalondon.com ("الموقع")، فإنك توافق على الالتزام بشروط الاستخدام هذه. إذا كنت لا توافق على أي جزء من هذه الشروط، يرجى عدم استخدام موقعنا. تنطبق هذه الشروط على جميع الزوار والمستخدمين والمشتركين بغض النظر عن تفضيل اللغة.',

    aboutTitle: 'حول خدمتنا',
    aboutIntro: 'يلا لندن هو دليل سفر فاخر ثنائي اللغة (إنجليزي/عربي) للندن يقدم محتوى مختاراً ومستقلاً تحريرياً:',
    aboutItems: [
      'نقدم توصيات مختارة لفنادق لندن ومطاعمها ومعالمها وتجاربها وفعالياتها. يقوم فريقنا التحريري بفحص كل توصية شخصياً من خلال زيارات ميدانية وأبحاث قبل ظهورها على موقعنا',
      'ننشر مقالات معلوماتية وأدلة أحياء ونصائح سفر عملية وأدلة موسمية ومقالات مطولة حول نمط الحياة والثقافة في لندن من خلال مدونة "حكايات لندن"',
      'نحافظ على مركز معلومات شامل يغطي تخطيط الرحلات والمواصلات والمعالم السياحية والطعام والأنشطة العائلية والجواهر الخفية والمعلومات العملية لزوار لندن',
      'نعرض ونربط بالفعاليات والتجارب القادمة في لندن، بما في ذلك الحفلات الموسيقية والمعارض والأحداث الرياضية والمسرح والأحداث الثقافية، مع روابط التذاكر لمنصات الشركاء',
      'نقدم مستندات سفر رقمية ووثائق إلكترونية للشراء عبر متجرنا، مصممة لمساعدة الزوار في تخطيط وتنظيم رحلاتهم إلى لندن',
      'جميع المحتوى متاح باللغتين الإنجليزية والعربية، مما يعكس مهمتنا في خدمة المسافرين الناطقين بالعربية الذين يكتشفون لندن وكذلك الجمهور الدولي الأوسع',
    ],

    affiliateTitle: 'علاقات الإحالة',
    affiliateIntro: 'تحقق يلا لندن إيرادات من خلال شراكات الإحالة. نؤمن بالشفافية الكاملة حول كيفية عمل ذلك:',
    affiliateItems: [
      'نشارك في برامج إحالة مع Booking.com و Expedia و HalalBooking و GetYourGuide و Viator و StubHub و Ticketmaster و Klook و Skyscanner و Blacklane و Allianz Travel Insurance ومنصات حجز فنادق ومطاعم مختارة. عندما تنقر على رابط إحالة على موقعنا وتكمل عملية شراء أو حجز على منصة الشريك، نكسب عمولة من ذلك الشريك',
      'عمولات الإحالة لا تؤثر أبداً على السعر الذي تدفعه. تدفع نفس السعر سواء وصلت إلى موقع الشريك من خلال رابطنا أو مباشرة. في بعض الحالات، قد تمنحك شراكاتنا وصولاً إلى عروض أو خصومات حصرية',
      'توصياتنا التحريرية مستقلة تماماً عن علاقات الإحالة. نختار الأماكن والتجارب والخدمات للعرض بناءً على الجودة والتجربة الشخصية والجدارة التحريرية. لن نوصي أبداً بمكان أو تجربة فقط لأنها تقدم عمولة أعلى',
      'الصفحات التي تحتوي على روابط إحالة تتضمن إشعار إفصاح. قد يتم تحديد روابط الإحالة ضمن محتوانا من خلال معلمات URL القياسية. نشجعك على الانتباه إلى أن النقر على الروابط الصادرة في توصياتنا وقوائم الفعاليات قد يكون روابط إحالة',
      'إيرادات الإحالة ضرورية للحفاظ على يلا لندن كمورد مجاني. تمول فريقنا التحريري وأبحاث الأماكن والتصوير وإنتاج المحتوى والبنية التحتية ثنائية اللغة التي تجعل خدمتنا فريدة',
    ],

    accuracyTitle: 'دقة المحتوى',
    accuracyIntro: 'نعمل بجد للحفاظ على دقة وحداثة محتوانا، لكن لندن مدينة ديناميكية. يرجى فهم ما يلي:',
    accuracyItems: [
      'تتغير أعمال لندن بشكل متكرر: تحدث المطاعم قوائمها وأسعارها، وتعدل المعالم ساعات العمل ورسوم الدخول، وتجدد الفنادق وتعيد تسميتها، وتغلق الأماكن بشكل دائم. بينما نحدث محتوانا بانتظام، لا يمكننا ضمان الدقة الفورية لجميع التفاصيل',
      'يجب على المستخدمين دائماً التحقق من التفاصيل المهمة مباشرة مع الأماكن قبل الزيارة، بما في ذلك ساعات العمل الحالية والأسعار وقواعد اللباس ومتطلبات الحجز وتسهيلات الوصول والتوفر. هذا مهم بشكل خاص للمعلومات الحساسة للوقت',
      'تُقدم قوائم الفعاليات وروابط التذاكر لأغراض إعلامية. تفاصيل الفعاليات (التواريخ والأوقات والتشكيلات والأسعار) خاضعة للتغيير من قبل منظمي الفعاليات ومنصات التذاكر. لسنا مسؤولين عن التغييرات التي يجريها منظمو الفعاليات بعد النشر',
      'تعكس توصيات المطاعم والفنادق تقييمنا التحريري في وقت النشر أو آخر تحديث. يمكن أن تتغير الجودة والخدمة والإدارة في أي مكان مع مرور الوقت',
      'يلا لندن غير مسؤولة عن أي خسائر أو خيبات أمل أو مضايقات ناتجة عن معلومات قديمة أو غير دقيقة على موقعنا. نقدم المحتوى لأغراض إعلامية وإلهامية لمساعدتك في اكتشاف لندن',
    ],

    userTitle: 'مسؤوليات المستخدم',
    userIntro: 'باستخدامك لموقعنا، توافق على المسؤوليات التالية:',
    userItems: [
      'استخدم موقعنا بشكل قانوني ووفقاً لشروط الاستخدام هذه. لا تستخدم موقعنا لأي غرض غير قانوني بموجب قوانين إنجلترا وويلز أو أي ولاية قضائية معمول بها',
      'لا تقم بكشط أو زحف أو استخدام أدوات آلية لاستخراج المحتوى من موقعنا. مقالاتنا وأدلتنا وتوصياتنا وصورنا محمية بحقوق الطبع والنشر ومخصصة للاستخدام الشخصي الفردي فقط',
      'لا تقم بإعادة إنتاج أو إعادة توزيع أو إعادة نشر أو استغلال محتوانا تجارياً دون إذن كتابي مسبق من يلا لندن. يشمل ذلك نسخ المقالات أو الأدلة أو الصور إلى مواقع أخرى أو حسابات وسائل التواصل الاجتماعي أو المنشورات',
      'قدم معلومات صادقة ودقيقة عند تقديم نماذج الاتصال أو التسجيل في نشرتنا الإخبارية أو التواصل معنا بأي طريقة أخرى. لا تنتحل شخصية شخص آخر أو كيان آخر',
      'لا تحاول التدخل في أو تعطيل أو المساس بأمان أو وظائف موقعنا، بما في ذلك خوادمه وقواعد بياناته أو الشبكات المتصلة',
      'احترم تجربة المستخدمين الآخرين. لا تنقل رسائل غير مرغوب فيها أو تعليمات برمجية ضارة أو محاولات تصيد أو أي محتوى يهدف إلى الخداع أو الإضرار عبر أي قناة اتصال نوفرها',
    ],

    ipTitle: 'الملكية الفكرية',
    ipOurContentTitle: 'محتوانا وعلامتنا التجارية',
    ipOurContentIntro: 'جميع حقوق الملكية الفكرية على هذا الموقع ملك ليلا لندن ما لم يُذكر خلاف ذلك:',
    ipOurContentItems: [
      'جميع المحتوى المكتوب، بما في ذلك المقالات والأدلة والتوصيات والأوصاف والمراجعات، هو عمل أصلي أنشأه فريق يلا لندن التحريري ومحمي بحقوق الطبع والنشر. يُحظر إعادة الإنتاج غير المصرح بها',
      'علامة YALLA [LDN] التجارية، بما في ذلك اسم "يلا لندن" وجميع الشعارات والعلامات النصية والعناصر البصرية للعلامة التجارية، هي ملكية خاصة ليلا لندن. لا يجوز لك استخدام أصول علامتنا التجارية دون إذن كتابي',
      'نظام علامتنا التجارية v2 مملوك، بما في ذلك الاستخدام المحدد لخطوط Anybody و Source Serif 4 و IBM Plex Mono؛ وعنصر تصميم الشريط ثلاثي الألوان؛ والنمط البصري لبطاقة الصعود؛ والهوية البصرية الشاملة. لا يجوز تكرار أو تكييف هذه العناصر',
      'الصور الفوتوغرافية والصور على موقعنا إما مملوكة ليلا لندن أو مرخصة لاستخدامنا أو مستخدمة مع الإسناد. لا يجوز تحميلها أو إعادة إنتاجها أو استخدامها في مكان آخر دون إذن',
      'المحتوى ثنائي اللغة (إنجليزي/عربي) والترجمات والنهج الهيكلي لتجربتنا ثنائية اللغة يمثل استثماراً تحريرياً كبيراً ومحمي كأعمال أصلية',
    ],
    ipUserContentTitle: 'المحتوى المقدم من المستخدم',
    ipUserContentItems: [
      'أي محتوى تقدمه لنا من خلال نماذج الاتصال أو البريد الإلكتروني أو قنوات الاتصال الأخرى (ملاحظات، اقتراحات، أسئلة) قد يُستخدم من قبل يلا لندن لتحسين خدماتنا دون قيود أو تعويض',
      'تضمن أن أي محتوى تقدمه هو عملك الأصلي أو أن لديك الحق في مشاركته، وأنه لا ينتهك حقوق الملكية الفكرية لأي طرف ثالث',
      'نحتفظ بالحق في عدم الرد على أي محتوى مقدم من المستخدم أو التصرف بناءً عليه وفقاً لتقديرنا',
    ],

    digitalTitle: 'المنتجات الرقمية والوثائق الإلكترونية',
    digitalIntro: 'يقدم متجرنا مستندات سفر رقمية ووثائق إلكترونية. تنطبق الشروط التالية على جميع مشتريات المنتجات الرقمية:',
    digitalItems: [
      'المنتجات الرقمية المشتراة من يلا لندن مخصصة للاستخدام الشخصي غير التجاري فقط. لا يجوز لك إعادة بيع أو إعادة توزيع أو مشاركة علنياً أو استغلال تجارياً أي منتج رقمي تم شراؤه منا',
      'جميع مبيعات المنتجات الرقمية نهائية. بسبب طبيعة السلع الرقمية، لا نقدم استرداد الأموال بمجرد تسليم المنتج. بإكمال عملية الشراء، تقر وتقبل سياسة عدم الاسترداد هذه',
      'يتم تسليم المنتجات الرقمية فوراً عبر البريد الإلكتروني إلى العنوان الذي تقدمه عند الدفع. تقع على عاتقك مسؤولية التأكد من تقديم عنوان بريد إلكتروني صالح ويمكن الوصول إليه. تحقق من مجلد البريد غير المرغوب فيه إذا لم تستلم منتجك',
      'تحتفظ يلا لندن بجميع حقوق الملكية الفكرية في المنتجات الرقمية. يمنحك شراؤك ترخيصاً شخصياً لاستخدام المنتج، وليس ملكية المحتوى أو التصميم الأساسي',
      'نحتفظ بالحق في تحديث المنتجات الرقمية بعد الشراء. قد تُتاح الإصدارات المحدثة للمشترين السابقين وفقاً لتقديرنا، لكننا غير ملزمين بذلك',
    ],

    liabilityTitle: 'تحديد المسؤولية',
    liabilityIntro: 'يرجى فهم نطاق وحدود خدمتنا:',
    liabilityItems: [
      'يقدم يلا لندن محتوى معلوماتي وتحريري فقط. نحن لسنا وكالة سفر أو منظم رحلات أو منصة حجز أو خدمة كونسيرج. لا نرتب أو ندير أو نضمن أي حجوزات أو ترتيبات سفر',
      'لسنا مسؤولين عن تجاربك في أي مكان أو فندق أو مطعم أو معلم أو فعالية نوصي بها أو نربط إليها. توصياتنا هي آراء تحريرية مبنية على تجربة شخصية وأبحاث، وليست ضمانات للجودة أو الرضا',
      'لسنا مسؤولين عن منتجات أو خدمات أو محتوى أو ممارسات شركاء الإحالة لدينا (Booking.com و Expedia و HalalBooking و GetYourGuide و Viator و StubHub و Ticketmaster و Klook و Skyscanner و Blacklane و Allianz Travel Insurance أو أي منصة مرتبطة أخرى). يخضع استخدامك لمنصات الطرف الثالث لشروطهم وأحكامهم الخاصة',
      'إلى أقصى حد يسمح به القانون المعمول به، لن تكون شركة Zenitha.Luxury LLC (التي تعمل باسم يلا لندن) مسؤولة عن أي أضرار غير مباشرة أو عرضية أو خاصة أو تبعية أو عقابية ناتجة عن استخدامك لموقعنا أو اعتمادك على محتوانا أو تفاعلك مع شركاء الإحالة لدينا',
      'يُقدم موقعنا على أساس "كما هو" و"كما هو متاح" دون أي ضمانات من أي نوع، سواء صريحة أو ضمنية، بما في ذلك على سبيل المثال لا الحصر ضمانات القابلية للتسويق أو الملاءمة لغرض معين أو عدم الانتهاك',
    ],

    newsletterTitle: 'النشرة الإخبارية',
    newsletterIntro: 'تبقيك نشرتنا الإخبارية على اطلاع بمحتوى لندن المختار. بالاشتراك، توافق على ما يلي:',
    newsletterItems: [
      'بإدخال عنوان بريدك الإلكتروني والاشتراك، فإنك توافق على تلقي رسائل بريد إلكتروني دورية من يلا لندن. قد تشمل هذه توصيات لندن المختارة وإعلانات المقالات الجديدة وأبرز الفعاليات والأدلة الموسمية والمحتوى الحصري ورسائل ترويجية عرضية',
      'نرسل النشرات الإخبارية مرتين في الأسبوع كحد أقصى. نحترم بريدك الوارد ونهدف لتقديم محتوى يضيف قيمة لتجربتك في لندن فقط',
      'يمكنك إلغاء الاشتراك في أي وقت بالنقر على رابط "إلغاء الاشتراك" في أسفل أي بريد إلكتروني للنشرة، أو بالاتصال بنا على hello@yallalondon.com. ستتم إزالة عنوان بريدك الإلكتروني من قائمتنا البريدية خلال 7 أيام من طلبك',
      'لا نبيع أو نؤجر أو نشارك عنوان بريدك الإلكتروني مع أطراف ثالثة لأغراضهم التسويقية. يُشارك بريدك الإلكتروني فقط مع مزود خدمة البريد الإلكتروني لدينا لغرض وحيد هو تسليم النشرات الإخبارية التي اشتركت فيها',
      'يرجى الرجوع إلى سياسة الخصوصية الخاصة بنا للحصول على التفاصيل الكاملة حول كيفية تعاملنا مع عنوان بريدك الإلكتروني وبياناتك الشخصية',
    ],

    governingTitle: 'القانون الحاكم والولاية القضائية',
    governingIntro: 'تخضع شروط الاستخدام هذه لقوانين ولاية ديلاوير، الولايات المتحدة:',
    governingItems: [
      'تخضع هذه الشروط وتُفسر وفقاً لقوانين ولاية ديلاوير، الولايات المتحدة، دون مراعاة مبادئ تنازع القوانين. شركة Zenitha.Luxury LLC هي شركة ذات مسؤولية محدودة مسجلة في ديلاوير',
      'أي نزاعات ناشئة عن أو متعلقة بهذه الشروط أو استخدامك لموقعنا تخضع للولاية القضائية الحصرية للمحاكم الموجودة في ولاية ديلاوير، الولايات المتحدة',
      'إذا وُجد أن أي حكم من هذه الشروط غير قابل للتنفيذ من قبل محكمة مختصة، تظل الأحكام المتبقية سارية المفعول بالكامل',
      'عدم إنفاذنا لأي حق أو حكم من هذه الشروط لا يُعتبر تنازلاً عن ذلك الحق أو الحكم',
    ],

    changesTitle: 'التغييرات على هذه الشروط',
    changesIntro: 'قد نحدث هذه الشروط من وقت لآخر:',
    changesItems: [
      'نحتفظ بالحق في تعديل أو تحديث أو استبدال أي جزء من شروط الاستخدام هذه في أي وقت. ستكون التغييرات سارية فوراً عند نشرها على هذه الصفحة',
      'عندما نجري تغييرات جوهرية، سنحدث تاريخ "آخر تحديث" في أعلى هذه الصفحة. بالنسبة للتغييرات الهامة، قد نقدم إشعاراً إضافياً عبر شريط على الموقع',
      'استمرارك في استخدام الموقع بعد نشر التغييرات يشكل قبولك للشروط المحدثة. إذا لم توافق على الشروط المحدثة، يجب عليك التوقف عن استخدام الموقع',
      'نشجعك على مراجعة هذه الشروط بشكل دوري للبقاء على اطلاع بأي تغييرات قد تؤثر على استخدامك لموقعنا',
    ],

    contactTitle: 'اتصل بنا',
    contactIntro: 'إذا كانت لديك أسئلة حول شروط الاستخدام هذه، أو تحتاج إلى طلب إذن لاستخدام المحتوى، أو لديك أي استفسارات أخرى، يرجى الاتصال بنا:',
    contactItems: [
      'البريد الإلكتروني: hello@yallalondon.com',
      'الموقع: لندن، المملكة المتحدة',
      'نهدف للرد على جميع الاستفسارات خلال 48 ساعة خلال أيام العمل',
      'لاستفسارات الملكية الفكرية أو ترخيص المحتوى، يرجى تضمين "استفسار ملكية فكرية" في سطر موضوع بريدك الإلكتروني لمساعدتنا في توجيه طلبك بشكل مناسب',
    ],
  },
}

export default function TermsOfUse() {
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
        {/* About Our Service */}
        <Card>
          <CardHeader>
            <CardTitle>{c.aboutTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-stone mb-3">
              {c.aboutIntro}
            </p>
            <ul className="list-disc list-inside text-stone space-y-2">
              {c.aboutItems.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Affiliate Relationships */}
        <Card>
          <CardHeader>
            <CardTitle>{c.affiliateTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-stone mb-3">
              {c.affiliateIntro}
            </p>
            <ul className="list-disc list-inside text-stone space-y-2">
              {c.affiliateItems.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Content Accuracy */}
        <Card>
          <CardHeader>
            <CardTitle>{c.accuracyTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-stone mb-3">
              {c.accuracyIntro}
            </p>
            <ul className="list-disc list-inside text-stone space-y-2">
              {c.accuracyItems.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* User Responsibilities */}
        <Card>
          <CardHeader>
            <CardTitle>{c.userTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-stone mb-3">
              {c.userIntro}
            </p>
            <ul className="list-disc list-inside text-stone space-y-2">
              {c.userItems.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Intellectual Property */}
        <Card>
          <CardHeader>
            <CardTitle>{c.ipTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">{c.ipOurContentTitle}</h3>
              <p className="text-stone mb-2">
                {c.ipOurContentIntro}
              </p>
              <ul className="list-disc list-inside text-stone space-y-2">
                {c.ipOurContentItems.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">{c.ipUserContentTitle}</h3>
              <ul className="list-disc list-inside text-stone space-y-2">
                {c.ipUserContentItems.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Digital Products */}
        <Card>
          <CardHeader>
            <CardTitle>{c.digitalTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-stone mb-3">
              {c.digitalIntro}
            </p>
            <ul className="list-disc list-inside text-stone space-y-2">
              {c.digitalItems.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Limitation of Liability */}
        <Card>
          <CardHeader>
            <CardTitle>{c.liabilityTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-stone mb-3">
              {c.liabilityIntro}
            </p>
            <ul className="list-disc list-inside text-stone space-y-2">
              {c.liabilityItems.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Newsletter */}
        <Card>
          <CardHeader>
            <CardTitle>{c.newsletterTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-stone mb-3">
              {c.newsletterIntro}
            </p>
            <ul className="list-disc list-inside text-stone space-y-2">
              {c.newsletterItems.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Governing Law */}
        <Card>
          <CardHeader>
            <CardTitle>{c.governingTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-stone mb-3">
              {c.governingIntro}
            </p>
            <ul className="list-disc list-inside text-stone space-y-2">
              {c.governingItems.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Changes to Terms */}
        <Card>
          <CardHeader>
            <CardTitle>{c.changesTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-stone mb-3">
              {c.changesIntro}
            </p>
            <ul className="list-disc list-inside text-stone space-y-2">
              {c.changesItems.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Contact Us */}
        <Card>
          <CardHeader>
            <CardTitle>{c.contactTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-stone mb-3">
              {c.contactIntro}
            </p>
            <ul className="list-disc list-inside text-stone space-y-2">
              {c.contactItems.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
