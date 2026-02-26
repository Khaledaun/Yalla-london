'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAdminSession } from '@/hooks/use-admin-session'
import { SiteSelector } from '@/components/admin/site-selector'
import {
  LayoutDashboard, FileText, Image as ImageIcon, Search, TrendingUp,
  Brain, Bot, Settings, ChevronDown, Menu, X, Bell, User, LogOut,
  Palette, Key, Users, Globe, MessageSquare, BarChart3, Wallet,
  ShoppingCart, Command, Plus, Zap, Link2, Store, Activity,
  BookOpen, Newspaper, ShieldCheck, Edit3, Home, AlertTriangle,
  Clock, Play, Database, RefreshCw, Layers, Cpu, Hash, Radio,
  Send, Eye, Shield, Wrench, Package, Ship, Anchor, MapPin,
} from 'lucide-react'

// ── Navigation Structure ──────────────────────────────────────────────────────
// Simplified from 14 sections to 8 clear groups.
// Every page reachable. No dead links.

const navigation = [
  {
    id: 'cockpit',
    label: '🚀 Cockpit',
    labelAr: '🚀 كوكبيت',
    icon: Zap,
    href: '/admin/cockpit',
    items: [
      { label: '🚀 Mission Control',  href: '/admin/cockpit' },
      { label: '📋 Content Matrix',   href: '/admin/cockpit?tab=content' },
      { label: '⚙️ Pipeline',         href: '/admin/cockpit?tab=pipeline' },
      { label: '⏱ Cron Control',     href: '/admin/cockpit?tab=crons' },
      { label: '🌍 Sites',            href: '/admin/cockpit?tab=sites' },
      { label: '🤖 AI Config',        href: '/admin/cockpit?tab=ai' },
      { label: '🎨 Design Studio',    href: '/admin/cockpit/design' },
      { label: '📧 Email Center',     href: '/admin/cockpit/email' },
      { label: '🌐 New Website',      href: '/admin/cockpit/new-site' },
    ],
  },
  {
    id: 'overview',
    label: 'Overview',
    labelAr: 'نظرة عامة',
    icon: LayoutDashboard,
    href: '/admin',
    items: [
      { label: 'HQ Dashboard',      href: '/admin' },
      { label: 'Health Monitor',    href: '/admin/health-monitoring' },
      { label: 'Cron Logs',         href: '/admin/cron-logs' },
      { label: 'Analytics',         href: '/admin/command-center/analytics' },
      { label: 'Ops Center',        href: '/admin/ops' },
      { label: 'Audit Logs',        href: '/admin/audit-logs' },
    ],
  },
  {
    id: 'content',
    label: 'Content',
    labelAr: 'المحتوى',
    icon: FileText,
    href: '/admin/articles',
    items: [
      { label: 'All Articles',        href: '/admin/articles' },
      { label: 'New Article',         href: '/admin/articles/new' },
      { label: 'Generation Monitor',  href: '/admin/content?tab=generation' },
      { label: 'Topics Pipeline',     href: '/admin/topics' },
      { label: 'Content Pipeline',    href: '/admin/pipeline' },
      { label: 'Content Engine',     href: '/admin/content-engine' },
      { label: 'Categories',          href: '/admin/content-types' },
      { label: 'Information Hub',     href: '/admin/information' },
      { label: 'London News',         href: '/admin/news' },
      { label: 'Fact Checker',        href: '/admin/facts' },
      { label: 'WordPress Sync',      href: '/admin/wordpress' },
    ],
  },
  {
    id: 'indexing',
    label: 'Indexing & SEO',
    labelAr: 'الفهرسة والسيو',
    icon: TrendingUp,
    href: '/admin/seo',
    items: [
      { label: 'Indexing Center',      href: '/admin/seo' },
      { label: 'SEO Audits',           href: '/admin/seo-audits' },
      { label: 'SEO Report',           href: '/admin/seo/report' },
      { label: 'Content Indexing',     href: '/admin/content?tab=indexing' },
      { label: 'Affiliates',           href: '/admin/affiliate-marketing' },
      { label: 'Affiliate Pool',       href: '/admin/affiliate-pool' },
      { label: 'Affiliate Links',      href: '/admin/affiliate-links' },
    ],
  },
  {
    id: 'automation',
    label: 'Automation',
    labelAr: 'الأتمتة',
    icon: Bot,
    href: '/admin/automation-hub',
    items: [
      { label: 'Automation Hub',  href: '/admin/automation-hub' },
      { label: 'AI Studio',       href: '/admin/ai-studio' },
      { label: 'Prompt Studio',   href: '/admin/ai-prompt-studio' },
      { label: 'Workflow',        href: '/admin/workflow' },
    ],
  },
  {
    id: 'sites',
    label: 'Multi-Site',
    labelAr: 'المواقع',
    icon: Globe,
    href: '/admin/command-center/sites',
    items: [
      { label: 'All Sites',      href: '/admin/command-center/sites' },
      { label: 'Add New Site',   href: '/admin/command-center/sites/new' },
      { label: 'Autopilot',      href: '/admin/command-center/autopilot' },
      { label: 'Social Media',   href: '/admin/command-center/social' },
      { label: 'Social Calendar', href: '/admin/social-calendar' },
    ],
  },
  {
    id: 'design',
    label: 'Design & Media',
    labelAr: 'التصميم',
    icon: Palette,
    href: '/admin/design-studio',
    items: [
      { label: 'Design Hub',       href: '/admin/design' },
      { label: 'Design Studio',    href: '/admin/design-studio' },
      { label: 'Media Library',    href: '/admin/media' },
      { label: 'Photo Pool',       href: '/admin/photo-pool' },
      { label: 'Homepage Builder', href: '/admin/design/homepage' },
      { label: 'Video Studio',     href: '/admin/video-studio' },
      { label: 'PDF Generator',    href: '/admin/pdf-generator' },
      { label: 'Brand Assets',     href: '/admin/brand-assets' },
      { label: 'Email Campaigns', href: '/admin/email-campaigns' },
    ],
  },
  {
    id: 'yachts',
    label: 'Yacht Management',
    labelAr: 'إدارة اليخوت',
    icon: Ship,
    href: '/admin/yachts',
    items: [
      { label: 'Fleet Inventory',     href: '/admin/yachts' },
      { label: 'Add Yacht',           href: '/admin/yachts/new' },
      { label: 'Destinations',        href: '/admin/yachts/destinations' },
      { label: 'Charter Inquiries',   href: '/admin/yachts/inquiries' },
      { label: 'Itineraries',         href: '/admin/yachts/itineraries' },
      { label: 'Broker Partners',     href: '/admin/yachts/brokers' },
      { label: 'Sync & Imports',      href: '/admin/yachts/sync' },
      { label: 'Yacht Analytics',     href: '/admin/yachts/analytics' },
    ],
  },
  {
    id: 'monetization',
    label: 'Monetization',
    labelAr: 'الإيرادات',
    icon: Store,
    href: '/admin/shop',
    items: [
      { label: 'Shop',          href: '/admin/shop' },
      { label: 'Transactions',  href: '/admin/transactions' },
      { label: 'Billing',       href: '/admin/billing' },
      { label: 'Stripe MCP',    href: '/admin/operations/mcp/stripe' },
      { label: 'Mercury Bank',  href: '/admin/operations/mcp/mercury' },
    ],
  },
  {
    id: 'system',
    label: 'System',
    labelAr: 'النظام',
    icon: Wrench,
    href: '/admin/operations',
    items: [
      { label: 'Settings Hub',       href: '/admin/settings' },
      { label: 'To-Do List',       href: '/admin/settings?tab=todo' },
      { label: 'AI Models',        href: '/admin/settings?tab=ai-models' },
      { label: 'Database',         href: '/admin/settings?tab=database' },
      { label: 'Variable Vault',   href: '/admin/settings?tab=variable-vault' },
      { label: 'Operations Hub',   href: '/admin/operations' },
      { label: 'Skills Engine',    href: '/admin/operations/skills' },
      { label: 'Feature Flags',    href: '/admin/settings/feature-flags' },
      { label: 'API Keys',         href: '/admin/command-center/settings/api-keys' },
      { label: 'Site Control',     href: '/admin/site-control' },
      { label: 'AI Costs',         href: '/admin/ai-costs' },
      { label: 'API Security',     href: '/admin/api-security' },
      { label: 'Full Var Vault',   href: '/admin/variable-vault' },
      { label: 'Theme',            href: '/admin/settings/theme' },
      { label: 'Team',             href: '/admin/team' },
      { label: 'CRM',              href: '/admin/crm' },
    ],
  },
]

const mobileBottomNav = [
  { label: 'Home',    icon: Home,       href: '/admin' },
  { label: 'Content', icon: FileText,   href: '/admin/articles' },
  { label: 'New',     icon: Plus,       href: '/admin/articles/new', primary: true },
  { label: 'Index',   icon: TrendingUp, href: '/admin/seo' },
  { label: 'More',    icon: Menu,       href: '__menu__' },
]

interface Props { children: React.ReactNode; pageTitle?: string }

export function MophyAdminLayout({ children, pageTitle }: Props) {
  const pathname = usePathname()
  const { data: session, status, signOut } = useAdminSession()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['overview'])
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)

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
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--neu-bg,#EDE9E1)' }}>
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
               style={{ backgroundColor: 'var(--neu-bg,#EDE9E1)', boxShadow: 'var(--neu-raised)' }}>
            <span style={{ fontFamily: "'Anybody',sans-serif", fontWeight: 800, fontSize: 22, color: '#C8322B' }}>HQ</span>
          </div>
          <p style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: '#78716C', textTransform: 'uppercase', letterSpacing: 2 }}>Loading HQ…</p>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') return null

  // ─────────────────────────────────────────────────────────────────────────────
  // SIDEBAR CONTENT (shared between mobile + desktop)
  // ─────────────────────────────────────────────────────────────────────────────
  const SidebarContent = ({ onClose }: { onClose?: () => void }) => (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--neu-bg,#EDE9E1)' }}>
      {/* Tri-color bar */}
      <div className="neu-tricolor flex-shrink-0">
        <div className="neu-tricolor-red" />
        <div className="neu-tricolor-gold" />
        <div className="neu-tricolor-stamp" />
      </div>

      {/* Logo + ops chip */}
      <div className="px-5 pt-4 pb-3 flex-shrink-0 flex items-center justify-between">
        <Link href="/admin" onClick={onClose} className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
               style={{ backgroundColor: 'var(--neu-bg)', boxShadow: 'var(--neu-raised)' }}>
            <span style={{ fontFamily: "'Anybody',sans-serif", fontWeight: 800, fontSize: 17, color: '#C8322B' }}>HQ</span>
          </div>
          {sidebarOpen && (
            <div>
              <div style={{ fontFamily: "'Anybody',sans-serif", fontWeight: 700, fontSize: 14, color: '#1C1917', letterSpacing: -0.3 }}>
                Zenitha HQ
              </div>
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 8, color: '#78716C', textTransform: 'uppercase', letterSpacing: 2 }}>
                HQ OPS
              </div>
            </div>
          )}
        </Link>
        {sidebarOpen && !onClose && (
          <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-lg transition-all"
                  style={{ color: '#78716C' }}>
            <X size={15} />
          </button>
        )}
        {onClose && (
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: '#78716C' }}>
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
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all relative"
                style={{
                  boxShadow: active ? 'var(--neu-inset)' : undefined,
                  backgroundColor: 'var(--neu-bg)',
                }}
              >
                {/* Active indicator */}
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r"
                       style={{ backgroundColor: '#C8322B', insetInlineStart: 0 }} />
                )}

                {/* Icon container */}
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all"
                     style={{
                       backgroundColor: 'var(--neu-bg)',
                       boxShadow: active ? 'var(--neu-inset)' : 'var(--neu-flat)',
                       color: active ? '#C8322B' : '#78716C',
                     }}>
                  <Icon size={15} />
                </div>

                {sidebarOpen && (
                  <>
                    <div className="flex-1 text-left">
                      <div style={{
                        fontFamily: "'IBM Plex Mono',monospace",
                        fontSize: 10, fontWeight: active ? 600 : 500,
                        textTransform: 'uppercase', letterSpacing: 1,
                        color: active ? '#1C1917' : '#78716C',
                      }}>
                        {section.label}
                      </div>
                      <div style={{
                        fontFamily: "'IBM Plex Sans Arabic',sans-serif",
                        fontSize: 9, color: '#78716C', letterSpacing: 0,
                      }}>
                        {section.labelAr}
                      </div>
                    </div>
                    <ChevronDown size={13} style={{
                      color: '#78716C',
                      transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 200ms',
                    }} />
                  </>
                )}
              </button>

              {/* Subitems */}
              {expanded && sidebarOpen && (
                <div className="ml-11 mt-0.5 space-y-px">
                  {section.items.map((item) => {
                    const itemActive = isActive(item.href)
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        className="block px-3 py-2 rounded-lg transition-all"
                        style={{
                          fontFamily: "'IBM Plex Mono',monospace",
                          fontSize: 10, fontWeight: itemActive ? 600 : 400,
                          textTransform: 'uppercase', letterSpacing: 0.8,
                          color: itemActive ? '#C8322B' : '#78716C',
                          backgroundColor: itemActive ? 'rgba(200,50,43,0.05)' : 'transparent',
                          boxShadow: itemActive ? 'var(--neu-inset)' : undefined,
                        }}
                      >
                        {item.label}
                      </Link>
                    )
                  })}
                </div>
              )}

              {/* Collapsed icon-only tooltip target */}
              {!sidebarOpen && (
                <div />
              )}
            </div>
          )
        })}
      </nav>

      {/* User footer */}
      <div className="flex-shrink-0 px-4 pb-4 pt-3" style={{ borderTop: '1px solid rgba(120,113,108,0.12)' }}>
        {sidebarOpen ? (
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                 style={{ backgroundColor: 'var(--neu-bg)', boxShadow: 'var(--neu-raised)' }}>
              <span style={{ fontFamily: "'Anybody',sans-serif", fontWeight: 700, fontSize: 14, color: '#C8322B' }}>
                {session?.user?.name?.charAt(0)?.toUpperCase() || 'A'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div style={{ fontFamily: "'Anybody',sans-serif", fontWeight: 700, fontSize: 12, color: '#1C1917' }} className="truncate">
                {session?.user?.name || 'Admin'}
              </div>
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 8, color: '#78716C', textTransform: 'uppercase', letterSpacing: 1 }}>
                Administrator
              </div>
            </div>
            <button onClick={handleSignOut} className="p-2 rounded-lg transition-all"
                    style={{ color: '#C8322B' }} title="Sign out">
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <button onClick={handleSignOut}
                  className="w-full flex items-center justify-center p-2 rounded-lg"
                  style={{ color: '#C8322B' }}>
            <LogOut size={16} />
          </button>
        )}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen admin-neu-body" style={{ backgroundColor: 'var(--neu-bg,#EDE9E1)' }}>

      {/* ── Mobile Sidebar Overlay ────────────────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeMobile} />
          <aside className="absolute inset-y-0 left-0 w-72 flex flex-col overflow-hidden"
                 style={{ backgroundColor: 'var(--neu-bg,#EDE9E1)', boxShadow: '4px 0 30px rgba(28,25,23,0.15)' }}>
            <SidebarContent onClose={closeMobile} />
          </aside>
        </div>
      )}

      {/* ── Desktop Sidebar ──────────────────────────────────────────────── */}
      <aside className={`fixed top-0 left-0 z-40 h-full flex-col hidden lg:flex transition-all duration-300 overflow-hidden ${sidebarOpen ? 'w-[270px]' : 'w-[68px]'}`}
             style={{ backgroundColor: 'var(--neu-bg,#EDE9E1)', boxShadow: '4px 0 20px rgba(28,25,23,0.07)' }}>
        {!sidebarOpen && (
          <div className="flex flex-col items-center pt-4 gap-3">
            {/* Tri-color bar slim */}
            <div className="w-full h-[3px] flex">
              <div style={{ flex: 1, background: '#C8322B' }} />
              <div style={{ flex: 1, background: '#C49A2A' }} />
              <div style={{ flex: 1, background: '#4A7BA8' }} />
            </div>
            {/* Logo icon */}
            <button onClick={() => setSidebarOpen(true)}
                    className="w-10 h-10 rounded-xl flex items-center justify-center mt-1"
                    style={{ backgroundColor: 'var(--neu-bg)', boxShadow: 'var(--neu-raised)' }}>
              <span style={{ fontFamily: "'Anybody',sans-serif", fontWeight: 800, fontSize: 16, color: '#C8322B' }}>Y</span>
            </button>
            {/* Icon-only nav */}
            <div className="flex flex-col gap-1 px-2 mt-2">
              {navigation.map((section) => {
                const Icon = section.icon
                const active = isSectionActive(section)
                return (
                  <Link key={section.id} href={section.items[0]?.href || '/admin'} title={section.label}
                        className="w-11 h-11 rounded-xl flex items-center justify-center transition-all"
                        style={{
                          backgroundColor: 'var(--neu-bg)',
                          boxShadow: active ? 'var(--neu-inset)' : 'var(--neu-flat)',
                          color: active ? '#C8322B' : '#78716C',
                        }}>
                    <Icon size={17} />
                  </Link>
                )
              })}
            </div>
          </div>
        )}
        {sidebarOpen && <SidebarContent />}
      </aside>

      {/* ── Top Header ───────────────────────────────────────────────────── */}
      <header className={`fixed top-0 right-0 z-30 h-14 flex items-center transition-all duration-300 ${sidebarOpen ? 'lg:left-[270px]' : 'lg:left-[68px]'} left-0`}
              style={{ backgroundColor: 'var(--neu-bg,#EDE9E1)', boxShadow: '0 2px 8px rgba(28,25,23,0.06)', borderBottom: '1px solid rgba(120,113,108,0.1)' }}>
        {/* Tri-color top bar — very top of header */}
        <div className="absolute top-0 left-0 right-0 h-[3px] flex">
          <div style={{ flex: 1, background: '#C8322B' }} />
          <div style={{ flex: 1, background: '#C49A2A' }} />
          <div style={{ flex: 1, background: '#4A7BA8' }} />
        </div>

        <div className="flex items-center justify-between w-full px-4 lg:px-6">
          {/* Left */}
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button onClick={() => setMobileMenuOpen(true)}
                    className="lg:hidden p-2 rounded-lg transition-all"
                    style={{ boxShadow: 'var(--neu-flat)', backgroundColor: 'var(--neu-bg)', color: '#78716C' }}>
              <Menu size={18} />
            </button>
            {/* Sidebar toggle (desktop) */}
            <button onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="hidden lg:flex p-2 rounded-lg transition-all"
                    style={{ boxShadow: 'var(--neu-flat)', backgroundColor: 'var(--neu-bg)', color: '#78716C' }}>
              <Menu size={16} />
            </button>
            {pageTitle && (
              <h1 style={{ fontFamily: "'Anybody',sans-serif", fontWeight: 700, fontSize: 16, color: '#1C1917' }} className="hidden md:block">
                {pageTitle}
              </h1>
            )}
          </div>

          {/* Right */}
          <div className="flex items-center gap-2">
            {/* Quick new article */}
            <Link href="/admin/articles/new"
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.5, backgroundColor: '#C8322B', color: '#FAF8F4', boxShadow: '3px 3px 8px var(--neu-shadow-dark,#CAC5BC), -1px -1px 4px rgba(200,50,43,0.2)' }}>
              <Plus size={12} />
              New Article
            </Link>

            {/* M-013: Notification bell removed — no notification panel exists yet */}

            {/* User menu */}
            <div className="relative">
              <button onClick={() => setUserMenuOpen(!userMenuOpen)}
                      className="flex items-center gap-2 p-1.5 rounded-xl transition-all"
                      style={{ backgroundColor: 'var(--neu-bg)', boxShadow: 'var(--neu-flat)' }}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center"
                     style={{ backgroundColor: 'var(--neu-bg)', boxShadow: 'var(--neu-raised)' }}>
                  <span style={{ fontFamily: "'Anybody',sans-serif", fontWeight: 800, fontSize: 11, color: '#C8322B' }}>
                    {session?.user?.name?.charAt(0)?.toUpperCase() || 'A'}
                  </span>
                </div>
                <ChevronDown size={12} style={{ color: '#78716C' }} />
              </button>

              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-52 rounded-2xl z-50 overflow-hidden"
                       style={{ backgroundColor: 'var(--neu-bg)', boxShadow: 'var(--neu-raised)' }}>
                    <div className="p-4" style={{ borderBottom: '1px solid rgba(120,113,108,0.12)' }}>
                      <div style={{ fontFamily: "'Anybody',sans-serif", fontWeight: 700, fontSize: 13, color: '#1C1917' }}>
                        {session?.user?.name || 'Admin'}
                      </div>
                      <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: '#78716C', letterSpacing: 0.5 }} className="mt-0.5 truncate">
                        {session?.user?.email || ''}
                      </div>
                    </div>
                    <div className="p-2 space-y-0.5">
                      {[
                        { label: 'Profile', href: '/admin/team', icon: User },
                        { label: 'Settings', href: '/admin/settings', icon: Settings },
                        { label: 'AI Models', href: '/admin/settings?tab=ai-models', icon: Brain },
                        { label: 'API Keys', href: '/admin/command-center/settings/api-keys', icon: Key },
                      ].map(({ label, href, icon: Icon }) => (
                        <Link key={href} href={href} onClick={() => setUserMenuOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all"
                              style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, textTransform: 'uppercase', letterSpacing: 1, color: '#78716C' }}>
                          <Icon size={13} />
                          {label}
                        </Link>
                      ))}
                    </div>
                    <div className="p-2" style={{ borderTop: '1px solid rgba(120,113,108,0.12)' }}>
                      <button onClick={handleSignOut}
                              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg transition-all"
                              style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, textTransform: 'uppercase', letterSpacing: 1, color: '#C8322B' }}>
                        <LogOut size={13} />
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

      {/* ── Main Content ─────────────────────────────────────────────────── */}
      <main className={`min-h-screen transition-all duration-300 pt-14 pb-20 lg:pb-0 ${sidebarOpen ? 'lg:ml-[270px]' : 'lg:ml-[68px]'}`}
            style={{ backgroundColor: 'var(--neu-bg,#EDE9E1)' }}>
        <div className="p-4 lg:p-6">
          {children}
        </div>
      </main>

      {/* ── Mobile Bottom Nav ─────────────────────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden"
           style={{ backgroundColor: 'var(--neu-bg,#EDE9E1)', boxShadow: '0 -3px 12px rgba(28,25,23,0.08)', borderTop: '1px solid rgba(120,113,108,0.1)' }}>
        <div className="flex items-center justify-around h-14 px-2">
          {mobileBottomNav.map((item) => {
            const Icon = item.icon
            const isTrigger = item.href === '__menu__'
            const active = !isTrigger && isActive(item.href)

            if (isTrigger) {
              return (
                <button key="more" onClick={() => setMobileMenuOpen(true)}
                        className="flex flex-col items-center gap-0.5 min-w-[44px] py-1"
                        style={{ color: '#78716C' }}>
                  <Icon size={19} />
                  <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>More</span>
                </button>
              )
            }

            if (item.primary) {
              return (
                <Link key="new" href={item.href}
                      className="flex items-center justify-center w-11 h-11 -mt-4 rounded-full transition-all"
                      style={{ backgroundColor: '#C8322B', boxShadow: '4px 4px 10px var(--neu-shadow-dark,#CAC5BC), -2px -2px 6px rgba(200,50,43,0.25)', color: '#FAF8F4' }}>
                  <Icon size={20} />
                </Link>
              )
            }

            return (
              <Link key={item.label} href={item.href}
                    className="flex flex-col items-center gap-0.5 min-w-[44px] py-1 transition-all"
                    style={{ color: active ? '#C8322B' : '#78716C' }}>
                <Icon size={19} />
                <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
