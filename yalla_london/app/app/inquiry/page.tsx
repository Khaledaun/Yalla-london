"use client";

import { useState, useEffect, useCallback, FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { useLanguage } from "@/components/language-provider";
import {
  Send,
  CheckCircle2,
  Globe,
  Phone,
  MessageCircle,
  Mail,
  Anchor,
  Users,
  Calendar,
  Shield,
  Clock,
  Minus,
  Plus,
  Loader2,
  AlertCircle,
  Waves,
} from "lucide-react";

// ─── i18n ───────────────────────────────────────────────────────────

const t = {
  en: {
    pageTitle: "Charter Inquiry",
    pageSubtitle:
      "Tell us about your dream voyage and our charter specialists will craft a bespoke itinerary tailored to your preferences.",
    aboutYou: "About You",
    firstName: "First Name",
    lastName: "Last Name",
    email: "Email Address",
    phone: "Phone Number",
    preferredContact: "Preferred Contact Method",
    contactEmail: "Email",
    contactWhatsapp: "WhatsApp",
    contactPhone: "Phone",
    language: "Preferred Language",
    yourCharter: "Your Charter",
    destination: "Destination",
    selectDestination: "Select a destination",
    dates: "Preferred Dates",
    datesPlaceholder: "e.g. July 15-22, 2026 (flexible)",
    adults: "Adults",
    children: "Children",
    budgetRange: "Budget Range (per week)",
    selectBudget: "Select budget range",
    preferences: "Preferences",
    yachtType: "Yacht Type",
    halalCatering: "Halal Catering Required",
    professionalCrew: "Professional Crew Required",
    message: "Message",
    messagePlaceholder:
      "Tell us about any special requests, dietary requirements, celebrations, or specific ports you would like to visit...",
    submit: "Send Inquiry",
    submitting: "Sending...",
    required: "Required",
    whatHappensNext: "What Happens Next",
    step1Title: "Inquiry Received",
    step1Desc: "We review your preferences and charter requirements.",
    step2Title: "Yacht Selection",
    step2Desc: "Our team shortlists the best-matched yachts for you.",
    step3Title: "Proposal Sent",
    step3Desc: "Receive a detailed proposal with pricing and itinerary.",
    step4Title: "Confirmation",
    step4Desc: "Finalise your booking and prepare for departure.",
    directContact: "Direct Contact",
    whatsappLabel: "Chat on WhatsApp",
    phoneLabel: "Call Us",
    emailLabel: "Email Us",
    responseTime: "We respond within 24 hours",
    rateLimitNote: "One inquiry per email address every 5 minutes.",
    successTitle: "Inquiry Sent Successfully",
    successMessage:
      "Thank you for your interest. Our charter specialists will review your requirements and be in touch within 24 hours.",
    yourReference: "Your Reference Number",
    sendAnother: "Send Another Inquiry",
    inquiringAbout: "Inquiring About",
    validationRequired: "This field is required.",
    validationEmail: "Please enter a valid email address.",
    languageToggle: "View in Arabic",
    heroTagline: "Your Mediterranean Adventure Awaits",
    heroAreas: "Greek Islands  /  Turkish Coast  /  French Riviera",
    destinations: [
      { value: "greek-islands", label: "Greek Islands" },
      { value: "turkish-coast", label: "Turkish Coast" },
      { value: "croatian-coast", label: "Croatian Coast" },
      { value: "french-riviera", label: "French Riviera" },
      { value: "italian-coast", label: "Italian Coast" },
      { value: "balearic-islands", label: "Balearic Islands" },
      { value: "arabian-gulf", label: "Arabian Gulf" },
      { value: "red-sea", label: "Red Sea" },
      { value: "other", label: "Other" },
    ],
    budgetOptions: [
      { value: "10000-25000", label: "10,000 - 25,000 EUR" },
      { value: "25000-50000", label: "25,000 - 50,000 EUR" },
      { value: "50000-100000", label: "50,000 - 100,000 EUR" },
      { value: "100000-200000", label: "100,000 - 200,000 EUR" },
      { value: "200000+", label: "200,000+ EUR" },
      { value: "flexible", label: "Flexible / Not sure yet" },
    ],
    yachtTypes: [
      { value: "SAILBOAT", label: "Sailing Yacht" },
      { value: "CATAMARAN", label: "Catamaran" },
      { value: "MOTOR_YACHT", label: "Motor Yacht" },
      { value: "GULET", label: "Gulet" },
      { value: "POWER_CATAMARAN", label: "Power Catamaran" },
    ],
  },
  ar: {
    pageTitle: "\u0627\u0633\u062A\u0641\u0633\u0627\u0631 \u0627\u0644\u062A\u0623\u062C\u064A\u0631",
    pageSubtitle:
      "\u0623\u062E\u0628\u0631\u0646\u0627 \u0639\u0646 \u0631\u062D\u0644\u062A\u0643 \u0627\u0644\u0645\u062B\u0627\u0644\u064A\u0629 \u0648\u0633\u064A\u0642\u0648\u0645 \u0645\u062A\u062E\u0635\u0635\u0648 \u0627\u0644\u062A\u0623\u062C\u064A\u0631 \u0644\u062F\u064A\u0646\u0627 \u0628\u0625\u0639\u062F\u0627\u062F \u0628\u0631\u0646\u0627\u0645\u062C \u0645\u062E\u0635\u0635 \u064A\u0646\u0627\u0633\u0628 \u062A\u0641\u0636\u064A\u0644\u0627\u062A\u0643.",
    aboutYou: "\u0639\u0646\u0643",
    firstName: "\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0623\u0648\u0644",
    lastName: "\u0627\u0633\u0645 \u0627\u0644\u0639\u0627\u0626\u0644\u0629",
    email: "\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A",
    phone: "\u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062A\u0641",
    preferredContact: "\u0637\u0631\u064A\u0642\u0629 \u0627\u0644\u062A\u0648\u0627\u0635\u0644 \u0627\u0644\u0645\u0641\u0636\u0644\u0629",
    contactEmail: "\u0628\u0631\u064A\u062F \u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A",
    contactWhatsapp: "\u0648\u0627\u062A\u0633\u0627\u0628",
    contactPhone: "\u0647\u0627\u062A\u0641",
    language: "\u0627\u0644\u0644\u063A\u0629 \u0627\u0644\u0645\u0641\u0636\u0644\u0629",
    yourCharter: "\u0631\u062D\u0644\u062A\u0643",
    destination: "\u0627\u0644\u0648\u062C\u0647\u0629",
    selectDestination: "\u0627\u062E\u062A\u0631 \u0648\u062C\u0647\u0629",
    dates: "\u0627\u0644\u062A\u0648\u0627\u0631\u064A\u062E \u0627\u0644\u0645\u0641\u0636\u0644\u0629",
    datesPlaceholder: "\u0645\u062B\u0627\u0644: 15-22 \u064A\u0648\u0644\u064A\u0648 2026 (\u0645\u0631\u0646)",
    adults: "\u0628\u0627\u0644\u063A\u0648\u0646",
    children: "\u0623\u0637\u0641\u0627\u0644",
    budgetRange: "\u0646\u0637\u0627\u0642 \u0627\u0644\u0645\u064A\u0632\u0627\u0646\u064A\u0629 (\u0623\u0633\u0628\u0648\u0639\u064A\u0627\u064B)",
    selectBudget: "\u0627\u062E\u062A\u0631 \u0646\u0637\u0627\u0642 \u0627\u0644\u0645\u064A\u0632\u0627\u0646\u064A\u0629",
    preferences: "\u0627\u0644\u062A\u0641\u0636\u064A\u0644\u0627\u062A",
    yachtType: "\u0646\u0648\u0639 \u0627\u0644\u064A\u062E\u062A",
    halalCatering: "\u0637\u0639\u0627\u0645 \u062D\u0644\u0627\u0644 \u0645\u0637\u0644\u0648\u0628",
    professionalCrew: "\u0637\u0627\u0642\u0645 \u0645\u062D\u062A\u0631\u0641 \u0645\u0637\u0644\u0648\u0628",
    message: "\u0631\u0633\u0627\u0644\u0629",
    messagePlaceholder:
      "\u0623\u062E\u0628\u0631\u0646\u0627 \u0639\u0646 \u0623\u064A \u0637\u0644\u0628\u0627\u062A \u062E\u0627\u0635\u0629 \u0623\u0648 \u0645\u062A\u0637\u0644\u0628\u0627\u062A \u063A\u0630\u0627\u0626\u064A\u0629 \u0623\u0648 \u0645\u0646\u0627\u0633\u0628\u0627\u062A \u0623\u0648 \u0645\u0648\u0627\u0646\u0626 \u062A\u0631\u063A\u0628 \u0641\u064A \u0632\u064A\u0627\u0631\u062A\u0647\u0627...",
    submit: "\u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0627\u0633\u062A\u0641\u0633\u0627\u0631",
    submitting: "\u062C\u0627\u0631\u064A \u0627\u0644\u0625\u0631\u0633\u0627\u0644...",
    required: "\u0645\u0637\u0644\u0648\u0628",
    whatHappensNext: "\u0645\u0627\u0630\u0627 \u064A\u062D\u062F\u062B \u0628\u0639\u062F \u0630\u0644\u0643",
    step1Title: "\u062A\u0645 \u0627\u0633\u062A\u0644\u0627\u0645 \u0627\u0644\u0627\u0633\u062A\u0641\u0633\u0627\u0631",
    step1Desc: "\u0646\u0631\u0627\u062C\u0639 \u062A\u0641\u0636\u064A\u0644\u0627\u062A\u0643 \u0648\u0645\u062A\u0637\u0644\u0628\u0627\u062A \u0627\u0644\u062A\u0623\u062C\u064A\u0631.",
    step2Title: "\u0627\u062E\u062A\u064A\u0627\u0631 \u0627\u0644\u064A\u062E\u062A",
    step2Desc: "\u064A\u0642\u0648\u0645 \u0641\u0631\u064A\u0642\u0646\u0627 \u0628\u062A\u0631\u0634\u064A\u062D \u0623\u0641\u0636\u0644 \u0627\u0644\u064A\u062E\u0648\u062A \u0627\u0644\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0643.",
    step3Title: "\u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0639\u0631\u0636",
    step3Desc: "\u062A\u0633\u062A\u0644\u0645 \u0639\u0631\u0636\u0627\u064B \u0645\u0641\u0635\u0644\u0627\u064B \u0645\u0639 \u0627\u0644\u0623\u0633\u0639\u0627\u0631 \u0648\u0627\u0644\u0628\u0631\u0646\u0627\u0645\u062C.",
    step4Title: "\u0627\u0644\u062A\u0623\u0643\u064A\u062F",
    step4Desc: "\u0623\u0643\u062F \u062D\u062C\u0632\u0643 \u0648\u0627\u0633\u062A\u0639\u062F \u0644\u0644\u0627\u0646\u0637\u0644\u0627\u0642.",
    directContact: "\u062A\u0648\u0627\u0635\u0644 \u0645\u0628\u0627\u0634\u0631",
    whatsappLabel: "\u062A\u062D\u062F\u062B \u0639\u0628\u0631 \u0648\u0627\u062A\u0633\u0627\u0628",
    phoneLabel: "\u0627\u062A\u0635\u0644 \u0628\u0646\u0627",
    emailLabel: "\u0631\u0627\u0633\u0644\u0646\u0627",
    responseTime: "\u0646\u0631\u062F \u062E\u0644\u0627\u0644 24 \u0633\u0627\u0639\u0629",
    rateLimitNote: "\u0627\u0633\u062A\u0641\u0633\u0627\u0631 \u0648\u0627\u062D\u062F \u0644\u0643\u0644 \u0628\u0631\u064A\u062F \u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0643\u0644 5 \u062F\u0642\u0627\u0626\u0642.",
    successTitle: "\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0627\u0633\u062A\u0641\u0633\u0627\u0631 \u0628\u0646\u062C\u0627\u062D",
    successMessage:
      "\u0634\u0643\u0631\u0627\u064B \u0644\u0627\u0647\u062A\u0645\u0627\u0645\u0643. \u0633\u064A\u0642\u0648\u0645 \u0645\u062A\u062E\u0635\u0635\u0648 \u0627\u0644\u062A\u0623\u062C\u064A\u0631 \u0628\u0645\u0631\u0627\u062C\u0639\u0629 \u0645\u062A\u0637\u0644\u0628\u0627\u062A\u0643 \u0648\u0627\u0644\u062A\u0648\u0627\u0635\u0644 \u062E\u0644\u0627\u0644 24 \u0633\u0627\u0639\u0629.",
    yourReference: "\u0631\u0642\u0645 \u0627\u0644\u0645\u0631\u062C\u0639 \u0627\u0644\u062E\u0627\u0635 \u0628\u0643",
    sendAnother: "\u0625\u0631\u0633\u0627\u0644 \u0627\u0633\u062A\u0641\u0633\u0627\u0631 \u0622\u062E\u0631",
    inquiringAbout: "\u0627\u0633\u062A\u0641\u0633\u0627\u0631 \u0639\u0646",
    validationRequired: "\u0647\u0630\u0627 \u0627\u0644\u062D\u0642\u0644 \u0645\u0637\u0644\u0648\u0628.",
    validationEmail: "\u064A\u0631\u062C\u0649 \u0625\u062F\u062E\u0627\u0644 \u0628\u0631\u064A\u062F \u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0635\u0627\u0644\u062D.",
    languageToggle: "View in English",
    heroTagline: "\u0645\u063A\u0627\u0645\u0631\u062A\u0643 \u0627\u0644\u0645\u062A\u0648\u0633\u0637\u064A\u0629 \u0628\u0627\u0646\u062A\u0638\u0627\u0631\u0643",
    heroAreas: "\u0627\u0644\u062C\u0632\u0631 \u0627\u0644\u064A\u0648\u0646\u0627\u0646\u064A\u0629  /  \u0627\u0644\u0633\u0627\u062D\u0644 \u0627\u0644\u062A\u0631\u0643\u064A  /  \u0627\u0644\u0631\u064A\u0641\u064A\u064A\u0631\u0627 \u0627\u0644\u0641\u0631\u0646\u0633\u064A\u0629",
    destinations: [
      { value: "greek-islands", label: "\u0627\u0644\u062C\u0632\u0631 \u0627\u0644\u064A\u0648\u0646\u0627\u0646\u064A\u0629" },
      { value: "turkish-coast", label: "\u0627\u0644\u0633\u0627\u062D\u0644 \u0627\u0644\u062A\u0631\u0643\u064A" },
      { value: "croatian-coast", label: "\u0627\u0644\u0633\u0627\u062D\u0644 \u0627\u0644\u0643\u0631\u0648\u0627\u062A\u064A" },
      { value: "french-riviera", label: "\u0627\u0644\u0631\u064A\u0641\u064A\u064A\u0631\u0627 \u0627\u0644\u0641\u0631\u0646\u0633\u064A\u0629" },
      { value: "italian-coast", label: "\u0627\u0644\u0633\u0627\u062D\u0644 \u0627\u0644\u0625\u064A\u0637\u0627\u0644\u064A" },
      { value: "balearic-islands", label: "\u062C\u0632\u0631 \u0627\u0644\u0628\u0644\u064A\u0627\u0631" },
      { value: "arabian-gulf", label: "\u0627\u0644\u062E\u0644\u064A\u062C \u0627\u0644\u0639\u0631\u0628\u064A" },
      { value: "red-sea", label: "\u0627\u0644\u0628\u062D\u0631 \u0627\u0644\u0623\u062D\u0645\u0631" },
      { value: "other", label: "\u0623\u062E\u0631\u0649" },
    ],
    budgetOptions: [
      { value: "10000-25000", label: "10,000 - 25,000 \u064A\u0648\u0631\u0648" },
      { value: "25000-50000", label: "25,000 - 50,000 \u064A\u0648\u0631\u0648" },
      { value: "50000-100000", label: "50,000 - 100,000 \u064A\u0648\u0631\u0648" },
      { value: "100000-200000", label: "100,000 - 200,000 \u064A\u0648\u0631\u0648" },
      { value: "200000+", label: "200,000+ \u064A\u0648\u0631\u0648" },
      { value: "flexible", label: "\u0645\u0631\u0646 / \u063A\u064A\u0631 \u0645\u062D\u062F\u062F" },
    ],
    yachtTypes: [
      { value: "SAILBOAT", label: "\u064A\u062E\u062A \u0634\u0631\u0627\u0639\u064A" },
      { value: "CATAMARAN", label: "\u0643\u0627\u062A\u0627\u0645\u0627\u0631\u0627\u0646" },
      { value: "MOTOR_YACHT", label: "\u064A\u062E\u062A \u0645\u0648\u062A\u0648\u0631" },
      { value: "GULET", label: "\u062C\u0648\u0644\u064A\u062A" },
      { value: "POWER_CATAMARAN", label: "\u0643\u0627\u062A\u0627\u0645\u0627\u0631\u0627\u0646 \u0628\u0645\u062D\u0631\u0643" },
    ],
  },
};

// ─── Types ──────────────────────────────────────────────────────────

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  contactPreference: "email" | "whatsapp" | "phone";
  languagePreference: "en" | "ar" | "fr";
  destination: string;
  dates: string;
  adults: number;
  children: number;
  budget: string;
  yachtTypes: string[];
  halalCatering: boolean;
  crewRequired: boolean;
  message: string;
  yachtSlug: string | null;
}

interface FormErrors {
  [key: string]: string;
}

// ─── Component ──────────────────────────────────────────────────────

export default function InquiryPage() {
  const searchParams = useSearchParams();
  const yachtSlug = searchParams.get("yacht");
  const { language, setLanguage } = useLanguage();
  const lang = language === "ar" ? "ar" : "en";
  const labels = t[lang];
  const isRTL = lang === "ar";

  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    contactPreference: "email",
    languagePreference: "en",
    destination: "",
    dates: "",
    adults: 2,
    children: 0,
    budget: "",
    yachtTypes: [],
    halalCatering: false,
    crewRequired: true,
    message: "",
    yachtSlug: yachtSlug,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [serverError, setServerError] = useState("");

  useEffect(() => {
    if (yachtSlug) {
      setFormData((prev) => ({ ...prev, yachtSlug }));
    }
  }, [yachtSlug]);

  const validate = useCallback((): FormErrors => {
    const errs: FormErrors = {};
    if (!formData.firstName.trim()) errs.firstName = labels.validationRequired;
    if (!formData.lastName.trim()) errs.lastName = labels.validationRequired;
    if (!formData.email.trim()) {
      errs.email = labels.validationRequired;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errs.email = labels.validationEmail;
    }
    return errs;
  }, [formData, labels]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError("");
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) {
        setServerError(data.error || "Something went wrong. Please try again.");
        return;
      }
      setReferenceNumber(data.referenceNumber || "ZY-2026-XXXX");
      setSubmitSuccess(true);
    } catch {
      setServerError("Network error. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });
    }
  };

  const toggleYachtType = (type: string) => {
    setFormData((prev) => ({
      ...prev,
      yachtTypes: prev.yachtTypes.includes(type)
        ? prev.yachtTypes.filter((t) => t !== type)
        : [...prev.yachtTypes, type],
    }));
  };

  // ─── Success State ──────────────────────────────────────────────

  if (submitSuccess) {
    return (
      <main className="min-h-screen flex items-center justify-center py-20 px-4" dir={isRTL ? "rtl" : "ltr"} style={{ background: "var(--z-pearl)" }}>
        <div className="text-center max-w-md mx-auto p-10 rounded-2xl" style={{ background: "var(--z-surface)", border: "2px solid var(--z-gold)", boxShadow: "var(--z-shadow-gold)" }}>
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 z-animate-scaleIn" style={{ background: "rgba(14, 165, 162, 0.1)" }}>
            <CheckCircle2 size={48} style={{ color: "var(--z-mediterranean)" }} />
          </div>
          <h1 className="font-display font-bold mb-3" style={{ fontSize: "var(--z-text-title)", color: "var(--z-navy)" }}>{labels.successTitle}</h1>
          <p className="z-text-body mb-6" style={{ color: "var(--z-muted)" }}>{labels.successMessage}</p>
          <div className="p-4 rounded-lg mb-6" style={{ background: "var(--z-sand)", border: "1px solid var(--z-champagne)" }}>
            <p className="z-text-label mb-1">{labels.yourReference}</p>
            <p className="font-mono font-bold" style={{ fontSize: "var(--z-text-subtitle)", color: "var(--z-navy)", letterSpacing: "var(--z-tracking-wide)" }}>{referenceNumber}</p>
          </div>
          <button onClick={() => { setSubmitSuccess(false); setFormData({ firstName: "", lastName: "", email: "", phone: "", contactPreference: "email", languagePreference: "en", destination: "", dates: "", adults: 2, children: 0, budget: "", yachtTypes: [], halalCatering: false, crewRequired: true, message: "", yachtSlug }); }} className="z-btn z-btn-secondary">{labels.sendAnother}</button>
        </div>
      </main>
    );
  }

  // ─── Main Form ──────────────────────────────────────────────────

  return (
    <main className="min-h-screen" dir={isRTL ? "rtl" : "ltr"} style={{ background: "var(--z-pearl)" }}>
      {/* Hero Header */}
      <div className="py-12 px-4" style={{ background: "var(--z-gradient-hero)" }}>
        <div className="z-container text-center">
          <div className="flex justify-end mb-4">
            <button onClick={() => setLanguage(lang === "en" ? "ar" : "en")} className="z-btn z-btn-ghost z-btn-sm flex items-center gap-1.5" style={{ color: "var(--z-champagne)" }} aria-label={labels.languageToggle}>
              <Globe size={14} />
              <span>{labels.languageToggle}</span>
            </button>
          </div>
          <span className="z-text-overline block mb-3">{labels.pageTitle}</span>
          <h1 className="font-display font-bold mb-4" style={{ fontSize: "var(--z-text-title-lg)", color: "var(--z-pearl)", lineHeight: "var(--z-leading-tight)" }}>{labels.pageTitle}</h1>
          <p className="z-text-body-lg max-w-2xl mx-auto" style={{ color: "var(--z-champagne)" }}>{labels.pageSubtitle}</p>
        </div>
      </div>

      {/* Form + Info Panel */}
      <div className="z-container py-12 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

          {/* ── Form (7 cols) ─────────────────────────────────────── */}
          <div className="lg:col-span-7">
            <form onSubmit={handleSubmit} noValidate>
              {/* Yacht context card */}
              {yachtSlug && (
                <div className="mb-8 p-4 rounded-xl flex items-center gap-4" style={{ background: "var(--z-surface)", border: "2px solid var(--z-gold)" }}>
                  <div className="w-14 h-14 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "var(--z-gradient-card)" }}>
                    <Anchor size={24} style={{ color: "var(--z-champagne)" }} />
                  </div>
                  <div>
                    <p className="z-text-label">{labels.inquiringAbout}</p>
                    <p className="font-heading font-bold" style={{ fontSize: "var(--z-text-body-lg)", color: "var(--z-navy)" }}>{yachtSlug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</p>
                  </div>
                </div>
              )}

              {/* Server error */}
              {serverError && (
                <div className="mb-6 p-4 rounded-lg flex items-start gap-3" style={{ background: "rgba(220, 38, 38, 0.06)", border: "1px solid rgba(220, 38, 38, 0.2)" }}>
                  <AlertCircle size={20} className="flex-shrink-0 mt-0.5" style={{ color: "var(--z-storm)" }} />
                  <p style={{ color: "var(--z-storm)" }}>{serverError}</p>
                </div>
              )}

              {/* ── About You ──────────────────────────────────────── */}
              <fieldset className="mb-10">
                <legend className="z-text-subtitle mb-6 flex items-center gap-2" style={{ color: "var(--z-navy)" }}>
                  <Users size={20} style={{ color: "var(--z-gold)" }} />
                  {labels.aboutYou}
                </legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <FormField label={labels.firstName} required error={errors.firstName}>
                    <input type="text" className={`z-input ${errors.firstName ? "z-input-error" : ""}`} value={formData.firstName} onChange={(e) => updateField("firstName", e.target.value)} required />
                  </FormField>
                  <FormField label={labels.lastName} required error={errors.lastName}>
                    <input type="text" className={`z-input ${errors.lastName ? "z-input-error" : ""}`} value={formData.lastName} onChange={(e) => updateField("lastName", e.target.value)} required />
                  </FormField>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <FormField label={labels.email} required error={errors.email}>
                    <input type="email" className={`z-input ${errors.email ? "z-input-error" : ""}`} value={formData.email} onChange={(e) => updateField("email", e.target.value)} required />
                  </FormField>
                  <FormField label={labels.phone}>
                    <input type="tel" className="z-input" placeholder="+971 50 123 4567" value={formData.phone} onChange={(e) => updateField("phone", e.target.value)} />
                  </FormField>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label={labels.preferredContact}>
                    <div className="flex gap-2">
                      {([
                        { val: "email" as const, icon: <Mail size={14} />, lbl: labels.contactEmail },
                        { val: "whatsapp" as const, icon: <MessageCircle size={14} />, lbl: labels.contactWhatsapp },
                        { val: "phone" as const, icon: <Phone size={14} />, lbl: labels.contactPhone },
                      ]).map(({ val, icon, lbl }) => (
                        <button key={val} type="button" onClick={() => updateField("contactPreference", val)} className={`z-btn z-btn-sm flex-1 ${formData.contactPreference === val ? "z-btn-primary" : "z-btn-secondary"}`}>
                          {icon}
                          <span className="hidden sm:inline">{lbl}</span>
                        </button>
                      ))}
                    </div>
                  </FormField>
                  <FormField label={labels.language}>
                    <select className="z-input z-select" value={formData.languagePreference} onChange={(e) => updateField("languagePreference", e.target.value as "en" | "ar" | "fr")}>
                      <option value="en">English</option>
                      <option value="ar">{"\u0627\u0644\u0639\u0631\u0628\u064A\u0629"}</option>
                      <option value="fr">Fran&ccedil;ais</option>
                    </select>
                  </FormField>
                </div>
              </fieldset>

              {/* ── Your Charter ────────────────────────────────────── */}
              <fieldset className="mb-10">
                <legend className="z-text-subtitle mb-6 flex items-center gap-2" style={{ color: "var(--z-navy)" }}>
                  <Anchor size={20} style={{ color: "var(--z-gold)" }} />
                  {labels.yourCharter}
                </legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <FormField label={labels.destination}>
                    <select className="z-input z-select" value={formData.destination} onChange={(e) => updateField("destination", e.target.value)}>
                      <option value="">{labels.selectDestination}</option>
                      {labels.destinations.map((d) => (<option key={d.value} value={d.value}>{d.label}</option>))}
                    </select>
                  </FormField>
                  <FormField label={labels.dates}>
                    <input type="text" className="z-input" placeholder={labels.datesPlaceholder} value={formData.dates} onChange={(e) => updateField("dates", e.target.value)} />
                  </FormField>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
                  <StepperField label={labels.adults} value={formData.adults} onChange={(v) => updateField("adults", v)} min={1} max={20} />
                  <StepperField label={labels.children} value={formData.children} onChange={(v) => updateField("children", v)} min={0} max={12} />
                </div>
                <FormField label={labels.budgetRange}>
                  <select className="z-input z-select" value={formData.budget} onChange={(e) => updateField("budget", e.target.value)}>
                    <option value="">{labels.selectBudget}</option>
                    {labels.budgetOptions.map((b) => (<option key={b.value} value={b.value}>{b.label}</option>))}
                  </select>
                </FormField>
              </fieldset>

              {/* ── Preferences ─────────────────────────────────────── */}
              <fieldset className="mb-10">
                <legend className="z-text-subtitle mb-6 flex items-center gap-2" style={{ color: "var(--z-navy)" }}>
                  <Shield size={20} style={{ color: "var(--z-gold)" }} />
                  {labels.preferences}
                </legend>
                <FormField label={labels.yachtType}>
                  <div className="flex flex-wrap gap-2">
                    {labels.yachtTypes.map((yt) => (
                      <button key={yt.value} type="button" onClick={() => toggleYachtType(yt.value)} className={`z-btn z-btn-sm ${formData.yachtTypes.includes(yt.value) ? "z-btn-primary" : "z-btn-secondary"}`}>
                        {formData.yachtTypes.includes(yt.value) && <CheckCircle2 size={14} />}
                        {yt.label}
                      </button>
                    ))}
                  </div>
                </FormField>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 mb-4">
                  <ToggleCheckbox label={labels.halalCatering} checked={formData.halalCatering} onChange={(v) => updateField("halalCatering", v)} activeColor="var(--z-mediterranean)" />
                  <ToggleCheckbox label={labels.professionalCrew} checked={formData.crewRequired} onChange={(v) => updateField("crewRequired", v)} activeColor="var(--z-aegean)" />
                </div>
                <FormField label={labels.message}>
                  <textarea className="z-input z-textarea" placeholder={labels.messagePlaceholder} value={formData.message} onChange={(e) => updateField("message", e.target.value)} rows={5} />
                </FormField>
              </fieldset>

              <p className="z-text-caption mb-4 flex items-center gap-1.5" style={{ color: "var(--z-muted)" }}>
                <Clock size={12} />
                {labels.rateLimitNote}
              </p>

              <button type="submit" disabled={isSubmitting} className="z-btn z-btn-primary z-btn-xl z-btn-block">
                {isSubmitting ? (<><Loader2 size={20} className="animate-spin" />{labels.submitting}</>) : (<><Send size={20} />{labels.submit}</>)}
              </button>
            </form>
          </div>

          {/* ── Info Panel (5 cols, sticky) ────────────────────────── */}
          <aside className="lg:col-span-5">
            <div className="lg:sticky lg:top-6 space-y-6">
              {/* Image placeholder */}
              <div className="w-full rounded-xl overflow-hidden" style={{ aspectRatio: "16/10", background: "var(--z-gradient-hero)" }}>
                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center">
                  <Waves size={48} style={{ color: "var(--z-champagne)", opacity: 0.5, marginBottom: 16 }} />
                  <p className="font-display font-bold" style={{ fontSize: "var(--z-text-subtitle)", color: "var(--z-pearl)" }}>{labels.heroTagline}</p>
                  <p className="z-text-body-sm mt-2" style={{ color: "var(--z-champagne)" }}>{labels.heroAreas}</p>
                </div>
              </div>

              {/* What Happens Next */}
              <div className="p-6 rounded-xl" style={{ background: "var(--z-surface)", border: "1px solid var(--z-border)" }}>
                <h3 className="z-text-heading mb-5 flex items-center gap-2" style={{ color: "var(--z-navy)" }}>
                  <Calendar size={18} style={{ color: "var(--z-gold)" }} />
                  {labels.whatHappensNext}
                </h3>
                <div className="space-y-5">
                  {[
                    { title: labels.step1Title, desc: labels.step1Desc, num: 1 },
                    { title: labels.step2Title, desc: labels.step2Desc, num: 2 },
                    { title: labels.step3Title, desc: labels.step3Desc, num: 3 },
                    { title: labels.step4Title, desc: labels.step4Desc, num: 4 },
                  ].map((step, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "var(--z-gradient-cta)", color: "var(--z-navy)" }}>
                          <span className="font-mono font-bold text-sm">{step.num}</span>
                        </div>
                        {i < 3 && <div className="w-px flex-1 mt-2" style={{ background: "var(--z-champagne)" }} />}
                      </div>
                      <div className="pb-4">
                        <p className="font-heading font-semibold" style={{ fontSize: "var(--z-text-body)", color: "var(--z-navy)" }}>{step.title}</p>
                        <p className="z-text-body-sm" style={{ color: "var(--z-muted)" }}>{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Direct Contact */}
              <div className="p-6 rounded-xl" style={{ background: "var(--z-surface)", border: "1px solid var(--z-border)" }}>
                <h3 className="z-text-heading mb-4 flex items-center gap-2" style={{ color: "var(--z-navy)" }}>
                  <Phone size={18} style={{ color: "var(--z-gold)" }} />
                  {labels.directContact}
                </h3>
                <div className="space-y-3">
                  <a href="https://wa.me/971501234567?text=Hello%2C%20I%20am%20interested%20in%20a%20yacht%20charter" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "rgba(14, 165, 162, 0.06)", border: "1px solid rgba(14, 165, 162, 0.15)" }}>
                    <MessageCircle size={20} style={{ color: "var(--z-mediterranean)" }} />
                    <div>
                      <span className="font-heading font-semibold block" style={{ fontSize: "var(--z-text-body-sm)", color: "var(--z-navy)" }}>{labels.whatsappLabel}</span>
                      <span className="z-text-caption">+971 50 123 4567</span>
                    </div>
                  </a>
                  <a href="tel:+971501234567" className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "var(--z-surface-sunken)", border: "1px solid var(--z-border)" }}>
                    <Phone size={20} style={{ color: "var(--z-aegean)" }} />
                    <div>
                      <span className="font-heading font-semibold block" style={{ fontSize: "var(--z-text-body-sm)", color: "var(--z-navy)" }}>{labels.phoneLabel}</span>
                      <span className="z-text-caption">+971 50 123 4567</span>
                    </div>
                  </a>
                  <a href="mailto:charter@zenithayachts.com" className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "var(--z-surface-sunken)", border: "1px solid var(--z-border)" }}>
                    <Mail size={20} style={{ color: "var(--z-aegean)" }} />
                    <div>
                      <span className="font-heading font-semibold block" style={{ fontSize: "var(--z-text-body-sm)", color: "var(--z-navy)" }}>{labels.emailLabel}</span>
                      <span className="z-text-caption">charter@zenithayachts.com</span>
                    </div>
                  </a>
                </div>
                <p className="z-text-caption mt-4 flex items-center gap-1.5" style={{ color: "var(--z-muted)" }}>
                  <Clock size={12} />
                  {labels.responseTime}
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Mobile Sticky Bottom CTA */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 p-4" style={{ background: "var(--z-white)", borderTop: "1px solid var(--z-border)", boxShadow: "0 -4px 20px rgba(10, 22, 40, 0.08)" }}>
        <button type="button" onClick={() => { document.querySelector("form")?.scrollIntoView({ behavior: "smooth", block: "start" }); }} className="z-btn z-btn-primary z-btn-lg z-btn-block">
          <Send size={18} />
          {labels.submit}
        </button>
      </div>
    </main>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────

function FormField({ label, required = false, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div className="mb-1">
      <label className="z-text-label flex items-center gap-1 mb-2">
        {label}
        {required && <span style={{ color: "var(--z-coral)" }}>*</span>}
      </label>
      {children}
      {error && (
        <p className="mt-1 flex items-center gap-1" style={{ fontSize: "var(--z-text-caption)", color: "var(--z-coral)" }}>
          <AlertCircle size={12} />
          {error}
        </p>
      )}
    </div>
  );
}

function StepperField({ label, value, onChange, min = 0, max = 20 }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <div>
      <label className="z-text-label block mb-2">{label}</label>
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} className="z-btn z-btn-secondary z-btn-icon z-btn-sm" aria-label={`Decrease ${label}`}>
          <Minus size={16} />
        </button>
        <span className="font-mono font-bold w-8 text-center" style={{ fontSize: "var(--z-text-heading)", color: "var(--z-navy)" }}>{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="z-btn z-btn-secondary z-btn-icon z-btn-sm" aria-label={`Increase ${label}`}>
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}

function ToggleCheckbox({ label, checked, onChange, activeColor }: { label: string; checked: boolean; onChange: (v: boolean) => void; activeColor: string }) {
  const bgActive = activeColor === "var(--z-mediterranean)" ? "rgba(14, 165, 162, 0.06)" : "rgba(46, 90, 136, 0.06)";
  return (
    <label className="flex items-center gap-3 p-4 rounded-lg cursor-pointer transition-colors" style={{ background: checked ? bgActive : "var(--z-surface)", border: `1px solid ${checked ? activeColor : "var(--z-border)"}` }}>
      <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0" style={{ background: checked ? activeColor : "var(--z-surface-sunken)", border: checked ? "none" : "1px solid var(--z-border)" }}>
        {checked && <CheckCircle2 size={14} style={{ color: "var(--z-white)" }} />}
      </div>
      <span className="font-heading font-medium" style={{ fontSize: "var(--z-text-body-sm)", color: "var(--z-navy)" }}>{label}</span>
    </label>
  );
}
