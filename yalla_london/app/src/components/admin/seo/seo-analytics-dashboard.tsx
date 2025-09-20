'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card'
import { Button } from '@/src/components/ui/button'
import { Progress } from '@/src/components/ui/progress'
import { Badge } from '@/src/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/src/components/ui/tabs'
import { Alert, AlertDescription } from '@/src/components/ui/alert'
import { 
  BarChart3, 
  TrendingUp, 
  Search, 
  Link, 
  AlertTriangle, 
  CheckCircle, 
  ArrowUp, 
  ArrowDown, 
  Target,
  Globe,
  Users,
  Eye,
  RefreshCw
} from 'lucide-react'
import { useToast } from '@/src/components/ui/use-toast'

interface SEOMetrics {
  overall_score: number
  indexed_pages: number
  average_loading_speed: number
  mobile_friendly_score: number
  core_web_vitals: {
    lcp: number // Largest Contentful Paint
    fid: number // First Input Delay
    cls: number // Cumulative Layout Shift
  }
  backlinks: {
    total: number
    referring_domains: number
    internal_links: number
  }
  keywords: {
    total_tracked: number
    ranking_top_10: number
    ranking_top_100: number
    average_position: number
  }
}

interface AnalyticsData {
  page_views: number
  unique_visitors: number
  bounce_rate: number
  average_session_duration: number
  conversion_rate: number
  traffic_sources: {
    organic: number
    direct: number
    referral: number
    social: number
  }
  top_pages: Array<{
    url: string
    views: number
    bounce_rate: number
  }>
  search_queries: Array<{
    query: string
    impressions: number
    clicks: number
    ctr: number
    position: number
  }>
}

interface SEOIssue {
  id: string
  type: 'error' | 'warning' | 'info'
  title: string
  description: string
  affected_pages: number
  impact: 'high' | 'medium' | 'low'
  fix_suggestion: string
}

export default function SEOAnalyticsDashboard() {
  const [seoMetrics, setSeoMetrics] = useState<SEOMetrics | null>(null)
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [seoIssues, setSeoIssues] = useState<SEOIssue[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedTimeRange, setSelectedTimeRange] = useState('30d')
  const { toast } = useToast()

  useEffect(() => {
    fetchDashboardData()
  }, [selectedTimeRange])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Fetch SEO metrics
      const seoResponse = await fetch(`/api/admin/seo/metrics?period=${selectedTimeRange}`)
      if (seoResponse.ok) {
        const seoData = await seoResponse.json()
        setSeoMetrics(seoData.data)
      }

      // Fetch analytics data
      const analyticsResponse = await fetch(`/api/admin/analytics/snapshots?period=${selectedTimeRange}`)
      if (analyticsResponse.ok) {
        const analyticsData = await analyticsResponse.json()
        setAnalyticsData(analyticsData.data)
      }

      // Fetch SEO issues
      const issuesResponse = await fetch('/api/admin/seo/audit?include_suggestions=true')
      if (issuesResponse.ok) {
        const issuesData = await issuesResponse.json()
        setSeoIssues(issuesData.suggestions || [])
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const refreshData = async () => {
    setRefreshing(true)
    try {
      // Trigger analytics refresh
      await fetch('/api/admin/analytics/snapshots', { method: 'POST' })
      
      // Trigger SEO audit
      await fetch('/api/admin/seo/audit', { method: 'POST' })
      
      toast({
        title: "Refresh started",
        description: "Analytics and SEO data refresh has been triggered"
      })
      
      // Refetch data after a delay
      setTimeout(() => {
        fetchDashboardData()
      }, 3000)
      
    } catch (error) {
      toast({
        title: "Refresh failed",
        description: "Failed to refresh analytics data",
        variant: "destructive"
      })
    } finally {
      setRefreshing(false)
    }
  }

  if (loading && !seoMetrics && !analyticsData) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        <span>Loading dashboard...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">SEO & Analytics Dashboard</h1>
          <p className="text-gray-600">Monitor your site's performance and SEO health</p>
        </div>
        <div className="flex gap-2">
          <select 
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <Button onClick={refreshData} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="SEO Score"
          value={seoMetrics?.overall_score || 0}
          suffix="/100"
          icon={<Target className="h-5 w-5" />}
          trend={5}
          color="blue"
        />
        <MetricCard
          title="Indexed Pages"
          value={seoMetrics?.indexed_pages || 0}
          icon={<Globe className="h-5 w-5" />}
          trend={2}
          color="green"
        />
        <MetricCard
          title="Monthly Visitors"
          value={analyticsData?.unique_visitors || 0}
          icon={<Users className="h-5 w-5" />}
          trend={-3}
          color="purple"
        />
        <MetricCard
          title="Page Views"
          value={analyticsData?.page_views || 0}
          icon={<Eye className="h-5 w-5" />}
          trend={8}
          color="orange"
        />
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="seo">SEO Analysis</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="issues">Issues & Fixes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* SEO Health */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  SEO Health
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>Overall Score</span>
                    <div className="flex items-center gap-2">
                      <Progress value={seoMetrics?.overall_score || 0} className="w-20" />
                      <span className="font-medium">{seoMetrics?.overall_score || 0}/100</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Mobile Friendly</span>
                    <div className="flex items-center gap-2">
                      <Progress value={seoMetrics?.mobile_friendly_score || 0} className="w-20" />
                      <span className="font-medium">{seoMetrics?.mobile_friendly_score || 0}/100</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Core Web Vitals</span>
                    <div className="flex gap-1">
                      <Badge variant={seoMetrics?.core_web_vitals?.lcp && seoMetrics.core_web_vitals.lcp < 2.5 ? "default" : "destructive"}>
                        LCP: {seoMetrics?.core_web_vitals?.lcp || 0}s
                      </Badge>
                      <Badge variant={seoMetrics?.core_web_vitals?.fid && seoMetrics.core_web_vitals.fid < 100 ? "default" : "destructive"}>
                        FID: {seoMetrics?.core_web_vitals?.fid || 0}ms
                      </Badge>
                      <Badge variant={seoMetrics?.core_web_vitals?.cls && seoMetrics.core_web_vitals.cls < 0.1 ? "default" : "destructive"}>
                        CLS: {seoMetrics?.core_web_vitals?.cls || 0}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Traffic Sources */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Traffic Sources
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analyticsData?.traffic_sources && (
                  <div className="space-y-3">
                    {Object.entries(analyticsData.traffic_sources).map(([source, percentage]) => (
                      <div key={source} className="flex justify-between items-center">
                        <span className="capitalize">{source}</span>
                        <div className="flex items-center gap-2">
                          <Progress value={percentage} className="w-20" />
                          <span className="font-medium">{percentage}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Issues */}
          <Card>
            <CardHeader>
              <CardTitle>Recent SEO Issues</CardTitle>
              <CardDescription>
                Critical issues that need immediate attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              {seoIssues.length === 0 ? (
                <div className="text-center py-6">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                  <p className="text-gray-600">No critical SEO issues found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {seoIssues.slice(0, 5).map((issue) => (
                    <div key={issue.id} className="flex items-start gap-3 p-3 border rounded-lg">
                      <div className="flex-shrink-0 mt-1">
                        {issue.type === 'error' ? (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        ) : issue.type === 'warning' ? (
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        ) : (
                          <CheckCircle className="h-4 w-4 text-blue-500" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{issue.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{issue.description}</p>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {issue.impact} impact
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {issue.affected_pages} pages
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seo" className="space-y-4">
          {/* SEO detailed metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Keyword Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {seoMetrics?.keywords?.total_tracked || 0}
                    </div>
                    <div className="text-sm text-gray-600">Total Keywords</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {seoMetrics?.keywords?.ranking_top_10 || 0}
                    </div>
                    <div className="text-sm text-gray-600">Top 10 Rankings</div>
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <div className="flex justify-between">
                    <span>Average Position</span>
                    <span className="font-medium">#{seoMetrics?.keywords?.average_position || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Backlink Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {seoMetrics?.backlinks?.total || 0}
                    </div>
                    <div className="text-sm text-gray-600">Total Backlinks</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-indigo-600">
                      {seoMetrics?.backlinks?.referring_domains || 0}
                    </div>
                    <div className="text-sm text-gray-600">Referring Domains</div>
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <div className="flex justify-between">
                    <span>Internal Links</span>
                    <span className="font-medium">{seoMetrics?.backlinks?.internal_links || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {/* Analytics detailed data */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Pages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analyticsData?.top_pages?.map((page, index) => (
                    <div key={index} className="flex justify-between items-center p-2 border-b">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{page.url}</p>
                        <p className="text-xs text-gray-500">{page.views} views</p>
                      </div>
                      <Badge variant="outline">
                        {page.bounce_rate}% bounce
                      </Badge>
                    </div>
                  )) || (
                    <div className="text-center py-4 text-gray-500">
                      No page data available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Search Queries</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analyticsData?.search_queries?.map((query, index) => (
                    <div key={index} className="flex justify-between items-center p-2 border-b">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{query.query}</p>
                        <p className="text-xs text-gray-500">
                          {query.impressions} impressions • {query.clicks} clicks
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline">#{query.position}</Badge>
                        <p className="text-xs text-gray-500 mt-1">{query.ctr}% CTR</p>
                      </div>
                    </div>
                  )) || (
                    <div className="text-center py-4 text-gray-500">
                      No search query data available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="issues" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>SEO Issues & Recommendations</CardTitle>
              <CardDescription>
                Detailed analysis and actionable recommendations to improve your SEO
              </CardDescription>
            </CardHeader>
            <CardContent>
              {seoIssues.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Great job!</h3>
                  <p className="text-gray-600">No SEO issues detected at this time.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {seoIssues.map((issue) => (
                    <Alert key={issue.id} className={`
                      ${issue.type === 'error' ? 'border-red-200 bg-red-50' :
                        issue.type === 'warning' ? 'border-yellow-200 bg-yellow-50' :
                        'border-blue-200 bg-blue-50'}
                    `}>
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">
                          {issue.type === 'error' ? (
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                          ) : issue.type === 'warning' ? (
                            <AlertTriangle className="h-5 w-5 text-yellow-500" />
                          ) : (
                            <CheckCircle className="h-5 w-5 text-blue-500" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold">{issue.title}</h4>
                            <Badge variant={
                              issue.impact === 'high' ? 'destructive' :
                              issue.impact === 'medium' ? 'default' : 'secondary'
                            }>
                              {issue.impact} impact
                            </Badge>
                            <Badge variant="outline">
                              {issue.affected_pages} pages affected
                            </Badge>
                          </div>
                          <AlertDescription className="mb-3">
                            {issue.description}
                          </AlertDescription>
                          <div className="bg-white p-3 rounded border">
                            <h5 className="font-medium text-sm mb-1">💡 Recommendation:</h5>
                            <p className="text-sm text-gray-700">{issue.fix_suggestion}</p>
                          </div>
                        </div>
                      </div>
                    </Alert>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

interface MetricCardProps {
  title: string
  value: number
  suffix?: string
  icon: React.ReactNode
  trend?: number
  color: 'blue' | 'green' | 'purple' | 'orange'
}

function MetricCard({ title, value, suffix = '', icon, trend, color }: MetricCardProps) {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-100',
    green: 'text-green-600 bg-green-100',
    purple: 'text-purple-600 bg-purple-100',
    orange: 'text-orange-600 bg-orange-100'
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <div className="flex items-baseline gap-1">
              <p className="text-2xl font-bold">
                {value.toLocaleString()}
              </p>
              {suffix && (
                <span className="text-sm text-gray-500">{suffix}</span>
              )}
            </div>
            {trend !== undefined && (
              <div className="flex items-center gap-1 mt-1">
                {trend > 0 ? (
                  <ArrowUp className="h-3 w-3 text-green-500" />
                ) : trend < 0 ? (
                  <ArrowDown className="h-3 w-3 text-red-500" />
                ) : null}
                <span className={`text-xs ${
                  trend > 0 ? 'text-green-600' : 
                  trend < 0 ? 'text-red-600' : 
                  'text-gray-500'
                }`}>
                  {trend > 0 ? '+' : ''}{trend}%
                </span>
              </div>
            )}
          </div>
          <div className={`p-3 rounded-full ${colorClasses[color]}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}