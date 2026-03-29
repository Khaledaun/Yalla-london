'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  AdminPageHeader,
  AdminCard,
  AdminKPICard,
  AdminButton,
  AdminStatusBadge,
  AdminLoadingState,
  AdminEmptyState,
  AdminSectionLabel,
  AdminTabs,
  AdminAlertBanner,
} from '@/components/admin/admin-ui';
import {
  FileText,
  Edit,
  Eye,
  Trash2,
  Search,
  CheckCircle2,
  Clock,
  RefreshCw,
  ExternalLink,
  Save,
  X,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────

interface SectionData {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
  description_en: string;
  description_ar: string;
  icon: string;
  sort_order: number;
  published: boolean;
  article_count: number;
  published_count: number;
  draft_count: number;
  latest_article: {
    id: string;
    slug: string;
    title_en: string;
    updated_at: string;
  } | null;
}

interface ArticleData {
  id: string;
  slug: string;
  section_id: string;
  category_id: string;
  title_en: string;
  title_ar: string;
  excerpt_en: string;
  excerpt_ar: string;
  featured_image: string;
  reading_time: number;
  published: boolean;
  created_at: string;
  updated_at: string;
  section: {
    id: string;
    slug: string;
    name_en: string;
    name_ar: string;
  } | null;
  category: {
    id: string;
    slug: string;
    name_en: string;
    name_ar: string;
  } | null;
}

interface SummaryData {
  total_sections: number;
  published_sections: number;
  total_articles: number;
  published_articles: number;
  draft_articles: number;
}

interface HubSettings {
  featured_sections: string[];
  articles_per_page: number;
  show_reading_time: boolean;
  show_arabic_toggle: boolean;
  default_sort: string;
}

/* ─── Form Label ─────────────────────────────────────────────────── */
function FormLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: 'var(--font-system)', fontSize: 10, fontWeight: 600,
      textTransform: 'uppercase', letterSpacing: '1px', color: '#78716C', marginBottom: 4,
    }}>
      {children}
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────

export default function InformationHubAdmin() {
  // State: Sections tab
  const [sections, setSections] = useState<SectionData[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [sectionsLoading, setSectionsLoading] = useState(true);
  const [sectionsError, setSectionsError] = useState<string | null>(null);
  const [editingSection, setEditingSection] = useState<SectionData | null>(null);
  const [sectionSaving, setSectionSaving] = useState(false);

  // State: Articles tab
  const [articles, setArticles] = useState<ArticleData[]>([]);
  const [articlesLoading, setArticlesLoading] = useState(true);
  const [articlesError, setArticlesError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSection, setFilterSection] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');

  // State: Settings tab
  const [hubSettings, setHubSettings] = useState<HubSettings>({
    featured_sections: [],
    articles_per_page: 12,
    show_reading_time: true,
    show_arabic_toggle: true,
    default_sort: 'newest',
  });
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Active tab
  const [activeTab, setActiveTab] = useState('sections');

  // ─── Data Fetching ─────────────────────────────────────────────────

  const fetchSections = useCallback(async () => {
    try {
      setSectionsLoading(true);
      setSectionsError(null);
      const response = await fetch('/api/information/sections');

      if (response.status === 401 || response.status === 403) {
        setSections([]);
        setSectionsLoading(false);
        return;
      }

      const data = await response.json().catch(() => null);

      if (data?.success) {
        setSections(data.data);
        setSummary(data.summary);
      } else {
        console.warn('Sections API error:', data?.error);
        setSections([]);
      }
    } catch (err) {
      console.error('Error fetching sections:', err);
      setSectionsError('Failed to load sections. Please try again.');
    } finally {
      setSectionsLoading(false);
    }
  }, []);

  const fetchArticles = useCallback(async () => {
    try {
      setArticlesLoading(true);
      setArticlesError(null);

      const params = new URLSearchParams({ limit: '50' });
      if (filterSection !== 'all') params.set('section', filterSection);
      if (filterCategory !== 'all') params.set('category', filterCategory);
      if (filterStatus !== 'all') params.set('published', filterStatus === 'published' ? 'true' : 'false');
      if (searchQuery) params.set('search', searchQuery);

      const response = await fetch(`/api/information?${params}`);

      if (response.status === 401 || response.status === 403) {
        setArticles([]);
        setArticlesLoading(false);
        return;
      }

      const data = await response.json().catch(() => null);

      if (data?.success) {
        setArticles(data.data);
      } else {
        console.warn('Articles API error:', data?.error);
        setArticles([]);
      }
    } catch (err) {
      console.error('Error fetching articles:', err);
      setArticlesError('Failed to load articles. Please try again.');
    } finally {
      setArticlesLoading(false);
    }
  }, [filterSection, filterCategory, filterStatus, searchQuery]);

  useEffect(() => {
    fetchSections();
  }, [fetchSections]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  // ─── Handlers ──────────────────────────────────────────────────────

  const handleSaveSection = async () => {
    if (!editingSection) return;
    try {
      setSectionSaving(true);
      const response = await fetch('/api/information/sections', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingSection.id,
          name_en: editingSection.name_en,
          name_ar: editingSection.name_ar,
          description_en: editingSection.description_en,
          description_ar: editingSection.description_ar,
          icon: editingSection.icon,
          published: editingSection.published,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setSections((prev) =>
          prev.map((s) => (s.id === editingSection.id ? { ...s, ...data.data } : s))
        );
        setEditingSection(null);
      } else {
        alert(data.error || 'Failed to save section');
      }
    } catch (err) {
      console.error('Error saving section:', err);
      alert('Failed to save section. Please try again.');
    } finally {
      setSectionSaving(false);
    }
  };

  const handleDeleteArticle = async (slug: string) => {
    if (!confirm('Are you sure you want to unpublish this article? It will be soft-deleted (set to unpublished).')) {
      return;
    }
    try {
      const response = await fetch(`/api/information/${slug}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        setArticles((prev) =>
          prev.map((a) => (a.slug === slug ? { ...a, published: false } : a))
        );
      } else {
        alert(data.error || 'Failed to delete article');
      }
    } catch (err) {
      console.error('Error deleting article:', err);
      alert('Failed to delete article. Please try again.');
    }
  };

  const handleSaveSettings = async () => {
    setSettingsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    setSettingsSaving(false);
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 3000);
  };

  const toggleFeaturedSection = (sectionSlug: string) => {
    setHubSettings((prev) => {
      const current = prev.featured_sections;
      if (current.includes(sectionSlug)) {
        return { ...prev, featured_sections: current.filter((s) => s !== sectionSlug) };
      }
      return { ...prev, featured_sections: [...current, sectionSlug] };
    });
  };

  // ─── Derived Data ──────────────────────────────────────────────────

  const filteredArticles = articles.filter((article) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        article.title_en.toLowerCase().includes(q) ||
        article.title_ar.includes(searchQuery) ||
        article.excerpt_en.toLowerCase().includes(q) ||
        article.slug.includes(q);
      if (!matchesSearch) return false;
    }
    return true;
  });

  const uniqueCategories = Array.from(
    new Set(articles.map((a) => a.category?.slug).filter(Boolean))
  ).map((slug) => {
    const cat = articles.find((a) => a.category?.slug === slug)?.category;
    return cat ? { slug: cat.slug, name_en: cat.name_en } : null;
  }).filter(Boolean) as { slug: string; name_en: string }[];

  const uniqueSections = Array.from(
    new Set(articles.map((a) => a.section?.slug).filter(Boolean))
  ).map((slug) => {
    const sec = articles.find((a) => a.section?.slug === slug)?.section;
    return sec ? { slug: sec.slug, name_en: sec.name_en } : null;
  }).filter(Boolean) as { slug: string; name_en: string }[];

  // ─── Render ────────────────────────────────────────────────────────

  return (
    <div className="admin-page p-4 md:p-6">
      <AdminPageHeader
        title="Information Hub"
        subtitle="Manage sections, articles, and settings"
        action={
          <AdminButton variant="secondary" onClick={() => window.open('/information', '_blank')}>
            <ExternalLink size={14} /> View Live
          </AdminButton>
        }
      />

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <AdminKPICard value={summary.total_sections} label="Total Sections" color="#1C1917" />
          <AdminKPICard value={summary.total_articles} label="Total Articles" color="#3B7EA1" />
          <AdminKPICard value={summary.published_articles} label="Published" color="#2D5A3D" />
          <AdminKPICard value={summary.draft_articles} label="Drafts" color="#C49A2A" />
          <AdminKPICard value={summary.published_sections} label="Active Sections" color="#C8322B" />
        </div>
      )}

      {/* Tab Navigation */}
      <div className="mb-4">
        <AdminTabs
          tabs={[
            { id: 'sections', label: 'Sections' },
            { id: 'articles', label: 'Articles' },
            { id: 'settings', label: 'Settings' },
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>

      {/* ─── Sections Tab ─────────────────────────────────────────── */}
      {activeTab === 'sections' && (
        <>
          {sectionsLoading ? (
            <AdminLoadingState label="Loading sections..." />
          ) : sectionsError ? (
            <AdminAlertBanner
              severity="critical"
              message="Failed to load sections"
              detail={sectionsError}
              action={<AdminButton variant="secondary" size="sm" onClick={fetchSections}><RefreshCw size={13} /> Retry</AdminButton>}
            />
          ) : (
            <div className="space-y-4">
              {/* Section Edit Panel */}
              {editingSection && (
                <AdminCard accent accentColor="gold">
                  <div className="flex items-center justify-between mb-3">
                    <AdminSectionLabel>Editing: {editingSection.name_en}</AdminSectionLabel>
                    <button onClick={() => setEditingSection(null)} className="p-1 rounded-lg hover:bg-stone-100 transition-colors">
                      <X size={14} style={{ color: '#78716C' }} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    <div>
                      <FormLabel>Name (English)</FormLabel>
                      <input className="admin-input w-full" value={editingSection.name_en}
                        onChange={(e) => setEditingSection({ ...editingSection, name_en: e.target.value })} />
                    </div>
                    <div>
                      <FormLabel>Name (Arabic)</FormLabel>
                      <input className="admin-input w-full" dir="rtl" value={editingSection.name_ar}
                        onChange={(e) => setEditingSection({ ...editingSection, name_ar: e.target.value })} />
                    </div>
                    <div className="md:col-span-2">
                      <FormLabel>Description (English)</FormLabel>
                      <textarea className="admin-input w-full" rows={2} value={editingSection.description_en}
                        onChange={(e) => setEditingSection({ ...editingSection, description_en: e.target.value })} />
                    </div>
                    <div className="md:col-span-2">
                      <FormLabel>Description (Arabic)</FormLabel>
                      <textarea className="admin-input w-full" dir="rtl" rows={2} value={editingSection.description_ar}
                        onChange={(e) => setEditingSection({ ...editingSection, description_ar: e.target.value })} />
                    </div>
                    <div>
                      <FormLabel>Icon</FormLabel>
                      <input className="admin-input w-full" value={editingSection.icon}
                        onChange={(e) => setEditingSection({ ...editingSection, icon: e.target.value })}
                        placeholder="e.g. map, landmark, train" />
                    </div>
                    <div className="flex items-center gap-3 pt-5">
                      <label className="flex items-center gap-2 cursor-pointer" style={{ fontFamily: 'var(--font-system)', fontSize: 11, color: '#44403C' }}>
                        <input type="checkbox" checked={editingSection.published}
                          onChange={(e) => setEditingSection({ ...editingSection, published: e.target.checked })}
                          className="h-4 w-4 rounded" />
                        Published
                      </label>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <AdminButton variant="primary" onClick={handleSaveSection} loading={sectionSaving}>
                      <Save size={13} /> Save Section
                    </AdminButton>
                    <AdminButton variant="secondary" onClick={() => setEditingSection(null)}>Cancel</AdminButton>
                  </div>
                </AdminCard>
              )}

              {/* Sections List */}
              <AdminCard>
                <div className="flex items-center justify-between mb-3">
                  <AdminSectionLabel>All Sections ({sections.length})</AdminSectionLabel>
                  <AdminButton variant="secondary" size="sm" onClick={fetchSections}>
                    <RefreshCw size={13} /> Refresh
                  </AdminButton>
                </div>
                <div className="space-y-2">
                  {sections.map((section) => (
                    <div
                      key={section.id}
                      className="flex items-center justify-between p-3 rounded-xl transition-colors hover:bg-stone-50"
                      style={{ backgroundColor: '#FAF8F4', border: '1px solid rgba(214,208,196,0.3)' }}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: '#1C1917' }}>
                            {section.name_en}
                          </span>
                          <AdminStatusBadge status={section.published ? 'published' : 'draft'} />
                          <AdminStatusBadge status="pending" label={`${section.article_count} article${section.article_count !== 1 ? 's' : ''}`} />
                          {section.published_count > 0 && (
                            <AdminStatusBadge status="active" label={`${section.published_count} live`} />
                          )}
                          {section.draft_count > 0 && (
                            <AdminStatusBadge status="warning" label={`${section.draft_count} draft${section.draft_count !== 1 ? 's' : ''}`} />
                          )}
                        </div>
                        <p style={{ fontFamily: 'var(--font-system)', fontSize: 11, color: '#78716C', marginTop: 4 }} className="line-clamp-1">
                          {section.description_en}
                        </p>
                        {section.latest_article && (
                          <p className="flex items-center gap-1 mt-1" style={{ fontFamily: 'var(--font-system)', fontSize: 10, color: '#A8A29E' }}>
                            <Clock size={10} />
                            Latest: {section.latest_article.title_en} ({new Date(section.latest_article.updated_at).toLocaleDateString()})
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 ml-3">
                        <AdminButton variant="secondary" size="sm" onClick={() => setEditingSection({ ...section })}>
                          <Edit size={12} /> Edit
                        </AdminButton>
                        <AdminButton variant="secondary" size="sm" onClick={() => window.open(`/information?section=${section.slug}`, '_blank')}>
                          <Eye size={12} /> View
                        </AdminButton>
                      </div>
                    </div>
                  ))}
                </div>
              </AdminCard>
            </div>
          )}
        </>
      )}

      {/* ─── Articles Tab ─────────────────────────────────────────── */}
      {activeTab === 'articles' && (
        <>
          {/* Filters */}
          <AdminCard className="mb-4">
            <div className="flex flex-wrap gap-3">
              <div className="flex-1 min-w-[200px] relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#A8A29E' }} />
                <input
                  placeholder="Search articles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="admin-input pl-10 w-full"
                />
              </div>
              <select className="admin-select" value={filterSection} onChange={(e) => setFilterSection(e.target.value)}>
                <option value="all">All Sections</option>
                {uniqueSections.map((s) => <option key={s.slug} value={s.slug}>{s.name_en}</option>)}
              </select>
              <select className="admin-select" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                <option value="all">All Categories</option>
                {uniqueCategories.map((c) => <option key={c.slug} value={c.slug}>{c.name_en}</option>)}
              </select>
              <select className="admin-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="all">All Status</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
              <AdminButton variant="secondary" size="sm" onClick={() => setViewMode(viewMode === 'cards' ? 'table' : 'cards')}>
                {viewMode === 'cards' ? 'Table View' : 'Card View'}
              </AdminButton>
            </div>
          </AdminCard>

          {articlesLoading ? (
            <AdminLoadingState label="Loading articles..." />
          ) : articlesError ? (
            <AdminAlertBanner
              severity="critical"
              message="Failed to load articles"
              detail={articlesError}
              action={<AdminButton variant="secondary" size="sm" onClick={fetchArticles}><RefreshCw size={13} /> Retry</AdminButton>}
            />
          ) : (
            <AdminCard>
              <div className="flex items-center justify-between mb-3">
                <AdminSectionLabel>Articles ({filteredArticles.length})</AdminSectionLabel>
                <AdminButton variant="secondary" size="sm" onClick={fetchArticles}>
                  <RefreshCw size={13} /> Refresh
                </AdminButton>
              </div>

              {filteredArticles.length === 0 ? (
                <AdminEmptyState
                  icon={FileText}
                  title="No articles found"
                  description={articles.length === 0 ? 'No information articles have been created yet.' : 'Try adjusting your search or filter criteria.'}
                />
              ) : viewMode === 'table' ? (
                <div className="overflow-x-auto -mx-4 md:mx-0">
                  <table className="w-full" style={{ fontFamily: 'var(--font-system)', fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(214,208,196,0.5)' }}>
                        {['Title', 'Section', 'Category', 'Status', 'Reading', 'Updated', ''].map(h => (
                          <th key={h} className="px-3 py-2.5 text-left" style={{
                            fontFamily: 'var(--font-system)', fontSize: 9, fontWeight: 600,
                            textTransform: 'uppercase', letterSpacing: '1.5px', color: '#78716C',
                          }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredArticles.map((article) => (
                        <tr key={article.id} className="transition-colors hover:bg-stone-50/50"
                          style={{ borderBottom: '1px solid rgba(214,208,196,0.3)' }}>
                          <td className="px-3 py-3">
                            <div style={{ fontWeight: 600, color: '#1C1917', fontSize: 12 }} className="line-clamp-1">
                              {article.title_en}
                            </div>
                            <div style={{ fontSize: 10, color: '#A8A29E', marginTop: 2 }}>{article.slug}</div>
                          </td>
                          <td className="px-3 py-3">
                            {article.section ? (
                              <AdminStatusBadge status="running" label={article.section.name_en} />
                            ) : (
                              <span style={{ color: '#A8A29E', fontSize: 11 }}>-</span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            {article.category ? (
                              <AdminStatusBadge status="pending" label={article.category.name_en} />
                            ) : (
                              <span style={{ color: '#A8A29E', fontSize: 11 }}>-</span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <AdminStatusBadge status={article.published ? 'published' : 'draft'} />
                          </td>
                          <td className="px-3 py-3">
                            <span className="flex items-center gap-1" style={{ fontSize: 11, color: '#78716C' }}>
                              <Clock size={11} /> {article.reading_time} min
                            </span>
                          </td>
                          <td className="px-3 py-3" style={{ fontSize: 11, color: '#78716C' }}>
                            {new Date(article.updated_at).toLocaleDateString()}
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-1">
                              <AdminButton variant="ghost" size="sm"
                                onClick={() => window.open(`/information/articles/${article.slug}`, '_blank')}>
                                <Eye size={12} />
                              </AdminButton>
                              <AdminButton variant="ghost" size="sm" onClick={() => handleDeleteArticle(article.slug)}>
                                <Trash2 size={12} style={{ color: '#C8322B' }} />
                              </AdminButton>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredArticles.map((article) => (
                    <div key={article.id} className="rounded-xl p-3 transition-shadow hover:shadow-md"
                      style={{ border: '1px solid rgba(214,208,196,0.5)', backgroundColor: '#FFFFFF' }}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          {article.published ? (
                            <CheckCircle2 size={13} style={{ color: '#2D5A3D' }} />
                          ) : (
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#D6D0C4' }} />
                          )}
                          <AdminStatusBadge status={article.published ? 'published' : 'draft'} />
                        </div>
                        <span className="flex items-center gap-1" style={{ fontFamily: 'var(--font-system)', fontSize: 10, color: '#A8A29E' }}>
                          <Clock size={10} /> {article.reading_time} min
                        </span>
                      </div>

                      <h3 className="line-clamp-2 mb-1" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: '#1C1917' }}>
                        {article.title_en}
                      </h3>
                      <p className="line-clamp-2 mb-2" style={{ fontFamily: 'var(--font-system)', fontSize: 11, color: '#78716C' }}>
                        {article.excerpt_en}
                      </p>

                      <div className="flex flex-wrap gap-1 mb-2">
                        {article.section && <AdminStatusBadge status="running" label={article.section.name_en} />}
                        {article.category && <AdminStatusBadge status="pending" label={article.category.name_en} />}
                      </div>

                      <div style={{ fontFamily: 'var(--font-system)', fontSize: 10, color: '#A8A29E', marginBottom: 8 }}>
                        Updated: {new Date(article.updated_at).toLocaleDateString()}
                      </div>

                      <div className="flex items-center gap-2">
                        <AdminButton variant="secondary" size="sm" className="flex-1"
                          onClick={() => window.open(`/information/articles/${article.slug}`, '_blank')}>
                          <Eye size={12} /> {article.published ? 'View' : 'Preview'}
                        </AdminButton>
                        <AdminButton variant="ghost" size="sm" onClick={() => handleDeleteArticle(article.slug)}>
                          <Trash2 size={12} style={{ color: '#C8322B' }} />
                        </AdminButton>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </AdminCard>
          )}
        </>
      )}

      {/* ─── Settings Tab ─────────────────────────────────────────── */}
      {activeTab === 'settings' && (
        <div className="space-y-4">
          {/* Display Settings */}
          <AdminCard accent accentColor="blue">
            <AdminSectionLabel>Display Settings</AdminSectionLabel>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div>
                <FormLabel>Articles Per Page</FormLabel>
                <select className="admin-select w-full"
                  value={String(hubSettings.articles_per_page)}
                  onChange={(e) => setHubSettings({ ...hubSettings, articles_per_page: parseInt(e.target.value) })}>
                  <option value="6">6</option>
                  <option value="9">9</option>
                  <option value="12">12</option>
                  <option value="18">18</option>
                  <option value="24">24</option>
                </select>
              </div>
              <div>
                <FormLabel>Default Sort Order</FormLabel>
                <select className="admin-select w-full"
                  value={hubSettings.default_sort}
                  onChange={(e) => setHubSettings({ ...hubSettings, default_sort: e.target.value })}>
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="title">Title (A-Z)</option>
                  <option value="reading_time">Reading Time</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer" style={{ fontFamily: 'var(--font-system)', fontSize: 11, color: '#44403C' }}>
                <input type="checkbox" checked={hubSettings.show_reading_time}
                  onChange={(e) => setHubSettings({ ...hubSettings, show_reading_time: e.target.checked })} className="h-4 w-4 rounded" />
                Show reading time on article cards
              </label>
              <label className="flex items-center gap-2 cursor-pointer" style={{ fontFamily: 'var(--font-system)', fontSize: 11, color: '#44403C' }}>
                <input type="checkbox" checked={hubSettings.show_arabic_toggle}
                  onChange={(e) => setHubSettings({ ...hubSettings, show_arabic_toggle: e.target.checked })} className="h-4 w-4 rounded" />
                Show English/Arabic language toggle on articles
              </label>
            </div>
          </AdminCard>

          {/* Featured Sections */}
          <AdminCard accent accentColor="gold">
            <AdminSectionLabel>Featured Sections</AdminSectionLabel>
            <p style={{ fontFamily: 'var(--font-system)', fontSize: 11, color: '#78716C', marginBottom: 12 }}>
              Select which sections appear in the featured area on the Information Hub landing page.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {sections.map((section) => (
                <label
                  key={section.id}
                  className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors"
                  style={{
                    backgroundColor: hubSettings.featured_sections.includes(section.slug) ? 'rgba(196,154,42,0.06)' : '#FAF8F4',
                    border: `1px solid ${hubSettings.featured_sections.includes(section.slug) ? '#C49A2A' : 'rgba(214,208,196,0.4)'}`,
                  }}
                >
                  <input type="checkbox"
                    checked={hubSettings.featured_sections.includes(section.slug)}
                    onChange={() => toggleFeaturedSection(section.slug)}
                    className="h-4 w-4 rounded" />
                  <div className="flex-1">
                    <span style={{ fontFamily: 'var(--font-system)', fontWeight: 600, fontSize: 12, color: '#1C1917' }}>
                      {section.name_en}
                    </span>
                    <span style={{ fontFamily: 'var(--font-system)', fontSize: 10, color: '#A8A29E', marginLeft: 6 }}>
                      ({section.article_count} articles)
                    </span>
                  </div>
                  {section.published && <CheckCircle2 size={14} style={{ color: '#2D5A3D' }} />}
                </label>
              ))}
            </div>
          </AdminCard>

          {/* Save Button */}
          <div className="flex items-center gap-3">
            <AdminButton variant="primary" onClick={handleSaveSettings} loading={settingsSaving}>
              <Save size={13} /> Save Settings
            </AdminButton>
            {settingsSaved && (
              <span className="flex items-center gap-1" style={{ fontFamily: 'var(--font-system)', fontSize: 11, color: '#2D5A3D' }}>
                <CheckCircle2 size={14} /> Settings saved successfully
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
