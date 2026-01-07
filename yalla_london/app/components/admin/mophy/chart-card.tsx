'use client'

import React from 'react'
import { MoreHorizontal, TrendingUp, TrendingDown, ChevronDown } from 'lucide-react'

interface ChartCardProps {
  title: string
  subtitle?: string
  children: React.ReactNode
  actions?: React.ReactNode
  className?: string
}

export function ChartCard({ title, subtitle, children, actions, className = '' }: ChartCardProps) {
  return (
    <div className={`bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
            {subtitle && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>
            )}
          </div>
          {actions || (
            <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
              <MoreHorizontal size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {children}
      </div>
    </div>
  )
}

// Simple Bar Chart
interface BarChartData {
  label: string
  value: number
  color?: string
}

interface SimpleBarChartProps {
  data: BarChartData[]
  height?: number
  showLabels?: boolean
  animated?: boolean
}

export function SimpleBarChart({ data, height = 200, showLabels = true, animated = true }: SimpleBarChartProps) {
  const maxValue = Math.max(...data.map(d => d.value))

  return (
    <div style={{ height }} className="flex items-end justify-between gap-2">
      {data.map((item, index) => {
        const barHeight = (item.value / maxValue) * 100
        return (
          <div key={index} className="flex-1 flex flex-col items-center gap-2">
            <div className="w-full relative group">
              {/* Tooltip */}
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                {item.value.toLocaleString()}
              </div>

              <div
                className={`
                  w-full rounded-t-lg transition-all duration-500 cursor-pointer
                  ${item.color || 'bg-gradient-to-t from-primary to-purple-500'}
                  hover:opacity-80
                  ${animated ? 'animate-grow-up' : ''}
                `}
                style={{
                  height: `${barHeight}%`,
                  minHeight: '4px',
                  animationDelay: `${index * 100}ms`
                }}
              />
            </div>
            {showLabels && (
              <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-full">
                {item.label}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

// Donut Chart
interface DonutChartData {
  label: string
  value: number
  color: string
}

interface DonutChartProps {
  data: DonutChartData[]
  size?: number
  strokeWidth?: number
  centerLabel?: string
  centerValue?: string
}

export function DonutChart({
  data,
  size = 200,
  strokeWidth = 24,
  centerLabel,
  centerValue
}: DonutChartProps) {
  const total = data.reduce((acc, item) => acc + item.value, 0)
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  let cumulativePercent = 0

  return (
    <div className="relative inline-block">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          className="text-gray-100 dark:text-slate-800"
          strokeWidth={strokeWidth}
        />

        {/* Data Segments */}
        {data.map((item, index) => {
          const percent = item.value / total
          const strokeDasharray = `${percent * circumference} ${circumference}`
          const strokeDashoffset = -cumulativePercent * circumference
          cumulativePercent += percent

          return (
            <circle
              key={index}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={item.color}
              strokeWidth={strokeWidth}
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-500 hover:opacity-80"
              strokeLinecap="round"
            />
          )
        })}
      </svg>

      {/* Center Text */}
      {(centerLabel || centerValue) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {centerValue && (
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {centerValue}
            </span>
          )}
          {centerLabel && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {centerLabel}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// Line Chart (Simple SVG)
interface LineChartData {
  label: string
  value: number
}

interface LineChartProps {
  data: LineChartData[]
  height?: number
  color?: string
  filled?: boolean
}

export function LineChart({ data, height = 150, color = '#7C3AED', filled = true }: LineChartProps) {
  const width = 400
  const padding = 20
  const chartWidth = width - padding * 2
  const chartHeight = height - padding * 2

  const maxValue = Math.max(...data.map(d => d.value))
  const minValue = Math.min(...data.map(d => d.value))
  const range = maxValue - minValue || 1

  const points = data.map((item, index) => {
    const x = padding + (index / (data.length - 1)) * chartWidth
    const y = padding + chartHeight - ((item.value - minValue) / range) * chartHeight
    return { x, y, ...item }
  })

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${padding} ${height - padding} Z`

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }}>
      {/* Grid Lines */}
      {[0, 25, 50, 75, 100].map((percent, i) => (
        <line
          key={i}
          x1={padding}
          x2={width - padding}
          y1={padding + (chartHeight * (100 - percent) / 100)}
          y2={padding + (chartHeight * (100 - percent) / 100)}
          stroke="currentColor"
          className="text-gray-100 dark:text-slate-800"
          strokeWidth="1"
        />
      ))}

      {/* Filled Area */}
      {filled && (
        <path
          d={areaPath}
          fill={`url(#gradient-${color.replace('#', '')})`}
          opacity="0.2"
        />
      )}

      {/* Line */}
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Points */}
      {points.map((point, i) => (
        <g key={i} className="group">
          <circle
            cx={point.x}
            cy={point.y}
            r="6"
            fill={color}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          />
          <circle
            cx={point.x}
            cy={point.y}
            r="4"
            fill="white"
            stroke={color}
            strokeWidth="2"
          />
        </g>
      ))}

      {/* Gradient Definition */}
      <defs>
        <linearGradient id={`gradient-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  )
}

// Progress Bar
interface ProgressBarProps {
  value: number
  max?: number
  label?: string
  showValue?: boolean
  color?: string
  size?: 'sm' | 'md' | 'lg'
}

export function ProgressBar({
  value,
  max = 100,
  label,
  showValue = true,
  color = 'from-primary to-purple-600',
  size = 'md'
}: ProgressBarProps) {
  const percentage = Math.min((value / max) * 100, 100)

  const sizeClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4'
  }

  return (
    <div className="space-y-2">
      {(label || showValue) && (
        <div className="flex items-center justify-between text-sm">
          {label && <span className="text-gray-600 dark:text-gray-400">{label}</span>}
          {showValue && <span className="font-medium text-gray-900 dark:text-white">{percentage.toFixed(0)}%</span>}
        </div>
      )}
      <div className={`w-full bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden ${sizeClasses[size]}`}>
        <div
          className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

// Mini Sparkline
interface SparklineProps {
  data: number[]
  width?: number
  height?: number
  color?: string
}

export function Sparkline({ data, width = 100, height = 30, color = '#7C3AED' }: SparklineProps) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width
    const y = height - ((value - min) / range) * height
    return `${x},${y}`
  }).join(' ')

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
