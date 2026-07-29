'use client'

import { useState, useEffect, useCallback } from 'react'
import { useConfirm } from '@/components/admin/admin-ui'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

interface GuideTemplate {
  id: string
  name: string
  icon: string
  description: string
  inputs: { key: string; label: string; type: 'text' | 'select' | 'number' | 'textarea'; placeholder?: string; required: boolean; options?: string[] }[]
  sectionTypes: string[]
  pageEstimate: [number, number]
  suggestedPrice: number
  tags: string[]
  category: 'destination' | 'planning' | 'niche' | 'food' | 'experience'
}

interface PdfGuide {
  id: string
  title: string
  slug: string
  description: string | null
  site: string
  style: string
  language: string
  status: string
  price: number | null
  isGated: boolean
  downloads: number
  coverDesignId: string | null
  createdAt: string
}

interface ArticleOption {
  id: string
  title_en: string
  slug: string
}

interface EditMessage {
  role: 'user' | 'assistant'
  text: string
  ts: number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_META: Record<string, { label: string; color: string }> = {
  destination: { label: 'Destination', color: 'var(--admin-blue)' },
  planning: { label: 'Planning', color: 'var(--admin-green)' },
  niche: { label: 'Niche', color: '#7C3AED' },
  food: { label: 'Food & Dining', color: 'var(--admin-gold)' },
  experience: { label: 'Experience', color: 'var(--admin-red)' },
}

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  ready: { bg: '#dcfce7', color: '#166534', label: 'Ready' },
  generated: { bg: '#fef3c7', color: '#92400e', label: 'HTML Only' },
  published: { bg: '#dbeafe', color: '#1e40af', label: 'Published' },
  draft: { bg: '#f3f4f6', color: '#374151', label: 'Draft' },
}

// ─── Shared Styles ────────────────────────────────────────────────────────────

const card = { background: '#fff', border: '1px solid rgba(214,208,196,0.5)', borderRadius: 12, padding: 24 } as const
const inputStyle = { width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, fontFamily: 'var(--font-system)' } as const
const labelStyle = { fontWeight: 600, fontSize: 14, display: 'block', marginBottom: 6 } as const
const btnPrimary = (disabled: boolean) => ({
  padding: '12px 20px', borderRadius: 10, background: disabled ? '#9ca3af' : 'var(--admin-red)', color: '#fff',
  fontWeight: 700, fontSize: 15, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
} as const)

// ─── Component ────────────────────────────────────────────────────────────────

export function PDFWorkshop() {
  const { confirm, ConfirmDialog } = useConfirm()
  // Data
  const [templates, setTemplates] = useState<GuideTemplate[]>([])
  const [guides, setGuides] = useState<PdfGuide[]>([])
  const [articles, setArticles] = useState<ArticleOption[]>([])
  const [tableNotFound, setTableNotFound] = useState(false)

  // UI state
  const [tab, setTab] = useState<'templates' | 'from-article' | 'library'>('templates')
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Template flow
  const [selectedTemplate, setSelectedTemplate] = useState<GuideTemplate | null>(null)
  const [userInputs, setUserInputs] = useState<Record<string, string>>({})
  const [locale, setLocale] = useState<'en' | 'ar'>('en')
  const [coverUrl, setCoverUrl] = useState('')
  const [savedCovers, setSavedCovers] = useState<Array<{ id: string; filename: string; url: string; createdAt: string }>>([])
  const [uploadingCover, setUploadingCover] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)

  // Edit flow (active guide being edited)
  const [activeGuideId, setActiveGuideId] = useState<string | null>(null)
  const [editMessages, setEditMessages] = useState<EditMessage[]>([])
  const [editPrompt, setEditPrompt] = useState('')
  const [editing, setEditing] = useState(false)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)

  // Regenerate flow
  const [regenerating, setRegenerating] = useState<string | null>(null)

  // Publish flow
  const [publishGuideId, setPublishGuideId] = useState<string | null>(null)
  const [publishPrice, setPublishPrice] = useState('')
  const [publishGated, setPublishGated] = useState(false)
  const [publishing, setPublishing] = useState(false)

  // From-article state
  const [selectedArticleId, setSelectedArticleId] = useState('')
  const [articleStyle, setArticleStyle] = useState('luxury')

  // ─── Data loading ─────────────────────────────────────────────────────────

  const loadGuides = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/pdf-guides')
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        setError(errData.error || `Failed to load guides (${res.status})`)
        return
      }
      const data = await res.json().catch(() => ({}))
      if (data.tableNotFound) setTableNotFound(true)
      setGuides(data.guides || [])
    } catch (err) { setError(`Failed to load guides: ${err instanceof Error ? err.message : 'network error'}`) }
    finally { setLoading(false) }
  }, [])

  const loadArticles = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/content-matrix?limit=30&status=published')
      if (res.ok) {
        const data = await res.json()
        setArticles((data.articles || []).map((a: any) => ({
          id: a.id || a.blogPostId, title_en: a.title || a.title_en, slug: a.slug,
        })).filter((a: ArticleOption) => a.id && a.title_en))
      }
    } catch { console.warn('[pdf-workshop] Failed to load articles') }
  }, [])

  const loadTemplates = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/pdf-guides?templates=true')
      const data = await res.json().catch(() => ({}))
      setTemplates(data.templates || [])
    } catch { console.warn('[pdf-workshop] Failed to load templates') }
  }, [])

  const loadSavedCovers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/media?category=pdf-cover&limit=20')
      if (res.ok) {
        const data = await res.json()
        setSavedCovers((data.assets || data.media || []).map((a: any) => ({
          id: a.id, filename: a.originalFilename || a.filename, url: a.url, createdAt: a.createdAt,
        })))
      }
    } catch { /* non-fatal */ }
  }, [])

  useEffect(() => { loadGuides(); loadArticles(); loadTemplates(); loadSavedCovers() }, [loadGuides, loadArticles, loadTemplates, loadSavedCovers])

  // ─── Actions ──────────────────────────────────────────────────────────────

  const api = async (body: Record<string, unknown>) => {
    const res = await fetch('/api/admin/pdf-guides', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    let data: any
    try { data = await res.json() } catch { data = { error: `Server returned ${res.status} ${res.statusText}` } }
    if (!res.ok) throw new Error(data.error || `Server error ${res.status}`)
    return data
  }

  const handleTemplateGenerate = async () => {
    if (!selectedTemplate) return
    const missing = selectedTemplate.inputs.filter(i => i.required && !userInputs[i.key])
    if (missing.length) { setError(`Fill required fields: ${missing.map(i => i.label).join(', ')}`); return }

    setGenerating(true); setError(null); setSuccess(null)
    try {
      const data = await api({
        action: 'template_generate', templateId: selectedTemplate.id,
        userInputs, locale, coverDesignUrl: coverUrl || undefined,
      })
      setSuccess(`"${data.guide.title}" created (${data.guide.sections} sections${data.guide.hasPdf ? ', PDF ready' : ''})`)
      setActiveGuideId(data.guide.id)
      setEditMessages([{ role: 'assistant', text: `Guide created with ${data.guide.sections} sections. You can now edit it with prompts below.`, ts: Date.now() }])
      setSelectedTemplate(null); setUserInputs({}); setCoverUrl('')
      setTab('library')
      loadGuides()
    } catch (err) { setError(err instanceof Error ? err.message : 'Generation failed') }
    finally { setGenerating(false) }
  }

  const handleFromArticle = async () => {
    if (!selectedArticleId) { setError('Select an article'); return }
    setGenerating(true); setError(null); setSuccess(null)
    try {
      const data = await api({ action: 'from_article', articleId: selectedArticleId, template: articleStyle })
      setSuccess(`PDF created from "${data.guide.sourceArticle}" (${data.guide.sections} sections)`)
      setSelectedArticleId('')
      loadGuides()
    } catch (err) { setError(err instanceof Error ? err.message : 'Conversion failed') }
    finally { setGenerating(false) }
  }

  const handleEditPromptSubmit = async () => {
    if (!activeGuideId || !editPrompt.trim()) return
    const prompt = editPrompt.trim()
    setEditMessages(m => [...m, { role: 'user', text: prompt, ts: Date.now() }])
    setEditPrompt(''); setEditing(true)

    try {
      const data = await api({ action: 'edit_prompt', guideId: activeGuideId, editPrompt: prompt })
      setEditMessages(m => [...m, {
        role: 'assistant', text: `Changes applied (${data.guide.sections} sections). ${data.guide.status === 'ready' ? 'PDF regenerated.' : 'HTML updated.'}`, ts: Date.now(),
      }])
      loadGuides()
    } catch (err) {
      setEditMessages(m => [...m, { role: 'assistant', text: `Error: ${err instanceof Error ? err.message : 'Edit failed'}`, ts: Date.now() }])
    } finally { setEditing(false) }
  }

  const handlePreview = async (guideId: string) => {
    try {
      const data = await api({ action: 'preview_html', guideId })
      setPreviewHtml(data.html)
    } catch (err) { setError(err instanceof Error ? err.message : 'Preview failed') }
  }

  const handleDownload = async (guideId: string) => {
    setDownloading(guideId)
    try {
      const res = await fetch('/api/admin/pdf-guides', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'download', guideId }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Download failed' }))
        throw new Error(errData.error || 'Download failed')
      }
      const contentType = res.headers.get('Content-Type') || ''
      const disposition = res.headers.get('Content-Disposition') || ''
      // Extract filename from Content-Disposition header
      const filenameMatch = disposition.match(/filename="?([^";\n]+)"?/)
      const serverFilename = filenameMatch ? filenameMatch[1] : null
      const isHtml = contentType.includes('text/html')
      const filename = serverFilename || (isHtml ? `guide-${guideId}.html` : `guide-${guideId}.pdf`)

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = filename
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
      if (isHtml) setSuccess(`Downloaded as HTML. Open in browser → File → Print → Save as PDF.`)
      loadGuides()
    } catch (err) { setError(err instanceof Error ? err.message : 'Download failed') }
    finally { setDownloading(null) }
  }

  const handlePublish = async () => {
    if (!publishGuideId) return
    setPublishing(true)
    try {
      await api({ action: 'publish', guideId: publishGuideId, price: publishPrice ? parseFloat(publishPrice) : undefined, isGated: publishGated })
      setSuccess('Guide published!')
      setPublishGuideId(null); setPublishPrice(''); setPublishGated(false)
      loadGuides()
    } catch (err) { setError(err instanceof Error ? err.message : 'Publish failed') }
    finally { setPublishing(false) }
  }

  const handleDelete = async (guideId: string) => {
    const ok = await confirm({ title: 'Delete Guide', message: 'Are you sure? This cannot be undone.', variant: 'danger', confirmLabel: 'Delete' })
    if (!ok) return
    try {
      await api({ action: 'delete', guideId })
      setGuides(g => g.filter(x => x.id !== guideId))
      if (activeGuideId === guideId) { setActiveGuideId(null); setEditMessages([]) }
    } catch { setError('Delete failed') }
  }

  const handleRegenerate = async (guideId: string) => {
    setRegenerating(guideId)
    setError(null)
    try {
      const data = await api({ action: 'regenerate_content', guideId })
      setSuccess(`Content regenerated — ${data.guide?.sections || 0} sections${data.guide?.hasPdf ? ', PDF ready' : ', HTML only'}`)
      loadGuides()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Regeneration failed — try again')
    } finally {
      setRegenerating(null)
    }
  }

  // ─── Filtered templates ───────────────────────────────────────────────────

  const filteredTemplates = categoryFilter
    ? templates.filter(t => t.category === categoryFilter)
    : templates

  const readyCount = guides.filter(g => g.status === 'ready' || g.status === 'published').length
  const totalDownloads = guides.reduce((s, g) => s + g.downloads, 0)

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Templates', value: templates.length, icon: '📐' },
          { label: 'Guides', value: guides.length, icon: '📄' },
          { label: 'Ready/Published', value: readyCount, icon: '✅' },
          { label: 'Downloads', value: totalDownloads, icon: '⬇' },
        ].map(s => (
          <div key={s.label} style={{ ...card, padding: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>{s.icon} {s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {tableNotFound && (
        <div style={{ padding: '12px 16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, marginBottom: 16, color: '#92400e' }}>
          <strong>Setup needed:</strong> PDF Guides table not created yet. <Link href="/admin/content?tab=generation" style={{ color: '#92400e', textDecoration: 'underline' }}>Fix Database</Link>
        </div>
      )}
      {error && (
        <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, marginBottom: 16, color: '#991b1b', display: 'flex', justifyContent: 'space-between' }}>
          <span>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', fontWeight: 700, color: '#991b1b', cursor: 'pointer' }}>x</button>
        </div>
      )}
      {success && (
        <div style={{ padding: '12px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, marginBottom: 16, color: '#166534', display: 'flex', justifyContent: 'space-between' }}>
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} style={{ background: 'none', border: 'none', fontWeight: 700, color: '#166534', cursor: 'pointer' }}>x</button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {([
          { id: 'templates' as const, label: `Templates (${templates.length})`, icon: '📐' },
          { id: 'from-article' as const, label: 'From Article', icon: '📰' },
          { id: 'library' as const, label: `Library (${guides.length})`, icon: '📚' },
        ]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '10px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
            border: tab === t.id ? '2px solid var(--admin-red)' : '1px solid rgba(214,208,196,0.5)',
            background: tab === t.id ? 'var(--admin-red)' : '#fff', color: tab === t.id ? '#fff' : '#374151',
          }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ─── TEMPLATES TAB ─────────────────────────────────────────────────── */}
      {tab === 'templates' && !selectedTemplate && (
        <div>
          {/* Category filter */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            <button onClick={() => setCategoryFilter(null)} style={{
              padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              background: !categoryFilter ? 'var(--admin-red)' : '#fff', color: !categoryFilter ? '#fff' : '#374151',
              border: !categoryFilter ? 'none' : '1px solid rgba(214,208,196,0.5)',
            }}>All</button>
            {Object.entries(CATEGORY_META).map(([key, meta]) => (
              <button key={key} onClick={() => setCategoryFilter(key)} style={{
                padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                background: categoryFilter === key ? meta.color : '#fff', color: categoryFilter === key ? '#fff' : '#374151',
                border: categoryFilter === key ? 'none' : '1px solid rgba(214,208,196,0.5)',
              }}>{meta.label}</button>
            ))}
          </div>

          {/* Template grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270, 1fr))', gap: 16 }}>
            {filteredTemplates.map(t => {
              const catMeta = CATEGORY_META[t.category] || { label: t.category, color: '#6b7280' }
              return (
                <button key={t.id} onClick={() => { setSelectedTemplate(t); setUserInputs({}) }} style={{
                  ...card, cursor: 'pointer', textAlign: 'left', transition: 'box-shadow 0.15s',
                  display: 'flex', flexDirection: 'column', gap: 8,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 32 }}>{t.icon}</span>
                    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: `${catMeta.color}18`, color: catMeta.color }}>{catMeta.label}</span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{t.name}</div>
                  <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5, flex: 1 }}>{t.description}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                    <span style={{ fontSize: 12, color: '#9ca3af' }}>{t.pageEstimate[0]}-{t.pageEstimate[1]} pages</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--admin-red)' }}>${t.suggestedPrice}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ─── TEMPLATE INPUT FORM ───────────────────────────────────────────── */}
      {tab === 'templates' && selectedTemplate && (
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <button onClick={() => setSelectedTemplate(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#6b7280', marginBottom: 4 }}>
                &larr; Back to templates
              </button>
              <h3 style={{ fontSize: 20, fontWeight: 700 }}>{selectedTemplate.icon} {selectedTemplate.name}</h3>
              <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>{selectedTemplate.description}</p>
            </div>
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--admin-red)' }}>${selectedTemplate.suggestedPrice}</span>
          </div>

          {/* Dynamic inputs */}
          {selectedTemplate.inputs.map(input => (
            <div key={input.key} style={{ marginBottom: 16 }}>
              <label style={labelStyle}>{input.label} {input.required && <span style={{ color: 'var(--admin-red)' }}>*</span>}</label>
              {input.type === 'select' && input.options ? (
                <select
                  value={userInputs[input.key] || ''}
                  onChange={e => setUserInputs(p => ({ ...p, [input.key]: e.target.value }))}
                  style={inputStyle}
                >
                  <option value="">-- Select --</option>
                  {input.options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : input.type === 'textarea' ? (
                <textarea
                  value={userInputs[input.key] || ''}
                  onChange={e => setUserInputs(p => ({ ...p, [input.key]: e.target.value }))}
                  placeholder={input.placeholder}
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              ) : input.type === 'number' ? (
                <input
                  type="number"
                  value={userInputs[input.key] || ''}
                  onChange={e => setUserInputs(p => ({ ...p, [input.key]: e.target.value }))}
                  placeholder={input.placeholder}
                  style={inputStyle}
                />
              ) : (
                <input
                  type="text"
                  value={userInputs[input.key] || ''}
                  onChange={e => setUserInputs(p => ({ ...p, [input.key]: e.target.value }))}
                  placeholder={input.placeholder}
                  style={inputStyle}
                />
              )}
            </div>
          ))}

          {/* Language */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Language</label>
            <select value={locale} onChange={e => setLocale(e.target.value as 'en' | 'ar')} style={inputStyle}>
              <option value="en">English</option>
              <option value="ar">Arabic (RTL)</option>
            </select>
          </div>

          {/* ─── Cover Design (Canva) ────────────────────────────────────── */}
          <div style={{ marginBottom: 16, padding: 16, background: 'var(--admin-bg)', borderRadius: 8, border: '1px solid var(--admin-border)' }}>
            <label style={{ ...labelStyle, fontSize: 15, marginBottom: 12 }}>Cover Design</label>

            {/* Current cover preview */}
            {coverUrl && (
              <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 60, height: 80, borderRadius: 4, border: '1px solid #ddd', overflow: 'hidden', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={coverUrl} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--admin-green)' }}>Cover set</div>
                  <button onClick={() => setCoverUrl('')} style={{ fontSize: 11, color: 'var(--admin-red)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 2 }}>Remove</button>
                </div>
              </div>
            )}

            {/* Upload from iPhone (Canva export) */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <label style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '10px 12px', background: 'var(--admin-red)', color: '#fff', borderRadius: 6,
                cursor: 'pointer', fontSize: 13, fontWeight: 600,
              }}>
                {uploadingCover ? 'Uploading...' : '📱 Upload from Canva'}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  style={{ display: 'none' }}
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    setUploadingCover(true)
                    try {
                      const form = new FormData()
                      form.append('file', file)
                      form.append('category', 'pdf-cover')
                      const res = await fetch('/api/admin/media/upload', { method: 'POST', body: form })
                      if (res.ok) {
                        const data = await res.json()
                        const imageUrl = data.asset?.url || data.url || ''
                        setCoverUrl(imageUrl)
                        setSuccess('Cover uploaded!')
                        loadSavedCovers()
                      } else {
                        setError('Upload failed')
                      }
                    } catch { setError('Upload failed') }
                    setUploadingCover(false)
                    e.target.value = ''
                  }}
                />
              </label>
            </div>

            {/* Paste Canva share link */}
            <div style={{ marginBottom: 10 }}>
              <input
                type="url"
                value={coverUrl.startsWith('data:') ? '' : coverUrl}
                onChange={e => setCoverUrl(e.target.value)}
                placeholder="Or paste image URL / Canva export link"
                style={{ ...inputStyle, fontSize: 12 }}
              />
            </div>

            {/* Previously uploaded covers */}
            {savedCovers.length > 0 && (
              <div>
                <div style={{ fontSize: 11, color: '#78716C', marginBottom: 6 }}>Your saved covers:</div>
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                  {savedCovers.map((sc) => (
                    <button
                      key={sc.id}
                      onClick={() => { setCoverUrl(sc.url); setSuccess('Cover selected!') }}
                      style={{
                        width: 56, height: 75, borderRadius: 4, overflow: 'hidden', cursor: 'pointer',
                        border: coverUrl === sc.url ? '2px solid var(--admin-red)' : '1px solid #ddd',
                        background: '#fff', padding: 0, flexShrink: 0,
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={sc.url} alt={sc.filename} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!coverUrl && savedCovers.length === 0 && (
              <div style={{ fontSize: 11, color: '#78716C', textAlign: 'center' }}>
                Export your cover from Canva as PNG, then tap &quot;Upload from Canva&quot; above
              </div>
            )}
          </div>

          <button onClick={handleTemplateGenerate} disabled={generating} style={{ ...btnPrimary(generating), width: '100%', marginTop: 8 }}>
            {generating ? 'Generating (20-40s)...' : `Generate ${selectedTemplate.name}`}
          </button>
        </div>
      )}

      {/* ─── FROM ARTICLE TAB ──────────────────────────────────────────────── */}
      {tab === 'from-article' && (
        <div style={card}>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Convert Published Article to PDF</h3>

          <label style={labelStyle}>Select Article</label>
          <select value={selectedArticleId} onChange={e => setSelectedArticleId(e.target.value)} style={{ ...inputStyle, marginBottom: 16 }}>
            <option value="">-- Select a published article --</option>
            {articles.map(a => <option key={a.id} value={a.id}>{a.title_en}</option>)}
          </select>

          <label style={{ ...labelStyle, marginBottom: 8 }}>Guide Style</label>
          <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
            {['luxury', 'budget', 'family', 'adventure', 'honeymoon'].map(s => (
              <button key={s} onClick={() => setArticleStyle(s)} style={{
                padding: '10px 16px', borderRadius: 10, fontSize: 14, cursor: 'pointer',
                border: articleStyle === s ? '2px solid var(--admin-red)' : '1px solid #e5e7eb',
                background: articleStyle === s ? 'color-mix(in srgb, var(--admin-red) 6%, transparent)' : '#fff', fontWeight: articleStyle === s ? 700 : 400,
              }}>
                {s === 'luxury' ? '✦' : s === 'budget' ? '💰' : s === 'family' ? '👨‍👩‍👧‍👦' : s === 'adventure' ? '🏔️' : '💕'} {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          <button onClick={handleFromArticle} disabled={generating || !selectedArticleId} style={{ ...btnPrimary(generating || !selectedArticleId), width: '100%' }}>
            {generating ? 'Converting...' : 'Convert to PDF Guide'}
          </button>
        </div>
      )}

      {/* ─── LIBRARY TAB ───────────────────────────────────────────────────── */}
      {tab === 'library' && (
        <div>
          {loading ? (
            <div style={{ ...card, textAlign: 'center', color: '#6b7280', padding: 40 }}>Loading...</div>
          ) : guides.length === 0 ? (
            <div style={{ ...card, textAlign: 'center', color: '#6b7280', padding: 40 }}>
              <p style={{ fontSize: 40, marginBottom: 12 }}>📄</p>
              <p>No guides yet. Pick a template to get started!</p>
              <button onClick={() => setTab('templates')} style={{ ...btnPrimary(false), marginTop: 16 }}>Browse Templates</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {guides.map(guide => {
                const st = STATUS_STYLES[guide.status] || STATUS_STYLES.draft
                const isEditing = activeGuideId === guide.id
                return (
                  <div key={guide.id} style={{ ...card, padding: 0, overflow: 'hidden' }}>
                    {/* Guide row */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, gap: 12, flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{guide.title}</div>
                        <div style={{ fontSize: 13, color: '#6b7280' }}>
                          {guide.language.toUpperCase()} · {guide.downloads} downloads
                          {guide.price != null && <> · <span style={{ fontWeight: 600 }}>${guide.price}</span></>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: st.bg, color: st.color }}>{st.label}</span>
                        <button onClick={() => handlePreview(guide.id)} title="Preview" style={{ padding: '7px 10px', borderRadius: 8, background: '#f3f4f6', border: '1px solid #e5e7eb', cursor: 'pointer', fontSize: 13 }}>👁</button>
                        <button onClick={() => { setActiveGuideId(isEditing ? null : guide.id); setEditMessages(isEditing ? [] : [{ role: 'assistant', text: 'Ready for edits. Describe what you want to change.', ts: Date.now() }]) }} title="Edit with AI" style={{ padding: '7px 10px', borderRadius: 8, background: isEditing ? 'var(--admin-red)' : '#f3f4f6', color: isEditing ? '#fff' : '#374151', border: isEditing ? 'none' : '1px solid #e5e7eb', cursor: 'pointer', fontSize: 13 }}>✏️</button>
                        <button onClick={() => handleDownload(guide.id)} disabled={downloading === guide.id} title="Download" style={{ padding: '7px 12px', borderRadius: 8, background: 'var(--admin-red)', color: '#fff', border: 'none', cursor: downloading === guide.id ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600 }}>
                          {downloading === guide.id ? '...' : '⬇'}
                        </button>
                        {guide.status === 'generated' && (
                          <button onClick={() => handleRegenerate(guide.id)} disabled={regenerating === guide.id} title="Regenerate content with AI" style={{ padding: '7px 12px', borderRadius: 8, background: regenerating === guide.id ? '#9ca3af' : 'var(--admin-gold)', color: '#fff', border: 'none', cursor: regenerating === guide.id ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600 }}>
                            {regenerating === guide.id ? 'Regenerating...' : 'Regenerate'}
                          </button>
                        )}
                        {guide.status !== 'published' && (
                          <button onClick={() => { setPublishGuideId(guide.id); setPublishPrice(String(guide.price || '')) }} title="Publish" style={{ padding: '7px 12px', borderRadius: 8, background: 'var(--admin-green)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Publish</button>
                        )}
                        <button onClick={() => handleDelete(guide.id)} title="Delete" style={{ padding: '7px 10px', borderRadius: 8, background: '#fff', color: '#dc2626', border: '1px solid #fecaca', cursor: 'pointer', fontSize: 13 }}>🗑</button>
                      </div>
                    </div>

                    {/* Edit chat panel */}
                    {isEditing && (
                      <div style={{ borderTop: '1px solid rgba(214,208,196,0.5)', padding: 16, background: '#fafaf8' }}>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: '#6b7280' }}>Edit with AI Prompts</div>

                        {/* Messages */}
                        <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: 12 }}>
                          {editMessages.map((msg, i) => (
                            <div key={i} style={{
                              marginBottom: 8, padding: '8px 12px', borderRadius: 10, fontSize: 13, lineHeight: 1.5,
                              background: msg.role === 'user' ? 'color-mix(in srgb, var(--admin-red) 6%, transparent)' : '#f3f4f6',
                              marginLeft: msg.role === 'user' ? 40 : 0, marginRight: msg.role === 'assistant' ? 40 : 0,
                            }}>
                              {msg.text}
                            </div>
                          ))}
                          {editing && <div style={{ fontSize: 13, color: '#9ca3af', padding: '8px 12px' }}>Applying changes...</div>}
                        </div>

                        {/* Input */}
                        <div style={{ display: 'flex', gap: 8 }}>
                          <input
                            type="text"
                            value={editPrompt}
                            onChange={e => setEditPrompt(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !editing) handleEditPromptSubmit() }}
                            placeholder='e.g. "Add a budget tips section" or "Make the restaurant section longer"'
                            style={{ ...inputStyle, flex: 1 }}
                            disabled={editing}
                          />
                          <button onClick={handleEditPromptSubmit} disabled={editing || !editPrompt.trim()} style={{ ...btnPrimary(editing || !editPrompt.trim()), padding: '10px 20px' }}>
                            Send
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── PREVIEW MODAL ─────────────────────────────────────────────────── */}
      {previewHtml && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setPreviewHtml(null)}>
          <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 800, height: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #e5e7eb' }}>
              <span style={{ fontWeight: 700 }}>PDF Preview</span>
              <button onClick={() => setPreviewHtml(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>x</button>
            </div>
            <iframe srcDoc={previewHtml} style={{ flex: 1, border: 'none', width: '100%' }} title="PDF Preview" />
          </div>
        </div>
      )}

      {/* ─── PUBLISH MODAL ─────────────────────────────────────────────────── */}
      {publishGuideId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setPublishGuideId(null)}>
          <div style={{ ...card, maxWidth: 420, width: '100%' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Publish Guide</h3>

            <label style={labelStyle}>Price ($)</label>
            <input type="number" step="0.01" value={publishPrice} onChange={e => setPublishPrice(e.target.value)} placeholder="e.g. 9.99 (leave empty for free)" style={{ ...inputStyle, marginBottom: 16 }} />

            <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={publishGated} onChange={e => setPublishGated(e.target.checked)} />
              Require email to download (gated)
            </label>

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setPublishGuideId(null)} style={{ flex: 1, padding: '12px 16px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
              <button onClick={handlePublish} disabled={publishing} style={{ ...btnPrimary(publishing), flex: 1 }}>
                {publishing ? 'Publishing...' : 'Publish'}
              </button>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog />
    </div>
  )
}
