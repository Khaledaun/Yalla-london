'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Search,
  TrendingUp,
  Link,
  Target,
  AlertTriangle,
  CheckCircle,
  Clock,
  Globe,
  BarChart3,
  Zap,
  Eye,
  Download,
  RefreshCw,
  ExternalLink,
  Filter,
  Plus,
  FileText
} from 'lucide-react'
import { toast } from 'sonner'

interface SEOHealth {
  overallScore: number
  pageSpeed: number
  mobileFriendly: number
  coreWebVitals: number
  lastChecked: string
}

interface Backlink {
  id: string
  url: string
  domain: string
  authority: number
  anchorText: string
  foundDate: string
  status: 'active' | 'lost' | 'new'
}

interface ArticleSEO {
  id: string
  title: string
  url: string
  seoScore: number
  keywords: string[]
  issues: string[]
  lastAudit: string
}

interface CrawlResult {
  url: string
  status: 'success' | 'error' | 'warning'
  issues: string[]
  score: number
  lastCrawled: string
}

export default function SEOCommandCenter() {
  const [seoHealth, setSeoHealth] = useState<SEOHealth>({
    overallScore: 87,
    pageSpeed: 92,
    mobileFriendly: 95,
    coreWebVitals: 89,
    lastChecked: '2024-01-15 14:30:00'
  })

  const [backlinks, setBacklinks] = useState<Backlink[]>([
    {
      id: '1',
      url: 'https://example.com/london-guide',
      domain: 'example.com',
      authority: 85,
      anchorText: 'Best London Restaurants',
      foundDate: '2024-01-15',
      status: 'active'
    },
    {
      id: '2',
      url: 'https://travelblog.com/london-tips',
      domain: 'travelblog.com',
      authority: 72,
      anchorText: 'London Hidden Gems',
      foundDate: '2024-01-14',
      status: 'new'
    },
    {
      id: '3',
      url: 'https://foodie.com/london-dining',
      domain: 'foodie.com',
      authority: 68,
      anchorText: 'Yalla London Restaurant Guide',
      foundDate: '2024-01-13',
      status: 'active'
    }
  ])

  const [articleSEO, setArticleSEO] = useState<ArticleSEO[]>([
    {
      id: '1',
      title: 'Best London Restaurants 2024',
      url: '/blog/best-london-restaurants-2024',
      seoScore: 92,
      keywords: ['london restaurants', 'best dining london', 'london food guide'],
      issues: ['Missing meta description'],
      lastAudit: '2024-01-15'
    },
    {
      id: '2',
      title: 'Hidden Gems in London',
      url: '/blog/hidden-gems-london',
      seoScore: 87,
      keywords: ['hidden gems london', 'london attractions', 'off beaten path'],
      issues: ['Title too long', 'Missing alt tags'],
      lastAudit: '2024-01-14'
    },
    {
      id: '3',
      title: 'London Events Guide',
      url: '/blog/london-events-guide',
      seoScore: 89,
      keywords: ['london events', 'london guide', 'things to do london'],
      issues: ['Low keyword density'],
      lastAudit: '2024-01-13'
    }
  ])

  const [crawlResults, setCrawlResults] = useState<CrawlResult[]>([])
  const [isCrawling, setIsCrawling] = useState(false)
  const [crawlProgress, setCrawlProgress] = useState(0)

  const startCrawl = async () => {
    setIsCrawling(true)
    setCrawlProgress(0)
    
    try {
      // Simulate crawling process
      for (let i = 0; i <= 100; i += 10) {
        setCrawlProgress(i)
        await new Promise(resolve => setTimeout(resolve, 200))
      }

      // Simulate crawl results
      const newResults: CrawlResult[] = [
        {
          url: 'https://yalla-london.com',
          status: 'success',
          issues: [],
          score: 95,
          lastCrawled: new Date().toISOString()
        },
        {
          url: 'https://yalla-london.com/blog',
          status: 'warning',
          issues: ['Missing meta description', 'Slow loading images'],
          score: 78,
          lastCrawled: new Date().toISOString()
        },
        {
          url: 'https://yalla-london.com/recommendations',
          status: 'success',
          issues: [],
          score: 92,
          lastCrawled: new Date().toISOString()
        }
      ]

      setCrawlResults(newResults)
      toast.success('SEO crawl completed successfully!')
    } catch (error) {
      toast.error('SEO crawl failed')
    } finally {
      setIsCrawling(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBadge = (score: number) => {
    if (score >= 90) return <Badge className="bg-green-500">Excellent</Badge>
    if (score >= 70) return <Badge className="bg-yellow-500">Good</Badge>
    return <Badge className="bg-red-500">Needs Work</Badge>
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  const getBacklinkStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Active</Badge>
      case 'new':
        return <Badge className="bg-blue-500">New</Badge>
      case 'lost':
        return <Badge className="bg-red-500">Lost</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Search className="h-8 w-8 text-yellow-500" />
                SEO Command Center
              </h1>
              <p className="text-gray-600 mt-1">Monitor SEO health, backlinks, and optimization</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={startCrawl}
                disabled={isCrawling}
                className="bg-yellow-500 hover:bg-yellow-600"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isCrawling ? 'animate-spin' : ''}`} />
                {isCrawling ? 'Crawling...' : 'Start SEO Crawl'}
              </Button>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* SEO Health Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-100 text-sm">Overall SEO Score</p>
                  <p className="text-3xl font-bold">{seoHealth.overallScore}/100</p>
                </div>
                <BarChart3 className="h-8 w-8 text-yellow-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Page Speed</p>
                  <p className="text-3xl font-bold">{seoHealth.pageSpeed}/100</p>
                </div>
                <Zap className="h-8 w-8 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Mobile Friendly</p>
                  <p className="text-3xl font-bold">{seoHealth.mobileFriendly}/100</p>
                </div>
                <Globe className="h-8 w-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Core Web Vitals</p>
                  <p className="text-3xl font-bold">{seoHealth.coreWebVitals}/100</p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="backlinks">Backlinks</TabsTrigger>
            <TabsTrigger value="articles">Article SEO</TabsTrigger>
            <TabsTrigger value="crawl">Crawl Results</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-yellow-500" />
                    SEO Health Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Overall Score</span>
                    <div className="flex items-center gap-2">
                      <Progress value={seoHealth.overallScore} className="w-20" />
                      <span className={getScoreColor(seoHealth.overallScore)}>
                        {seoHealth.overallScore}/100
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Page Speed</span>
                    <div className="flex items-center gap-2">
                      <Progress value={seoHealth.pageSpeed} className="w-20" />
                      <span className={getScoreColor(seoHealth.pageSpeed)}>
                        {seoHealth.pageSpeed}/100
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Mobile Friendly</span>
                    <div className="flex items-center gap-2">
                      <Progress value={seoHealth.mobileFriendly} className="w-20" />
                      <span className={getScoreColor(seoHealth.mobileFriendly)}>
                        {seoHealth.mobileFriendly}/100
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Core Web Vitals</span>
                    <div className="flex items-center gap-2">
                      <Progress value={seoHealth.coreWebVitals} className="w-20" />
                      <span className={getScoreColor(seoHealth.coreWebVitals)}>
                        {seoHealth.coreWebVitals}/100
                      </span>
                    </div>
                  </div>
                  <div className="pt-4 border-t">
                    <p className="text-sm text-gray-600">
                      Last checked: {seoHealth.lastChecked}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Link className="h-5 w-5 text-yellow-500" />
                    Backlink Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>Total Backlinks</span>
                      <span className="font-bold text-2xl">{backlinks.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Active Links</span>
                      <span className="font-bold text-green-600">
                        {backlinks.filter(b => b.status === 'active').length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>New This Week</span>
                      <span className="font-bold text-blue-600">
                        {backlinks.filter(b => b.status === 'new').length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Average Authority</span>
                      <span className="font-bold">
                        {Math.round(backlinks.reduce((sum, b) => sum + b.authority, 0) / backlinks.length)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Backlinks Tab */}
          <TabsContent value="backlinks" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link className="h-5 w-5 text-yellow-500" />
                  Backlink Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {backlinks.map((backlink) => (
                    <div key={backlink.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <ExternalLink className="h-4 w-4 text-gray-400" />
                            <a
                              href={backlink.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              {backlink.url}
                            </a>
                          </div>
                          <div className="text-sm text-gray-600 mb-2">
                            Anchor: "{backlink.anchorText}"
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>Domain: {backlink.domain}</span>
                            <span>Authority: {backlink.authority}</span>
                            <span>Found: {backlink.foundDate}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getBacklinkStatusBadge(backlink.status)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Article SEO Tab */}
          <TabsContent value="articles" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-yellow-500" />
                  Article SEO Scores
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {articleSEO.map((article) => (
                    <div key={article.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-2">{article.title}</h3>
                          <div className="text-sm text-gray-600 mb-2">
                            URL: {article.url}
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm">Keywords:</span>
                            {article.keywords.map((keyword) => (
                              <Badge key={keyword} variant="outline" className="text-xs">
                                {keyword}
                              </Badge>
                            ))}
                          </div>
                          {article.issues.length > 0 && (
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-red-600">Issues:</span>
                              {article.issues.map((issue) => (
                                <Badge key={issue} variant="destructive" className="text-xs">
                                  {issue}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className="text-right">
                            <div className={`text-2xl font-bold ${getScoreColor(article.seoScore)}`}>
                              {article.seoScore}/100
                            </div>
                            {getScoreBadge(article.seoScore)}
                          </div>
                          <div className="text-xs text-gray-500">
                            Last audit: {article.lastAudit}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Crawl Results Tab */}
          <TabsContent value="crawl" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-yellow-500" />
                  SEO Crawl Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isCrawling ? (
                  <div className="space-y-4">
                    <div className="text-center">
                      <RefreshCw className="h-8 w-8 animate-spin text-yellow-500 mx-auto mb-4" />
                      <p className="text-gray-600">Crawling your website...</p>
                      <Progress value={crawlProgress} className="mt-4" />
                      <p className="text-sm text-gray-500 mt-2">{crawlProgress}% complete</p>
                    </div>
                  </div>
                ) : crawlResults.length > 0 ? (
                  <div className="space-y-4">
                    {crawlResults.map((result, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {getStatusIcon(result.status)}
                            <div>
                              <div className="font-medium">{result.url}</div>
                              <div className="text-sm text-gray-600">
                                Last crawled: {new Date(result.lastCrawled).toLocaleString()}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-lg font-bold ${getScoreColor(result.score)}`}>
                              {result.score}/100
                            </span>
                            {getScoreBadge(result.score)}
                          </div>
                        </div>
                        {result.issues.length > 0 && (
                          <div className="mt-3 pt-3 border-t">
                            <div className="text-sm text-red-600 mb-2">Issues found:</div>
                            <div className="flex flex-wrap gap-2">
                              {result.issues.map((issue, issueIndex) => (
                                <Badge key={issueIndex} variant="destructive" className="text-xs">
                                  {issue}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Crawl Results</h3>
                    <p className="text-gray-600 mb-4">Start an SEO crawl to analyze your website</p>
                    <Button onClick={startCrawl} className="bg-yellow-500 hover:bg-yellow-600">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Start SEO Crawl
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
