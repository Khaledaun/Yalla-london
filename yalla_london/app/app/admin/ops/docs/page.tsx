'use client'

export const dynamic = 'force-dynamic'

import { useState, useMemo } from 'react'
import {
  BookOpen, FileText, Search, ExternalLink, ArrowRight,
  Globe, Code2, Microscope, Layers, FolderOpen, Wrench,
} from 'lucide-react'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DocCard {
  title: string
  description: string
  href: string
  badge?: string
  badgeColor?: string
  external?: boolean
  lastModified?: string
}

interface DocSection {
  id: string
  label: string
  icon: React.ReactNode
  docs: DocCard[]
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const SECTIONS: DocSection[] = [
  {
    id: 'platform',
    label: 'Platform Docs',
    icon: <BookOpen className="w-4 h-4" />,
    docs: [
      {
        title: 'CLAUDE.md',
        description: 'Master project instructions — engineering standards, active workstreams, pipeline rules, all critical lessons learned.',
        href: 'https://github.com/khaledaun/yalla-london/blob/main/yalla_london/app/CLAUDE.md',
        badge: 'Essential',
        badgeColor: 'bg-red-500/20 text-red-400',
        external: true,
        lastModified: 'Mar 29, 2026',
      },
      {
        title: 'AUDIT-LOG.md',
        description: 'Persistent tracking of all audit findings across sessions. Read before any pipeline change — documents every known gap with ID, severity, and resolution.',
        href: 'https://github.com/khaledaun/yalla-london/blob/main/yalla_london/app/docs/AUDIT-LOG.md',
        badge: 'Critical',
        badgeColor: 'bg-orange-500/20 text-orange-400',
        external: true,
        lastModified: 'Mar 28, 2026',
      },
      {
        title: 'FUNCTIONING-ROADMAP.md',
        description: '8-phase path to 100% healthy platform. Anti-patterns registry, validation protocol, all 47 Known Gaps tracked with phase assignments.',
        href: 'https://github.com/khaledaun/yalla-london/blob/main/yalla_london/app/docs/FUNCTIONING-ROADMAP.md',
        badge: 'Roadmap',
        badgeColor: 'bg-blue-500/20 text-blue-400',
        external: true,
        lastModified: 'Mar 22, 2026',
      },
      {
        title: 'MASTER-BUILD-PLAN.md',
        description: 'Strategic master plan — read at start of every session. Stage A (infrastructure), Stage B (site building), launch priority order.',
        href: 'https://github.com/khaledaun/yalla-london/blob/main/yalla_london/app/docs/plans/MASTER-BUILD-PLAN.md',
        badge: 'Strategy',
        badgeColor: 'bg-purple-500/20 text-purple-400',
        external: true,
        lastModified: 'Mar 24, 2026',
      },
    ],
  },
  {
    id: 'research',
    label: 'Site Research',
    icon: <Globe className="w-4 h-4" />,
    docs: [
      {
        title: 'Yalla London Research',
        description: 'Design, content strategy, affiliates (HalalBooking priority), site architecture, cross-site links, neighborhoods guide. 780+ lines.',
        href: 'https://github.com/khaledaun/yalla-london/blob/main/yalla_london/app/docs/site-research/01-yalla-london.md',
        badge: 'Active',
        badgeColor: 'bg-green-500/20 text-green-400',
        external: true,
      },
      {
        title: 'Arabaldives Research',
        description: 'Arab market gap analysis, RTL Arabic-first content, halal resort reviews, atoll guides, resort comparison tool. 670 lines.',
        href: 'https://github.com/khaledaun/yalla-london/blob/main/yalla_london/app/docs/site-research/02-arabaldives.md',
        badge: 'Planned',
        badgeColor: 'bg-yellow-500/20 text-yellow-400',
        external: true,
      },
      {
        title: 'Yalla Riviera Research',
        description: 'French Riviera / Côte d\'Azur — Gulf tourist market ($75B+ GCC spending), yacht charter affiliates, halal dining guide. 712 lines.',
        href: 'https://github.com/khaledaun/yalla-london/blob/main/yalla_london/app/docs/site-research/03-yalla-riviera.md',
        badge: 'Planned',
        badgeColor: 'bg-yellow-500/20 text-yellow-400',
        external: true,
      },
      {
        title: 'Yalla Istanbul Research',
        description: 'Ottoman + modern design, $35B Turkish tourism, Bosphorus luxury positioning. Highest revenue ceiling of all sites. 782 lines.',
        href: 'https://github.com/khaledaun/yalla-london/blob/main/yalla_london/app/docs/site-research/05-yalla-istanbul.md',
        badge: 'Planned',
        badgeColor: 'bg-yellow-500/20 text-yellow-400',
        external: true,
      },
      {
        title: 'Yalla Thailand Research',
        description: 'Emerald + golden amber brand, 40M+ annual tourists, island/wellness/halal focus, strong GCC travel pipeline. 664 lines.',
        href: 'https://github.com/khaledaun/yalla-london/blob/main/yalla_london/app/docs/site-research/04-yalla-thailand.md',
        badge: 'Planned',
        badgeColor: 'bg-yellow-500/20 text-yellow-400',
        external: true,
      },
    ],
  },
  {
    id: 'development',
    label: 'Development',
    icon: <Code2 className="w-4 h-4" />,
    docs: [
      {
        title: 'DEVELOPMENT-STANDARDS.md',
        description: '16-section reference: SEO standards, AIO optimization, content quality, technical SEO, structured data, E-E-A-T, multi-site rules, anti-patterns.',
        href: 'https://github.com/khaledaun/yalla-london/blob/main/yalla_london/app/docs/DEVELOPMENT-STANDARDS.md',
        badge: 'Standards',
        badgeColor: 'bg-blue-500/20 text-blue-400',
        external: true,
        lastModified: 'Feb 20, 2026',
      },
      {
        title: 'NEW-WEBSITE-WORKFLOW.md',
        description: '8-phase operational workflow for launching new websites. From site config to first published article. Step-by-step with validation checkpoints.',
        href: 'https://github.com/khaledaun/yalla-london/blob/main/yalla_london/app/docs/NEW-WEBSITE-WORKFLOW.md',
        badge: 'Workflow',
        badgeColor: 'bg-teal-500/20 text-teal-400',
        external: true,
        lastModified: 'Mar 15, 2026',
      },
      {
        title: 'DESIGN-SYSTEM-DEVELOPMENT-PLAN.md',
        description: '6-phase design system build plan — brand provider, email builder, video studio, content engine agents, admin pages. 98% complete.',
        href: 'https://github.com/khaledaun/yalla-london/blob/main/yalla_london/app/docs/DESIGN-SYSTEM-DEVELOPMENT-PLAN.md',
        badge: 'Design',
        badgeColor: 'bg-pink-500/20 text-pink-400',
        external: true,
        lastModified: 'Mar 11, 2026',
      },
    ],
  },
  {
    id: 'audits',
    label: 'Audit Reports',
    icon: <Microscope className="w-4 h-4" />,
    docs: [
      {
        title: 'Cron Job Logs',
        description: 'Full history of all cron job executions — status, duration, items processed, errors. Filter by job, status, and date range.',
        href: '/admin/audit-logs',
        badge: 'Live',
        badgeColor: 'bg-green-500/20 text-green-400',
      },
      {
        title: 'Master SEO Audit',
        description: 'Run the full master audit engine — crawls all pages, validates canonical/hreflang/sitemap/schema/links, generates EXEC_SUMMARY and FIX_PLAN reports.',
        href: '/admin/master-audit',
        badge: 'On-demand',
        badgeColor: 'bg-blue-500/20 text-blue-400',
      },
    ],
  },
]

const QUICK_LINKS = [
  { label: 'Legal Pages', href: '/admin/legal', icon: <FileText className="w-3.5 h-3.5" /> },
  { label: 'Prompts', href: '/admin/prompts', icon: <Layers className="w-3.5 h-3.5" /> },
  { label: 'Content Types', href: '/admin/content-types', icon: <FolderOpen className="w-3.5 h-3.5" /> },
  { label: 'Feature Flags', href: '/admin/feature-flags', icon: <Wrench className="w-3.5 h-3.5" /> },
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function KnowledgeHubPage() {
  const [query, setQuery] = useState('')

  const filteredSections = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return SECTIONS
    return SECTIONS.map(section => ({
      ...section,
      docs: section.docs.filter(
        d =>
          d.title.toLowerCase().includes(q) ||
          d.description.toLowerCase().includes(q) ||
          section.label.toLowerCase().includes(q)
      ),
    })).filter(s => s.docs.length > 0)
  }, [query])

  const totalDocs = SECTIONS.reduce((n, s) => n + s.docs.length, 0)

  return (
    <div className="min-h-screen bg-[#0B1120] text-white px-4 py-6 md:px-8">

      {/* Header */}
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-5 h-5 text-[#C49A2A]" />
            <h1 className="text-xl font-semibold text-white">Knowledge Hub</h1>
          </div>
          <p className="text-sm text-gray-400">
            {totalDocs} documents across {SECTIONS.length} sections
          </p>
        </div>
        <span className="text-[10px] font-mono px-2 py-1 rounded bg-[#1E293B] text-gray-400 shrink-0 self-start">
          {process.env.NODE_ENV?.toUpperCase() ?? 'PRODUCTION'}
        </span>
      </div>

      {/* Search */}
      <div className="relative mb-8">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search docs by title or description…"
          className="w-full bg-[#111827] border border-[#1E293B] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#3B7EA1] transition-colors"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-xs"
          >
            Clear
          </button>
        )}
      </div>

      {/* Quick links */}
      <div className="mb-8">
        <p className="font-mono text-[11px] uppercase tracking-wider text-gray-500 mb-3">Quick Admin Links</p>
        <div className="flex flex-wrap gap-2">
          {QUICK_LINKS.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#111827] border border-[#1E293B] rounded-lg text-sm text-gray-300 hover:text-[#C49A2A] hover:border-[#C49A2A]/30 transition-colors"
            >
              {link.icon}
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Sections */}
      {filteredSections.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Search className="w-8 h-8 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No documents match &quot;{query}&quot;</p>
        </div>
      ) : (
        <div className="space-y-10">
          {filteredSections.map(section => (
            <div key={section.id}>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-[#3B7EA1]">{section.icon}</span>
                <p className="font-mono text-[11px] uppercase tracking-wider text-gray-500">
                  {section.label}
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {section.docs.map(doc => (
                  <DocCardItem key={doc.href} doc={doc} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── DocCard sub-component ────────────────────────────────────────────────────

function DocCardItem({ doc }: { doc: DocCard }) {
  const inner = (
    <div className="bg-[#111827] border border-[#1E293B] rounded-xl p-5 hover:border-[#3B7EA1]/40 transition-colors group h-full flex flex-col">
      <div className="flex items-start justify-between gap-3 mb-2">
        <span className="font-medium text-white text-sm group-hover:text-[#C49A2A] transition-colors leading-snug">
          {doc.title}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {doc.badge && (
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${doc.badgeColor ?? 'bg-gray-700 text-gray-400'}`}>
              {doc.badge}
            </span>
          )}
          {doc.external ? (
            <ExternalLink className="w-3.5 h-3.5 text-gray-600 group-hover:text-[#3B7EA1] transition-colors" />
          ) : (
            <ArrowRight className="w-3.5 h-3.5 text-gray-600 group-hover:text-[#3B7EA1] transition-colors" />
          )}
        </div>
      </div>
      <p className="text-xs text-gray-400 leading-relaxed flex-1">{doc.description}</p>
      {doc.lastModified && (
        <p className="text-[10px] font-mono text-gray-600 mt-3">Updated {doc.lastModified}</p>
      )}
    </div>
  )

  if (doc.external) {
    return (
      <a href={doc.href} target="_blank" rel="noopener noreferrer" className="block h-full">
        {inner}
      </a>
    )
  }

  return (
    <Link href={doc.href} className="block h-full">
      {inner}
    </Link>
  )
}
