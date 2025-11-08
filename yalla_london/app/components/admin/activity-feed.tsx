'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { 
  FileText, 
  Users, 
  Settings, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  Clock,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
  ExternalLink
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export interface ActivityItem {
  id: string
  type: 'content' | 'user' | 'system' | 'media' | 'settings' | 'security'
  action: string
  title: string
  description: string
  timestamp: Date
  user?: {
    name: string
    email: string
    avatar?: string
  }
  status?: 'success' | 'warning' | 'error' | 'info'
  metadata?: {
    [key: string]: any
  }
  href?: string
}

export interface ActivityFeedProps {
  activities: ActivityItem[]
  loading?: boolean
  title?: string
  showHeader?: boolean
  maxItems?: number
  compact?: boolean
  onViewAll?: () => void
  onItemClick?: (item: ActivityItem) => void
}

export function ActivityFeed({
  activities,
  loading = false,
  title = "Recent Activity",
  showHeader = true,
  maxItems,
  compact = false,
  onViewAll,
  onItemClick
}: ActivityFeedProps) {
  const displayActivities = maxItems ? activities.slice(0, maxItems) : activities

  const getIcon = (type: ActivityItem['type'], action: string) => {
    const iconClass = "h-4 w-4"
    
    switch (type) {
      case 'content':
        if (action.includes('create')) return <FileText className={iconClass} />
        if (action.includes('edit') || action.includes('update')) return <Edit className={iconClass} />
        if (action.includes('delete')) return <Trash2 className={iconClass} />
        if (action.includes('publish')) return <CheckCircle2 className={iconClass} />
        return <FileText className={iconClass} />
      
      case 'user':
        return <Users className={iconClass} />
      
      case 'media':
        return <Upload className={iconClass} />
      
      case 'system':
      case 'settings':
        return <Settings className={iconClass} />
      
      case 'security':
        return <AlertTriangle className={iconClass} />
      
      default:
        return <Info className={iconClass} />
    }
  }

  const getStatusColor = (status?: ActivityItem['status']) => {
    switch (status) {
      case 'success':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200'
      case 'warning':
        return 'bg-amber-100 text-amber-700 border-amber-200'
      case 'error':
        return 'bg-red-100 text-red-700 border-red-200'
      case 'info':
      default:
        return 'bg-blue-100 text-blue-700 border-blue-200'
    }
  }

  const getTypeColor = (type: ActivityItem['type']) => {
    switch (type) {
      case 'content':
        return 'bg-violet-100 text-violet-700'
      case 'user':
        return 'bg-blue-100 text-blue-700'
      case 'media':
        return 'bg-green-100 text-green-700'
      case 'system':
      case 'settings':
        return 'bg-slate-100 text-slate-700'
      case 'security':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-slate-100 text-slate-700'
    }
  }

  const formatRelativeTime = (date: Date) => {
    return formatDistanceToNow(date, { addSuffix: true })
  }

  if (loading) {
    return (
      <Card>
        {showHeader && (
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          </CardHeader>
        )}
        <CardContent className={showHeader ? "pt-0" : ""}>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-start space-x-3 animate-pulse">
                <div className="w-8 h-8 bg-slate-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                  <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-sm">
      {showHeader && (
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-slate-900">{title}</CardTitle>
            {onViewAll && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onViewAll}
                className="text-violet-600 hover:text-violet-700"
              >
                View all
                <ExternalLink className="ml-1 h-3 w-3" />
              </Button>
            )}
          </div>
        </CardHeader>
      )}
      
      <CardContent className={showHeader ? "pt-0" : ""}>
        {displayActivities.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No recent activity</p>
          </div>
        ) : (
          <div className={`space-y-${compact ? '3' : '4'}`}>
            {displayActivities.map((activity) => (
              <div
                key={activity.id}
                className={`
                  group relative flex items-start space-x-3 p-3 rounded-lg transition-colors
                  ${onItemClick ? 'hover:bg-slate-50 cursor-pointer' : ''}
                  ${compact ? 'py-2' : 'py-3'}
                `}
                onClick={() => onItemClick && onItemClick(activity)}
              >
                {/* Icon and Status Indicator */}
                <div className="relative flex-shrink-0">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center
                    ${getTypeColor(activity.type)}
                  `}>
                    {getIcon(activity.type, activity.action)}
                  </div>
                  
                  {activity.status && (
                    <div className={`
                      absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white
                      ${activity.status === 'success' ? 'bg-emerald-500' : ''}
                      ${activity.status === 'warning' ? 'bg-amber-500' : ''}
                      ${activity.status === 'error' ? 'bg-red-500' : ''}
                      ${activity.status === 'info' ? 'bg-blue-500' : ''}
                    `}
                    />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium text-slate-900 ${compact ? 'text-sm' : ''}`}>
                        {activity.title}
                      </p>
                      <p className={`text-slate-600 mt-1 ${compact ? 'text-xs' : 'text-sm'}`}>
                        {activity.description}
                      </p>
                      
                      {/* User and timestamp */}
                      <div className="flex items-center mt-2 text-xs text-slate-500">
                        {activity.user && (
                          <>
                            <Avatar className="h-4 w-4 mr-1">
                              <AvatarImage src={activity.user.avatar} />
                              <AvatarFallback className="text-[8px]">
                                {activity.user.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <span className="mr-2">{activity.user.name}</span>
                          </>
                        )}
                        <Clock className="h-3 w-3 mr-1" />
                        <span>{formatRelativeTime(activity.timestamp)}</span>
                      </div>

                      {/* Metadata tags */}
                      {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                        <div className="flex items-center gap-1 mt-2">
                          {Object.entries(activity.metadata).slice(0, 2).map(([key, value]) => (
                            <Badge key={key} variant="secondary" className="text-[10px] px-1 py-0">
                              {key}: {String(value)}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Action button */}
                    {(activity.href || onItemClick) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity ml-2 h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (activity.href) {
                            window.open(activity.href, '_blank')
                          }
                        }}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Load more indicator */}
        {maxItems && activities.length > maxItems && (
          <div className="text-center pt-4 border-t border-slate-100 mt-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onViewAll}
              className="text-slate-600 hover:text-violet-600"
            >
              Show {activities.length - maxItems} more activities
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Helper function to create activity items
export const createActivityItem = (
  type: ActivityItem['type'],
  action: string,
  title: string,
  description: string,
  user?: ActivityItem['user'],
  status?: ActivityItem['status'],
  metadata?: ActivityItem['metadata']
): Omit<ActivityItem, 'id' | 'timestamp'> => ({
  type,
  action,
  title,
  description,
  user,
  status,
  metadata
})