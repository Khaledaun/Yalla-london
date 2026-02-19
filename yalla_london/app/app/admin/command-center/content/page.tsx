"use client";

/**
 * Content Generation Hub
 *
 * Central hub for AI-powered content creation across all sites.
 * Generate articles, edit with AI assistance, and manage content queue.
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  Sparkles,
  Plus,
  Search,
  Filter,
  Clock,
  CheckCircle,
  AlertCircle,
  Edit,
  Eye,
  Trash2,
  Send,
  RefreshCw,
  Globe,
  Wand2,
  BookOpen,
  Loader2,
  ChevronDown,
  Calendar,
  TrendingUp,
  Target,
  Languages,
} from "lucide-react";

interface ContentItem {
  id: string;
  title: string;
  type: "article" | "guide" | "comparison" | "review";
  status: "draft" | "review" | "scheduled" | "published";
  site: string;
  locale: "ar" | "en";
  createdAt: string;
  updatedAt: string;
  scheduledFor: string | null;
  wordCount: number;
  seoScore: number;
  author: "ai" | "human";
}

interface ContentTemplate {
  id: string;
  name: string;
  description: string;
  icon: any;
  color: string;
  prompts: string[];
}

const CONTENT_TEMPLATES: ContentTemplate[] = [
  {
    id: "resort-review",
    name: "Resort Review",
    description: "Comprehensive resort review with scores",
    icon: BookOpen,
    color: "purple",
    prompts: [
      "Write a detailed review of [resort name] including amenities, service quality, and value for money",
    ],
  },
  {
    id: "comparison",
    name: "Resort Comparison",
    description: "Compare multiple resorts side by side",
    icon: Target,
    color: "blue",
    prompts: [
      "Compare [resort 1] and [resort 2] for families/honeymoon/budget travelers",
    ],
  },
  {
    id: "travel-guide",
    name: "Travel Guide",
    description: "Destination travel guide with tips",
    icon: Globe,
    color: "green",
    prompts: [
      "Write a complete travel guide for [destination] covering best time to visit, activities, and tips",
    ],
  },
  {
    id: "listicle",
    name: "Top 10 List",
    description: "Ranked list article",
    icon: TrendingUp,
    color: "amber",
    prompts: [
      "Write a top 10 list of [topic] with detailed descriptions for each item",
    ],
  },
];

const CONTENT_TYPES = [
  { id: "all", name: "All Content" },
  { id: "article", name: "Articles" },
  { id: "guide", name: "Guides" },
  { id: "comparison", name: "Comparisons" },
  { id: "review", name: "Reviews" },
];

const STATUS_FILTERS = [
  { id: "all", name: "All Status", color: "gray" },
  { id: "draft", name: "Draft", color: "gray" },
  { id: "review", name: "In Review", color: "yellow" },
  { id: "scheduled", name: "Scheduled", color: "blue" },
  { id: "published", name: "Published", color: "green" },
];

export default function ContentHubPage() {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showGenerator, setShowGenerator] = useState(false);
  const [generatorPrompt, setGeneratorPrompt] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [selectedSite, setSelectedSite] = useState("arabaldives");
  const [selectedLocale, setSelectedLocale] = useState<"ar" | "en">("ar");
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    loadContent();
  }, [typeFilter, statusFilter]);

  const loadContent = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/admin/command-center/content?type=${typeFilter}&status=${statusFilter}`,
      );
      if (response.ok) {
        const data = await response.json();
        setContent(data.content || []);
      } else {
        setContent([]);
      }
    } catch (error) {
      setContent([]);
    }
    setIsLoading(false);
  };

  const generateContent = async () => {
    if (!generatorPrompt && !selectedTemplate) return;

    setIsGenerating(true);
    try {
      const response = await fetch(
        "/api/admin/command-center/content/generate",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: generatorPrompt,
            template: selectedTemplate,
            site: selectedSite,
            locale: selectedLocale,
          }),
        },
      );

      // Simulate generation time
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Refresh content list
      loadContent();
      setShowGenerator(false);
      setGeneratorPrompt("");
      setSelectedTemplate(null);
    } catch (error) {
      console.error("Failed to generate content:", error);
    }
    setIsGenerating(false);
  };

  const filteredContent = content.filter((item) => {
    if (
      searchQuery &&
      !item.title.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const getStatusBadge = (status: ContentItem["status"]) => {
    const styles = {
      draft: "bg-gray-100 text-gray-700",
      review: "bg-yellow-100 text-yellow-700",
      scheduled: "bg-blue-100 text-blue-700",
      published: "bg-green-100 text-green-700",
    };
    return styles[status];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/admin/command-center"
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="font-semibold text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-purple-600" />
                  Content Hub
                </h1>
                <p className="text-sm text-gray-500">
                  AI-powered content creation and management
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowGenerator(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg hover:opacity-90"
              >
                <Sparkles className="h-4 w-4" />
                Generate with AI
              </button>
              <Link
                href="/admin/command-center/content/calendar"
                className="flex items-center gap-2 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50"
              >
                <Calendar className="h-4 w-4" />
                Content Calendar
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-2xl font-bold text-purple-600">
              {content.filter((c) => c.author === "ai").length}
            </div>
            <div className="text-sm text-gray-500">AI Generated</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-2xl font-bold text-blue-600">
              {content.filter((c) => c.status === "scheduled").length}
            </div>
            <div className="text-sm text-gray-500">Scheduled</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-2xl font-bold text-green-600">
              {content.filter((c) => c.status === "published").length}
            </div>
            <div className="text-sm text-gray-500">Published</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-2xl font-bold text-amber-600">
              {content.filter((c) => c.status === "draft").length}
            </div>
            <div className="text-sm text-gray-500">Drafts</div>
          </div>
        </div>

        {/* AI Generator Modal */}
        {showGenerator && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Wand2 className="h-6 w-6 text-purple-600" />
                    AI Content Generator
                  </h2>
                  <button
                    onClick={() => setShowGenerator(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <span className="sr-only">Close</span>×
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Site & Locale Selection */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Target Site
                    </label>
                    <select
                      value={selectedSite}
                      onChange={(e) => setSelectedSite(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="yalla-london">Yalla London</option>
                      <option value="arabaldives">Arabaldives</option>
                      <option value="french-riviera">Yalla Riviera</option>
                      <option value="istanbul">Yalla Istanbul</option>
                      <option value="thailand">Yalla Thailand</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Language
                    </label>
                    <select
                      value={selectedLocale}
                      onChange={(e) =>
                        setSelectedLocale(e.target.value as "ar" | "en")
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="ar">Arabic (العربية)</option>
                      <option value="en">English</option>
                    </select>
                  </div>
                </div>

                {/* Templates */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Choose a Template
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {CONTENT_TEMPLATES.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => {
                          setSelectedTemplate(template.id);
                          setGeneratorPrompt(template.prompts[0]);
                        }}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${
                          selectedTemplate === template.id
                            ? "border-purple-500 bg-purple-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <template.icon
                          className={`h-6 w-6 mb-2 text-${template.color}-600`}
                        />
                        <h3 className="font-medium">{template.name}</h3>
                        <p className="text-sm text-gray-500">
                          {template.description}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Prompt */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Sparkles className="h-4 w-4 inline mr-1 text-purple-500" />
                    Describe what you want to write
                  </label>
                  <textarea
                    value={generatorPrompt}
                    onChange={(e) => setGeneratorPrompt(e.target.value)}
                    placeholder="Example: Write a detailed review of Soneva Fushi resort, focusing on their eco-friendly practices, dining options, and suitability for families with young children..."
                    className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  />
                </div>

                {/* Advanced Options */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium mb-3">Advanced Options</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-500">
                        Target Word Count
                      </label>
                      <input
                        type="number"
                        defaultValue={1500}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">
                        Target Keyword
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., best maldives resorts"
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={() => setShowGenerator(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={generateContent}
                  disabled={isGenerating || !generatorPrompt}
                  className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2 rounded-lg hover:opacity-90 disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Generate Content
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search content..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              {CONTENT_TYPES.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setTypeFilter(type.id)}
                  className={`px-3 py-1 rounded-full text-sm ${
                    typeFilter === type.id
                      ? "bg-purple-100 text-purple-700"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {type.name}
                </button>
              ))}
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
            >
              {STATUS_FILTERS.map((status) => (
                <option key={status.id} value={status.id}>
                  {status.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Content List */}
        {isLoading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-4 animate-pulse">
                  <div className="h-5 bg-gray-200 rounded w-1/3"></div>
                  <div className="h-5 bg-gray-200 rounded w-1/6"></div>
                  <div className="h-5 bg-gray-200 rounded w-1/6"></div>
                  <div className="h-5 bg-gray-200 rounded w-1/6"></div>
                </div>
              ))}
            </div>
          </div>
        ) : filteredContent.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 text-center py-12">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No content found
            </h3>
            <p className="text-gray-500 mb-4">
              {searchQuery
                ? "Try adjusting your search or filters"
                : "Generate your first article with AI to get started"}
            </p>
            <button
              onClick={() => setShowGenerator(true)}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg hover:opacity-90"
            >
              <Sparkles className="h-4 w-4" />
              Generate with AI
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">
                      Title
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">
                      Type
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">
                      Site
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">
                      Status
                    </th>
                    <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">
                      SEO
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">
                      Updated
                    </th>
                    <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredContent.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {item.author === "ai" && (
                            <Sparkles className="h-4 w-4 text-purple-500" />
                          )}
                          <div>
                            <div className="font-medium">{item.title}</div>
                            <div className="text-sm text-gray-500">
                              {item.wordCount.toLocaleString()} words
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 capitalize text-sm">
                        {item.type}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">{item.site}</span>
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded ${
                              item.locale === "ar"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {item.locale.toUpperCase()}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${getStatusBadge(item.status)}`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div
                          className={`inline-flex items-center justify-center w-10 h-10 rounded-full font-medium text-sm ${
                            item.seoScore >= 80
                              ? "bg-green-100 text-green-700"
                              : item.seoScore >= 60
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-red-100 text-red-700"
                          }`}
                        >
                          {item.seoScore}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {item.updatedAt}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            className="p-1 hover:bg-gray-100 rounded"
                            title="Edit"
                            onClick={() => { window.location.href = `/admin/editor?id=${item.id}`; }}
                          >
                            <Edit className="h-4 w-4 text-gray-500" />
                          </button>
                          <button
                            className="p-1 hover:bg-gray-100 rounded"
                            title="Preview"
                            onClick={() => { window.open(`/admin/editor?id=${item.id}&preview=true`, '_blank'); }}
                          >
                            <Eye className="h-4 w-4 text-gray-500" />
                          </button>
                          <button
                            className="p-1 hover:bg-gray-100 rounded"
                            title="Delete"
                            onClick={async () => {
                              if (!confirm(`Delete "${item.title}"?`)) return;
                              const res = await fetch(`/api/admin/command-center/content?id=${item.id}`, { method: 'DELETE' });
                              if (res.ok) {
                                setContent(prev => prev.filter(c => c.id !== item.id));
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-gray-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
