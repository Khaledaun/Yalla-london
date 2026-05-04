'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAdminSession } from '@/hooks/use-admin-session'
import { SiteSelector } from '@/components/admin/site-selector'
import { NotificationBell } from '@/components/admin/notification-bell'
import {
  FileText, Search, Brain, Bot, Settings, ChevronDown, Menu, X,
  User, LogOut, Palette, Key, Globe, BarChart3, Wallet,
  Command, Plus, Zap, Store, Activity, Clock, Wrench, Ship,
  Anchor, AlertTriangle, Eye, Image as ImageIcon, Mail, TrendingUp,
  LayoutDashboard, Building2, PieChart, Users, ShoppingCart,
  Newspaper, Share2, FolderOpen, BookOpen, Paintbrush, Github,
  Monitor, Timer, FlaskConical, Terminal, MessageCircle,
  Megaphone, Blocks, Database, Shield, TestTube2,
} from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════════
// ZENITHA HQ — Navigation Structure
// 15 top-level sections surfacing all 120+ admin pages. Zero deletions.
// See: docs/plans/INTERNAL-OPS-DASHBOARD-PLAN.md
// ═══════════════════════════════════════════════════════════════════════════════

const navigation = [
  // ─── 1. EXECUTIVE OVERVIEW ─────────────────────────────────────
  {
    id: 'executive',
    label: 'EXECUTIVE',
    icon: LayoutDashboard,
    items: [
      { label: 'Mission Control',   href: '/admin/cockpit' },
      { label: 'Blockers',          href: '/admin/blockers', badge: true },
      { label: 'System Health',     href: '/admin/cockpit/health' },
      { label: 'Cycle Health',      href: '/admin/ops/cycle-health' },
      { label: 'Activity Feed',     href: '/admin/activity' },
    ],
  },
  // ─── 2. SITES & BRANDS ────────────────────────────────────────
  {
    id: 'sites',
    label: 'SITES',
    icon: Building2,
    items: [
      { label: 'All Sites',         href: '/admin/command-center/sites' },
      { label: 'New Site Wizard',    href: '/admin/cockpit/new-site' },
      { label: 'Site Settings',      href: '/admin/site-control' },
      { label: 'Yacht Platform',     href: '/admin/yachts' },
    ],
  },
  // ─── 3. ANALYTICS & ATTRIBUTION ───────────────────────────────
  {
    id: 'analytics',
    label: 'ANALYTICS',
    icon: PieChart,
    items: [
      { label: 'Overview',          href: '/admin/seo' },
      { label: 'Search Console',    href: '/admin/seo-audits' },
      { label: 'AI Costs',          href: '/admin/ai-costs' },
      { label: 'Performance',       href: '/admin/articles/performance' },
    ],
  },
  // ─── 4. LEADS & CRM ──────────────────────────────────────────
  {
    id: 'crm',
    label: 'CRM',
    icon: Users,
    items: [
      { label: 'CRM Dashboard',     href: '/admin/crm' },
      { label: 'Agent HQ',          href: '/admin/agent' },
      { label: 'Conversations',     href: '/admin/agent/conversations' },
      { label: 'Yacht Inquiries',   href: '/admin/yachts/inquiries' },
      { label: 'Team',              href: '/admin/team' },
    ],
  },
  // ─── 5. COMMERCE & BOOKINGS ───────────────────────────────────
  {
    id: 'commerce',
    label: 'COMMERCE',
    icon: ShoppingCart,
    items: [
      { label: 'Affiliate Hub',     href: '/admin/affiliate-hq' },
      { label: 'Commerce',          href: '/admin/cockpit/commerce' },
      { label: 'Finance',           href: '/admin/cockpit/finance' },
      { label: 'Billing',           href: '/admin/billing' },
      { label: 'Transactions',      href: '/admin/transactions' },
    ],
  },
  // ─── 6. CONTENT & SEO ────────────────────────────────────────
  {
    id: 'content',
    label: 'CONTENT',
    icon: Newspaper,
    items: [
      { label: 'Articles',          href: '/admin/articles' },
      { label: 'Write Article',     href: '/admin/cockpit/write' },
      { label: 'Pipeline Phases',   href: '/admin/topics-pipeline' },
      { label: 'Topic Research',    href: '/admin/topics' },
      { label: 'News',              href: '/admin/news' },
      { label: 'SEO Command',       href: '/admin/intelligence' },
      { label: 'Indexing',          href: '/admin/indexing' },
      { label: 'Per-Page Audit',    href: '/admin/cockpit/per-page-audit' },
    ],
  },
  // ─── 7. SOCIAL MEDIA BRIDGE ──────────────────────────────────
  {
    id: 'social',
    label: 'SOCIAL',
    icon: Share2,
    items: [
      { label: 'Social Hub',        href: '/admin/social-hub' },
      { label: 'Calendar',          href: '/admin/social-calendar' },
      { label: 'Messaging',         href: '/admin/ops/messaging' },
      { label: 'Email Campaigns',   href: '/admin/email-campaigns' },
    ],
  },
  // ─── 8. ASSET & MEDIA LIBRARY ────────────────────────────────
  {
    id: 'assets',
    label: 'ASSETS',
    icon: ImageIcon,
    items: [
      { label: 'Media Library',     href: '/admin/media' },
      { label: 'Photo Pool',        href: '/admin/photo-pool' },
      { label: 'Video Library',     href: '/admin/cockpit/video-library' },
      { label: 'Asset Library',     href: '/admin/asset-library' },
      { label: 'PDF Generator',     href: '/admin/pdf-generator' },
    ],
  },
  // ─── 9. DOCS & KNOWLEDGE ─────────────────────────────────────
  {
    id: 'docs',
    label: 'DOCS',
    icon: BookOpen,
    items: [
      { label: 'Knowledge Hub',     href: '/admin/ops/docs' },
      { label: 'Legal Pages',       href: '/admin/legal' },
      { label: 'Prompts',           href: '/admin/prompts' },
      { label: 'Content Types',     href: '/admin/content-types' },
    ],
  },
  // ─── 10. DESIGN SYSTEM CENTER ────────────────────────────────
  {
    id: 'design',
    label: 'DESIGN',
    icon: Paintbrush,
    items: [
      { label: 'Design Center',     href: '/admin/ops/design-center' },
      { label: 'Design Studio',     href: '/admin/design-studio' },
      { label: 'Brand Assets',      href: '/admin/design' },
      { label: 'Homepage Builder',   href: '/admin/design/homepage' },
    ],
  },
  // ─── 11. GITHUB & DEVOPS ─────────────────────────────────────
  {
    id: 'devops',
    label: 'DEVOPS',
    icon: Github,
    items: [
      { label: 'Dev Tasks',         href: '/admin/ops/devops' },
      { label: 'Integrations',      href: '/admin/integrations' },
      { label: 'API Monitor',       href: '/admin/api-monitor' },
      { label: 'API Security',      href: '/admin/api-security' },
    ],
  },
  // ─── 12. MONITORING & OBSERVABILITY ──────────────────────────
  {
    id: 'monitoring',
    label: 'MONITORING',
    icon: Monitor,
    items: [
      { label: 'Health Monitor',    href: '/admin/health-monitoring' },
      { label: 'Discovery',         href: '/admin/discovery' },
      { label: 'Master Audit',      href: '/admin/master-audit' },
      { label: 'Site Health',       href: '/admin/site-health' },
    ],
  },
  // ─── 13. CRON & SCHEDULER ────────────────────────────────────
  {
    id: 'crons',
    label: 'CRONS',
    icon: Timer,
    items: [
      { label: 'Departures Board',  href: '/admin/departures' },
      { label: 'Cron Monitor',      href: '/admin/cron-monitor' },
      { label: 'Cron Logs',         href: '/admin/cron-logs' },
      { label: 'Feature Flags',     href: '/admin/feature-flags' },
      { label: 'Automation',        href: '/admin/automation' },
    ],
  },
  // ─── 14. TESTING, QA & LOGS ──────────────────────────────────
  {
    id: 'testing',
    label: 'QA & LOGS',
    icon: TestTube2,
    items: [
      { label: 'Test Center',       href: '/admin/ops/test-center' },
      { label: 'Audit Logs',        href: '/admin/audit-logs' },
      { label: 'Sync Test',         href: '/admin/sync-test' },
      { label: 'Validator',         href: '/admin/cockpit/validator' },
    ],
  },
  // ─── 15. COMMAND CENTER ──────────────────────────────────────
  {
    id: 'commandcenter',
    label: 'COMMAND',
    icon: Terminal,
    items: [
      { label: 'Operations',        href: '/admin/operations' },
      { label: 'AI Studio',         href: '/admin/ai-studio' },
      { label: 'AI Assistant',      href: '/admin/ai-assistant' },
      { label: 'Env Vault',         href: '/admin/variable-vault' },
      { label: 'Settings',          href: '/admin/settings' },
    ],
  },
]

const mobileBottomNav = [
  { label: 'HQ',      icon: LayoutDashboard, href: '/admin/cockpit' },
  { label: 'Content', icon: Newspaper, href: '/admin/articles' },
  { label: 'New',     icon: Plus,      href: '/admin/cockpit/write', primary: true },
  { label: 'Crons',   icon: Timer,     href: '/admin/departures' },
  { label: 'More',    icon: Menu,      href: '__menu__' },
]

interface Props { children: React.ReactNode; pageTitle?: string }

export function MophyAdminLayout({ children, pageTitle }: Props) {
  const pathname = usePathname()
  const { data: session, status, signOut } = useAdminSession()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [expandedMenus, setExpandedMenus] = useState<string[]>([])
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [blockerCount, setBlockerCount] = useState(0)

  const isLoginPage = pathname === '/admin/login'

  useEffect(() => {
    if (status === 'unauthenticated' && !isLoginPage) {
      router.replace('/admin/login')
    }
  }, [status, isLoginPage, router])

  // Auto-expand active menu
  useEffect(() => {
    navigation.forEach(section => {
      if (section.items.some(item => pathname === item.href || pathname?.startsWith(item.href + '/'))) {
        setExpandedMenus(prev => prev.includes(section.id) ? prev : [...prev, section.id])
      }
    })
  }, [pathname])

  useEffect(() => {
    setMobileMenuOpen(false)
    setUserMenuOpen(false)
  }, [pathname])

  // Blocker count poll (every 60s)
  useEffect(() => {
    const fetchBlockers = async () => {
      try {
        const res = await fetch('/api/admin/system/blocker-count')
        if (res.ok) {
          const data = await res.json()
          setBlockerCount(data.total || 0)
        }
      } catch { /* silent — badge just stays at 0 */ }
    }
    fetchBlockers()
    const interval = setInterval(fetchBlockers, 60_000)
    return () => clearInterval(interval)
  }, [])

  const toggleMenu = (id: string) => {
    setExpandedMenus(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin'
    return pathname === href || pathname?.startsWith(href + '/')
  }
  const isSectionActive = (section: typeof navigation[0]) =>
    section.items.some(item => isActive(item.href))

  const closeMobile = useCallback(() => setMobileMenuOpen(false), [])
  const handleSignOut = async () => { await signOut() }

  if (isLoginPage) return <>{children}</>

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zh-navy">
        <div className="text-center">
          <div className="w-14 h-14 rounded-xl mx-auto mb-4 flex items-center justify-center bg-zh-navy-mid border border-zh-navy-border">
            <span className="font-zh-ui font-bold text-xl text-zh-gold">Z</span>
          </div>
          <p className="font-zh-mono text-[11px] text-zh-cream-muted uppercase tracking-[3px]">Loading HQ…</p>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') return null

  // ═══════════════════════════════════════════════════════════════════════════════
  // SIDEBAR CONTENT (shared between mobile + desktop)
  // ═══════════════════════════════════════════════════════════════════════════════
  const SidebarContent = ({ onClose }: { onClose?: () => void }) => (
    <div className="flex flex-col h-full bg-zh-navy">
      {/* Gold accent line */}
      <div className="h-[2px] bg-zh-gold flex-shrink-0" />

      {/* Logo */}
      <div className="px-5 pt-4 pb-3 flex-shrink-0 flex items-center justify-between">
        <Link href="/admin/cockpit" onClick={onClose} className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-zh-navy-mid border border-zh-navy-border">
            <span className="font-zh-ui font-bold text-base text-zh-gold">Z</span>
          </div>
          {sidebarOpen && (
            <div>
              <div className="font-zh-ui font-bold text-sm text-zh-cream tracking-tight">
                Zenitha HQ
              </div>
              <div className="font-zh-mono text-[10px] text-zh-cream-muted uppercase tracking-[2px]">
                zenitha.luxury
              </div>
            </div>
          )}
        </Link>
        {sidebarOpen && !onClose && (
          <button onClick={() => setSidebarOpen(false)} className="p-2 rounded-lg text-zh-cream-muted hover:text-zh-cream transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center">
            <X size={16} />
          </button>
        )}
        {onClose && (
          <button onClick={onClose} className="p-1.5 rounded-lg text-zh-cream-muted hover:text-zh-cream transition-colors">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Site Selector */}
      {sidebarOpen && (
        <div className="px-4 pb-3 flex-shrink-0">
          <SiteSelector />
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 pb-3 scrollbar-thin" style={{ overscrollBehavior: 'contain' }}>
        {navigation.map((section) => {
          const Icon = section.icon
          const expanded = expandedMenus.includes(section.id)
          const active = isSectionActive(section)

          return (
            <div key={section.id} className="mb-0.5">
              <button
                onClick={() => toggleMenu(section.id)}
                className={`
                  w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors
                  ${active ? 'bg-zh-navy-light' : 'hover:bg-zh-navy-mid'}
                `}
              >
                {/* Active indicator */}
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r bg-zh-gold" />
                )}

                <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${active ? 'bg-zh-gold-dim text-zh-gold' : 'bg-zh-navy-mid text-zh-cream-muted'}`}>
                  <Icon size={14} />
                </div>

                {sidebarOpen && (
                  <>
                    <span className={`flex-1 text-left font-zh-mono text-[11px] uppercase tracking-[1.5px] ${active ? 'text-zh-gold font-semibold' : 'text-zh-cream-muted font-medium'}`}>
                      {section.label}
                    </span>
                    <ChevronDown size={12} className={`text-zh-cream-dim transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
                  </>
                )}
              </button>

              {/* Subitems */}
              {expanded && sidebarOpen && (
                <div className="ml-10 mt-0.5 space-y-px">
                  {section.items.map((item) => {
                    const itemActive = isActive(item.href)
                    const isBadge = 'badge' in item && item.badge
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        className={`
                          flex items-center justify-between px-3 py-2 rounded-md transition-colors font-zh-mono text-[11px] uppercase tracking-[0.8px] min-h-[32px]
                          ${itemActive ? 'text-zh-cream font-semibold bg-zh-navy-light' : 'text-zh-cream-muted hover:text-zh-cream hover:bg-zh-navy-mid'}
                        `}
                      >
                        <span>{item.label}</span>
                        {isBadge && blockerCount > 0 && (
                          <span className="flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-zh-error text-zh-error-text text-[10px] font-bold px-1">
                            {blockerCount}
                          </span>
                        )}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* User footer */}
      <div className="flex-shrink-0 px-4 pb-4 pt-3 border-t border-zh-navy-border">
        {sidebarOpen ? (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center bg-zh-gold-dim flex-shrink-0">
              <span className="font-zh-ui font-bold text-sm text-zh-gold">
                {session?.user?.name?.charAt(0)?.toUpperCase() || 'K'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-zh-ui font-semibold text-xs text-zh-cream truncate">
                {session?.user?.name || 'Admin'}
              </div>
              <div className="font-zh-mono text-[10px] text-zh-cream-muted uppercase tracking-[1px]">
                CEO
              </div>
            </div>
            <button onClick={handleSignOut} className="p-2 rounded-lg text-zh-cream-muted hover:text-zh-error-text transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center" title="Sign out">
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <button onClick={handleSignOut}
                  className="w-full flex items-center justify-center p-2 rounded-lg text-zh-cream-muted hover:text-zh-error-text transition-colors">
            <LogOut size={16} />
          </button>
        )}
      </div>
    </div>
  )

  return (
    <div className="h-screen flex flex-col bg-zh-navy">

      {/* ── Mobile Sidebar Overlay ────────────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeMobile} />
          <aside className="absolute inset-y-0 left-0 w-72 flex flex-col overflow-hidden shadow-xl">
            <SidebarContent onClose={closeMobile} />
          </aside>
        </div>
      )}

      {/* ── Desktop Sidebar ────────────────────────────────────────── */}
      <aside className={`fixed top-0 left-0 z-40 h-full flex-col hidden lg:flex transition-all duration-300 overflow-hidden border-r border-zh-navy-border ${sidebarOpen ? 'w-[260px]' : 'w-[64px]'}`}>
        {!sidebarOpen && (
          <div className="flex flex-col items-center pt-4 gap-3 bg-zh-navy h-full">
            <div className="w-full h-[2px] bg-zh-gold" />
            <button onClick={() => setSidebarOpen(true)}
                    className="w-10 h-10 rounded-lg flex items-center justify-center mt-1 bg-zh-navy-mid border border-zh-navy-border hover:border-zh-gold-dim transition-colors">
              <span className="font-zh-ui font-bold text-base text-zh-gold">Z</span>
            </button>
            <div className="flex flex-col gap-1 px-2 mt-2">
              {navigation.map((section) => {
                const Icon = section.icon
                const active = isSectionActive(section)
                return (
                  <Link key={section.id} href={section.items[0]?.href || '/admin'} title={section.label}
                        className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${active ? 'bg-zh-gold-dim text-zh-gold' : 'bg-zh-navy-mid text-zh-cream-muted hover:text-zh-cream hover:bg-zh-navy-light'}`}>
                    <Icon size={16} />
                  </Link>
                )
              })}
            </div>
          </div>
        )}
        {sidebarOpen && <SidebarContent />}
      </aside>

      {/* ── Top Header ──────────────────────────────────────────────── */}
      <header className={`fixed top-0 right-0 z-30 h-12 flex items-center transition-all duration-300 bg-zh-navy-mid border-b border-zh-navy-border ${sidebarOpen ? 'lg:left-[260px]' : 'lg:left-[64px]'} left-0`}>
        <div className="flex items-center justify-between w-full px-4 lg:px-5">
          {/* Left */}
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileMenuOpen(true)}
                    className="lg:hidden p-2 rounded-lg bg-zh-navy-light text-zh-cream-muted hover:text-zh-cream transition-colors border border-zh-navy-border">
              <Menu size={16} />
            </button>
            <button onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="hidden lg:flex p-2 rounded-lg bg-zh-navy-light text-zh-cream-muted hover:text-zh-cream transition-colors border border-zh-navy-border">
              <Menu size={14} />
            </button>
            {pageTitle && (
              <h1 className="hidden md:block font-zh-ui font-semibold text-sm text-zh-cream">
                {pageTitle}
              </h1>
            )}
          </div>

          {/* Right */}
          <div className="flex items-center gap-2">
            <Link href="/admin/cockpit/write"
                  className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-md font-zh-mono text-[10px] font-semibold uppercase tracking-[1.5px] bg-zh-gold text-zh-navy hover:bg-zh-gold/90 transition-colors min-h-[36px]">
              <Plus size={11} />
              New Article
            </Link>

            {/* Notifications */}
            <NotificationBell />

            {/* User menu */}
            <div className="relative">
              <button onClick={() => setUserMenuOpen(!userMenuOpen)}
                      className="flex items-center gap-2 p-1.5 rounded-lg bg-zh-navy-light border border-zh-navy-border hover:border-zh-gold-dim transition-colors">
                <div className="w-6 h-6 rounded-full flex items-center justify-center bg-zh-gold-dim">
                  <span className="font-zh-ui font-bold text-[10px] text-zh-gold">
                    {session?.user?.name?.charAt(0)?.toUpperCase() || 'K'}
                  </span>
                </div>
                <ChevronDown size={11} className="text-zh-cream-muted" />
              </button>

              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-48 rounded-lg z-50 overflow-hidden bg-zh-navy-mid border border-zh-navy-border shadow-xl">
                    <div className="p-3 border-b border-zh-navy-border">
                      <div className="font-zh-ui font-semibold text-xs text-zh-cream">
                        {session?.user?.name || 'Admin'}
                      </div>
                      <div className="font-zh-mono text-[10px] text-zh-cream-muted tracking-wider mt-0.5 truncate">
                        {session?.user?.email || ''}
                      </div>
                    </div>
                    <div className="p-1.5 space-y-0.5">
                      {[
                        { label: 'Profile', href: '/admin/team', icon: User },
                        { label: 'Settings', href: '/admin/settings', icon: Settings },
                        { label: 'AI Models', href: '/admin/settings?tab=ai-models', icon: Brain },
                      ].map(({ label, href, icon: Icon }) => (
                        <Link key={href} href={href} onClick={() => setUserMenuOpen(false)}
                              className="flex items-center gap-2 px-3 py-2 rounded-md font-zh-mono text-[10px] uppercase tracking-[1px] text-zh-cream-muted hover:text-zh-cream hover:bg-zh-navy-light transition-colors min-h-[36px]">
                          <Icon size={14} />
                          {label}
                        </Link>
                      ))}
                    </div>
                    <div className="p-1.5 border-t border-zh-navy-border">
                      <button onClick={handleSignOut}
                              className="flex items-center gap-2 w-full px-3 py-2 rounded-md font-zh-mono text-[10px] uppercase tracking-[1px] text-zh-error-text hover:bg-zh-error/20 transition-colors min-h-[36px]">
                        <LogOut size={14} />
                        Sign Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Content ────────────────────────────────────────────── */}
      <main className={`flex-1 overflow-y-auto transition-all duration-300 pt-12 pb-20 lg:pb-0 ${sidebarOpen ? 'lg:ml-[260px]' : 'lg:ml-[64px]'}`}
            style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="p-4 lg:p-6">
          {children}
        </div>
      </main>

      {/* ── Mobile Bottom Nav ────────────────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-zh-navy-mid border-t border-zh-navy-border">
        <div className="flex items-center justify-around h-14 px-2">
          {mobileBottomNav.map((item) => {
            const Icon = item.icon
            const isTrigger = item.href === '__menu__'
            const active = !isTrigger && isActive(item.href)

            if (isTrigger) {
              return (
                <button key="more" onClick={() => setMobileMenuOpen(true)}
                        className="flex flex-col items-center gap-0.5 min-w-[44px] min-h-[44px] py-1 text-zh-cream-muted">
                  <Icon size={18} />
                  <span className="font-zh-mono text-[10px] uppercase tracking-wider">More</span>
                </button>
              )
            }

            if ('primary' in item && item.primary) {
              return (
                <Link key="new" href={item.href}
                      className="flex items-center justify-center w-11 h-11 -mt-4 rounded-full bg-zh-gold text-zh-navy shadow-lg">
                  <Icon size={20} />
                </Link>
              )
            }

            return (
              <Link key={item.label} href={item.href}
                    className={`flex flex-col items-center gap-0.5 min-w-[44px] min-h-[44px] py-1 transition-colors ${active ? 'text-zh-gold' : 'text-zh-cream-muted'}`}>
                <Icon size={18} />
                <span className="font-zh-mono text-[10px] uppercase tracking-wider">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
