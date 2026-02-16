"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import {
  FileText,
  Plus,
  Search,
  Upload,
  Eye,
  Edit,
  Trash2,
  Share,
  Download,
  Image,
  Video,
  Globe,
  Calendar,
  User,
  TrendingUp,
  CheckCircle,
  Clock,
  AlertCircle,
  Activity,
} from "lucide-react";

const ContentGenerationMonitor = dynamic(
  () => import("@/components/admin/ContentGenerationMonitor"),
  { ssr: false },
);

interface Article {
  id: string;
  title: string;
  titleAr: string;
  slug: string;
  locale: string;
  status: string;
  seoScore: number;
  author: string;
  updatedAt: string;
  tags: string[];
  featuredImage: string | null;
  url: string | null;
}

export default function ContentHub() {
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabFromUrl || "articles");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterLocale, setFilterLocale] = useState("all");
  const [articles, setArticles] = useState<Article[]>([]);
  const [mediaAssets, setMediaAssets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (tabFromUrl) setActiveTab(tabFromUrl);
  }, [tabFromUrl]);

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/content?limit=50");
      if (res.ok) {
        const data = await res.json();
        const posts = data.data || [];
        setArticles(
          posts.map((p: any) => ({
            id: p.id,
            title: p.title_en || "",
            titleAr: p.title_ar || "",
            slug: p.slug,
            locale: p.title_ar && !p.title_en ? "ar" : "en",
            status: p.published ? "published" : "draft",
            seoScore: p.seo_score || 0,
            author: p.author?.name || "Unknown",
            updatedAt: p.updated_at,
            tags: p.tags || [],
            featuredImage: p.featured_image,
            url: p.published ? `/blog/${p.slug}` : null,
          })),
        );
      }
    } catch (error) {
      console.error("Failed to load content:", error);
    }

    try {
      const mediaRes = await fetch("/api/admin/media?limit=50");
      if (mediaRes.ok) {
        const mediaData = await mediaRes.json();
        const assets = mediaData.data || mediaData.assets || [];
        setMediaAssets(
          assets.map((a: any) => ({
            id: a.id,
            filename: a.filename,
            originalName: a.original_name || a.title || a.filename,
            url: a.url,
            fileType: a.file_type || "image",
            mimeType: a.mime_type || "",
            fileSize: a.file_size || 0,
            width: a.width,
            height: a.height,
            altText: a.alt_text,
            tags: a.tags || [],
            createdAt: a.created_at,
          })),
        );
      }
    } catch {
      // Media API may not exist yet
    }

    setIsLoading(false);
  };

  const tabs = [
    { id: "articles", name: "Articles", icon: FileText },
    { id: "generation", name: "Generation Monitor", icon: Activity },
    { id: "media", name: "Media", icon: Image },
    { id: "preview", name: "Social Preview", icon: Share },
    { id: "upload", name: "Upload Content", icon: Upload },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "published":
        return "bg-green-100 text-green-800";
      case "ready":
        return "bg-blue-100 text-blue-800";
      case "review":
        return "bg-yellow-100 text-yellow-800";
      case "draft":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "published":
        return <CheckCircle className="h-4 w-4" />;
      case "ready":
        return <Clock className="h-4 w-4" />;
      case "review":
        return <AlertCircle className="h-4 w-4" />;
      case "draft":
        return <Edit className="h-4 w-4" />;
      default:
        return <Edit className="h-4 w-4" />;
    }
  };

  const filteredArticles = articles.filter((article) => {
    const matchesSearch =
      article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.titleAr.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      filterStatus === "all" || article.status === filterStatus;
    const matchesLocale =
      filterLocale === "all" || article.locale === filterLocale;

    return matchesSearch && matchesStatus && matchesLocale;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900">
            Loading Content...
          </h2>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <FileText className="h-8 w-8 text-blue-500" />
              Content Hub
            </h1>
            <p className="text-gray-600 mt-1">
              Articles, Media, Social Preview, Upload Content
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/admin/editor"
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              <Plus className="h-4 w-4" />
              New Article
            </Link>
            <button className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors">
              <Upload className="h-4 w-4" />
              Upload Media
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "articles" && (
        <div>
          {/* Filters */}
          <div className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search articles..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Statuses</option>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Locale
                </label>
                <select
                  value={filterLocale}
                  onChange={(e) => setFilterLocale(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Locales</option>
                  <option value="en">English</option>
                  <option value="ar">Arabic</option>
                </select>
              </div>
            </div>
          </div>

          {/* Articles Grid */}
          {filteredArticles.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Articles Found
              </h3>
              <p className="text-gray-600">
                Create your first article to get started.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredArticles.map((article) => (
                <div
                  key={article.id}
                  className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <div className="aspect-video bg-gray-200 relative">
                    {article.featuredImage ? (
                      <img
                        src={article.featuredImage}
                        alt={article.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Image className="h-12 w-12 text-gray-400" />
                      </div>
                    )}
                    <div className="absolute top-2 left-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(article.status)}`}
                      >
                        {getStatusIcon(article.status)}
                        {article.status}
                      </span>
                    </div>
                    <div className="absolute top-2 right-2">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          article.locale === "en"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {article.locale.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                      {article.title}
                    </h3>
                    {article.titleAr && article.titleAr !== article.title && (
                      <h4 className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {article.titleAr}
                      </h4>
                    )}

                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                      {article.seoScore > 0 && (
                        <span className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          SEO: {article.seoScore}%
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      {article.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {article.author}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {article.updatedAt
                            ? new Date(article.updatedAt).toLocaleDateString()
                            : "Not updated"}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {article.url && (
                          <a
                            href={article.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-gray-400 hover:text-gray-600"
                            title="View Live"
                          >
                            <Globe className="h-4 w-4" />
                          </a>
                        )}
                        <Link
                          href={`/admin/editor?slug=${article.slug}`}
                          className="p-2 text-gray-400 hover:text-gray-600"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "generation" && <ContentGenerationMonitor />}

      {activeTab === "media" && (
        <div>
          {mediaAssets.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <Image className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Media Assets
              </h3>
              <p className="text-gray-600">
                Upload images and videos to your media library.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {mediaAssets.map((asset: any) => (
                <div
                  key={asset.id}
                  className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <div className="aspect-square bg-gray-200 relative">
                    {asset.fileType === "image" ? (
                      <img
                        src={asset.url}
                        alt={asset.altText || asset.originalName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Video className="h-12 w-12 text-gray-400" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      <span className="px-2 py-1 bg-black bg-opacity-50 text-white text-xs rounded">
                        {asset.fileType}
                      </span>
                    </div>
                  </div>

                  <div className="p-4">
                    <h3 className="text-sm font-medium text-gray-900 mb-2 line-clamp-2">
                      {asset.originalName}
                    </h3>

                    <div className="text-xs text-gray-600 mb-3">
                      {asset.width && asset.height && (
                        <div>
                          {asset.width} x {asset.height}
                        </div>
                      )}
                      {asset.fileSize > 0 && (
                        <div>
                          {(asset.fileSize / 1024 / 1024).toFixed(1)} MB
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-500">
                        {asset.createdAt
                          ? new Date(asset.createdAt).toLocaleDateString()
                          : ""}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          className="p-1 text-gray-400 hover:text-gray-600"
                          title="View"
                        >
                          <Eye className="h-3 w-3" />
                        </button>
                        <button
                          className="p-1 text-gray-400 hover:text-gray-600"
                          title="Download"
                        >
                          <Download className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "preview" && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Social Media Preview
          </h2>
          <p className="text-gray-600">
            Social media preview functionality will be implemented here.
          </p>
        </div>
      )}

      {activeTab === "upload" && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Upload Content
          </h2>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Upload Files
            </h3>
            <p className="text-gray-600 mb-4">
              Drag and drop files here, or click to select files
            </p>
            <button className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors">
              Choose Files
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
