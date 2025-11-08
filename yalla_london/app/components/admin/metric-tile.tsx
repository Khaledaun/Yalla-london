'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock,
  RefreshCw,
  ExternalLink,
  Wifi,
  WifiOff,
  Zap,
  TrendingUp,
  TrendingDown,
  Calendar,
  Users,
  FileText,
  Eye,
  Target
} from 'lucide-react'

interface MetricTileProps {
  title: string
  value: string | number
  subtitle?: string
  change?: {
    value: number
    type: 'increase' | 'decrease' | 'neutral'
    period: string
  }
  icon: React.ComponentType<any>
  sourceLabel: string
  lastSynced?: string
  timeRange: string
  loading?: boolean
  error?: string
  connected?: boolean
  onConnect?: () => void
  onRefresh?: () => void
  href?: string
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error'
}

const getColorClasses = (color: MetricTileProps['color'], connected: boolean) => {
  if (!connected) {
    return {
      cardClass: 'border-gray-200 bg-gray-50',
      iconClass: 'text-gray-400 bg-gray-100',
      badgeClass: 'bg-gray-100 text-gray-600 border-gray-200'
    }
  }

  switch (color) {
    case 'success':
      return {
        cardClass: 'border-green-200 bg-green-50',
        iconClass: 'text-green-600 bg-green-100',
        badgeClass: 'bg-green-100 text-green-700 border-green-200'
      }
    case 'warning':
      return {
        cardClass: 'border-yellow-200 bg-yellow-50',
        iconClass: 'text-yellow-600 bg-yellow-100',
        badgeClass: 'bg-yellow-100 text-yellow-700 border-yellow-200'
      }
    case 'error':
      return {
        cardClass: 'border-red-200 bg-red-50',
        iconClass: 'text-red-600 bg-red-100',
        badgeClass: 'bg-red-100 text-red-700 border-red-200'
      }
    case 'secondary':
      return {
        cardClass: 'border-purple-200 bg-purple-50',
        iconClass: 'text-purple-600 bg-purple-100',
        badgeClass: 'bg-purple-100 text-purple-700 border-purple-200'
      }
    default:
      return {
        cardClass: 'border-blue-200 bg-blue-50',
        iconClass: 'text-blue-600 bg-blue-100',
        badgeClass: 'bg-blue-100 text-blue-700 border-blue-200'
      }
  }
}

export function MetricTile({
  title,
  value,
  subtitle,
  change,
  icon: Icon,
  sourceLabel,
  lastSynced,
  timeRange,
  loading = false,
  error,
  connected = true,
  onConnect,
  onRefresh,
  href,
  color = 'primary'
}: MetricTileProps) {
  const colors = getColorClasses(color, connected)
  
  if (loading) {
    return (
      <Card className="relative overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-12 w-12 rounded-full" />
          </div>
          <div className="mt-4 space-y-2">
            <Skeleton className="h-3 w-full" />
            <div className="flex justify-between">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!connected && !error) {
    return (
      <Card className={`relative overflow-hidden border-dashed ${colors.cardClass}`}>
        <CardContent className="p-6 text-center">
          <div className="flex flex-col items-center space-y-4">
            <div className={`p-3 rounded-full ${colors.iconClass}`}>
              <WifiOff className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-1">{title}</h3>
              <p className="text-sm text-gray-500 mb-3">Connect {sourceLabel} to see real data</p>
              {onConnect && (
                <Button 
                  size="sm" 
                  onClick={onConnect}
                  className="bg-violet-600 hover:bg-violet-700 text-white"
                >
                  <Wifi className="h-4 w-4 mr-2" />
                  Connect First
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="relative overflow-hidden border-red-200 bg-red-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <h3 className="font-medium text-gray-900">{title}</h3>
              <p className="text-sm text-red-600">Error: {error}</p>
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Failed
                </Badge>
                {onRefresh && (
                  <Button size="sm" variant="outline" onClick={onRefresh}>
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Retry
                  </Button>
                )}
              </div>
            </div>
            <div className="p-3 rounded-full bg-red-100 text-red-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`relative overflow-hidden transition-all duration-200 hover:shadow-lg ${colors.cardClass}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2 flex-1">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900">{title}</h3>
              {href && (
                <Button size="sm" variant="ghost" asChild className="h-6 w-6 p-0">
                  <a href={href} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </Button>
              )}
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold text-gray-900">
                {typeof value === 'number' ? value.toLocaleString() : value}
              </span>
              {change && (
                <div className="flex items-center space-x-1">
                  {change.type === 'increase' ? (
                    <TrendingUp className="h-3 w-3 text-green-500" />
                  ) : change.type === 'decrease' ? (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  ) : null}
                  <span className={`text-xs font-medium ${
                    change.type === 'increase' ? 'text-green-600' : 
                    change.type === 'decrease' ? 'text-red-600' : 
                    'text-gray-500'
                  }`}>
                    {change.value > 0 ? '+' : ''}{change.value}%
                  </span>
                </div>
              )}
            </div>
            {subtitle && (
              <p className="text-sm text-gray-500">{subtitle}</p>
            )}
          </div>
          <div className={`p-3 rounded-full ${colors.iconClass}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
        
        {/* Source badge and metadata */}
        <div className="mt-4 flex items-center justify-between">
          <Badge variant="outline" className={`text-xs ${colors.badgeClass}`}>
            <Zap className="h-3 w-3 mr-1" />
            {sourceLabel}
          </Badge>
          <div className="text-xs text-gray-500 text-right">
            <div>{timeRange}</div>
            {lastSynced && (
              <div className="flex items-center space-x-1">
                <Clock className="h-3 w-3" />
                <span>
                  {new Date(lastSynced).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Skeleton component for loading states
export function MetricTileSkeleton() {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-12 w-12 rounded-full" />
        </div>
        <div className="mt-4 space-y-2">
          <Skeleton className="h-3 w-full" />
          <div className="flex justify-between">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}