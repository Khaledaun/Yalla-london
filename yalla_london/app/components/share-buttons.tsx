'use client'

import { useState } from 'react'
import { useLanguage } from './language-provider'
import { Link2, Check } from 'lucide-react'

// ---------------------------------------------------------------------------
// Social platform share URL builders
// ---------------------------------------------------------------------------

function whatsappUrl(url: string, text: string) {
  return `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`
}

function twitterUrl(url: string, text: string) {
  return `https://x.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}&via=yallalondon`
}

function facebookUrl(url: string) {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
}

function linkedinUrl(url: string, title: string) {
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`
}

function emailUrl(url: string, subject: string, body: string) {
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(`${body}\n\n${url}`)}`
}

// ---------------------------------------------------------------------------
// Inline SVG icons (no extra dependency needed)
// ---------------------------------------------------------------------------

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  )
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
}

function MailIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Platform config
// ---------------------------------------------------------------------------

const PLATFORMS = [
  {
    id: 'whatsapp',
    label_en: 'WhatsApp',
    label_ar: 'واتساب',
    icon: WhatsAppIcon,
    color: 'hover:bg-[#25D366] hover:text-white hover:border-[#25D366]',
    getUrl: (url: string, title: string, _excerpt: string) => whatsappUrl(url, title),
  },
  {
    id: 'x',
    label_en: 'X',
    label_ar: 'إكس',
    icon: XIcon,
    color: 'hover:bg-[#0f1419] hover:text-white hover:border-[#0f1419]',
    getUrl: (url: string, title: string) => twitterUrl(url, title),
  },
  {
    id: 'facebook',
    label_en: 'Facebook',
    label_ar: 'فيسبوك',
    icon: FacebookIcon,
    color: 'hover:bg-[#1877F2] hover:text-white hover:border-[#1877F2]',
    getUrl: (url: string) => facebookUrl(url),
  },
  {
    id: 'linkedin',
    label_en: 'LinkedIn',
    label_ar: 'لينكدإن',
    icon: LinkedInIcon,
    color: 'hover:bg-[#0A66C2] hover:text-white hover:border-[#0A66C2]',
    getUrl: (url: string, title: string) => linkedinUrl(url, title),
  },
  {
    id: 'email',
    label_en: 'Email',
    label_ar: 'بريد',
    icon: MailIcon,
    color: 'hover:bg-stone hover:text-white hover:border-stone',
    getUrl: (url: string, title: string, excerpt: string) => emailUrl(url, title, excerpt),
  },
] as const

// ---------------------------------------------------------------------------
// Component props
// ---------------------------------------------------------------------------

interface ShareButtonsProps {
  /** The full URL of the page to share */
  url?: string
  /** The share title / headline */
  title: string
  /** A short description used in WhatsApp / email body */
  excerpt?: string
  /** Visual variant: "inline" row of icon buttons, "bar" full-width strip */
  variant?: 'inline' | 'bar'
}

// ---------------------------------------------------------------------------
// ShareButtons
// ---------------------------------------------------------------------------

export function ShareButtons({
  url,
  title,
  excerpt = '',
  variant = 'inline',
}: ShareButtonsProps) {
  const { language } = useLanguage()
  const [copied, setCopied] = useState(false)

  const pageUrl = url ?? (typeof window !== 'undefined' ? window.location.href : '')

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(pageUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard not available
    }
  }

  const isBar = variant === 'bar'

  return (
    <div className={`flex items-center ${isBar ? 'gap-1' : 'gap-1.5'} flex-wrap`}>
      {/* Label */}
      <span className="font-sans text-xs font-medium uppercase tracking-[1px] text-stone mr-1">
        {language === 'en' ? 'Share' : 'مشاركة'}
      </span>

      {/* Platform buttons */}
      {PLATFORMS.map((platform) => {
        const Icon = platform.icon
        const shareUrl = platform.getUrl(pageUrl, title, excerpt)

        return (
          <a
            key={platform.id}
            href={shareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`
              inline-flex items-center justify-center rounded-full border border-sand bg-white text-stone
              transition-all duration-200
              ${isBar ? 'w-9 h-9' : 'w-8 h-8'}
              ${platform.color}
            `}
            aria-label={`${language === 'en' ? 'Share on' : 'مشاركة عبر'} ${language === 'en' ? platform.label_en : platform.label_ar}`}
            title={language === 'en' ? platform.label_en : platform.label_ar}
          >
            <Icon className={isBar ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
          </a>
        )
      })}

      {/* Copy link */}
      <button
        onClick={handleCopy}
        className={`
          inline-flex items-center justify-center rounded-full border border-sand bg-white text-stone
          transition-all duration-200
          hover:bg-yalla-gold-500 hover:text-charcoal hover:border-yalla-gold-500
          ${isBar ? 'w-9 h-9' : 'w-8 h-8'}
        `}
        aria-label={language === 'en' ? 'Copy link' : 'نسخ الرابط'}
        title={language === 'en' ? (copied ? 'Copied!' : 'Copy link') : (copied ? 'تم النسخ!' : 'نسخ الرابط')}
      >
        {copied ? (
          <Check className={isBar ? 'w-4 h-4 text-green-600' : 'w-3.5 h-3.5 text-green-600'} />
        ) : (
          <Link2 className={isBar ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
        )}
      </button>
    </div>
  )
}
