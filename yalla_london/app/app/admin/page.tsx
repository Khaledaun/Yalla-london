'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Home,
  FileText,
  Search,
  Settings,
  Bot,
  Users,
  DollarSign,
  Shield,
  TrendingUp,
  Eye,
  Plus,
  BarChart3,
  Globe,
  Zap,
  Target,
  Clock,
  CheckCircle,
  AlertTriangle
} from 'lucide-react'
import Link from 'next/link'

interface DashboardStats {
  articlesPublished: number
  topicsPending: number
  seoScore: number
  backlinksFound: number
  automationActive: number
  nextPublish: string
  subscribers: number
  revenue: number
}

export default function AdminCommandCenter() {
  const [stats, setStats] = useState<DashboardStats>({
    articlesPublished: 0,
    topicsPending: 0,
    seoScore: 0,
    backlinksFound: 0,
    automationActive: 0,
    nextPublish: 'Not scheduled',
    subscribers: 0,
    revenue: 0
  })

  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate loading dashboard data
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1000)
    return () => clearTimeout(timer)
  }, [])

  const quickActions = [
    {
      title: 'Write New Article',
      description: 'Create or upload new content',
      icon: FileText,
      href: '/admin/content',
      color: 'bg-purple-500 hover:bg-purple-600'
    },
    {
      title: 'Change Hero Image',
      description: 'Update homepage hero section',
      icon: Eye,
      href: '/admin/site',
      color: 'bg-yellow-500 hover:bg-yellow-600'
    },
    {
      title: 'Manage Topics',
      description: 'View and edit topic pipeline',
      icon: Target,
      href: '/admin/topics',
      color: 'bg-gray-500 hover:bg-gray-600'
    },
    {
      title: 'Automation Pipeline',
      description: 'Monitor cron jobs and automation',
      icon: Zap,
      href: '/admin/pipeline',
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      title: 'Customize Theme',
      description: 'Update site colors and fonts',
      icon: Settings,
      href: '/admin/settings/theme',
      color: 'bg-purple-500 hover:bg-purple-600'
    },
    {
      title: 'Preview Site',
      description: 'See how your site looks',
      icon: Globe,
      href: '/',
      color: 'bg-gray-500 hover:bg-gray-600',
      external: true
    },
    {
      title: 'Site Settings',
      description: 'Configure site-wide settings',
      icon: Settings,
      href: '/admin/site',
      color: 'bg-gray-500 hover:bg-gray-600'
    },
    {
      title: 'SEO Health Check',
      description: 'Analyze site SEO performance',
      icon: Search,
      href: '/admin/seo',
      color: 'bg-yellow-500 hover:bg-yellow-600'
    },
    {
      title: 'Pop-up Offers',
      description: 'Create and manage pop-ups',
      icon: Plus,
      href: '/admin/site',
      color: 'bg-purple-500 hover:bg-purple-600'
    },
    {
      title: 'Affiliates',
      description: 'Manage affiliate programs',
      icon: DollarSign,
      href: '/admin/affiliates',
      color: 'bg-yellow-500 hover:bg-yellow-600'
    }
  ]

  const mainSections = [
    {
      title: 'Content Hub',
      description: 'Manage articles, media, and social previews',
      icon: FileText,
      href: '/admin/content',
      stats: `${stats.articlesPublished} Articles`
    },
    {
      title: 'SEO Command Center',
      description: 'Monitor SEO health, backlinks, and optimization',
      icon: Search,
      href: '/admin/seo',
      stats: `Score: ${stats.seoScore}/100`
    },
    {
      title: 'Topic Management',
      description: 'Control AI topic generation and content pipeline',
      icon: Target,
      href: '/admin/topics',
      stats: `${stats.topicsPending} Pending`
    },
    {
      title: 'AI Prompt Studio',
      description: 'Control AI prompts, models, and automation',
      icon: Bot,
      href: '/admin/ai-prompt-studio',
      stats: `${stats.automationActive}% Active`
    },
    {
      title: 'Affiliate Program',
      description: 'Manage affiliate codes, hotels, and offers',
      icon: DollarSign,
      href: '/admin/affiliates',
      stats: `£${stats.revenue} Revenue`
    },
    {
      title: 'CRM & Newsletter',
      description: 'Manage subscribers and email campaigns',
      icon: Users,
      href: '/admin/crm',
      stats: `${stats.subscribers} Subscribers`
    },
    {
      title: 'Site Control',
      description: 'Homepage, theme, pop-ups, and automation',
      icon: Settings,
      href: '/admin/site',
      stats: 'All Systems Active'
    },
    {
      title: 'API & Security',
      description: 'Manage API keys and security settings',
      icon: Shield,
      href: '/admin/api-security',
      stats: 'Secure'
    }
  ]

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Command Center...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Home className="h-8 w-8 text-purple-500" />
              Command Center
            </h1>
            <p className="text-gray-600 mt-1">Complete control over your website and automation</p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <CheckCircle className="h-4 w-4 mr-1" />
              All Systems Operational
            </Badge>
            <Button variant="outline" size="sm">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Articles Published</p>
                  <p className="text-3xl font-bold">{stats.articlesPublished}</p>
                </div>
                <FileText className="h-8 w-8 text-purple-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-100 text-sm">SEO Score</p>
                  <p className="text-3xl font-bold">{stats.seoScore}/100</p>
                </div>
                <Search className="h-8 w-8 text-yellow-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-gray-500 to-gray-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-100 text-sm">Backlinks Found</p>
                  <p className="text-3xl font-bold">{stats.backlinksFound}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-gray-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Automation Active</p>
                  <p className="text-3xl font-bold">{stats.automationActive}%</p>
                </div>
                <Zap className="h-8 w-8 text-green-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {quickActions.map((action, index) => {
                const Icon = action.icon
                return (
                  <Link key={index} href={action.href} target={action.external ? '_blank' : undefined}>
                    <Button
                      variant="outline"
                      className={`w-full h-auto p-4 justify-start gap-3 ${action.color} text-white border-0 hover:scale-105 transition-transform`}
                    >
                      <Icon className="h-5 w-5" />
                      <div className="text-left">
                        <div className="font-medium">{action.title}</div>
                        <div className="text-sm opacity-90">{action.description}</div>
                      </div>
                    </Button>
                  </Link>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Main Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {mainSections.map((section, index) => {
            const Icon = section.icon
            return (
              <Link key={index} href={section.href}>
                <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer group">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg bg-gray-100 group-hover:bg-purple-100 transition-colors">
                        <Icon className="h-6 w-6 text-gray-600 group-hover:text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">{section.title}</h3>
                        <p className="text-sm text-gray-600 mb-3">{section.description}</p>
                        <Badge variant="outline" className="text-xs">
                          {section.stats}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>

        {/* Automation Status */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-purple-500" />
              Automation Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 mb-2">✅</div>
                <div className="text-sm font-medium">Content Generation</div>
                <div className="text-xs text-gray-500 mt-1">Automated topic research & content creation</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 mb-2">✅</div>
                <div className="text-sm font-medium">Publishing Pipeline</div>
                <div className="text-xs text-gray-500 mt-1">Scheduled content publishing</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 mb-2">✅</div>
                <div className="text-sm font-medium">SEO Optimization</div>
                <div className="text-xs text-gray-500 mt-1">Real-time SEO improvements</div>
              </div>
            </div>
            <div className="mt-6 p-4 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Your "Launch & Forget" business model is fully operational!</span>
              </div>
              <p className="text-sm text-green-700 mt-1">
                All automation systems are running smoothly. Next scheduled publish: {stats.nextPublish}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}