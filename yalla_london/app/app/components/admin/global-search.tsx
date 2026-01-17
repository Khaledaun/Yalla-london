'use client';

/**
 * Global Search / Command Palette
 *
 * A powerful search interface for finding articles, sites, pages, and quick actions.
 * Accessible via Cmd/Ctrl+K shortcut from anywhere in the admin dashboard.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  FileText,
  Globe,
  Settings,
  Image as ImageIcon,
  Users,
  BarChart3,
  Zap,
  Plus,
  ArrowRight,
  Command,
  X,
  Clock,
  TrendingUp,
  DollarSign,
  Target,
  Bot,
  Palette,
  Link as LinkIcon,
  Upload,
} from 'lucide-react';

interface SearchResult {
  id: string;
  type: 'article' | 'site' | 'page' | 'action' | 'media' | 'setting';
  title: string;
  subtitle?: string;
  icon: any;
  href?: string;
  action?: () => void;
  keywords?: string[];
}

// Quick actions available in search
const QUICK_ACTIONS: SearchResult[] = [
  {
    id: 'new-article',
    type: 'action',
    title: 'Create New Article',
    subtitle: 'Start writing a new blog post',
    icon: Plus,
    href: '/admin/articles/new',
    keywords: ['write', 'blog', 'post', 'create'],
  },
  {
    id: 'new-site',
    type: 'action',
    title: 'Create New Site',
    subtitle: 'Launch a new domain with AI',
    icon: Globe,
    href: '/admin/command-center/sites/new',
    keywords: ['domain', 'website', 'launch'],
  },
  {
    id: 'upload-media',
    type: 'action',
    title: 'Upload Media',
    subtitle: 'Add images, videos, or files',
    icon: Upload,
    href: '/admin/media?upload=true',
    keywords: ['image', 'photo', 'video', 'file'],
  },
  {
    id: 'generate-content',
    type: 'action',
    title: 'Generate Content with AI',
    subtitle: 'Create articles using AI',
    icon: Zap,
    href: '/admin/command-center/content/generate',
    keywords: ['ai', 'generate', 'auto'],
  },
  {
    id: 'run-seo-audit',
    type: 'action',
    title: 'Run SEO Audit',
    subtitle: 'Analyze your site performance',
    icon: Target,
    href: '/admin/seo-audits',
    keywords: ['seo', 'audit', 'performance', 'speed'],
  },
  {
    id: 'view-analytics',
    type: 'action',
    title: 'View Analytics',
    subtitle: 'Check traffic and performance',
    icon: BarChart3,
    href: '/admin/command-center/analytics',
    keywords: ['traffic', 'stats', 'metrics'],
  },
  {
    id: 'manage-affiliates',
    type: 'action',
    title: 'Manage Affiliates',
    subtitle: 'View commissions and partners',
    icon: DollarSign,
    href: '/admin/command-center/affiliates',
    keywords: ['money', 'commission', 'revenue'],
  },
  {
    id: 'automation-hub',
    type: 'action',
    title: 'Automation Hub',
    subtitle: 'Configure automated workflows',
    icon: Bot,
    href: '/admin/automation-hub',
    keywords: ['autopilot', 'schedule', 'auto'],
  },
];

// Admin pages for navigation
const ADMIN_PAGES: SearchResult[] = [
  { id: 'dashboard', type: 'page', title: 'Dashboard', icon: BarChart3, href: '/admin/dashboard' },
  { id: 'command-center', type: 'page', title: 'Command Center', icon: Zap, href: '/admin/command-center' },
  { id: 'sites', type: 'page', title: 'Sites Portfolio', icon: Globe, href: '/admin/command-center/sites' },
  { id: 'articles', type: 'page', title: 'Articles', icon: FileText, href: '/admin/articles' },
  { id: 'media', type: 'page', title: 'Media Library', icon: ImageIcon, href: '/admin/media' },
  { id: 'topics', type: 'page', title: 'Topics Pipeline', icon: TrendingUp, href: '/admin/topics-pipeline' },
  { id: 'seo-audits', type: 'page', title: 'SEO Audits', icon: Target, href: '/admin/seo-audits' },
  { id: 'affiliates', type: 'page', title: 'Affiliate Dashboard', icon: DollarSign, href: '/admin/command-center/affiliates' },
  { id: 'autopilot', type: 'page', title: 'Autopilot', icon: Bot, href: '/admin/command-center/autopilot' },
  { id: 'api-keys', type: 'page', title: 'API Keys', icon: Settings, href: '/admin/command-center/settings/api-keys' },
  { id: 'theme', type: 'page', title: 'Theme Settings', icon: Palette, href: '/admin/settings/theme' },
  { id: 'homepage-builder', type: 'page', title: 'Homepage Builder', icon: Palette, href: '/admin/homepage-builder' },
];

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('admin-recent-searches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
    if (!isOpen) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Search function
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    const q = searchQuery.toLowerCase();

    // Search quick actions
    const matchedActions = QUICK_ACTIONS.filter(action =>
      action.title.toLowerCase().includes(q) ||
      action.subtitle?.toLowerCase().includes(q) ||
      action.keywords?.some(k => k.includes(q))
    );

    // Search pages
    const matchedPages = ADMIN_PAGES.filter(page =>
      page.title.toLowerCase().includes(q)
    );

    // Search articles from API
    let matchedArticles: SearchResult[] = [];
    try {
      const res = await fetch(`/api/admin/articles/search?q=${encodeURIComponent(searchQuery)}&limit=5`);
      if (res.ok) {
        const data = await res.json();
        matchedArticles = (data.articles || []).map((article: any) => ({
          id: article.id,
          type: 'article' as const,
          title: article.title,
          subtitle: article.slug,
          icon: FileText,
          href: `/admin/articles/${article.id}/edit`,
        }));
      }
    } catch (e) {
      // Fallback to mock articles
      matchedArticles = [
        { id: '1', type: 'article', title: 'Best Maldives Resorts 2024', subtitle: '/best-maldives-resorts', icon: FileText, href: '/admin/articles/1/edit' },
        { id: '2', type: 'article', title: 'London Travel Guide', subtitle: '/london-travel-guide', icon: FileText, href: '/admin/articles/2/edit' },
      ].filter(a => a.title.toLowerCase().includes(q));
    }

    // Search sites
    let matchedSites: SearchResult[] = [];
    try {
      const res = await fetch('/api/admin/command-center/sites');
      if (res.ok) {
        const data = await res.json();
        matchedSites = (data.sites || [])
          .filter((site: any) =>
            site.siteName?.toLowerCase().includes(q) ||
            site.domain?.toLowerCase().includes(q)
          )
          .slice(0, 3)
          .map((site: any) => ({
            id: site.siteId,
            type: 'site' as const,
            title: site.siteName,
            subtitle: site.domain,
            icon: Globe,
            href: `/admin/command-center/sites/${site.siteId}`,
          }));
      }
    } catch (e) {
      // Ignore errors
    }

    // Combine results with priority
    const allResults = [
      ...matchedActions.slice(0, 3),
      ...matchedSites,
      ...matchedArticles.slice(0, 5),
      ...matchedPages.slice(0, 5),
    ];

    setResults(allResults);
    setSelectedIndex(0);
    setIsLoading(false);
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query);
    }, 150);
    return () => clearTimeout(timer);
  }, [query, performSearch]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (results[selectedIndex]) {
          handleSelect(results[selectedIndex]);
        }
        break;
      case 'Escape':
        onClose();
        break;
    }
  }, [results, selectedIndex, onClose]);

  // Handle selection
  const handleSelect = (result: SearchResult) => {
    // Save to recent searches
    const newRecent = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
    setRecentSearches(newRecent);
    localStorage.setItem('admin-recent-searches', JSON.stringify(newRecent));

    if (result.action) {
      result.action();
    } else if (result.href) {
      router.push(result.href);
    }
    onClose();
  };

  // Get icon color by type
  const getTypeColor = (type: SearchResult['type']) => {
    switch (type) {
      case 'action': return 'bg-purple-100 text-purple-600';
      case 'site': return 'bg-blue-100 text-blue-600';
      case 'article': return 'bg-green-100 text-green-600';
      case 'page': return 'bg-gray-100 text-gray-600';
      case 'media': return 'bg-amber-100 text-amber-600';
      case 'setting': return 'bg-slate-100 text-slate-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative min-h-screen flex items-start justify-center pt-[15vh] px-4">
        <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Search Input */}
          <div className="flex items-center gap-3 p-4 border-b border-gray-200">
            <Search className="h-5 w-5 text-gray-400 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search articles, sites, pages, or actions..."
              className="flex-1 text-lg outline-none placeholder:text-gray-400"
            />
            <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs text-gray-500">
              <Command className="h-3 w-3" />K
            </kbd>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-lg"
            >
              <X className="h-5 w-5 text-gray-400" />
            </button>
          </div>

          {/* Results */}
          <div className="max-h-[60vh] overflow-y-auto">
            {isLoading && (
              <div className="p-8 text-center text-gray-500">
                <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2" />
                Searching...
              </div>
            )}

            {!isLoading && query && results.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                No results found for "{query}"
              </div>
            )}

            {!isLoading && results.length > 0 && (
              <div className="py-2">
                {results.map((result, index) => (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleSelect(result)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                      index === selectedIndex ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${getTypeColor(result.type)}`}>
                      <result.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{result.title}</div>
                      {result.subtitle && (
                        <div className="text-sm text-gray-500 truncate">{result.subtitle}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-gray-400 capitalize">{result.type}</span>
                      <ArrowRight className="h-4 w-4 text-gray-300" />
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Empty State - Show Quick Actions */}
            {!query && (
              <div className="py-2">
                {recentSearches.length > 0 && (
                  <>
                    <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase">
                      Recent Searches
                    </div>
                    {recentSearches.map((search, i) => (
                      <button
                        key={i}
                        onClick={() => setQuery(search)}
                        className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-gray-50"
                      >
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">{search}</span>
                      </button>
                    ))}
                    <hr className="my-2" />
                  </>
                )}

                <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase">
                  Quick Actions
                </div>
                {QUICK_ACTIONS.slice(0, 5).map((action, index) => (
                  <button
                    key={action.id}
                    onClick={() => handleSelect(action)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                      index === selectedIndex ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${getTypeColor(action.type)}`}>
                      <action.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{action.title}</div>
                      <div className="text-sm text-gray-500">{action.subtitle}</div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-300" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white border rounded">↑</kbd>
                <kbd className="px-1.5 py-0.5 bg-white border rounded">↓</kbd>
                to navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white border rounded">↵</kbd>
                to select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white border rounded">esc</kbd>
                to close
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Hook for using global search
export function useGlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen(prev => !prev),
  };
}

export default GlobalSearch;
