'use client'

import { useState, useEffect, useCallback } from 'react'

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
  updatedAt: string
}

interface ArticleOption {
  id: string
  title_en: string
  slug: string
}

const STYLE_OPTIONS = [
  { id: 'luxury', label: 'Luxury', color: '#8B7355', icon: '✦' },
  { id: 'budget', label: 'Budget', color: '#2E7D32', icon: '💰' },
  { id: 'family', label: 'Family', color: '#1565C0', icon: '👨‍👩‍👧‍👦' },
  { id: 'adventure', label: 'Adventure', color: '#E65100', icon: '🏔️' },
  { id: 'honeymoon', label: 'Honeymoon', color: '#880E4F', icon: '💕' },
]

export function PDFGenerator() {
  const [guides, setGuides] = useState<PdfGuide[]>([])
  const [articles, setArticles] = useState<ArticleOption[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [tab, setTab] = useState<'generate' | 'from-article' | 'library'>('generate')

  // Generate form state
  const [destination, setDestination] = useState('')
  const [title, setTitle] = useState('')
  const [style, setStyle] = useState('luxury')
  const [locale, setLocale] = useState<'en' | 'ar'>('en')
  const [coverDesignUrl, setCoverDesignUrl] = useState('')

  // From article state
  const [selectedArticleId, setSelectedArticleId] = useState('')

  const loadGuides = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/pdf-guides')
      if (res.ok) {
        const data = await res.json()
        setGuides(data.guides || [])
      }
    } catch {
      console.warn('Failed to load guides')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadArticles = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/content-matrix?limit=30&status=published')
      if (res.ok) {
        const data = await res.json()
        setArticles((data.articles || []).map((a: any) => ({
          id: a.id || a.blogPostId,
          title_en: a.title || a.title_en,
          slug: a.slug,
        })).filter((a: ArticleOption) => a.id && a.title_en))
      }
    } catch {
      console.warn('Failed to load articles')
    }
  }, [])

  useEffect(() => {
    loadGuides()
    loadArticles()
  }, [loadGuides, loadArticles])

  const handleGenerate = async () => {
    if (!destination) { setError('Destination is required'); return }
    setGenerating(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch('/api/admin/pdf-guides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          destination,
          title: title || undefined,
          template: style,
          locale,
          coverDesignUrl: coverDesignUrl || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Generation failed' }))
        throw new Error(data.error || 'Generation failed')
      }
      const data = await res.json()
      setSuccess(`PDF guide created: "${data.guide.title}" (${data.guide.sections} sections${data.guide.hasPdf ? ', PDF ready' : ', HTML only'})`)
      setDestination('')
      setTitle('')
      setCoverDesignUrl('')
      loadGuides()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  const handleFromArticle = async () => {
    if (!selectedArticleId) { setError('Select an article'); return }
    setGenerating(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch('/api/admin/pdf-guides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'from_article',
          articleId: selectedArticleId,
          template: style,
          coverDesignUrl: coverDesignUrl || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Conversion failed' }))
        throw new Error(data.error || 'Conversion failed')
      }
      const data = await res.json()
      setSuccess(`PDF created from article: "${data.guide.sourceArticle}" (${data.guide.sections} sections)`)
      setSelectedArticleId('')
      loadGuides()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Conversion failed')
    } finally {
      setGenerating(false)
    }
  }

  const handleDownload = async (guideId: string) => {
    setDownloading(guideId)
    try {
      const res = await fetch('/api/admin/pdf-guides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'download', guideId }),
      })
      if (!res.ok) throw new Error('Download failed')

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `guide-${guideId}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      loadGuides() // Refresh download count
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed')
    } finally {
      setDownloading(null)
    }
  }

  const handleDelete = async (guideId: string) => {
    if (!confirm('Delete this PDF guide?')) return
    try {
      await fetch('/api/admin/pdf-guides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', guideId }),
      })
      setGuides(g => g.filter(x => x.id !== guideId))
    } catch {
      setError('Delete failed')
    }
  }

  const readyGuides = guides.filter(g => g.status === 'ready')
  const totalDownloads = guides.reduce((sum, g) => sum + g.downloads, 0)

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total Guides', value: guides.length, bg: '#f3e8ff' },
          { label: 'Ready', value: readyGuides.length, bg: '#dcfce7' },
          { label: 'Downloads', value: totalDownloads, bg: '#dbeafe' },
          { label: 'Styles', value: STYLE_OPTIONS.length, bg: '#fef3c7' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid rgba(214,208,196,0.5)', borderRadius: 12, padding: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{s.value}</div>
            <div style={{ fontSize: 13, color: '#6b7280' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {error && (
        <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, marginBottom: 16, color: '#991b1b' }}>
          {error}
          <button onClick={() => setError(null)} style={{ float: 'right', cursor: 'pointer', background: 'none', border: 'none', fontWeight: 700, color: '#991b1b' }}>×</button>
        </div>
      )}
      {success && (
        <div style={{ padding: '12px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, marginBottom: 16, color: '#166534' }}>
          {success}
          <button onClick={() => setSuccess(null)} style={{ float: 'right', cursor: 'pointer', background: 'none', border: 'none', fontWeight: 700, color: '#166534' }}>×</button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {[
          { id: 'generate' as const, label: 'Generate New' },
          { id: 'from-article' as const, label: 'From Article' },
          { id: 'library' as const, label: `Library (${guides.length})` },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              border: tab === t.id ? '2px solid #C8322B' : '1px solid rgba(214,208,196,0.5)',
              background: tab === t.id ? '#C8322B' : '#fff',
              color: tab === t.id ? '#fff' : '#374151',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Generate Tab */}
      {tab === 'generate' && (
        <div style={{ background: '#fff', border: '1px solid rgba(214,208,196,0.5)', borderRadius: 12, padding: 24 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Generate AI Travel Guide</h3>

          {/* Style selector */}
          <label style={{ fontWeight: 600, fontSize: 14, display: 'block', marginBottom: 8 }}>Guide Style</label>
          <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
            {STYLE_OPTIONS.map(s => (
              <button
                key={s.id}
                onClick={() => setStyle(s.id)}
                style={{
                  padding: '10px 16px',
                  borderRadius: 10,
                  border: style === s.id ? `2px solid ${s.color}` : '1px solid #e5e7eb',
                  background: style === s.id ? `${s.color}10` : '#fff',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: style === s.id ? 700 : 400,
                }}
              >
                {s.icon} {s.label}
              </button>
            ))}
          </div>

          {/* Destination */}
          <label style={{ fontWeight: 600, fontSize: 14, display: 'block', marginBottom: 6 }}>Destination *</label>
          <input
            type="text"
            value={destination}
            onChange={e => setDestination(e.target.value)}
            placeholder="e.g., London, Maldives, French Riviera"
            style={{ width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: 8, marginBottom: 16, fontSize: 14 }}
          />

          {/* Title override */}
          <label style={{ fontWeight: 600, fontSize: 14, display: 'block', marginBottom: 6 }}>Custom Title (optional)</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Auto-generated from destination if empty"
            style={{ width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: 8, marginBottom: 16, fontSize: 14 }}
          />

          {/* Language */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontWeight: 600, fontSize: 14, display: 'block', marginBottom: 6 }}>Language</label>
              <select
                value={locale}
                onChange={e => setLocale(e.target.value as 'en' | 'ar')}
                style={{ width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14 }}
              >
                <option value="en">English</option>
                <option value="ar">Arabic (RTL)</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontWeight: 600, fontSize: 14, display: 'block', marginBottom: 6 }}>Canva Cover URL (optional)</label>
              <input
                type="url"
                value={coverDesignUrl}
                onChange={e => setCoverDesignUrl(e.target.value)}
                placeholder="https://www.canva.com/design/..."
                style={{ width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14 }}
              />
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating || !destination}
            style={{
              width: '100%',
              padding: '14px 20px',
              borderRadius: 10,
              background: generating ? '#9ca3af' : '#C8322B',
              color: '#fff',
              fontWeight: 700,
              fontSize: 15,
              border: 'none',
              cursor: generating ? 'not-allowed' : 'pointer',
              marginTop: 8,
            }}
          >
            {generating ? '⏳ Generating (this takes 20-40s)...' : '✨ Generate PDF Guide'}
          </button>
        </div>
      )}

      {/* From Article Tab */}
      {tab === 'from-article' && (
        <div style={{ background: '#fff', border: '1px solid rgba(214,208,196,0.5)', borderRadius: 12, padding: 24 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Convert Published Article to PDF</h3>

          <label style={{ fontWeight: 600, fontSize: 14, display: 'block', marginBottom: 6 }}>Select Article</label>
          <select
            value={selectedArticleId}
            onChange={e => setSelectedArticleId(e.target.value)}
            style={{ width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: 8, marginBottom: 16, fontSize: 14 }}
          >
            <option value="">-- Select a published article --</option>
            {articles.map(a => (
              <option key={a.id} value={a.id}>{a.title_en}</option>
            ))}
          </select>

          <label style={{ fontWeight: 600, fontSize: 14, display: 'block', marginBottom: 8 }}>Guide Style</label>
          <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
            {STYLE_OPTIONS.map(s => (
              <button
                key={s.id}
                onClick={() => setStyle(s.id)}
                style={{
                  padding: '10px 16px',
                  borderRadius: 10,
                  border: style === s.id ? `2px solid ${s.color}` : '1px solid #e5e7eb',
                  background: style === s.id ? `${s.color}10` : '#fff',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: style === s.id ? 700 : 400,
                }}
              >
                {s.icon} {s.label}
              </button>
            ))}
          </div>

          <label style={{ fontWeight: 600, fontSize: 14, display: 'block', marginBottom: 6 }}>Canva Cover URL (optional)</label>
          <input
            type="url"
            value={coverDesignUrl}
            onChange={e => setCoverDesignUrl(e.target.value)}
            placeholder="https://www.canva.com/design/..."
            style={{ width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: 8, marginBottom: 16, fontSize: 14 }}
          />

          <button
            onClick={handleFromArticle}
            disabled={generating || !selectedArticleId}
            style={{
              width: '100%',
              padding: '14px 20px',
              borderRadius: 10,
              background: generating ? '#9ca3af' : '#1565C0',
              color: '#fff',
              fontWeight: 700,
              fontSize: 15,
              border: 'none',
              cursor: generating ? 'not-allowed' : 'pointer',
            }}
          >
            {generating ? '⏳ Converting...' : '📄 Convert to PDF Guide'}
          </button>
        </div>
      )}

      {/* Library Tab */}
      {tab === 'library' && (
        <div style={{ background: '#fff', border: '1px solid rgba(214,208,196,0.5)', borderRadius: 12, padding: 24 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>PDF Guide Library</h3>

          {loading ? (
            <p style={{ textAlign: 'center', color: '#6b7280', padding: 40 }}>Loading...</p>
          ) : guides.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#6b7280', padding: 40 }}>
              <p style={{ fontSize: 40, marginBottom: 12 }}>📄</p>
              <p>No PDF guides yet. Generate your first one!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {guides.map(guide => {
                const styleOpt = STYLE_OPTIONS.find(s => s.id === guide.style)
                return (
                  <div
                    key={guide.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 16,
                      border: '1px solid rgba(214,208,196,0.5)',
                      borderRadius: 10,
                      gap: 12,
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{guide.title}</div>
                      <div style={{ fontSize: 13, color: '#6b7280' }}>
                        {styleOpt?.icon} {styleOpt?.label || guide.style} · {guide.language.toUpperCase()} · {guide.downloads} downloads
                        {guide.coverDesignId && (
                          <> · <a href={guide.coverDesignId} target="_blank" rel="noopener noreferrer" style={{ color: '#7c3aed' }}>Canva Cover</a></>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 600,
                        background: guide.status === 'ready' ? '#dcfce7' : guide.status === 'generated' ? '#fef3c7' : '#f3f4f6',
                        color: guide.status === 'ready' ? '#166534' : guide.status === 'generated' ? '#92400e' : '#374151',
                      }}>
                        {guide.status === 'ready' ? '✅ Ready' : guide.status === 'generated' ? '📝 HTML Only' : guide.status}
                      </span>
                      <button
                        onClick={() => handleDownload(guide.id)}
                        disabled={downloading === guide.id}
                        style={{
                          padding: '8px 14px',
                          borderRadius: 8,
                          background: '#C8322B',
                          color: '#fff',
                          border: 'none',
                          cursor: downloading === guide.id ? 'not-allowed' : 'pointer',
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      >
                        {downloading === guide.id ? '⏳' : '⬇ Download'}
                      </button>
                      <button
                        onClick={() => handleDelete(guide.id)}
                        style={{
                          padding: '8px 10px',
                          borderRadius: 8,
                          background: '#fff',
                          color: '#dc2626',
                          border: '1px solid #fecaca',
                          cursor: 'pointer',
                          fontSize: 13,
                        }}
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Canva Info Box */}
      <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 12, padding: 20, marginTop: 24 }}>
        <h4 style={{ fontWeight: 700, fontSize: 15, marginBottom: 8, color: '#5b21b6' }}>🎨 Using Canva for Cover Designs</h4>
        <p style={{ fontSize: 13, color: '#6d28d9', lineHeight: 1.6 }}>
          Create beautiful cover pages in Canva, then paste the design URL in the &quot;Canva Cover URL&quot; field.
          The URL is saved with the guide for reference. For the best results, design your cover at 210mm × 297mm (A4) in Canva
          and export a high-resolution PNG to use as the guide&apos;s cover image.
        </p>
      </div>
    </div>
  )
}
