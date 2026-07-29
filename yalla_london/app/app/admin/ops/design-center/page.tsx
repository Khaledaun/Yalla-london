'use client'

export const dynamic = 'force-dynamic'

import React, { useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Copy,
  Check,
  Palette,
  Type,
  LayoutGrid,
  Zap,
  ExternalLink,
  Sparkles,
  FileText,
  Home,
  Image,
} from 'lucide-react'
import {
  AdminCard,
  AdminStatusBadge,
  AdminKPICard,
  AdminButton,
  AdminAlertBanner,
} from '@/components/admin/admin-ui'

// ─── Types ──────────────────────────────────────────────────────────────────

interface ColorToken {
  name: string
  cssVar: string
  hex: string
  usage: string
}

interface TypographyToken {
  label: string
  family: string
  fallback: string
  role: string
}

interface QuickAction {
  label: string
  href: string
  icon: React.ReactNode
  description: string
}

// ─── Constants ───────────────────────────────────────────────────────────────

const COLOR_TOKENS: ColorToken[] = [
  { name: 'YL Red',    cssVar: '--yl-red',    hex: '#C8322B', usage: 'Primary brand, CTAs, alerts' },
  { name: 'YL Gold',   cssVar: '--yl-gold',   hex: '#C49A2A', usage: 'Accent, highlights, stars' },
  { name: 'YL Navy',   cssVar: '--yl-navy',   hex: '#0A1628', usage: 'Dark backgrounds, headers' },
  { name: 'YL Cream',  cssVar: '--yl-cream',  hex: '#FAF8F4', usage: 'Light backgrounds, surfaces' },
  { name: 'Z Gold',    cssVar: '--z-gold',    hex: '#C9A96E', usage: 'Zenitha Yachts brand accent' },
  { name: 'Z Navy',    cssVar: '--z-navy',    hex: '#0A1628', usage: 'Zenitha Yachts dark base' },
  { name: 'Admin Red', cssVar: '--admin-red', hex: '#C8322B', usage: 'Admin danger, errors' },
  { name: 'Admin Gold',cssVar: '--admin-gold',hex: '#C49A2A', usage: 'Admin warnings, KPIs' },
  { name: 'Admin Blue',cssVar: '--admin-blue',hex: '#3B7EA1', usage: 'Admin info, links, progress' },
  { name: 'Admin Green',cssVar:'--admin-green',hex: '#2D5A3D', usage: 'Admin success, indexed, live' },
]

const TYPOGRAPHY_TOKENS: TypographyToken[] = [
  { label: 'Display',   family: 'Anybody, Playfair Display', fallback: 'serif',      role: 'Hero headings, brand statements' },
  { label: 'System',    family: 'Source Serif 4, DM Sans',   fallback: 'sans-serif', role: 'Body copy, UI labels, descriptions' },
  { label: 'Mono',      family: 'IBM Plex Mono',              fallback: 'monospace',  role: 'Code snippets, tokens, badges, values' },
]

const TYPE_SIZES = [
  { size: '11px', label: 'XS — Labels & tags' },
  { size: '12px', label: 'SM — Captions & meta' },
  { size: '14px', label: 'MD — Body & descriptions' },
  { size: '16px', label: 'LG — Default body' },
  { size: '20px', label: 'XL — Subheadings' },
  { size: '28px', label: '2XL — Section headings' },
]

const QUICK_ACTIONS: QuickAction[] = [
  { label: 'Design Studio',      href: '/admin/design-studio',        icon: <Palette size={18} />,   description: 'Canvas editor + brand kit generator' },
  { label: 'Brand Assets',       href: '/admin/design',               icon: <Image size={18} />,     description: 'Logos, images, media library' },
  { label: 'Homepage Builder',   href: '/admin/design/homepage',      icon: <Home size={18} />,      description: 'Drag-drop homepage blocks' },
  { label: 'PDF Generator',      href: '/admin/pdf-generator',        icon: <FileText size={18} />,  description: '6 branded cover templates' },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getSiteIdFromCookie(): string {
  if (typeof document === 'undefined') return 'yalla-london'
  const match = document.cookie.match(/(?:^|;\s*)activeSiteId=([^;]*)/)
  return match ? decodeURIComponent(match[1]) : 'yalla-london'
}

function FeatureBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 font-mono text-[10px] uppercase tracking-wider text-emerald-400">
      <Sparkles size={9} />
      {label}
    </span>
  )
}

function SectionHeader({ icon, title, badge }: { icon: React.ReactNode; title: string; badge: string }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-2.5">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#1E293B] text-[#C9A96E]">
          {icon}
        </div>
        <h2 className="text-white font-semibold text-[15px] tracking-tight">{title}</h2>
      </div>
      <FeatureBadge label={badge} />
    </div>
  )
}

// ─── Color Swatch ────────────────────────────────────────────────────────────

function ColorSwatch({ token }: { token: ColorToken }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(token.hex).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }, [token.hex])

  const isLight = ['#FAF8F4'].includes(token.hex)

  return (
    <button
      onClick={handleCopy}
      className="group flex flex-col items-center gap-2 w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A96E] rounded-lg"
      title={`Copy ${token.hex}`}
    >
      {/* Swatch */}
      <div
        className="relative w-full aspect-square rounded-lg border border-white/10 shadow-lg transition-transform group-hover:scale-105"
        style={{ backgroundColor: token.hex }}
      >
        {/* Copy overlay */}
        <div className="absolute inset-0 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
          {copied
            ? <Check size={16} className="text-white drop-shadow" />
            : <Copy size={14} className="text-white drop-shadow" />
          }
        </div>
      </div>
      {/* Labels */}
      <div className="w-full text-left px-0.5">
        <p className={`font-mono text-[11px] uppercase tracking-wider truncate ${isLight ? 'text-gray-300' : 'text-white'}`}>
          {token.name}
        </p>
        <p className="font-mono text-[10px] text-gray-500 truncate">{token.hex}</p>
        <p className="font-mono text-[10px] text-gray-600 truncate mt-0.5 leading-tight">{token.cssVar}</p>
      </div>
    </button>
  )
}

// ─── Component Preview ───────────────────────────────────────────────────────

function ComponentPreview({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#0B1120] border border-[#1E293B] rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-wider text-gray-500">{name}</span>
        <FeatureBadge label="wired" />
      </div>
      <div className="min-h-[56px] flex items-center">
        {children}
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function DesignCenterPage() {
  const siteId = typeof window !== 'undefined' ? getSiteIdFromCookie() : 'yalla-london'

  const envLabel =
    process.env.NODE_ENV === 'production'
      ? { text: 'Production', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' }
      : { text: 'Development', color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' }

  return (
    <div className="min-h-screen bg-[#0B1120] text-white">
      {/* ── Top bar ── */}
      <div className="sticky top-0 z-30 bg-[#0B1120]/90 backdrop-blur-md border-b border-[#1E293B] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-[#C9A96E] to-[#C8322B]">
            <Palette size={15} className="text-white" />
          </div>
          <div>
            <p className="text-white font-semibold text-[14px] leading-tight">Design System Center</p>
            <p className="font-mono text-[10px] text-gray-500 uppercase tracking-wider">{siteId}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${envLabel.color}`}>
            {envLabel.text}
          </span>
        </div>
      </div>

      <div className="px-5 py-7 max-w-6xl mx-auto space-y-8">

        {/* ── Hero intro ── */}
        <div className="text-center py-4">
          <h1 className="text-3xl font-bold text-white mb-2 bg-gradient-to-r from-[#C9A96E] via-white to-[#C8322B] bg-clip-text text-transparent">
            Design System Center
          </h1>
          <p className="text-gray-400 text-[14px] max-w-md mx-auto">
            Live design tokens, component gallery, and typography scale for the Zenitha content platform.
          </p>
        </div>

        {/* ═══════════════════════════════════════════════════════
            SECTION 1: Brand Tokens
           ═══════════════════════════════════════════════════════ */}
        <section className="bg-[#111827] border border-[#1E293B] rounded-xl p-5">
          <SectionHeader icon={<Palette size={16} />} title="Brand Tokens" badge="css-vars" />

          <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-10 gap-3">
            {COLOR_TOKENS.map((token) => (
              <ColorSwatch key={token.cssVar} token={token} />
            ))}
          </div>

          <div className="mt-5 pt-4 border-t border-[#1E293B] grid grid-cols-2 md:grid-cols-4 gap-3">
            {COLOR_TOKENS.slice(0, 4).map((token) => (
              <div key={token.cssVar} className="flex items-start gap-2.5">
                <div
                  className="w-3 h-3 mt-0.5 rounded-sm flex-shrink-0 border border-white/10"
                  style={{ backgroundColor: token.hex }}
                />
                <div>
                  <p className="font-mono text-[11px] text-gray-300">{token.name}</p>
                  <p className="font-mono text-[10px] text-gray-600 leading-snug">{token.usage}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            SECTION 2: Component Gallery
           ═══════════════════════════════════════════════════════ */}
        <section className="bg-[#111827] border border-[#1E293B] rounded-xl p-5">
          <SectionHeader icon={<LayoutGrid size={16} />} title="Component Gallery" badge="wired" />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

            <ComponentPreview name="AdminCard">
              <AdminCard className="w-full !p-3">
                <p className="text-stone-700 text-[13px] font-medium">Card surface</p>
                <p className="text-stone-400 text-[12px]">White bg · sand border · shadow</p>
              </AdminCard>
            </ComponentPreview>

            <ComponentPreview name="AdminStatusBadge">
              <div className="flex flex-wrap gap-2">
                <AdminStatusBadge status="published" label="Published" />
                <AdminStatusBadge status="draft" label="Draft" />
                <AdminStatusBadge status="error" label="Error" />
                <AdminStatusBadge status="warning" label="Warn" />
              </div>
            </ComponentPreview>

            <ComponentPreview name="AdminKPICard">
              <AdminKPICard
                label="Articles Indexed"
                value="87"
                trend={{ value: 12, positive: true }}
              />
            </ComponentPreview>

            <ComponentPreview name="AdminButton (variants)">
              <div className="flex flex-wrap gap-2">
                <AdminButton size="sm">Primary</AdminButton>
                <AdminButton size="sm" variant="secondary">Secondary</AdminButton>
                <AdminButton size="sm" variant="ghost">Ghost</AdminButton>
              </div>
            </ComponentPreview>

            <ComponentPreview name="AdminAlertBanner (warning)">
              <AdminAlertBanner
                severity="warning"
                message="Pipeline needs attention — 3 drafts stuck."
              />
            </ComponentPreview>

            <ComponentPreview name="AdminAlertBanner (info)">
              <AdminAlertBanner
                severity="info"
                message="All systems operational — 87 pages indexed."
              />
            </ComponentPreview>

          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            SECTION 3: Typography Scale
           ═══════════════════════════════════════════════════════ */}
        <section className="bg-[#111827] border border-[#1E293B] rounded-xl p-5">
          <SectionHeader icon={<Type size={16} />} title="Typography Scale" badge="design-tokens" />

          {/* Font families */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {TYPOGRAPHY_TOKENS.map((token) => (
              <div key={token.label} className="bg-[#0B1120] border border-[#1E293B] rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-gray-500">{token.label}</span>
                  <span className="font-mono text-[10px] text-[#C9A96E]">{token.fallback}</span>
                </div>
                <p
                  className="text-white text-[22px] leading-tight mb-1 truncate"
                  style={{ fontFamily: `${token.family}, ${token.fallback}` }}
                >
                  Aa Bb Cc
                </p>
                <p className="font-mono text-[10px] text-gray-500 truncate">{token.family}</p>
                <p className="font-mono text-[10px] text-gray-600 mt-1 leading-snug">{token.role}</p>
              </div>
            ))}
          </div>

          {/* Size scale */}
          <div className="bg-[#0B1120] border border-[#1E293B] rounded-xl divide-y divide-[#1E293B]">
            {TYPE_SIZES.map(({ size, label }) => (
              <div key={size} className="flex items-center gap-4 px-4 py-3">
                <span className="font-mono text-[10px] text-gray-600 w-10 flex-shrink-0">{size}</span>
                <p className="text-white flex-1 truncate" style={{ fontSize: size, lineHeight: 1.4 }}>
                  The quick brown fox jumps over the lazy dog
                </p>
                <span className="font-mono text-[10px] text-gray-500 flex-shrink-0 hidden sm:block">{label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            SECTION 4: Quick Actions
           ═══════════════════════════════════════════════════════ */}
        <section className="bg-[#111827] border border-[#1E293B] rounded-xl p-5">
          <SectionHeader icon={<Zap size={16} />} title="Quick Actions" badge="navigation" />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="group flex flex-col gap-3 bg-[#0B1120] border border-[#1E293B] rounded-xl p-4 hover:border-[#C9A96E]/40 hover:bg-[#0d1524] transition-all duration-150"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#1E293B] text-[#C9A96E] group-hover:bg-[#C9A96E]/15 transition-colors">
                    {action.icon}
                  </div>
                  <ExternalLink size={12} className="text-gray-600 group-hover:text-[#C9A96E] transition-colors" />
                </div>
                <div>
                  <p className="text-white text-[13px] font-semibold leading-tight">{action.label}</p>
                  <p className="text-gray-500 text-[11px] mt-0.5 leading-snug">{action.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Footer ── */}
        <div className="text-center pt-2 pb-6">
          <p className="font-mono text-[10px] uppercase tracking-wider text-gray-700">
            Zenitha.Luxury LLC · Design System v1 · {new Date().getFullYear()}
          </p>
        </div>

      </div>
    </div>
  )
}
