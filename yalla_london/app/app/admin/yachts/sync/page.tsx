'use client'

import React, { useState, useCallback } from 'react'
import { useSiteId } from '@/components/site-provider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  RefreshCw,
  Database,
  CloudDownload,
  CheckCircle,
  AlertTriangle,
  Clock,
  Ship,
  Settings,
  Activity,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SyncResult {
  source: string
  status: 'success' | 'error' | 'skipped'
  message: string
  added: number
  updated: number
  errors: number
  timestamp: string
}

interface SyncSource {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  enabled: boolean
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function YachtSyncPage() {
  const siteId = useSiteId()

  const [syncing, setSyncing] = useState(false)
  const [results, setResults] = useState<SyncResult[]>([])
  const [error, setError] = useState<string | null>(null)

  // Available sync sources (future: configurable via admin settings)
  const syncSources: SyncSource[] = [
    {
      id: 'manual_refresh',
      name: 'Manual Refresh',
      description: 'Re-validate all existing yacht data, update slugs, and recalculate statistics',
      icon: <RefreshCw className="h-5 w-5 text-blue-500" />,
      enabled: true,
    },
    {
      id: 'nausys',
      name: 'NauSYS',
      description: 'Import yachts from NauSYS charter management system',
      icon: <Database className="h-5 w-5 text-indigo-500" />,
      enabled: false,
    },
    {
      id: 'mmk',
      name: 'MMK Systems',
      description: 'Import fleet data from MMK booking platform',
      icon: <CloudDownload className="h-5 w-5 text-purple-500" />,
      enabled: false,
    },
    {
      id: 'charter_index',
      name: 'Charter Index',
      description: 'Sync availability and pricing from Charter Index',
      icon: <Activity className="h-5 w-5 text-teal-500" />,
      enabled: false,
    },
  ]

  // -----------------------------------------------------------------------
  // Sync handler
  // -----------------------------------------------------------------------

  const handleSync = useCallback(async (sourceId: string) => {
    setSyncing(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/yachts/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, source: sourceId }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Sync failed')
      }

      const data = await res.json()
      setResults(prev => [data.result, ...prev])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync operation failed')
    } finally {
      setSyncing(false)
    }
  }, [siteId])

  const handleSyncAll = async () => {
    const enabledSources = syncSources.filter(s => s.enabled)
    for (const source of enabledSources) {
      await handleSync(source.id)
    }
  }

  // -----------------------------------------------------------------------
  // JSX
  // -----------------------------------------------------------------------

  const statusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-500" />
      default: return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sync & Imports</h1>
          <p className="text-sm text-gray-500 mt-1">Synchronize your fleet data from external sources</p>
        </div>
        <Button
          className="bg-blue-600 hover:bg-blue-700"
          onClick={handleSyncAll}
          disabled={syncing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing...' : 'Sync All Sources'}
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Sync Sources */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {syncSources.map(source => (
          <Card key={source.id} className={!source.enabled ? 'opacity-60' : ''}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {source.icon}
                  <div>
                    <h3 className="font-medium text-gray-900">{source.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">{source.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={source.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>
                    {source.enabled ? 'Active' : 'Coming Soon'}
                  </Badge>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSync(source.id)}
                  disabled={!source.enabled || syncing}
                >
                  <RefreshCw className={`h-3 w-3 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                  Sync Now
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Integration Setup Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Integration Setup
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-600 space-y-3">
            <p>
              External charter management systems (NauSYS, MMK, Charter Index) require API credentials
              to be configured. Once connected, yachts will sync automatically on a daily schedule.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">To connect a new source:</h4>
              <ol className="list-decimal list-inside space-y-1 text-blue-800">
                <li>Obtain API credentials from the provider</li>
                <li>Add credentials to environment variables (Vercel dashboard)</li>
                <li>The sync source will automatically activate</li>
              </ol>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-3">
              <p className="text-amber-800 text-sm">
                <strong>Manual Refresh</strong> is always available and will re-validate existing fleet data,
                regenerate slugs for new entries, and update fleet statistics.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sync History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ship className="h-5 w-5" />
            Sync History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {results.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="mx-auto h-10 w-10 text-gray-300" />
              <p className="text-sm text-gray-500 mt-2">No sync operations yet this session</p>
              <p className="text-xs text-gray-400 mt-1">Results will appear here after running a sync</p>
            </div>
          ) : (
            <div className="space-y-3">
              {results.map((result, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 border rounded-lg">
                  {statusIcon(result.status)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{result.source}</span>
                      <Badge className={
                        result.status === 'success' ? 'bg-green-100 text-green-800'
                          : result.status === 'error' ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-600'
                      }>
                        {result.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{result.message}</p>
                    {(result.added > 0 || result.updated > 0 || result.errors > 0) && (
                      <div className="flex gap-4 mt-2 text-xs text-gray-500">
                        <span className="text-green-600">+{result.added} added</span>
                        <span className="text-blue-600">{result.updated} updated</span>
                        {result.errors > 0 && <span className="text-red-600">{result.errors} errors</span>}
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">{result.timestamp}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
