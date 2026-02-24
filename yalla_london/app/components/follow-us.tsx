'use client'

import { useLanguage } from './language-provider'

// ---------------------------------------------------------------------------
// Inline SVG icons for social platforms
// ---------------------------------------------------------------------------

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
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

function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  )
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  )
}

function SnapchatIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12.166.053C12.86.053 16.347.177 18.13 3.32c.95 1.674.79 4.488.67 5.88l-.012.152c-.022.284-.044.567-.052.86a.575.575 0 00.273.52c.294.168.616.272.948.368.075.022.149.044.22.069.508.172.944.4.944.82a.724.724 0 01-.033.192c-.207.578-1.016.804-1.36.893-.08.021-.148.039-.195.055-.19.064-.37.14-.54.229a.906.906 0 00-.368.39c-.073.161-.073.335.009.571.42 1.228 1.268 2.264 2.37 2.96.285.18.585.322.897.422.329.108.538.265.538.487-.005.218-.148.408-.42.556a3.48 3.48 0 01-.584.246c-.509.166-1.08.243-1.498.45-.388.192-.536.474-.801.95-.145.26-.31.556-.576.894-.453.573-1.053.867-1.783.867-.31 0-.634-.054-.997-.157l-.03-.008a4.982 4.982 0 00-1.282-.189 5.738 5.738 0 00-.83.07 6.96 6.96 0 00-1.04.33l-.11.042c-.385.147-.788.3-1.27.3h-.038c-.73 0-1.33-.294-1.783-.867a7.63 7.63 0 01-.576-.893c-.265-.476-.413-.758-.8-.95-.42-.207-.99-.284-1.5-.45a3.48 3.48 0 01-.583-.246c-.272-.148-.415-.338-.42-.556 0-.222.209-.379.538-.487.312-.1.612-.243.898-.423 1.1-.695 1.948-1.731 2.369-2.959.082-.236.082-.41.009-.57a.906.906 0 00-.368-.391 3.588 3.588 0 00-.54-.23 3.385 3.385 0 01-.195-.054c-.344-.089-1.153-.315-1.36-.893a.724.724 0 01-.033-.192c0-.42.436-.648.944-.82.071-.025.145-.047.22-.069.332-.096.654-.2.948-.368a.575.575 0 00.273-.52 8.97 8.97 0 01-.052-.86l-.012-.152c-.12-1.392-.28-4.206.67-5.88C7.653.177 11.14.053 11.834.053h.332z" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Social platform config
// ---------------------------------------------------------------------------

const SOCIAL_PLATFORMS = [
  {
    id: 'instagram',
    label_en: 'Instagram',
    label_ar: 'انستغرام',
    icon: InstagramIcon,
    href: 'https://instagram.com/yallalondon',
    hoverBg: 'hover:bg-gradient-to-tr hover:from-[#f09433] hover:via-[#e6683c] hover:to-[#bc1888]',
    hoverColor: 'hover:text-white hover:border-transparent',
  },
  {
    id: 'tiktok',
    label_en: 'TikTok',
    label_ar: 'تيك توك',
    icon: TikTokIcon,
    href: 'https://tiktok.com/@yallalondon',
    hoverBg: 'hover:bg-[#010101]',
    hoverColor: 'hover:text-white hover:border-[#010101]',
  },
  {
    id: 'x',
    label_en: 'X',
    label_ar: 'إكس',
    icon: XIcon,
    href: 'https://x.com/yallalondon',
    hoverBg: 'hover:bg-[#0f1419]',
    hoverColor: 'hover:text-white hover:border-[#0f1419]',
  },
  {
    id: 'facebook',
    label_en: 'Facebook',
    label_ar: 'فيسبوك',
    icon: FacebookIcon,
    href: 'https://facebook.com/yallalondon',
    hoverBg: 'hover:bg-[#1877F2]',
    hoverColor: 'hover:text-white hover:border-[#1877F2]',
  },
  {
    id: 'youtube',
    label_en: 'YouTube',
    label_ar: 'يوتيوب',
    icon: YouTubeIcon,
    href: 'https://youtube.com/@yallalondon',
    hoverBg: 'hover:bg-[#FF0000]',
    hoverColor: 'hover:text-white hover:border-[#FF0000]',
  },
  {
    id: 'snapchat',
    label_en: 'Snapchat',
    label_ar: 'سناب شات',
    icon: SnapchatIcon,
    href: 'https://snapchat.com/add/yallalondon',
    hoverBg: 'hover:bg-[#FFFC00]',
    hoverColor: 'hover:text-charcoal hover:border-[#FFFC00]',
  },
]

// ---------------------------------------------------------------------------
// Component props
// ---------------------------------------------------------------------------

interface FollowUsProps {
  /** Visual variant */
  variant?: 'light' | 'dark'
  /** Show the "Follow us" heading */
  showLabel?: boolean
  /** Size of each icon button */
  size?: 'sm' | 'md'
}

// ---------------------------------------------------------------------------
// FollowUs
// ---------------------------------------------------------------------------

export function FollowUs({
  variant = 'light',
  showLabel = true,
  size = 'md',
}: FollowUsProps) {
  const { language } = useLanguage()

  const isDark = variant === 'dark'
  const isSm = size === 'sm'

  const baseBg = isDark ? 'bg-graphite border-stone/20' : 'bg-white border-sand'
  const baseText = isDark ? 'text-cream-200' : 'text-stone'
  const labelColor = isDark ? 'text-cream-100' : 'text-charcoal'
  const btnSize = isSm ? 'w-9 h-9' : 'w-10 h-10'
  const iconSize = isSm ? 'w-4 h-4' : 'w-[18px] h-[18px]'

  return (
    <div className="flex flex-col items-center gap-3">
      {showLabel && (
        <span className={`font-sans text-xs font-medium uppercase tracking-[1px] ${labelColor}`}>
          {language === 'en' ? 'Follow Us' : 'تابعنا'}
        </span>
      )}

      <div className="flex items-center gap-2 flex-wrap justify-center">
        {SOCIAL_PLATFORMS.map((platform) => {
          const Icon = platform.icon
          return (
            <a
              key={platform.id}
              href={platform.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`
                inline-flex items-center justify-center rounded-full border
                transition-all duration-200 hover:-translate-y-0.5
                ${btnSize} ${baseBg} ${baseText}
                ${platform.hoverBg} ${platform.hoverColor}
              `}
              aria-label={`${language === 'en' ? 'Follow us on' : 'تابعنا على'} ${language === 'en' ? platform.label_en : platform.label_ar}`}
              title={language === 'en' ? platform.label_en : platform.label_ar}
            >
              <Icon className={iconSize} />
            </a>
          )
        })}
      </div>
    </div>
  )
}
