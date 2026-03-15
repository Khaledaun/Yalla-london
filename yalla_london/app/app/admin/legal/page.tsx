'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  FileText, Plus, Edit3, Eye, Save, Trash2,
  Loader2, AlertCircle, CheckCircle, Sparkles, Globe,
} from 'lucide-react'
import { StatusSummary, StatusCard } from '@/components/admin/status-summary'
import { ResponsiveTable, Column } from '@/components/admin/responsive-table'
import { BottomSheet } from '@/components/admin/bottom-sheet'
import {
  AdminCard, AdminPageHeader, AdminButton, AdminSectionLabel,
  AdminAlertBanner,
} from '@/components/admin/admin-ui'

interface LegalPage {
  id: string
  type: string
  title: string
  siteId: string
  locale: string
  content: string
  lastUpdated: string
  status: 'published' | 'draft'
  version: number
}

const LEGAL_TYPES = [
  { id: 'privacy', label: 'Privacy Policy' },
  { id: 'terms', label: 'Terms of Service' },
  { id: 'cookies', label: 'Cookie Policy' },
  { id: 'affiliate-disclosure', label: 'Affiliate Disclosure' },
  { id: 'about', label: 'About Us' },
  { id: 'contact', label: 'Contact' },
  { id: 'accessibility', label: 'Accessibility Statement' },
]

export default function LegalPagesManager() {
  const [pages, setPages] = useState<LegalPage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPage, setSelectedPage] = useState<LegalPage | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [editTitle, setEditTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const [aiLoading, setAiLoading] = useState<string | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [createType, setCreateType] = useState('')
  const [createLocale, setCreateLocale] = useState('en')
  const [createSiteId, setCreateSiteId] = useState('')

  const fetchPages = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/legal')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setPages(data.pages || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load legal pages')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPages() }, [fetchPages])

  const handleSave = async () => {
    if (!selectedPage) return
    setSaving(true)
    try {
      const res = await fetch('/api/admin/legal', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedPage.id,
          title: editTitle,
          content: editContent,
        }),
      })
      if (!res.ok) throw new Error('Save failed')
      setEditorOpen(false)
      await fetchPages()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleCreate = async () => {
    if (!createType) return
    setSaving(true)
    try {
      const typeLabel = LEGAL_TYPES.find(t => t.id === createType)?.label || createType
      const res = await fetch('/api/admin/legal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: createType,
          title: typeLabel,
          siteId: createSiteId || undefined,
          locale: createLocale,
          content: `<h1>${typeLabel}</h1>\n<p>Content goes here.</p>`,
        }),
      })
      if (!res.ok) throw new Error('Create failed')
      setCreateType('')
      await fetchPages()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (pageId: string) => {
    if (!confirm('Delete this legal page?')) return
    try {
      const res = await fetch('/api/admin/legal', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: pageId }),
      })
      if (!res.ok) throw new Error('Delete failed')
      await fetchPages()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  const handleAiAction = async (action: string) => {
    if (!selectedPage) return
    setAiLoading(action)
    try {
      const res = await fetch('/api/admin/legal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ai_' + action,
          id: selectedPage.id,
          content: editContent,
        }),
      })
      if (!res.ok) throw new Error('AI action failed')
      const data = await res.json()
      if (data.content) {
        setEditContent(data.content)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI action failed')
    } finally {
      setAiLoading(null)
    }
  }

  const openEditor = (page: LegalPage) => {
    setSelectedPage(page)
    setEditTitle(page.title)
    setEditContent(page.content)
    setEditorOpen(true)
  }

  // Status summary
  const published = pages.filter(p => p.status === 'published').length
  const drafts = pages.filter(p => p.status === 'draft').length
  const statusCards: StatusCard[] = [
    {
      heading: 'PUBLISHED',
      summary: `${published} legal pages live on site`,
      metric: published,
      accent: published > 0 ? 'green' : 'neutral',
    },
    {
      heading: 'DRAFTS',
      summary: drafts > 0 ? `${drafts} pages need review` : 'All pages published',
      metric: drafts,
      accent: drafts > 0 ? 'amber' : 'green',
    },
    {
      heading: 'COVERAGE',
      summary: `${pages.length} of ${LEGAL_TYPES.length} template types created`,
      metric: `${pages.length}/${LEGAL_TYPES.length}`,
      accent: pages.length >= LEGAL_TYPES.length ? 'green' : 'blue',
    },
  ]

  // Table columns
  const columns: Column<LegalPage>[] = [
    {
      key: 'title',
      label: 'Page',
      render: (page) => (
        <div>
          <div style={{ fontWeight: 600, color: '#1C1917', fontSize: 13 }}>{page.title}</div>
          <div style={{ fontSize: 10, color: '#78716C', marginTop: 2, fontFamily: 'var(--font-system)' }}>
            {page.type} · {page.locale.toUpperCase()}
            {page.siteId && <span> · {page.siteId}</span>}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (page) => (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full" style={{
          fontSize: 10, fontWeight: 600, fontFamily: 'var(--font-system)',
          backgroundColor: page.status === 'published' ? 'rgba(45,90,61,0.08)' : 'rgba(196,154,42,0.08)',
          color: page.status === 'published' ? '#2D5A3D' : '#C49A2A',
        }}>
          {page.status === 'published' ? <CheckCircle style={{ width: 12, height: 12 }} /> : <Edit3 style={{ width: 12, height: 12 }} />}
          {page.status}
        </span>
      ),
    },
    {
      key: 'updated',
      label: 'Updated',
      hideOnMobile: true,
      render: (page) => (
        <span style={{ fontSize: 12, color: '#78716C', fontFamily: 'var(--font-system)' }}>
          {new Date(page.lastUpdated).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'version',
      label: 'Ver',
      hideOnMobile: true,
      render: (page) => (
        <span style={{ fontSize: 12, color: '#A8A29E', fontFamily: 'var(--font-system)' }}>v{page.version}</span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      hideOnMobile: true,
      render: (page) => (
        <div className="flex items-center gap-1">
          <button onClick={(e) => { e.stopPropagation(); openEditor(page) }}
                  className="p-2 rounded-lg hover:bg-stone-100 transition-colors" style={{ color: '#3B7EA1', minHeight: 44, minWidth: 44 }} title="Edit">
            <Edit3 style={{ width: 16, height: 16 }} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); setSelectedPage(page); setPreviewOpen(true) }}
                  className="p-2 rounded-lg hover:bg-stone-100 transition-colors" style={{ color: '#78716C', minHeight: 44, minWidth: 44 }} title="Preview">
            <Eye style={{ width: 16, height: 16 }} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); handleDelete(page.id) }}
                  className="p-2 rounded-lg hover:bg-stone-100 transition-colors" style={{ color: '#C8322B', minHeight: 44, minWidth: 44 }} title="Delete">
            <Trash2 style={{ width: 16, height: 16 }} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="admin-page p-4 md:p-6">
      <AdminPageHeader
        title="Legal Pages"
        subtitle="Privacy, terms, and compliance"
      />

      {/* Error */}
      {error && (
        <AdminAlertBanner
          severity="critical"
          message={error}
          onDismiss={() => setError(null)}
        />
      )}

      {/* Status */}
      <StatusSummary cards={statusCards} loading={loading} />

      {/* Create new */}
      <AdminCard className="mb-4">
        <div className="flex flex-col md:flex-row items-start md:items-end gap-3">
          <div className="flex-1 w-full">
            <AdminSectionLabel>New Page Type</AdminSectionLabel>
            <select value={createType} onChange={(e) => setCreateType(e.target.value)}
                    className="admin-select w-full">
              <option value="">Select type...</option>
              {LEGAL_TYPES.map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="w-full md:w-24">
            <AdminSectionLabel>Locale</AdminSectionLabel>
            <select value={createLocale} onChange={(e) => setCreateLocale(e.target.value)}
                    className="admin-select w-full">
              <option value="en">EN</option>
              <option value="ar">AR</option>
            </select>
          </div>
          <AdminButton
            variant="primary"
            onClick={handleCreate}
            disabled={!createType || saving}
            loading={saving}
          >
            <Plus style={{ width: 14, height: 14 }} />
            Create
          </AdminButton>
        </div>
      </AdminCard>

      {/* Table */}
      <ResponsiveTable<LegalPage>
        columns={columns}
        data={pages}
        keyExtractor={(p) => p.id}
        onRowClick={openEditor}
        loading={loading}
        loadingRows={4}
        emptyMessage="No legal pages yet. Create one above."
      />

      {/* Editor Bottom Sheet */}
      <BottomSheet open={editorOpen} onClose={() => setEditorOpen(false)} title={selectedPage ? 'Edit: ' + selectedPage.title : 'Edit'} maxHeight="95vh">
        {selectedPage && (
          <div className="space-y-4">
            {/* Title */}
            <div>
              <AdminSectionLabel>Title</AdminSectionLabel>
              <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                     className="admin-input w-full"
                     style={{ fontSize: 14 }} />
            </div>

            {/* Content */}
            <div>
              <AdminSectionLabel>Content (HTML)</AdminSectionLabel>
              <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)}
                        rows={12}
                        className="admin-input w-full font-mono text-sm"
                        style={{ resize: 'vertical' }} />
            </div>

            {/* AI Actions */}
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'improve', label: 'Improve Clarity', icon: Sparkles },
                { id: 'translate', label: 'Translate AR', icon: Globe },
                { id: 'detect_gaps', label: 'Find Missing Clauses', icon: AlertCircle },
              ].map(action => (
                <AdminButton key={action.id}
                        variant="secondary"
                        size="sm"
                        onClick={() => handleAiAction(action.id)}
                        disabled={aiLoading !== null}
                        loading={aiLoading === action.id}
                >
                  <action.icon style={{ width: 14, height: 14 }} />
                  {action.label}
                </AdminButton>
              ))}
            </div>

            {/* Save */}
            <AdminButton
              variant="primary"
              size="lg"
              onClick={handleSave}
              disabled={saving}
              loading={saving}
              className="w-full justify-center"
            >
              <Save style={{ width: 16, height: 16 }} />
              {saving ? 'Saving...' : 'Save Changes'}
            </AdminButton>
          </div>
        )}
      </BottomSheet>

      {/* Preview Bottom Sheet */}
      <BottomSheet open={previewOpen} onClose={() => setPreviewOpen(false)} title={selectedPage ? 'Preview: ' + selectedPage.title : 'Preview'} maxHeight="90vh">
        {selectedPage && (
          <SafePreview html={selectedPage.content} />
        )}
      </BottomSheet>
    </div>
  )
}

// Sanitize HTML before rendering in preview
function SafePreview({ html }: { html: string }) {
  const [sanitized, setSanitized] = useState(html)
  useEffect(() => {
    import('@/lib/html-sanitizer').then(({ sanitizeHtml }) => {
      setSanitized(sanitizeHtml(html))
    }).catch(() => {
      setSanitized(html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ''))
    })
  }, [html])
  return <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: sanitized }} />
}
