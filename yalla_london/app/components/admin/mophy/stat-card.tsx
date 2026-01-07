'use client'

import React from 'react'
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  change?: number
  changeLabel?: string
  icon: LucideIcon
  iconBg?: string
  trend?: 'up' | 'down' | 'neutral'
  chartData?: number[]
  variant?: 'default' | 'gradient' | 'outline'
}

export function StatCard({
  title,
  value,
  change,
  changeLabel = 'vs last month',
  icon: Icon,
  iconBg = 'from-primary to-purple-600',
  trend = 'up',
  chartData,
  variant = 'default'
}: StatCardProps) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus

  const baseClasses = 'relative p-6 rounded-2xl transition-all duration-300 hover:shadow-lg group'

  const variantClasses = {
    default: 'bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 hover:border-primary/20',
    gradient: `bg-gradient-to-br ${iconBg} text-white`,
    outline: 'bg-transparent border-2 border-gray-200 dark:border-slate-700 hover:border-primary'
  }

  const isGradient = variant === 'gradient'

  return (
    <div className={`${baseClasses} ${variantClasses[variant]}`}>
      {/* Background Decoration */}
      {!isGradient && (
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/5 to-purple-500/5 rounded-bl-[100px] -z-0" />
      )}

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className={`
            w-12 h-12 rounded-xl flex items-center justify-center
            ${isGradient
              ? 'bg-white/20 backdrop-blur-sm'
              : `bg-gradient-to-br ${iconBg} shadow-lg shadow-primary/20`
            }
          `}>
            <Icon size={22} className={isGradient ? 'text-white' : 'text-white'} />
          </div>

          {change !== undefined && (
            <div className={`
              flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
              ${isGradient
                ? 'bg-white/20 text-white'
                : trend === 'up'
                  ? 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                  : trend === 'down'
                    ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                    : 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-400'
              }
            `}>
              <TrendIcon size={12} />
              <span>{Math.abs(change)}%</span>
            </div>
          )}
        </div>

        {/* Value */}
        <div className="mb-2">
          <h3 className={`text-3xl font-bold ${isGradient ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
            {value}
          </h3>
        </div>

        {/* Title */}
        <p className={`text-sm font-medium ${isGradient ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
          {title}
        </p>

        {/* Mini Chart */}
        {chartData && chartData.length > 0 && (
          <div className="mt-4 flex items-end gap-1 h-10">
            {chartData.map((value, index) => {
              const max = Math.max(...chartData)
              const height = (value / max) * 100
              return (
                <div
                  key={index}
                  className={`
                    flex-1 rounded-t transition-all duration-300 group-hover:scale-110
                    ${isGradient
                      ? 'bg-white/30 hover:bg-white/50'
                      : 'bg-primary/20 hover:bg-primary/40'
                    }
                  `}
                  style={{ height: `${height}%` }}
                />
              )
            })}
          </div>
        )}

        {/* Change Label */}
        {change !== undefined && changeLabel && (
          <p className={`mt-2 text-xs ${isGradient ? 'text-white/60' : 'text-gray-400'}`}>
            {changeLabel}
          </p>
        )}
      </div>
    </div>
  )
}

// Multiple stat cards in a row
interface StatCardsGridProps {
  children: React.ReactNode
  columns?: 2 | 3 | 4
}

export function StatCardsGrid({ children, columns = 4 }: StatCardsGridProps) {
  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
  }

  return (
    <div className={`grid ${gridCols[columns]} gap-4 lg:gap-6`}>
      {children}
    </div>
  )
}
