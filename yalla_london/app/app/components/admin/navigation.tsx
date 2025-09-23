'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Home, 
  FileText, 
  Lightbulb, 
  Edit3, 
  Search, 
  Settings, 
  Brain, 
  Shield, 
  Flag, 
  DollarSign,
  Menu, 
  X, 
  ChevronDown
} from 'lucide-react'

const navigation = [
  {
    name: 'Command Center',
    href: '/admin',
    icon: Home,
    description: 'What\'s Next, Ready to Publish, KPIs, health'
  },
  {
    name: 'Content Hub',
    href: '/admin/content',
    icon: FileText,
    description: 'Articles, Media, Social Preview, Upload Content'
  },
  {
    name: 'Topics & Pipeline',
    href: '/admin/topics',
    icon: Lightbulb,
    description: 'Priority, queue, Generate Now'
  },
  {
    name: 'Paste & Preview',
    href: '/admin/editor',
    icon: Edit3,
    description: 'Word paste, rewrite, embeds, save to DB'
  },
  {
    name: 'SEO Command Center',
    href: '/admin/seo-command',
    icon: Search,
    description: 'Crawler results, audits, quick fixes, notifications'
  },
  {
    name: 'Site Control',
    href: '/admin/site-control',
    icon: Settings,
    description: 'Homepage builder with video hero from Media, menus, Privacy/Terms/Contact'
  },
  {
    name: 'AI Tools & Prompt Studio',
    href: '/admin/ai-studio',
    icon: Brain,
    description: 'Prompts, models, providers, token usage'
  },
  {
    name: 'API & Keys Safe',
    href: '/admin/api-security',
    icon: Shield,
    description: 'Secrets + social integrations'
  },
  {
    name: 'Affiliate Marketing',
    href: '/admin/affiliate-marketing',
    icon: DollarSign,
    description: 'Manage affiliate codes and track performance'
  },
  {
    name: 'Feature Flags & Health',
    href: '/admin/feature-flags',
    icon: Flag,
    description: 'Feature flags and system health monitoring'
  }
]

export default function AdminNavigation() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  return (
    <>
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white">
          <div className="flex h-16 items-center justify-between px-4">
            <h1 className="text-xl font-bold text-gray-900">Yalla London</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center rounded-md px-2 py-2 text-sm font-medium ${
                    isActive
                      ? 'bg-purple-100 text-purple-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs text-gray-500">{item.description}</div>
                  </div>
                </Link>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200">
          <div className="flex h-16 items-center px-4 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900">Yalla London</h1>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center rounded-md px-2 py-2 text-sm font-medium ${
                    isActive
                      ? 'bg-purple-100 text-purple-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs text-gray-500">{item.description}</div>
                  </div>
                </Link>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Mobile menu button */}
      <div className="lg:hidden">
        <div className="flex h-16 items-center justify-between px-4 bg-white border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">Yalla London</h1>
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-400 hover:text-gray-600"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </div>
    </>
  )
}