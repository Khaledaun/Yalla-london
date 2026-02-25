"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import {
  Image as ImageIcon,
  Upload,
  Search,
  Check,
  X,
  FileImage,
  Film,
  File,
  Loader2,
  AlertCircle,
  Camera,
  HardDrive,
  ExternalLink,
} from "lucide-react";
import { useDropzone } from "react-dropzone";

// ─── Types ──────────────────────────────────────────────────────────

export interface MediaPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (
    url: string,
    metadata?: { width?: number; height?: number; alt?: string }
  ) => void;
  accept?: "image" | "video" | "any";
  multiple?: boolean;
}

interface LibraryAsset {
  id: string;
  filename: string;
  original_name: string;
  url: string;
  file_type: string;
  mime_type: string;
  file_size: number;
  width: number | null;
  height: number | null;
  alt_text: string | null;
  title: string | null;
  tags: string[];
  category: string | null;
  created_at: string;
}

interface UnsplashPhoto {
  id: string;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  alt_description: string | null;
  description: string | null;
  width: number;
  height: number;
  user: {
    name: string;
    username: string;
    links: { html: string };
  };
  links: {
    download_location: string;
  };
}

// ─── Helper: Format file size ───────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Helper: Get accept MIME types for dropzone ─────────────────────

function getAcceptTypes(accept?: "image" | "video" | "any") {
  switch (accept) {
    case "image":
      return {
        "image/*": [".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif", ".svg"],
      };
    case "video":
      return { "video/*": [".mp4", ".webm", ".mov"] };
    default:
      return {
        "image/*": [".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif", ".svg"],
        "video/*": [".mp4", ".webm", ".mov"],
      };
  }
}

// ─── Component: MediaLibraryTab ─────────────────────────────────────

function MediaLibraryTab({
  accept,
  onSelect,
}: {
  accept?: "image" | "video" | "any";
  onSelect: (
    url: string,
    metadata?: { width?: number; height?: number; alt?: string }
  ) => void;
}) {
  const [assets, setAssets] = useState<LibraryAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const LIMIT = 24;

  const fetchAssets = useCallback(
    async (searchTerm: string, newOffset: number, append = false) => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.set("limit", String(LIMIT));
        params.set("offset", String(newOffset));
        if (searchTerm) params.set("search", searchTerm);
        if (accept && accept !== "any") params.set("type", accept);

        const response = await fetch(
          `/api/admin/design-studio/media-pool?${params.toString()}`
        );

        if (!response.ok) {
          throw new Error("Failed to load media library");
        }

        const data = await response.json();

        if (data.success) {
          const fetched = data.assets || [];
          setAssets((prev) => (append ? [...prev, ...fetched] : fetched));
          setTotal(data.total || 0);
          setHasMore(data.hasMore || false);
          setOffset(newOffset);
        } else {
          throw new Error(data.error || "Failed to load media library");
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load media library";
        setError(message);
        if (!append) setAssets([]);
      } finally {
        setIsLoading(false);
      }
    },
    [accept]
  );

  // Initial load
  useEffect(() => {
    fetchAssets("", 0);
  }, [fetchAssets]);

  // Debounced search
  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setSelectedId(null);
      fetchAssets(value, 0);
    }, 400);
  };

  const handleLoadMore = () => {
    fetchAssets(search, offset + LIMIT, true);
  };

  const handleSelect = (asset: LibraryAsset) => {
    setSelectedId(asset.id);
    onSelect(asset.url, {
      width: asset.width ?? undefined,
      height: asset.height ?? undefined,
      alt: asset.alt_text ?? asset.title ?? undefined,
    });
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by filename, tag, or description..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Stats row */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>
          {total} {total === 1 ? "file" : "files"} found
        </span>
        {search && (
          <button
            onClick={() => handleSearchChange("")}
            className="text-blue-600 hover:underline flex items-center gap-1"
          >
            <X className="h-3 w-3" /> Clear search
          </button>
        )}
      </div>

      {/* Grid */}
      <ScrollArea className="h-[380px] sm:h-[420px]">
        {error ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <AlertCircle className="h-8 w-8 mb-2 text-red-400" />
            <p className="text-sm">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => fetchAssets(search, 0)}
            >
              Retry
            </Button>
          </div>
        ) : isLoading && assets.length === 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 p-1">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        ) : assets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <FileImage className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-sm font-medium">No media files found</p>
            <p className="text-xs mt-1">
              {search
                ? "Try a different search term"
                : "Upload files to get started"}
            </p>
          </div>
        ) : (
          <div className="space-y-3 p-1">
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {assets.map((asset) => (
                <button
                  key={asset.id}
                  onClick={() => handleSelect(asset)}
                  className={`group relative aspect-square rounded-lg overflow-hidden border-2 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    selectedId === asset.id
                      ? "border-blue-600 ring-2 ring-blue-200"
                      : "border-transparent hover:border-gray-300"
                  }`}
                  title={asset.alt_text || asset.original_name}
                >
                  {asset.file_type === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={asset.url}
                      alt={asset.alt_text || asset.original_name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : asset.file_type === "video" ? (
                    <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                      <Film className="h-8 w-8 text-gray-400" />
                    </div>
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                      <File className="h-8 w-8 text-gray-400" />
                    </div>
                  )}

                  {/* Selection checkmark */}
                  {selectedId === asset.id && (
                    <div className="absolute top-1.5 right-1.5 bg-blue-600 text-white rounded-full p-0.5">
                      <Check className="h-3 w-3" />
                    </div>
                  )}

                  {/* Hover overlay with metadata */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white text-[10px] leading-tight truncate">
                      {asset.original_name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {asset.width && asset.height && (
                        <span className="text-white/70 text-[9px]">
                          {asset.width}x{asset.height}
                        </span>
                      )}
                      <span className="text-white/70 text-[9px]">
                        {formatFileSize(asset.file_size)}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Load more */}
            {hasMore && (
              <div className="flex justify-center pt-2 pb-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLoadMore}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Load more"
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

// ─── Component: UploadTab ───────────────────────────────────────────

function UploadTab({
  accept,
  onSelect,
}: {
  accept?: "image" | "video" | "any";
  onSelect: (
    url: string,
    metadata?: { width?: number; height?: number; alt?: string }
  ) => void;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<{
    url: string;
    name: string;
    width?: number;
    height?: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);
    setError(null);
    setUploadedFile(null);

    try {
      // Validate file size (50MB limit to match API)
      if (file.size > 50 * 1024 * 1024) {
        throw new Error("File too large. Maximum size is 50MB.");
      }

      // Simulate progress as we can't track XHR progress with fetch
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + Math.random() * 15;
        });
      }, 200);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("enrichWithAI", "true");

      const response = await fetch(
        "/api/admin/design-studio/media-pool",
        {
          method: "POST",
          body: formData,
        }
      );

      clearInterval(progressInterval);

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Upload failed");
      }

      const data = await response.json();
      setUploadProgress(100);

      if (data.success && data.asset) {
        const result = {
          url: data.asset.url,
          name: file.name,
          width: undefined as number | undefined,
          height: undefined as number | undefined,
        };

        // If we uploaded an image, try to get dimensions from the browser
        if (file.type.startsWith("image/")) {
          try {
            const dimensions = await getImageDimensions(file);
            result.width = dimensions.width;
            result.height = dimensions.height;
          } catch {
            // Dimensions are optional — proceed without them
          }
        }

        setUploadedFile(result);

        // Auto-select the uploaded file
        onSelect(result.url, {
          width: result.width,
          height: result.height,
          alt: data.enrichment?.alt_text || undefined,
        });

        toast({
          title: "Upload complete",
          description: `${file.name} uploaded successfully`,
        });
      } else {
        throw new Error("Unexpected response from upload API");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Upload failed";
      setError(message);
      toast({
        title: "Upload failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive, isDragReject } =
    useDropzone({
      onDrop: (acceptedFiles) => {
        if (acceptedFiles.length > 0) {
          uploadFile(acceptedFiles[0]);
        }
      },
      accept: getAcceptTypes(accept),
      maxFiles: 1,
      disabled: isUploading,
    });

  return (
    <div className="flex flex-col gap-4">
      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 sm:p-12 transition-all cursor-pointer ${
          isUploading
            ? "border-gray-200 bg-gray-50 cursor-not-allowed"
            : isDragReject
              ? "border-red-400 bg-red-50"
              : isDragActive
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 hover:border-blue-400 hover:bg-blue-50/50"
        }`}
      >
        <input {...getInputProps()} />

        {isUploading ? (
          <div className="flex flex-col items-center w-full max-w-xs">
            <Loader2 className="h-10 w-10 text-blue-500 animate-spin mb-4" />
            <p className="text-sm font-medium text-gray-700 mb-3">
              Uploading...
            </p>
            <Progress value={uploadProgress} className="h-2 w-full" />
            <p className="text-xs text-muted-foreground mt-2">
              {Math.round(uploadProgress)}%
            </p>
          </div>
        ) : (
          <>
            <Upload
              className={`h-10 w-10 mb-3 ${
                isDragActive ? "text-blue-500" : "text-gray-400"
              }`}
            />
            <p className="text-sm font-medium text-gray-700 text-center">
              {isDragActive
                ? "Drop file here"
                : "Drag and drop a file, or click to browse"}
            </p>
            <p className="text-xs text-muted-foreground mt-1.5 text-center">
              {accept === "image"
                ? "JPG, PNG, GIF, WebP, AVIF, SVG"
                : accept === "video"
                  ? "MP4, WebM, MOV"
                  : "Images or videos"}{" "}
              up to 50MB
            </p>
          </>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg p-3">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Uploaded file preview */}
      {uploadedFile && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex-shrink-0 w-12 h-12 rounded-md overflow-hidden bg-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={uploadedFile.url}
              alt={uploadedFile.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-green-800 truncate">
              {uploadedFile.name}
            </p>
            <div className="flex items-center gap-2 text-xs text-green-600">
              <Check className="h-3 w-3" />
              <span>Uploaded and selected</span>
              {uploadedFile.width && uploadedFile.height && (
                <span>
                  ({uploadedFile.width}x{uploadedFile.height})
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helper: Get image dimensions from a File object ────────────────

function getImageDimensions(
  file: File
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    img.src = url;
  });
}

// ─── Component: UnsplashTab ─────────────────────────────────────────

function UnsplashTab({
  onSelect,
}: {
  onSelect: (
    url: string,
    metadata?: { width?: number; height?: number; alt?: string }
  ) => void;
}) {
  const [query, setQuery] = useState("");
  const [photos, setPhotos] = useState<UnsplashPhoto[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const unsplashKey =
    typeof window !== "undefined"
      ? (process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY ?? "")
      : "";

  const searchUnsplash = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setPhotos([]);
        setHasSearched(false);
        return;
      }

      if (!unsplashKey) {
        setError("Configure UNSPLASH_ACCESS_KEY to search free stock images");
        return;
      }

      setIsSearching(true);
      setError(null);
      setHasSearched(true);

      try {
        const params = new URLSearchParams({
          query: searchQuery,
          per_page: "20",
          orientation: "landscape",
        });

        const response = await fetch(
          `https://api.unsplash.com/search/photos?${params.toString()}`,
          {
            headers: {
              Authorization: `Client-ID ${unsplashKey}`,
            },
          }
        );

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error(
              "Invalid Unsplash API key. Check NEXT_PUBLIC_UNSPLASH_ACCESS_KEY."
            );
          }
          if (response.status === 403) {
            throw new Error("Unsplash API rate limit exceeded. Try again later.");
          }
          throw new Error("Failed to search Unsplash");
        }

        const data = await response.json();
        setPhotos(data.results || []);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to search Unsplash";
        setError(message);
      } finally {
        setIsSearching(false);
      }
    },
    [unsplashKey]
  );

  const handleSearchChange = (value: string) => {
    setQuery(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      searchUnsplash(value);
    }, 500);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchUnsplash(query);
  };

  const handleSelectPhoto = async (photo: UnsplashPhoto) => {
    setIsDownloading(photo.id);
    setSelectedId(photo.id);

    try {
      // Trigger Unsplash download tracking (required by TOS)
      if (unsplashKey) {
        fetch(photo.links.download_location, {
          headers: { Authorization: `Client-ID ${unsplashKey}` },
        }).catch(() => {
          // Non-blocking — best-effort download tracking
          console.warn("[media-picker] Unsplash download tracking failed");
        });
      }

      // Download the image and re-upload to our media library
      const imageResponse = await fetch(photo.urls.regular);
      if (!imageResponse.ok) throw new Error("Failed to download image");

      const blob = await imageResponse.blob();
      const filename = `unsplash-${photo.id}.jpg`;
      const file = new window.File([blob], filename, {
        type: "image/jpeg",
      });

      const formData = new FormData();
      formData.append("file", file);
      formData.append("enrichWithAI", "false");

      const uploadResponse = await fetch(
        "/api/admin/design-studio/media-pool",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!uploadResponse.ok) {
        throw new Error("Failed to save image to media library");
      }

      const uploadData = await uploadResponse.json();

      if (uploadData.success && uploadData.asset) {
        onSelect(uploadData.asset.url, {
          width: photo.width,
          height: photo.height,
          alt:
            photo.alt_description ||
            photo.description ||
            `Photo by ${photo.user.name} on Unsplash`,
        });

        toast({
          title: "Image selected",
          description: `Photo by ${photo.user.name} saved to media library`,
        });
      } else {
        throw new Error("Unexpected response from upload");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to download image";
      setError(message);
      setSelectedId(null);
      toast({
        title: "Download failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsDownloading(null);
    }
  };

  // If no Unsplash key is configured, show configuration message
  if (!unsplashKey) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Camera className="h-10 w-10 mb-3 opacity-40" />
        <p className="text-sm font-medium text-center">
          Configure UNSPLASH_ACCESS_KEY to search free stock images
        </p>
        <p className="text-xs mt-2 text-center max-w-sm">
          Add <code className="bg-gray-100 px-1.5 py-0.5 rounded text-[11px]">NEXT_PUBLIC_UNSPLASH_ACCESS_KEY</code> to your environment variables to enable
          free stock photo search powered by Unsplash.
        </p>
        <a
          href="https://unsplash.com/developers"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-blue-600 hover:underline mt-3"
        >
          Get a free API key
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Search form */}
      <form onSubmit={handleSearchSubmit} className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search Unsplash for free stock photos..."
          value={query}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9 pr-20"
        />
        <Button
          type="submit"
          size="sm"
          variant="secondary"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-8"
          disabled={isSearching || !query.trim()}
        >
          {isSearching ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            "Search"
          )}
        </Button>
      </form>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg p-3">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Results grid */}
      <ScrollArea className="h-[380px] sm:h-[420px]">
        {isSearching && photos.length === 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-1">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="aspect-video rounded-lg" />
            ))}
          </div>
        ) : photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Camera className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-sm font-medium">
              {hasSearched
                ? "No photos found"
                : "Search for free stock photos"}
            </p>
            <p className="text-xs mt-1">
              {hasSearched
                ? "Try different keywords"
                : "Powered by Unsplash"}
            </p>
          </div>
        ) : (
          <div className="space-y-3 p-1">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {photos.map((photo) => (
                <button
                  key={photo.id}
                  onClick={() => handleSelectPhoto(photo)}
                  disabled={isDownloading !== null}
                  className={`group relative aspect-video rounded-lg overflow-hidden border-2 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    selectedId === photo.id
                      ? "border-blue-600 ring-2 ring-blue-200"
                      : "border-transparent hover:border-gray-300"
                  } ${isDownloading !== null && isDownloading !== photo.id ? "opacity-50" : ""}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.urls.small}
                    alt={photo.alt_description || "Unsplash photo"}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />

                  {/* Downloading indicator */}
                  {isDownloading === photo.id && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Loader2 className="h-6 w-6 text-white animate-spin" />
                    </div>
                  )}

                  {/* Selection checkmark */}
                  {selectedId === photo.id && isDownloading !== photo.id && (
                    <div className="absolute top-1.5 right-1.5 bg-blue-600 text-white rounded-full p-0.5">
                      <Check className="h-3 w-3" />
                    </div>
                  )}

                  {/* Attribution overlay (required by Unsplash TOS) */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <a
                      href={`${photo.user.links.html}?utm_source=zenitha_luxury&utm_medium=referral`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white text-[10px] leading-tight hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Photo by {photo.user.name}
                    </a>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-white/70 text-[9px]">
                        {photo.width}x{photo.height}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Unsplash attribution (required by TOS) */}
            <p className="text-center text-[10px] text-muted-foreground pb-1">
              Photos provided by{" "}
              <a
                href="https://unsplash.com/?utm_source=zenitha_luxury&utm_medium=referral"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-gray-700"
              >
                Unsplash
              </a>
            </p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

// ─── Main Component: MediaPicker ────────────────────────────────────

export function MediaPicker({
  isOpen,
  onClose,
  onSelect,
  accept = "any",
  multiple = false,
}: MediaPickerProps) {
  const [activeTab, setActiveTab] = useState("library");

  // Wrap onSelect to close dialog after selection (single-select mode)
  const handleSelect = useCallback(
    (
      url: string,
      metadata?: { width?: number; height?: number; alt?: string }
    ) => {
      onSelect(url, metadata);
      if (!multiple) {
        // Small delay to allow toast/feedback before closing
        setTimeout(() => onClose(), 150);
      }
    },
    [onSelect, onClose, multiple]
  );

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab("library");
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl w-[95vw] sm:w-full max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <ImageIcon className="h-5 w-5 text-blue-600" />
            Select Media
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Choose from your library, upload a new file, or search Unsplash
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <TabsList className="mx-6 mt-2 grid w-auto grid-cols-3">
            <TabsTrigger value="library" className="gap-1.5 text-xs sm:text-sm">
              <HardDrive className="h-3.5 w-3.5 hidden sm:block" />
              Library
            </TabsTrigger>
            <TabsTrigger value="upload" className="gap-1.5 text-xs sm:text-sm">
              <Upload className="h-3.5 w-3.5 hidden sm:block" />
              Upload
            </TabsTrigger>
            <TabsTrigger
              value="unsplash"
              className="gap-1.5 text-xs sm:text-sm"
            >
              <Camera className="h-3.5 w-3.5 hidden sm:block" />
              Unsplash
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden px-6 pb-6">
            <TabsContent value="library" className="mt-3 h-full">
              <MediaLibraryTab accept={accept} onSelect={handleSelect} />
            </TabsContent>
            <TabsContent value="upload" className="mt-3 h-full">
              <UploadTab accept={accept} onSelect={handleSelect} />
            </TabsContent>
            <TabsContent value="unsplash" className="mt-3 h-full">
              <UnsplashTab onSelect={handleSelect} />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export default MediaPicker;
