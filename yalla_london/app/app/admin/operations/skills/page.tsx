'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { MophyAdminLayout } from '@/components/admin/mophy/mophy-admin-layout'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft, Zap, Shield, FlaskConical, Gauge, Search,
  Rocket, PenTool, Database, ClipboardList, Workflow,
  SearchCode, Loader2, ChevronDown, ChevronRight,
  CheckCircle, AlertTriangle, Play, Settings
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
  SearchCode: <SearchCode className="w-5 h-5" />,
  FlaskConical: <FlaskConical className="w-5 h-5" />,
  Shield: <Shield className="w-5 h-5" />,
  Gauge: <Gauge className="w-5 h-5" />,
  ClipboardList: <ClipboardList className="w-5 h-5" />,
  Workflow: <Workflow className="w-5 h-5" />,
  Search: <Search className="w-5 h-5" />,
  PenTool: <PenTool className="w-5 h-5" />,
  Rocket: <Rocket className="w-5 h-5" />,
  Database: <Database className="w-5 h-5" />,
}

const priorityColor: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
  high: 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  low: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
}

const categoryGradient: Record<string, string> = {
  'code-quality': 'from-violet-500 to-purple-600',
  testing: 'from-green-500 to-emerald-600',
  security: 'from-red-500 to-rose-600',
  performance: 'from-amber-500 to-orange-600',
  requirements: 'from-blue-500 to-indigo-600',
  automation: 'from-cyan-500 to-teal-600',
  seo: 'from-pink-500 to-fuchsia-600',
  content: 'from-emerald-500 to-green-600',
  deployment: 'from-slate-500 to-gray-600',
  data: 'from-indigo-500 to-blue-600',
  design: 'from-purple-500 to-violet-600',
  operations: 'from-rose-500 to-red-600',
}

export default function SkillsPage() {
  const [data, setData] = useState<SkillsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [testKeyword, setTestKeyword] = useState('')
  const [matchedSkills, setMatchedSkills] = useState<SkillData[] | null>(null)

  useEffect(() => {
    fetch('/api/admin/skill-engine')
      .then(res => res.json())
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

  const filteredSkills = data?.skills.filter(s =>
    !activeCategory || s.category === activeCategory
  ) || []

  return (
    <MophyAdminLayout pageTitle="Skills Engine">
      <div className="space-y-6 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/operations" className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-500" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                Skills Engine
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                Auto-activated dev, security, and operations skills — inspired by openclaw, claude-code-templates, and enterprise patterns
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
          </div>
        ) : data ? (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Skills', value: data.total, color: 'text-violet-600' },
                { label: 'Total Actions', value: data.summary.totalActions, color: 'text-blue-600' },
                { label: 'Critical', value: data.summary.criticalSkills, color: 'text-red-600' },
                { label: 'Auto-Triggered', value: data.summary.autoTriggered, color: 'text-green-600' },
              ].map(stat => (
                <Card key={stat.label}>
                  <CardContent className="p-4 text-center">
                    <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                    <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Auto-Activation Tester */}
            <Card>
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Play className="w-4 h-4 text-violet-500" />
                  Test Auto-Activation
                </h3>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={testKeyword}
                    onChange={(e) => setTestKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && testAutoActivation()}
                    placeholder="Type a keyword (e.g., 'security', 'deploy', 'test')..."
                    className="flex-1 px-4 py-2 text-sm bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-violet-200 focus:border-violet-500"
                  />
                  <Button onClick={testAutoActivation} variant="outline" size="sm">
                    <Zap className="w-4 h-4 mr-2" />
                    Test
                  </Button>
                </div>
                {matchedSkills && (
                  <div className="mt-3 p-3 bg-violet-50 dark:bg-violet-900/10 rounded-lg">
                    <p className="text-sm font-medium text-violet-700 dark:text-violet-400 mb-2">
                      {matchedSkills.length} skill{matchedSkills.length !== 1 ? 's' : ''} would activate for &ldquo;{testKeyword}&rdquo;:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {matchedSkills.map(s => (
                        <Badge key={s.id} className="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
                          {s.name}
                        </Badge>
                      ))}
                      {matchedSkills.length === 0 && (
                        <span className="text-sm text-gray-500">No skills match. Try: security, deploy, test, SEO, performance</span>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Category Filters */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveCategory(null)}
                className={`px-3 py-1.5 text-sm font-medium rounded-full transition-all ${
                  !activeCategory
                    ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400'
                    : 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-400 hover:bg-gray-200'
                }`}
              >
                All ({data.total})
              </button>
              {data.categories.filter(c => c.count > 0).map(cat => (
                <button
                  key={cat.category}
                  onClick={() => setActiveCategory(activeCategory === cat.category ? null : cat.category)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-full transition-all ${
                    activeCategory === cat.category
                      ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400'
                      : 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-400 hover:bg-gray-200'
                  }`}
                >
                  {cat.label} ({cat.count})
                </button>
              ))}
            </div>

            {/* Skills List */}
            <div className="space-y-3">
              {filteredSkills.map(skill => {
                const isExpanded = expandedSkill === skill.id
                const gradient = categoryGradient[skill.category] || 'from-gray-500 to-gray-600'

                return (
                  <Card key={skill.id} className="overflow-hidden">
                    <button
                      onClick={() => setExpandedSkill(isExpanded ? null : skill.id)}
                      className="w-full text-left"
                    >
                      <div className="p-4 flex items-center gap-4">
                        <div className={`p-2.5 rounded-xl bg-gradient-to-br ${gradient} text-white flex-shrink-0`}>
                          {iconMap[skill.icon] || <Zap className="w-5 h-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900 dark:text-white">{skill.name}</h3>
                            <Badge className={priorityColor[skill.priority]}>
                              {skill.priority}
                            </Badge>
                            {skill.enabled && (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            )}
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">{skill.description}</p>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-xs text-gray-400">{skill.actions.length} actions</span>
                          {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                        </div>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-gray-100 dark:border-slate-800">
                        {/* Triggers */}
                        <div className="px-4 py-3 bg-gray-50 dark:bg-slate-800/50">
                          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Auto-Activation Triggers</h4>
                          <div className="flex flex-wrap gap-2">
                            {skill.triggers.events?.map(e => (
                              <Badge key={e} variant="secondary" className="text-xs">{e}</Badge>
                            ))}
                            {skill.triggers.filePatterns?.map(p => (
                              <Badge key={p} variant="outline" className="text-xs font-mono">{p}</Badge>
                            ))}
                            {skill.triggers.keywords?.slice(0, 6).map(k => (
                              <Badge key={k} className="bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400 text-xs">{k}</Badge>
                            ))}
                            {skill.triggers.directories?.map(d => (
                              <Badge key={d} variant="outline" className="text-xs font-mono">{d}</Badge>
                            ))}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="p-4 space-y-3">
                          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</h4>
                          {skill.actions.map(action => (
                            <div key={action.id} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-slate-800/30 rounded-lg">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                action.type === 'check' ? 'bg-blue-100 text-blue-600' :
                                action.type === 'generate' ? 'bg-green-100 text-green-600' :
                                action.type === 'fix' ? 'bg-amber-100 text-amber-600' :
                                action.type === 'report' ? 'bg-purple-100 text-purple-600' :
                                action.type === 'validate' ? 'bg-red-100 text-red-600' :
                                'bg-gray-100 text-gray-600'
                              }`}>
                                {action.type === 'check' ? <Search className="w-4 h-4" /> :
                                 action.type === 'generate' ? <Zap className="w-4 h-4" /> :
                                 action.type === 'validate' ? <Shield className="w-4 h-4" /> :
                                 <Settings className="w-4 h-4" />}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">{action.name}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{action.description}</p>
                                <Badge variant="outline" className="text-xs mt-1 capitalize">{action.type}</Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          </>
        ) : (
          <div className="text-center py-20">
            <AlertTriangle className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Failed to load skills</p>
          </div>
        )}
      </div>
    </MophyAdminLayout>
  )
}
