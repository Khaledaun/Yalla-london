'use client';

/**
 * Trust Badges Component
 *
 * Displays trust signals to increase conversion:
 * - Payment method icons
 * - Security badges (SSL, secure checkout)
 * - Partner logos
 * - Guarantees
 */

import { Shield, Lock, CreditCard, Award, CheckCircle, Star, Globe, Headphones } from 'lucide-react';
import Image from 'next/image';

interface TrustBadgesProps {
  variant?: 'full' | 'compact' | 'minimal';
  locale?: 'en' | 'ar';
  showPayments?: boolean;
  showSecurity?: boolean;
  showPartners?: boolean;
  className?: string;
}

const PAYMENT_METHODS = [
  { name: 'Visa', icon: '/images/payments/visa.svg', alt: 'Visa' },
  { name: 'Mastercard', icon: '/images/payments/mastercard.svg', alt: 'Mastercard' },
  { name: 'Amex', icon: '/images/payments/amex.svg', alt: 'American Express' },
  { name: 'Apple Pay', icon: '/images/payments/apple-pay.svg', alt: 'Apple Pay' },
  { name: 'Google Pay', icon: '/images/payments/google-pay.svg', alt: 'Google Pay' },
];

const PARTNER_LOGOS = [
  { name: 'Booking.com', logo: '/images/partners/booking.svg' },
  { name: 'Agoda', logo: '/images/partners/agoda.svg' },
  { name: 'TripAdvisor', logo: '/images/partners/tripadvisor.svg' },
];

export function TrustBadges({
  variant = 'full',
  locale = 'en',
  showPayments = true,
  showSecurity = true,
  showPartners = false,
  className = '',
}: TrustBadgesProps) {
  const isArabic = locale === 'ar';

  const translations = {
    en: {
      secureCheckout: 'Secure Checkout',
      sslEncrypted: 'SSL Encrypted',
      bestPriceGuarantee: 'Best Price Guarantee',
      support247: '24/7 Support',
      trustedPartners: 'Trusted Partners',
      paymentMethods: 'Accepted Payment Methods',
    },
    ar: {
      secureCheckout: 'دفع آمن',
      sslEncrypted: 'مشفر بـ SSL',
      bestPriceGuarantee: 'ضمان أفضل سعر',
      support247: 'دعم 24/7',
      trustedPartners: 'شركاء موثوقون',
      paymentMethods: 'طرق الدفع المقبولة',
    },
  };

  const t = translations[locale];

  if (variant === 'minimal') {
    return (
      <div
        className={`flex items-center gap-3 ${className}`}
        dir={isArabic ? 'rtl' : 'ltr'}
      >
        <div className="flex items-center gap-1 text-green-600 text-sm">
          <Lock className="h-4 w-4" />
          <span>{t.secureCheckout}</span>
        </div>
        <div className="flex items-center gap-1 text-stone text-sm">
          <Shield className="h-4 w-4" />
          <span>{t.sslEncrypted}</span>
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div
        className={`flex flex-wrap items-center justify-center gap-4 py-4 ${className}`}
        dir={isArabic ? 'rtl' : 'ltr'}
      >
        <TrustBadge icon={<Lock className="h-5 w-5" />} text={t.secureCheckout} />
        <TrustBadge icon={<Shield className="h-5 w-5" />} text={t.sslEncrypted} />
        <TrustBadge icon={<Award className="h-5 w-5" />} text={t.bestPriceGuarantee} />
        <TrustBadge icon={<Headphones className="h-5 w-5" />} text={t.support247} />
      </div>
    );
  }

  // Full variant
  return (
    <div
      className={`space-y-6 ${className}`}
      dir={isArabic ? 'rtl' : 'ltr'}
    >
      {/* Security Badges */}
      {showSecurity && (
        <div className="flex flex-wrap items-center justify-center gap-6">
          <SecurityBadge
            icon={<Lock className="h-6 w-6" />}
            title={t.secureCheckout}
            description={isArabic ? 'بياناتك محمية' : 'Your data is protected'}
          />
          <SecurityBadge
            icon={<Shield className="h-6 w-6" />}
            title={t.sslEncrypted}
            description={isArabic ? '256-bit تشفير' : '256-bit encryption'}
          />
          <SecurityBadge
            icon={<Award className="h-6 w-6" />}
            title={t.bestPriceGuarantee}
            description={isArabic ? 'أو نعيد الفرق' : 'Or we refund the difference'}
          />
          <SecurityBadge
            icon={<Headphones className="h-6 w-6" />}
            title={t.support247}
            description={isArabic ? 'نحن هنا لمساعدتك' : "We're here to help"}
          />
        </div>
      )}

      {/* Payment Methods */}
      {showPayments && (
        <div className="border-t border-sand pt-6">
          <p className="text-center text-sm text-stone mb-4">{t.paymentMethods}</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {PAYMENT_METHODS.map((method) => (
              <div
                key={method.name}
                className="w-12 h-8 bg-white border border-sand rounded flex items-center justify-center"
                title={method.alt}
              >
                {/* Using placeholder styling since actual SVGs might not exist */}
                <span className="text-xs font-medium text-stone">{method.name.slice(0, 2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Partner Logos */}
      {showPartners && (
        <div className="border-t border-sand pt-6">
          <p className="text-center text-sm text-stone mb-4">{t.trustedPartners}</p>
          <div className="flex flex-wrap items-center justify-center gap-6">
            {PARTNER_LOGOS.map((partner) => (
              <div
                key={partner.name}
                className="grayscale hover:grayscale-0 transition-all opacity-60 hover:opacity-100"
              >
                <div className="h-8 flex items-center">
                  <span className="text-sm font-medium text-stone">{partner.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Individual Trust Badge
 */
function TrustBadge({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 text-stone">
      <span className="text-green-600">{icon}</span>
      <span className="text-sm font-medium">{text}</span>
    </div>
  );
}

/**
 * Security Badge with description
 */
function SecurityBadge({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 max-w-[200px]">
      <div className="flex-shrink-0 w-12 h-12 bg-green-50 rounded-full flex items-center justify-center text-green-600">
        {icon}
      </div>
      <div>
        <div className="font-semibold text-charcoal">{title}</div>
        <div className="text-sm text-stone">{description}</div>
      </div>
    </div>
  );
}

/**
 * Footer Trust Strip
 *
 * Horizontal trust badges for footer
 */
export function FooterTrustStrip({ locale = 'en' }: { locale?: 'en' | 'ar' }) {
  const isArabic = locale === 'ar';

  return (
    <div
      className="bg-cream border-y border-sand py-6"
      dir={isArabic ? 'rtl' : 'ltr'}
    >
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-wrap items-center justify-center gap-8">
          <div className="flex items-center gap-2 text-stone">
            <Lock className="h-5 w-5 text-green-600" />
            <span className="text-sm">{isArabic ? 'دفع آمن 100%' : '100% Secure Payment'}</span>
          </div>

          <div className="flex items-center gap-2 text-stone">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-sm">{isArabic ? 'ضمان أفضل سعر' : 'Best Price Guarantee'}</span>
          </div>

          <div className="flex items-center gap-2 text-stone">
            <Star className="h-5 w-5 text-yalla-gold-500" />
            <span className="text-sm">{isArabic ? 'تقييم 4.9/5' : '4.9/5 Rating'}</span>
          </div>

          <div className="flex items-center gap-2 text-stone">
            <Globe className="h-5 w-5 text-thames-600" />
            <span className="text-sm">{isArabic ? 'خدمة عربي/إنجليزي' : 'Arabic/English Support'}</span>
          </div>

          <div className="flex items-center gap-2 text-stone">
            <Headphones className="h-5 w-5 text-london-600" />
            <span className="text-sm">{isArabic ? 'دعم 24/7' : '24/7 Support'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Checkout Trust Banner
 *
 * Prominent trust messaging for checkout pages
 */
export function CheckoutTrustBanner({ locale = 'en' }: { locale?: 'en' | 'ar' }) {
  const isArabic = locale === 'ar';

  return (
    <div
      className="bg-green-50 border border-green-100 rounded-lg p-4"
      dir={isArabic ? 'rtl' : 'ltr'}
    >
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <Shield className="h-6 w-6 text-green-600" />
          </div>
        </div>
        <div>
          <h4 className="font-semibold text-green-900">
            {isArabic ? 'معاملتك محمية' : 'Your transaction is protected'}
          </h4>
          <p className="text-sm text-green-700">
            {isArabic
              ? 'نستخدم تشفير SSL بنفس معايير البنوك. بياناتك لا تُخزن على خوادمنا.'
              : 'We use bank-level SSL encryption. Your payment details are never stored on our servers.'}
          </p>
        </div>
      </div>
    </div>
  );
}
