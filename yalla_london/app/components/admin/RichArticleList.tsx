'use client';

/**
 * RichArticleList — Enhanced article table with full metadata visibility
 * Shows: status, phase, SEO score, word count, bilingual status, indexing, actions
 * Used in /admin/articles and /admin/content pages
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  FileText, Globe, Search, RefreshCw, ExternalLink, Send, Eye,
  CheckCircle, XCircle, AlertTriangle, Clock, Loader2, ChevronDown,
  ChevronRight, Filter, BarChart3, TrendingUp, Languages, Zap,
  Star, AlertCircle, Play, BookOpen, Edit3,
} from 'lucide-react';

interface RichArticle {
  id: string;
  type: 'published' | 'draft';
  title: string;
  titleAr: string | null;
  status: string;
  phase?: string;
  phaseIndex?: number;
  phaseLabel?: string;
  phaseProgress?: number;
  slug: string | null;
  siteId: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  wordCountEn: number;
  wordCountAr: number;
  seoScore: number | null;
  qualityScore: number | null;
  indexingStatus: string;
  indexingState: string | null;
  lastSubmittedAt: string | null;
  category: string | null;
  author: string | null;
  isBilingual: boolean;
  hasAffiliate: boolean;
  hasError?: boolean;
  error?: string | null;
  publicUrl: string | null;
  featured?: boolean;
}

interface SummaryData {
  published: number;
  inProgress: number;
  reservoir: number;
  total: number;
}

interface IndexingData {
  indexed: number;
  submitted: number;
  notSubmitted: number;
  error: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  published:  { label: 'Published',   color: '#2D5A3D', bg: 'rgba(45,90,61,0.1)' },
  scheduled:  { label: 'Scheduled',   color: '#4A7BA8', bg: 'rgba(74,123,168,0.1)' },
  draft:      { label: 'Draft',       color: '#C49A2A', bg: 'rgba(196,154,42,0.1)' },
  reservoir:  { label: 'Reservoir',   color: '#7C3AED', bg: 'rgba(124,58,237,0.1)' },
  pending:    { label: 'Pending',     color: '#78716C', bg: 'rgba(120,113,108,0.1)' },
  generating: { label: 'Generating',  color: '#C8322B', bg: 'rgba(200,50,43,0.1)' },
  research:   { label: 'Research',    color: '#C49A2A', bg: 'rgba(196,154,42,0.08)' },
  outline:    { label: 'Outline',     color: '#C49A2A', bg: 'rgba(196,154,42,0.08)' },
  drafting:   { label: 'Drafting',    color: '#D97706', bg: 'rgba(217,119,6,0.08)' },
  assembly:   { label: 'Assembly',    color: '#D97706', bg: 'rgba(217,119,6,0.08)' },
  seo:        { label: 'SEO',         color: '#4A7BA8', bg: 'rgba(74,123,168,0.08)' },
  scoring:    { label: 'Scoring',     color: '#4A7BA8', bg: 'rgba(74,123,168,0.08)' },
  failed:     { label: 'Failed',      color: '#C8322B', bg: 'rgba(200,50,43,0.1)' },
};

const INDEXING_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  indexed:        { label: 'Indexed',       color: '#2D5A3D', icon: CheckCircle },
  submitted:      { label: 'Submitted',     color: '#4A7BA8', icon: Clock },
  pending:        { label: 'Pending',       color: '#C49A2A', icon: Clock },
  not_submitted:  { label: 'Not Submitted', color: '#78716C', icon: AlertCircle },
  error:          { label: 'Error',         color: '#C8322B', icon: XCircle },
  failed:         { label: 'Failed',        color: '#C8322B', icon: XCircle },
  not_applicable: { label: '—',             color: '#A8A29E', icon: FileText },
};

function seoScoreColor(score: number | null): string {
  if (!score) return '#A8A29E';
  if (score >= 70) return '#2D5A3D';
  if (score >= 50) return '#C49A2A';
  return '#C8322B';
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

const PHASE_STEPS = ['pending','research','outline','drafting','assembly','images','seo','scoring','reservoir'];

interface Props {
  siteId?: string;
  source?: 'all' | 'published' | 'drafts';
  showHeader?: boolean;
  compact?: boolean;
}

export function RichArticleList({ siteId, source = 'all', showHeader = true, compact = false }: Props) {
  const [articles, setArticles] = useState<RichArticle[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [indexing, setIndexing] = useState<IndexingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<'all' | 'published' | 'drafts'>(source);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        source: sourceFilter,
        limit: '60',
      });
      if (siteId) params.set('siteId', siteId);
      if (search) params.set('search', search);
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const res = await fetch(`/api/admin/articles?${params}`);
      if (res.ok) {
        const data = await res.json();
        setArticles(data.articles || []);
        setSummary(data.summary || null);
        setIndexing(data.indexing || null);
      }
    } finally {
      setLoading(false);
    }
  }, [siteId, search, statusFilter, sourceFilter]);

  useEffect(() => { load(); }, [load]);

  const submitToIndexNow = async (articleId: string) => {
    setSubmitting(articleId);
    try {
      await fetch('/api/admin/content-indexing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submit', articleId }),
      });
      await load();
    } finally {
      setSubmitting(null);
    }
  };

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {/* ── Header + Summary ── */}
      {showHeader && (
        <>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 style={{ fontFamily: "'Anybody',sans-serif", fontWeight: 800, fontSize: 18, color: '#1C1917' }}>
                Article Library
              </h2>
              {summary && (
                <p style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: '#78716C' }}>
                  {summary.published} published · {summary.inProgress} in pipeline · {summary.reservoir} ready
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Link href="/admin/articles/new"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                    style={{ backgroundColor: '#C8322B', color: '#FAF8F4', fontFamily: "'Anybody',sans-serif", fontWeight: 700 }}>
                + New Article
              </Link>
              <button onClick={load} className="p-2 rounded-lg transition-all"
                      style={{ backgroundColor: 'var(--neu-bg)', boxShadow: 'var(--neu-flat)', color: '#78716C' }}>
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Stats row */}
          {indexing && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Indexed',       val: indexing.indexed,      color: '#2D5A3D' },
                { label: 'Submitted',     val: indexing.submitted,    color: '#4A7BA8' },
                { label: 'Not Submitted', val: indexing.notSubmitted, color: '#78716C' },
                { label: 'Index Errors',  val: indexing.error,        color: '#C8322B' },
              ].map(({ label, val, color }) => (
                <div key={label} className="text-center py-3 rounded-xl"
                     style={{ backgroundColor: 'var(--neu-bg)', boxShadow: 'var(--neu-flat,1px 1px 3px #CAC5BC)' }}>
                  <div style={{ fontFamily: "'Anybody',sans-serif", fontWeight: 800, fontSize: 22, color }}>{val}</div>
                  <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: '#78716C', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#A8A29E' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search articles..."
            className="w-full pl-8 pr-3 py-2 rounded-lg text-xs outline-none"
            style={{ backgroundColor: 'var(--neu-bg)', boxShadow: 'var(--neu-inset,inset 2px 2px 5px #CAC5BC)', fontFamily: "'IBM Plex Mono',monospace", border: 'none', color: '#1C1917' }}
          />
        </div>

        {/* Source filter */}
        {source === 'all' && (
          <div className="flex gap-1">
            {(['all', 'published', 'drafts'] as const).map((s) => (
              <button key={s} onClick={() => setSourceFilter(s)}
                      className="px-3 py-1.5 rounded-lg text-xs transition-all"
                      style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5, backgroundColor: sourceFilter === s ? '#1C1917' : 'var(--neu-bg)', color: sourceFilter === s ? '#FAF8F4' : '#78716C', boxShadow: sourceFilter === s ? 'none' : 'var(--neu-flat)' }}>
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Status filter */}
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg text-xs outline-none border-none"
                style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, backgroundColor: 'var(--neu-bg)', boxShadow: 'var(--neu-flat)', color: '#78716C' }}>
          <option value="all">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="scheduled">Scheduled</option>
          <option value="reservoir">Reservoir</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* ── Article List ── */}
      {loading && articles.length === 0 ? (
        <div className="text-center py-12">
          <Loader2 size={24} className="mx-auto animate-spin mb-2" style={{ color: '#78716C' }} />
          <p style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: '#78716C' }}>Loading articles...</p>
        </div>
      ) : articles.length === 0 ? (
        <div className="text-center py-12 rounded-xl"
             style={{ backgroundColor: 'rgba(120,113,108,0.04)', border: '1px dashed rgba(120,113,108,0.2)' }}>
          <FileText size={32} className="mx-auto mb-2" style={{ color: '#A8A29E' }} />
          <p style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: '#78716C' }}>
            No articles found
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {articles.map((article) => {
            const statusConf = STATUS_CONFIG[article.phase || article.status] || STATUS_CONFIG.draft;
            const idxConf = INDEXING_CONFIG[article.indexingStatus] || INDEXING_CONFIG.not_submitted;
            const IdxIcon = idxConf.icon;
            const isExp = expanded.has(article.id);

            return (
              <div key={article.id} className="rounded-xl overflow-hidden"
                   style={{ backgroundColor: 'var(--neu-bg,#EDE9E1)', boxShadow: 'var(--neu-flat,1px 1px 3px #CAC5BC, -1px -1px 3px #FDFAF5)' }}>
                {/* Main row */}
                <div className="flex items-start gap-3 p-3 sm:p-4">
                  {/* Type indicator */}
                  <div className="flex-shrink-0 mt-0.5">
                    {article.type === 'published' ? (
                      <Globe size={14} style={{ color: '#2D5A3D' }} />
                    ) : (
                      <FileText size={14} style={{ color: '#78716C' }} />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 flex-wrap">
                      <span style={{ fontFamily: "'Anybody',sans-serif", fontWeight: 700, fontSize: compact ? 12 : 13, color: '#1C1917', lineHeight: 1.3 }}
                            className="flex-1 min-w-0">
                        {article.title}
                        {article.featured && <Star size={11} className="inline ml-1" style={{ color: '#C49A2A' }} />}
                      </span>
                    </div>

                    {/* Metadata row */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                      {/* Status badge */}
                      <span className="px-1.5 py-0.5 rounded text-xs"
                            style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, fontWeight: 600, backgroundColor: statusConf.bg, color: statusConf.color }}>
                        {article.phase ? article.phaseLabel : statusConf.label}
                      </span>

                      {/* SEO Score */}
                      {article.seoScore !== null && (
                        <span className="flex items-center gap-1"
                              style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: seoScoreColor(article.seoScore) }}>
                          <TrendingUp size={9} />
                          SEO {article.seoScore}
                        </span>
                      )}

                      {/* Word count */}
                      {article.wordCountEn > 0 && (
                        <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: article.wordCountEn >= 1000 ? '#2D5A3D' : '#C49A2A' }}>
                          <BookOpen size={9} className="inline mr-0.5" />
                          {article.wordCountEn.toLocaleString()} words
                        </span>
                      )}

                      {/* Bilingual */}
                      {article.isBilingual && (
                        <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: '#4A7BA8' }}>
                          <Languages size={9} className="inline mr-0.5" />
                          Bilingual
                        </span>
                      )}

                      {/* Indexing */}
                      {article.type === 'published' && (
                        <span className="flex items-center gap-0.5"
                              style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: idxConf.color }}>
                          <IdxIcon size={9} />
                          {idxConf.label}
                        </span>
                      )}

                      {/* Date */}
                      <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: '#A8A29E' }}>
                        <Clock size={9} className="inline mr-0.5" />
                        {timeAgo(article.updatedAt)}
                      </span>

                      {/* Error flag */}
                      {article.hasError && (
                        <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: '#C8322B' }}>
                          <AlertTriangle size={9} className="inline mr-0.5" />
                          Error
                        </span>
                      )}
                    </div>

                    {/* Draft phase progress bar */}
                    {article.type === 'draft' && article.phaseProgress !== undefined && (
                      <div className="mt-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1 rounded-full overflow-hidden"
                               style={{ backgroundColor: 'rgba(120,113,108,0.15)' }}>
                            <div className="h-full rounded-full transition-all"
                                 style={{ width: `${article.phaseProgress}%`, backgroundColor: article.phaseProgress >= 100 ? '#2D5A3D' : '#C49A2A' }} />
                          </div>
                          <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: '#A8A29E', flexShrink: 0 }}>
                            {article.phaseProgress}%
                          </span>
                        </div>
                        {/* Phase steps */}
                        {!compact && (
                          <div className="flex gap-0.5 mt-1">
                            {PHASE_STEPS.map((step, i) => (
                              <div key={step} title={step}
                                   className="flex-1 h-1 rounded-full"
                                   style={{ backgroundColor: i <= (article.phaseIndex ?? -1) ? '#C8322B' : 'rgba(120,113,108,0.15)' }} />
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {article.type === 'published' && article.publicUrl && (
                      <a href={article.publicUrl} target="_blank" rel="noreferrer"
                         className="p-1.5 rounded-lg transition-all" title="View public"
                         style={{ backgroundColor: 'var(--neu-bg)', boxShadow: 'var(--neu-flat)', color: '#78716C' }}>
                        <Eye size={12} />
                      </a>
                    )}
                    <Link href={`/admin/editor?id=${article.id}&type=${article.type}`}
                          className="p-1.5 rounded-lg transition-all" title="Edit"
                          style={{ backgroundColor: 'var(--neu-bg)', boxShadow: 'var(--neu-flat)', color: '#78716C' }}>
                      <Edit3 size={12} />
                    </Link>
                    {article.type === 'published' && article.indexingStatus !== 'indexed' && (
                      <button onClick={() => submitToIndexNow(article.id)}
                              disabled={submitting === article.id}
                              className="p-1.5 rounded-lg transition-all" title="Submit to IndexNow"
                              style={{ backgroundColor: 'var(--neu-bg)', boxShadow: 'var(--neu-flat)', color: '#4A7BA8' }}>
                        {submitting === article.id ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                      </button>
                    )}
                    <button onClick={() => toggleExpanded(article.id)}
                            className="p-1.5 rounded-lg transition-all"
                            style={{ backgroundColor: 'var(--neu-bg)', boxShadow: 'var(--neu-flat)', color: '#78716C' }}>
                      {isExp ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    </button>
                  </div>
                </div>

                {/* Expanded details */}
                {isExp && (
                  <div className="px-4 pb-4 pt-2 border-t space-y-2"
                       style={{ borderColor: 'rgba(120,113,108,0.1)' }}>
                    {article.titleAr && (
                      <div style={{ fontFamily: "'IBM Plex Sans Arabic',sans-serif", fontSize: 12, color: '#57534E', direction: 'rtl' }}>
                        {article.titleAr}
                      </div>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                      {[
                        { label: 'EN Words', val: article.wordCountEn },
                        { label: 'AR Words', val: article.wordCountAr || '—' },
                        { label: 'SEO Score', val: article.seoScore ?? '—' },
                        { label: 'Quality', val: article.qualityScore ?? '—' },
                      ].map(({ label, val }) => (
                        <div key={label} className="py-2 rounded-lg"
                             style={{ backgroundColor: 'rgba(120,113,108,0.06)' }}>
                          <div style={{ fontFamily: "'Anybody',sans-serif", fontWeight: 700, fontSize: 14, color: '#1C1917' }}>{val}</div>
                          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 8, color: '#78716C', textTransform: 'uppercase', letterSpacing: 0.8 }}>{label}</div>
                        </div>
                      ))}
                    </div>
                    {article.error && (
                      <div className="px-3 py-2 rounded-lg text-xs"
                           style={{ fontFamily: "'IBM Plex Mono',monospace", backgroundColor: 'rgba(200,50,43,0.08)', color: '#C8322B' }}>
                        Error: {article.error}
                      </div>
                    )}
                    {article.lastSubmittedAt && (
                      <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: '#78716C' }}>
                        Last submitted to IndexNow: {timeAgo(article.lastSubmittedAt)}
                      </div>
                    )}
                    {article.slug && (
                      <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: '#A8A29E' }}>
                        /{article.slug}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
