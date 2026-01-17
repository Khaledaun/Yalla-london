'use client';

/**
 * Super Admin Command Center
 *
 * The main control hub for managing all sites, content, and automation.
 * Designed for non-technical users with a friendly, visual interface.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Globe,
  Plus,
  Sparkles,
  BarChart3,
  DollarSign,
  FileText,
  Settings,
  Zap,
  TrendingUp,
  Users,
  Mail,
  Share2,
  Bot,
  Palette,
  BookOpen,
  Target,
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowUpRight,
  Search,
  Bell,
  Menu,
  ChevronRight,
  Play,
  Pause,
  RefreshCw,
} from 'lucide-react';

interface SiteStats {
  siteId: string;
  siteName: string;
  domain: string;
  locale: 'ar' | 'en';
  status: 'active' | 'pending' | 'paused';
  traffic: number;
  revenue: number;
  articles: number;
  leads: number;
}

interface SystemStatus {
  aiStatus: 'online' | 'offline' | 'degraded';
  contentQueue: number;
  scheduledPosts: number;
  pendingTasks: number;
  lastSync: string;
}

// Quick action cards for the dashboard
const QUICK_ACTIONS = [
  {
    id: 'new-site',
    title: 'Create New Site',
    titleAr: 'إنشاء موقع جديد',
    description: 'Launch a new domain with AI',
    icon: Plus,
    color: 'bg-gradient-to-br from-blue-500 to-indigo-600',
    href: '/admin/command-center/sites/new',
  },
  {
    id: 'generate-content',
    title: 'Generate Content',
    titleAr: 'إنشاء محتوى',
    description: 'Create articles with AI',
    icon: Sparkles,
    color: 'bg-gradient-to-br from-purple-500 to-pink-600',
    href: '/admin/command-center/content/generate',
  },
  {
    id: 'view-analytics',
    title: 'View Analytics',
    titleAr: 'عرض التحليلات',
    description: 'All sites performance',
    icon: BarChart3,
    color: 'bg-gradient-to-br from-green-500 to-emerald-600',
    href: '/admin/command-center/analytics',
  },
  {
    id: 'manage-affiliates',
    title: 'Affiliate Revenue',
    titleAr: 'إيرادات الشراكات',
    description: 'Track commissions',
    icon: DollarSign,
    color: 'bg-gradient-to-br from-amber-500 to-orange-600',
    href: '/admin/command-center/affiliates',
  },
];

// Navigation sections - Only includes pages that exist
const NAV_SECTIONS = [
  {
    title: 'Sites & Domains',
    titleAr: 'المواقع والنطاقات',
    items: [
      { name: 'All Sites', nameAr: 'جميع المواقع', href: '/admin/command-center/sites', icon: Globe },
      { name: 'Create New Site', nameAr: 'إنشاء موقع', href: '/admin/command-center/sites/new', icon: Plus },
      { name: 'Site Settings', nameAr: 'إعدادات الموقع', href: '/admin/site', icon: Settings },
    ],
  },
  {
    title: 'Content & AI',
    titleAr: 'المحتوى والذكاء الاصطناعي',
    items: [
      { name: 'Content Hub', nameAr: 'مركز المحتوى', href: '/admin/command-center/content', icon: FileText },
      { name: 'Articles', nameAr: 'المقالات', href: '/admin/articles', icon: FileText },
      { name: 'PDF Guides', nameAr: 'أدلة PDF', href: '/admin/command-center/products/pdf', icon: BookOpen },
      { name: 'Topics Pipeline', nameAr: 'خط إنتاج المواضيع', href: '/admin/topics-pipeline', icon: TrendingUp },
    ],
  },
  {
    title: 'Marketing & SEO',
    titleAr: 'التسويق وSEO',
    items: [
      { name: 'Social Media', nameAr: 'وسائل التواصل', href: '/admin/command-center/social', icon: Share2 },
      { name: 'SEO Audits', nameAr: 'تدقيق SEO', href: '/admin/seo-audits', icon: Target },
      { name: 'Analytics', nameAr: 'التحليلات', href: '/admin/command-center/analytics', icon: BarChart3 },
    ],
  },
  {
    title: 'Revenue',
    titleAr: 'الإيرادات',
    items: [
      { name: 'Affiliate Dashboard', nameAr: 'لوحة الشراكات', href: '/admin/command-center/affiliates', icon: DollarSign },
      { name: 'Affiliates Manager', nameAr: 'إدارة الشراكات', href: '/admin/affiliates', icon: Users },
    ],
  },
  {
    title: 'Automation',
    titleAr: 'الأتمتة',
    items: [
      { name: 'Autopilot', nameAr: 'الطيار الآلي', href: '/admin/command-center/autopilot', icon: Bot },
      { name: 'Automation Hub', nameAr: 'مركز الأتمتة', href: '/admin/automation-hub', icon: Zap },
      { name: 'Pipeline', nameAr: 'خط الإنتاج', href: '/admin/pipeline', icon: Activity },
    ],
  },
  {
    title: 'Settings',
    titleAr: 'الإعدادات',
    items: [
      { name: 'API Keys', nameAr: 'مفاتيح API', href: '/admin/command-center/settings/api-keys', icon: Settings },
      { name: 'Theme', nameAr: 'المظهر', href: '/admin/settings/theme', icon: Palette },
      { name: 'Feature Flags', nameAr: 'مفاتيح الميزات', href: '/admin/feature-flags', icon: Zap },
    ],
  },
];

export default function CommandCenterPage() {
  const [sites, setSites] = useState<SiteStats[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // Load sites and system status
      const [sitesRes, statusRes] = await Promise.all([
        fetch('/api/admin/command-center/sites'),
        fetch('/api/admin/command-center/status'),
      ]);

      if (sitesRes.ok) {
        const data = await sitesRes.json();
        setSites(data.sites || mockSites);
      } else {
        setSites(mockSites);
      }

      if (statusRes.ok) {
        const data = await statusRes.json();
        setSystemStatus(data);
      } else {
        setSystemStatus(mockStatus);
      }
    } catch (error) {
      // Use mock data for demo
      setSites(mockSites);
      setSystemStatus(mockStatus);
    }
    setIsLoading(false);
  };

  // Calculate totals
  const totalTraffic = sites.reduce((sum, s) => sum + s.traffic, 0);
  const totalRevenue = sites.reduce((sum, s) => sum + s.revenue, 0);
  const totalArticles = sites.reduce((sum, s) => sum + s.articles, 0);
  const totalLeads = sites.reduce((sum, s) => sum + s.leads, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-xl">Command Center</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="hidden md:flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                className="bg-transparent border-none outline-none text-sm w-48"
              />
            </div>

            {/* System Status Indicator */}
            <div className="flex items-center gap-2">
              {systemStatus?.aiStatus === 'online' ? (
                <span className="flex items-center gap-1 text-green-600 text-sm">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  AI Online
                </span>
              ) : (
                <span className="flex items-center gap-1 text-yellow-600 text-sm">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                  AI Degraded
                </span>
              )}
            </div>

            {/* Notifications */}
            <button className="relative p-2 hover:bg-gray-100 rounded-lg">
              <Bell className="h-5 w-5 text-gray-600" />
              {(systemStatus?.pendingTasks || 0) > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </button>

            {/* Refresh */}
            <button
              onClick={loadDashboardData}
              className="p-2 hover:bg-gray-100 rounded-lg"
              title="Refresh data"
            >
              <RefreshCw className={`h-5 w-5 text-gray-600 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar Navigation */}
        <aside
          className={`${
            sidebarOpen ? 'w-64' : 'w-0 lg:w-64'
          } bg-white border-r border-gray-200 min-h-[calc(100vh-57px)] overflow-hidden transition-all duration-300`}
        >
          <nav className="p-4 space-y-6">
            {NAV_SECTIONS.map((section) => (
              <div key={section.title}>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  {section.title}
                </h3>
                <ul className="space-y-1">
                  {section.items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="flex items-center gap-3 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <item.icon className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{item.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {/* Welcome Banner */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 mb-6 text-white">
            <h1 className="text-2xl font-bold mb-2">Welcome to your Command Center</h1>
            <p className="text-blue-100 mb-4">
              Manage all {sites.length} sites, generate content, and track revenue from one place.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/admin/command-center/sites/new"
                className="inline-flex items-center gap-2 bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Create New Site
              </Link>
              <Link
                href="/admin/command-center/content/generate"
                className="inline-flex items-center gap-2 bg-white/20 text-white px-4 py-2 rounded-lg font-medium hover:bg-white/30 transition-colors"
              >
                <Sparkles className="h-4 w-4" />
                Generate Content
              </Link>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              title="Total Traffic"
              value={formatNumber(totalTraffic)}
              change="+12%"
              trend="up"
              icon={Activity}
              color="blue"
            />
            <StatCard
              title="Revenue (MTD)"
              value={`$${formatNumber(totalRevenue)}`}
              change="+8%"
              trend="up"
              icon={DollarSign}
              color="green"
            />
            <StatCard
              title="Articles"
              value={formatNumber(totalArticles)}
              change="+24"
              trend="up"
              icon={FileText}
              color="purple"
            />
            <StatCard
              title="Leads"
              value={formatNumber(totalLeads)}
              change="+156"
              trend="up"
              icon={Users}
              color="amber"
            />
          </div>

          {/* Quick Actions */}
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.id}
                href={action.href}
                className={`${action.color} p-5 rounded-xl text-white hover:opacity-90 transition-opacity group`}
              >
                <action.icon className="h-8 w-8 mb-3" />
                <h3 className="font-semibold mb-1">{action.title}</h3>
                <p className="text-sm text-white/80">{action.description}</p>
                <ChevronRight className="h-5 w-5 mt-2 group-hover:translate-x-1 transition-transform" />
              </Link>
            ))}
          </div>

          {/* Sites Overview */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="font-semibold">Your Sites</h2>
              <Link
                href="/admin/command-center/sites"
                className="text-blue-600 text-sm hover:underline"
              >
                View all
              </Link>
            </div>
            <div className="divide-y divide-gray-100">
              {sites.map((site) => (
                <SiteRow key={site.siteId} site={site} />
              ))}
            </div>
          </div>

          {/* System Status & Automation */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Automation Status */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h2 className="font-semibold mb-4">Automation Status</h2>
              <div className="space-y-4">
                <AutomationItem
                  name="Content Generation"
                  status="running"
                  lastRun="2 hours ago"
                  nextRun="In 4 hours"
                />
                <AutomationItem
                  name="SEO Optimization"
                  status="running"
                  lastRun="1 hour ago"
                  nextRun="In 5 hours"
                />
                <AutomationItem
                  name="Social Media Posts"
                  status="paused"
                  lastRun="Yesterday"
                  nextRun="Paused"
                />
                <AutomationItem
                  name="Email Campaigns"
                  status="running"
                  lastRun="3 hours ago"
                  nextRun="Tomorrow 9 AM"
                />
              </div>
              <Link
                href="/admin/command-center/autopilot"
                className="mt-4 inline-flex items-center gap-2 text-blue-600 text-sm hover:underline"
              >
                Manage Autopilot
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h2 className="font-semibold mb-4">Recent Activity</h2>
              <div className="space-y-3">
                <ActivityItem
                  icon={FileText}
                  text="New article published on Arabaldives"
                  time="10 minutes ago"
                />
                <ActivityItem
                  icon={DollarSign}
                  text="$125 commission from Booking.com"
                  time="1 hour ago"
                />
                <ActivityItem
                  icon={Users}
                  text="15 new leads captured"
                  time="2 hours ago"
                />
                <ActivityItem
                  icon={Sparkles}
                  text="AI generated 5 articles for GulfMaldives"
                  time="4 hours ago"
                />
                <ActivityItem
                  icon={CheckCircle}
                  text="SEO audit completed for YallaLondon"
                  time="Yesterday"
                />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

// Helper Components
function StatCard({
  title,
  value,
  change,
  trend,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  icon: any;
  color: string;
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    amber: 'bg-amber-50 text-amber-600',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-500">{title}</span>
        <div className={`p-2 rounded-lg ${colorClasses[color as keyof typeof colorClasses]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="text-2xl font-bold mb-1">{value}</div>
      <div className={`text-sm ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
        {change} from last month
      </div>
    </div>
  );
}

function SiteRow({ site }: { site: SiteStats }) {
  return (
    <div className="p-4 flex items-center justify-between hover:bg-gray-50">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
          site.locale === 'ar' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'
        }`}>
          <Globe className="h-5 w-5" />
        </div>
        <div>
          <div className="font-medium">{site.siteName}</div>
          <div className="text-sm text-gray-500">{site.domain}</div>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="text-right">
          <div className="text-sm font-medium">{formatNumber(site.traffic)}</div>
          <div className="text-xs text-gray-500">visitors</div>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium text-green-600">${formatNumber(site.revenue)}</div>
          <div className="text-xs text-gray-500">revenue</div>
        </div>
        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
          site.status === 'active' ? 'bg-green-100 text-green-700' :
          site.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
          'bg-gray-100 text-gray-700'
        }`}>
          {site.status}
        </div>
        <Link href={`/admin/command-center/sites/${site.siteId}`}>
          <ChevronRight className="h-5 w-5 text-gray-400" />
        </Link>
      </div>
    </div>
  );
}

function AutomationItem({
  name,
  status,
  lastRun,
  nextRun,
}: {
  name: string;
  status: 'running' | 'paused' | 'error';
  lastRun: string;
  nextRun: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        {status === 'running' ? (
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
            <Play className="h-4 w-4 text-green-600" />
          </div>
        ) : status === 'paused' ? (
          <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
            <Pause className="h-4 w-4 text-yellow-600" />
          </div>
        ) : (
          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle className="h-4 w-4 text-red-600" />
          </div>
        )}
        <div>
          <div className="font-medium text-sm">{name}</div>
          <div className="text-xs text-gray-500">Last: {lastRun}</div>
        </div>
      </div>
      <div className="text-xs text-gray-500">{nextRun}</div>
    </div>
  );
}

function ActivityItem({
  icon: Icon,
  text,
  time,
}: {
  icon: any;
  text: string;
  time: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
        <Icon className="h-4 w-4 text-gray-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-gray-700">{text}</div>
        <div className="text-xs text-gray-500">{time}</div>
      </div>
    </div>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

// Mock data for demo
const mockSites: SiteStats[] = [
  {
    siteId: 'arabaldives',
    siteName: 'Arabaldives',
    domain: 'arabaldives.com',
    locale: 'ar',
    status: 'active',
    traffic: 45000,
    revenue: 12500,
    articles: 156,
    leads: 2340,
  },
  {
    siteId: 'yalla-london',
    siteName: 'Yalla London',
    domain: 'yallalondon.com',
    locale: 'en',
    status: 'active',
    traffic: 82000,
    revenue: 8200,
    articles: 312,
    leads: 4520,
  },
  {
    siteId: 'gulf-maldives',
    siteName: 'Gulf Maldives',
    domain: 'gulfmaldives.com',
    locale: 'en',
    status: 'active',
    traffic: 28000,
    revenue: 9800,
    articles: 89,
    leads: 1200,
  },
  {
    siteId: 'arab-bali',
    siteName: 'Arab Bali',
    domain: 'arabbali.com',
    locale: 'ar',
    status: 'pending',
    traffic: 0,
    revenue: 0,
    articles: 12,
    leads: 45,
  },
];

const mockStatus: SystemStatus = {
  aiStatus: 'online',
  contentQueue: 12,
  scheduledPosts: 8,
  pendingTasks: 3,
  lastSync: new Date().toISOString(),
};
