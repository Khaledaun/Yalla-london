'use client';

import React from 'react';
import Link from 'next/link';

/* ═══════════════════════════════════════════════════════════════
   YALLA LONDON — Brand Kit v2 Component Library
   All public-facing UI components use these building blocks.
   ═══════════════════════════════════════════════════════════════ */

/* ── 1.1 TRI-COLOR BAR ── */
export function TriBar({ className = '' }: { className?: string }) {
  return (
    <div className={`relative flex h-[3px] w-full ${className}`} aria-hidden="true">
      <span className="flex-1 bg-yl-red" />
      <span className="flex-1 bg-yl-gold" />
      <span className="flex-1 bg-yl-blue" />
      {/* Shimmer overlay */}
      <span className="absolute inset-0 animate-brand-shimmer" />
    </div>
  );
}

/* ── 1.4 BUTTON SYSTEM ── */
type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'gold';
type ButtonSize = 'sm' | 'md' | 'lg';

interface BrandButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
  href?: string;
}

const buttonVariantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-yl-red text-white hover:bg-[#a82924] hover:-translate-y-0.5 shadow-lg',
  outline: 'border border-yl-gray-500 text-yl-parchment hover:border-yl-gold hover:text-yl-gold bg-transparent',
  ghost: 'text-yl-gray-400 hover:text-yl-parchment bg-transparent',
  gold: 'bg-yl-gold text-yl-charcoal hover:bg-[#b08a24] hover:-translate-y-0.5 shadow-lg',
};

const buttonSizeClasses: Record<ButtonSize, string> = {
  sm: 'py-2 px-4 text-xs',
  md: 'py-3 px-5 text-xs',
  lg: 'py-4 px-8 text-[13px]',
};

export function BrandButton({
  variant = 'primary',
  size = 'md',
  href,
  className = '',
  children,
  ...props
}: BrandButtonProps) {
  const classes = `inline-flex items-center justify-center font-mono tracking-wider uppercase rounded-lg transition-all duration-300 ease-yl ${buttonVariantClasses[variant]} ${buttonSizeClasses[size]} ${className}`;

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}

/* ── 1.5 TAG / BADGE SYSTEM ── */
type TagColor = 'red' | 'gold' | 'blue' | 'neutral';

const tagColorClasses: Record<TagColor, string> = {
  red: 'bg-yl-red/15 text-yl-red',
  gold: 'bg-yl-gold/15 text-yl-gold',
  blue: 'bg-yl-blue/15 text-yl-blue',
  neutral: 'bg-yl-gray-200/50 text-yl-gray-500',
};

export function BrandTag({
  color = 'red',
  children,
  className = '',
}: {
  color?: TagColor;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center font-mono text-xs tracking-wider uppercase rounded-full px-3 py-1 ${tagColorClasses[color]} ${className}`}>
      {children}
    </span>
  );
}

/* ── 1.6 TOAST / NOTIFICATION SYSTEM ── */
type ToastType = 'success' | 'error' | 'info';

const toastClasses: Record<ToastType, { bg: string; border: string; icon: string }> = {
  success: { bg: 'bg-green-50', border: 'border-green-400', icon: '✓' },
  error: { bg: 'bg-red-50', border: 'border-yl-red', icon: '✕' },
  info: { bg: 'bg-blue-50', border: 'border-yl-blue', icon: 'ℹ' },
};

export function BrandToast({
  type = 'info',
  message,
  onDismiss,
}: {
  type?: ToastType;
  message: string;
  onDismiss?: () => void;
}) {
  const config = toastClasses[type];
  return (
    <div className={`flex items-center gap-3 ${config.bg} ${config.border} border rounded-xl px-4 py-3 font-mono text-xs shadow-md`}>
      <span className="font-bold text-sm">{config.icon}</span>
      <span className="flex-1">{message}</span>
      {onDismiss && (
        <button onClick={onDismiss} className="text-yl-gray-400 hover:text-yl-charcoal transition-colors">
          ✕
        </button>
      )}
    </div>
  );
}

/* ── 1.7 INPUT FIELDS ── */
export function BrandInput({
  className = '',
  isArabic = false,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { isArabic?: boolean }) {
  return (
    <input
      className={`bg-white/4 border border-white/10 rounded-lg text-yl-parchment font-body px-4 py-3 w-full focus:border-yl-gold focus:ring-2 focus:ring-yl-gold/15 outline-none transition-all duration-300 ease-yl placeholder:text-yl-gray-400 ${
        isArabic ? 'dir-rtl font-arabic' : ''
      } ${className}`}
      dir={isArabic ? 'rtl' : undefined}
      {...props}
    />
  );
}

/* ── 1.8 CONTENT CARDS ── */
export function BrandCard({
  children,
  className = '',
  hoverable = true,
}: {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
}) {
  return (
    <div
      className={`bg-yl-dark-navy rounded-[14px] border border-white/5 ${
        hoverable ? 'hover:-translate-y-1 hover:border-yl-gold/20 hover:shadow-lg' : ''
      } transition-all duration-400 ease-yl ${className}`}
    >
      {children}
    </div>
  );
}

export function BrandCardLight({
  children,
  className = '',
  hoverable = true,
}: {
  children?: React.ReactNode;
  className?: string;
  hoverable?: boolean;
}) {
  return (
    <div
      className={`bg-white rounded-[14px] border border-yl-gray-200 shadow-sm ${
        hoverable ? 'hover:-translate-y-1 hover:border-yl-gold/30 hover:shadow-lg' : ''
      } transition-all duration-400 ease-yl ${className}`}
    >
      {children}
    </div>
  );
}

/* ── SECTION LABEL ── */
export function SectionLabel({
  children,
  className = '',
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={`font-mono text-xs tracking-widest uppercase text-yl-gold block mb-2 ${className}`}>
      {children}
    </span>
  );
}

/* ── WATERMARK STAMP ── */
export function WatermarkStamp({ className = '' }: { className?: string }) {
  return (
    <div className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`} aria-hidden="true">
      <img
        src="/branding/yalla-london/brand-kit-v2/yalla-brand-kit/logos/yalla-watermark-500px.png"
        alt=""
        className="absolute right-0 bottom-0 w-[300px] h-[300px] opacity-[0.08] object-contain"
      />
    </div>
  );
}

/* ── PAGE WATERMARKS — multiple scattered stamps for rich brand presence ── */
export function PageWatermarks({ className = '' }: { className?: string }) {
  const stamp = '/branding/yalla-london/brand-kit-v2/yalla-brand-kit/logos/yalla-watermark-500px.png';
  return (
    <div className={`fixed inset-0 pointer-events-none z-[1] overflow-hidden ${className}`} aria-hidden="true">
      {/* Top-left — subtle, rotated, floating */}
      <img src={stamp} alt="" className="absolute -top-10 -left-10 w-[280px] h-[280px] opacity-[0.04] object-contain animate-brand-float" style={{ '--float-rotation': '-15deg' } as React.CSSProperties} />
      {/* Mid-right — gentle pulse */}
      <img src={stamp} alt="" className="absolute top-[35%] -right-8 w-[240px] h-[240px] opacity-[0.05] object-contain rotate-[10deg] animate-brand-pulse" />
      {/* Bottom-left — floating with different delay */}
      <img src={stamp} alt="" className="absolute bottom-[15%] -left-12 w-[260px] h-[260px] opacity-[0.04] object-contain animate-brand-float" style={{ '--float-rotation': '-8deg', animationDelay: '3s' } as React.CSSProperties} />
      {/* Bottom-right — larger, pulsing */}
      <img src={stamp} alt="" className="absolute -bottom-8 -right-8 w-[350px] h-[350px] opacity-[0.06] object-contain rotate-[5deg] animate-brand-pulse" style={{ animationDelay: '2s' }} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   EDITORIAL BRAND ELEMENTS
   Components used in the editorial homepage redesign, PDF covers,
   Etsy product covers, and email templates. These are the signature
   visual elements that make Yalla London recognizable.
   ═══════════════════════════════════════════════════════════════ */

/* ── YALLA WORDMARK + LDN BADGE ── */
/**
 * The primary Yalla London logo as styled text.
 * Use when SVG logo file is not available (emails, PDFs, OG images).
 * For web pages, prefer the SVG at /branding/yalla-london/brand-kit/01-logos-svg/yalla-primary-light.svg
 */
export function YallaWordmark({
  dark = false,
  size = 'md',
  className = '',
}: {
  /** true = white text (for dark backgrounds), false = charcoal text */
  dark?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const fg = dark ? 'text-white' : 'text-yl-charcoal';
  const sizes = {
    sm: { text: 'text-lg', badge: 'text-[9px] px-1.5 py-0.5', gap: 'gap-1.5' },
    md: { text: 'text-2xl', badge: 'text-[11px] px-2 py-1', gap: 'gap-2' },
    lg: { text: 'text-4xl', badge: 'text-sm px-3 py-1.5', gap: 'gap-3' },
  };
  const s = sizes[size];
  return (
    <div className={`flex items-center ${s.gap} ${className}`}>
      <span className={`${s.text} font-display font-extrabold tracking-tight ${fg}`}>YALLA</span>
      <span className={`${s.badge} border-2 border-yl-blue rounded text-yl-blue font-display font-semibold tracking-[0.15em] -rotate-[5deg]`}>LDN</span>
    </div>
  );
}

/* ── STAMP SEAL ── */
/**
 * Double-circle passport stamp seal with LDN center.
 * Used in PDF covers, Etsy products, and as decorative element.
 * Matches the stamp from /branding/yalla-london/brand-kit/02-logos-transparent/yalla-stamp-seal-transparent.svg
 */
export function StampSeal({
  size = 120,
  color = 'text-yl-blue',
  opacity = 'opacity-50',
  className = '',
}: {
  size?: number;
  color?: string;
  opacity?: string;
  className?: string;
}) {
  return (
    <div
      className={`rounded-full border-2 ${color} border-current flex items-center justify-center relative ${opacity} ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <div
        className={`rounded-full border border-current/30 flex flex-col items-center justify-center ${color}`}
        style={{ width: size - 16, height: size - 16 }}
      >
        <span className="font-display font-bold tracking-[0.15em]" style={{ fontSize: size * 0.08 }}>YALLA LONDON</span>
        <span className="font-display font-semibold tracking-[0.2em]" style={{ fontSize: size * 0.2 }}>LDN</span>
        <span className="font-mono tracking-wider" style={{ fontSize: size * 0.06 }}>GATE Y &middot; 1st CLASS</span>
      </div>
      {/* Cardinal dots */}
      <span className="absolute left-[-4px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-yl-red" />
      <span className="absolute right-[-4px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-yl-blue" />
      <span className="absolute top-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-yl-gold" />
    </div>
  );
}

/* ── GOLD RULE ── */
/**
 * Gold accent divider line. The editorial design's signature visual rhythm.
 * Used between logos and content, between sections, above article bodies.
 */
export function GoldRule({
  width = 56,
  className = '',
}: {
  /** Width in pixels */
  width?: number;
  className?: string;
}) {
  return (
    <div
      className={`h-[2px] bg-yl-gold ${className}`}
      style={{ width }}
      aria-hidden="true"
    />
  );
}

/* ── EDITORIAL SECTION HEADER ── */
/**
 * Section header with gold accent rule + heading + "View All" link.
 * Matches the editorial homepage pattern used across all content sections.
 */
export function EditorialSectionHeader({
  title,
  href,
  linkText = 'View All',
  icon: Icon,
  isRTL = false,
  className = '',
}: {
  title: string;
  href: string;
  linkText?: string;
  icon?: React.ElementType;
  isRTL?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-between mb-8 ${className}`}>
      <div className="flex items-center gap-3">
        <GoldRule width={40} />
        {Icon && <Icon className="w-5 h-5 text-yl-gold" />}
        <h2 className={`text-2xl md:text-3xl font-bold text-yl-charcoal ${isRTL ? 'font-arabic' : 'font-display'}`}>
          {title}
        </h2>
      </div>
      <Link
        href={href}
        className="group flex items-center gap-1.5 font-mono text-xs font-semibold tracking-wider uppercase text-yl-red hover:text-yl-gold transition-colors"
      >
        {linkText}
        <svg className={`w-4 h-4 group-hover:translate-x-0.5 transition-transform ${isRTL ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </Link>
    </div>
  );
}

/* ── BOARDING PASS META ── */
/**
 * Boarding pass metadata row — GATE Y | CLASS 1st | TO [DESTINATION]
 * Used in PDF covers, Etsy product covers, and editorial hero areas.
 */
export function BoardingPassMeta({
  destination = 'London',
  dark = false,
  className = '',
}: {
  destination?: string;
  /** true = white text (dark bg), false = charcoal text (light bg) */
  dark?: boolean;
  className?: string;
}) {
  const label = dark ? 'text-white/40' : 'text-yl-gray-400';
  const value = dark ? 'text-white' : 'text-yl-charcoal';
  return (
    <div className={`flex gap-8 ${className}`}>
      <div>
        <div className={`font-mono text-[10px] tracking-[0.2em] uppercase ${label}`}>Gate</div>
        <div className={`font-display text-xl font-bold ${value}`}>Y</div>
      </div>
      <div>
        <div className={`font-mono text-[10px] tracking-[0.2em] uppercase ${label}`}>Class</div>
        <div className={`font-display text-xl font-bold ${value}`}>1st</div>
      </div>
      <div>
        <div className={`font-mono text-[10px] tracking-[0.2em] uppercase ${label}`}>To</div>
        <div className={`font-mono text-base tracking-[0.3em] uppercase ${label}`}>{destination}</div>
      </div>
    </div>
  );
}

/* ── KICKER LABEL ── */
/**
 * Gold mono uppercase kicker label used above editorial headings.
 * "THE DEFINITIVE LONDON GUIDE" / "LUXURY TRAVEL GUIDE" / etc.
 */
export function KickerLabel({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={`font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-yl-gold ${className}`}>
      {children}
    </span>
  );
}

/* ── PRICE DISPLAY ── */
/**
 * Price with currency, styled for editorial luxury feel.
 * Used in hotel cards, experience cards, event tickets.
 */
export function PriceDisplay({
  price,
  size = 'md',
  className = '',
}: {
  price: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-lg',
  };
  return (
    <span className={`font-mono font-bold tracking-wider text-yl-charcoal ${sizes[size]} ${className}`}>
      {price}
    </span>
  );
}

/* ── STAR RATING ── */
/**
 * Gold star rating display. 1-5 stars with brand gold color.
 */
export function StarRating({
  rating = 5,
  size = 14,
  className = '',
}: {
  rating?: number;
  size?: number;
  className?: string;
}) {
  return (
    <div className={`flex gap-0.5 ${className}`} aria-label={`${rating} out of 5 stars`}>
      {[...Array(5)].map((_, i) => (
        <svg
          key={i}
          className={i < rating ? 'text-yl-gold fill-yl-gold' : 'text-yl-gray-300'}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   UTILITY COMPONENTS
   ═══════════════════════════════════════════════════════════════ */

/* ── BREADCRUMBS ── */
export function Breadcrumbs({
  items,
  className = '',
}: {
  items: { label: string; href?: string }[];
  className?: string;
}) {
  return (
    <nav className={`font-mono text-xs text-yl-gray-500 ${className}`} aria-label="Breadcrumb">
      <ol className="flex items-center gap-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-yl-gray-300">/</span>}
            {item.href ? (
              <Link href={item.href} className="hover:text-yl-gold transition-colors uppercase tracking-wider">
                {item.label}
              </Link>
            ) : (
              <span className="text-yl-gray-400 uppercase tracking-wider">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
