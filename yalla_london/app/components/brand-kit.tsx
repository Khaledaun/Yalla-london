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
  sm: 'py-2 px-4 text-[9px]',
  md: 'py-3 px-5 text-[11px]',
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
    <span className={`inline-flex items-center font-mono text-[9px] tracking-wider uppercase rounded-full px-3 py-1 ${tagColorClasses[color]} ${className}`}>
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
    <div className={`flex items-center gap-3 ${config.bg} ${config.border} border rounded-xl px-4 py-3 font-mono text-[11px] shadow-md`}>
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
  children: React.ReactNode;
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
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={`font-mono text-[10px] tracking-widest uppercase text-yl-gold block mb-2 ${className}`}>
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

/* ── BREADCRUMBS ── */
export function Breadcrumbs({
  items,
  className = '',
}: {
  items: { label: string; href?: string }[];
  className?: string;
}) {
  return (
    <nav className={`font-mono text-[10px] text-yl-gray-500 ${className}`} aria-label="Breadcrumb">
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
