'use client'

export const dynamic = 'force-dynamic'

import { Suspense, useState, useEffect } from 'react'
import {
  AdminCard,
  AdminPageHeader,
  AdminSectionLabel,
  AdminStatusBadge,
  AdminKPICard,
  AdminButton,
  AdminLoadingState,
  AdminEmptyState,
} from '@/components/admin/admin-ui'
import {
  Plus,
  FileText,
  Eye,
  Edit3,
  Globe,
  Lock,
  Users,
  Calendar,
} from 'lucide-react'

interface PageInfo {
  id: string
  title: string
  slug: string
  status: 'published' | 'draft' | 'archived'
  lastModified: string
  author: string
  type: 'static' | 'dynamic' | 'system'
  views?: number
}

function PagesList() {
  const [pages, setPages] = useState<PageInfo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/homepage-blocks')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Failed to fetch'))))
      .then((data) => {
        if (Array.isArray(data?.blocks)) {
          setPages(
            data.blocks.map((b: Record<string, unknown>) => ({
              id: String(b.id || ''),
              title: String(b.title || b.name || 'Untitled'),
              slug: String(b.slug || b.type || ''),
              status: (b.published ? 'published' : 'draft') as PageInfo['status'],
              lastModified: b.updatedAt
                ? new Date(b.updatedAt as string).toISOString().slice(0, 10)
                : '',
              author: 'Admin',
              type: 'static' as const,
            }))
          )
        }
      })
      .catch((err) => {
        console.warn('[pages] Failed to fetch pages:', err.message)
      })
      .finally(() => setLoading(false))
  }, [])

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'system':
        return <Lock size={14} color="#C8322B" />
      case 'dynamic':
        return <Globe size={14} color="#3B7EA1" />
      default:
        return <FileText size={14} color="#78716C" />
    }
  }

  if (loading) {
    return <AdminLoadingState label="Loading pages..." />
  }

  if (pages.length === 0) {
    return (
      <AdminEmptyState
        icon={FileText}
        title="No pages yet"
        description="Pages will appear here when created."
      />
    )
  }

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <AdminKPICard value={pages.length} label="Total Pages" color="#3B7EA1" />
        <AdminKPICard
          value={pages.filter((p) => p.status === 'published').length}
          label="Published"
          color="#2D5A3D"
        />
        <AdminKPICard
          value={pages.filter((p) => p.status === 'draft').length}
          label="Drafts"
          color="#C49A2A"
        />
        <AdminKPICard
          value={pages.reduce((sum, p) => sum + (p.views || 0), 0).toLocaleString()}
          label="Total Views"
          color="#7C3AED"
        />
      </div>

      {/* Pages List */}
      <AdminSectionLabel>All Pages</AdminSectionLabel>
      <AdminCard>
        <div className="p-4 space-y-2">
          {pages.map((page) => (
            <div
              key={page.id}
              className="flex items-center justify-between"
              style={{
                padding: '10px 12px',
                border: '1px solid rgba(214,208,196,0.6)',
                borderRadius: 10,
                transition: 'border-color 0.15s',
              }}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="flex-shrink-0">{getTypeIcon(page.type)}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontWeight: 700,
                        fontSize: 13,
                        color: '#1C1917',
                      }}
                    >
                      {page.title}
                    </span>
                    <AdminStatusBadge status={page.status} />
                  </div>
                  <div
                    className="flex items-center gap-3 mt-1 flex-wrap"
                    style={{
                      fontFamily: 'var(--font-system)',
                      fontSize: 10,
                      color: '#A8A29E',
                    }}
                  >
                    <span>/{page.slug}</span>
                    <span className="flex items-center gap-1">
                      <Calendar size={10} />
                      {page.lastModified}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users size={10} />
                      {page.author}
                    </span>
                    {page.views !== undefined && (
                      <span className="flex items-center gap-1">
                        <Eye size={10} />
                        {page.views} views
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                {page.status === 'published' && (
                  <AdminButton
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(`/${page.slug}`, '_blank')}
                  >
                    <Eye size={14} />
                  </AdminButton>
                )}
                <AdminButton
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    window.location.href = `/admin/content/pages/${page.slug}`
                  }}
                >
                  <Edit3 size={14} />
                </AdminButton>
              </div>
            </div>
          ))}
        </div>
      </AdminCard>
    </div>
  )
}

export default function PagesPage() {
  return (
    <div className="admin-page p-4 md:p-6">
      <AdminPageHeader
        title="Pages"
        subtitle="Manage website pages, privacy policy, terms, and static content"
        action={
          <AdminButton variant="primary" size="sm">
            <Plus size={14} />
            New Page
          </AdminButton>
        }
      />
      <Suspense fallback={<AdminLoadingState label="Loading pages..." />}>
        <PagesList />
      </Suspense>
    </div>
  )
}
