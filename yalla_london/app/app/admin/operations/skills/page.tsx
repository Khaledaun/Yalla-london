'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  AdminCard,
  AdminPageHeader,
  AdminSectionLabel,
  AdminStatusBadge,
  AdminKPICard,
  AdminButton,
  AdminLoadingState,
  AdminEmptyState,
  AdminTabs,
} from '@/components/admin/admin-ui'
import {
  Zap, Shield, FlaskConical, Gauge, Search,
  Rocket, PenTool, Database, ClipboardList, Workflow,
  SearchCode, ChevronDown, ChevronRight,
  CheckCircle, AlertTriangle, Play, Settings,
} from 'lucide-react'

interface SkillAction {
  id: string
  name: string
  nameAr: string
  type: string
  description: string
}

interface SkillData {
  id: string
  name: string
  nameAr: string
  description: string
  category: string
  icon: string
  triggers: {
    filePatterns?: string[]
    keywords?: string[]
    events?: string[]
    directories?: string[]
  }
  actions: SkillAction[]
  priority: string
  enabled: boolean
}

interface SkillsResponse {
  skills: SkillData[]
  categories: { category: string; count: number; label: string }[]
  total: number
  enabled: number
  summary: {
    totalActions: number
    criticalSkills: number
    autoTriggered: number
  }
}

const iconMap: Record<string, React.ReactNode> = {
  SearchCode: <SearchCode size={18} />,
  FlaskConical: <FlaskConical size={18} />,
  Shield: <Shield size={18} />,
  Gauge: <Gauge size={18} />,
  ClipboardList: <ClipboardList size={18} />,
  Workflow: <Workflow size={18} />,
  Search: <Search size={18} />,
  PenTool: <PenTool size={18} />,
  Rocket: <Rocket size={18} />,
  Database: <Database size={18} />,
}

const priorityConfig: Record<string, { color: string; bg: string }> = {
  critical: { color: '#C8322B', bg: 'rgba(200,50,43,0.08)' },
  high: { color: '#C49A2A', bg: 'rgba(196,154,42,0.08)' },
  medium: { color: '#3B7EA1', bg: 'rgba(59,126,161,0.08)' },
  low: { color: '#78716C', bg: 'rgba(120,113,108,0.08)' },
}

const categoryColor: Record<string, string> = {
  'code-quality': '#7C3AED',
  testing: '#2D5A3D',
  security: '#C8322B',
  performance: '#C49A2A',
  requirements: '#3B7EA1',
  automation: '#0D9488',
  seo: '#C8322B',
  content: '#2D5A3D',
  deployment: '#44403C',
  data: '#3B7EA1',
  design: '#7C3AED',
  operations: '#C8322B',
}

export default function SkillsPage() {
  const [data, setData] = useState<SkillsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [testKeyword, setTestKeyword] = useState('')
  const [matchedSkills, setMatchedSkills] = useState<SkillData[] | null>(null)

  useEffect(() => {
    fetch('/api/admin/skill-engine')
      .then((res) => res.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const testAutoActivation = async () => {
    if (!testKeyword.trim()) return
    try {
      const res = await fetch(`/api/admin/skill-engine?keyword=${encodeURIComponent(testKeyword)}`)
      const result = await res.json()
      setMatchedSkills(result.skills)
    } catch {
      console.error('Failed to test activation')
    }
  }

  const filteredSkills = data?.skills.filter((s) => activeCategory === 'all' || s.category === activeCategory) || []

  if (loading) {
    return (
      <div className="admin-page p-4 md:p-6">
        <AdminPageHeader
          title="Skills Engine"
          subtitle="Auto-activated dev, security, and operations skills"
          backHref="/admin/operations"
        />
        <AdminLoadingState label="Loading skills engine..." />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="admin-page p-4 md:p-6">
        <AdminPageHeader
          title="Skills Engine"
          subtitle="Auto-activated dev, security, and operations skills"
          backHref="/admin/operations"
        />
        <AdminEmptyState icon={AlertTriangle} title="Failed to load skills" description="Could not connect to the skills engine API." />
      </div>
    )
  }

  return (
    <div className="admin-page p-4 md:p-6">
      <AdminPageHeader
        title="Skills Engine"
        subtitle="Auto-activated dev, security, and operations skills"
        backHref="/admin/operations"
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <AdminKPICard value={data.total} label="Total Skills" color="#3B7EA1" />
        <AdminKPICard value={data.summary.totalActions} label="Total Actions" color="#7C3AED" />
        <AdminKPICard value={data.summary.criticalSkills} label="Critical" color="#C8322B" />
        <AdminKPICard value={data.summary.autoTriggered} label="Auto-Triggered" color="#2D5A3D" />
      </div>

      {/* Auto-Activation Tester */}
      <AdminCard accent accentColor="blue" className="mb-5">
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Play size={14} color="#3B7EA1" />
            <AdminSectionLabel>Test Auto-Activation</AdminSectionLabel>
          </div>
          <div className="flex gap-3">
            <input
              type="text"
              value={testKeyword}
              onChange={(e) => setTestKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && testAutoActivation()}
              placeholder="Type a keyword (e.g., 'security', 'deploy', 'test')..."
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid rgba(214,208,196,0.8)',
                fontFamily: 'var(--font-system)',
                fontSize: 12,
                backgroundColor: '#FFFFFF',
                outline: 'none',
              }}
            />
            <AdminButton variant="secondary" size="sm" onClick={testAutoActivation}>
              <Zap size={12} />
              Test
            </AdminButton>
          </div>
          {matchedSkills && (
            <div
              className="mt-3 p-3 rounded-lg"
              style={{ backgroundColor: 'rgba(59,126,161,0.06)', border: '1px solid rgba(59,126,161,0.15)' }}
            >
              <p
                style={{
                  fontFamily: 'var(--font-system)',
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#3B7EA1',
                  marginBottom: 6,
                }}
              >
                {matchedSkills.length} skill{matchedSkills.length !== 1 ? 's' : ''} would activate for &ldquo;{testKeyword}&rdquo;:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {matchedSkills.map((s) => (
                  <AdminStatusBadge key={s.id} status="active" label={s.name} />
                ))}
                {matchedSkills.length === 0 && (
                  <span style={{ fontFamily: 'var(--font-system)', fontSize: 11, color: '#A8A29E' }}>
                    No skills match. Try: security, deploy, test, SEO, performance
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </AdminCard>

      {/* Category Tabs */}
      <div className="mb-5">
        <AdminTabs
          tabs={[
            { id: 'all', label: 'All', count: data.total },
            ...data.categories
              .filter((c) => c.count > 0)
              .map((cat) => ({
                id: cat.category,
                label: cat.label,
                count: cat.count,
              })),
          ]}
          activeTab={activeCategory}
          onTabChange={setActiveCategory}
        />
      </div>

      {/* Skills List */}
      <div className="space-y-3">
        {filteredSkills.map((skill) => {
          const isExpanded = expandedSkill === skill.id
          const catColor = categoryColor[skill.category] || '#78716C'
          const priConfig = priorityConfig[skill.priority] || priorityConfig.low

          return (
            <AdminCard key={skill.id}>
              <button
                onClick={() => setExpandedSkill(isExpanded ? null : skill.id)}
                className="w-full text-left"
              >
                <div className="p-4 flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${catColor}15`, color: catColor }}
                  >
                    {iconMap[skill.icon] || <Zap size={18} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontWeight: 700,
                          fontSize: 13,
                          color: '#1C1917',
                        }}
                      >
                        {skill.name}
                      </span>
                      <span
                        className="inline-flex items-center px-1.5 py-0.5 rounded-full"
                        style={{
                          backgroundColor: priConfig.bg,
                          fontFamily: 'var(--font-system)',
                          fontSize: 9,
                          fontWeight: 600,
                          color: priConfig.color,
                          letterSpacing: '0.5px',
                          textTransform: 'capitalize',
                        }}
                      >
                        {skill.priority}
                      </span>
                      {skill.enabled && <CheckCircle size={14} color="#2D5A3D" />}
                    </div>
                    <p
                      className="line-clamp-1"
                      style={{
                        fontFamily: 'var(--font-system)',
                        fontSize: 11,
                        color: '#78716C',
                      }}
                    >
                      {skill.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span
                      style={{
                        fontFamily: 'var(--font-system)',
                        fontSize: 10,
                        color: '#A8A29E',
                      }}
                    >
                      {skill.actions.length} actions
                    </span>
                    {isExpanded ? (
                      <ChevronDown size={14} color="#A8A29E" />
                    ) : (
                      <ChevronRight size={14} color="#A8A29E" />
                    )}
                  </div>
                </div>
              </button>

              {isExpanded && (
                <div style={{ borderTop: '1px solid rgba(214,208,196,0.6)' }}>
                  {/* Triggers */}
                  <div className="px-4 py-3" style={{ backgroundColor: '#FAF8F4' }}>
                    <p
                      style={{
                        fontFamily: 'var(--font-system)',
                        fontSize: 9,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '1.5px',
                        color: '#78716C',
                        marginBottom: 8,
                      }}
                    >
                      Auto-Activation Triggers
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {skill.triggers.events?.map((e) => (
                        <AdminStatusBadge key={e} status="running" label={e} />
                      ))}
                      {skill.triggers.filePatterns?.map((p) => (
                        <span
                          key={p}
                          className="inline-flex items-center px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: 'rgba(120,113,108,0.08)',
                            fontFamily: 'monospace',
                            fontSize: 9,
                            color: '#44403C',
                          }}
                        >
                          {p}
                        </span>
                      ))}
                      {skill.triggers.keywords?.slice(0, 6).map((k) => (
                        <AdminStatusBadge key={k} status="pending" label={k} />
                      ))}
                      {skill.triggers.directories?.map((d) => (
                        <span
                          key={d}
                          className="inline-flex items-center px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: 'rgba(120,113,108,0.08)',
                            fontFamily: 'monospace',
                            fontSize: 9,
                            color: '#44403C',
                          }}
                        >
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="p-4 space-y-2">
                    <p
                      style={{
                        fontFamily: 'var(--font-system)',
                        fontSize: 9,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '1.5px',
                        color: '#78716C',
                        marginBottom: 6,
                      }}
                    >
                      Actions
                    </p>
                    {skill.actions.map((action) => {
                      const actionColors: Record<string, { bg: string; color: string }> = {
                        check: { bg: 'rgba(59,126,161,0.10)', color: '#3B7EA1' },
                        generate: { bg: 'rgba(45,90,61,0.10)', color: '#2D5A3D' },
                        fix: { bg: 'rgba(196,154,42,0.10)', color: '#C49A2A' },
                        report: { bg: 'rgba(124,58,237,0.10)', color: '#7C3AED' },
                        validate: { bg: 'rgba(200,50,43,0.10)', color: '#C8322B' },
                      }
                      const ac = actionColors[action.type] || { bg: 'rgba(120,113,108,0.08)', color: '#78716C' }

                      return (
                        <div
                          key={action.id}
                          className="flex items-start gap-3 p-3 rounded-lg"
                          style={{ backgroundColor: '#FAF8F4' }}
                        >
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: ac.bg, color: ac.color }}
                          >
                            {action.type === 'check' ? (
                              <Search size={14} />
                            ) : action.type === 'generate' ? (
                              <Zap size={14} />
                            ) : action.type === 'validate' ? (
                              <Shield size={14} />
                            ) : (
                              <Settings size={14} />
                            )}
                          </div>
                          <div>
                            <p
                              style={{
                                fontFamily: 'var(--font-display)',
                                fontWeight: 700,
                                fontSize: 12,
                                color: '#1C1917',
                              }}
                            >
                              {action.name}
                            </p>
                            <p
                              style={{
                                fontFamily: 'var(--font-system)',
                                fontSize: 10,
                                color: '#78716C',
                                marginTop: 2,
                              }}
                            >
                              {action.description}
                            </p>
                            <span
                              className="inline-flex items-center px-1.5 py-0.5 rounded-full mt-1.5"
                              style={{
                                backgroundColor: ac.bg,
                                fontFamily: 'var(--font-system)',
                                fontSize: 9,
                                fontWeight: 600,
                                color: ac.color,
                                letterSpacing: '0.5px',
                                textTransform: 'capitalize',
                              }}
                            >
                              {action.type}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </AdminCard>
          )
        })}
      </div>
    </div>
  )
}
