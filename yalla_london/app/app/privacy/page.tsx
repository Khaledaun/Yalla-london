'use client'

import { useLanguage } from '@/components/language-provider'
import { getTranslation } from '@/lib/i18n'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const content = {
  en: {
    title: 'Privacy Policy',
    lastUpdated: 'Last updated',
    intro: 'Yalla London ("we", "us", or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, store, and share your personal information when you visit yallalondon.com (the "Website"). We operate as a bilingual (English/Arabic) luxury London travel guide, and this policy applies to all users regardless of language preference.',

    dataCollectTitle: 'Information We Collect',
    dataCollectPersonalTitle: 'Personal Information You Provide',
    dataCollectPersonalIntro: 'We collect personal information that you voluntarily provide to us when you interact with our services:',
    dataCollectPersonalItems: [
      'Contact form submissions: your name, email address, inquiry category (e.g. general, partnership, feedback, travel planning), and the message content you write to us',
      'Newsletter subscriptions: your email address when you sign up to receive Yalla London updates and curated London recommendations',
      'Cookie consent preferences: your choices regarding which categories of cookies you accept or decline, stored locally via our cookie consent banner',
      'Language preference: your selected language (English or Arabic), stored in your browser\'s local storage to personalise your experience across visits',
      'Feedback and communications: any additional information you choose to share with us through email correspondence at hello@yallalondon.com',
    ],
    dataCollectAutoTitle: 'Information Collected Automatically',
    dataCollectAutoIntro: 'When you visit our Website, certain information is collected automatically through cookies and similar technologies:',
    dataCollectAutoItems: [
      'Analytics data via Google Analytics: page views, session duration, bounce rate, pages per session, and user flow through the site. IP addresses are anonymised before processing',
      'Device and browser information: device type (desktop, mobile, tablet), operating system, browser type and version, and screen resolution',
      'Referral data: how you arrived at our Website, including referring URLs, search engine queries, and social media sources',
      'Geographic region: approximate location derived from your anonymised IP address (country and city level only, not precise location)',
      'Interaction data: which articles you read, recommendations you view, affiliate links you click, and features you use such as the language toggle',
    ],

    howWeUseTitle: 'How We Use Your Information',
    howWeUseIntro: 'We use the information we collect for the following specific purposes:',
    howWeUseItems: [
      'To respond to your inquiries: when you submit a contact form, we use your name, email, and message to reply to your question, provide travel advice, or address your feedback. We aim to respond within 48 hours',
      'To deliver newsletter content: if you subscribe, we send periodic emails featuring curated London recommendations, new articles, event highlights, seasonal guides, and exclusive content. Emails are sent no more than twice per week',
      'To personalise your experience: we use your language preference (English or Arabic) to display the Website in your chosen language and to ensure content, navigation, and layout direction (LTR/RTL) match your selection',
      'To improve our Website and content: we analyse aggregated, anonymised analytics data to understand which articles, guides, and recommendations are most useful, identify technical issues, optimise page load times, and plan future content',
      'To display relevant recommendations: analytics data helps us understand what types of London experiences our audience is most interested in, allowing us to prioritise and curate content accordingly',
      'To maintain Website security: we monitor for unusual traffic patterns, potential abuse, and security threats to protect both our Website and our users',
    ],

    cookiesTitle: 'Cookies and Tracking Technologies',
    cookiesIntro: 'Our Website uses cookies and similar technologies. When you first visit, you will see a cookie consent banner allowing you to accept or decline non-essential cookies. Here is what we use:',
    cookiesEssentialTitle: 'Essential / Functional Cookies',
    cookiesEssentialItems: [
      'Language preference cookie: stores your selected language (English or Arabic) in local storage so your choice persists across browsing sessions. This is essential to delivering the bilingual experience and does not require consent',
      'Cookie consent preference: stores your cookie consent choices so we do not ask you repeatedly. This cookie is necessary for the consent mechanism itself to function',
      'Session management: standard cookies required for the Website to function correctly, including security tokens and navigation state',
    ],
    cookiesAnalyticsTitle: 'Analytics Cookies (Require Consent)',
    cookiesAnalyticsItems: [
      'Google Analytics (GA4): we use Google Analytics with anonymised IP addresses enabled to understand how visitors use our Website. Google Analytics sets cookies including _ga and _ga_* to distinguish unique users and throttle request rates. These cookies expire after 2 years and 24 hours respectively',
      'We have configured Google Analytics to anonymise IP addresses before storage, meaning your full IP address is never recorded by Google on our behalf',
      'Analytics data is used exclusively for aggregate reporting and Website improvement. We do not use Google Analytics for advertising, remarketing, or building individual user profiles',
      'You can opt out of Google Analytics entirely by declining analytics cookies via our consent banner, or by installing the Google Analytics Opt-out Browser Add-on',
    ],
    cookiesThirdPartyTitle: 'Third-Party Cookies from Affiliate Partners',
    cookiesThirdPartyItems: [
      'When you click an affiliate link on our Website (e.g. to StubHub, Ticketmaster, GetYourGuide, or Viator), the affiliate partner\'s website may set its own cookies on your device. These cookies are governed by that partner\'s own privacy and cookie policies, not ours',
      'We do not control the cookies set by affiliate partners. We encourage you to review their respective privacy policies before making purchases through their platforms',
      'Affiliate cookies are only set if you actively click through to a partner site. Simply browsing our Website does not trigger third-party affiliate cookies',
    ],

    thirdPartyTitle: 'Third-Party Services and Data Processors',
    thirdPartyIntro: 'We work with trusted third-party service providers who process data on our behalf or whose services are integrated into our Website:',
    thirdPartyItems: [
      'Google Analytics (Google LLC): provides website analytics and reporting. Google processes anonymised usage data under its own privacy policy. Data may be processed in the United States. Google is certified under the EU-US Data Privacy Framework',
      'Supabase (Supabase Inc.): provides our database hosting and backend infrastructure. Contact form submissions and newsletter email addresses are stored securely in Supabase-managed databases with row-level security, encryption at rest, and encrypted connections',
      'Vercel (Vercel Inc.): provides our web hosting, content delivery network (CDN), and serverless functions. Vercel processes server logs including anonymised request data. Vercel\'s infrastructure spans global edge locations for fast page delivery',
      'Email marketing service: we use a third-party email service to manage newsletter subscriptions and deliver emails. Your email address is shared with this provider solely for the purpose of sending you the newsletters you subscribed to',
      'Affiliate partners (StubHub, Ticketmaster, GetYourGuide, Viator, and select hotel/restaurant booking platforms): we link to these partners within our content. When you click through, your interaction with their platform is governed by their own terms and privacy policies. We receive anonymised commission reports but no personal data about your purchases',
    ],

    affiliateTitle: 'Affiliate Disclosure',
    affiliateIntro: 'Transparency is important to us. Please be aware of the following regarding our affiliate relationships:',
    affiliateItems: [
      'Yalla London participates in affiliate programmes with booking and ticketing partners including StubHub, Ticketmaster, GetYourGuide, Viator, and select hotel and restaurant booking platforms. When you click an affiliate link on our Website and make a purchase or booking, we may earn a commission',
      'This commission comes from the affiliate partner, not from you. Clicking an affiliate link does not increase the price you pay. In some cases, we may be able to offer exclusive discounts or deals through our affiliate partnerships',
      'Our editorial recommendations are completely independent of our affiliate relationships. We recommend venues, experiences, and services based on genuine personal experience and editorial judgement. We will never recommend something solely because it offers a higher commission',
      'Affiliate links are clearly present within our recommendations and content. Where a page contains affiliate links, we display a disclosure notice informing you of this fact',
      'Commission revenue helps us sustain Yalla London as a free resource, fund our editorial team\'s research and venue visits, and continue producing high-quality bilingual content for our readers',
    ],

    retentionTitle: 'Data Retention',
    retentionIntro: 'We retain your personal information only for as long as necessary for the purposes described in this policy:',
    retentionItems: [
      'Contact form submissions: we retain your name, email address, and message content for 12 months from the date of submission to allow for follow-up correspondence and quality assurance. After 12 months, submissions are permanently deleted from our database',
      'Newsletter subscriptions: we retain your email address for as long as you remain subscribed. When you unsubscribe (via the link in any newsletter email or by contacting us), your email address is removed from our mailing list within 7 days',
      'Analytics data: usage data collected through Google Analytics is retained according to Google\'s default data retention settings (14 months for user-level data). We do not extend this retention period. Aggregated, non-identifiable analytics reports may be kept indefinitely',
      'Cookie consent preferences: your consent choices are stored locally in your browser and persist until you clear your browser data or update your preferences via the cookie consent banner',
      'Language preference: stored in your browser\'s local storage indefinitely until you change it or clear your browser data. This data never leaves your device',
    ],

    rightsTitle: 'Your Rights',
    rightsIntro: 'Under the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018, you have the following rights regarding your personal data:',
    rightsItems: [
      'Right of access: you can request a copy of all personal data we hold about you. We will provide this within 30 days of your request at no charge',
      'Right to rectification: if any personal data we hold about you is inaccurate or incomplete, you have the right to request correction. Contact us and we will update your information promptly',
      'Right to erasure ("right to be forgotten"): you can request that we delete all personal data we hold about you. We will comply within 30 days, subject to any legal obligations requiring us to retain certain data',
      'Right to restrict processing: you can ask us to temporarily stop processing your personal data while we address a concern or verify data accuracy',
      'Right to data portability: you can request your personal data in a structured, commonly used, machine-readable format (e.g. CSV or JSON)',
      'Right to object: you can object to our processing of your data for analytics or direct marketing purposes at any time',
      'Right to withdraw consent: you can withdraw your cookie consent at any time via our cookie consent banner. You can unsubscribe from our newsletter at any time via the unsubscribe link in any email. Withdrawal does not affect the lawfulness of processing carried out before withdrawal',
      'To exercise any of these rights, please contact us at hello@yallalondon.com. We will respond within 30 days. If you are unsatisfied with our response, you have the right to lodge a complaint with the Information Commissioner\'s Office (ICO) at ico.org.uk',
    ],

    securityTitle: 'Data Security',
    securityIntro: 'We take the security of your personal data seriously and implement appropriate technical and organisational measures:',
    securityItems: [
      'SSL/TLS encryption: all data transmitted between your browser and our Website is encrypted using HTTPS (TLS 1.2+). This protects your information during transmission, including contact form submissions and newsletter sign-ups',
      'Secure hosting on Vercel: our Website is hosted on Vercel\'s enterprise-grade infrastructure with automatic DDoS protection, edge caching, and secure deployment pipelines. Vercel maintains SOC 2 Type 2 compliance',
      'Database security via Supabase: personal data is stored in Supabase-managed PostgreSQL databases with row-level security policies, encryption at rest (AES-256), encrypted database connections (SSL), and automatic backups',
      'Access controls: access to personal data (e.g. contact form submissions, newsletter subscriber lists) is restricted to authorised team members only, using strong authentication',
      'Regular review: we periodically review our security practices and the security postures of our third-party service providers to ensure your data remains protected',
    ],

    childrenTitle: 'Children\'s Privacy',
    childrenIntro: 'Protecting children\'s privacy is important to us:',
    childrenItems: [
      'Yalla London is not directed at children under the age of 13. We do not knowingly collect personal information from children under 13',
      'If you are a parent or guardian and believe your child has provided personal information to us (e.g. via the contact form or newsletter sign-up), please contact us at hello@yallalondon.com and we will promptly delete such information',
      'Our Website content is designed for adults and young adults planning travel to London. While families with children may find our family-friendly guides useful, we expect a parent or guardian to manage any interaction with our services on behalf of minors',
    ],

    transfersTitle: 'International Data Transfers',
    transfersIntro: 'As we use international service providers, your data may be transferred outside the United Kingdom:',
    transfersItems: [
      'Google Analytics: data may be processed by Google in the United States. Google participates in the EU-US Data Privacy Framework, providing adequate safeguards for data transfers',
      'Supabase: database infrastructure may be hosted in AWS data centres in the EU (Frankfurt) or US regions, depending on configuration. Supabase implements appropriate safeguards including standard contractual clauses',
      'Vercel: our Website is served from Vercel\'s global edge network, with primary processing in the United States. Vercel complies with standard contractual clauses for international data transfers',
      'We ensure that any international transfer of personal data is protected by appropriate safeguards as required by UK GDPR, including standard contractual clauses, adequacy decisions, or certification frameworks',
    ],

    updatesTitle: 'Updates to This Policy',
    updatesIntro: 'We may update this Privacy Policy from time to time to reflect changes in our practices, services, or legal requirements:',
    updatesItems: [
      'When we make material changes to this policy, we will update the "Last updated" date at the top of this page',
      'For significant changes that affect how we process your personal data, we may also notify you via a banner on the Website or, if you are a newsletter subscriber, via email',
      'We encourage you to review this policy periodically to stay informed about how we protect your information',
      'Your continued use of the Website after changes are posted constitutes your acceptance of the updated policy',
    ],

    contactTitle: 'Contact Us',
    contactIntro: 'If you have questions about this Privacy Policy, want to exercise your data rights, or have concerns about how we handle your information, please get in touch:',
    contactItems: [
      'Email: hello@yallalondon.com',
      'Location: London, United Kingdom',
      'We aim to respond to all privacy-related inquiries within 30 days',
      'If you are not satisfied with our response, you have the right to contact the UK Information Commissioner\'s Office (ICO) at ico.org.uk or by calling 0303 123 1113',
    ],
  },

  ar: {
    title: 'سياسة الخصوصية',
    lastUpdated: 'آخر تحديث',
    intro: 'تلتزم يلا لندن ("نحن" أو "لنا" أو "خاصتنا") بحماية خصوصيتك. توضح سياسة الخصوصية هذه كيف نجمع ونستخدم ونخزن ونشارك معلوماتك الشخصية عند زيارتك لموقع yallalondon.com ("الموقع"). نعمل كدليل سفر فاخر ثنائي اللغة (إنجليزي/عربي) للندن، وتنطبق هذه السياسة على جميع المستخدمين بغض النظر عن تفضيل اللغة.',

    dataCollectTitle: 'المعلومات التي نجمعها',
    dataCollectPersonalTitle: 'المعلومات الشخصية التي تقدمها',
    dataCollectPersonalIntro: 'نجمع المعلومات الشخصية التي تقدمها طوعاً عند تفاعلك مع خدماتنا:',
    dataCollectPersonalItems: [
      'نموذج الاتصال: اسمك وعنوان بريدك الإلكتروني وفئة الاستفسار (مثل عام، شراكة، ملاحظات، تخطيط السفر) ومحتوى الرسالة التي تكتبها لنا',
      'الاشتراك في النشرة الإخبارية: عنوان بريدك الإلكتروني عند التسجيل لتلقي تحديثات يلا لندن وتوصيات لندن المختارة',
      'تفضيلات ملفات تعريف الارتباط: اختياراتك بشأن فئات ملفات تعريف الارتباط التي تقبلها أو ترفضها، والمخزنة محلياً عبر شريط الموافقة على ملفات تعريف الارتباط',
      'تفضيل اللغة: لغتك المختارة (الإنجليزية أو العربية)، المخزنة في التخزين المحلي لمتصفحك لتخصيص تجربتك عبر الزيارات',
      'الملاحظات والمراسلات: أي معلومات إضافية تختار مشاركتها معنا عبر المراسلات البريدية على hello@yallalondon.com',
    ],
    dataCollectAutoTitle: 'المعلومات المُجمعة تلقائياً',
    dataCollectAutoIntro: 'عند زيارتك لموقعنا، يتم جمع معلومات معينة تلقائياً من خلال ملفات تعريف الارتباط والتقنيات المشابهة:',
    dataCollectAutoItems: [
      'بيانات التحليلات عبر Google Analytics: مشاهدات الصفحة ومدة الجلسة ومعدل الارتداد والصفحات لكل جلسة وتدفق المستخدم عبر الموقع. يتم إخفاء هوية عناوين IP قبل المعالجة',
      'معلومات الجهاز والمتصفح: نوع الجهاز (حاسوب مكتبي، هاتف محمول، جهاز لوحي) ونظام التشغيل ونوع المتصفح وإصداره ودقة الشاشة',
      'بيانات الإحالة: كيفية وصولك إلى موقعنا، بما في ذلك عناوين URL المحيلة واستعلامات محركات البحث ومصادر وسائل التواصل الاجتماعي',
      'المنطقة الجغرافية: الموقع التقريبي المستمد من عنوان IP المجهول الهوية (على مستوى البلد والمدينة فقط، وليس الموقع الدقيق)',
      'بيانات التفاعل: المقالات التي تقرأها والتوصيات التي تشاهدها وروابط الشركاء التي تنقر عليها والميزات التي تستخدمها مثل مبدل اللغة',
    ],

    howWeUseTitle: 'كيف نستخدم معلوماتك',
    howWeUseIntro: 'نستخدم المعلومات التي نجمعها للأغراض المحددة التالية:',
    howWeUseItems: [
      'للرد على استفساراتك: عند تقديم نموذج اتصال، نستخدم اسمك وبريدك الإلكتروني ورسالتك للرد على سؤالك أو تقديم نصائح السفر أو معالجة ملاحظاتك. نهدف للرد خلال 48 ساعة',
      'لتقديم محتوى النشرة الإخبارية: إذا اشتركت، نرسل رسائل بريد إلكتروني دورية تتضمن توصيات لندن المختارة ومقالات جديدة وأبرز الفعاليات وأدلة موسمية ومحتوى حصري. لا يتم إرسال الرسائل أكثر من مرتين في الأسبوع',
      'لتخصيص تجربتك: نستخدم تفضيل لغتك (الإنجليزية أو العربية) لعرض الموقع بلغتك المختارة وضمان تطابق المحتوى والتنقل واتجاه التخطيط (من اليسار لليمين/من اليمين لليسار) مع اختيارك',
      'لتحسين موقعنا ومحتوانا: نحلل بيانات تحليلية مجمعة ومجهولة الهوية لفهم المقالات والأدلة والتوصيات الأكثر فائدة وتحديد المشكلات التقنية وتحسين أوقات تحميل الصفحات والتخطيط للمحتوى المستقبلي',
      'لعرض توصيات ذات صلة: تساعدنا بيانات التحليلات في فهم أنواع تجارب لندن التي يهتم بها جمهورنا أكثر، مما يسمح لنا بتحديد الأولويات واختيار المحتوى وفقاً لذلك',
      'للحفاظ على أمان الموقع: نراقب أنماط حركة المرور غير العادية والإساءة المحتملة والتهديدات الأمنية لحماية موقعنا ومستخدمينا',
    ],

    cookiesTitle: 'ملفات تعريف الارتباط وتقنيات التتبع',
    cookiesIntro: 'يستخدم موقعنا ملفات تعريف الارتباط والتقنيات المشابهة. عند زيارتك الأولى، سيظهر لك شريط موافقة على ملفات تعريف الارتباط يتيح لك قبول أو رفض ملفات تعريف الارتباط غير الأساسية. إليك ما نستخدمه:',
    cookiesEssentialTitle: 'ملفات تعريف الارتباط الأساسية / الوظيفية',
    cookiesEssentialItems: [
      'ملف تعريف ارتباط تفضيل اللغة: يخزن لغتك المختارة (الإنجليزية أو العربية) في التخزين المحلي حتى يستمر اختيارك عبر جلسات التصفح. هذا ضروري لتقديم التجربة ثنائية اللغة ولا يتطلب موافقة',
      'تفضيل الموافقة على ملفات تعريف الارتباط: يخزن خيارات موافقتك على ملفات تعريف الارتباط حتى لا نسألك بشكل متكرر. هذا الملف ضروري لعمل آلية الموافقة نفسها',
      'إدارة الجلسة: ملفات تعريف ارتباط قياسية مطلوبة لعمل الموقع بشكل صحيح، بما في ذلك رموز الأمان وحالة التنقل',
    ],
    cookiesAnalyticsTitle: 'ملفات تعريف ارتباط التحليلات (تتطلب موافقة)',
    cookiesAnalyticsItems: [
      'Google Analytics (GA4): نستخدم Google Analytics مع تفعيل إخفاء هوية عناوين IP لفهم كيفية استخدام الزوار لموقعنا. يضع Google Analytics ملفات تعريف ارتباط بما في ذلك _ga و _ga_* لتمييز المستخدمين الفريدين وتنظيم معدلات الطلبات. تنتهي صلاحية هذه الملفات بعد سنتين و24 ساعة على التوالي',
      'لقد قمنا بتكوين Google Analytics لإخفاء هوية عناوين IP قبل التخزين، مما يعني أن عنوان IP الكامل الخاص بك لا يُسجَّل أبداً بواسطة Google نيابةً عنا',
      'تُستخدم بيانات التحليلات حصرياً للتقارير المجمعة وتحسين الموقع. لا نستخدم Google Analytics للإعلان أو إعادة الاستهداف أو بناء ملفات تعريف المستخدمين الفردية',
      'يمكنك إلغاء الاشتراك في Google Analytics بالكامل عن طريق رفض ملفات تعريف ارتباط التحليلات عبر شريط الموافقة، أو عن طريق تثبيت إضافة إلغاء الاشتراك في Google Analytics للمتصفح',
    ],
    cookiesThirdPartyTitle: 'ملفات تعريف ارتباط الطرف الثالث من شركاء الإحالة',
    cookiesThirdPartyItems: [
      'عند النقر على رابط إحالة على موقعنا (مثل StubHub أو Ticketmaster أو GetYourGuide أو Viator)، قد يضع موقع شريك الإحالة ملفات تعريف ارتباط خاصة به على جهازك. تخضع هذه الملفات لسياسات الخصوصية وملفات تعريف الارتباط الخاصة بذلك الشريك، وليس لسياستنا',
      'لا نتحكم في ملفات تعريف الارتباط التي يضعها شركاء الإحالة. نشجعك على مراجعة سياسات الخصوصية الخاصة بهم قبل إجراء عمليات شراء عبر منصاتهم',
      'يتم تعيين ملفات تعريف ارتباط الإحالة فقط إذا نقرت بنشاط للانتقال إلى موقع الشريك. مجرد تصفح موقعنا لا يؤدي إلى تشغيل ملفات تعريف ارتباط إحالة من طرف ثالث',
    ],

    thirdPartyTitle: 'خدمات الطرف الثالث ومعالجو البيانات',
    thirdPartyIntro: 'نعمل مع مزودي خدمات طرف ثالث موثوقين يعالجون البيانات نيابةً عنا أو تكون خدماتهم مدمجة في موقعنا:',
    thirdPartyItems: [
      'Google Analytics (Google LLC): يوفر تحليلات وتقارير الموقع. تعالج Google بيانات الاستخدام المجهولة الهوية بموجب سياسة الخصوصية الخاصة بها. قد تُعالج البيانات في الولايات المتحدة. Google معتمدة بموجب إطار خصوصية البيانات بين الاتحاد الأوروبي والولايات المتحدة',
      'Supabase (Supabase Inc.): يوفر استضافة قاعدة البيانات والبنية التحتية الخلفية. يتم تخزين نماذج الاتصال وعناوين البريد الإلكتروني للنشرة الإخبارية بشكل آمن في قواعد بيانات Supabase المُدارة مع أمان على مستوى الصف وتشفير في حالة السكون واتصالات مشفرة',
      'Vercel (Vercel Inc.): يوفر استضافة الويب وشبكة توصيل المحتوى (CDN) والوظائف بدون خادم. يعالج Vercel سجلات الخادم بما في ذلك بيانات الطلبات المجهولة الهوية. تمتد بنية Vercel التحتية عبر مواقع حافة عالمية لتسليم الصفحات بسرعة',
      'خدمة التسويق عبر البريد الإلكتروني: نستخدم خدمة بريد إلكتروني من طرف ثالث لإدارة اشتراكات النشرة الإخبارية وتسليم الرسائل. يتم مشاركة عنوان بريدك الإلكتروني مع هذا المزود فقط لغرض إرسال النشرات الإخبارية التي اشتركت فيها',
      'شركاء الإحالة (StubHub و Ticketmaster و GetYourGuide و Viator ومنصات حجز فنادق/مطاعم مختارة): نضع روابط لهؤلاء الشركاء ضمن محتوانا. عند النقر للانتقال، يخضع تفاعلك مع منصتهم لشروطهم وسياسات الخصوصية الخاصة بهم. نتلقى تقارير عمولة مجهولة الهوية ولكن لا نتلقى بيانات شخصية عن مشترياتك',
    ],

    affiliateTitle: 'الإفصاح عن الإحالة',
    affiliateIntro: 'الشفافية مهمة بالنسبة لنا. يرجى الانتباه لما يلي بخصوص علاقات الإحالة لدينا:',
    affiliateItems: [
      'تشارك يلا لندن في برامج إحالة مع شركاء الحجز والتذاكر بما في ذلك StubHub و Ticketmaster و GetYourGuide و Viator ومنصات حجز فنادق ومطاعم مختارة. عندما تنقر على رابط إحالة على موقعنا وتجري عملية شراء أو حجز، قد نكسب عمولة',
      'تأتي هذه العمولة من شريك الإحالة وليس منك. النقر على رابط إحالة لا يزيد السعر الذي تدفعه. في بعض الحالات، قد نتمكن من تقديم خصومات أو عروض حصرية من خلال شراكات الإحالة لدينا',
      'توصياتنا التحريرية مستقلة تماماً عن علاقات الإحالة. نوصي بالأماكن والتجارب والخدمات بناءً على تجربة شخصية حقيقية وحكم تحريري. لن نوصي بشيء لمجرد أنه يقدم عمولة أعلى',
      'روابط الإحالة موجودة بوضوح ضمن توصياتنا ومحتوانا. عندما تحتوي صفحة على روابط إحالة، نعرض إشعار إفصاح يخبرك بهذه الحقيقة',
      'تساعدنا إيرادات العمولة في الحفاظ على يلا لندن كمورد مجاني وتمويل أبحاث فريقنا التحريري وزيارات الأماكن والاستمرار في إنتاج محتوى ثنائي اللغة عالي الجودة لقرائنا',
    ],

    retentionTitle: 'الاحتفاظ بالبيانات',
    retentionIntro: 'نحتفظ بمعلوماتك الشخصية فقط طالما كان ذلك ضرورياً للأغراض الموضحة في هذه السياسة:',
    retentionItems: [
      'نماذج الاتصال: نحتفظ باسمك وعنوان بريدك الإلكتروني ومحتوى رسالتك لمدة 12 شهراً من تاريخ التقديم للسماح بمتابعة المراسلات وضمان الجودة. بعد 12 شهراً، يتم حذف النماذج نهائياً من قاعدة بياناتنا',
      'اشتراكات النشرة الإخبارية: نحتفظ بعنوان بريدك الإلكتروني طالما بقيت مشتركاً. عند إلغاء الاشتراك (عبر الرابط في أي بريد إلكتروني للنشرة أو بالاتصال بنا)، تتم إزالة عنوان بريدك الإلكتروني من قائمتنا البريدية خلال 7 أيام',
      'بيانات التحليلات: يتم الاحتفاظ ببيانات الاستخدام المجمعة عبر Google Analytics وفقاً لإعدادات الاحتفاظ بالبيانات الافتراضية من Google (14 شهراً لبيانات مستوى المستخدم). لا نمدد فترة الاحتفاظ هذه. قد يتم الاحتفاظ بتقارير التحليلات المجمعة غير القابلة للتعريف إلى أجل غير مسمى',
      'تفضيلات الموافقة على ملفات تعريف الارتباط: يتم تخزين خيارات موافقتك محلياً في متصفحك وتستمر حتى تمسح بيانات متصفحك أو تحدث تفضيلاتك عبر شريط الموافقة',
      'تفضيل اللغة: مخزن في التخزين المحلي لمتصفحك إلى أجل غير مسمى حتى تغيره أو تمسح بيانات متصفحك. هذه البيانات لا تغادر جهازك أبداً',
    ],

    rightsTitle: 'حقوقك',
    rightsIntro: 'بموجب النظام العام لحماية البيانات في المملكة المتحدة (UK GDPR) وقانون حماية البيانات 2018، لديك الحقوق التالية فيما يتعلق ببياناتك الشخصية:',
    rightsItems: [
      'حق الوصول: يمكنك طلب نسخة من جميع البيانات الشخصية التي نحتفظ بها عنك. سنوفرها خلال 30 يوماً من طلبك بدون رسوم',
      'حق التصحيح: إذا كانت أي بيانات شخصية نحتفظ بها عنك غير دقيقة أو غير كاملة، لديك الحق في طلب التصحيح. اتصل بنا وسنحدث معلوماتك على الفور',
      'حق المحو ("الحق في النسيان"): يمكنك طلب حذف جميع البيانات الشخصية التي نحتفظ بها عنك. سنمتثل خلال 30 يوماً، مع مراعاة أي التزامات قانونية تتطلب منا الاحتفاظ ببيانات معينة',
      'حق تقييد المعالجة: يمكنك أن تطلب منا إيقاف معالجة بياناتك الشخصية مؤقتاً أثناء معالجة مخاوفك أو التحقق من دقة البيانات',
      'حق نقل البيانات: يمكنك طلب بياناتك الشخصية بتنسيق منظم وشائع الاستخدام وقابل للقراءة آلياً (مثل CSV أو JSON)',
      'حق الاعتراض: يمكنك الاعتراض على معالجتنا لبياناتك لأغراض التحليلات أو التسويق المباشر في أي وقت',
      'حق سحب الموافقة: يمكنك سحب موافقتك على ملفات تعريف الارتباط في أي وقت عبر شريط الموافقة. يمكنك إلغاء الاشتراك في نشرتنا الإخبارية في أي وقت عبر رابط إلغاء الاشتراك في أي بريد إلكتروني. لا يؤثر السحب على مشروعية المعالجة التي تمت قبل السحب',
      'لممارسة أي من هذه الحقوق، يرجى الاتصال بنا على hello@yallalondon.com. سنرد خلال 30 يوماً. إذا لم تكن راضياً عن ردنا، لديك الحق في تقديم شكوى لمكتب مفوض المعلومات (ICO) على ico.org.uk',
    ],

    securityTitle: 'أمان البيانات',
    securityIntro: 'نأخذ أمان بياناتك الشخصية على محمل الجد وننفذ تدابير تقنية وتنظيمية مناسبة:',
    securityItems: [
      'تشفير SSL/TLS: جميع البيانات المنقولة بين متصفحك وموقعنا مشفرة باستخدام HTTPS (TLS 1.2+). هذا يحمي معلوماتك أثناء النقل، بما في ذلك نماذج الاتصال والتسجيل في النشرة الإخبارية',
      'استضافة آمنة على Vercel: يُستضاف موقعنا على بنية Vercel التحتية المؤسسية مع حماية DDoS التلقائية والتخزين المؤقت على الحافة وخطوط نشر آمنة. تحافظ Vercel على امتثال SOC 2 Type 2',
      'أمان قاعدة البيانات عبر Supabase: يتم تخزين البيانات الشخصية في قواعد بيانات PostgreSQL المُدارة من Supabase مع سياسات أمان على مستوى الصف وتشفير في حالة السكون (AES-256) واتصالات قاعدة بيانات مشفرة (SSL) ونسخ احتياطية تلقائية',
      'ضوابط الوصول: الوصول إلى البيانات الشخصية (مثل نماذج الاتصال وقوائم مشتركي النشرة الإخبارية) مقصور على أعضاء الفريق المصرح لهم فقط، باستخدام مصادقة قوية',
      'مراجعة دورية: نراجع بشكل دوري ممارساتنا الأمنية والأوضاع الأمنية لمزودي خدمات الطرف الثالث لدينا لضمان بقاء بياناتك محمية',
    ],

    childrenTitle: 'خصوصية الأطفال',
    childrenIntro: 'حماية خصوصية الأطفال مهمة بالنسبة لنا:',
    childrenItems: [
      'يلا لندن غير موجه للأطفال دون سن 13 عاماً. لا نجمع عن علم معلومات شخصية من الأطفال دون 13 عاماً',
      'إذا كنت والداً أو وصياً وتعتقد أن طفلك قد قدم معلومات شخصية لنا (مثل عبر نموذج الاتصال أو الاشتراك في النشرة الإخبارية)، يرجى الاتصال بنا على hello@yallalondon.com وسنحذف هذه المعلومات على الفور',
      'محتوى موقعنا مصمم للبالغين والشباب الذين يخططون للسفر إلى لندن. بينما قد تجد العائلات التي لديها أطفال أدلتنا المناسبة للعائلات مفيدة، نتوقع أن يدير أحد الوالدين أو الأوصياء أي تفاعل مع خدماتنا نيابة عن القاصرين',
    ],

    transfersTitle: 'عمليات نقل البيانات الدولية',
    transfersIntro: 'بما أننا نستخدم مزودي خدمات دوليين، قد يتم نقل بياناتك خارج المملكة المتحدة:',
    transfersItems: [
      'Google Analytics: قد تُعالج البيانات بواسطة Google في الولايات المتحدة. تشارك Google في إطار خصوصية البيانات بين الاتحاد الأوروبي والولايات المتحدة، مما يوفر ضمانات كافية لنقل البيانات',
      'Supabase: قد تُستضاف بنية قاعدة البيانات التحتية في مراكز بيانات AWS في مناطق الاتحاد الأوروبي (فرانكفورت) أو الولايات المتحدة، حسب التكوين. تطبق Supabase ضمانات مناسبة بما في ذلك البنود التعاقدية القياسية',
      'Vercel: يُقدَّم موقعنا من شبكة حافة Vercel العالمية، مع معالجة أساسية في الولايات المتحدة. تمتثل Vercel للبنود التعاقدية القياسية لنقل البيانات الدولية',
      'نضمن أن أي نقل دولي للبيانات الشخصية محمي بضمانات مناسبة كما يتطلب UK GDPR، بما في ذلك البنود التعاقدية القياسية وقرارات الكفاية أو أطر الاعتماد',
    ],

    updatesTitle: 'تحديثات هذه السياسة',
    updatesIntro: 'قد نحدث سياسة الخصوصية هذه من وقت لآخر لتعكس التغييرات في ممارساتنا أو خدماتنا أو المتطلبات القانونية:',
    updatesItems: [
      'عندما نجري تغييرات جوهرية على هذه السياسة، سنحدث تاريخ "آخر تحديث" في أعلى هذه الصفحة',
      'بالنسبة للتغييرات الهامة التي تؤثر على كيفية معالجة بياناتك الشخصية، قد نخطرك أيضاً عبر شريط على الموقع أو، إذا كنت مشتركاً في النشرة الإخبارية، عبر البريد الإلكتروني',
      'نشجعك على مراجعة هذه السياسة بشكل دوري للبقاء على اطلاع حول كيفية حماية معلوماتك',
      'استمرارك في استخدام الموقع بعد نشر التغييرات يشكل قبولك للسياسة المحدثة',
    ],

    contactTitle: 'اتصل بنا',
    contactIntro: 'إذا كانت لديك أسئلة حول سياسة الخصوصية هذه، أو تريد ممارسة حقوقك في البيانات، أو لديك مخاوف بشأن كيفية تعاملنا مع معلوماتك، يرجى التواصل معنا:',
    contactItems: [
      'البريد الإلكتروني: hello@yallalondon.com',
      'الموقع: لندن، المملكة المتحدة',
      'نهدف للرد على جميع الاستفسارات المتعلقة بالخصوصية خلال 30 يوماً',
      'إذا لم تكن راضياً عن ردنا، لديك الحق في الاتصال بمكتب مفوض المعلومات في المملكة المتحدة (ICO) على ico.org.uk أو بالاتصال على 0303 123 1113',
    ],
  },
}

export default function PrivacyPolicy() {
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
          {c.lastUpdated}: February 2025
        </p>
        <p className="text-stone mt-4 leading-relaxed">
          {c.intro}
        </p>
      </div>

      <div className="space-y-6">
        {/* Information We Collect */}
        <Card>
          <CardHeader>
            <CardTitle>{c.dataCollectTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">{c.dataCollectPersonalTitle}</h3>
              <p className="text-stone mb-2">
                {c.dataCollectPersonalIntro}
              </p>
              <ul className="list-disc list-inside text-stone space-y-2">
                {c.dataCollectPersonalItems.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">{c.dataCollectAutoTitle}</h3>
              <p className="text-stone mb-2">
                {c.dataCollectAutoIntro}
              </p>
              <ul className="list-disc list-inside text-stone space-y-2">
                {c.dataCollectAutoItems.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* How We Use Your Information */}
        <Card>
          <CardHeader>
            <CardTitle>{c.howWeUseTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-stone mb-3">
              {c.howWeUseIntro}
            </p>
            <ul className="list-disc list-inside text-stone space-y-2">
              {c.howWeUseItems.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Cookies & Tracking */}
        <Card>
          <CardHeader>
            <CardTitle>{c.cookiesTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-stone">
              {c.cookiesIntro}
            </p>

            <div>
              <h3 className="font-semibold mb-2">{c.cookiesEssentialTitle}</h3>
              <ul className="list-disc list-inside text-stone space-y-2">
                {c.cookiesEssentialItems.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">{c.cookiesAnalyticsTitle}</h3>
              <ul className="list-disc list-inside text-stone space-y-2">
                {c.cookiesAnalyticsItems.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">{c.cookiesThirdPartyTitle}</h3>
              <ul className="list-disc list-inside text-stone space-y-2">
                {c.cookiesThirdPartyItems.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Third-Party Services */}
        <Card>
          <CardHeader>
            <CardTitle>{c.thirdPartyTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-stone mb-3">
              {c.thirdPartyIntro}
            </p>
            <ul className="list-disc list-inside text-stone space-y-2">
              {c.thirdPartyItems.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Affiliate Disclosure */}
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

        {/* Data Retention */}
        <Card>
          <CardHeader>
            <CardTitle>{c.retentionTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-stone mb-3">
              {c.retentionIntro}
            </p>
            <ul className="list-disc list-inside text-stone space-y-2">
              {c.retentionItems.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Your Rights */}
        <Card>
          <CardHeader>
            <CardTitle>{c.rightsTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-stone mb-3">
              {c.rightsIntro}
            </p>
            <ul className="list-disc list-inside text-stone space-y-2">
              {c.rightsItems.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Data Security */}
        <Card>
          <CardHeader>
            <CardTitle>{c.securityTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-stone mb-3">
              {c.securityIntro}
            </p>
            <ul className="list-disc list-inside text-stone space-y-2">
              {c.securityItems.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Children's Privacy */}
        <Card>
          <CardHeader>
            <CardTitle>{c.childrenTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-stone mb-3">
              {c.childrenIntro}
            </p>
            <ul className="list-disc list-inside text-stone space-y-2">
              {c.childrenItems.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* International Data Transfers */}
        <Card>
          <CardHeader>
            <CardTitle>{c.transfersTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-stone mb-3">
              {c.transfersIntro}
            </p>
            <ul className="list-disc list-inside text-stone space-y-2">
              {c.transfersItems.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Updates to This Policy */}
        <Card>
          <CardHeader>
            <CardTitle>{c.updatesTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-stone mb-3">
              {c.updatesIntro}
            </p>
            <ul className="list-disc list-inside text-stone space-y-2">
              {c.updatesItems.map((item, i) => (
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
