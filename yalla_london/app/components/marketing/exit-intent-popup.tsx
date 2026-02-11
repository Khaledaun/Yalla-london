'use client';

/**
 * Exit Intent Popup Component
 *
 * Captures leads when users are about to leave the page:
 * - Mouse exit detection (desktop)
 * - Scroll-based trigger (mobile)
 * - Time-based trigger (fallback)
 * - Session-aware (won't show repeatedly)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Gift, FileText, Mail, Loader2, CheckCircle, Clock, Sparkles } from 'lucide-react';

interface ExitIntentPopupProps {
  variant?: 'guide' | 'discount' | 'newsletter' | 'custom';
  guideSlug?: string;
  discountCode?: string;
  discountPercent?: number;
  customTitle?: string;
  customDescription?: string;
  locale?: 'en' | 'ar';
  delay?: number; // Minimum time before showing (ms)
  scrollThreshold?: number; // Scroll percentage trigger (mobile)
  showOnce?: boolean; // Only show once per session
  cookieDays?: number; // Days before showing again after dismissal
  onShow?: () => void;
  onClose?: () => void;
  onSuccess?: (email: string) => void;
}

const GUIDE_DATA = {
  'maldives-complete': {
    title_en: 'Wait! Get Your FREE Maldives Guide',
    title_ar: 'انتظر! احصل على دليل المالديف المجاني',
    description_en: '48 pages of insider tips, budget hacks, and the best resorts - completely free.',
    description_ar: '48 صفحة من النصائح الداخلية وحيل الميزانية وأفضل المنتجعات - مجاناً تماماً.',
    value_en: 'Worth $29 - Yours FREE',
    value_ar: 'بقيمة 29 دولار - لك مجاناً',
  },
  'london-halal-food': {
    title_en: 'Before You Go... Free Halal Food Guide!',
    title_ar: 'قبل أن تذهب... دليل الطعام الحلال المجاني!',
    description_en: 'Discover 100+ halal restaurants in London with our exclusive guide.',
    description_ar: 'اكتشف أكثر من 100 مطعم حلال في لندن مع دليلنا الحصري.',
    value_en: 'Worth $19 - Yours FREE',
    value_ar: 'بقيمة 19 دولار - لك مجاناً',
  },
};

export function ExitIntentPopup({
  variant = 'guide',
  guideSlug = 'maldives-complete',
  discountCode = 'STAYWITHUS',
  discountPercent = 10,
  customTitle,
  customDescription,
  locale = 'en',
  delay = 5000,
  scrollThreshold = 70,
  showOnce = true,
  cookieDays = 7,
  onShow,
  onClose,
  onSuccess,
}: ExitIntentPopupProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const hasTriggered = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isArabic = locale === 'ar';
  const guide = GUIDE_DATA[guideSlug as keyof typeof GUIDE_DATA] || GUIDE_DATA['maldives-complete'];

  const translations = {
    en: {
      emailPlaceholder: 'Enter your email',
      cta: 'Send Me The Guide',
      ctaDiscount: 'Get My Discount',
      ctaNewsletter: 'Subscribe',
      privacy: 'We respect your privacy. Unsubscribe anytime.',
      successTitle: "You're In!",
      successGuide: 'Check your inbox for your free guide.',
      successDiscount: `Your ${discountPercent}% discount code: ${discountCode}`,
      successNewsletter: "You're subscribed! Welcome aboard.",
      discountTitle: `Wait! Here's ${discountPercent}% Off`,
      discountDescription: "We don't want you to miss out. Use this exclusive code on your booking.",
      newsletterTitle: 'Join 10,000+ Smart Travelers',
      newsletterDescription: 'Get exclusive deals, insider tips, and travel inspiration delivered to your inbox.',
      limitedTime: 'Limited Time Offer',
      noThanks: 'No thanks, I prefer full price',
    },
    ar: {
      emailPlaceholder: 'أدخل بريدك الإلكتروني',
      cta: 'أرسل لي الدليل',
      ctaDiscount: 'احصل على خصمي',
      ctaNewsletter: 'اشترك',
      privacy: 'نحترم خصوصيتك. يمكنك إلغاء الاشتراك في أي وقت.',
      successTitle: 'تم!',
      successGuide: 'تحقق من بريدك الإلكتروني للحصول على الدليل المجاني.',
      successDiscount: `كود الخصم ${discountPercent}%: ${discountCode}`,
      successNewsletter: 'تم اشتراكك! مرحباً بك.',
      discountTitle: `انتظر! إليك خصم ${discountPercent}%`,
      discountDescription: 'لا نريدك أن تفوت الفرصة. استخدم هذا الكود الحصري على حجزك.',
      newsletterTitle: 'انضم إلى أكثر من 10,000 مسافر ذكي',
      newsletterDescription: 'احصل على عروض حصرية ونصائح داخلية وإلهام للسفر في بريدك الإلكتروني.',
      limitedTime: 'عرض محدود الوقت',
      noThanks: 'لا شكراً، أفضل السعر الكامل',
    },
  };

  const t = translations[locale];

  // Check if popup should be shown (session/cookie check)
  const shouldShow = useCallback(() => {
    if (typeof window === 'undefined') return false;

    const dismissed = localStorage.getItem('exit_popup_dismissed');
    if (dismissed) {
      const dismissedDate = new Date(dismissed);
      const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < cookieDays) return false;
    }

    if (showOnce && sessionStorage.getItem('exit_popup_shown')) {
      return false;
    }

    return true;
  }, [cookieDays, showOnce]);

  // Trigger the popup
  const triggerPopup = useCallback(() => {
    if (hasTriggered.current || !shouldShow()) return;

    hasTriggered.current = true;
    setIsVisible(true);
    sessionStorage.setItem('exit_popup_shown', 'true');
    onShow?.();

    // Track event
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'exit_intent_shown', {
        event_category: 'Exit Intent',
        event_label: variant,
      });
    }
  }, [shouldShow, onShow, variant]);

  // Exit intent detection
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    // Wait for minimum delay before enabling
    timeoutRef.current = setTimeout(() => {
      // Desktop: Mouse leaving viewport at top
      const handleMouseLeave = (e: MouseEvent) => {
        if (e.clientY <= 0) {
          triggerPopup();
        }
      };

      // Mobile: Scroll detection (scrolling back up quickly)
      let lastScrollY = window.scrollY;
      let scrollDirection: 'up' | 'down' = 'down';
      let upScrollCount = 0;

      const handleScroll = () => {
        const currentScrollY = window.scrollY;
        const scrollPercent = (currentScrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;

        // Detect scroll direction change
        if (currentScrollY < lastScrollY) {
          if (scrollDirection === 'down') {
            scrollDirection = 'up';
            upScrollCount++;
          }
        } else {
          scrollDirection = 'down';
        }

        // Trigger if user scrolled past threshold then started scrolling up multiple times
        if (scrollPercent > scrollThreshold && upScrollCount >= 2) {
          triggerPopup();
        }

        lastScrollY = currentScrollY;
      };

      document.addEventListener('mouseleave', handleMouseLeave);
      window.addEventListener('scroll', handleScroll, { passive: true });

      return () => {
        document.removeEventListener('mouseleave', handleMouseLeave);
        window.removeEventListener('scroll', handleScroll);
      };
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [delay, scrollThreshold, triggerPopup]);

  // Handle close
  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem('exit_popup_dismissed', new Date().toISOString());
    onClose?.();
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !email.includes('@')) {
      setErrorMessage(isArabic ? 'يرجى إدخال بريد إلكتروني صحيح' : 'Please enter a valid email');
      setStatus('error');
      return;
    }

    setStatus('loading');

    try {
      const leadType = variant === 'guide' ? 'PDF_GUIDE' : variant === 'discount' ? 'QUOTE_REQUEST' : 'NEWSLETTER';

      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          lead_type: leadType,
          source: 'exit-intent',
          tags: [`exit-intent:${variant}`, guideSlug ? `guide:${guideSlug}` : null].filter(Boolean),
          metadata: {
            variant,
            guide_slug: guideSlug,
            discount_code: variant === 'discount' ? discountCode : undefined,
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        setStatus('success');
        onSuccess?.(email);

        // Track conversion
        if (typeof window !== 'undefined' && (window as any).gtag) {
          (window as any).gtag('event', 'exit_intent_converted', {
            event_category: 'Exit Intent',
            event_label: variant,
          });
        }
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      setStatus('error');
      setErrorMessage(isArabic ? 'حدث خطأ. يرجى المحاولة مرة أخرى.' : 'Something went wrong. Please try again.');
    }
  };

  if (!isVisible) return null;

  // Success state
  if (status === 'success') {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div
          className="bg-white rounded-2xl max-w-md w-full p-8 text-center animate-in fade-in zoom-in duration-300"
          dir={isArabic ? 'rtl' : 'ltr'}
        >
          <div className="w-20 h-20 bg-cream-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-10 w-10 text-forest" />
          </div>
          <h3 className="text-2xl font-bold text-charcoal mb-2">{t.successTitle}</h3>
          <p className="text-stone mb-6">
            {variant === 'guide' && t.successGuide}
            {variant === 'discount' && t.successDiscount}
            {variant === 'newsletter' && t.successNewsletter}
          </p>
          {variant === 'discount' && (
            <div className="bg-cream-100 border-2 border-dashed border-yalla-gold-400 rounded-lg p-4 mb-6">
              <span className="text-2xl font-mono font-bold text-yalla-gold-700">{discountCode}</span>
            </div>
          )}
          <button
            onClick={handleClose}
            className="text-stone hover:text-charcoal underline"
          >
            {isArabic ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    );
  }

  // Get content based on variant
  let title = customTitle;
  let description = customDescription;
  let icon = <Gift className="h-8 w-8" />;
  let ctaText = t.cta;
  let accentColor = 'blue';

  if (variant === 'guide') {
    title = title || (isArabic ? guide.title_ar : guide.title_en);
    description = description || (isArabic ? guide.description_ar : guide.description_en);
    icon = <FileText className="h-8 w-8" />;
    ctaText = t.cta;
    accentColor = 'blue';
  } else if (variant === 'discount') {
    title = title || t.discountTitle;
    description = description || t.discountDescription;
    icon = <Sparkles className="h-8 w-8" />;
    ctaText = t.ctaDiscount;
    accentColor = 'amber';
  } else if (variant === 'newsletter') {
    title = title || t.newsletterTitle;
    description = description || t.newsletterDescription;
    icon = <Mail className="h-8 w-8" />;
    ctaText = t.ctaNewsletter;
    accentColor = 'purple';
  }

  const colorClasses = {
    blue: {
      bg: 'bg-london-600',
      hover: 'hover:bg-london-700',
      light: 'bg-london-100',
      text: 'text-london-600',
      gradient: 'from-london-600 to-london-800',
    },
    amber: {
      bg: 'bg-yalla-gold-500',
      hover: 'hover:bg-yalla-gold-600',
      light: 'bg-yalla-gold-100',
      text: 'text-yalla-gold-600',
      gradient: 'from-yalla-gold-500 to-yalla-gold-700',
    },
    purple: {
      bg: 'bg-thames-500',
      hover: 'hover:bg-thames-600',
      light: 'bg-thames-100',
      text: 'text-thames-500',
      gradient: 'from-thames-500 to-thames-700',
    },
  };

  const colors = colorClasses[accentColor as keyof typeof colorClasses];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300"
        dir={isArabic ? 'rtl' : 'ltr'}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 text-stone hover:text-charcoal hover:bg-cream-100 rounded-full transition-colors z-10"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className={`bg-gradient-to-r ${colors.gradient} p-6 pt-8 text-white text-center relative`}>
          {variant === 'discount' && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {t.limitedTime}
            </div>
          )}

          <div className={`w-16 h-16 ${colors.light} rounded-full flex items-center justify-center mx-auto mb-4 ${colors.text}`}>
            {icon}
          </div>

          <h3 className="text-2xl font-bold mb-2">{title}</h3>
          <p className="text-white/90">{description}</p>

          {variant === 'guide' && (
            <div className="mt-4 inline-block bg-white/20 px-4 py-2 rounded-full text-sm font-medium">
              {isArabic ? guide.value_ar : guide.value_en}
            </div>
          )}

          {variant === 'discount' && (
            <div className="mt-4 text-4xl font-bold">
              {discountPercent}% OFF
            </div>
          )}
        </div>

        {/* Form */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.emailPlaceholder}
              className="w-full px-4 py-3 border border-sand rounded-lg focus:ring-2 focus:ring-london-600 focus:border-transparent text-lg"
              disabled={status === 'loading'}
              autoFocus
            />

            {status === 'error' && (
              <p className="text-red-600 text-sm">{errorMessage}</p>
            )}

            <button
              type="submit"
              disabled={status === 'loading'}
              className={`w-full px-6 py-4 ${colors.bg} ${colors.hover} text-white font-bold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-lg`}
            >
              {status === 'loading' ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                ctaText
              )}
            </button>

            <p className="text-stone text-xs text-center">{t.privacy}</p>
          </form>

          {variant === 'discount' && (
            <button
              onClick={handleClose}
              className="w-full mt-3 text-stone hover:text-charcoal text-sm underline"
            >
              {t.noThanks}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Exit Intent Provider
 *
 * Wrapper component to add exit intent detection to any page
 */
export function ExitIntentProvider({
  children,
  ...popupProps
}: ExitIntentPopupProps & { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ExitIntentPopup {...popupProps} />
    </>
  );
}
