'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { 
  Home,
  FileText,
  Search,
  Target,
  Bot,
  DollarSign,
  Users,
  Shield,
  Settings,
  Upload,
  Menu,
  X,
  ChevronDown,
  ChevronRight
} from 'lucide-react'

interface NavigationItem {
  name: string
  href: string
  icon: any
  description: string
  children?: NavigationItem[]
}

const navigationItems: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/admin',
    icon: Home,
    description: 'Main command center'
  },
  {
    name: 'Content',
    href: '/admin/content',
    icon: FileText,
    description: 'Articles and media management'
  },
  {
    name: 'Topics',
    href: '/admin/topics',
    icon: Target,
    description: 'Topic management and organization'
  },
  {
    name: 'Media Library',
    href: '/admin/media',
    icon: Upload,
    description: 'Images, videos, and documents'
  },
  {
    name: 'SEO Center',
    href: '/admin/seo',
    icon: Search,
    description: 'SEO monitoring and optimization'
  },
  {
    name: 'AI Studio',
    href: '/admin/ai-prompt-studio',
    icon: Bot,
    description: 'AI prompts and automation'
  },
  {
    name: 'Affiliates',
    href: '/admin/affiliates',
    icon: DollarSign,
    description: 'Affiliate program management'
  },
  {
    name: 'CRM',
    href: '/admin/crm',
    icon: Users,
    description: 'Subscribers and campaigns'
  },
  {
    name: 'Site Control',
    href: '/admin/site',
    icon: Settings,
    description: 'Homepage and theme settings'
  },
  {
    name: 'API & Security',
    href: '/admin/api-security',
    icon: Shield,
    description: 'API keys and security'
  }
]

export default function AdminNavigation() {
  const [isOpen, setIsOpen] = useState(false)
  const [expandedItems, setExpandedItems] = useState<string[]>([])
  const pathname = usePathname()

  const toggleExpanded = (itemName: string) => {
    setExpandedItems(prev => 
      prev.includes(itemName) 
        ? prev.filter(name => name !== itemName)
        : [...prev, itemName]
    )
  }

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin'
    }
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="bg-white shadow-lg"
        >
          {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 z-50 transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:inset-0
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">YL</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Yalla London</h1>
                <p className="text-xs text-gray-600">Admin Panel</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {navigationItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              const hasChildren = item.children && item.children.length > 0
              const isExpanded = expandedItems.includes(item.name)

              return (
                <div key={item.name}>
                  <Link
                    href={item.href}
                    onClick={() => !hasChildren && setIsOpen(false)}
                    className={`
                      flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                      ${active 
                        ? 'bg-purple-100 text-purple-700 border border-purple-200' 
                        : 'text-gray-700 hover:bg-gray-100'
                      }
                    `}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="flex-1">{item.name}</span>
                    {hasChildren && (
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          toggleExpanded(item.name)
                        }}
                        className="p-1 hover:bg-gray-200 rounded"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronRight className="h-3 w-3" />
                        )}
                      </button>
                    )}
                  </Link>
                  
                  {hasChildren && isExpanded && (
                    <div className="ml-6 mt-2 space-y-1">
                      {item.children?.map((child) => {
                        const ChildIcon = child.icon
                        const childActive = isActive(child.href)
                        
                        return (
                          <Link
                            key={child.name}
                            href={child.href}
                            onClick={() => setIsOpen(false)}
                            className={`
                              flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors
                              ${childActive 
                                ? 'bg-purple-50 text-purple-600' 
                                : 'text-gray-600 hover:bg-gray-50'
                              }
                            `}
                          >
                            <ChildIcon className="h-3 w-3" />
                            <span>{child.name}</span>
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200">
            <div className="text-xs text-gray-500 text-center">
              <p>Yalla London Admin</p>
              <p>Version 1.0.0</p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
