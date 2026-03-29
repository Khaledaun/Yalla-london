'use client'

import React, { useState, useCallback } from 'react'
import { useSiteId } from '@/components/site-provider'
import {
  AdminCard,
  AdminPageHeader,
  AdminButton,
  AdminStatusBadge,
  AdminEmptyState,
  AdminAlertBanner,
  AdminSectionLabel,
} from '@/components/admin/admin-ui'
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
      icon: <RefreshCw size={18} color="#3B7EA1" />,
      enabled: true,
    },
    {
      id: 'nausys',
      name: 'NauSYS',
      description: 'Import yachts from NauSYS charter management system',
      icon: <Database size={18} color="#7C3AED" />,
      enabled: false,
    },
    {
      id: 'mmk',
      name: 'MMK Systems',
      description: 'Import fleet data from MMK booking platform',
      icon: <CloudDownload size={18} color="#C49A2A" />,
      enabled: false,
    },
    {
      id: 'charter_index',
      name: 'Charter Index',
      description: 'Sync availability and pricing from Charter Index',
      icon: <Activity size={18} color="#2D5A3D" />,
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

  return (
    <div className="admin-page p-4 md:p-6">
      <AdminPageHeader
        title="Sync & Imports"
        subtitle="Synchronize your fleet data from external sources"
        backHref="/admin/yachts"
        action={
          <AdminButton variant="primary" onClick={handleSyncAll} loading={syncing} disabled={syncing}>
            <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing...' : 'Sync All Sources'}
          </AdminButton>
        }
      />

      {error && (
        <AdminAlertBanner
          severity="critical"
          message={error}
          onDismiss={() => setError(null)}
        />
      )}

      {/* Sync Sources */}
      <AdminSectionLabel>Data Sources</AdminSectionLabel>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {syncSources.map(source => (
          <AdminCard
            key={source.id}
            className={!source.enabled ? 'opacity-50' : ''}
            accent={source.enabled}
            accentColor="blue"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    backgroundColor: '#FAF8F4',
                    border: '1px solid rgba(214,208,196,0.6)',
                  }}
                >
                  {source.icon}
                </div>
                <div>
                  <p
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontWeight: 700,
                      fontSize: 14,
                      color: '#1C1917',
                    }}
                  >
                    {source.name}
                  </p>
                  <p
                    style={{
                      fontFamily: 'var(--font-system)',
                      fontSize: 11,
                      color: '#78716C',
                      marginTop: 2,
                      lineHeight: 1.4,
                    }}
                  >
                    {source.description}
                  </p>
                </div>
              </div>
              <AdminStatusBadge
                status={source.enabled ? 'active' : 'inactive'}
                label={source.enabled ? 'Active' : 'Coming Soon'}
              />
            </div>
            <div className="mt-4 flex justify-end">
              <AdminButton
                variant="secondary"
                size="sm"
                onClick={() => handleSync(source.id)}
                disabled={!source.enabled || syncing}
                loading={syncing}
              >
                <RefreshCw size={11} />
                Sync Now
              </AdminButton>
            </div>
          </AdminCard>
        ))}
      </div>

      {/* Integration Setup Info */}
      <AdminCard className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Settings size={15} color="#78716C" />
          <p
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 14,
              color: '#1C1917',
            }}
          >
            Integration Setup
          </p>
        </div>
        <p
          style={{
            fontFamily: 'var(--font-system)',
            fontSize: 12,
            color: '#5C564F',
            lineHeight: 1.6,
            marginBottom: 12,
          }}
        >
          External charter management systems (NauSYS, MMK, Charter Index) require API credentials
          to be configured. Once connected, yachts will sync automatically on a daily schedule.
        </p>
        <AdminAlertBanner
          severity="info"
          message="To connect a new source:"
          detail="1. Obtain API credentials from the provider  2. Add credentials to environment variables (Vercel dashboard)  3. The sync source will automatically activate"
        />
        <div className="mt-3">
          <AdminAlertBanner
            severity="warning"
            message="Manual Refresh is always available"
            detail="It will re-validate existing fleet data, regenerate slugs for new entries, and update fleet statistics."
          />
        </div>
      </AdminCard>

      {/* Sync History */}
      <AdminCard>
        <div className="flex items-center gap-2 mb-4">
          <Ship size={15} color="#78716C" />
          <AdminSectionLabel>Sync History</AdminSectionLabel>
        </div>

        {results.length === 0 ? (
          <AdminEmptyState
            icon={Clock}
            title="No sync operations yet"
            description="Results will appear here after running a sync"
          />
        ) : (
          <div className="space-y-3">
            {results.map((result, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 rounded-xl"
                style={{
                  padding: '12px',
                  border: '1px solid rgba(214,208,196,0.5)',
                  backgroundColor: result.status === 'error' ? 'rgba(200,50,43,0.03)' : 'transparent',
                }}
              >
                {result.status === 'success' ? (
                  <CheckCircle size={16} color="#2D5A3D" />
                ) : result.status === 'error' ? (
                  <AlertTriangle size={16} color="#C8322B" />
                ) : (
                  <Clock size={16} color="#78716C" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontWeight: 600,
                        fontSize: 13,
                        color: '#1C1917',
                      }}
                    >
                      {result.source}
                    </span>
                    <AdminStatusBadge status={result.status === 'success' ? 'success' : result.status === 'error' ? 'error' : 'inactive'} label={result.status} />
                  </div>
                  <p
                    style={{
                      fontFamily: 'var(--font-system)',
                      fontSize: 11,
                      color: '#5C564F',
                      marginTop: 4,
                    }}
                  >
                    {result.message}
                  </p>
                  {(result.added > 0 || result.updated > 0 || result.errors > 0) && (
                    <div className="flex gap-4 mt-2">
                      <span style={{ fontFamily: 'var(--font-system)', fontSize: 10, color: '#2D5A3D', fontWeight: 600 }}>
                        +{result.added} added
                      </span>
                      <span style={{ fontFamily: 'var(--font-system)', fontSize: 10, color: '#3B7EA1', fontWeight: 600 }}>
                        {result.updated} updated
                      </span>
                      {result.errors > 0 && (
                        <span style={{ fontFamily: 'var(--font-system)', fontSize: 10, color: '#C8322B', fontWeight: 600 }}>
                          {result.errors} errors
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <span style={{ fontFamily: 'var(--font-system)', fontSize: 10, color: '#A8A29E', flexShrink: 0 }}>
                  {result.timestamp}
                </span>
              </div>
            ))}
          </div>
        )}
      </AdminCard>
    </div>
  )
}
