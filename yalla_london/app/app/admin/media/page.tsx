"use client";

import React, { useState, useEffect } from "react";
import NextImage from "next/image";
import {
  AdminCard,
  AdminPageHeader,
  AdminButton,
  AdminStatusBadge,
  AdminLoadingState,
  AdminEmptyState,
  AdminKPICard,
  AdminSectionLabel,
  AdminTabs,
} from "@/components/admin/admin-ui";
import {
  Upload,
  Image,
  Video,
  File,
  Search,
  Filter,
  Grid,
  List,
  Trash2,
  Download,
  Eye,
  Copy,
  Plus,
  Folder,
  FolderOpen,
  X,
  Check,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

interface MediaFile {
  id: string;
  name: string;
  type: "image" | "video" | "document";
  url: string;
  thumbnail?: string;
  size: number;
  uploadedAt: string;
  alt?: string;
  description?: string;
  tags: string[];
  folder: string;
  width?: number | null;
  height?: number | null;
  mimeType?: string;
  fileType?: string;
  format?: string;
  category?: string;
}

export default function MediaLibraryPage() {
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<MediaFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFolder, setSelectedFolder] = useState("All Files");
  const [filterType, setFilterType] = useState<"all" | "image" | "video" | "document">("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [isSeedingCanva, setIsSeedingCanva] = useState(false);
  const [seedResult, setSeedResult] = useState<{ success: boolean; message: string; created?: number; skipped?: number; failed?: number; total?: number; errors?: string[] } | null>(null);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);

  // Compute folders dynamically from loaded media files
  const folders = [
    { name: "All Files", count: mediaFiles.length },
    ...Array.from(new Set(mediaFiles.map((f) => f.folder))).map(
      (folderName) => ({
        name: folderName,
        count: mediaFiles.filter((f) => f.folder === folderName).length,
      }),
    ),
  ];

  useEffect(() => {
    loadMediaFiles();
  }, []);

  const loadMediaFiles = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/media");
      if (res.ok) {
        const data = await res.json();
        const raw = data.files || data.data || [];
        // Map API response to MediaFile interface
        const mapped: MediaFile[] = raw.map((f: Record<string, unknown>) => {
          const mime = (f.mimeType || f.mime_type || "") as string;
          const detectedType = mime.startsWith("image/")
            ? "image"
            : mime.startsWith("video/")
              ? "video"
              : "document";
          const origName = (f.originalName || f.original_name || f.filename || f.name || "") as string;
          const ext = origName.split(".").pop()?.toLowerCase() || "";
          return {
            id: String(f.id || ""),
            name: origName,
            type: detectedType as "image" | "video" | "document",
            url: (f.url || "") as string,
            thumbnail: (f.thumbnailUrl || f.thumbnail || f.url || "") as string,
            size: (f.size || f.fileSize || 0) as number,
            uploadedAt: (f.createdAt || f.created_at || f.uploadedAt || "") as string,
            alt: (f.altText || f.alt_text || f.alt || "") as string,
            description: (f.description || "") as string,
            tags: (f.tags || []) as string[],
            folder: (f.folder || "uploads") as string,
            width: (f.width ?? null) as number | null,
            height: (f.height ?? null) as number | null,
            mimeType: mime,
            fileType: (f.fileType || f.file_type || detectedType) as string,
            format: ext,
            category: (f.category || "") as string,
          };
        });
        setMediaFiles(mapped);
      } else {
        setMediaFiles([]);
      }
    } catch (err) {
      console.warn("[media-load] Failed to load media:", err);
      setMediaFiles([]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    let filtered = mediaFiles;

    // Filter by folder
    if (selectedFolder !== "All Files") {
      filtered = filtered.filter((file) => file.folder === selectedFolder);
    }

    // Filter by file type
    if (filterType !== "all") {
      filtered = filtered.filter((file) => file.type === filterType);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (file) =>
          file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          file.tags.some((tag) =>
            tag.toLowerCase().includes(searchTerm.toLowerCase()),
          ) ||
          file.alt?.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    setFilteredFiles(filtered);
  }, [mediaFiles, selectedFolder, searchTerm, filterType]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleFileSelect = (fileId: string) => {
    setSelectedFiles((prev) =>
      prev.includes(fileId)
        ? prev.filter((id) => id !== fileId)
        : [...prev, fileId],
    );
  };

  const handleSelectAll = () => {
    if (selectedFiles.length === filteredFiles.length) {
      setSelectedFiles([]);
    } else {
      setSelectedFiles(filteredFiles.map((file) => file.id));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedFiles.length === 0) {
      toast.error("No files selected");
      return;
    }

    try {
      const res = await fetch("/api/admin/media", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedFiles }),
      });

      if (res.ok) {
        setMediaFiles((prev) =>
          prev.filter((file) => !selectedFiles.includes(file.id)),
        );
        toast.success(`${selectedFiles.length} file(s) deleted`);
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to delete files");
      }
    } catch {
      toast.error("Failed to delete files");
    }
    setSelectedFiles([]);
  };

  const handleFileUpload = async (files: FileList) => {
    setIsUploading(true);
    setUploadProgress(0);
    setShowUploadModal(false);
    setUploadErrors([]);

    let successCount = 0;
    let failCount = 0;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress(((i + 0.5) / files.length) * 100);

        try {
          // Upload file to admin upload API (saves to disk + database)
          const formData = new FormData();
          formData.append("file", file);
          formData.append("type", "media");
          if (selectedFolder !== "All Files") {
            formData.append("folder", selectedFolder);
          }

          const res = await fetch("/api/admin/media/upload", {
            method: "POST",
            body: formData,
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => ({ error: "Upload failed" }));
            throw new Error(errData.error || `Upload failed (${res.status})`);
          }

          const result = await res.json();
          // Response has fields at result.data.* (camelCase)
          const d = result.data || result;
          const detectedType = file.type.startsWith("image/")
            ? "image"
            : file.type.startsWith("video/")
              ? "video"
              : "document";
          const ext = file.name.split(".").pop()?.toLowerCase() || "";

          // Add uploaded file to the library view
          const newFile: MediaFile = {
            id: (d.id || result.id || "").toString() || Date.now().toString() + i,
            name: d.originalName || d.original_name || file.name,
            type: detectedType,
            url: d.url || "",
            thumbnail: detectedType === "image" ? (d.url || "") : undefined,
            size: d.size || d.fileSize || d.file_size || file.size,
            uploadedAt: d.createdAt || d.created_at || new Date().toISOString(),
            tags: d.tags || [],
            folder: d.folder || (selectedFolder === "All Files" ? "uploads" : selectedFolder),
            width: d.width ?? null,
            height: d.height ?? null,
            mimeType: d.mimeType || d.mime_type || file.type,
            fileType: d.fileType || d.file_type || detectedType,
            format: d.format || ext,
            category: d.category || "",
          };

          setMediaFiles((prev) => [newFile, ...prev]);
          successCount++;
        } catch (fileErr) {
          const reason = fileErr instanceof Error ? fileErr.message : "Unknown error";
          console.warn(`[media-upload] Failed to upload ${file.name}:`, fileErr);
          setUploadErrors((prev) => [...prev, `${file.name}: ${reason}`]);
          failCount++;
        }

        setUploadProgress(((i + 1) / files.length) * 100);
      }

      if (successCount > 0 && failCount === 0) {
        toast.success(`${successCount} file(s) uploaded successfully`);
      } else if (successCount > 0 && failCount > 0) {
        toast.warning(`${successCount} uploaded, ${failCount} failed`);
      } else {
        toast.error("All uploads failed — check server logs for details");
      }
    } catch (error) {
      console.warn("[media-upload] Upload error:", error);
      toast.error("Failed to upload files");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("URL copied to clipboard");
  };

  const imageCount = mediaFiles.filter((f) => f.type === "image").length;
  const videoCount = mediaFiles.filter((f) => f.type === "video").length;
  const docCount = mediaFiles.filter((f) => f.type === "document").length;
  const totalSize = mediaFiles.reduce((sum, f) => sum + f.size, 0);

  return (
    <div className="admin-page p-4 md:p-6">
      {/* Header */}
      <AdminPageHeader
        title="Media Library"
        subtitle="Images and assets"
        action={
          <AdminButton variant="primary" size="md" onClick={() => setShowUploadModal(true)}>
            <Upload className="h-4 w-4" />
            Upload Files
          </AdminButton>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <AdminKPICard value={mediaFiles.length} label="Total Files" color="#1C1917" />
        <AdminKPICard value={imageCount} label="Images" color="#3B7EA1" />
        <AdminKPICard value={videoCount} label="Videos" color="#7C3AED" />
        <AdminKPICard value={formatFileSize(totalSize)} label="Total Size" color="#C49A2A" />
      </div>

      {/* Seed Canva Videos — shown when no videos exist */}
      {!isLoading && videoCount === 0 && (
        <AdminCard className="mb-6">
          <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div
              className="p-3 rounded-xl shrink-0"
              style={{ backgroundColor: 'rgba(124,58,237,0.08)' }}
            >
              <Video className="h-6 w-6" style={{ color: '#7C3AED' }} />
            </div>
            <div className="flex-1 min-w-0">
              <h3
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: 15,
                  color: '#1C1917',
                  marginBottom: 4,
                }}
              >
                Seed Canva Video Library
              </h3>
              <p style={{ fontFamily: 'var(--font-system)', fontSize: 12, color: '#78716C' }}>
                Import your purchased Canva video packs into the media library: 60 luxury travel videos, 50 Instagram reels, 300+ beach clips, and more.
              </p>
            </div>
            <AdminButton
              variant="primary"
              size="md"
              disabled={isSeedingCanva}
              onClick={async () => {
                setIsSeedingCanva(true);
                setSeedResult(null);
                try {
                  const CANVA_VIDEOS = [
                    { canvaId: "DAHD7UYNWZ0", title: "60 Luxury Travel Videos (Pack 1)", thumbnail: "https://design.canva.ai/B9GChi5dxotrwCs", editUrl: "https://www.canva.com/d/f8-ScUoQn9W8sLA", viewUrl: "https://www.canva.com/d/84B3Csj-w_7sV3G", pageCount: 61 },
                    { canvaId: "DAGwg1bEguM", title: "60 Luxury Travel Videos (Pack 2)", thumbnail: "https://design.canva.ai/FkClqoobngdoa63", editUrl: "https://www.canva.com/d/Aqyh-7U_DKhTFUb", viewUrl: "https://www.canva.com/d/jreOEbmGSSgS35_", pageCount: 61 },
                    { canvaId: "DAHD7W0opAg", title: "50 Travel Aesthetic Instagram Reels (Pack 1)", thumbnail: "https://design.canva.ai/3jGSXI_TouJZ79N", editUrl: "https://www.canva.com/d/dp2erNTJ3Mz0hCG", viewUrl: "https://www.canva.com/d/W0qGNWHJgiPCqzd", pageCount: 50 },
                    { canvaId: "DAGwg3CI_zM", title: "50 Travel Aesthetic Instagram Reels (Pack 2)", thumbnail: "https://design.canva.ai/1KSA1wP1F-lo1DF", editUrl: "https://www.canva.com/d/ZATJDf5pKVtlWfY", viewUrl: "https://www.canva.com/d/-SbWgWCcI1_SjyM", pageCount: 50 },
                    { canvaId: "DAHD7Yn_DTs", title: "300+ Beach Clips (Pack 1)", thumbnail: "https://design.canva.ai/YXrDWG8E5pTD8d2", editUrl: "https://www.canva.com/d/ZolJ4JlOaBIvHsK", viewUrl: "https://www.canva.com/d/szB4QPUUDT37zu3", pageCount: 314 },
                    { canvaId: "DAGM4P7gK-s", title: "300+ Beach Clips (Pack 2)", thumbnail: "https://design.canva.ai/dsYzuZsif5ZLmy4", editUrl: "https://www.canva.com/d/m5Q_Dq6scW5CZp8", viewUrl: "https://www.canva.com/d/O12MWYHJGkyhW23", pageCount: 314 },
                    { canvaId: "DAHD7YqkCZ4", title: "Faceless Instagram eBook & Template", thumbnail: "https://design.canva.ai/pIuSPP7tglXZwIS", editUrl: "https://www.canva.com/d/n-0wtraleHtUu8C", viewUrl: "https://www.canva.com/d/d_YcDDSLVAOWGdT", pageCount: 52 },
                    { canvaId: "DAGITnnkzVQ", title: "10 Years in Business (Mobile Video)", thumbnail: "https://design.canva.ai/tSK3phS_ITNbsDA", editUrl: "https://www.canva.com/d/z84AU6qyma0vv-l", viewUrl: "https://www.canva.com/d/BItvVfF6PXkpEob", pageCount: 8 },
                  ];

                  const res = await fetch("/api/admin/media", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "seed_from_canva", items: CANVA_VIDEOS, folder: "canva-videos" }),
                  });
                  if (!res.ok) {
                    const errText = await res.text().catch(() => "Unknown error");
                    const errMsg = `Seed failed (HTTP ${res.status}): ${errText.slice(0, 200)}`;
                    setSeedResult({ success: false, message: errMsg });
                    throw new Error(errMsg);
                  }
                  const data = await res.json();
                  setSeedResult({
                    success: data.success !== false,
                    message: data.message || "Seeded successfully",
                    created: data.created,
                    skipped: data.skipped,
                    failed: data.failed,
                    total: data.total,
                    errors: data.errors,
                  });
                  if (data.failed > 0) {
                    toast.warning(`${data.created} seeded, ${data.failed} failed`);
                  } else if (data.created > 0) {
                    toast.success(`${data.created} packs seeded`);
                  } else {
                    toast.info("All packs already seeded");
                  }
                  await loadMediaFiles();
                } catch (err) {
                  console.error("[media-seed]", err);
                  if (!seedResult) {
                    setSeedResult({ success: false, message: err instanceof Error ? err.message : "Failed to seed Canva videos — check browser console for details" });
                  }
                  toast.error(err instanceof Error ? err.message : "Failed to seed Canva videos");
                } finally {
                  setIsSeedingCanva(false);
                }
              }}
            >
              {isSeedingCanva ? (
                <>
                  <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Seeding...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Seed 8 Canva Packs
                </>
              )}
            </AdminButton>
          </div>
          {/* Seed result feedback */}
          {seedResult && (
            <div className="px-5 pb-4 pt-0" style={{ fontFamily: 'var(--font-system)', fontSize: 13 }}>
              {/* Summary line */}
              <div style={{ color: seedResult.success ? '#16A34A' : (seedResult.failed ? '#D97706' : '#DC2626'), fontWeight: 600, marginBottom: 4 }}>
                {seedResult.success && !seedResult.failed ? (
                  <>Done: {seedResult.created} seeded, {seedResult.skipped} already existed</>
                ) : seedResult.failed ? (
                  <>Partial: {seedResult.created} seeded, {seedResult.skipped} skipped, {seedResult.failed} failed</>
                ) : (
                  <>Error: {seedResult.message}</>
                )}
              </div>
              {/* Per-item error details */}
              {seedResult.errors && seedResult.errors.length > 0 && (
                <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                  {seedResult.errors.map((err, i) => (
                    <div
                      key={i}
                      className="px-3 py-1.5 rounded-md"
                      style={{ backgroundColor: 'rgba(220,38,38,0.06)', fontSize: 11, color: '#991B1B' }}
                    >
                      {err}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </AdminCard>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar - Folders */}
        <div className="lg:col-span-1">
          <AdminCard>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <FolderOpen className="h-4 w-4" style={{ color: '#78716C' }} />
                <AdminSectionLabel>Folders</AdminSectionLabel>
              </div>
              <div className="space-y-1.5">
                {folders.map((folder) => (
                  <button
                    key={folder.name}
                    onClick={() => setSelectedFolder(folder.name)}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all"
                    style={{
                      fontFamily: 'var(--font-system)',
                      fontSize: 12,
                      backgroundColor: selectedFolder === folder.name
                        ? 'rgba(200,50,43,0.06)'
                        : 'transparent',
                      color: selectedFolder === folder.name ? '#C8322B' : '#44403C',
                      border: selectedFolder === folder.name
                        ? '1px solid rgba(200,50,43,0.15)'
                        : '1px solid transparent',
                    }}
                  >
                    <div className="flex items-center gap-2">
                      {selectedFolder === folder.name ? (
                        <FolderOpen className="h-4 w-4" />
                      ) : (
                        <Folder className="h-4 w-4" style={{ color: '#A8A29E' }} />
                      )}
                      <span className="capitalize">{folder.name}</span>
                    </div>
                    <AdminStatusBadge
                      status={selectedFolder === folder.name ? "active" : "inactive"}
                      label={String(folder.count)}
                    />
                  </button>
                ))}
              </div>
            </div>
          </AdminCard>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {/* Search and Controls */}
          <AdminCard className="mb-4">
            <div className="p-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: '#A8A29E' }} />
                    <input
                      placeholder="Search media files..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="admin-input pl-10 w-full"
                      style={{ fontFamily: 'var(--font-system)', fontSize: 12 }}
                    />
                  </div>
                  <button
                    className={`admin-filter-pill ${filterType !== "all" ? "active" : ""}`}
                    onClick={() => {
                      const types: Array<"all" | "image" | "video" | "document"> = ["all", "image", "video", "document"];
                      const idx = types.indexOf(filterType);
                      setFilterType(types[(idx + 1) % types.length]);
                    }}
                  >
                    <Filter className="h-3.5 w-3.5" />
                    {filterType === "all" ? "Filter" : filterType.charAt(0).toUpperCase() + filterType.slice(1) + "s"}
                  </button>
                </div>

                <div className="flex items-center gap-1 rounded-lg" style={{ border: '1px solid rgba(214,208,196,0.8)' }}>
                  <AdminButton
                    variant={viewMode === "grid" ? "primary" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                  >
                    <Grid className="h-3.5 w-3.5" />
                  </AdminButton>
                  <AdminButton
                    variant={viewMode === "list" ? "primary" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("list")}
                  >
                    <List className="h-3.5 w-3.5" />
                  </AdminButton>
                </div>
              </div>

              {selectedFiles.length > 0 && (
                <div
                  className="mt-4 p-3 rounded-xl flex items-center justify-between flex-wrap gap-2"
                  style={{
                    backgroundColor: 'rgba(59,126,161,0.06)',
                    border: '1px solid rgba(59,126,161,0.15)',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-system)',
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#1e5a7a',
                    }}
                  >
                    {selectedFiles.length} file(s) selected
                  </span>
                  <div className="flex items-center gap-2">
                    <AdminButton
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        const toDownload = mediaFiles.filter((f) => selectedFiles.includes(f.id));
                        toDownload.forEach((f) => {
                          const a = document.createElement('a');
                          a.href = f.url;
                          a.download = f.name || 'media';
                          a.target = '_blank';
                          a.click();
                        });
                      }}
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download
                    </AdminButton>
                    <AdminButton
                      variant="danger"
                      size="sm"
                      onClick={handleDeleteSelected}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </AdminButton>
                  </div>
                </div>
              )}
            </div>
          </AdminCard>

          {/* Upload Progress */}
          {isUploading && (
            <AdminCard className="mb-4">
              <div className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span
                        style={{
                          fontFamily: 'var(--font-system)',
                          fontSize: 11,
                          fontWeight: 600,
                          color: '#1C1917',
                        }}
                      >
                        Uploading files...
                      </span>
                      <span
                        style={{
                          fontFamily: 'var(--font-system)',
                          fontSize: 11,
                          color: '#78716C',
                        }}
                      >
                        {Math.round(uploadProgress)}%
                      </span>
                    </div>
                    <div
                      className="w-full rounded-full h-2"
                      style={{ backgroundColor: 'rgba(214,208,196,0.4)' }}
                    >
                      <div
                        className="h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${uploadProgress}%`,
                          backgroundColor: '#C8322B',
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </AdminCard>
          )}

          {/* Upload Error Details */}
          {!isUploading && uploadErrors.length > 0 && (
            <AdminCard className="mb-4">
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: '#DC2626' }}>
                    {uploadErrors.length} Upload{uploadErrors.length !== 1 ? 's' : ''} Failed
                  </span>
                  <button
                    onClick={() => setUploadErrors([])}
                    style={{ fontFamily: 'var(--font-system)', fontSize: 11, color: '#78716C' }}
                  >
                    Dismiss
                  </button>
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {uploadErrors.map((err, i) => (
                    <div
                      key={i}
                      className="px-3 py-2 rounded-lg"
                      style={{
                        backgroundColor: 'rgba(220,38,38,0.06)',
                        fontFamily: 'var(--font-system)',
                        fontSize: 12,
                        color: '#991B1B',
                      }}
                    >
                      {err}
                    </div>
                  ))}
                </div>
              </div>
            </AdminCard>
          )}

          {/* Media Files */}
          <div
            className={`${
              viewMode === "grid"
                ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3"
                : "space-y-2"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {isLoading ? (
              <div className="col-span-full">
                <AdminLoadingState label="Loading media..." />
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="col-span-full">
                <AdminEmptyState
                  icon={Folder}
                  title="No files found"
                  description={
                    searchTerm
                      ? "Try adjusting your search terms"
                      : "Upload some files to get started"
                  }
                  action={
                    <AdminButton variant="primary" onClick={() => setShowUploadModal(true)}>
                      <Upload className="h-4 w-4" />
                      Upload Files
                    </AdminButton>
                  }
                />
              </div>
            ) : (
              filteredFiles.map((file) => (
                <AdminCard
                  key={file.id}
                  className={`cursor-pointer transition-all duration-200 ${
                    viewMode === "list" ? "flex items-center" : ""
                  }`}
                  elevated={selectedFiles.includes(file.id)}
                >
                  <div
                    onClick={() => handleFileSelect(file.id)}
                    style={
                      selectedFiles.includes(file.id)
                        ? { outline: '2px solid #C8322B', borderRadius: 12, outlineOffset: -2 }
                        : undefined
                    }
                    className={viewMode === "list" ? "flex items-center w-full" : ""}
                  >
                    {viewMode === "grid" ? (
                      <div className="p-3">
                        <div className="relative">
                          {file.type === "image" ? (
                            <div
                              className="aspect-square rounded-lg overflow-hidden mb-3"
                              style={{ backgroundColor: '#FAF8F4' }}
                            >
                              <NextImage
                                src={file.thumbnail || file.url}
                                alt={file.alt || file.name}
                                width={0}
                                height={0}
                                sizes="100vw"
                                className="w-full h-full object-cover"
                                style={{ width: '100%', height: '100%' }}
                                unoptimized
                              />
                            </div>
                          ) : file.type === "video" ? (
                            <div
                              className="aspect-square rounded-lg overflow-hidden mb-3 flex items-center justify-center"
                              style={{ backgroundColor: '#FAF8F4' }}
                            >
                              <Video className="h-8 w-8" style={{ color: '#A8A29E' }} />
                            </div>
                          ) : (
                            <div
                              className="aspect-square rounded-lg overflow-hidden mb-3 flex items-center justify-center"
                              style={{ backgroundColor: '#FAF8F4' }}
                            >
                              <File className="h-8 w-8" style={{ color: '#A8A29E' }} />
                            </div>
                          )}

                          {selectedFiles.includes(file.id) && (
                            <div
                              className="absolute top-2 right-2 rounded-full p-1"
                              style={{ backgroundColor: '#C8322B', color: '#FAF8F4' }}
                            >
                              <Check className="h-3 w-3" />
                            </div>
                          )}
                        </div>

                        <div className="space-y-1">
                          <h4
                            className="truncate"
                            title={file.name}
                            style={{
                              fontFamily: 'var(--font-display)',
                              fontSize: 12,
                              fontWeight: 600,
                              color: '#1C1917',
                            }}
                          >
                            {file.name}
                          </h4>
                          <p style={{ fontFamily: 'var(--font-system)', fontSize: 10, color: '#78716C' }}>
                            {formatFileSize(file.size)}
                            {file.format ? ` \u00B7 ${file.format.toUpperCase()}` : ""}
                          </p>
                          {file.width && file.height ? (
                            <p style={{ fontFamily: 'var(--font-system)', fontSize: 10, color: '#78716C' }}>
                              {file.width} × {file.height}px
                            </p>
                          ) : null}
                          {file.category ? (
                            <p style={{ fontFamily: 'var(--font-system)', fontSize: 10, color: '#A8A29E', textTransform: 'capitalize' }}>
                              {file.category}
                            </p>
                          ) : null}
                          <p style={{ fontFamily: 'var(--font-system)', fontSize: 10, color: '#A8A29E' }}>
                            {formatDate(file.uploadedAt)}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-4 w-full p-3">
                        <div className="flex-shrink-0">
                          {file.type === "image" ? (
                            <div
                              className="w-12 h-12 rounded-lg overflow-hidden"
                              style={{ backgroundColor: '#FAF8F4' }}
                            >
                              <NextImage
                                src={file.thumbnail || file.url}
                                alt={file.alt || file.name}
                                width={48}
                                height={48}
                                className="w-full h-full object-cover"
                                unoptimized
                              />
                            </div>
                          ) : file.type === "video" ? (
                            <div
                              className="w-12 h-12 rounded-lg flex items-center justify-center"
                              style={{ backgroundColor: '#FAF8F4' }}
                            >
                              <Video className="h-6 w-6" style={{ color: '#A8A29E' }} />
                            </div>
                          ) : (
                            <div
                              className="w-12 h-12 rounded-lg flex items-center justify-center"
                              style={{ backgroundColor: '#FAF8F4' }}
                            >
                              <File className="h-6 w-6" style={{ color: '#A8A29E' }} />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4
                            className="truncate"
                            style={{
                              fontFamily: 'var(--font-display)',
                              fontSize: 13,
                              fontWeight: 600,
                              color: '#1C1917',
                            }}
                          >
                            {file.name}
                          </h4>
                          <p style={{ fontFamily: 'var(--font-system)', fontSize: 11, color: '#78716C' }}>
                            {formatFileSize(file.size)}
                            {file.format ? ` \u00B7 ${file.format.toUpperCase()}` : ""}
                            {file.width && file.height ? ` · ${file.width}×${file.height}px` : ""}
                            {file.category ? ` \u00B7 ${file.category}` : ""}
                            {" \u00B7 "}
                            {formatDate(file.uploadedAt)}
                          </p>
                          {file.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {file.tags.slice(0, 3).map((tag) => (
                                <AdminStatusBadge
                                  key={tag}
                                  status="inactive"
                                  label={tag}
                                />
                              ))}
                              {file.tags.length > 3 && (
                                <AdminStatusBadge
                                  status="inactive"
                                  label={`+${file.tags.length - 3}`}
                                />
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <AdminButton
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              copyToClipboard(file.url);
                            }}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </AdminButton>
                          <AdminButton
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              window.open(file.url, "_blank");
                            }}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </AdminButton>
                        </div>
                      </div>
                    )}
                  </div>
                </AdminCard>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ backgroundColor: 'rgba(28,25,23,0.5)' }}
        >
          <AdminCard elevated className="w-full max-w-md mx-4">
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 800,
                    fontSize: 18,
                    color: '#1C1917',
                  }}
                >
                  Upload Files
                </h2>
                <AdminButton
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowUploadModal(false)}
                >
                  <X className="h-4 w-4" />
                </AdminButton>
              </div>
              <div
                className="rounded-xl p-8 text-center transition-all"
                style={{
                  border: `2px dashed ${dragActive ? '#C8322B' : 'rgba(214,208,196,0.8)'}`,
                  backgroundColor: dragActive ? 'rgba(200,50,43,0.04)' : '#FAF8F4',
                }}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <Upload className="h-12 w-12 mx-auto mb-4" style={{ color: '#A8A29E' }} />
                <h3
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    fontSize: 15,
                    color: '#1C1917',
                    marginBottom: 8,
                  }}
                >
                  Drop files here or click to browse
                </h3>
                <p
                  style={{
                    fontFamily: 'var(--font-system)',
                    fontSize: 11,
                    color: '#78716C',
                    marginBottom: 16,
                  }}
                >
                  Supports images, videos, and documents
                </p>
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*,.pdf,.doc,.docx"
                  onChange={(e) =>
                    e.target.files && handleFileUpload(e.target.files)
                  }
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload">
                  <AdminButton variant="secondary" onClick={() => document.getElementById('file-upload')?.click()}>
                    Choose Files
                  </AdminButton>
                </label>
              </div>
            </div>
          </AdminCard>
        </div>
      )}
    </div>
  );
}
