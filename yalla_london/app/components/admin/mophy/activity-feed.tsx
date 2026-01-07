'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  FileText,
  Image as ImageIcon,
  Users,
  Settings,
  TrendingUp,
  Bot,
  MessageSquare,
  Eye,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  MoreHorizontal,
  ArrowRight
} from 'lucide-react'

interface ActivityItem {
  id: string
  type: 'article' | 'media' | 'user' | 'setting' | 'seo' | 'automation' | 'comment'
  title: string
  description?: string
  timestamp: string
  status?: 'success' | 'warning' | 'error' | 'info'
  user?: {
    name: string
    avatar?: string
  }
  link?: string
}

interface ActivityFeedProps {
  activities: ActivityItem[]
  title?: string
  showViewAll?: boolean
  maxItems?: number
}

const typeIcons = {
  article: FileText,
  media: ImageIcon,
  user: Users,
  setting: Settings,
  seo: TrendingUp,
  automation: Bot,
  comment: MessageSquare
}

const statusColors = {
  success: 'text-green-500 bg-green-50 dark:bg-green-900/30',
  warning: 'text-amber-500 bg-amber-50 dark:bg-amber-900/30',
  error: 'text-red-500 bg-red-50 dark:bg-red-900/30',
  info: 'text-blue-500 bg-blue-50 dark:bg-blue-900/30'
}

const statusIcons = {
  success: CheckCircle,
  warning: AlertCircle,
  error: XCircle,
  info: Eye
}

export function ActivityFeed({
  activities,
  title = 'Recent Activity',
  showViewAll = true,
  maxItems = 5
}: ActivityFeedProps) {
  const displayedActivities = activities.slice(0, maxItems)

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
        <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
          <MoreHorizontal size={18} />
        </button>
      </div>

      {/* Activity List */}
      <div className="divide-y divide-gray-100 dark:divide-slate-800">
        {displayedActivities.map((activity) => {
          const TypeIcon = typeIcons[activity.type]
          const StatusIcon = activity.status ? statusIcons[activity.status] : null

          return (
            <div
              key={activity.id}
              className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={`
                  w-10 h-10 rounded-xl flex items-center justify-center shrink-0
                  ${activity.status ? statusColors[activity.status] : 'bg-gray-100 dark:bg-slate-800 text-gray-500'}
                `}>
                  {StatusIcon ? <StatusIcon size={18} /> : <TypeIcon size={18} />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-1">
                        {activity.title}
                      </p>
                      {activity.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                          {activity.description}
                        </p>
                      )}
                    </div>

                    {activity.link && (
                      <Link
                        href={activity.link}
                        className="shrink-0 p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                      >
                        <ArrowRight size={16} />
                      </Link>
                    )}
                  </div>

                  {/* Meta */}
                  <div className="flex items-center gap-3 mt-2">
                    {activity.user && (
                      <div className="flex items-center gap-2">
                        {activity.user.avatar ? (
                          <Image
                            src={activity.user.avatar}
                            alt={activity.user.name}
                            width={20}
                            height={20}
                            className="rounded-full"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
                            <span className="text-white text-xs font-medium">
                              {activity.user.name.charAt(0)}
                            </span>
                          </div>
                        )}
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {activity.user.name}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Clock size={12} />
                      <span>{activity.timestamp}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* View All */}
      {showViewAll && activities.length > maxItems && (
        <div className="px-6 py-3 border-t border-gray-100 dark:border-slate-800">
          <Link
            href="/admin/activity"
            className="flex items-center justify-center gap-2 text-sm font-medium text-primary hover:text-purple-600 transition-colors"
          >
            View All Activity
            <ArrowRight size={16} />
          </Link>
        </div>
      )}
    </div>
  )
}

// Quick Actions Grid
interface QuickAction {
  id: string
  label: string
  icon: React.ElementType
  href: string
  color?: string
  badge?: string
}

interface QuickActionsProps {
  actions: QuickAction[]
  title?: string
}

export function QuickActions({ actions, title = 'Quick Actions' }: QuickActionsProps) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
      </div>

      {/* Actions Grid */}
      <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-3">
        {actions.map((action) => {
          const Icon = action.icon
          return (
            <Link
              key={action.id}
              href={action.href}
              className="relative group flex flex-col items-center justify-center p-4 rounded-xl border border-gray-100 dark:border-slate-800 hover:border-primary/30 hover:bg-primary/5 transition-all"
            >
              <div className={`
                w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-all
                ${action.color || 'bg-gradient-to-br from-primary to-purple-600'}
                group-hover:scale-110 group-hover:shadow-lg
              `}>
                <Icon size={22} className="text-white" />
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center">
                {action.label}
              </span>
              {action.badge && (
                <span className="absolute top-2 right-2 px-1.5 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded-full">
                  {action.badge}
                </span>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}

// Recent Items Table
interface RecentItem {
  id: string
  title: string
  type: string
  status: 'published' | 'draft' | 'scheduled' | 'review'
  views?: number
  date: string
  href: string
}

interface RecentItemsTableProps {
  items: RecentItem[]
  title?: string
}

const tableStatusColors = {
  published: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  draft: 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-gray-400',
  scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  review: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
}

export function RecentItemsTable({ items, title = 'Recent Content' }: RecentItemsTableProps) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
        <Link
          href="/admin/articles"
          className="text-sm font-medium text-primary hover:text-purple-600 transition-colors"
        >
          View All
        </Link>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 dark:border-slate-800">
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Title
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Views
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Date
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="px-6 py-4">
                  <Link href={item.href} className="text-sm font-medium text-gray-900 dark:text-white hover:text-primary transition-colors line-clamp-1">
                    {item.title}
                  </Link>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-500 dark:text-gray-400">{item.type}</span>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${tableStatusColors[item.status]}`}>
                    {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                    <Eye size={14} />
                    <span>{item.views?.toLocaleString() || '—'}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-500 dark:text-gray-400">{item.date}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
