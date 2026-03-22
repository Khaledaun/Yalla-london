'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAdminSession } from '@/hooks/use-admin-session'
import { SiteSelector } from '@/components/admin/site-selector'
import {
  FileText, Search, Brain, Bot, Settings, ChevronDown, Menu, X,
  User, LogOut, Palette, Key, Globe, BarChart3, Wallet,
  Command, Plus, Zap, Store, Activity, Clock, Wrench, Ship,
  Anchor, AlertTriangle, Eye, Image as ImageIcon, Mail, TrendingUp,
} from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════════
// ZENITHA HQ — Navigation Structure
// 6 sections consolidating all 68 admin pages. Zero deletions.
// ═══════════════════════════════════════════════════════════════════════════════

const navigation = [
  {
    id: 'command',
    label: 'COMMAND',
    icon: Zap,
    items: [
      { label: 'Mission Control',   href: '/admin/cockpit' },
      { label: 'Blockers',          href: '/admin/blockers', badge: true },
      { label: 'System Health',     href: '/admin/cockpit/health' },
    ],
  },
  {
    id: 'content',
    label: 'CONTENT',
    icon: FileText,
    items: [
      { label: 'Article Library',   href: '/admin/articles' },
      { label: 'Content Pipeline',  href: '/admin/topics-pipeline' },
      { label: 'Topic Research',    href: '/admin/topics' },
      { label: 'Write Article',     href: '/admin/cockpit/write' },
    ],
  },
  {
    id: 'intelligence',
    label: 'INTELLIGENCE',
    icon: Search,
    items: [
      { label: 'SEO Command',       href: '/admin/intelligence' },
      { label: 'Search Console',    href: '/admin/seo-audits' },
      { label: 'Analytics',         href: '/admin/analytics' },
    ],
  },
  {
    id: 'revenue',
    label: 'REVENUE',
    icon: Wallet,
    items: [
      { label: 'Affiliate Hub',     href: '/admin/affiliate-hq' },
      { label: 'Commerce',          href: '/admin/cockpit/commerce' },
    ],
  },
  {
    id: 'design',
    label: 'DESIGN',
    icon: Palette,
    items: [
      { label: 'Brand Assets',      href: '/admin/design' },
      { label: 'Media Library',     href: '/admin/media' },
      { label: 'Email & Social',    href: '/admin/email-campaigns' },
    ],
  },
  {
    id: 'system',
    label: 'SYSTEM',
    icon: Wrench,
    items: [
      { label: 'Automation',        href: '/admin/automation' },
      { label: 'AI Tools',          href: '/admin/ai-studio' },
      { label: 'Settings',          href: '/admin/settings' },
      { label: 'Yacht Management',  href: '/admin/yachts' },
    ],
  },
]

const mobileBottomNav = [
  { label: 'HQ',      icon: Zap,      href: '/admin/cockpit' },
  { label: 'Content', icon: FileText,  href: '/admin/articles' },
  { label: 'New',     icon: Plus,      href: '/admin/cockpit/write', primary: true },
  { label: 'Crons',   icon: Clock,     href: '/admin/automation' },
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
              <div className="font-zh-mono text-[8px] text-zh-cream-muted uppercase tracking-[2px]">
                zenitha.luxury
              </div>
            </div>
          )}
        </Link>
        {sidebarOpen && !onClose && (
          <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-lg text-zh-cream-muted hover:text-zh-cream transition-colors">
            <X size={15} />
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
                    <span className={`flex-1 text-left font-zh-mono text-[10px] uppercase tracking-[1.5px] ${active ? 'text-zh-gold font-semibold' : 'text-zh-cream-muted font-medium'}`}>
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
                          flex items-center justify-between px-3 py-1.5 rounded-md transition-colors font-zh-mono text-[10px] uppercase tracking-[0.8px]
                          ${itemActive ? 'text-zh-cream font-semibold bg-zh-navy-light' : 'text-zh-cream-muted hover:text-zh-cream hover:bg-zh-navy-mid'}
                        `}
                      >
                        <span>{item.label}</span>
                        {isBadge && blockerCount > 0 && (
                          <span className="flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-zh-error text-zh-error-text text-[9px] font-bold px-1">
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
              <div className="font-zh-mono text-[8px] text-zh-cream-muted uppercase tracking-[1px]">
                CEO
              </div>
            </div>
            <button onClick={handleSignOut} className="p-2 rounded-lg text-zh-cream-muted hover:text-zh-error-text transition-colors" title="Sign out">
              <LogOut size={14} />
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
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-md font-zh-mono text-[9px] font-semibold uppercase tracking-[1.5px] bg-zh-gold text-zh-navy hover:bg-zh-gold/90 transition-colors">
              <Plus size={11} />
              New Article
            </Link>

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
                      <div className="font-zh-mono text-[9px] text-zh-cream-muted tracking-wider mt-0.5 truncate">
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
                              className="flex items-center gap-2 px-3 py-1.5 rounded-md font-zh-mono text-[9px] uppercase tracking-[1px] text-zh-cream-muted hover:text-zh-cream hover:bg-zh-navy-light transition-colors">
                          <Icon size={12} />
                          {label}
                        </Link>
                      ))}
                    </div>
                    <div className="p-1.5 border-t border-zh-navy-border">
                      <button onClick={handleSignOut}
                              className="flex items-center gap-2 w-full px-3 py-1.5 rounded-md font-zh-mono text-[9px] uppercase tracking-[1px] text-zh-error-text hover:bg-zh-error/20 transition-colors">
                        <LogOut size={12} />
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
                        className="flex flex-col items-center gap-0.5 min-w-[44px] py-1 text-zh-cream-muted">
                  <Icon size={18} />
                  <span className="font-zh-mono text-[8px] uppercase tracking-wider">More</span>
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
                    className={`flex flex-col items-center gap-0.5 min-w-[44px] py-1 transition-colors ${active ? 'text-zh-gold' : 'text-zh-cream-muted'}`}>
                <Icon size={18} />
                <span className="font-zh-mono text-[8px] uppercase tracking-wider">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
