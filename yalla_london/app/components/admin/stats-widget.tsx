'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  ArrowUpRight,
  ArrowDownRight,
  MoreHorizontal,
  ExternalLink
} from 'lucide-react'

export interface StatsWidgetProps {
  title: string
  value: string | number
  subtitle?: string
  change?: {
    value: number
    period: string
    type: 'increase' | 'decrease' | 'neutral'
  }
  icon: React.ComponentType<any>
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'neutral'
  loading?: boolean
  actions?: {
    label: string
    href?: string
    onClick?: () => void
  }[]
  size?: 'sm' | 'md' | 'lg'
  trend?: {
    data: number[]
    period: string
  }
}

export function StatsWidget({
  title,
  value,
  subtitle,
  change,
  icon: Icon,
  color = 'primary',
  loading = false,
  actions,
  size = 'md',
  trend
}: StatsWidgetProps) {
  const colorClasses = {
    primary: {
      icon: 'text-violet-600 bg-violet-100',
      change: {
        increase: 'text-emerald-600 bg-emerald-50',
        decrease: 'text-red-600 bg-red-50',
        neutral: 'text-slate-600 bg-slate-50'
      }
    },
    secondary: {
      icon: 'text-amber-600 bg-amber-100',
      change: {
        increase: 'text-emerald-600 bg-emerald-50',
        decrease: 'text-red-600 bg-red-50',
        neutral: 'text-slate-600 bg-slate-50'
      }
    },
    success: {
      icon: 'text-emerald-600 bg-emerald-100',
      change: {
        increase: 'text-emerald-600 bg-emerald-50',
        decrease: 'text-red-600 bg-red-50',
        neutral: 'text-slate-600 bg-slate-50'
      }
    },
    warning: {
      icon: 'text-amber-600 bg-amber-100',
      change: {
        increase: 'text-emerald-600 bg-emerald-50',
        decrease: 'text-red-600 bg-red-50',
        neutral: 'text-slate-600 bg-slate-50'
      }
    },
    error: {
      icon: 'text-red-600 bg-red-100',
      change: {
        increase: 'text-emerald-600 bg-emerald-50',
        decrease: 'text-red-600 bg-red-50',
        neutral: 'text-slate-600 bg-slate-50'
      }
    },
    neutral: {
      icon: 'text-slate-600 bg-slate-100',
      change: {
        increase: 'text-emerald-600 bg-emerald-50',
        decrease: 'text-red-600 bg-red-50',
        neutral: 'text-slate-600 bg-slate-50'
      }
    }
  }

  const sizeClasses = {
    sm: {
      card: 'p-4',
      icon: 'h-8 w-8 p-1.5',
      title: 'text-sm',
      value: 'text-xl',
      subtitle: 'text-xs'
    },
    md: {
      card: 'p-6',
      icon: 'h-10 w-10 p-2',
      title: 'text-sm',
      value: 'text-2xl',
      subtitle: 'text-sm'
    },
    lg: {
      card: 'p-8',
      icon: 'h-12 w-12 p-2.5',
      title: 'text-base',
      value: 'text-3xl',
      subtitle: 'text-base'
    }
  }

  const renderTrendIcon = () => {
    if (!change) return null
    
    switch (change.type) {
      case 'increase':
        return <TrendingUp className="h-3 w-3" />
      case 'decrease':
        return <TrendingDown className="h-3 w-3" />
      default:
        return <Minus className="h-3 w-3" />
    }
  }

  const renderChange = () => {
    if (!change) return null

    return (
      <div className={`
        inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
        ${colorClasses[color].change[change.type]}
      `}>
        {renderTrendIcon()}
        <span>{Math.abs(change.value)}%</span>
        <span className="text-xs opacity-75">{change.period}</span>
      </div>
    )
  }

  if (loading) {
    return (
      <Card className="relative overflow-hidden">
        <div className={sizeClasses[size].card}>
          <div className="animate-pulse">
            <div className="flex items-center justify-between mb-4">
              <div className="h-4 bg-slate-200 rounded w-24"></div>
              <div className={`${sizeClasses[size].icon} bg-slate-200 rounded-lg`}></div>
            </div>
            <div className="space-y-2">
              <div className="h-8 bg-slate-200 rounded w-20"></div>
              <div className="h-3 bg-slate-200 rounded w-16"></div>
            </div>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-200 bg-white border-0 shadow-sm hover:shadow-elevated">
      <CardContent className={sizeClasses[size].card}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-3">
              <h3 className={`font-medium text-slate-600 ${sizeClasses[size].title}`}>
                {title}
              </h3>
              <div className={`
                rounded-lg flex items-center justify-center
                ${sizeClasses[size].icon} ${colorClasses[color].icon}
              `}>
                <Icon className="h-full w-full" />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className={`font-bold text-slate-900 ${sizeClasses[size].value}`}>
                {typeof value === 'number' ? value.toLocaleString() : value}
              </div>
              
              <div className="flex items-center gap-2">
                {renderChange()}
                {subtitle && (
                  <span className={`text-slate-500 ${sizeClasses[size].subtitle}`}>
                    {subtitle}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Trend visualization */}
        {trend && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span>Trend over {trend.period}</span>
              <span className="opacity-60">→</span>
            </div>
            <div className="h-8 flex items-end gap-1">
              {trend.data.map((point, index) => (
                <div
                  key={index}
                  className="flex-1 bg-slate-200 rounded-sm transition-all duration-300 hover:bg-violet-200"
                  style={{
                    height: `${(point / Math.max(...trend.data)) * 100}%`,
                    minHeight: '2px'
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        {actions && actions.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2">
              {actions.slice(0, 2).map((action, index) => (
                action.href ? (
                  <Button
                    key={index}
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7 px-2 text-slate-600 hover:text-violet-600"
                    asChild
                  >
                    <a href={action.href} className="flex items-center gap-1">
                      <span>{action.label}</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                ) : (
                  <Button
                    key={index}
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7 px-2 text-slate-600 hover:text-violet-600"
                    onClick={action.onClick}
                  >
                    {action.label}
                  </Button>
                )
              ))}
              
              {actions.length > 2 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-slate-400 hover:text-slate-600"
                >
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Preset configurations for common stats
export const statsPresets = {
  pageViews: {
    title: 'Page Views',
    icon: TrendingUp,
    color: 'primary' as const,
  },
  
  users: {
    title: 'Active Users',
    icon: TrendingUp,
    color: 'success' as const,
  },
  
  conversions: {
    title: 'Conversions',
    icon: TrendingUp,
    color: 'warning' as const,
  },
  
  revenue: {
    title: 'Revenue',
    icon: TrendingUp,
    color: 'success' as const,
  },
}