'use client';

import Link from 'next/link';
import {
  Utensils,
  Shield,
  Heart,
  Users,
  Moon,
  MapPin,
  Star,
  CheckCircle2,
  ArrowRight,
  Anchor,
  Phone,
} from 'lucide-react';
import { useLanguage } from '@/components/language-provider';

type Locale = 'en' | 'ar';

interface Props {
  siteName: string;
  siteId: string;
  serverLocale: Locale;
  baseUrl: string;
}

const FEATURES = [
  {
    icon: 'utensils',
    title: { en: 'Certified Halal Catering', ar: 'طعام حلال معتمد' },
    description: {
      en: 'Onboard chefs trained in halal cuisine. All meat sourced from certified halal suppliers at each Mediterranean port. Pre-approved menus featuring local dishes prepared to Islamic dietary standards.',
      ar: 'طهاة على متن اليخت مدربون على المطبخ الحلال. جميع اللحوم من موردين حلال معتمدين في كل ميناء متوسطي. قوائم طعام معتمدة مسبقاً تتضمن أطباقاً محلية محضرة وفقاً لمعايير الغذاء الإسلامية.',
    },
  },
  {
    icon: 'moon',
    title: { en: 'Prayer-Friendly Spaces', ar: 'مساحات ملائمة للصلاة' },
    description: {
      en: 'Dedicated quiet areas for prayer onboard. Qibla direction provided by the captain. Prayer mats and washing facilities available. Flexible itinerary adjustments during Ramadan and Islamic holidays.',
      ar: 'مناطق هادئة مخصصة للصلاة على متن اليخت. اتجاه القبلة يوفره القبطان. سجادات صلاة ومرافق وضوء متاحة. تعديلات مرنة في المسار خلال رمضان والأعياد الإسلامية.',
    },
  },
  {
    icon: 'shield',
    title: { en: 'Alcohol-Free Options', ar: 'خيارات خالية من الكحول' },
    description: {
      en: 'Fully alcohol-free charter packages available. Premium mocktails, fresh juices, Arabic coffee, and specialty teas prepared by your onboard chef. No alcohol stored or served aboard if requested.',
      ar: 'باقات تأجير خالية تماماً من الكحول. موكتيلات فاخرة وعصائر طازجة وقهوة عربية وشاي متخصص يعده الشيف. لا يُخزن أو يُقدم كحول على متن اليخت إذا طُلب ذلك.',
    },
  },
  {
    icon: 'users',
    title: { en: 'Arabic-Speaking Crew', ar: 'طاقم يتحدث العربية' },
    description: {
      en: 'Crew members who speak Arabic and understand Gulf hospitality. Familiar with cultural preferences for privacy, family arrangements, and service style expected by Arab charter guests.',
      ar: 'أفراد طاقم يتحدثون العربية ويفهمون ضيافة الخليج. على دراية بالتفضيلات الثقافية للخصوصية وترتيبات العائلة وأسلوب الخدمة المتوقع من ضيوف التأجير العرب.',
    },
  },
  {
    icon: 'heart',
    title: { en: 'Family-First Privacy', ar: 'خصوصية العائلة أولاً' },
    description: {
      en: 'Complete privacy for your family at sea. Secluded anchorages away from crowded beaches. Separate crew quarters. Tinted windows and private sun decks. Women-only swimming stops available on request.',
      ar: 'خصوصية كاملة لعائلتك في البحر. مراسي منعزلة بعيداً عن الشواطئ المزدحمة. أجنحة منفصلة للطاقم. نوافذ معتمة وأسطح شمسية خاصة. محطات سباحة للنساء فقط متاحة عند الطلب.',
    },
  },
  {
    icon: 'map',
    title: { en: 'Mosque & Halal Guides', ar: 'دليل المساجد والحلال' },
    description: {
      en: 'Pre-researched guides for every destination on your itinerary: nearest mosques, halal restaurants onshore, Islamic cultural sites, and halal-friendly shopping areas. Your captain carries this information for every port.',
      ar: 'أدلة مُعدة مسبقاً لكل وجهة في مسارك: أقرب المساجد ومطاعم الحلال على الشاطئ والمواقع الثقافية الإسلامية ومناطق التسوق الصديقة للحلال.',
    },
  },
];

const DESTINATIONS = [
  {
    name: { en: 'Turkish Riviera', ar: 'الريفييرا التركية' },
    highlight: { en: 'Most halal-friendly destination. Abundant halal dining, mosques at every port.', ar: 'الوجهة الأكثر ملاءمة للحلال. مطاعم حلال وفيرة ومساجد في كل ميناء.' },
  },
  {
    name: { en: 'Greek Islands', ar: 'الجزر اليونانية' },
    highlight: { en: 'Growing halal options in Rhodes and Kos. Fresh seafood is naturally halal.', ar: 'خيارات حلال متزايدة في رودس وكوس. المأكولات البحرية الطازجة حلال بطبيعتها.' },
  },
  {
    name: { en: 'Croatian Coast', ar: 'الساحل الكرواتي' },
    highlight: { en: 'Halal restaurants in Dubrovnik and Split. Stunning Adriatic anchorages.', ar: 'مطاعم حلال في دوبروفنيك وسبليت. مراسي أدرياتيكية خلابة.' },
  },
  {
    name: { en: 'French Riviera', ar: 'الريفييرا الفرنسية' },
    highlight: { en: 'Established halal dining in Nice, Cannes, Monaco. Premium provisioning available.', ar: 'مطاعم حلال راسخة في نيس وكان وموناكو. تموين فاخر متاح.' },
  },
  {
    name: { en: 'Sardinia & Sicily', ar: 'سردينيا وصقلية' },
    highlight: { en: 'Sicily has a rich Islamic heritage. Halal options in Palermo and Catania.', ar: 'صقلية لديها تراث إسلامي غني. خيارات حلال في باليرمو وكاتانيا.' },
  },
];

function FeatureIcon({ name, size = 24 }: { name: string; size?: number }) {
  const props = { size, style: { color: 'var(--z-gold)' } };
  switch (name) {
    case 'utensils': return <Utensils {...props} />;
    case 'moon': return <Moon {...props} />;
    case 'shield': return <Shield {...props} />;
    case 'users': return <Users {...props} />;
    case 'heart': return <Heart {...props} />;
    case 'map': return <MapPin {...props} />;
    default: return <Star {...props} />;
  }
}

export function HalalCharterClient({ siteName, siteId, serverLocale, baseUrl }: Props) {
  const { language } = useLanguage();
  const lang: Locale = serverLocale || language || 'en';
  const isRtl = lang === 'ar';

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="min-h-screen" style={{ background: 'var(--z-sand, #FAF8F4)' }}>
      {/* Hero */}
      <section
        className="relative py-24 px-4"
        style={{
          background: 'linear-gradient(135deg, var(--z-navy) 0%, var(--z-midnight, #1e293b) 100%)',
        }}
      >
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Moon size={20} style={{ color: 'var(--z-gold)' }} />
            <span className="text-xs font-heading font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--z-gold)' }}>
              {isRtl ? 'رحلات يخت حلال' : 'Halal Yacht Charters'}
            </span>
          </div>
          <h1
            className="text-3xl md:text-5xl font-display font-bold mb-5"
            style={{ color: 'var(--z-champagne, #f5f0e8)' }}
          >
            {isRtl
              ? 'رحلات يخت حلال فاخرة في المتوسط'
              : 'Luxury Halal Yacht Charters in the Mediterranean'}
          </h1>
          <p className="text-base md:text-lg max-w-2xl mx-auto mb-8" style={{ color: 'rgba(255,255,255,0.75)' }}>
            {isRtl
              ? 'طعام حلال معتمد، مساحات للصلاة، طاقم يتحدث العربية، وخصوصية كاملة لعائلتك. كل ما تحتاجه لرحلة بحرية تحترم قيمك.'
              : 'Certified halal catering, prayer-friendly spaces, Arabic-speaking crew, and complete privacy for your family. Everything you need for a charter that respects your values.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/inquiry"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-sm font-heading font-bold transition-all hover:scale-105"
              style={{ background: 'var(--z-gold)', color: 'var(--z-navy)' }}
            >
              {isRtl ? 'احجز رحلتك الحلال' : 'Book Your Halal Charter'}
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/yachts"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-sm font-heading font-semibold border transition-all hover:bg-white/10"
              style={{ borderColor: 'rgba(255,255,255,0.3)', color: 'white' }}
            >
              {isRtl ? 'تصفح الأسطول' : 'Browse Fleet'}
            </Link>
          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <div className="max-w-5xl mx-auto px-4 -mt-6">
        <div
          className="rounded-xl p-4 flex flex-wrap items-center justify-center gap-6 text-xs font-heading font-semibold shadow-md"
          style={{ background: 'white', color: 'var(--z-navy)' }}
        >
          {[
            { icon: <CheckCircle2 size={16} style={{ color: 'var(--z-gold)' }} />, text: isRtl ? 'حلال معتمد' : 'Certified Halal' },
            { icon: <Moon size={16} style={{ color: 'var(--z-gold)' }} />, text: isRtl ? 'مساحات صلاة' : 'Prayer Spaces' },
            { icon: <Shield size={16} style={{ color: 'var(--z-gold)' }} />, text: isRtl ? 'خيار بدون كحول' : 'Alcohol-Free Option' },
            { icon: <Users size={16} style={{ color: 'var(--z-gold)' }} />, text: isRtl ? 'طاقم عربي' : 'Arabic Crew' },
          ].map((item) => (
            <div key={item.text} className="flex items-center gap-1.5">
              {item.icon}
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Features Grid */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <h2
          className="text-2xl md:text-3xl font-display font-bold text-center mb-3"
          style={{ color: 'var(--z-navy)' }}
        >
          {isRtl ? 'ما يميز تجربتنا الحلال' : 'What Makes Our Halal Experience Special'}
        </h2>
        <p className="text-sm text-center mb-10 max-w-xl mx-auto" style={{ color: 'var(--z-midnight, #64748b)' }}>
          {isRtl
            ? 'كل جانب من رحلتك مصمم لاحترام قيمك وتفضيلاتك الثقافية'
            : 'Every aspect of your charter designed to respect your values and cultural preferences'}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div
              key={f.icon}
              className="rounded-xl p-6 border transition-all hover:shadow-md"
              style={{ background: 'white', borderColor: 'var(--z-champagne)' }}
            >
              <div
                className="w-11 h-11 rounded-lg flex items-center justify-center mb-4"
                style={{ background: 'var(--z-navy)' }}
              >
                <FeatureIcon name={f.icon} size={22} />
              </div>
              <h3 className="font-heading font-bold text-base mb-2" style={{ color: 'var(--z-navy)' }}>
                {f.title[lang]}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--z-midnight, #475569)' }}>
                {f.description[lang]}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Destinations */}
      <section className="py-16 px-4" style={{ background: 'var(--z-navy)' }}>
        <div className="max-w-4xl mx-auto">
          <h2
            className="text-2xl md:text-3xl font-display font-bold text-center mb-3"
            style={{ color: 'var(--z-champagne)' }}
          >
            {isRtl ? 'وجهات صديقة للحلال' : 'Halal-Friendly Destinations'}
          </h2>
          <p className="text-sm text-center mb-10" style={{ color: 'rgba(255,255,255,0.6)' }}>
            {isRtl
              ? 'أفضل وجهات البحر المتوسط لرحلات يخت حلال'
              : 'Top Mediterranean destinations for halal yacht charters'}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {DESTINATIONS.map((d) => (
              <div
                key={d.name.en}
                className="rounded-xl p-5 border border-white/10 hover:border-[var(--z-gold)] transition-all"
                style={{ background: 'rgba(255,255,255,0.05)' }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <MapPin size={16} style={{ color: 'var(--z-gold)' }} />
                  <h3 className="font-heading font-bold text-sm" style={{ color: 'var(--z-champagne)' }}>
                    {d.name[lang]}
                  </h3>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  {d.highlight[lang]}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-4 py-16 text-center">
        <Anchor size={32} className="mx-auto mb-4" style={{ color: 'var(--z-gold)' }} />
        <h2 className="text-2xl md:text-3xl font-display font-bold mb-3" style={{ color: 'var(--z-navy)' }}>
          {isRtl ? 'ابدأ التخطيط لرحلتك الحلال' : 'Start Planning Your Halal Charter'}
        </h2>
        <p className="text-sm mb-8 max-w-lg mx-auto" style={{ color: 'var(--z-midnight, #64748b)' }}>
          {isRtl
            ? 'تواصل مع متخصصي التأجير لدينا الذين يتحدثون العربية ويفهمون احتياجاتك'
            : 'Connect with our charter specialists who speak Arabic and understand your needs'}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/inquiry"
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-sm font-heading font-bold transition-all hover:scale-105"
            style={{ background: 'var(--z-gold)', color: 'var(--z-navy)' }}
          >
            {isRtl ? 'أرسل استفساراً' : 'Send an Inquiry'}
          </Link>
          <Link
            href="/charter-planner"
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-sm font-heading font-semibold border transition-all hover:bg-[var(--z-navy)] hover:text-white"
            style={{ borderColor: 'var(--z-navy)', color: 'var(--z-navy)' }}
          >
            {isRtl ? 'مخطط الرحلة بالذكاء الاصطناعي' : 'AI Charter Planner'}
          </Link>
        </div>
      </section>
    </div>
  );
}
