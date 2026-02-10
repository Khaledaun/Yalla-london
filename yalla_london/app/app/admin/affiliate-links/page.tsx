'use client';

import React, { useState, useCallback } from 'react';
import { PageHeader } from '@/components/admin/page-header';
import {
  Link2,
  Filter,
  Play,
  Eye,
  Zap,
  Trash2,
  ArrowUpDown,
  LayoutGrid,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertTriangle,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ContentTargetType = 'blog_post' | 'place' | 'event' | 'page' | 'all';
type BulkAction = 'assign' | 'unassign' | 'activate' | 'deactivate' | 'update_priority' | 'update_placement';
type LinkPlacement = 'auto' | 'top' | 'bottom' | 'inline' | 'sidebar' | 'cta_button';
type TargetingMode = 'specific' | 'filter';

interface MatchedContent {
  id: string;
  title: string;
  content_type: string;
  already_assigned?: boolean;
}

interface BulkResult {
  success: boolean;
  action: BulkAction;
  matched_count: number;
  affected_count: number;
  skipped_count: number;
  dry_run: boolean;
  matched_content?: MatchedContent[];
  assignment_ids?: string[];
  errors?: string[];
}

interface SummaryStats {
  total_assignments: number;
  active_assignments: number;
  by_content_type: Array<{ content_type: string; count: number }>;
  by_partner: Array<{
    partner_id: string;
    count: number;
    clicks: number;
    conversions: number;
    revenue: number;
  }>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PARTNER_TYPES = [
  { value: 'hotel', label: 'Hotels', icon: '🏨' },
  { value: 'ticket', label: 'Tickets', icon: '🎫' },
  { value: 'restaurant', label: 'Restaurants', icon: '🍽️' },
  { value: 'attraction', label: 'Attractions', icon: '🏛️' },
  { value: 'experience', label: 'Experiences', icon: '🎯' },
  { value: 'shopping', label: 'Shopping', icon: '🛍️' },
  { value: 'transport', label: 'Transport', icon: '🚗' },
  { value: 'car', label: 'Car Rental', icon: '🚙' },
] as const;

const CONTENT_TYPES: Array<{ value: ContentTargetType; label: string }> = [
  { value: 'blog_post', label: 'Blog Posts' },
  { value: 'place', label: 'Places' },
  { value: 'event', label: 'Events' },
  { value: 'all', label: 'All Content' },
];

const ACTIONS: Array<{ value: BulkAction; label: string; description: string; icon: React.ReactNode; color: string }> = [
  { value: 'assign', label: 'Assign Links', description: 'Assign affiliate partner to content', icon: <Link2 size={16} />, color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'unassign', label: 'Remove Links', description: 'Remove affiliate assignments', icon: <Trash2 size={16} />, color: 'bg-red-100 text-red-700 border-red-200' },
  { value: 'activate', label: 'Activate', description: 'Activate affiliate assignments', icon: <CheckCircle2 size={16} />, color: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'deactivate', label: 'Deactivate', description: 'Deactivate without removing', icon: <XCircle size={16} />, color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { value: 'update_priority', label: 'Set Priority', description: 'Change display priority', icon: <ArrowUpDown size={16} />, color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { value: 'update_placement', label: 'Set Placement', description: 'Change link placement', icon: <LayoutGrid size={16} />, color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
];

const PLACEMENTS: Array<{ value: LinkPlacement; label: string }> = [
  { value: 'auto', label: 'Auto (AI-placed)' },
  { value: 'top', label: 'Top of content' },
  { value: 'bottom', label: 'Bottom of content' },
  { value: 'inline', label: 'Inline (within text)' },
  { value: 'sidebar', label: 'Sidebar widget' },
  { value: 'cta_button', label: 'CTA Button' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BulkAffiliateLinksPage() {
  // Action state
  const [selectedAction, setSelectedAction] = useState<BulkAction>('assign');
  const [partnerId, setPartnerId] = useState('');
  const [widgetId, setWidgetId] = useState('');

  // Targeting state
  const [targetingMode, setTargetingMode] = useState<TargetingMode>('filter');
  const [contentType, setContentType] = useState<ContentTargetType>('blog_post');
  const [specificIds, setSpecificIds] = useState('');

  // Filter state
  const [selectedPartnerTypes, setSelectedPartnerTypes] = useState<string[]>([]);
  const [filterTags, setFilterTags] = useState('');
  const [filterCategories, setFilterCategories] = useState('');
  const [filterPageTypes, setFilterPageTypes] = useState<string[]>([]);
  const [filterSiteIds, setFilterSiteIds] = useState('');
  const [publishedOnly, setPublishedOnly] = useState(true);
  const [titleSearch, setTitleSearch] = useState('');

  // Options state
  const [linkPosition, setLinkPosition] = useState<LinkPlacement>('auto');
  const [priority, setPriority] = useState(1);
  const [maxLinksPerContent, setMaxLinksPerContent] = useState(5);
  const [skipExisting, setSkipExisting] = useState(true);
  const [newPriority, setNewPriority] = useState(1);
  const [newPlacement, setNewPlacement] = useState<LinkPlacement>('auto');

  // UI state
  const [showFilters, setShowFilters] = useState(true);
  const [showOptions, setShowOptions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BulkResult | null>(null);
  const [summary, setSummary] = useState<SummaryStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Build request payload
  const buildRequest = useCallback(
    (dryRun: boolean) => {
      const request: Record<string, unknown> = {
        action: selectedAction,
        dry_run: dryRun,
        targeting: {
          mode: targetingMode,
          content_type: contentType,
        },
      };

      if (partnerId) request.partner_id = partnerId;
      if (widgetId) request.widget_id = widgetId;

      if (targetingMode === 'specific') {
        (request.targeting as Record<string, unknown>).content_ids = specificIds
          .split(/[,\n]/)
          .map((id) => id.trim())
          .filter(Boolean);
      } else {
        const filters: Record<string, unknown> = {};
        if (selectedPartnerTypes.length > 0) filters.partner_types = selectedPartnerTypes;
        if (filterTags.trim()) filters.tags = filterTags.split(',').map((t) => t.trim()).filter(Boolean);
        if (filterCategories.trim()) filters.categories = filterCategories.split(',').map((c) => c.trim()).filter(Boolean);
        if (filterPageTypes.length > 0) filters.page_types = filterPageTypes;
        if (filterSiteIds.trim()) filters.site_ids = filterSiteIds.split(',').map((s) => s.trim()).filter(Boolean);
        if (publishedOnly) filters.published_only = true;
        if (titleSearch.trim()) filters.title_search = titleSearch.trim();
        (request.targeting as Record<string, unknown>).filters = filters;
      }

      if (selectedAction === 'assign') {
        request.options = {
          link_position: linkPosition,
          priority,
          max_links_per_content: maxLinksPerContent,
          skip_existing: skipExisting,
        };
      }

      if (selectedAction === 'update_priority') {
        request.new_priority = newPriority;
      }

      if (selectedAction === 'update_placement') {
        request.new_placement = newPlacement;
      }

      return request;
    },
    [
      selectedAction, partnerId, widgetId, targetingMode, contentType,
      specificIds, selectedPartnerTypes, filterTags, filterCategories,
      filterPageTypes, filterSiteIds, publishedOnly, titleSearch,
      linkPosition, priority, maxLinksPerContent, skipExisting,
      newPriority, newPlacement,
    ],
  );

  const executeOperation = useCallback(
    async (dryRun: boolean) => {
      setLoading(true);
      setError(null);
      setResult(null);

      try {
        const payload = buildRequest(dryRun);
        const res = await fetch('/api/admin/affiliate-links/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Operation failed');
          return;
        }

        setResult(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Network error');
      } finally {
        setLoading(false);
      }
    },
    [buildRequest],
  );

  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/affiliate-links/bulk');
      const data = await res.json();
      if (data.success) {
        setSummary(data);
      }
    } catch {
      // Non-critical
    }
  }, []);

  // Fetch summary on mount
  React.useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const togglePartnerType = (type: string) => {
    setSelectedPartnerTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  };

  const togglePageType = (type: string) => {
    setFilterPageTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Bulk Affiliate Links"
        description="Assign, manage, and configure affiliate links across your content in bulk"
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Monetization', href: '/admin/affiliate-marketing' },
          { label: 'Bulk Affiliate Links' },
        ]}
      />

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-500">Total Assignments</p>
            <p className="text-2xl font-bold">{summary.total_assignments}</p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-500">Active</p>
            <p className="text-2xl font-bold text-green-600">{summary.active_assignments}</p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-500">Content Types</p>
            <p className="text-2xl font-bold">{summary.by_content_type.length}</p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-500">Partners</p>
            <p className="text-2xl font-bold">{summary.by_partner.length}</p>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Step 1: Select Action */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Zap size={20} />
            Step 1: Select Action
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {ACTIONS.map((action) => (
              <button
                key={action.value}
                onClick={() => setSelectedAction(action.value)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  selectedAction === action.value
                    ? `${action.color} border-2 ring-2 ring-offset-1 ring-gray-300`
                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {action.icon}
                  <span className="font-medium text-sm">{action.label}</span>
                </div>
                <p className="text-xs opacity-75">{action.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Partner Selection (for assign/unassign) */}
        {(selectedAction === 'assign' || selectedAction === 'unassign') && (
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Link2 size={20} />
              Step 2: Select Partner
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Partner ID *
                </label>
                <input
                  type="text"
                  value={partnerId}
                  onChange={(e) => setPartnerId(e.target.value)}
                  placeholder="Enter affiliate partner ID"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Widget ID (optional)
                </label>
                <input
                  type="text"
                  value={widgetId}
                  onChange={(e) => setWidgetId(e.target.value)}
                  placeholder="Enter widget ID for specific display"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Target Content */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Filter size={20} />
            Step {selectedAction === 'assign' || selectedAction === 'unassign' ? '3' : '2'}: Target Content
          </h2>

          {/* Targeting mode toggle */}
          <div className="flex gap-4 mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="targeting"
                checked={targetingMode === 'filter'}
                onChange={() => setTargetingMode('filter')}
                className="text-blue-600"
              />
              <span className="text-sm font-medium">Filter-based (recommended)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="targeting"
                checked={targetingMode === 'specific'}
                onChange={() => setTargetingMode('specific')}
                className="text-blue-600"
              />
              <span className="text-sm font-medium">Specific IDs</span>
            </label>
          </div>

          {/* Content type selector */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Content Type
            </label>
            <div className="flex gap-2">
              {CONTENT_TYPES.map((ct) => (
                <button
                  key={ct.value}
                  onClick={() => setContentType(ct.value)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    contentType === ct.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {ct.label}
                </button>
              ))}
            </div>
          </div>

          {targetingMode === 'specific' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Content IDs (comma or newline separated)
              </label>
              <textarea
                value={specificIds}
                onChange={(e) => setSpecificIds(e.target.value)}
                placeholder="id1, id2, id3..."
                rows={4}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ) : (
            <div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3"
              >
                {showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                {showFilters ? 'Hide' : 'Show'} Filters
              </button>

              {showFilters && (
                <div className="space-y-4">
                  {/* Service type filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Match by Service Type
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {PARTNER_TYPES.map((pt) => (
                        <button
                          key={pt.value}
                          onClick={() => togglePartnerType(pt.value)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                            selectedPartnerTypes.includes(pt.value)
                              ? 'bg-blue-50 text-blue-700 border-blue-300'
                              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <span className="mr-1">{pt.icon}</span> {pt.label}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Auto-matches content related to these service types by tags and title keywords
                    </p>
                  </div>

                  {/* Title search */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Title Search
                    </label>
                    <input
                      type="text"
                      value={titleSearch}
                      onChange={(e) => setTitleSearch(e.target.value)}
                      placeholder="Search in content titles..."
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Tags filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tags (comma separated)
                      </label>
                      <input
                        type="text"
                        value={filterTags}
                        onChange={(e) => setFilterTags(e.target.value)}
                        placeholder="travel, london, hotels..."
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Category IDs */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Category IDs (comma separated)
                      </label>
                      <input
                        type="text"
                        value={filterCategories}
                        onChange={(e) => setFilterCategories(e.target.value)}
                        placeholder="cat_id1, cat_id2..."
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Site IDs */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Site IDs (comma separated)
                      </label>
                      <input
                        type="text"
                        value={filterSiteIds}
                        onChange={(e) => setFilterSiteIds(e.target.value)}
                        placeholder="site_id1, site_id2..."
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Page types */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Page Types
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {['guide', 'place', 'event', 'list', 'faq', 'news', 'itinerary'].map(
                          (pt) => (
                            <button
                              key={pt}
                              onClick={() => togglePageType(pt)}
                              className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                                filterPageTypes.includes(pt)
                                  ? 'bg-blue-50 text-blue-700 border-blue-300'
                                  : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                              }`}
                            >
                              {pt}
                            </button>
                          ),
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Published only */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={publishedOnly}
                      onChange={(e) => setPublishedOnly(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <span className="text-sm">Published content only</span>
                  </label>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Assignment Options (for assign action) */}
        {selectedAction === 'assign' && (
          <div className="bg-white rounded-lg border p-6">
            <button
              onClick={() => setShowOptions(!showOptions)}
              className="flex items-center gap-2 text-lg font-semibold"
            >
              {showOptions ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              Assignment Options
            </button>

            {showOptions && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Link Position
                  </label>
                  <select
                    value={linkPosition}
                    onChange={(e) => setLinkPosition(e.target.value as LinkPlacement)}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    {PLACEMENTS.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority (1 = highest)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={priority}
                    onChange={(e) => setPriority(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Links Per Content
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={maxLinksPerContent}
                    onChange={(e) => setMaxLinksPerContent(parseInt(e.target.value, 10) || 5)}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>

                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer pb-2">
                    <input
                      type="checkbox"
                      checked={skipExisting}
                      onChange={(e) => setSkipExisting(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <span className="text-sm">Skip already assigned</span>
                  </label>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Priority/Placement options for those actions */}
        {selectedAction === 'update_priority' && (
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-lg font-semibold mb-4">New Priority</h2>
            <input
              type="number"
              min={1}
              max={100}
              value={newPriority}
              onChange={(e) => setNewPriority(parseInt(e.target.value, 10) || 1)}
              className="w-32 px-3 py-2 border rounded-lg"
            />
          </div>
        )}

        {selectedAction === 'update_placement' && (
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-lg font-semibold mb-4">New Placement</h2>
            <select
              value={newPlacement}
              onChange={(e) => setNewPlacement(e.target.value as LinkPlacement)}
              className="w-64 px-3 py-2 border rounded-lg"
            >
              {PLACEMENTS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => executeOperation(true)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />}
            Preview Matches
          </button>

          <button
            onClick={() => executeOperation(false)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            Execute {ACTIONS.find((a) => a.value === selectedAction)?.label}
          </button>
        </div>

        {/* Error display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Operation Failed</p>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              {result.dry_run ? (
                <>
                  <Eye size={20} className="text-gray-500" />
                  Preview Results
                </>
              ) : (
                <>
                  <CheckCircle2 size={20} className="text-green-500" />
                  Operation Complete
                </>
              )}
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-xs text-blue-600">Matched</p>
                <p className="text-xl font-bold text-blue-800">{result.matched_count}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <p className="text-xs text-green-600">Affected</p>
                <p className="text-xl font-bold text-green-800">{result.affected_count}</p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-3">
                <p className="text-xs text-yellow-600">Skipped</p>
                <p className="text-xl font-bold text-yellow-800">{result.skipped_count}</p>
              </div>
              <div className={`rounded-lg p-3 ${result.dry_run ? 'bg-gray-50' : 'bg-purple-50'}`}>
                <p className={`text-xs ${result.dry_run ? 'text-gray-600' : 'text-purple-600'}`}>Mode</p>
                <p className={`text-sm font-bold ${result.dry_run ? 'text-gray-800' : 'text-purple-800'}`}>
                  {result.dry_run ? 'Dry Run' : 'Applied'}
                </p>
              </div>
            </div>

            {/* Matched content preview */}
            {result.matched_content && result.matched_content.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Matched Content ({result.matched_content.length})
                </h3>
                <div className="max-h-64 overflow-y-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Title</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Type</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {result.matched_content.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-gray-900 truncate max-w-xs">
                            {item.title}
                          </td>
                          <td className="px-3 py-2">
                            <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                              {item.content_type}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            {item.already_assigned ? (
                              <span className="text-yellow-600 text-xs">Already assigned</span>
                            ) : (
                              <span className="text-green-600 text-xs">Available</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Errors */}
            {result.errors && result.errors.length > 0 && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm font-medium text-red-800 mb-1">
                  Errors ({result.errors.length})
                </p>
                <ul className="text-xs text-red-600 space-y-1">
                  {result.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
