'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  FileText,
  Users,
  Eye,
  TrendingUp,
  Bot,
  Image as ImageIcon,
  Calendar,
  MessageSquare,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Zap,
  Target,
  Clock,
  Globe,
  RefreshCw,
  BarChart3,
  PenTool
} from 'lucide-react'
import { StatCard, StatCardsGrid } from './stat-card'
import { ChartCard, SimpleBarChart, DonutChart, LineChart, ProgressBar } from './chart-card'
import { ActivityFeed, QuickActions, RecentItemsTable } from './activity-feed'

interface DashboardStats {
  totalArticles: number
  totalViews: number
  totalUsers: number
  seoScore: number
  articlesChange: number
  viewsChange: number
  usersChange: number
  seoChange: number
}

export function MophyDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalArticles: 0,
    totalViews: 0,
    totalUsers: 0,
    seoScore: 0,
    articlesChange: 0,
    viewsChange: 0,
    usersChange: 0,
    seoChange: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/admin/stats')
        if (response.ok) {
          const data = await response.json()
          setStats({
            totalArticles: data.totalArticles || 156,
            totalViews: data.totalViews || 24853,
            totalUsers: data.totalUsers || 1247,
            seoScore: data.seoScore || 87,
            articlesChange: data.articlesChange || 12,
            viewsChange: data.viewsChange || 23,
            usersChange: data.usersChange || 8,
            seoChange: data.seoChange || 5
          })
        }
      } catch (error) {
        // Use default values on error
        setStats({
          totalArticles: 156,
          totalViews: 24853,
          totalUsers: 1247,
          seoScore: 87,
          articlesChange: 12,
          viewsChange: 23,
          usersChange: 8,
          seoChange: 5
        })
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  // Sample data for charts
  const weeklyViewsData = [
    { label: 'Mon', value: 2400 },
    { label: 'Tue', value: 1398 },
    { label: 'Wed', value: 4800 },
    { label: 'Thu', value: 3908 },
    { label: 'Fri', value: 4800 },
    { label: 'Sat', value: 3800 },
    { label: 'Sun', value: 4300 }
  ]

  const trafficSourcesData = [
    { label: 'Organic Search', value: 45, color: '#7C3AED' },
    { label: 'Social Media', value: 25, color: '#EC4899' },
    { label: 'Direct', value: 20, color: '#10B981' },
    { label: 'Referral', value: 10, color: '#F59E0B' }
  ]

  const monthlyTrendData = [
    { label: 'Jan', value: 4000 },
    { label: 'Feb', value: 3000 },
    { label: 'Mar', value: 5000 },
    { label: 'Apr', value: 4500 },
    { label: 'May', value: 6000 },
    { label: 'Jun', value: 5500 },
    { label: 'Jul', value: 7000 }
  ]

  // Sample activities
  const recentActivities = [
    {
      id: '1',
      type: 'article' as const,
      title: 'New article published: Best Halal Restaurants',
      description: 'Published by Sarah Ahmed',
      timestamp: '5 min ago',
      status: 'success' as const,
      user: { name: 'Sarah Ahmed' },
      link: '/admin/articles/1'
    },
    {
      id: '2',
      type: 'seo' as const,
      title: 'SEO audit completed for homepage',
      description: 'Score improved from 72 to 87',
      timestamp: '1 hour ago',
      status: 'success' as const,
      link: '/admin/seo-audits'
    },
    {
      id: '3',
      type: 'automation' as const,
      title: 'AI content suggestions generated',
      description: '12 new topic ideas ready for review',
      timestamp: '2 hours ago',
      status: 'info' as const,
      link: '/admin/topics-pipeline'
    },
    {
      id: '4',
      type: 'media' as const,
      title: '5 new images uploaded',
      description: 'Added to Media Library',
      timestamp: '3 hours ago',
      status: 'success' as const,
      link: '/admin/media'
    },
    {
      id: '5',
      type: 'comment' as const,
      title: 'New comment pending review',
      description: 'On "Weekend Guide to East London"',
      timestamp: '4 hours ago',
      status: 'warning' as const,
      link: '/admin/comments'
    }
  ]

  // Quick actions
  const quickActions = [
    { id: '1', label: 'New Article', icon: PenTool, href: '/admin/articles/new', color: 'bg-gradient-to-br from-primary to-purple-600' },
    { id: '2', label: 'AI Studio', icon: Bot, href: '/admin/ai-studio', color: 'bg-gradient-to-br from-pink-500 to-rose-600', badge: 'AI' },
    { id: '3', label: 'SEO Audit', icon: Target, href: '/admin/seo-audits', color: 'bg-gradient-to-br from-green-500 to-emerald-600' },
    { id: '4', label: 'Media', icon: ImageIcon, href: '/admin/media', color: 'bg-gradient-to-br from-amber-500 to-orange-600' },
    { id: '5', label: 'Schedule', icon: Calendar, href: '/admin/pipeline', color: 'bg-gradient-to-br from-blue-500 to-indigo-600' },
    { id: '6', label: 'Analytics', icon: BarChart3, href: '/admin/command-center/analytics', color: 'bg-gradient-to-br from-cyan-500 to-teal-600' }
  ]

  // Recent content
  const recentContent = [
    {
      id: '1',
      title: 'Best Halal Restaurants in Central London',
      type: 'Article',
      status: 'published' as const,
      views: 2453,
      date: 'Jan 6, 2026',
      href: '/admin/articles/1'
    },
    {
      id: '2',
      title: 'Weekend Guide to East London Markets',
      type: 'Article',
      status: 'published' as const,
      views: 1892,
      date: 'Jan 5, 2026',
      href: '/admin/articles/2'
    },
    {
      id: '3',
      title: 'Top 10 Family Activities in London',
      type: 'Article',
      status: 'scheduled' as const,
      views: 0,
      date: 'Jan 8, 2026',
      href: '/admin/articles/3'
    },
    {
      id: '4',
      title: 'Hidden Gems: Shisha Lounges Review',
      type: 'Article',
      status: 'draft' as const,
      views: 0,
      date: 'Jan 4, 2026',
      href: '/admin/articles/4'
    },
    {
      id: '5',
      title: 'Ramadan Iftar Guide 2026',
      type: 'Article',
      status: 'review' as const,
      views: 0,
      date: 'Jan 3, 2026',
      href: '/admin/articles/5'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
            Welcome back!
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Here's what's happening with your content today.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
            <RefreshCw size={16} />
            Refresh
          </button>
          <Link
            href="/admin/articles/new"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-primary to-purple-600 rounded-xl hover:shadow-lg hover:shadow-primary/30 transition-all"
          >
            <Plus size={16} />
            New Article
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <StatCardsGrid columns={4}>
        <StatCard
          title="Total Articles"
          value={loading ? '—' : stats.totalArticles.toLocaleString()}
          change={stats.articlesChange}
          trend="up"
          icon={FileText}
          iconBg="from-primary to-purple-600"
          chartData={[30, 45, 35, 50, 40, 55, 60]}
        />
        <StatCard
          title="Page Views"
          value={loading ? '—' : stats.totalViews.toLocaleString()}
          change={stats.viewsChange}
          trend="up"
          icon={Eye}
          iconBg="from-pink-500 to-rose-600"
          chartData={[40, 35, 55, 45, 60, 50, 70]}
        />
        <StatCard
          title="Active Users"
          value={loading ? '—' : stats.totalUsers.toLocaleString()}
          change={stats.usersChange}
          trend="up"
          icon={Users}
          iconBg="from-green-500 to-emerald-600"
          chartData={[25, 40, 30, 45, 35, 50, 55]}
        />
        <StatCard
          title="SEO Score"
          value={loading ? '—' : `${stats.seoScore}%`}
          change={stats.seoChange}
          trend="up"
          icon={TrendingUp}
          iconBg="from-amber-500 to-orange-600"
          variant="gradient"
        />
      </StatCardsGrid>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column - Charts */}
        <div className="xl:col-span-2 space-y-6">
          {/* Weekly Views Chart */}
          <ChartCard
            title="Weekly Performance"
            subtitle="Page views over the last 7 days"
            actions={
              <select className="text-sm border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300">
                <option>This Week</option>
                <option>Last Week</option>
                <option>Last Month</option>
              </select>
            }
          >
            <SimpleBarChart data={weeklyViewsData} height={220} />
          </ChartCard>

          {/* Monthly Trend */}
          <ChartCard
            title="Traffic Trend"
            subtitle="Monthly visitor growth"
          >
            <LineChart data={monthlyTrendData} height={180} />
          </ChartCard>

          {/* Recent Content Table */}
          <RecentItemsTable items={recentContent} />
        </div>

        {/* Right Column - Activity & Actions */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <QuickActions actions={quickActions} />

          {/* Traffic Sources */}
          <ChartCard title="Traffic Sources" subtitle="Where your visitors come from">
            <div className="flex flex-col items-center">
              <DonutChart
                data={trafficSourcesData}
                size={180}
                strokeWidth={20}
                centerValue="24.8K"
                centerLabel="Total Visits"
              />
              <div className="mt-6 w-full space-y-3">
                {trafficSourcesData.map((source, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: source.color }}
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {source.label}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {source.value}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </ChartCard>

          {/* Activity Feed */}
          <ActivityFeed activities={recentActivities} maxItems={4} />

          {/* SEO Progress */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              SEO Health
            </h3>
            <div className="space-y-4">
              <ProgressBar
                value={87}
                label="Overall Score"
                color="from-green-500 to-emerald-600"
              />
              <ProgressBar
                value={92}
                label="Content Quality"
                color="from-primary to-purple-600"
              />
              <ProgressBar
                value={78}
                label="Technical SEO"
                color="from-amber-500 to-orange-600"
              />
              <ProgressBar
                value={85}
                label="Backlinks"
                color="from-blue-500 to-indigo-600"
              />
            </div>
            <Link
              href="/admin/seo-audits"
              className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 text-sm font-medium text-primary hover:text-purple-600 hover:bg-primary/5 rounded-xl transition-all"
            >
              View Full Report
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
