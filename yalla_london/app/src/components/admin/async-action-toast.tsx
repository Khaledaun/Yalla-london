'use client'

import React, { useState, useEffect } from 'react'
import { Progress } from '@/components/ui/progress'
import { CheckCircle2, AlertTriangle, RefreshCw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export interface AsyncAction {
  id: string
  title: string
  description?: string
  progress: number
  status: 'pending' | 'in_progress' | 'completed' | 'error'
  error?: string
}

interface AsyncActionToastProps {
  action: AsyncAction
  onDismiss: (id: string) => void
  onRetry?: (id: string) => void
}

export function AsyncActionToast({ action, onDismiss, onRetry }: AsyncActionToastProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    if (action.status === 'completed') {
      const timer = setTimeout(() => {
        setIsVisible(false)
        setTimeout(() => onDismiss(action.id), 300)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [action.status, action.id, onDismiss])

  if (!isVisible) return null

  const getStatusIcon = () => {
    switch (action.status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'in_progress':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
      default:
        return <RefreshCw className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = () => {
    switch (action.status) {
      case 'completed':
        return 'border-green-200 bg-green-50'
      case 'error':
        return 'border-red-200 bg-red-50'
      case 'in_progress':
        return 'border-blue-200 bg-blue-50'
      default:
        return 'border-gray-200 bg-gray-50'
    }
  }

  return (
    <Card className={`relative mb-2 transition-all duration-300 ${getStatusColor()} ${
      isVisible ? 'opacity-100 transform translate-x-0' : 'opacity-0 transform translate-x-full'
    }`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3 flex-1">
            {getStatusIcon()}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">
                {action.title}
              </div>
              {action.description && (
                <div className="text-xs text-gray-500 mt-1">
                  {action.description}
                </div>
              )}
              {action.status === 'error' && action.error && (
                <div className="text-xs text-red-600 mt-1">
                  Error: {action.error}
                </div>
              )}
              {(action.status === 'in_progress' || action.status === 'pending') && (
                <div className="mt-2">
                  <Progress value={action.progress} className="h-1" />
                  <div className="text-xs text-gray-500 mt-1">
                    {action.progress}% complete
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-1 ml-2">
            {action.status === 'error' && onRetry && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onRetry(action.id)}
                className="h-6 w-6 p-0 text-red-600 hover:bg-red-100"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDismiss(action.id)}
              className="h-6 w-6 p-0 text-gray-400 hover:bg-gray-100"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface AsyncActionManagerProps {
  actions: AsyncAction[]
  onDismiss: (id: string) => void
  onRetry?: (id: string) => void
  className?: string
}

export function AsyncActionManager({ 
  actions, 
  onDismiss, 
  onRetry, 
  className = "fixed bottom-4 right-4 z-50 w-80" 
}: AsyncActionManagerProps) {
  if (actions.length === 0) return null

  return (
    <div className={className}>
      {actions.map(action => (
        <AsyncActionToast
          key={action.id}
          action={action}
          onDismiss={onDismiss}
          onRetry={onRetry}
        />
      ))}
    </div>
  )
}