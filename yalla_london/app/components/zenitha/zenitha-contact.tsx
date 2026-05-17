'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/components/language-provider'
import {
  Mail,
  Phone,
  MapPin,
  Send,
  MessageSquare,
  Clock,
  ArrowRight,
  Anchor,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────
type Locale = 'en' | 'ar'

// ─── Bilingual helper ───────────────────────────────────────
const t = (obj: { en: string; ar: string }, locale: Locale) => obj[locale] || obj.en

import { ZENITHA_CONTACT } from './zenitha-config';

// ─── Contact Config ─────────────────────────────────────────
// Sourced from zenitha-config.ts — single source of truth for all contact details.
const CONTACT_CONFIG = {
  whatsapp: ZENITHA_CONTACT.whatsapp,
  phone: ZENITHA_CONTACT.phone,
  email: ZENITHA_CONTACT.charterEmail,
}

// Build contact methods dynamically — only show configured channels
const CONTACT_METHODS = [
  ...(CONTACT_CONFIG.whatsapp
    ? [{
        icon: Phone,
        title: { en: 'WhatsApp' as const, ar: 'واتساب' as const },
        value: `+${CONTACT_CONFIG.whatsapp.replace(/(\d{3})(\d{2})(\d{3})(\d{4})/, '$1 $2 $3 $4')}`,
        detail: { en: 'Fastest response — typically within 1 hour' as const, ar: 'أسرع استجابة — عادة خلال ساعة واحدة' as const },
        href: `https://wa.me/${CONTACT_CONFIG.whatsapp}`,
        external: true as const,
      }]
    : []),
  {
    icon: Mail,
    title: { en: 'Email', ar: 'البريد الإلكتروني' },
    value: CONTACT_CONFIG.email,
    detail: { en: 'For detailed inquiries and documentation', ar: 'للاستفسارات التفصيلية والوثائق' },
    href: `mailto:${CONTACT_CONFIG.email}`,
    external: false,
  },
  ...(CONTACT_CONFIG.phone
    ? [{
        icon: Phone,
        title: { en: 'Phone' as const, ar: 'الهاتف' as const },
        value: CONTACT_CONFIG.phone,
        detail: { en: 'Sunday-Thursday, 9am-6pm GST' as const, ar: 'الأحد-الخميس، 9 صباحاً - 6 مساءً بتوقيت الخليج' as const },
        href: `tel:${CONTACT_CONFIG.phone.replace(/\s/g, '')}`,
        external: false as const,
      }]
    : []),
]

// ─── Offices ────────────────────────────────────────────────
const OFFICES = [
  {
    city: { en: 'Dubai', ar: 'دبي' },
    role: { en: 'Headquarters', ar: 'المقر الرئيسي' },
    address: { en: 'Dubai Marina, Dubai, UAE', ar: 'دبي مارينا، دبي، الإمارات' },
    hours: { en: 'Sun-Thu 9am-6pm GST', ar: 'الأحد-الخميس 9ص-6م' },
  },
  {
    city: { en: 'Athens', ar: 'أثينا' },
    role: { en: 'Mediterranean Operations', ar: 'عمليات البحر المتوسط' },
    address: { en: 'Piraeus Marina, Athens, Greece', ar: 'ميناء بيرايوس، أثينا، اليونان' },
    hours: { en: 'Mon-Fri 9am-6pm EET', ar: 'الاثنين-الجمعة 9ص-6م' },
  },
]

// ─── FAQ Teaser ─────────────────────────────────────────────
const FAQ_ITEMS = [
  {
    question: { en: 'How far in advance should I book a charter?', ar: 'قبل كم يجب أن أحجز رحلة بحرية؟' },
    answer: {
      en: 'We recommend booking 3-6 months ahead for peak season (June-September). Off-peak charters can often be arranged with 4-6 weeks notice.',
      ar: 'نوصي بالحجز قبل 3-6 أشهر لموسم الذروة (يونيو-سبتمبر). يمكن ترتيب الرحلات في غير موسم الذروة بإشعار 4-6 أسابيع.',
    },
  },
  {
    question: { en: 'Is halal catering available on every yacht?', ar: 'هل الطعام الحلال متوفر على كل يخت؟' },
    answer: {
      en: 'Yes. We arrange certified halal catering on every charter we book. Our provisioning team works with local halal suppliers at each Mediterranean port.',
      ar: 'نعم. نرتب طعاماً حلالاً معتمداً في كل رحلة نحجزها. يعمل فريق التموين لدينا مع موردي الحلال المحليين في كل ميناء متوسطي.',
    },
  },
  {
    question: { en: 'What is included in the charter price?', ar: 'ماذا يتضمن سعر الرحلة؟' },
    answer: {
      en: 'The base charter fee includes the yacht, crew, insurance, and standard equipment. Provisioning, fuel, port fees, and extras (water sports, transfers) are typically billed separately as the APA (Advance Provisioning Allowance).',
      ar: 'تشمل رسوم الاستئجار الأساسية اليخت والطاقم والتأمين والمعدات القياسية. التموين والوقود ورسوم الميناء والإضافات تُحسب عادةً بشكل منفصل.',
    },
  },
]

// ─── Contact Form Categories ────────────────────────────────
const CATEGORIES = [
  { value: 'charter', label: { en: 'Charter Inquiry', ar: 'استفسار تأجير' } },
  { value: 'destination', label: { en: 'Destination Question', ar: 'سؤال عن الوجهة' } },
  { value: 'partnership', label: { en: 'Partnership', ar: 'شراكة' } },
  { value: 'press', label: { en: 'Press', ar: 'إعلام' } },
  { value: 'other', label: { en: 'Other', ar: 'أخرى' } },
]

// ─── Countries (global lead capture) ────────────────────────
const COUNTRIES = [
  { value: 'gb', label: { en: 'United Kingdom', ar: 'المملكة المتحدة' } },
  { value: 'fr', label: { en: 'France', ar: 'فرنسا' } },
  { value: 'de', label: { en: 'Germany', ar: 'ألمانيا' } },
  { value: 'it', label: { en: 'Italy', ar: 'إيطاليا' } },
  { value: 'us', label: { en: 'United States', ar: 'الولايات المتحدة' } },
  { value: 'ca', label: { en: 'Canada', ar: 'كندا' } },
  { value: 'sa', label: { en: 'Saudi Arabia', ar: 'المملكة العربية السعودية' } },
  { value: 'ae', label: { en: 'United Arab Emirates', ar: 'الإمارات العربية المتحدة' } },
  { value: 'qa', label: { en: 'Qatar', ar: 'قطر' } },
  { value: 'kw', label: { en: 'Kuwait', ar: 'الكويت' } },
  { value: 'eg', label: { en: 'Egypt', ar: 'مصر' } },
  { value: 'sg', label: { en: 'Singapore', ar: 'سنغافورة' } },
  { value: 'au', label: { en: 'Australia', ar: 'أستراليا' } },
  { value: 'other', label: { en: 'Other', ar: 'أخرى' } },
]

// ─── Preferred Contact Channels ─────────────────────────────
const CONTACT_CHANNELS = [
  { value: 'email', label: { en: 'Email', ar: 'البريد الإلكتروني' } },
  { value: 'whatsapp', label: { en: 'WhatsApp', ar: 'واتساب' } },
  { value: 'phone', label: { en: 'Phone Call', ar: 'مكالمة هاتفية' } },
]

// ─── Form Data Interface ────────────────────────────────────
interface ContactFormData {
  name: string
  email: string
  phone: string
  country: string
  preferredContact: string
  subject: string
  message: string
  consent: boolean
}

// ─── Component ──────────────────────────────────────────────
export default function ZenithaContactPage({ siteId }: { siteId?: string }) {
  const { language, isRTL } = useLanguage()
  const locale: Locale = (language as Locale) || 'en'

  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    phone: '',
    country: '',
    preferredContact: 'email',
    subject: '',
    message: '',
    consent: false,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)

  const handleChange = (field: keyof ContactFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.consent) {
      alert(t({ en: 'Please accept the privacy policy to continue.', ar: 'يرجى قبول سياسة الخصوصية للمتابعة.' }, locale))
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, siteId: siteId || 'zenitha-yachts-med' }),
      })
      if (res.ok) {
        setSubmitted(true)
      } else {
        throw new Error('Failed')
      }
    } catch {
      alert(t({ en: 'Something went wrong. Please try again.', ar: 'حدث خطأ. يرجى المحاولة مرة أخرى.' }, locale))
    } finally {
      setIsSubmitting(false)
    }
  }

  // ─── Success state ─────────────────────────────────────────
  if (submitted) {
    return (
      <div className={isRTL ? 'rtl' : 'ltr'}>
        <section className="min-h-[60vh] flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0A1628 0%, #2E5A88 100%)' }}>
          <div className="max-w-md mx-auto px-6 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(201,169,110,0.15)' }}>
              <MessageSquare size={36} style={{ color: '#C9A96E' }} />
            </div>
            <h2 className="text-3xl font-display font-bold text-white mb-4">
              {t({ en: 'Message Sent', ar: 'تم إرسال الرسالة' }, locale)}
            </h2>
            <p className="text-lg mb-8" style={{ color: '#C9A96E' }}>
              {t({
                en: 'Thank you for reaching out. A charter advisor will respond within 24 hours.',
                ar: 'شكراً لتواصلك. سيرد عليك مستشار تأجير خلال 24 ساعة.',
              }, locale)}
            </p>
            <button
              onClick={() => {
                setSubmitted(false)
                setFormData({ name: '', email: '', phone: '', country: '', preferredContact: 'email', subject: '', message: '', consent: false })
              }}
              className="inline-flex items-center justify-center rounded-lg px-6 py-3 text-sm font-semibold transition-colors"
              style={{ backgroundColor: '#C9A96E', color: '#0A1628' }}
            >
              {t({ en: 'Send Another Message', ar: 'أرسل رسالة أخرى' }, locale)}
            </button>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className={isRTL ? 'rtl' : 'ltr'}>
      {/* ── Hero ──────────────────────────────────────────── */}
      <section className="relative py-20" style={{ background: 'linear-gradient(135deg, #0A1628 0%, #2E5A88 100%)' }}>
        <div className="absolute inset-0 bg-[url('/branding/zenitha-yachts/hero-pattern.svg')] bg-cover bg-center opacity-10" />
        <div className="relative z-10 max-w-[1280px] mx-auto px-6 text-center">
          <span className="inline-block text-xs font-semibold uppercase tracking-[0.2em] mb-4" style={{ color: '#C9A96E' }}>
            {t({ en: 'Get in Touch', ar: 'تواصل معنا' }, locale)}
          </span>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-tight mb-6" style={{ letterSpacing: '-0.02em' }}>
            {t({ en: 'Contact Zenitha Yachts', ar: 'تواصل مع زينيثا يخوت' }, locale)}
          </h1>
          <p className="text-lg max-w-[600px] mx-auto leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>
            {t({
              en: 'Whether you are planning your first charter or your twentieth, our team is ready to help.',
              ar: 'سواء كنت تخطط لأول رحلة بحرية أو العشرين، فريقنا مستعد للمساعدة.',
            }, locale)}
          </p>
        </div>
      </section>

      {/* ── Contact Methods ───────────────────────────────── */}
      <section className="py-16" style={{ backgroundColor: '#FAF8F5' }}>
        <div className="max-w-[1080px] mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-6">
            {CONTACT_METHODS.map((method, i) => (
              <a
                key={i}
                href={method.href}
                target={method.external ? '_blank' : undefined}
                rel={method.external ? 'noopener noreferrer' : undefined}
                className="block bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow duration-300 group"
              >
                <div className="w-12 h-12 mb-4 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(10,22,40,0.05)' }}>
                  <method.icon size={24} style={{ color: '#2E5A88' }} />
                </div>
                <h3 className="text-lg font-display font-bold mb-1" style={{ color: '#0A1628' }}>
                  {t(method.title, locale)}
                </h3>
                <p className="font-semibold text-sm mb-2" style={{ color: '#2E5A88' }}>
                  {method.value}
                </p>
                <p className="text-sm" style={{ color: '#6B7280' }}>
                  {t(method.detail, locale)}
                </p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── Main Grid: Form + Sidebar ─────────────────────── */}
      <section className="py-16" style={{ backgroundColor: '#F5F0E8' }}>
        <div className="max-w-[1080px] mx-auto px-6">
          <div className="grid lg:grid-cols-3 gap-10">
            {/* ── Contact Form ── */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl p-8 shadow-sm">
                <h2 className="text-2xl font-display font-bold mb-2" style={{ color: '#0A1628' }}>
                  {t({ en: 'Send Us a Message', ar: 'أرسل لنا رسالة' }, locale)}
                </h2>
                <p className="text-sm mb-8" style={{ color: '#6B7280' }}>
                  {t({
                    en: 'Fill out the form below and a charter advisor will respond within 24 hours.',
                    ar: 'املأ النموذج أدناه وسيرد عليك مستشار تأجير خلال 24 ساعة.',
                  }, locale)}
                </p>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1.5" style={{ color: '#0A1628' }}>
                        {t({ en: 'Full Name', ar: 'الاسم الكامل' }, locale)} *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        placeholder={t({ en: 'Your full name', ar: 'اسمك الكامل' }, locale)}
                        className="w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2"
                        style={{ borderColor: '#D1D5DB', color: '#0A1628' }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5" style={{ color: '#0A1628' }}>
                        {t({ en: 'Email', ar: 'البريد الإلكتروني' }, locale)} *
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => handleChange('email', e.target.value)}
                        placeholder={t({ en: 'your@email.com', ar: 'بريدك@مثال.com' }, locale)}
                        className="w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2"
                        style={{ borderColor: '#D1D5DB', color: '#0A1628' }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1.5" style={{ color: '#0A1628' }}>
                        {t({ en: 'Phone', ar: 'الهاتف' }, locale)}
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleChange('phone', e.target.value)}
                        placeholder={t({ en: '+971 ...', ar: '+971 ...' }, locale)}
                        className="w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2"
                        style={{ borderColor: '#D1D5DB', color: '#0A1628' }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5" style={{ color: '#0A1628' }}>
                        {t({ en: 'Country of Residence', ar: 'بلد الإقامة' }, locale)}
                      </label>
                      <select
                        value={formData.country}
                        onChange={(e) => handleChange('country', e.target.value)}
                        className="w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 bg-white"
                        style={{ borderColor: '#D1D5DB', color: formData.country ? '#0A1628' : '#9CA3AF' }}
                      >
                        <option value="" disabled>
                          {t({ en: 'Select your country', ar: 'اختر بلدك' }, locale)}
                        </option>
                        {COUNTRIES.map((c) => (
                          <option key={c.value} value={c.value}>
                            {t(c.label, locale)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1.5" style={{ color: '#0A1628' }}>
                        {t({ en: 'Subject', ar: 'الموضوع' }, locale)} *
                      </label>
                      <select
                        required
                        value={formData.subject}
                        onChange={(e) => handleChange('subject', e.target.value)}
                        className="w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 bg-white"
                        style={{ borderColor: '#D1D5DB', color: formData.subject ? '#0A1628' : '#9CA3AF' }}
                      >
                        <option value="" disabled>
                          {t({ en: 'Select a subject', ar: 'اختر موضوعاً' }, locale)}
                        </option>
                        {CATEGORIES.map((cat) => (
                          <option key={cat.value} value={cat.value}>
                            {t(cat.label, locale)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5" style={{ color: '#0A1628' }}>
                        {t({ en: 'Preferred Contact Method', ar: 'طريقة التواصل المفضلة' }, locale)}
                      </label>
                      <div className="flex items-center gap-4 py-2.5">
                        {CONTACT_CHANNELS.map((ch) => (
                          <label key={ch.value} className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="radio"
                              name="preferredContact"
                              value={ch.value}
                              checked={formData.preferredContact === ch.value}
                              onChange={(e) => handleChange('preferredContact', e.target.value)}
                              className="h-4 w-4"
                            />
                            <span className="text-sm" style={{ color: '#0A1628' }}>
                              {t(ch.label, locale)}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: '#0A1628' }}>
                      {t({ en: 'Message', ar: 'الرسالة' }, locale)} *
                    </label>
                    <textarea
                      required
                      rows={5}
                      value={formData.message}
                      onChange={(e) => handleChange('message', e.target.value)}
                      placeholder={t({
                        en: 'Tell us about your inquiry. Include dates, group size, and preferred destinations if relevant...',
                        ar: 'أخبرنا عن استفسارك. أضف التواريخ وحجم المجموعة والوجهات المفضلة إن أمكن...',
                      }, locale)}
                      className="w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 resize-none"
                      style={{ borderColor: '#D1D5DB', color: '#0A1628' }}
                    />
                  </div>

                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="consent"
                      checked={formData.consent}
                      onChange={(e) => handleChange('consent', e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-gray-300"
                    />
                    <label htmlFor="consent" className="text-sm" style={{ color: '#4B5563' }}>
                      {t({
                        en: 'I agree to the ',
                        ar: 'أوافق على ',
                      }, locale)}
                      <Link href="/privacy" className="underline" style={{ color: '#2E5A88' }}>
                        {t({ en: 'Privacy Policy', ar: 'سياسة الخصوصية' }, locale)}
                      </Link>
                      {t({
                        en: ' and consent to my data being processed for this inquiry. *',
                        ar: ' وأوافق على معالجة بياناتي لهذا الاستفسار. *',
                      }, locale)}
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || !formData.consent}
                    className="w-full inline-flex items-center justify-center rounded-lg px-6 py-3 text-base font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: '#0A1628', color: '#C9A96E' }}
                  >
                    {isSubmitting ? (
                      t({ en: 'Sending...', ar: 'جارٍ الإرسال...' }, locale)
                    ) : (
                      <>
                        <Send size={18} className={isRTL ? 'ml-2' : 'mr-2'} />
                        {t({ en: 'Send Message', ar: 'أرسل الرسالة' }, locale)}
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Charter inquiry CTA */}
              <div className="mt-6 rounded-2xl p-6" style={{ backgroundColor: '#0A1628' }}>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: 'rgba(201,169,110,0.15)' }}>
                    <Anchor size={24} style={{ color: '#C9A96E' }} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-display font-bold text-white mb-1">
                      {t({ en: 'Planning a charter?', ar: 'تخطط لرحلة بحرية؟' }, locale)}
                    </h3>
                    <p className="text-sm mb-3" style={{ color: '#9CA3AF' }}>
                      {t({
                        en: 'For detailed charter inquiries with dates, yacht preferences, and itinerary planning, use our dedicated inquiry form.',
                        ar: 'للاستفسارات التفصيلية مع التواريخ وتفضيلات اليخت وتخطيط المسار، استخدم نموذج الاستفسار المخصص.',
                      }, locale)}
                    </p>
                    <Link
                      href="/inquiry"
                      className="inline-flex items-center text-sm font-semibold"
                      style={{ color: '#C9A96E' }}
                    >
                      {t({ en: 'Go to Charter Inquiry Form', ar: 'انتقل إلى نموذج استفسار الإيجار' }, locale)}
                      <ArrowRight size={16} className={isRTL ? 'mr-1' : 'ml-1'} />
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Sidebar ── */}
            <div className="lg:col-span-1 space-y-6">
              {/* Office Locations */}
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-display font-bold mb-4" style={{ color: '#0A1628' }}>
                  {t({ en: 'Our Offices', ar: 'مكاتبنا' }, locale)}
                </h3>
                <div className="space-y-5">
                  {OFFICES.map((office, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: 'rgba(46,90,136,0.08)' }}>
                        <MapPin size={18} style={{ color: '#2E5A88' }} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm" style={{ color: '#0A1628' }}>
                          {t(office.city, locale)}{' '}
                          <span className="font-normal" style={{ color: '#6B7280' }}>
                            — {t(office.role, locale)}
                          </span>
                        </h4>
                        <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
                          {t(office.address, locale)}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>
                          {t(office.hours, locale)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Business Hours */}
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-display font-bold mb-4" style={{ color: '#0A1628' }}>
                  {t({ en: 'Business Hours', ar: 'ساعات العمل' }, locale)}
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-3">
                    <Clock size={16} className="mt-0.5 flex-shrink-0" style={{ color: '#2E5A88' }} />
                    <div>
                      <p className="font-medium" style={{ color: '#0A1628' }}>
                        {t({ en: 'Sunday - Thursday', ar: 'الأحد - الخميس' }, locale)}
                      </p>
                      <p style={{ color: '#6B7280' }}>
                        {t({ en: '9:00 AM - 6:00 PM GST', ar: '9:00 صباحاً - 6:00 مساءً بتوقيت الخليج' }, locale)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock size={16} className="mt-0.5 flex-shrink-0" style={{ color: '#9CA3AF' }} />
                    <div>
                      <p className="font-medium" style={{ color: '#0A1628' }}>
                        {t({ en: 'Friday - Saturday', ar: 'الجمعة - السبت' }, locale)}
                      </p>
                      <p style={{ color: '#6B7280' }}>
                        {t({ en: 'By appointment only', ar: 'بموعد مسبق فقط' }, locale)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Response Times */}
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-display font-bold mb-4" style={{ color: '#0A1628' }}>
                  {t({ en: 'Response Times', ar: 'أوقات الاستجابة' }, locale)}
                </h3>
                <div className="space-y-2 text-sm">
                  {[
                    { label: { en: 'WhatsApp:', ar: 'واتساب:' }, time: { en: '< 1 hour', ar: '< ساعة' } },
                    { label: { en: 'Charter inquiries:', ar: 'استفسارات التأجير:' }, time: { en: '24 hours', ar: '24 ساعة' } },
                    { label: { en: 'Partnerships:', ar: 'الشراكات:' }, time: { en: '3-5 days', ar: '3-5 أيام' } },
                    { label: { en: 'Press:', ar: 'الإعلام:' }, time: { en: '48 hours', ar: '48 ساعة' } },
                  ].map((item, i) => (
                    <div key={i} className="flex justify-between">
                      <span style={{ color: '#4B5563' }}>{t(item.label, locale)}</span>
                      <span className="font-medium" style={{ color: '#0A1628' }}>{t(item.time, locale)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ Teaser ─────────────────────────────────────── */}
      <section className="py-16 bg-white">
        <div className="max-w-[720px] mx-auto px-6">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-display font-bold mb-2" style={{ color: '#0A1628' }}>
              {t({ en: 'Frequently Asked Questions', ar: 'الأسئلة الشائعة' }, locale)}
            </h2>
            <p className="text-sm" style={{ color: '#6B7280' }}>
              {t({
                en: 'Quick answers to the most common questions we receive.',
                ar: 'إجابات سريعة على الأسئلة الأكثر شيوعاً.',
              }, locale)}
            </p>
          </div>

          <div className="space-y-3">
            {FAQ_ITEMS.map((faq, i) => (
              <div key={i} className="rounded-xl border overflow-hidden" style={{ borderColor: '#E5E7EB' }}>
                <button
                  onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left"
                  style={{ backgroundColor: expandedFaq === i ? '#FAF8F5' : 'white' }}
                >
                  <span className="font-medium text-sm" style={{ color: '#0A1628' }}>
                    {t(faq.question, locale)}
                  </span>
                  {expandedFaq === i ? (
                    <ChevronUp size={18} style={{ color: '#6B7280' }} />
                  ) : (
                    <ChevronDown size={18} style={{ color: '#6B7280' }} />
                  )}
                </button>
                {expandedFaq === i && (
                  <div className="px-5 pb-4 text-sm leading-relaxed" style={{ color: '#4B5563', backgroundColor: '#FAF8F5' }}>
                    {t(faq.answer, locale)}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="text-center mt-6">
            <Link
              href="/faq"
              className="inline-flex items-center text-sm font-semibold"
              style={{ color: '#2E5A88' }}
            >
              {t({ en: 'View All FAQs', ar: 'عرض جميع الأسئلة الشائعة' }, locale)}
              <ArrowRight size={16} className={isRTL ? 'mr-1' : 'ml-1'} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
