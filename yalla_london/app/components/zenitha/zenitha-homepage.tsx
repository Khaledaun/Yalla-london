'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Compass, Anchor, Ship, Star, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/components/language-provider';
import { useScrollRevealClass } from '@/hooks/use-scroll-reveal';

// ─── Types ──────────────────────────────────────────────────
type Locale = 'en' | 'ar';

// ─── Trust Stats ─────────────────────────────────────────────
const TRUST_STATS = [
  { value: '200+', label: { en: 'Handpicked Yachts', ar: 'يخت مختار بعناية' } },
  { value: '15', label: { en: 'Destinations', ar: 'وجهة' } },
  { value: '4.9', label: { en: 'Average Rating', ar: 'متوسط التقييم' }, suffix: '★' },
  { value: '100%', label: { en: 'Halal Options', ar: 'خيارات حلال' } },
];

// ─── Featured Destinations ──────────────────────────────────
const DESTINATIONS = [
  { name: { en: 'Greek Islands', ar: 'الجزر اليونانية' }, season: { en: 'May – Oct', ar: 'مايو – أكتوبر' }, slug: 'greek-islands', yachtCount: 47, priceFrom: '€3,500' },
  { name: { en: 'Croatian Coast', ar: 'ساحل كرواتيا' }, season: { en: 'Jun – Sep', ar: 'يونيو – سبتمبر' }, slug: 'croatian-coast', yachtCount: 38, priceFrom: '€4,000' },
  { name: { en: 'Turkish Riviera', ar: 'الريفيرا التركية' }, season: { en: 'May – Oct', ar: 'مايو – أكتوبر' }, slug: 'turkish-riviera', yachtCount: 52, priceFrom: '€2,800' },
  { name: { en: 'French Riviera', ar: 'الريفيرا الفرنسية' }, season: { en: 'Jun – Sep', ar: 'يونيو – سبتمبر' }, slug: 'french-riviera', yachtCount: 31, priceFrom: '€5,500' },
];

// ─── How It Works Steps ─────────────────────────────────────
const STEPS = [
  { icon: Compass, title: { en: 'Tell Us Your Dream', ar: 'أخبرنا بحلمك' }, description: { en: 'Share your destination, dates, group size, and preferences. Our charter specialists listen carefully.', ar: 'شاركنا وجهتك وتواريخك وحجم مجموعتك وتفضيلاتك. متخصصو الاستئجار لدينا يستمعون بعناية.' } },
  { icon: Anchor, title: { en: 'We Curate Your Charter', ar: 'نصمم رحلتك' }, description: { en: 'We match you with the perfect yacht, plan your itinerary, and handle every detail — from halal catering to water sports.', ar: 'نطابقك مع اليخت المثالي، نخطط مسارك، ونتولى كل التفاصيل — من الطعام الحلال إلى الرياضات المائية.' } },
  { icon: Ship, title: { en: 'Set Sail', ar: 'أبحر' }, description: { en: 'Board your yacht and experience the Mediterranean, Gulf, or beyond. Your crew handles everything — you simply enjoy.', ar: 'استقل يختك واستمتع بالبحر المتوسط أو الخليج أو ما وراءهما. طاقمك يتولى كل شيء — أنت فقط استمتع.' } },
];

// ─── Testimonials ────────────────────────────────────────────
const TESTIMONIALS = [
  { name: 'Ahmed & Family', origin: { en: 'Dubai, UAE', ar: 'دبي، الإمارات' }, quote: { en: 'Zenitha arranged everything perfectly — the halal kitchen was authentic, the crew spoke Arabic, and the children had the time of their lives. We\'re booking again next summer.', ar: 'نظمت زينيثا كل شيء بشكل مثالي — المطبخ الحلال كان أصيلاً، الطاقم يتحدث العربية، والأطفال استمتعوا كثيراً. سنحجز مرة أخرى الصيف القادم.' }, destination: { en: 'Greek Islands', ar: 'الجزر اليونانية' }, yachtType: { en: 'Catamaran', ar: 'كاتاماران' }, rating: 5 },
  { name: 'Fatima Al-Rashid', origin: { en: 'Jeddah, KSA', ar: 'جدة، السعودية' }, quote: { en: 'The privacy was absolute. A week anchored in secluded bays along the Turkish coast with my closest friends — this is how luxury should feel.', ar: 'الخصوصية كانت مطلقة. أسبوع راسين في خلجان منعزلة على الساحل التركي مع أقرب صديقاتي — هكذا يجب أن يكون شعور الفخامة.' }, destination: { en: 'Turkish Riviera', ar: 'الريفيرا التركية' }, yachtType: { en: 'Gulet', ar: 'قوارب تركية' }, rating: 5 },
  { name: 'Khalid & Noor', origin: { en: 'Kuwait City', ar: 'مدينة الكويت' }, quote: { en: 'First time chartering and Zenitha made it effortless. The AI planner suggested a Croatian route we would never have found ourselves. Every port was a discovery.', ar: 'أول تجربة استئجار وزينيثا جعلتها سهلة. المخطط الذكي اقترح مساراً كرواتياً لم نكن لنجده بأنفسنا. كل ميناء كان اكتشافاً.' }, destination: { en: 'Croatian Coast', ar: 'ساحل كرواتيا' }, yachtType: { en: 'Sailing Yacht', ar: 'يخت شراعي' }, rating: 5 },
];

// ─── Hero Section ────────────────────────────────────────────
function HeroSection({ locale }: { locale: Locale }) {
  const t = (obj: { en: string; ar: string }) => obj[locale] || obj.en;

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-[var(--z-navy)]">
      {/* Background gradient (placeholder for hero image) */}
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--z-navy)] via-[var(--z-midnight)] to-[var(--z-aegean)] opacity-90" />
      <div className="absolute inset-0 bg-[url('/branding/zenitha-yachts/hero-pattern.svg')] bg-cover bg-center opacity-10" />

      {/* Content */}
      <div className="relative z-10 max-w-[1280px] mx-auto px-6 text-center">
        <div className="animate-fadeUp">
          {/* Overline */}
          <span className="inline-block text-[var(--z-gold)] text-xs font-heading font-semibold uppercase tracking-[0.2em] mb-6">
            {t({ en: 'Luxury Yacht Charter', ar: 'استئجار يخوت فاخرة' })}
          </span>

          {/* H1 */}
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-[1.05] mb-6" style={{ letterSpacing: '-0.02em' }}>
            {t({
              en: 'Sail the World\'s Most Beautiful Coastlines',
              ar: 'أبحر على أجمل سواحل العالم',
            })}
          </h1>

          {/* Subtitle */}
          <p className="font-body text-lg sm:text-xl text-[var(--z-shallow)] max-w-[600px] mx-auto mb-10 leading-relaxed">
            {t({
              en: 'Private charters across the Mediterranean, Arabian Gulf & beyond. Halal dining. Expert crews. Your sea, your way.',
              ar: 'رحلات بحرية خاصة عبر البحر المتوسط والخليج العربي وما وراءهما. طعام حلال. طواقم محترفة. بحرك، على طريقتك.',
            })}
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/charter-planner" className="z-btn-primary text-base px-8 py-3.5">
              {t({ en: 'Plan Your Charter', ar: 'خطط رحلتك' })} <ArrowRight size={18} className="inline ml-2" />
            </Link>
            <Link href="/yachts" className="text-white font-heading font-medium text-base hover:text-[var(--z-gold)] transition-colors underline underline-offset-4 decoration-white/30 hover:decoration-[var(--z-gold)]">
              {t({ en: 'Browse Our Fleet', ar: 'تصفح أسطولنا' })}
            </Link>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-pulse">
          <ChevronDown size={24} className="text-white/40" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}

// ─── Trust Bar ───────────────────────────────────────────────
function TrustBar({ locale }: { locale: Locale }) {
  const t = (obj: { en: string; ar: string }) => obj[locale] || obj.en;
  const revealRef = useScrollRevealClass<HTMLElement>();

  return (
    <section ref={revealRef} className="bg-[var(--z-pearl)] border-b border-[var(--z-champagne)]">
      <div className="max-w-[1280px] mx-auto px-6 py-6">
        <div className="flex flex-wrap justify-center items-center gap-8 sm:gap-16">
          {TRUST_STATS.map((stat, i) => (
            <div key={i} className="text-center z-reveal-fadeUp z-reveal-stagger">
              <div className="font-display text-2xl sm:text-3xl font-bold text-[var(--z-navy)]">
                {stat.value}{'suffix' in stat && <span className="text-[var(--z-gold)]">{stat.suffix}</span>}
              </div>
              <div className="text-xs font-heading font-medium text-[var(--z-aegean)] uppercase tracking-wide mt-1">
                {t(stat.label)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Featured Yachts Section ─────────────────────────────────
function FeaturedYachtsSection({ locale }: { locale: Locale }) {
  const t = (obj: { en: string; ar: string }) => obj[locale] || obj.en;
  const headerRef = useScrollRevealClass<HTMLDivElement>();
  const sectionRef = useScrollRevealClass<HTMLDivElement>();

  return (
    <section className="py-20 bg-white">
      <div className="max-w-[1280px] mx-auto px-6">
        {/* Section Header */}
        <div ref={headerRef} className="text-center mb-12 z-reveal-fadeUp">
          <span className="text-xs font-heading font-semibold uppercase tracking-[0.12em] text-[var(--z-gold)]">
            {t({ en: 'Our Fleet', ar: 'أسطولنا' })}
          </span>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-[var(--z-navy)] mt-3" style={{ letterSpacing: '-0.01em' }}>
            {t({ en: 'Handpicked Vessels for Exceptional Voyages', ar: 'سفن مختارة بعناية لرحلات استثنائية' })}
          </h2>
        </div>

        {/* Fleet Preview — links to full search */}
        <div ref={sectionRef} className="z-reveal-fadeUp">
          <div className="bg-gradient-to-br from-[var(--z-sand)] to-[var(--z-champagne)] rounded-2xl p-10 sm:p-14 text-center">
            <Ship size={56} className="text-[var(--z-aegean)] mx-auto mb-6" style={{ opacity: 0.4 }} aria-hidden="true" />
            <h3 className="font-heading text-xl sm:text-2xl font-semibold text-[var(--z-navy)] mb-3">
              {t({ en: 'Your Perfect Yacht Awaits', ar: 'يختك المثالي بانتظارك' })}
            </h3>
            <p className="font-body text-[var(--z-aegean)] max-w-lg mx-auto mb-8 leading-relaxed">
              {t({
                en: 'Browse our curated selection of motor yachts, catamarans, gulets, and sailing yachts — each handpicked for exceptional Mediterranean charters.',
                ar: 'تصفح مجموعتنا المختارة من اليخوت الآلية والكاتاماران والقوارب التركية واليخوت الشراعية — كل واحد مختار بعناية لرحلات استثنائية في البحر المتوسط.',
              })}
            </p>
            <Link href="/yachts" className="z-btn-primary text-base px-8 py-3.5 inline-flex items-center gap-2">
              {t({ en: 'Explore Our Fleet', ar: 'استكشف أسطولنا' })} <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Destinations Section ────────────────────────────────────
function DestinationsSection({ locale }: { locale: Locale }) {
  const t = (obj: { en: string; ar: string }) => obj[locale] || obj.en;
  const headerRef = useScrollRevealClass<HTMLDivElement>();
  const gridRef = useScrollRevealClass<HTMLDivElement>();

  return (
    <section className="py-20 bg-[var(--z-sand)]">
      <div className="max-w-[1280px] mx-auto px-6">
        <div ref={headerRef} className="text-center mb-12 z-reveal-fadeUp">
          <span className="text-xs font-heading font-semibold uppercase tracking-[0.12em] text-[var(--z-gold)]">
            {t({ en: 'Destinations', ar: 'الوجهات' })}
          </span>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-[var(--z-navy)] mt-3">
            {t({ en: 'Where Will the Wind Take You?', ar: 'إلى أين ستأخذك الرياح؟' })}
          </h2>
        </div>

        <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {DESTINATIONS.map((dest, i) => (
            <Link key={i} href={`/destinations/${dest.slug}`} className="group relative z-reveal-scaleIn z-reveal-stagger">
              <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-gradient-to-br from-[var(--z-midnight)] to-[var(--z-aegean)]">
                {/* Placeholder for destination image */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <Compass size={40} className="text-white/15" aria-hidden="true" />
                </div>
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--z-navy)]/85 via-[var(--z-navy)]/40 to-transparent" />
                {/* Content */}
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <h3 className="font-heading text-xl font-semibold text-white mb-1">
                    {t(dest.name)}
                  </h3>
                  <p className="text-sm font-body text-[var(--z-champagne)]">
                    {t(dest.season)} · {t({ en: `From ${dest.priceFrom}/wk`, ar: `من ${dest.priceFrom}/أسبوع` })}
                  </p>
                  <p className="text-xs font-body text-white/60 mt-1">
                    {dest.yachtCount} {t({ en: 'yachts available', ar: 'يخت متاح' })}
                  </p>
                </div>
                {/* Hover effect */}
                <div className="absolute inset-0 bg-[var(--z-gold)]/0 group-hover:bg-[var(--z-gold)]/5 transition-colors duration-350" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── How It Works Section ────────────────────────────────────
function HowItWorksSection({ locale }: { locale: Locale }) {
  const t = (obj: { en: string; ar: string }) => obj[locale] || obj.en;
  const headerRef = useScrollRevealClass<HTMLDivElement>();
  const stepsRef = useScrollRevealClass<HTMLDivElement>();

  return (
    <section className="py-20 bg-white">
      <div className="max-w-[1280px] mx-auto px-6">
        <div ref={headerRef} className="text-center mb-14 z-reveal-fadeUp">
          <span className="text-xs font-heading font-semibold uppercase tracking-[0.12em] text-[var(--z-gold)]">
            {t({ en: 'The Process', ar: 'العملية' })}
          </span>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-[var(--z-navy)] mt-3">
            {t({ en: 'Charter Made Simple', ar: 'الاستئجار بكل سهولة' })}
          </h2>
        </div>

        <div ref={stepsRef} className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {STEPS.map((step, i) => (
            <div key={i} className="text-center z-reveal-fadeUp z-reveal-stagger">
              {/* Step number + Icon */}
              <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-full bg-[var(--z-sand)] mb-6">
                <step.icon size={32} className="text-[var(--z-aegean)]" />
                <span className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-[var(--z-gold)] text-[var(--z-navy)] text-sm font-heading font-bold flex items-center justify-center">
                  {i + 1}
                </span>
              </div>
              <h3 className="font-heading text-xl font-semibold text-[var(--z-navy)] mb-3">
                {t(step.title)}
              </h3>
              <p className="font-body text-[var(--z-aegean)] leading-relaxed max-w-xs mx-auto">
                {t(step.description)}
              </p>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link href="/inquiry" className="z-btn-primary text-base px-8 py-3.5">
            {t({ en: 'Start Planning', ar: 'ابدأ التخطيط' })} <ArrowRight size={18} className="inline ml-2" />
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── AI Planner Teaser ──────────────────────────────────────
function AIPlannerSection({ locale }: { locale: Locale }) {
  const t = (obj: { en: string; ar: string }) => obj[locale] || obj.en;
  const sectionRef = useScrollRevealClass<HTMLElement>();

  return (
    <section ref={sectionRef} className="py-20 bg-[var(--z-pearl)]">
      <div className="max-w-[1280px] mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="z-reveal-fadeLeft z-reveal-stagger">
            <span className="text-xs font-heading font-semibold uppercase tracking-[0.12em] text-[var(--z-gold)]">
              {t({ en: 'AI-Powered', ar: 'مدعوم بالذكاء الاصطناعي' })}
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-[var(--z-navy)] mt-3 mb-5">
              {t({ en: 'Let Our Charter Specialist Design Your Perfect Trip', ar: 'دع متخصص الاستئجار لدينا يصمم رحلتك المثالية' })}
            </h2>
            <p className="font-body text-lg text-[var(--z-aegean)] leading-relaxed mb-8">
              {t({
                en: 'Tell us your dream destination, dates, and preferences. Our AI charter planner creates a personalized itinerary with yacht recommendations, daily routes, and cost estimates — in minutes.',
                ar: 'أخبرنا عن وجهة أحلامك وتواريخك وتفضيلاتك. مخططنا الذكي يصمم مساراً مخصصاً مع توصيات اليخوت والطرق اليومية وتقديرات التكلفة — في دقائق.',
              })}
            </p>
            <Link href="/charter-planner" className="z-btn-primary text-base px-8 py-3.5">
              {t({ en: 'Try the Charter Planner', ar: 'جرب مخطط الرحلات' })} <ArrowRight size={18} className="inline ml-2" />
            </Link>
          </div>
          {/* Illustration placeholder */}
          <div className="relative aspect-square max-w-md mx-auto lg:mx-0 z-reveal-fadeRight z-reveal-stagger">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[var(--z-sand)] to-[var(--z-champagne)] flex items-center justify-center">
              <div className="text-center">
                <Compass size={80} className="text-[var(--z-aegean)]/30 mx-auto mb-4" aria-hidden="true" />
                <p className="text-sm font-heading text-[var(--z-aegean)]/50">{t({ en: 'AI Charter Planner Preview', ar: 'معاينة مخطط الرحلات' })}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Testimonials Section ────────────────────────────────────
function TestimonialsSection({ locale }: { locale: Locale }) {
  const t = (obj: { en: string; ar: string }) => obj[locale] || obj.en;
  const [activeIndex, setActiveIndex] = useState(0);

  const next = () => setActiveIndex((i) => (i + 1) % TESTIMONIALS.length);
  const prev = () => setActiveIndex((i) => (i - 1 + TESTIMONIALS.length) % TESTIMONIALS.length);

  // Auto-advance every 8 seconds
  useEffect(() => {
    const interval = setInterval(next, 8000);
    return () => clearInterval(interval);
  }, []);

  const testimonial = TESTIMONIALS[activeIndex];

  return (
    <section className="py-20 bg-[var(--z-navy)]">
      <div className="max-w-[900px] mx-auto px-6 text-center">
        <span className="text-xs font-heading font-semibold uppercase tracking-[0.12em] text-[var(--z-gold)]">
          {t({ en: 'Guest Stories', ar: 'قصص الضيوف' })}
        </span>

        <div className="mt-10 min-h-[200px]">
          {/* Quote */}
          <div className="relative">
            <span className="text-6xl text-[var(--z-gold)]/30 font-display absolute -top-8 left-0">&ldquo;</span>
            <p className="font-body text-lg sm:text-xl text-white/90 leading-relaxed italic px-8">
              {t(testimonial.quote)}
            </p>
          </div>

          {/* Attribution */}
          <div className="mt-8">
            <div className="flex items-center justify-center gap-1 mb-2">
              {Array.from({ length: testimonial.rating }).map((_, i) => (
                <Star key={i} size={16} className="fill-[var(--z-gold)] text-[var(--z-gold)]" aria-hidden="true" />
              ))}
            </div>
            <p className="font-heading font-semibold text-white">{testimonial.name}</p>
            <p className="text-sm font-body text-[var(--z-shallow)]">
              {t(testimonial.origin)} · {t(testimonial.destination)} · {t(testimonial.yachtType)}
            </p>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-center gap-4 mt-8">
          <button onClick={prev} className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center text-white/60 hover:border-[var(--z-gold)] hover:text-[var(--z-gold)] transition-colors" aria-label="Previous testimonial">
            <ChevronLeft size={18} />
          </button>
          <div className="flex gap-2">
            {TESTIMONIALS.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveIndex(i)}
                className={`w-2 h-2 rounded-full transition-colors ${i === activeIndex ? 'bg-[var(--z-gold)]' : 'bg-white/20'}`}
                aria-label={`Go to testimonial ${i + 1}`}
              />
            ))}
          </div>
          <button onClick={next} className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center text-white/60 hover:border-[var(--z-gold)] hover:text-[var(--z-gold)] transition-colors" aria-label="Next testimonial">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </section>
  );
}

// ─── Newsletter Section ──────────────────────────────────────
function NewsletterSection({ locale }: { locale: Locale }) {
  const t = (obj: { en: string; ar: string }) => obj[locale] || obj.en;
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const sectionRef = useScrollRevealClass<HTMLElement>();

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus('submitting');
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, siteId: 'zenitha-yachts-med' }),
      });
      if (res.ok) {
        setStatus('success');
        setEmail('');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  return (
    <section ref={sectionRef} className="py-16 bg-gradient-to-br from-[var(--z-champagne)] to-[var(--z-sand)]">
      <div className="max-w-[600px] mx-auto px-6 text-center z-reveal-fadeUp">
        <h3 className="font-display text-2xl sm:text-3xl font-bold text-[var(--z-navy)] mb-3">
          {t({ en: 'Receive Exclusive Charter Offers', ar: 'احصل على عروض حصرية' })}
        </h3>
        <p className="font-body text-[var(--z-aegean)] mb-8">
          {t({ en: 'Early access to new yachts, seasonal deals, and insider sailing guides.', ar: 'وصول مبكر لليخوت الجديدة والعروض الموسمية وأدلة الإبحار الحصرية.' })}
        </p>
        {status === 'success' ? (
          <p className="font-body text-[var(--z-navy)] font-semibold py-3">
            {t({ en: 'Thank you! You\'re on the list.', ar: 'شكراً! تمت إضافتك إلى القائمة.' })}
          </p>
        ) : (
          <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t({ en: 'Your email address', ar: 'بريدك الإلكتروني' })}
              className="flex-1 px-4 py-3 rounded-lg border border-[var(--z-champagne)] bg-white text-[var(--z-navy)] font-body placeholder:text-[var(--z-aegean)]/50 focus:outline-none focus:border-[var(--z-aegean)] focus:ring-1 focus:ring-[var(--z-aegean)]"
              required
              disabled={status === 'submitting'}
            />
            <button type="submit" className="z-btn-primary px-6 py-3" disabled={status === 'submitting'}>
              {status === 'submitting'
                ? t({ en: 'Subscribing...', ar: 'جارٍ الاشتراك...' })
                : t({ en: 'Subscribe', ar: 'اشترك' })}
            </button>
          </form>
        )}
        {status === 'error' && (
          <p className="text-sm font-body text-red-600 mt-2">
            {t({ en: 'Something went wrong. Please try again.', ar: 'حدث خطأ. يرجى المحاولة مرة أخرى.' })}
          </p>
        )}
        <p className="text-xs font-body text-[var(--z-aegean)]/60 mt-4">
          {t({ en: 'We respect your privacy. Unsubscribe anytime.', ar: 'نحترم خصوصيتك. يمكنك إلغاء الاشتراك في أي وقت.' })}
        </p>
      </div>
    </section>
  );
}

// ─── Main Homepage Export ────────────────────────────────────
export function ZenithaHomepage({ locale }: { locale: Locale }) {
  return (
    <div className="zenitha-site">
      <HeroSection locale={locale} />
      <TrustBar locale={locale} />
      <FeaturedYachtsSection locale={locale} />
      <DestinationsSection locale={locale} />
      <HowItWorksSection locale={locale} />
      <AIPlannerSection locale={locale} />
      <TestimonialsSection locale={locale} />
      <NewsletterSection locale={locale} />
    </div>
  );
}
