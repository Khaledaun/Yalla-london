'use client'

import { useState, useEffect } from 'react'
import { 
  Search, 
  AlertTriangle, 
  CheckCircle, 
  ExternalLink, 
  RefreshCw, 
  Filter,
  Download,
  Eye,
  Settings,
  TrendingUp,
  Globe,
  FileText,
  Image,
  Link,
  Clock
} from 'lucide-react'

interface SeoIssue {
  id: string
  type: 'missing_meta' | 'thin_content' | 'weak_structure' | 'keyword_dilution' | 'internal_links' | 'image_alt' | 'slow_loading'
  severity: 'high' | 'medium' | 'low'
  title: string
  description: string
  pageUrl: string
  suggestions: string[]
  quickFix?: {
    action: string
    automated: boolean
  }
  status: 'pending' | 'reviewed' | 'fixed' | 'ignored'
  detectedAt: string
}

interface CrawlerStats {
  totalPages: number
  indexedPages: number
  issuesFound: number
  lastCrawl: string
  avgLoadTime: number
  mobileFriendly: number
}

export default function SeoCommandCenter() {
  const [activeTab, setActiveTab] = useState<'overview' | 'issues' | 'crawler' | 'quick-fixes' | 'analytics'>('overview')
  const [issues, setIssues] = useState<SeoIssue[]>([])
  const [stats, setStats] = useState<CrawlerStats>({
    totalPages: 0,
    indexedPages: 0,
    issuesFound: 0,
    lastCrawl: '',
    avgLoadTime: 0,
    mobileFriendly: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all')

  useEffect(() => {
    loadSeoData()
  }, [])

  const loadSeoData = async () => {
    setIsLoading(true)
    try {
      // Mock data for now - will be replaced with real API calls
      const mockIssues: SeoIssue[] = [
        {
          id: '1',
          type: 'missing_meta',
          severity: 'high',
          title: 'Missing Meta Description',
          description: 'Page lacks a meta description which is crucial for search engine snippets',
          pageUrl: '/blog/london-attractions',
          suggestions: ['Add a compelling meta description between 150-160 characters', 'Include primary keyword naturally'],
          quickFix: { action: 'Generate meta description', automated: true },
          status: 'pending',
          detectedAt: '2024-01-15T10:30:00Z'
        },
        {
          id: '2',
          type: 'thin_content',
          severity: 'medium',
          title: 'Thin Content Detected',
          description: 'Page content is below recommended word count for comprehensive coverage',
          pageUrl: '/events/summer-festival',
          suggestions: ['Expand content to at least 800 words', 'Add more detailed information about the event'],
          status: 'pending',
          detectedAt: '2024-01-15T09:15:00Z'
        },
        {
          id: '3',
          type: 'image_alt',
          severity: 'low',
          title: 'Missing Alt Text',
          description: 'Images without alt text affect accessibility and SEO',
          pageUrl: '/recommendations/restaurants',
          suggestions: ['Add descriptive alt text to all images', 'Include relevant keywords in alt text'],
          quickFix: { action: 'Generate alt text', automated: true },
          status: 'pending',
          detectedAt: '2024-01-15T08:45:00Z'
        }
      ]

      const mockStats: CrawlerStats = {
        totalPages: 45,
        indexedPages: 38,
        issuesFound: 12,
        lastCrawl: '2024-01-15T06:00:00Z',
        avgLoadTime: 2.3,
        mobileFriendly: 95
      }

      setIssues(mockIssues)
      setStats(mockStats)
    } catch (error) {
      console.error('Failed to load SEO data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-50'
      case 'medium': return 'text-yellow-600 bg-yellow-50'
      case 'low': return 'text-blue-600 bg-blue-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high': return <AlertTriangle className="h-4 w-4" />
      case 'medium': return <AlertTriangle className="h-4 w-4" />
      case 'low': return <CheckCircle className="h-4 w-4" />
      default: return <AlertTriangle className="h-4 w-4" />
    }
  }

  const filteredIssues = issues.filter(issue => 
    filter === 'all' || issue.severity === filter
  )

  const handleQuickFix = async (issueId: string) => {
    // Implement quick fix logic
    console.log('Applying quick fix for issue:', issueId)
  }

  const runCrawler = async () => {
    setIsLoading(true)
    try {
      // Implement crawler logic
      console.log('Running SEO crawler...')
      await new Promise(resolve => setTimeout(resolve, 2000)) // Simulate crawler
      loadSeoData()
    } catch (error) {
      console.error('Crawler failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading && issues.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 animate-spin text-purple-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900">Loading SEO Command Center...</h2>
          <p className="text-gray-600">Analyzing your site's SEO health</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Search className="h-8 w-8 text-purple-500" />
            SEO Command Center
          </h1>
          <p className="text-gray-600 mt-1">Monitor, analyze, and optimize your site's SEO performance</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={runCrawler}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Run Crawler
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
            <Settings className="h-4 w-4" />
            Settings
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Pages</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalPages}</p>
            </div>
            <Globe className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Indexed Pages</p>
              <p className="text-2xl font-bold text-gray-900">{stats.indexedPages}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Issues Found</p>
              <p className="text-2xl font-bold text-gray-900">{stats.issuesFound}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Load Time</p>
              <p className="text-2xl font-bold text-gray-900">{stats.avgLoadTime}s</p>
            </div>
            <Clock className="h-8 w-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: TrendingUp },
            { id: 'issues', label: 'Issues', icon: AlertTriangle },
            { id: 'crawler', label: 'Crawler', icon: Globe },
            { id: 'analytics', label: 'Analytics', icon: TrendingUp },
            { id: 'quick-fixes', label: 'Quick Fixes', icon: CheckCircle }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">SEO Health Score</h3>
              <div className="text-center">
                <div className="text-4xl font-bold text-green-600 mb-2">87</div>
                <p className="text-gray-600">Good</p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '87%' }}></div>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Fixed 3 missing meta descriptions</span>
                  <span className="text-gray-500">2 hours ago</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <span>Found 2 new thin content pages</span>
                  <span className="text-gray-500">4 hours ago</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Optimized 5 image alt texts</span>
                  <span className="text-gray-500">1 day ago</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'issues' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="flex items-center gap-4">
            <Filter className="h-5 w-5 text-gray-500" />
            <div className="flex gap-2">
              {['all', 'high', 'medium', 'low'].map((severity) => (
                <button
                  key={severity}
                  onClick={() => setFilter(severity as any)}
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    filter === severity
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {severity.charAt(0).toUpperCase() + severity.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Issues List */}
          <div className="space-y-4">
            {filteredIssues.map((issue) => (
              <div key={issue.id} className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(issue.severity)}`}>
                        {getSeverityIcon(issue.severity)}
                        {issue.severity.toUpperCase()}
                      </span>
                      <h3 className="text-lg font-semibold text-gray-900">{issue.title}</h3>
                    </div>
                    <p className="text-gray-600 mb-3">{issue.description}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <ExternalLink className="h-4 w-4" />
                        {issue.pageUrl}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {new Date(issue.detectedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {issue.quickFix && (
                      <button
                        onClick={() => handleQuickFix(issue.id)}
                        className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200"
                      >
                        Quick Fix
                      </button>
                    )}
                    <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                {issue.suggestions.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Suggestions:</h4>
                    <ul className="space-y-1">
                      {issue.suggestions.map((suggestion, index) => (
                        <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                          <span className="text-purple-500 mt-1">•</span>
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'crawler' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Crawler Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Crawl Frequency</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                  <option>Daily</option>
                  <option>Weekly</option>
                  <option>Monthly</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Include/Exclude Patterns</label>
                <input
                  type="text"
                  placeholder="/admin/*, /api/*"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Crawl History</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="font-medium text-gray-900">Daily Crawl</p>
                    <p className="text-sm text-gray-600">45 pages crawled, 12 issues found</p>
                  </div>
                </div>
                <span className="text-sm text-gray-500">2 hours ago</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="font-medium text-gray-900">Daily Crawl</p>
                    <p className="text-sm text-gray-600">45 pages crawled, 8 issues found</p>
                  </div>
                </div>
                <span className="text-sm text-gray-500">1 day ago</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* GA4 Analytics */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Google Analytics 4</h3>
                <span className="text-sm text-green-600 bg-green-100 px-2 py-1 rounded-full">Connected</span>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">12,450</div>
                    <div className="text-sm text-gray-600">Sessions (30d)</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">8,920</div>
                    <div className="text-sm text-gray-600">Users (30d)</div>
                  </div>
                </div>
                
                <div className="h-48 bg-gray-50 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600">Traffic Trends Chart</p>
                    <p className="text-sm text-gray-500">Last 30 days</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Organic Search</span>
                    <span className="font-medium">45%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Direct Traffic</span>
                    <span className="font-medium">32%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Social Media</span>
                    <span className="font-medium">15%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Referral</span>
                    <span className="font-medium">8%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Google Search Console */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Google Search Console</h3>
                <span className="text-sm text-green-600 bg-green-100 px-2 py-1 rounded-full">Connected</span>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">1,250</div>
                    <div className="text-sm text-gray-600">Total Clicks</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">4.2</div>
                    <div className="text-sm text-gray-600">Avg. Position</div>
                  </div>
                </div>
                
                <div className="h-48 bg-gray-50 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600">Search Performance</p>
                    <p className="text-sm text-gray-500">Last 30 days</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Total Impressions</span>
                    <span className="font-medium">28,450</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Click-through Rate</span>
                    <span className="font-medium">4.4%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Indexed Pages</span>
                    <span className="font-medium">45</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Coverage Issues</span>
                    <span className="font-medium text-red-600">3</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Top Performing Pages */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Pages</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Page</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clicks</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Impressions</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CTR</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      /best-luxury-hotels-mayfair
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">245</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">3,420</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">7.2%</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">2.1</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      /arabic-restaurants-london
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">189</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">2,850</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">6.6%</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">2.8</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      /chelsea-stadium-tour
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">156</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">2,100</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">7.4%</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">3.2</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Keywords */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Keywords</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { keyword: 'luxury hotels mayfair', clicks: 245, position: 2.1 },
                { keyword: 'arabic restaurants london', clicks: 189, position: 2.8 },
                { keyword: 'chelsea stadium tour', clicks: 156, position: 3.2 },
                { keyword: 'london shopping guide', clicks: 134, position: 3.8 },
                { keyword: 'best restaurants mayfair', clicks: 98, position: 4.1 },
                { keyword: 'london attractions 2024', clicks: 87, position: 4.5 }
              ].map((item, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg">
                  <div className="font-medium text-gray-900 mb-2">{item.keyword}</div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>{item.clicks} clicks</span>
                    <span>Pos. {item.position}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'quick-fixes' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Quick Fixes</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { title: 'Generate Meta Descriptions', description: 'Auto-generate meta descriptions for pages missing them', count: 5 },
                { title: 'Add Alt Text to Images', description: 'Generate descriptive alt text for images', count: 12 },
                { title: 'Optimize Internal Links', description: 'Suggest internal linking opportunities', count: 3 },
                { title: 'Fix Broken Links', description: 'Identify and fix broken internal/external links', count: 2 },
                { title: 'Compress Images', description: 'Optimize image file sizes for faster loading', count: 8 },
                { title: 'Add Schema Markup', description: 'Add structured data markup to pages', count: 7 }
              ].map((fix, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg hover:border-purple-300 transition-colors">
                  <h4 className="font-medium text-gray-900 mb-2">{fix.title}</h4>
                  <p className="text-sm text-gray-600 mb-3">{fix.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-purple-600 font-medium">{fix.count} items</span>
                    <button className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-sm hover:bg-purple-200">
                      Apply
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
