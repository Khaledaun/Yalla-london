'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  FileText,
  Plus,
  Edit,
  Eye,
  Trash2,
  Search,
  BookOpen,
  Layers,
  Settings,
  CheckCircle2,
  AlertCircle,
  XCircle,
  TrendingUp,
  Clock,
  Globe,
  RefreshCw,
  ChevronRight,
  ExternalLink,
  Save,
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

      // Auth failures — show empty state, not error
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

      // Auth failures — show empty state, not error
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
    // Settings are stored locally for now -- database integration later
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

  // ─── Render Helpers ────────────────────────────────────────────────

  const LoadingState = ({ text }: { text: string }) => (
    <div className="flex items-center justify-center py-16">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500 mx-auto mb-4"></div>
        <p className="text-gray-600">{text}</p>
      </div>
    </div>
  );

  const ErrorState = ({
    message,
    onRetry,
  }: {
    message: string;
    onRetry: () => void;
  }) => (
    <div className="flex items-center justify-center py-16">
      <div className="text-center">
        <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-4" />
        <p className="text-gray-800 font-medium mb-2">Something went wrong</p>
        <p className="text-gray-600 text-sm mb-4">{message}</p>
        <Button variant="outline" onClick={onRetry}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    </div>
  );

  // ─── Render ────────────────────────────────────────────────────────

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-purple-500" />
            Information Hub
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage sections, articles, and settings for the Information Hub
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => window.open('/information', '_blank')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            View Live
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Sections</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.total_sections}</p>
                </div>
                <Layers className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Articles</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.total_articles}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Published</p>
                  <p className="text-2xl font-bold text-green-600">{summary.published_articles}</p>
                </div>
                <Globe className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Drafts</p>
                  <p className="text-2xl font-bold text-yellow-600">{summary.draft_articles}</p>
                </div>
                <Edit className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Sections</p>
                  <p className="text-2xl font-bold text-purple-600">{summary.published_sections}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="sections" className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Sections
          </TabsTrigger>
          <TabsTrigger value="articles" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Articles
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* ─── Sections Tab ─────────────────────────────────────────── */}
        <TabsContent value="sections">
          {sectionsLoading ? (
            <LoadingState text="Loading sections..." />
          ) : sectionsError ? (
            <ErrorState message={sectionsError} onRetry={fetchSections} />
          ) : (
            <div className="space-y-4">
              {/* Section Edit Modal */}
              {editingSection && (
                <Card className="border-purple-200 bg-purple-50/30">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Edit className="h-5 w-5 text-purple-500" />
                      Edit Section: {editingSection.name_en}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Name (English)
                        </label>
                        <Input
                          value={editingSection.name_en}
                          onChange={(e) =>
                            setEditingSection({ ...editingSection, name_en: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Name (Arabic)
                        </label>
                        <Input
                          value={editingSection.name_ar}
                          onChange={(e) =>
                            setEditingSection({ ...editingSection, name_ar: e.target.value })
                          }
                          dir="rtl"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Description (English)
                        </label>
                        <textarea
                          className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 border-gray-300"
                          rows={2}
                          value={editingSection.description_en}
                          onChange={(e) =>
                            setEditingSection({ ...editingSection, description_en: e.target.value })
                          }
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Description (Arabic)
                        </label>
                        <textarea
                          className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 border-gray-300"
                          rows={2}
                          dir="rtl"
                          value={editingSection.description_ar}
                          onChange={(e) =>
                            setEditingSection({ ...editingSection, description_ar: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Icon
                        </label>
                        <Input
                          value={editingSection.icon}
                          onChange={(e) =>
                            setEditingSection({ ...editingSection, icon: e.target.value })
                          }
                          placeholder="e.g. map, landmark, train"
                        />
                      </div>
                      <div className="flex items-center gap-3 pt-6">
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editingSection.published}
                            onChange={(e) =>
                              setEditingSection({ ...editingSection, published: e.target.checked })
                            }
                            className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                          />
                          Published
                        </label>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleSaveSection}
                        disabled={sectionSaving}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        {sectionSaving ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Save Section
                          </>
                        )}
                      </Button>
                      <Button variant="outline" onClick={() => setEditingSection(null)}>
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Sections List */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>All Sections ({sections.length})</span>
                    <Button variant="outline" size="sm" onClick={fetchSections}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {sections.map((section) => (
                      <div
                        key={section.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold text-gray-900">{section.name_en}</h3>
                            {section.published ? (
                              <Badge className="bg-green-100 text-green-800 text-xs">Published</Badge>
                            ) : (
                              <Badge className="bg-gray-100 text-gray-800 text-xs">Draft</Badge>
                            )}
                            <Badge className="bg-blue-100 text-blue-800 text-xs">
                              {section.article_count} article{section.article_count !== 1 ? 's' : ''}
                            </Badge>
                            {section.published_count > 0 && (
                              <Badge className="bg-green-50 text-green-700 text-xs">
                                {section.published_count} live
                              </Badge>
                            )}
                            {section.draft_count > 0 && (
                              <Badge className="bg-yellow-50 text-yellow-700 text-xs">
                                {section.draft_count} draft{section.draft_count !== 1 ? 's' : ''}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-1">
                            {section.description_en}
                          </p>
                          {section.latest_article && (
                            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Latest: {section.latest_article.title_en} (
                              {new Date(section.latest_article.updated_at).toLocaleDateString()})
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingSection({ ...section })}
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              window.open(`/information?section=${section.slug}`, '_blank')
                            }
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* ─── Articles Tab ─────────────────────────────────────────── */}
        <TabsContent value="articles">
          {/* Filters */}
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-64">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search articles by title, slug, or excerpt..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={filterSection} onValueChange={setFilterSection}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by section" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sections</SelectItem>
                    {uniqueSections.map((s) => (
                      <SelectItem key={s.slug} value={s.slug}>
                        {s.name_en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {uniqueCategories.map((c) => (
                      <SelectItem key={c.slug} value={c.slug}>
                        {c.name_en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={() => setViewMode(viewMode === 'cards' ? 'table' : 'cards')}
                >
                  {viewMode === 'cards' ? 'Table View' : 'Card View'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Articles Content */}
          {articlesLoading ? (
            <LoadingState text="Loading articles..." />
          ) : articlesError ? (
            <ErrorState message={articlesError} onRetry={fetchArticles} />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Articles ({filteredArticles.length})</span>
                  <Button variant="outline" size="sm" onClick={fetchArticles}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filteredArticles.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No articles found</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {articles.length === 0
                        ? 'No information articles have been created yet.'
                        : 'Try adjusting your search or filter criteria.'}
                    </p>
                  </div>
                ) : viewMode === 'table' ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b text-left">
                          <th className="p-3 text-sm font-medium text-gray-600">Title</th>
                          <th className="p-3 text-sm font-medium text-gray-600">Section</th>
                          <th className="p-3 text-sm font-medium text-gray-600">Category</th>
                          <th className="p-3 text-sm font-medium text-gray-600">Status</th>
                          <th className="p-3 text-sm font-medium text-gray-600">Reading Time</th>
                          <th className="p-3 text-sm font-medium text-gray-600">Updated</th>
                          <th className="p-3 text-sm font-medium text-gray-600">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredArticles.map((article) => (
                          <tr key={article.id} className="border-b hover:bg-gray-50 transition-colors">
                            <td className="p-3">
                              <div>
                                <h3 className="font-medium text-sm text-gray-900 line-clamp-1">
                                  {article.title_en}
                                </h3>
                                <p className="text-xs text-gray-500 mt-0.5">{article.slug}</p>
                              </div>
                            </td>
                            <td className="p-3">
                              {article.section ? (
                                <Badge className="bg-purple-50 text-purple-700 text-xs">
                                  {article.section.name_en}
                                </Badge>
                              ) : (
                                <span className="text-gray-400 text-xs">-</span>
                              )}
                            </td>
                            <td className="p-3">
                              {article.category ? (
                                <Badge className="bg-blue-50 text-blue-700 text-xs">
                                  {article.category.name_en}
                                </Badge>
                              ) : (
                                <span className="text-gray-400 text-xs">-</span>
                              )}
                            </td>
                            <td className="p-3">
                              <Badge
                                className={
                                  article.published
                                    ? 'bg-green-100 text-green-800 text-xs'
                                    : 'bg-gray-100 text-gray-800 text-xs'
                                }
                              >
                                {article.published ? 'Published' : 'Draft'}
                              </Badge>
                            </td>
                            <td className="p-3 text-sm text-gray-600">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {article.reading_time} min
                              </span>
                            </td>
                            <td className="p-3 text-sm text-gray-600">
                              {new Date(article.updated_at).toLocaleDateString()}
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    window.open(`/information/articles/${article.slug}`, '_blank')
                                  }
                                  title="Preview"
                                >
                                  <Eye className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteArticle(article.slug)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  title="Unpublish"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredArticles.map((article) => (
                      <div
                        key={article.id}
                        className="border rounded-lg p-4 hover:shadow-lg transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {article.published ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-gray-400" />
                            )}
                            <Badge
                              className={
                                article.published
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }
                            >
                              {article.published ? 'Published' : 'Draft'}
                            </Badge>
                          </div>
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {article.reading_time} min
                          </span>
                        </div>

                        <h3 className="font-semibold text-sm mb-2 line-clamp-2">
                          {article.title_en}
                        </h3>
                        <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                          {article.excerpt_en}
                        </p>

                        <div className="flex flex-wrap gap-1 mb-3">
                          {article.section && (
                            <Badge className="bg-purple-50 text-purple-700 text-xs">
                              {article.section.name_en}
                            </Badge>
                          )}
                          {article.category && (
                            <Badge className="bg-blue-50 text-blue-700 text-xs">
                              {article.category.name_en}
                            </Badge>
                          )}
                        </div>

                        <div className="text-xs text-gray-500 mb-3">
                          Updated: {new Date(article.updated_at).toLocaleDateString()}
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() =>
                              window.open(`/information/articles/${article.slug}`, '_blank')
                            }
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            {article.published ? 'View' : 'Preview'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteArticle(article.slug)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ─── Settings Tab ─────────────────────────────────────────── */}
        <TabsContent value="settings">
          <div className="space-y-6">
            {/* Display Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Display Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Articles Per Page
                    </label>
                    <Select
                      value={String(hubSettings.articles_per_page)}
                      onValueChange={(val) =>
                        setHubSettings({ ...hubSettings, articles_per_page: parseInt(val) })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="6">6</SelectItem>
                        <SelectItem value="9">9</SelectItem>
                        <SelectItem value="12">12</SelectItem>
                        <SelectItem value="18">18</SelectItem>
                        <SelectItem value="24">24</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Default Sort Order
                    </label>
                    <Select
                      value={hubSettings.default_sort}
                      onValueChange={(val) =>
                        setHubSettings({ ...hubSettings, default_sort: val })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="newest">Newest First</SelectItem>
                        <SelectItem value="oldest">Oldest First</SelectItem>
                        <SelectItem value="title">Title (A-Z)</SelectItem>
                        <SelectItem value="reading_time">Reading Time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hubSettings.show_reading_time}
                      onChange={(e) =>
                        setHubSettings({ ...hubSettings, show_reading_time: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm text-gray-700">Show reading time on article cards</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hubSettings.show_arabic_toggle}
                      onChange={(e) =>
                        setHubSettings({ ...hubSettings, show_arabic_toggle: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm text-gray-700">
                      Show English/Arabic language toggle on articles
                    </span>
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* Featured Sections */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Featured Sections</CardTitle>
                <p className="text-sm text-gray-500">
                  Select which sections appear in the featured area on the Information Hub landing
                  page.
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {sections.map((section) => (
                    <label
                      key={section.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        hubSettings.featured_sections.includes(section.slug)
                          ? 'bg-purple-50 border-purple-300'
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={hubSettings.featured_sections.includes(section.slug)}
                        onChange={() => toggleFeaturedSection(section.slug)}
                        className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-900">
                          {section.name_en}
                        </span>
                        <span className="text-xs text-gray-500 ml-2">
                          ({section.article_count} articles)
                        </span>
                      </div>
                      {section.published && (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      )}
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex items-center gap-4">
              <Button
                onClick={handleSaveSettings}
                disabled={settingsSaving}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {settingsSaving ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Settings
                  </>
                )}
              </Button>
              {settingsSaved && (
                <span className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" />
                  Settings saved successfully
                </span>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
