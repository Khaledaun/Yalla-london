'use client'

import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  onRetry?: () => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

export class DashboardErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Dashboard Error Boundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              <span>Dashboard Error</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600 mb-4">
              Something went wrong loading this dashboard section. The error has been logged.
            </p>
            <div className="space-y-2 text-sm text-red-500 mb-4">
              <div>Error: {this.state.error?.message || 'Unknown error'}</div>
            </div>
            <div className="flex space-x-2">
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  this.setState({ hasError: false, error: undefined })
                  this.props.onRetry?.()
                }}
                className="border-red-200 text-red-700 hover:bg-red-100"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => window.location.reload()}
                className="text-red-600 hover:bg-red-100"
              >
                Reload Page
              </Button>
            </div>
          </CardContent>
        </Card>
      )
    }

    return this.props.children
  }
}

export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  onRetry?: () => void
) {
  return function WrappedComponent(props: P) {
    return (
      <DashboardErrorBoundary onRetry={onRetry}>
        <Component {...props} />
      </DashboardErrorBoundary>
    )
  }
}