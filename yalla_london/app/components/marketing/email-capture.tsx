'use client';

/**
 * Email Capture Component
 *
 * Lead generation with PDF guide offer:
 * - Inline form for content pages
 * - Full-page opt-in for landing pages
 * - PDF guide download incentive
 * - Arabic/English support
 */

import { useState } from 'react';
import { FileText, Download, Mail, CheckCircle, Loader2, Gift, BookOpen } from 'lucide-react';

interface EmailCaptureProps {
  variant?: 'inline' | 'card' | 'hero' | 'minimal';
  guideSlug?: string;
  guideName?: string;
  guideDescription?: string;
  guideImage?: string;
  locale?: 'en' | 'ar';
  source?: string;
  tags?: string[];
  className?: string;
  onSuccess?: (email: string) => void;
}

const GUIDES = {
  'maldives-complete': {
    name_en: 'Complete Maldives Guide 2024',
    name_ar: 'دليل المالديف الشامل 2024',
    description_en: 'Everything you need to plan your perfect Maldives trip: best islands, resorts, budgeting tips, and hidden gems.',
    description_ar: 'كل ما تحتاجه لتخطيط رحلتك المثالية إلى المالديف: أفضل الجزر والمنتجعات ونصائح الميزانية والجواهر المخفية.',
    pages: 48,
    image: '/images/guides/maldives-complete.jpg',
  },
  'london-halal-food': {
    name_en: 'London Halal Food Guide',
    name_ar: 'دليل الطعام الحلال في لندن',
    description_en: 'Discover the best halal restaurants in London: from fine dining to hidden gems.',
    description_ar: 'اكتشف أفضل المطاعم الحلال في لندن: من المطاعم الفاخرة إلى الجواهر المخفية.',
    pages: 32,
    image: '/images/guides/london-halal.jpg',
  },
  'budget-maldives': {
    name_en: 'Budget Maldives: Luxury for Less',
    name_ar: 'المالديف بميزانية: الفخامة بأقل تكلفة',
    description_en: 'How to experience the Maldives without breaking the bank. Includes local island stays and budget resort picks.',
    description_ar: 'كيف تستمتع بالمالديف دون إنفاق ثروة. يشمل الإقامة في الجزر المحلية واختيارات المنتجعات الاقتصادية.',
    pages: 24,
    image: '/images/guides/budget-maldives.jpg',
  },
};

export function EmailCapture({
  variant = 'card',
  guideSlug = 'maldives-complete',
  guideName,
  guideDescription,
  guideImage,
  locale = 'en',
  source = 'website',
  tags = [],
  className = '',
  onSuccess,
}: EmailCaptureProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const isArabic = locale === 'ar';
  const guide = GUIDES[guideSlug as keyof typeof GUIDES] || GUIDES['maldives-complete'];

  const translations = {
    en: {
      title: 'Get Your Free Guide',
      subtitle: 'Join 10,000+ travelers who plan smarter trips',
      emailPlaceholder: 'Enter your email',
      cta: 'Send Me The Guide',
      ctaLoading: 'Sending...',
      privacy: 'We respect your privacy. Unsubscribe anytime.',
      success: 'Check your inbox!',
      successSubtitle: 'Your guide is on its way.',
      pages: 'pages',
      freeDownload: 'Free Download',
      instantAccess: 'Instant Access',
      noSpam: 'No Spam Promise',
    },
    ar: {
      title: 'احصل على دليلك المجاني',
      subtitle: 'انضم إلى أكثر من 10,000 مسافر يخططون لرحلات أذكى',
      emailPlaceholder: 'أدخل بريدك الإلكتروني',
      cta: 'أرسل لي الدليل',
      ctaLoading: 'جاري الإرسال...',
      privacy: 'نحترم خصوصيتك. يمكنك إلغاء الاشتراك في أي وقت.',
      success: 'تحقق من بريدك!',
      successSubtitle: 'دليلك في الطريق إليك.',
      pages: 'صفحة',
      freeDownload: 'تحميل مجاني',
      instantAccess: 'وصول فوري',
      noSpam: 'بدون رسائل مزعجة',
    },
  };

  const t = translations[locale];
  const displayName = guideName || (isArabic ? guide.name_ar : guide.name_en);
  const displayDescription = guideDescription || (isArabic ? guide.description_ar : guide.description_en);
  const displayImage = guideImage || guide.image;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !email.includes('@')) {
      setErrorMessage(isArabic ? 'يرجى إدخال بريد إلكتروني صحيح' : 'Please enter a valid email');
      setStatus('error');
      return;
    }

    setStatus('loading');

    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          lead_type: 'PDF_GUIDE',
          source,
          tags: [...tags, `guide:${guideSlug}`],
          metadata: {
            guide_slug: guideSlug,
            guide_name: displayName,
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        setStatus('success');
        onSuccess?.(email);

        // Track conversion event
        if (typeof window !== 'undefined' && (window as any).gtag) {
          (window as any).gtag('event', 'lead_generated', {
            event_category: 'Lead',
            event_label: guideSlug,
          });
        }
      } else {
        throw new Error(data.error || 'Failed to subscribe');
      }
    } catch (error) {
      setStatus('error');
      setErrorMessage(isArabic ? 'حدث خطأ. يرجى المحاولة مرة أخرى.' : 'Something went wrong. Please try again.');
    }
  };

  // Success state
  if (status === 'success') {
    return (
      <div
        className={`bg-cream border border-sand rounded-xl p-8 text-center ${className}`}
        dir={isArabic ? 'rtl' : 'ltr'}
      >
        <div className="w-16 h-16 bg-cream-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="h-8 w-8 text-forest" />
        </div>
        <h3 className="text-xl font-bold text-forest mb-2">{t.success}</h3>
        <p className="text-forest">{t.successSubtitle}</p>
      </div>
    );
  }

  // Minimal variant
  if (variant === 'minimal') {
    return (
      <form
        onSubmit={handleSubmit}
        className={`flex gap-2 ${className}`}
        dir={isArabic ? 'rtl' : 'ltr'}
      >
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t.emailPlaceholder}
          className="flex-1 px-4 py-2 border border-sand rounded-lg focus:ring-2 focus:ring-london-600 focus:border-transparent"
          disabled={status === 'loading'}
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="px-6 py-2 bg-london-600 text-white font-medium rounded-lg hover:bg-london-700 transition-colors disabled:opacity-50"
        >
          {status === 'loading' ? <Loader2 className="h-5 w-5 animate-spin" /> : t.cta}
        </button>
      </form>
    );
  }

  // Inline variant
  if (variant === 'inline') {
    return (
      <div
        className={`bg-gradient-to-r from-cream to-cream-100 rounded-xl p-6 ${className}`}
        dir={isArabic ? 'rtl' : 'ltr'}
      >
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-london-100 rounded-full flex items-center justify-center">
            <FileText className="h-6 w-6 text-london-600" />
          </div>
          <div>
            <h4 className="font-semibold text-charcoal">{displayName}</h4>
            <p className="text-sm text-stone">{guide.pages} {t.pages} • {t.freeDownload}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t.emailPlaceholder}
            className="flex-1 px-4 py-2 border border-sand rounded-lg focus:ring-2 focus:ring-london-600 focus:border-transparent"
            disabled={status === 'loading'}
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            className="px-6 py-2 bg-london-600 text-white font-medium rounded-lg hover:bg-london-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {status === 'loading' ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">{t.cta}</span>
              </>
            )}
          </button>
        </form>

        {status === 'error' && (
          <p className="text-red-600 text-sm mt-2">{errorMessage}</p>
        )}
      </div>
    );
  }

  // Hero variant
  if (variant === 'hero') {
    return (
      <div
        className={`bg-gradient-to-br from-london-600 to-london-900 rounded-2xl p-8 md:p-12 text-white ${className}`}
        dir={isArabic ? 'rtl' : 'ltr'}
      >
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full text-sm mb-6">
            <Gift className="h-4 w-4" />
            <span>{t.freeDownload}</span>
          </div>

          <h2 className="text-3xl md:text-4xl font-bold mb-4">{displayName}</h2>
          <p className="text-lg text-london-100 mb-8">{displayDescription}</p>

          <div className="flex flex-wrap justify-center gap-6 mb-8">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              <span>{guide.pages} {t.pages}</span>
            </div>
            <div className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              <span>{t.instantAccess}</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              <span>{t.noSpam}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="max-w-md mx-auto">
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.emailPlaceholder}
                className="flex-1 px-4 py-3 rounded-lg text-charcoal focus:ring-2 focus:ring-yalla-gold-400"
                disabled={status === 'loading'}
              />
              <button
                type="submit"
                disabled={status === 'loading'}
                className="px-6 py-3 bg-yalla-gold-400 text-charcoal font-bold rounded-lg hover:bg-yalla-gold-300 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {status === 'loading' ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Mail className="h-5 w-5" />
                    <span className="hidden sm:inline">{t.cta}</span>
                  </>
                )}
              </button>
            </div>

            {status === 'error' && (
              <p className="text-red-300 text-sm mt-2">{errorMessage}</p>
            )}

            <p className="text-london-200 text-sm mt-4">{t.privacy}</p>
          </form>
        </div>
      </div>
    );
  }

  // Card variant (default)
  return (
    <div
      className={`bg-white border border-sand rounded-xl overflow-hidden shadow-lg ${className}`}
      dir={isArabic ? 'rtl' : 'ltr'}
    >
      {/* Guide Preview Image */}
      <div className="bg-gradient-to-br from-london-600 to-london-800 p-6">
        <div className="aspect-[4/3] bg-white/10 rounded-lg flex items-center justify-center">
          <FileText className="h-16 w-16 text-white/80" />
        </div>
      </div>

      <div className="p-6">
        <div className="flex items-center gap-2 text-london-600 text-sm font-medium mb-2">
          <Gift className="h-4 w-4" />
          <span>{t.freeDownload}</span>
        </div>

        <h3 className="text-xl font-bold text-charcoal mb-2">{displayName}</h3>
        <p className="text-stone text-sm mb-4">{displayDescription}</p>

        <div className="flex items-center gap-4 text-sm text-stone mb-6">
          <span className="flex items-center gap-1">
            <BookOpen className="h-4 w-4" />
            {guide.pages} {t.pages}
          </span>
          <span className="flex items-center gap-1">
            <Download className="h-4 w-4" />
            PDF
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t.emailPlaceholder}
            className="w-full px-4 py-3 border border-sand rounded-lg focus:ring-2 focus:ring-london-600 focus:border-transparent"
            disabled={status === 'loading'}
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            className="w-full px-6 py-3 bg-london-600 text-white font-bold rounded-lg hover:bg-london-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {status === 'loading' ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Download className="h-5 w-5" />
                {t.cta}
              </>
            )}
          </button>

          {status === 'error' && (
            <p className="text-red-600 text-sm">{errorMessage}</p>
          )}

          <p className="text-stone text-xs text-center">{t.privacy}</p>
        </form>
      </div>
    </div>
  );
}

/**
 * Content Upgrade Banner
 *
 * Shows contextual guide offer within blog posts
 */
export function ContentUpgradeBanner({
  guideSlug,
  locale = 'en',
  className = '',
}: {
  guideSlug: string;
  locale?: 'en' | 'ar';
  className?: string;
}) {
  const isArabic = locale === 'ar';
  const guide = GUIDES[guideSlug as keyof typeof GUIDES];

  if (!guide) return null;

  return (
    <div
      className={`my-8 bg-gradient-to-r from-cream to-cream-100 border border-sand rounded-xl p-6 ${className}`}
      dir={isArabic ? 'rtl' : 'ltr'}
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-12 h-12 bg-yalla-gold-100 rounded-lg flex items-center justify-center">
          <FileText className="h-6 w-6 text-yalla-gold-600" />
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-charcoal mb-1">
            {isArabic ? '📚 تريد المزيد؟' : '📚 Want more?'}
          </h4>
          <p className="text-stone text-sm mb-3">
            {isArabic ? guide.description_ar : guide.description_en}
          </p>
          <EmailCapture
            variant="minimal"
            guideSlug={guideSlug}
            locale={locale}
            source="content-upgrade"
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Sticky Footer CTA
 *
 * Fixed bottom bar for lead capture
 */
export function StickyFooterCTA({
  guideSlug = 'maldives-complete',
  locale = 'en',
  show = true,
  onClose,
}: {
  guideSlug?: string;
  locale?: 'en' | 'ar';
  show?: boolean;
  onClose?: () => void;
}) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const isArabic = locale === 'ar';

  if (!show || status === 'success') return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus('loading');

    try {
      await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          lead_type: 'PDF_GUIDE',
          source: 'sticky-footer',
          tags: [`guide:${guideSlug}`],
        }),
      });
      setStatus('success');
    } catch {
      setStatus('idle');
    }
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 bg-london-600 text-white py-3 px-4 z-50 shadow-lg"
      dir={isArabic ? 'rtl' : 'ltr'}
    >
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 hidden sm:block" />
          <span className="font-medium text-sm sm:text-base">
            {isArabic
              ? '🎁 احصل على دليلك المجاني الآن!'
              : '🎁 Get your FREE travel guide now!'}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2 w-full sm:w-auto">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={isArabic ? 'بريدك الإلكتروني' : 'Your email'}
            className="flex-1 sm:w-64 px-3 py-2 rounded text-charcoal text-sm"
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            className="px-4 py-2 bg-yalla-gold-400 text-charcoal font-bold rounded hover:bg-yalla-gold-300 transition-colors text-sm"
          >
            {status === 'loading' ? '...' : isArabic ? 'أرسل' : 'Send'}
          </button>
        </form>

        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-1 right-1 sm:relative sm:top-0 sm:right-0 p-1 hover:bg-london-700 rounded"
            aria-label="Close"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
