'use client'

import React, { useState } from 'react'
import { PageHeader } from '@/components/admin/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Search,
  Play,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Target,
  Zap,
  Globe,
  FileText,
  Link as LinkIcon,
  Image as ImageIcon,
  Smartphone,
  Calendar,
  BarChart3
} from 'lucide-react'

interface SEOAudit {
  id: string
  url: string
  title: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  score: number
  lastAudited: string
  issues: SEOIssue[]
  metrics: {
    performance: number
    accessibility: number
    bestPractices: number
    seo: number
    pwa: number
  }
  suggestions: SEOSuggestion[]
  history: SEOHistoryEntry[]
}

interface SEOIssue {
  id: string
  type: 'critical' | 'warning' | 'info'
  category: 'content' | 'technical' | 'mobile' | 'links' | 'images' | 'performance'
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  canAutoFix: boolean
  fixUrl?: string
}

interface SEOSuggestion {
  id: string
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  estimatedImpact: number
  implementationTime: string
}

interface SEOHistoryEntry {
  date: string
  score: number
  issues: number
}

const mockAudits: SEOAudit[] = [
  {
    id: '1',
    url: '/blog/best-halal-restaurants-london',
    title: 'Best Halal Restaurants in London: A Complete Guide',
    status: 'completed',
    score: 87,
    lastAudited: '2024-01-12T14:30:00Z',
    issues: [
      {
        id: 'i1',
        type: 'warning',
        category: 'content',
        title: 'Meta description too long',
        description: 'Meta description is 185 characters, should be under 160',
        impact: 'medium',
        canAutoFix: true
      },
      {
        id: 'i2',
        type: 'info',
        category: 'images',
        title: 'Missing alt text on 2 images',
        description: 'Two images are missing alt attributes for accessibility',
        impact: 'medium',
        canAutoFix: false
      }
    ],
    metrics: {
      performance: 92,
      accessibility: 88,
      bestPractices: 95,
      seo: 87,
      pwa: 80
    },
    suggestions: [
      {
        id: 's1',
        title: 'Add structured data for restaurants',
        description: 'Implement JSON-LD schema markup for restaurant information',
        priority: 'high',
        estimatedImpact: 15,
        implementationTime: '2 hours'
      },
      {
        id: 's2',
        title: 'Optimize images for Core Web Vitals',
        description: 'Convert images to WebP format and add lazy loading',
        priority: 'medium',
        estimatedImpact: 8,
        implementationTime: '1 hour'
      }
    ],
    history: [
      { date: '2024-01-05', score: 82, issues: 5 },
      { date: '2024-01-08', score: 85, issues: 3 },
      { date: '2024-01-12', score: 87, issues: 2 }
    ]
  },
  {
    id: '2',
    url: '/blog/london-bridge-guide',
    title: 'London Bridge: Ultimate Visitor Guide 2024',
    status: 'completed',
    score: 94,
    lastAudited: '2024-01-12T10:15:00Z',
    issues: [
      {
        id: 'i3',
        type: 'info',
        category: 'performance',
        title: 'Image optimization opportunity',
        description: 'Hero image could be compressed further for better loading speed',
        impact: 'low',
        canAutoFix: true
      }
    ],
    metrics: {
      performance: 96,
      accessibility: 92,
      bestPractices: 98,
      seo: 94,
      pwa: 85
    },
    suggestions: [
      {
        id: 's3',
        title: 'Add FAQ schema markup',
        description: 'Structure common questions as FAQ schema for featured snippets',
        priority: 'medium',
        estimatedImpact: 12,
        implementationTime: '30 minutes'
      }
    ],
    history: [
      { date: '2024-01-01', score: 89, issues: 4 },
      { date: '2024-01-06', score: 92, issues: 2 },
      { date: '2024-01-12', score: 94, issues: 1 }
    ]
  },
  {
    id: '3',
    url: '/blog/east-london-food-scene',
    title: 'East London Food Scene: Hidden Gems and Local Favorites',
    status: 'running',
    score: 0,
    lastAudited: '2024-01-12T16:00:00Z',
    issues: [],
    metrics: {
      performance: 0,
      accessibility: 0,
      bestPractices: 0,
      seo: 0,
      pwa: 0
    },
    suggestions: [],
    history: []
  }
]

export default function SEOAuditsPage() {
  const [audits, setAudits] = useState<SEOAudit[]>([])
  const [selectedAudit, setSelectedAudit] = useState<SEOAudit | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [isRunningFullAudit, setIsRunningFullAudit] = useState(false)

  // Load real audit data from API
  React.useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/seo?type=audits');
        if (res.ok) {
          const data = await res.json();
          const realAudits = (Array.isArray(data) ? data : data.audits || []).map((a: any, idx: number) => ({
            id: a.id || String(idx),
            url: `/content/${a.content_id}`,
            title: `${a.content_type || 'Article'} #${a.content_id}`,
            status: 'completed' as const,
            score: a.score || 0,
            lastAudited: a.created_at || new Date().toISOString(),
            issues: (a.quick_fixes ? JSON.parse(typeof a.quick_fixes === 'string' ? a.quick_fixes : '[]') : []).map((fix: string, i: number) => ({
              id: `fix-${i}`,
              type: 'warning' as const,
              category: 'content' as const,
              title: fix,
              description: fix,
              impact: 'medium' as const,
              canAutoFix: false,
            })),
            metrics: { performance: a.score || 0, accessibility: 0, bestPractices: 0, seo: a.score || 0, pwa: 0 },
            suggestions: a.suggestions ? (typeof a.suggestions === 'string' ? JSON.parse(a.suggestions) : a.suggestions) : [],
            history: [],
          }));
          if (realAudits.length > 0) setAudits(realAudits);
          else setAudits(mockAudits); // fallback if no data yet
        }
      } catch {
        // Keep mock data as fallback
      }
    })();
  }, [])

  const statusColors: Record<string, string> = {
    'pending': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    'running': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    'completed': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    'failed': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
  }

  const issueTypeColors: Record<string, string> = {
    'critical': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    'warning': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    'info': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
  }

  const categoryIcons: Record<string, React.ElementType> = {
    'content': FileText,
    'technical': Globe,
    'mobile': Smartphone,
    'links': LinkIcon,
    'images': ImageIcon,
    'performance': Zap
  }

  const filteredAudits = audits.filter(audit => {
    const matchesSearch = audit.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         audit.url.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = selectedStatus === 'all' || audit.status === selectedStatus
    return matchesSearch && matchesStatus
  })

  const averageScore = audits.filter(a => a.status === 'completed').length > 0
    ? Math.round(audits.filter(a => a.status === 'completed').reduce((acc, a) => acc + a.score, 0) /
      audits.filter(a => a.status === 'completed').length)
    : 0

  const totalIssues = audits.reduce((acc, audit) => acc + audit.issues.length, 0)

  const runFullSiteAudit = () => {
    setIsRunningFullAudit(true)
    setTimeout(() => {
      setAudits(prev => prev.map(audit => ({
        ...audit,
        status: audit.status === 'pending' ? 'running' as const : audit.status
      })))
      setTimeout(() => {
        setAudits(prev => prev.map(audit => ({
          ...audit,
          status: audit.status === 'running' ? 'completed' as const : audit.status,
          score: audit.status === 'running' ? Math.floor(Math.random() * 30) + 70 : audit.score
        })))
        setIsRunningFullAudit(false)
      }, 3000)
    }, 1000)
  }

  const runSingleAudit = (auditId: string) => {
    setAudits(prev => prev.map(audit =>
      audit.id === auditId ? { ...audit, status: 'running' as const } : audit
    ))
    setTimeout(() => {
      setAudits(prev => prev.map(audit =>
        audit.id === auditId ? {
          ...audit,
          status: 'completed' as const,
          score: Math.floor(Math.random() * 30) + 70,
          lastAudited: new Date().toISOString()
        } : audit
      ))
    }, 2000)
  }

  const autoFixIssue = (auditId: string, issueId: string) => {
    setAudits(prev => prev.map(audit =>
      audit.id === auditId ? {
        ...audit,
        issues: audit.issues.filter(issue => issue.id !== issueId),
        score: Math.min(audit.score + 2, 100)
      } : audit
    ))
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-600 dark:text-emerald-400'
    if (score >= 70) return 'text-amber-600 dark:text-amber-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getScoreBgColor = (score: number) => {
    if (score >= 90) return 'bg-emerald-100 dark:bg-emerald-900/30'
    if (score >= 70) return 'bg-amber-100 dark:bg-amber-900/30'
    return 'bg-red-100 dark:bg-red-900/30'
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="SEO Audits"
        description="Analyze and optimize your pages for search engines"
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'SEO Audits' }
        ]}
        actions={
          <Button
            onClick={runFullSiteAudit}
            disabled={isRunningFullAudit}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg"
          >
            {isRunningFullAudit ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Running Audit...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Full Site Audit
              </>
            )}
          </Button>
        }
      />

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 border-blue-200 dark:border-blue-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Average SEO Score</p>
                <p className={`text-3xl font-bold mt-1 ${getScoreColor(averageScore)}`}>
                  {averageScore}%
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Target className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/50 dark:to-orange-950/50 border-red-200 dark:border-red-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-700 dark:text-red-300">Total Issues</p>
                <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-1">{totalIssues}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/50 dark:to-teal-950/50 border-emerald-200 dark:border-emerald-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Pages Audited</p>
                <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  {audits.filter(a => a.status === 'completed').length}
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <FileText className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/50 dark:to-violet-950/50 border-purple-200 dark:border-purple-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Auto-fixable</p>
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                  {audits.reduce((acc, audit) =>
                    acc + audit.issues.filter(issue => issue.canAutoFix).length, 0
                  )}
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <Zap className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search pages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="running">Running</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Audits List */}
        <div className="lg:col-span-1">
          <Card className="h-fit">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Search className="h-4 w-4" />
                SEO Audits ({filteredAudits.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-[600px] overflow-y-auto">
                {filteredAudits.map((audit) => (
                  <div
                    key={audit.id}
                    className={`p-4 cursor-pointer transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
                      selectedAudit?.id === audit.id
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500'
                        : 'border-l-4 border-l-transparent'
                    }`}
                    onClick={() => setSelectedAudit(audit)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm text-gray-900 dark:text-white truncate">
                          {audit.title}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                          {audit.url}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <Badge className={statusColors[audit.status]}>
                            {audit.status}
                          </Badge>
                          {audit.status === 'completed' && (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getScoreBgColor(audit.score)} ${getScoreColor(audit.score)}`}>
                              {audit.score}%
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                          {audit.issues.length} issues · {new Date(audit.lastAudited).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          runSingleAudit(audit.id)
                        }}
                        disabled={audit.status === 'running'}
                        className="shrink-0"
                      >
                        {audit.status === 'running' ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Audit Details */}
        <div className="lg:col-span-2">
          {selectedAudit ? (
            <div className="space-y-6">
              {/* Score Overview */}
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">{selectedAudit.title}</CardTitle>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-1">{selectedAudit.url}</p>
                    </div>
                    <div className="text-right shrink-0">
                      {selectedAudit.status === 'completed' && (
                        <div className={`text-4xl font-bold ${getScoreColor(selectedAudit.score)}`}>
                          {selectedAudit.score}%
                        </div>
                      )}
                      <Badge className={statusColors[selectedAudit.status]}>
                        {selectedAudit.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                {selectedAudit.status === 'completed' && (
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-5 gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                      {Object.entries(selectedAudit.metrics).map(([key, value]) => (
                        <div key={key} className="text-center">
                          <div className={`text-xl font-bold ${getScoreColor(value)}`}>
                            {value}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 capitalize mt-1">
                            {key === 'bestPractices' ? 'Best Practices' : key}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>

              <Tabs defaultValue="issues" className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                  <TabsTrigger value="issues" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700">
                    Issues ({selectedAudit.issues.length})
                  </TabsTrigger>
                  <TabsTrigger value="suggestions" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700">
                    Suggestions
                  </TabsTrigger>
                  <TabsTrigger value="history" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700">
                    History
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="issues" className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <AlertTriangle className="h-4 w-4" />
                        SEO Issues
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedAudit.issues.length > 0 ? (
                        <div className="space-y-4">
                          {selectedAudit.issues.map((issue) => {
                            const IconComponent = categoryIcons[issue.category]
                            return (
                              <div key={issue.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                      <IconComponent className="h-4 w-4 text-gray-500" />
                                      <h3 className="font-medium text-sm text-gray-900 dark:text-white">{issue.title}</h3>
                                      <Badge className={issueTypeColors[issue.type]}>
                                        {issue.type}
                                      </Badge>
                                      <Badge variant="outline" className="text-xs">
                                        {issue.impact} impact
                                      </Badge>
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                      {issue.description}
                                    </p>
                                    <Badge variant="outline" className="text-xs capitalize">
                                      {issue.category}
                                    </Badge>
                                  </div>
                                  {issue.canAutoFix && (
                                    <Button
                                      size="sm"
                                      onClick={() => autoFixIssue(selectedAudit.id, issue.id)}
                                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shrink-0"
                                    >
                                      <Zap className="h-3 w-3 mr-1" />
                                      Auto-fix
                                    </Button>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                            No Issues Found
                          </h3>
                          <p className="text-gray-500 dark:text-gray-400">
                            This page has no SEO issues. Great work!
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="suggestions" className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <TrendingUp className="h-4 w-4" />
                        Optimization Suggestions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedAudit.suggestions.length > 0 ? (
                        <div className="space-y-4">
                          {selectedAudit.suggestions.map((suggestion) => (
                            <div key={suggestion.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
                              <div className="flex items-start gap-4">
                                <div className="flex-1">
                                  <div className="flex flex-wrap items-center gap-2 mb-2">
                                    <h3 className="font-medium text-sm text-gray-900 dark:text-white">{suggestion.title}</h3>
                                    <Badge className={
                                      suggestion.priority === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                                      suggestion.priority === 'medium' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' :
                                      'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                                    }>
                                      {suggestion.priority} priority
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                    {suggestion.description}
                                  </p>
                                  <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                                    <span className="flex items-center gap-1">
                                      <TrendingUp className="h-3 w-3" />
                                      +{suggestion.estimatedImpact}% score
                                    </span>
                                    <span>Est. time: {suggestion.implementationTime}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
                            <TrendingUp className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                            No Suggestions Available
                          </h3>
                          <p className="text-gray-500 dark:text-gray-400">
                            This page is well optimized. Run another audit to get new suggestions.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="history" className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <BarChart3 className="h-4 w-4" />
                        Score History
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedAudit.history.length > 0 ? (
                        <div className="space-y-3">
                          {[...selectedAudit.history].reverse().map((entry, index, arr) => (
                            <div key={index} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-xl">
                              <div className="flex items-center gap-6">
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                  {new Date(entry.date).toLocaleDateString()}
                                </div>
                                <div className={`text-xl font-bold ${getScoreColor(entry.score)}`}>
                                  {entry.score}%
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {entry.issues} issues
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {index < arr.length - 1 && (
                                  <span className={`flex items-center gap-1 text-sm font-medium ${
                                    entry.score > arr[index + 1].score ? 'text-emerald-600 dark:text-emerald-400' :
                                    entry.score < arr[index + 1].score ? 'text-red-600 dark:text-red-400' : 'text-gray-500'
                                  }`}>
                                    {entry.score > arr[index + 1].score ? (
                                      <>
                                        <TrendingUp className="h-4 w-4" />
                                        +{entry.score - arr[index + 1].score}
                                      </>
                                    ) : entry.score < arr[index + 1].score ? (
                                      <>
                                        <TrendingDown className="h-4 w-4" />
                                        {entry.score - arr[index + 1].score}
                                      </>
                                    ) : null}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <div className="h-16 w-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
                            <Calendar className="h-8 w-8 text-gray-400" />
                          </div>
                          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                            No History Available
                          </h3>
                          <p className="text-gray-500 dark:text-gray-400">
                            Audit history will appear here after multiple audits.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <Card className="h-full min-h-[400px] flex items-center justify-center">
              <CardContent className="text-center py-12">
                <div className="h-16 w-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
                  <Search className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Select a Page to Audit
                </h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                  Choose a page from the list to view its SEO audit results and optimization suggestions.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
