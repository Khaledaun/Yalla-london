'use client'

import { useEffect, useRef } from 'react'
import { ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { trackEmbedEvent } from '@/lib/social-embed-utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface XPostData {
  /** The X/Twitter post URL (e.g. https://x.com/user/status/123456) */
  postUrl: string
  /** Post author handle (without @) */
  handle?: string
  /** Post text content (for fallback display before embed loads) */
  text?: string
  /** Trend or topic this post is associated with */
  trend?: string
  /** Engagement level hint */
  engagement?: 'high' | 'medium' | 'low'
}

export interface XPostEmbedProps {
  post: XPostData
  /** Visual variant */
  variant?: 'card' | 'compact' | 'inline'
  className?: string
}

// ---------------------------------------------------------------------------
// X logo SVG (small, inline, no external dependency)
// ---------------------------------------------------------------------------

function XLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * X/Twitter Post Embed — displays a tweet in a "post-like" window.
 *
 * Uses Twitter's official widgets.js for full rendering (images, media, metrics).
 * Shows a styled fallback card while the widget loads or if JS is blocked.
 *
 * Usage:
 *   <XPostEmbed post={{ postUrl: "https://x.com/user/status/123", handle: "user" }} />
 */
export function XPostEmbed({ post, variant = 'card', className }: XPostEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetLoaded = useRef(false)

  // Load Twitter widgets.js once and render the embedded tweet
  useEffect(() => {
    if (!post.postUrl || widgetLoaded.current) return undefined

    // Extract tweet ID from URL
    const tweetIdMatch = post.postUrl.match(/status\/(\d+)/)
    if (!tweetIdMatch) return undefined
    const tweetId = tweetIdMatch[1]

    // Check if widgets.js is already loaded
    const twttr = (window as any).twttr
    if (twttr?.widgets) {
      renderTweet(twttr, tweetId)
      return undefined
    }

    // Load widgets.js
    const script = document.createElement('script')
    script.src = 'https://platform.twitter.com/widgets.js'
    script.async = true
    script.charset = 'utf-8'
    script.onload = () => {
      const t = (window as any).twttr
      if (t?.widgets) {
        renderTweet(t, tweetId)
      }
    }
    document.head.appendChild(script)

    return undefined
  }, [post.postUrl])

  function renderTweet(twttr: any, tweetId: string) {
    if (!containerRef.current || widgetLoaded.current) return
    // Clear fallback content
    const fallback = containerRef.current.querySelector('[data-fallback]')

    twttr.widgets
      .createTweet(tweetId, containerRef.current, {
        theme: 'light',
        dnt: true, // Do Not Track
        align: 'center',
      })
      .then((el: HTMLElement | undefined) => {
        if (el && fallback) {
          fallback.remove()
        }
        widgetLoaded.current = true
        trackEmbedEvent('x', 'embed_loaded', tweetId)
      })
      .catch(() => {
        // Keep fallback visible
      })
  }

  const isCompact = variant === 'compact'
  const isInline = variant === 'inline'

  // Normalize URL to always use x.com
  const normalizedUrl = post.postUrl.replace('twitter.com', 'x.com')

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative group',
        !isInline && 'rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200',
        isCompact && 'max-w-sm',
        className,
      )}
    >
      {/* Fallback card — shown until Twitter widgets.js loads the real embed */}
      <div data-fallback>
        {/* Header */}
        <div className={cn('flex items-center gap-3', isInline ? 'px-0 py-2' : 'px-4 pt-4 pb-2')}>
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-black">
            <XLogo className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            {post.handle && (
              <a
                href={`https://x.com/${post.handle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-gray-900 hover:underline truncate block"
              >
                @{post.handle}
              </a>
            )}
            {post.trend && (
              <span className="text-xs text-gray-500 truncate block">
                {post.trend}
              </span>
            )}
          </div>
          {post.engagement === 'high' && (
            <span className="text-[11px] font-bold uppercase tracking-wider bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
              Trending
            </span>
          )}
        </div>

        {/* Post text */}
        {post.text && (
          <p
            className={cn(
              'text-sm text-gray-800 leading-relaxed',
              isInline ? 'px-0 py-1' : 'px-4 py-2',
              isCompact && 'line-clamp-3',
            )}
          >
            {post.text}
          </p>
        )}

        {/* Footer with link to original post */}
        <div
          className={cn(
            'flex items-center justify-between border-t border-gray-100',
            isInline ? 'px-0 py-2' : 'px-4 py-3',
          )}
        >
          <span className="text-[11px] text-gray-400">via X</span>
          <a
            href={normalizedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-500 hover:text-blue-700 transition-colors"
            onClick={() => {
              const tweetId = post.postUrl.match(/status\/(\d+)/)?.[1]
              if (tweetId) trackEmbedEvent('x', 'click_view_post', tweetId)
            }}
          >
            View on X
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Multi-post grid component
// ---------------------------------------------------------------------------

export interface XPostGridProps {
  posts: XPostData[]
  /** Max posts to display */
  maxPosts?: number
  /** Section title */
  title?: string
  titleAr?: string
  language?: 'en' | 'ar'
  className?: string
}

/**
 * Grid display of multiple X posts — used for "What's trending on X" sections.
 */
export function XPostGrid({
  posts,
  maxPosts = 3,
  title = 'Trending on X',
  titleAr = 'الأكثر رواجاً على X',
  language = 'en',
  className,
}: XPostGridProps) {
  const displayPosts = posts.slice(0, maxPosts)
  const isRTL = language === 'ar'

  if (displayPosts.length === 0) return null

  return (
    <section
      className={cn('py-8', className)}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-black">
          <XLogo className="w-5 h-5 text-white" />
        </span>
        <h3
          className={cn(
            'text-xl font-bold text-gray-900',
            isRTL ? 'font-arabic' : 'font-display',
          )}
        >
          {isRTL ? titleAr : title}
        </h3>
        <span className="hidden sm:block flex-1 h-px bg-gradient-to-r from-gray-200 to-transparent" />
      </div>

      {/* Posts grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayPosts.map((post, index) => (
          <XPostEmbed
            key={post.postUrl || index}
            post={post}
            variant="card"
          />
        ))}
      </div>
    </section>
  )
}

export default XPostEmbed
