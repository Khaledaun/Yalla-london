'use client'

import React, { useState, useEffect } from 'react'
import { PremiumAdminLayout } from '@/src/components/admin/premium-admin-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Search, 
  Play, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  Calendar,
  Clock,
  Target,
  Zap,
  Globe,
  FileText,
  Link as LinkIcon,
  Image as ImageIcon,
  Smartphone,
  Monitor,
  Users,
  BarChart3,
  Activity
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
  const [audits, setAudits] = useState<SEOAudit[]>(mockAudits)
  const [selectedAudit, setSelectedAudit] = useState<SEOAudit | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [isRunningFullAudit, setIsRunningFullAudit] = useState(false)

  const statusColors = {
    'pending': 'bg-yellow-100 text-yellow-800',
    'running': 'bg-blue-100 text-blue-800',
    'completed': 'bg-green-100 text-green-800',
    'failed': 'bg-red-100 text-red-800'
  }

  const issueTypeColors = {
    'critical': 'bg-red-100 text-red-800',
    'warning': 'bg-yellow-100 text-yellow-800',
    'info': 'bg-blue-100 text-blue-800'
  }

  const categoryIcons = {
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
    
    // Simulate audit process
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
    if (score >= 90) return 'text-green-600'
    if (score >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBgColor = (score: number) => {
    if (score >= 90) return 'bg-green-100'
    if (score >= 70) return 'bg-yellow-100'
    return 'bg-red-100'
  }

  return (
    <PremiumAdminLayout 
      title="SEO Audits"
      breadcrumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'SEO Audits' }
      ]}
      actions={
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={runFullSiteAudit}
            disabled={isRunningFullAudit}
          >
            {isRunningFullAudit ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Full Site Audit
              </>
            )}
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Average SEO Score</p>
                  <p className={`text-2xl font-bold ${getScoreColor(averageScore)}`}>
                    {averageScore}%
                  </p>
                </div>
                <Target className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Issues</p>
                  <p className="text-2xl font-bold text-red-600">{totalIssues}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pages Audited</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {audits.filter(a => a.status === 'completed').length}
                  </p>
                </div>
                <FileText className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Auto-fixable</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {audits.reduce((acc, audit) => 
                      acc + audit.issues.filter(issue => issue.canAutoFix).length, 0
                    )}
                  </p>
                </div>
                <Zap className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-4">
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
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
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

        {/* Audits List */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Audits List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  SEO Audits ({filteredAudits.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-2">
                  {filteredAudits.map((audit) => (
                    <div 
                      key={audit.id}
                      className={`p-3 cursor-pointer border-l-4 hover:bg-gray-50 ${
                        selectedAudit?.id === audit.id 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-transparent'
                      }`}
                      onClick={() => setSelectedAudit(audit)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm text-gray-900 truncate">
                            {audit.title}
                          </h3>
                          <p className="text-xs text-gray-500 truncate mt-1">
                            {audit.url}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge className={statusColors[audit.status]}>
                              {audit.status}
                            </Badge>
                            {audit.status === 'completed' && (
                              <div className={`px-2 py-1 rounded text-xs font-medium ${getScoreBgColor(audit.score)}`}>
                                {audit.score}%
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                            <span>{audit.issues.length} issues</span>
                            <span>{new Date(audit.lastAudited).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            runSingleAudit(audit.id)
                          }}
                          disabled={audit.status === 'running'}
                        >
                          {audit.status === 'running' ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                          ) : (
                            <Play className="h-3 w-3" />
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
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{selectedAudit.title}</CardTitle>
                        <p className="text-sm text-gray-600">{selectedAudit.url}</p>
                      </div>
                      <div className="text-right">
                        {selectedAudit.status === 'completed' && (
                          <div className={`text-3xl font-bold ${getScoreColor(selectedAudit.score)}`}>
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
                    <CardContent>
                      <div className="grid grid-cols-5 gap-4">
                        {Object.entries(selectedAudit.metrics).map(([key, value]) => (
                          <div key={key} className="text-center">
                            <div className={`text-lg font-bold ${getScoreColor(value)}`}>
                              {value}
                            </div>
                            <div className="text-xs text-gray-500 capitalize">
                              {key === 'bestPractices' ? 'Best Practices' : key}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>

                <Tabs defaultValue="issues">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="issues">Issues ({selectedAudit.issues.length})</TabsTrigger>
                    <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
                    <TabsTrigger value="history">History</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="issues" className="mt-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5" />
                          SEO Issues
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {selectedAudit.issues.length > 0 ? (
                          <div className="space-y-4">
                            {selectedAudit.issues.map((issue) => {
                              const IconComponent = categoryIcons[issue.category]
                              return (
                                <div key={issue.id} className="border rounded-lg p-4">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-3 mb-2">
                                        <IconComponent className="h-4 w-4 text-gray-600" />
                                        <h3 className="font-medium text-sm">{issue.title}</h3>
                                        <Badge className={issueTypeColors[issue.type]}>
                                          {issue.type}
                                        </Badge>
                                        <Badge variant="outline" className="text-xs">
                                          {issue.impact} impact
                                        </Badge>
                                      </div>
                                      <p className="text-sm text-gray-600 mb-2">
                                        {issue.description}
                                      </p>
                                      <Badge variant="outline" className="text-xs">
                                        {issue.category}
                                      </Badge>
                                    </div>
                                    {issue.canAutoFix && (
                                      <Button 
                                        size="sm"
                                        onClick={() => autoFixIssue(selectedAudit.id, issue.id)}
                                        className="bg-blue-600 hover:bg-blue-700"
                                      >
                                        <Zap className="h-4 w-4 mr-2" />
                                        Auto-fix
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                              No Issues Found
                            </h3>
                            <p className="text-gray-500">
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
                        <CardTitle className="flex items-center gap-2">
                          <TrendingUp className="h-5 w-5" />
                          Optimization Suggestions
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {selectedAudit.suggestions.length > 0 ? (
                          <div className="space-y-4">
                            {selectedAudit.suggestions.map((suggestion) => (
                              <div key={suggestion.id} className="border rounded-lg p-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                      <h3 className="font-medium text-sm">{suggestion.title}</h3>
                                      <Badge className={
                                        suggestion.priority === 'high' ? 'bg-red-100 text-red-800' :
                                        suggestion.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-blue-100 text-blue-800'
                                      }>
                                        {suggestion.priority} priority
                                      </Badge>
                                    </div>
                                    <p className="text-sm text-gray-600 mb-2">
                                      {suggestion.description}
                                    </p>
                                    <div className="flex items-center gap-4 text-xs text-gray-500">
                                      <span>Impact: +{suggestion.estimatedImpact}% score</span>
                                      <span>Time: {suggestion.implementationTime}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <TrendingUp className="h-12 w-12 text-green-500 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                              No Suggestions Available
                            </h3>
                            <p className="text-gray-500">
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
                        <CardTitle className="flex items-center gap-2">
                          <BarChart3 className="h-5 w-5" />
                          Score History
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {selectedAudit.history.length > 0 ? (
                          <div className="space-y-4">
                            {selectedAudit.history.reverse().map((entry, index) => (
                              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                                <div className="flex items-center gap-4">
                                  <div className="text-sm text-gray-600">
                                    {new Date(entry.date).toLocaleDateString()}
                                  </div>
                                  <div className={`text-lg font-bold ${getScoreColor(entry.score)}`}>
                                    {entry.score}%
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {entry.issues} issues
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {index > 0 && selectedAudit.history[index - 1] && (
                                    <div className={`flex items-center gap-1 text-xs ${
                                      entry.score > selectedAudit.history[index - 1].score ? 'text-green-600' : 
                                      entry.score < selectedAudit.history[index - 1].score ? 'text-red-600' : 'text-gray-500'
                                    }`}>
                                      {entry.score > selectedAudit.history[index - 1].score ? (
                                        <TrendingUp className="h-3 w-3" />
                                      ) : entry.score < selectedAudit.history[index - 1].score ? (
                                        <TrendingDown className="h-3 w-3" />
                                      ) : null}
                                      {entry.score !== selectedAudit.history[index - 1].score && (
                                        <span>
                                          {entry.score > selectedAudit.history[index - 1].score ? '+' : ''}
                                          {entry.score - selectedAudit.history[index - 1].score}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                              No History Available
                            </h3>
                            <p className="text-gray-500">
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
              <Card>
                <CardContent className="p-12 text-center">
                  <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Select a Page to Audit
                  </h3>
                  <p className="text-gray-500">
                    Choose a page from the list to view its SEO audit results.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </PremiumAdminLayout>
  )
}