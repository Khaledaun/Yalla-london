"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import {
  Mail,
  Phone,
  MapPin,
  Send,
  MessageCircle,
  Clock,
  Ship,
  Anchor,
  Check,
  Globe,
} from "lucide-react";
import { useLanguage } from "@/components/language-provider";

/* ═══════════════════════════════════════════════════════════════════
   Types & Constants
   ═══════════════════════════════════════════════════════════════════ */

type Locale = "en" | "ar";

interface FormData {
  name: string;
  email: string;
  phone: string;
  subject: string;
  inquiryType: string;
  destination: string;
  travelDates: string;
  guests: string;
  message: string;
  consent: boolean;
}

const INITIAL_FORM: FormData = {
  name: "",
  email: "",
  phone: "",
  subject: "",
  inquiryType: "",
  destination: "",
  travelDates: "",
  guests: "",
  message: "",
  consent: false,
};

const INQUIRY_TYPES = [
  { value: "charter", label: { en: "Charter Inquiry", ar: "استفسار تأجير" } },
  { value: "pricing", label: { en: "Pricing & Availability", ar: "الأسعار والتوفر" } },
  { value: "custom-itinerary", label: { en: "Custom Itinerary", ar: "مسار مخصص" } },
  { value: "group-event", label: { en: "Group / Corporate Event", ar: "حدث جماعي / شركات" } },
  { value: "partnership", label: { en: "Partnership", ar: "شراكة" } },
  { value: "press", label: { en: "Press & Media", ar: "صحافة وإعلام" } },
  { value: "other", label: { en: "Other", ar: "أخرى" } },
];

const DESTINATIONS = [
  { value: "greek-islands", label: "Greek Islands" },
  { value: "croatia", label: "Croatian Coast" },
  { value: "turkey", label: "Turkish Riviera" },
  { value: "amalfi", label: "Amalfi Coast" },
  { value: "french-riviera", label: "French Riviera" },
  { value: "balearics", label: "Balearic Islands" },
  { value: "arabian-gulf", label: "Arabian Gulf" },
  { value: "red-sea", label: "Red Sea" },
  { value: "undecided", label: "Not Sure Yet" },
];

const CONTACT_METHODS = [
  {
    Icon: Mail,
    title: { en: "Email", ar: "البريد الإلكتروني" },
    value: "hello@zenithayachts.com",
    description: { en: "We respond within 24 hours", ar: "نرد خلال 24 ساعة" },
    href: "mailto:hello@zenithayachts.com",
  },
  {
    Icon: MessageCircle,
    title: { en: "WhatsApp", ar: "واتساب" },
    value: "+44 7000 000 000",
    description: { en: "Quick responses, EN & AR", ar: "ردود سريعة، EN و AR" },
    href: "https://wa.me/447000000000?text=Hi%20Zenitha%20Yachts",
  },
  {
    Icon: Phone,
    title: { en: "Phone", ar: "الهاتف" },
    value: "+44 7000 000 000",
    description: { en: "Mon-Fri 9:00-18:00 GMT", ar: "الاثنين-الجمعة 9:00-18:00" },
    href: "tel:+447000000000",
  },
];

const OFFICE_INFO = {
  name: { en: "Zenitha.Luxury LLC", ar: "زينيثا لاكشري ذ.م.م." },
  address: { en: "Registered in Delaware, USA", ar: "مسجلة في ديلاوير، الولايات المتحدة" },
  hours: { en: "Monday - Friday: 9:00 - 18:00 GMT", ar: "الاثنين - الجمعة: 9:00 - 18:00 بتوقيت غرينتش" },
  weekend: { en: "Saturday: 10:00 - 15:00 GMT (Urgent inquiries)", ar: "السبت: 10:00 - 15:00 (استفسارات عاجلة)" },
};

/* ═══════════════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════════════ */

export default function ContactZenithaYachts() {
  const { language } = useLanguage();
  const locale = (language || "en") as Locale;
  const t = (obj: { en: string; ar: string }) => obj[locale] || obj.en;
  const isRTL = locale === "ar";

  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const updateField = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.consent) return;
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          source: "zenitha-yachts",
          siteId: "zenitha-yachts-med",
        }),
      });

      if (response.ok) {
        setSubmitted(true);
        setForm(INITIAL_FORM);
      } else {
        alert(t({ en: "Something went wrong. Please try again.", ar: "حدث خطأ. يرجى المحاولة مرة أخرى." }));
      }
    } catch {
      alert(t({ en: "Connection error. Please check your internet and try again.", ar: "خطأ في الاتصال. يرجى التحقق من الإنترنت والمحاولة مرة أخرى." }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen"
      dir={isRTL ? "rtl" : "ltr"}
      style={{ background: "var(--z-bg)" }}
    >
      {/* ─── Hero Section ─── */}
      <section
        className="relative overflow-hidden"
        style={{
          background: "var(--z-gradient-hero-vertical)",
          color: "var(--z-pearl)",
        }}
      >
        {/* Decorative elements */}
        <div className="absolute inset-0 opacity-[0.04]" aria-hidden="true">
          <div
            className="absolute -top-20 -right-20 w-80 h-80 rounded-full border border-white/20"
          />
          <div
            className="absolute bottom-10 left-1/4 w-48 h-48 rounded-full border border-white/10"
          />
        </div>

        <div className="z-container relative z-10 py-16 sm:py-20 text-center">
          <p className="z-text-overline mb-3" style={{ color: "var(--z-gold)" }}>
            {t({ en: "Get in Touch", ar: "تواصل معنا" })}
          </p>
          <h1 className="z-text-display mb-4" style={{ color: "var(--z-pearl)" }}>
            {t({ en: "Contact Zenitha Yachts", ar: "تواصل مع زينيثا يخوت" })}
          </h1>
          <p
            className="z-text-body-lg max-w-2xl mx-auto"
            style={{ color: "var(--z-champagne)", lineHeight: "var(--z-leading-relaxed)" }}
          >
            {t({
              en: "Whether you are planning your first charter or your tenth, our specialist team is here to help. Reach out in English or Arabic and we will respond within 24 hours.",
              ar: "سواء كنت تخطط لأول رحلة تأجير أو العاشرة، فريقنا المتخصص هنا للمساعدة. تواصل معنا بالإنجليزية أو العربية وسنرد خلال 24 ساعة.",
            })}
          </p>
        </div>

        <div style={{ height: "2px", background: "var(--z-bar-gradient)" }} />
      </section>

      {/* ─── Contact Methods ─── */}
      <section className="z-section" style={{ background: "var(--z-pearl)" }}>
        <div className="z-container">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {CONTACT_METHODS.map((method) => (
              <a
                key={method.value}
                href={method.href}
                target={method.href.startsWith("http") ? "_blank" : undefined}
                rel={method.href.startsWith("http") ? "noopener noreferrer" : undefined}
                className="z-card group text-center"
                style={{
                  background: "var(--z-surface)",
                  textDecoration: "none",
                }}
              >
                <div className="z-card-body" style={{ padding: "var(--z-space-8)" }}>
                  <div
                    style={{
                      width: "56px",
                      height: "56px",
                      borderRadius: "var(--z-radius-xl)",
                      background: "linear-gradient(135deg, rgba(201, 169, 110, 0.12), rgba(201, 169, 110, 0.04))",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginInline: "auto",
                      marginBottom: "var(--z-space-4)",
                    }}
                  >
                    <method.Icon size={24} style={{ color: "var(--z-gold)" }} />
                  </div>
                  <h3 className="z-text-heading" style={{ marginBottom: "var(--z-space-2)" }}>
                    {t(method.title)}
                  </h3>
                  <p
                    className="z-text-body"
                    style={{
                      color: "var(--z-navy)",
                      fontWeight: 600,
                      marginBottom: "var(--z-space-1)",
                    }}
                  >
                    {method.value}
                  </p>
                  <p className="z-text-body-sm" style={{ color: "var(--z-muted)", margin: 0 }}>
                    {t(method.description)}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Form + Office Info ─── */}
      <section className="z-section" style={{ background: "var(--z-surface)" }}>
        <div className="z-container">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: "var(--z-space-10)",
              maxWidth: "var(--z-container-wide)",
              marginInline: "auto",
            }}
            className="lg:!grid-cols-[1fr_380px]"
          >
            {/* ─── Contact Form ─── */}
            <div>
              <div style={{ marginBottom: "var(--z-space-8)" }}>
                <h2 className="z-text-title" style={{ marginBottom: "var(--z-space-2)" }}>
                  {t({ en: "Send Us a Message", ar: "أرسل لنا رسالة" })}
                </h2>
                <span className="z-gold-bar" style={{ display: "block", marginBottom: "var(--z-space-4)" }} />
                <p className="z-text-body" style={{ color: "var(--z-muted)" }}>
                  {t({
                    en: "Fill in the details below and our charter specialists will get back to you within 24 hours with personalised recommendations.",
                    ar: "املأ التفاصيل أدناه وسيتواصل معك متخصصو التأجير لدينا خلال 24 ساعة مع توصيات مخصصة.",
                  })}
                </p>
              </div>

              {submitted ? (
                /* ── Success State ── */
                <div
                  className="z-card-gold"
                  style={{ padding: "var(--z-space-10)", textAlign: "center" }}
                >
                  <div
                    style={{
                      width: "64px",
                      height: "64px",
                      borderRadius: "var(--z-radius-full)",
                      background: "var(--z-gradient-cta)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginInline: "auto",
                      marginBottom: "var(--z-space-5)",
                    }}
                  >
                    <Check size={32} style={{ color: "var(--z-navy)" }} />
                  </div>
                  <h3 className="z-text-title" style={{ marginBottom: "var(--z-space-3)" }}>
                    {t({ en: "Message Sent!", ar: "تم إرسال الرسالة!" })}
                  </h3>
                  <p className="z-text-body-lg" style={{ color: "var(--z-muted)", marginBottom: "var(--z-space-6)" }}>
                    {t({
                      en: "Thank you for reaching out. Our charter team will review your inquiry and respond within 24 hours.",
                      ar: "شكراً لتواصلك. سيراجع فريق التأجير لدينا استفسارك ويرد خلال 24 ساعة.",
                    })}
                  </p>
                  <div style={{ display: "flex", gap: "var(--z-space-4)", justifyContent: "center", flexWrap: "wrap" }}>
                    <button
                      onClick={() => setSubmitted(false)}
                      className="z-btn z-btn-secondary"
                    >
                      {t({ en: "Send Another Message", ar: "أرسل رسالة أخرى" })}
                    </button>
                    <Link href="/destinations" className="z-btn z-btn-primary">
                      <Anchor size={18} />
                      {t({ en: "Browse Destinations", ar: "تصفح الوجهات" })}
                    </Link>
                  </div>
                </div>
              ) : (
                /* ── Form ── */
                <form
                  ref={formRef}
                  onSubmit={handleSubmit}
                  className="z-card"
                  style={{ padding: "var(--z-space-8)" }}
                >
                  {/* Name + Email */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                      gap: "var(--z-space-5)",
                      marginBottom: "var(--z-space-5)",
                    }}
                  >
                    <div>
                      <label className="z-label" htmlFor="z-name">
                        {t({ en: "Full Name", ar: "الاسم الكامل" })} *
                      </label>
                      <input
                        id="z-name"
                        type="text"
                        className="z-input"
                        required
                        value={form.name}
                        onChange={(e) => updateField("name", e.target.value)}
                        placeholder={t({ en: "Your full name", ar: "اسمك الكامل" })}
                      />
                    </div>
                    <div>
                      <label className="z-label" htmlFor="z-email">
                        {t({ en: "Email", ar: "البريد الإلكتروني" })} *
                      </label>
                      <input
                        id="z-email"
                        type="email"
                        className="z-input"
                        required
                        value={form.email}
                        onChange={(e) => updateField("email", e.target.value)}
                        placeholder={t({ en: "your@email.com", ar: "بريدك@الإلكتروني.com" })}
                      />
                    </div>
                  </div>

                  {/* Phone + Inquiry Type */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                      gap: "var(--z-space-5)",
                      marginBottom: "var(--z-space-5)",
                    }}
                  >
                    <div>
                      <label className="z-label" htmlFor="z-phone">
                        {t({ en: "Phone / WhatsApp", ar: "الهاتف / واتساب" })}
                      </label>
                      <input
                        id="z-phone"
                        type="tel"
                        className="z-input"
                        value={form.phone}
                        onChange={(e) => updateField("phone", e.target.value)}
                        placeholder={t({ en: "+44 7000 000 000", ar: "+966 50 000 0000" })}
                      />
                    </div>
                    <div>
                      <label className="z-label" htmlFor="z-inquiry-type">
                        {t({ en: "Inquiry Type", ar: "نوع الاستفسار" })} *
                      </label>
                      <select
                        id="z-inquiry-type"
                        className="z-input"
                        required
                        value={form.inquiryType}
                        onChange={(e) => updateField("inquiryType", e.target.value)}
                      >
                        <option value="">
                          {t({ en: "Select type...", ar: "اختر النوع..." })}
                        </option>
                        {INQUIRY_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {t(type.label)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Destination + Travel Dates */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                      gap: "var(--z-space-5)",
                      marginBottom: "var(--z-space-5)",
                    }}
                  >
                    <div>
                      <label className="z-label" htmlFor="z-destination">
                        {t({ en: "Destination", ar: "الوجهة" })}
                      </label>
                      <select
                        id="z-destination"
                        className="z-input"
                        value={form.destination}
                        onChange={(e) => updateField("destination", e.target.value)}
                      >
                        <option value="">
                          {t({ en: "Select destination...", ar: "اختر الوجهة..." })}
                        </option>
                        {DESTINATIONS.map((dest) => (
                          <option key={dest.value} value={dest.value}>
                            {dest.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="z-label" htmlFor="z-dates">
                        {t({ en: "Preferred Dates", ar: "التواريخ المفضلة" })}
                      </label>
                      <input
                        id="z-dates"
                        type="text"
                        className="z-input"
                        value={form.travelDates}
                        onChange={(e) => updateField("travelDates", e.target.value)}
                        placeholder={t({ en: "e.g. July 2026, 7-10 days", ar: "مثلاً يوليو 2026، 7-10 أيام" })}
                      />
                    </div>
                  </div>

                  {/* Guests + Subject */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                      gap: "var(--z-space-5)",
                      marginBottom: "var(--z-space-5)",
                    }}
                  >
                    <div>
                      <label className="z-label" htmlFor="z-guests">
                        {t({ en: "Number of Guests", ar: "عدد الضيوف" })}
                      </label>
                      <input
                        id="z-guests"
                        type="text"
                        className="z-input"
                        value={form.guests}
                        onChange={(e) => updateField("guests", e.target.value)}
                        placeholder={t({ en: "e.g. 6 adults, 2 children", ar: "مثلاً 6 بالغين، 2 أطفال" })}
                      />
                    </div>
                    <div>
                      <label className="z-label" htmlFor="z-subject">
                        {t({ en: "Subject", ar: "الموضوع" })} *
                      </label>
                      <input
                        id="z-subject"
                        type="text"
                        className="z-input"
                        required
                        value={form.subject}
                        onChange={(e) => updateField("subject", e.target.value)}
                        placeholder={t({ en: "Brief description", ar: "وصف مختصر" })}
                      />
                    </div>
                  </div>

                  {/* Message */}
                  <div style={{ marginBottom: "var(--z-space-6)" }}>
                    <label className="z-label" htmlFor="z-message">
                      {t({ en: "Message", ar: "الرسالة" })} *
                    </label>
                    <textarea
                      id="z-message"
                      className="z-input z-textarea"
                      required
                      rows={5}
                      value={form.message}
                      onChange={(e) => updateField("message", e.target.value)}
                      placeholder={t({
                        en: "Tell us about your dream charter. Any preferences for yacht type, halal catering, activities, or special occasions?",
                        ar: "أخبرنا عن رحلة التأجير التي تحلم بها. أي تفضيلات لنوع اليخت أو الطعام الحلال أو الأنشطة أو المناسبات الخاصة؟",
                      })}
                    />
                  </div>

                  {/* Consent */}
                  <div style={{ marginBottom: "var(--z-space-6)" }}>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "var(--z-space-3)",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={form.consent}
                        onChange={(e) => updateField("consent", e.target.checked)}
                        required
                        style={{
                          width: "18px",
                          height: "18px",
                          marginTop: "2px",
                          accentColor: "var(--z-gold)",
                          flexShrink: 0,
                        }}
                      />
                      <span className="z-text-body-sm" style={{ color: "var(--z-muted)" }}>
                        {t({
                          en: "I agree to the ",
                          ar: "أوافق على ",
                        })}
                        <Link
                          href="/privacy"
                          style={{ color: "var(--z-aegean)", textDecoration: "underline" }}
                        >
                          {t({ en: "Privacy Policy", ar: "سياسة الخصوصية" })}
                        </Link>
                        {t({
                          en: " and consent to Zenitha Yachts processing my data to respond to this inquiry.",
                          ar: " وأوافق على معالجة زينيثا يخوت لبياناتي للرد على هذا الاستفسار.",
                        })}
                        {" *"}
                      </span>
                    </label>
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={isSubmitting || !form.consent}
                    className="z-btn z-btn-primary z-btn-lg"
                    style={{
                      width: "100%",
                      opacity: isSubmitting || !form.consent ? 0.6 : 1,
                      cursor: isSubmitting || !form.consent ? "not-allowed" : "pointer",
                    }}
                  >
                    {isSubmitting ? (
                      t({ en: "Sending...", ar: "جارٍ الإرسال..." })
                    ) : (
                      <>
                        <Send size={18} />
                        {t({ en: "Send Inquiry", ar: "إرسال الاستفسار" })}
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>

            {/* ─── Sidebar: Office Info ─── */}
            <aside>
              {/* Office Card */}
              <div className="z-card" style={{ marginBottom: "var(--z-space-6)" }}>
                <div className="z-card-body" style={{ padding: "var(--z-space-6)" }}>
                  <h3 className="z-text-heading" style={{ marginBottom: "var(--z-space-5)" }}>
                    {t({ en: "Office Information", ar: "معلومات المكتب" })}
                  </h3>

                  <div style={{ display: "flex", flexDirection: "column", gap: "var(--z-space-5)" }}>
                    <div style={{ display: "flex", gap: "var(--z-space-3)" }}>
                      <Globe
                        size={18}
                        style={{ color: "var(--z-gold)", flexShrink: 0, marginTop: "2px" }}
                      />
                      <div>
                        <p className="z-text-body" style={{ fontWeight: 600, margin: 0 }}>
                          {t(OFFICE_INFO.name)}
                        </p>
                        <p className="z-text-body-sm" style={{ color: "var(--z-muted)", margin: 0 }}>
                          {t(OFFICE_INFO.address)}
                        </p>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "var(--z-space-3)" }}>
                      <Clock
                        size={18}
                        style={{ color: "var(--z-gold)", flexShrink: 0, marginTop: "2px" }}
                      />
                      <div>
                        <p className="z-text-body" style={{ fontWeight: 600, margin: 0 }}>
                          {t({ en: "Business Hours", ar: "ساعات العمل" })}
                        </p>
                        <p className="z-text-body-sm" style={{ color: "var(--z-muted)", margin: 0 }}>
                          {t(OFFICE_INFO.hours)}
                        </p>
                        <p className="z-text-body-sm" style={{ color: "var(--z-muted)", margin: 0 }}>
                          {t(OFFICE_INFO.weekend)}
                        </p>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "var(--z-space-3)" }}>
                      <MapPin
                        size={18}
                        style={{ color: "var(--z-gold)", flexShrink: 0, marginTop: "2px" }}
                      />
                      <div>
                        <p className="z-text-body" style={{ fontWeight: 600, margin: 0 }}>
                          {t({ en: "Coverage", ar: "التغطية" })}
                        </p>
                        <p className="z-text-body-sm" style={{ color: "var(--z-muted)", margin: 0 }}>
                          {t({
                            en: "Mediterranean, Arabian Gulf, and Red Sea",
                            ar: "البحر المتوسط والخليج العربي والبحر الأحمر",
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Response Times Card */}
              <div className="z-card" style={{ marginBottom: "var(--z-space-6)" }}>
                <div className="z-card-body" style={{ padding: "var(--z-space-6)" }}>
                  <h3 className="z-text-heading" style={{ marginBottom: "var(--z-space-4)" }}>
                    {t({ en: "Response Times", ar: "أوقات الاستجابة" })}
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "var(--z-space-3)" }}>
                    {[
                      { label: { en: "Charter inquiries", ar: "استفسارات التأجير" }, time: { en: "< 24 hours", ar: "< 24 ساعة" } },
                      { label: { en: "WhatsApp messages", ar: "رسائل واتساب" }, time: { en: "< 4 hours", ar: "< 4 ساعات" } },
                      { label: { en: "Custom itineraries", ar: "المسارات المخصصة" }, time: { en: "48 hours", ar: "48 ساعة" } },
                      { label: { en: "Press & partnerships", ar: "صحافة وشراكات" }, time: { en: "3-5 days", ar: "3-5 أيام" } },
                    ].map((item) => (
                      <div
                        key={item.label.en}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span className="z-text-body-sm" style={{ color: "var(--z-muted)" }}>
                          {t(item.label)}
                        </span>
                        <span
                          className="z-text-body-sm"
                          style={{ fontWeight: 600, color: "var(--z-navy)" }}
                        >
                          {t(item.time)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Quick Links Card */}
              <div
                className="z-card"
                style={{
                  background: "var(--z-gradient-card)",
                  color: "var(--z-pearl)",
                }}
              >
                <div className="z-card-body" style={{ padding: "var(--z-space-6)" }}>
                  <h3
                    className="z-text-heading"
                    style={{ color: "var(--z-pearl)", marginBottom: "var(--z-space-4)" }}
                  >
                    {t({ en: "Quick Links", ar: "روابط سريعة" })}
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "var(--z-space-3)" }}>
                    {[
                      { href: "/charter-planner", icon: Ship, label: { en: "Plan Your Charter", ar: "خطط لرحلتك" } },
                      { href: "/destinations", icon: MapPin, label: { en: "Browse Destinations", ar: "تصفح الوجهات" } },
                      { href: "/faq", icon: MessageCircle, label: { en: "FAQ", ar: "الأسئلة الشائعة" } },
                      { href: "/how-it-works", icon: Anchor, label: { en: "How It Works", ar: "كيف نعمل" } },
                    ].map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "var(--z-space-3)",
                          color: "var(--z-champagne)",
                          textDecoration: "none",
                          fontSize: "var(--z-text-body-sm)",
                          fontFamily: "var(--z-font-heading)",
                          fontWeight: 500,
                          padding: "var(--z-space-2) 0",
                          transition: "color 200ms ease",
                        }}
                        className="hover:!text-[var(--z-gold)]"
                      >
                        <link.icon size={16} style={{ flexShrink: 0 }} />
                        {t(link.label)}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* ─── CTA Section ─── */}
      <section
        style={{
          background: "var(--z-gradient-hero)",
          padding: "var(--z-space-16) 0",
          textAlign: "center",
        }}
      >
        <div className="z-container">
          <Ship
            size={40}
            style={{
              color: "var(--z-gold)",
              marginBottom: "var(--z-space-5)",
              marginInline: "auto",
              display: "block",
            }}
          />
          <h2 className="z-text-title-lg" style={{ color: "var(--z-pearl)", marginBottom: "var(--z-space-4)" }}>
            {t({ en: "Prefer to Chat?", ar: "تفضل المحادثة؟" })}
          </h2>
          <p
            className="z-text-body-lg"
            style={{
              color: "var(--z-champagne)",
              maxWidth: "480px",
              marginInline: "auto",
              marginBottom: "var(--z-space-8)",
              lineHeight: "var(--z-leading-relaxed)",
            }}
          >
            {t({
              en: "Our charter advisors are available on WhatsApp for quick answers in English and Arabic.",
              ar: "مستشارو التأجير لدينا متاحون على واتساب للإجابات السريعة بالإنجليزية والعربية.",
            })}
          </p>
          <a
            href="https://wa.me/447000000000?text=Hi%20Zenitha%20Yachts%2C%20I%27d%20like%20to%20inquire%20about%20a%20charter"
            target="_blank"
            rel="noopener noreferrer"
            className="z-btn z-btn-primary z-btn-lg"
          >
            <MessageCircle size={20} />
            {t({ en: "Chat on WhatsApp", ar: "تحدث عبر واتساب" })}
          </a>
        </div>
      </section>
    </div>
  );
}
