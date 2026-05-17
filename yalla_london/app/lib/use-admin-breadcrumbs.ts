'use client'

import { usePathname } from 'next/navigation'

export interface Breadcrumb {
  label: string
  href?: string
}

/**
 * Navigation structure mirroring mophy-admin-layout.tsx mainNavigation.
 * Each entry maps href → { groupLabel, childLabel } so we can build
 * breadcrumbs like: Admin > groupLabel > childLabel
 */
interface NavEntry {
  groupLabel: string
  childLabel: string
}

const NAV_MAP: Record<string, NavEntry> = {
  // Dashboard
  '/admin': { groupLabel: 'Dashboard', childLabel: 'Command Center' },
  '/admin/command-center/analytics': { groupLabel: 'Dashboard', childLabel: 'Analytics' },
  '/admin/seo-audits': { groupLabel: 'Dashboard', childLabel: 'SEO Audits' },
  '/admin/seo-command': { groupLabel: 'Dashboard', childLabel: 'SEO Command' },

  // Content
  '/admin/articles': { groupLabel: 'Content', childLabel: 'All Articles' },
  '/admin/articles/new': { groupLabel: 'Content', childLabel: 'New Article' },
  '/admin/topics': { groupLabel: 'Content', childLabel: 'Topics Pipeline' },
  '/admin/pipeline': { groupLabel: 'Content', childLabel: 'Content Pipeline' },
  '/admin/content-types': { groupLabel: 'Content', childLabel: 'Categories' },
  '/admin/wordpress': { groupLabel: 'Content', childLabel: 'WordPress' },

  // Media
  '/admin/media': { groupLabel: 'Media', childLabel: 'Media Library' },
  '/admin/photo-pool': { groupLabel: 'Media', childLabel: 'Photo Pool' },
  '/admin/media/upload': { groupLabel: 'Media', childLabel: 'Upload' },

  // SEO & Marketing
  '/admin/seo': { groupLabel: 'SEO & Marketing', childLabel: 'SEO Dashboard' },
  '/admin/seo/report': { groupLabel: 'SEO & Marketing', childLabel: 'Keywords & GSC' },
  '/admin/affiliate-marketing': { groupLabel: 'SEO & Marketing', childLabel: 'Affiliates' },
  '/admin/affiliate-pool': { groupLabel: 'SEO & Marketing', childLabel: 'Affiliate Pool' },

  // AI & Automation
  '/admin/automation-hub': { groupLabel: 'AI & Automation', childLabel: 'Automation Hub' },
  '/admin/ai-studio': { groupLabel: 'AI & Automation', childLabel: 'AI Studio' },
  '/admin/ai-prompt-studio': { groupLabel: 'AI & Automation', childLabel: 'Prompt Studio' },
  '/admin/workflow': { groupLabel: 'AI & Automation', childLabel: 'Workflow' },

  // Design & Media
  '/admin/design-studio': { groupLabel: 'Design & Media', childLabel: 'Design Studio' },
  '/admin/video-studio': { groupLabel: 'Design & Media', childLabel: 'Video Studio' },
  '/admin/pdf-generator': { groupLabel: 'Design & Media', childLabel: 'PDF Generator' },
  '/admin/design/homepage': { groupLabel: 'Design & Media', childLabel: 'Homepage Builder' },
  '/admin/brand-assets': { groupLabel: 'Design & Media', childLabel: 'Brand Assets' },

  // Monetization
  '/admin/shop': { groupLabel: 'Monetization', childLabel: 'Shop & Products' },
  '/admin/transactions': { groupLabel: 'Monetization', childLabel: 'Transactions' },
  '/admin/billing': { groupLabel: 'Monetization', childLabel: 'Billing' },

  // Multi-Site
  '/admin/command-center': { groupLabel: 'Multi-Site', childLabel: 'Command Center' },
  '/admin/command-center/sites': { groupLabel: 'Multi-Site', childLabel: 'All Sites' },
  '/admin/command-center/sites/new': { groupLabel: 'Multi-Site', childLabel: 'Add New Site' },
  '/admin/command-center/autopilot': { groupLabel: 'Multi-Site', childLabel: 'Autopilot' },
  '/admin/command-center/social': { groupLabel: 'Multi-Site', childLabel: 'Social Media' },

  // People
  '/admin/team': { groupLabel: 'People', childLabel: 'Team' },
  '/admin/crm': { groupLabel: 'People', childLabel: 'CRM' },
  '/admin/people/members': { groupLabel: 'People', childLabel: 'Members' },

  // Settings
  '/admin/settings/theme': { groupLabel: 'Settings', childLabel: 'Theme' },
  '/admin/command-center/settings/api-keys': { groupLabel: 'Settings', childLabel: 'API Keys' },
  '/admin/feature-flags': { groupLabel: 'Settings', childLabel: 'Feature Flags' },
  '/admin/site-control': { groupLabel: 'Settings', childLabel: 'Site Control' },
  '/admin/api-security': { groupLabel: 'Settings', childLabel: 'API Security' },
}

/**
 * Capitalize a single word.
 */
function capitalize(word: string): string {
  if (!word) return word
  return word.charAt(0).toUpperCase() + word.slice(1)
}

/**
 * Convert a URL segment like "automation-hub" into a human label like "Automation Hub".
 */
function segmentToLabel(segment: string): string {
  return segment
    .split('-')
    .map(capitalize)
    .join(' ')
}

/**
 * Build breadcrumbs from URL segments for paths not present in the nav map.
 * For example, `/admin/foo/bar-baz` becomes:
 *   Admin > Foo > Bar Baz
 */
function buildFallbackBreadcrumbs(pathname: string): Breadcrumb[] {
  const segments = pathname.replace(/^\/admin\/?/, '').split('/').filter(Boolean)

  if (segments.length === 0) {
    return [{ label: 'Admin' }]
  }

  const crumbs: Breadcrumb[] = [{ label: 'Admin', href: '/admin' }]

  segments.forEach((segment, index) => {
    const isLast = index === segments.length - 1
    const href = '/admin/' + segments.slice(0, index + 1).join('/')

    crumbs.push({
      label: segmentToLabel(segment),
      ...(isLast ? {} : { href }),
    })
  })

  return crumbs
}

/**
 * React hook that generates breadcrumbs based on the current URL path
 * and the admin navigation structure defined in mophy-admin-layout.tsx.
 *
 * Always starts with `{ label: 'Admin', href: '/admin' }`.
 * The last breadcrumb never has an `href` (it represents the current page).
 * For paths not found in the navigation map, labels are derived from URL
 * segments by replacing hyphens with spaces and capitalizing each word.
 */
export function useAdminBreadcrumbs(): Breadcrumb[] {
  const pathname = usePathname()

  if (!pathname || !pathname.startsWith('/admin')) {
    return [{ label: 'Admin' }]
  }

  // Exact match against the navigation map (try longest match first for
  // paths like /admin/command-center/settings/api-keys vs /admin/command-center).
  const entry = findNavEntry(pathname)

  if (entry) {
    // The root admin page is special: Dashboard > Command Center with no parent link
    if (pathname === '/admin') {
      return [
        { label: 'Admin', href: '/admin' },
        { label: entry.groupLabel, href: '/admin' },
        { label: entry.childLabel },
      ]
    }

    return [
      { label: 'Admin', href: '/admin' },
      { label: entry.groupLabel },
      { label: entry.childLabel },
    ]
  }

  // Fallback: generate breadcrumbs from URL segments
  return buildFallbackBreadcrumbs(pathname)
}

/**
 * Look up a pathname in the nav map.  We try an exact match first, then
 * progressively strip trailing segments so that e.g.
 * `/admin/articles/some-slug/edit` still resolves to the Content group.
 * Only the exact match is used to produce the child label; a prefix match
 * returns `undefined` so the fallback generator kicks in.
 */
function findNavEntry(pathname: string): NavEntry | undefined {
  // Normalise: remove trailing slash
  const normalised = pathname.endsWith('/') && pathname.length > 1
    ? pathname.slice(0, -1)
    : pathname

  return NAV_MAP[normalised] ?? undefined
}
