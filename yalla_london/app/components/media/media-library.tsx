
'use client';

import { useState, useEffect, useRef } from 'react';
import NextImage from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Upload, 
  Search, 
  Grid3X3, 
  List,
  Trash2,
  Edit3,
  Download,
  Copy,
  Image as ImageIcon,
  Video,
  FileText,
  Star,
  Eye,
  MoreHorizontal,
  Settings,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MediaItem {
  id: string;
  filename: string;
  originalName: string;
  title: string;
  altText: string;
  description: string;
  tags: string[];
  type: 'image' | 'video' | 'document';
  mimeType: string;
  size: number;
  dimensions: {
    width: number;
    height: number;
  };
  urls: {
    original: string;
    large: string;
    medium: string;
    small: string;
    thumbnail: string;
  };
  metadata: {
    license?: string;
    source?: string;
    photographer?: string;
    location?: string;
  };
  usageCount: number;
  usedIn: string[];
  createdAt: string;
  updatedAt: string;
}

interface MediaLibraryProps {
  onSelect?: (item: MediaItem) => void;
  selectionMode?: 'single' | 'multiple';
  allowedTypes?: ('image' | 'video' | 'document')[];
  maxSelection?: number;
}

export function MediaLibrary({ 
  onSelect,
  selectionMode = 'single',
  allowedTypes = ['image', 'video', 'document'],
  maxSelection = 1
}: MediaLibraryProps) {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isUploading, setIsUploading] = useState(false);
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null);
  const [showUsageMap, setShowUsageMap] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchMediaItems();
  }, []);

  const fetchMediaItems = async () => {
    try {
      const response = await fetch('/api/media/library');
      const result = await response.json();
      if (result.success) {
        setMediaItems(result.items);
      }
    } catch (error) {
      console.error('Failed to fetch media items:', error);
    }
  };

  const handleFileUpload = async (files: FileList) => {
    setIsUploading(true);
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append('file', file);
      
      try {
        const response = await fetch('/api/media/upload', {
          method: 'POST',
          body: formData
        });
        
        const result = await response.json();
        if (result.success) {
          setMediaItems(prev => [result.item, ...prev]);
        }
      } catch (error) {
        console.error('Upload failed:', error);
      }
    }
    
    setIsUploading(false);
  };

  const handleItemSelect = (itemId: string) => {
    if (selectionMode === 'single') {
      setSelectedItems([itemId]);
      const item = mediaItems.find(item => item.id === itemId);
      if (item && onSelect) {
        onSelect(item);
      }
    } else {
      setSelectedItems(prev => {
        if (prev.includes(itemId)) {
          return prev.filter(id => id !== itemId);
        } else if (prev.length < maxSelection) {
          return [...prev, itemId];
        }
        return prev;
      });
    }
  };

  const updateMediaItem = async (itemId: string, updates: Partial<MediaItem>) => {
    try {
      const response = await fetch(`/api/media/library/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      const result = await response.json();
      if (result.success) {
        setMediaItems(prev => prev.map(item => 
          item.id === itemId ? { ...item, ...updates } : item
        ));
        setEditingItem(null);
      }
    } catch (error) {
      console.error('Failed to update media item:', error);
    }
  };

  const deleteMediaItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this media item?')) return;

    try {
      const response = await fetch(`/api/media/library/${itemId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setMediaItems(prev => prev.filter(item => item.id !== itemId));
        setSelectedItems(prev => prev.filter(id => id !== itemId));
      }
    } catch (error) {
      console.error('Failed to delete media item:', error);
    }
  };

  const generateResponsiveSizes = async (itemId: string) => {
    try {
      const response = await fetch(`/api/media/generate-sizes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId })
      });

      const result = await response.json();
      if (result.success) {
        fetchMediaItems(); // Refresh to get updated URLs
      }
    } catch (error) {
      console.error('Failed to generate responsive sizes:', error);
    }
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    // Show toast notification
  };

  const getFileIcon = (type: string, mimeType: string) => {
    if (type === 'image') return <ImageIcon className="h-4 w-4" />;
    if (type === 'video') return <Video className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const filteredItems = mediaItems.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = filterType === 'all' || item.type === filterType;
    const isAllowedType = allowedTypes.includes(item.type);
    return matchesSearch && matchesType && isAllowedType;
  });

  const renderGridItem = (item: MediaItem) => (
    <motion.div
      key={item.id}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`relative group cursor-pointer border-2 rounded-lg overflow-hidden transition-all ${
        selectedItems.includes(item.id) ? 'border-blue-500 ring-2 ring-blue-200' : 'border-transparent hover:border-gray-300'
      }`}
      onClick={() => handleItemSelect(item.id)}
    >
      <div className="aspect-square bg-gray-100 relative">
        {item.type === 'image' ? (
          <NextImage
            src={item.urls.thumbnail}
            alt={item.altText || item.title}
            width={0}
            height={0}
            sizes="100vw"
            className="w-full h-full object-cover"
            style={{ width: '100%', height: '100%' }}
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-200">
            {getFileIcon(item.type, item.mimeType)}
          </div>
        )}

        {/* Overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
            <Button size="sm" variant="secondary" onClick={(e) => {
              e.stopPropagation();
              setEditingItem(item);
            }}>
              <Edit3 className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="secondary" onClick={(e) => {
              e.stopPropagation();
              setShowUsageMap(item.id);
            }}>
              <Eye className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="secondary" onClick={(e) => {
              e.stopPropagation();
              deleteMediaItem(item.id);
            }}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Selection indicator */}
        {selectedItems.includes(item.id) && (
          <div className="absolute top-2 left-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
            <div className="w-3 h-3 bg-white rounded-full" />
          </div>
        )}

        {/* Type badge */}
        <div className="absolute top-2 right-2 flex gap-1">
          <Badge variant="secondary" className="text-xs">
            {item.type}
          </Badge>
          {item.usageCount > 0 && (
            <Badge variant="outline" className="text-xs">
              {item.usageCount}
            </Badge>
          )}
        </div>
      </div>

      <div className="p-3">
        <h4 className="font-medium text-sm truncate">{item.title}</h4>
        <p className="text-xs text-gray-500 mt-1">
          {item.dimensions.width}×{item.dimensions.height} • {formatFileSize(item.size)}
        </p>
        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {item.tags.slice(0, 2).map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {item.tags.length > 2 && (
              <Badge variant="outline" className="text-xs">
                +{item.tags.length - 2}
              </Badge>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );

  const renderListItem = (item: MediaItem) => (
    <motion.div
      key={item.id}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex items-center space-x-4 p-4 border rounded-lg cursor-pointer transition-all ${
        selectedItems.includes(item.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={() => handleItemSelect(item.id)}
    >
      {/* Thumbnail */}
      <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
        {item.type === 'image' ? (
          <NextImage
            src={item.urls.thumbnail}
            alt={item.altText || item.title}
            width={64}
            height={64}
            className="w-full h-full object-cover"
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {getFileIcon(item.type, item.mimeType)}
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-medium truncate">{item.title}</h4>
          <Badge variant="outline" className="text-xs">
            {item.type}
          </Badge>
          {item.usageCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              Used {item.usageCount}x
            </Badge>
          )}
        </div>
        <p className="text-sm text-gray-600 truncate">{item.description}</p>
        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
          <span>{item.dimensions.width}×{item.dimensions.height}</span>
          <span>{formatFileSize(item.size)}</span>
          <span>{new Date(item.createdAt).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            copyUrl(item.urls.original);
          }}
        >
          <Copy className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setEditingItem(item);
          }}
        >
          <Edit3 className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            deleteMediaItem(item.id);
          }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-bold">Media Library</h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <Upload className="h-4 w-4 mr-2" />
            {isUploading ? 'Uploading...' : 'Upload Media'}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,.pdf,.doc,.docx"
            className="hidden"
            onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-between items-center gap-4">
        <div className="flex gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search media..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="image">Images</SelectItem>
              <SelectItem value="video">Videos</SelectItem>
              <SelectItem value="document">Documents</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Selection Info */}
      {selectedItems.length > 0 && selectionMode === 'multiple' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            {selectedItems.length} item{selectedItems.length > 1 ? 's' : ''} selected 
            {maxSelection > 1 && ` (max ${maxSelection})`}
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedItems([])}
            className="mt-2"
          >
            Clear Selection
          </Button>
        </div>
      )}

      {/* Media Grid/List */}
      <div className={
        viewMode === 'grid' 
          ? 'grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4'
          : 'space-y-3'
      }>
        <AnimatePresence>
          {filteredItems.map(item => 
            viewMode === 'grid' ? renderGridItem(item) : renderListItem(item)
          )}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {filteredItems.length === 0 && (
        <div className="text-center py-12">
          <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">No Media Found</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm || filterType !== 'all' 
              ? 'No media items match your search criteria.' 
              : 'Upload your first media files to get started.'
            }
          </p>
          {!searchTerm && filterType === 'all' && (
            <Button onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" />
              Upload Media
            </Button>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Edit Media Item</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={editingItem.title}
                    onChange={(e) => setEditingItem({...editingItem, title: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="alt-text">Alt Text</Label>
                  <Input
                    id="alt-text"
                    value={editingItem.altText}
                    onChange={(e) => setEditingItem({...editingItem, altText: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={editingItem.description}
                  onChange={(e) => setEditingItem({...editingItem, description: e.target.value})}
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  value={editingItem.tags.join(', ')}
                  onChange={(e) => setEditingItem({
                    ...editingItem, 
                    tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                  })}
                />
              </div>

              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => generateResponsiveSizes(editingItem.id)}
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Generate Sizes
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setEditingItem(null)}>
                    Cancel
                  </Button>
                  <Button onClick={() => updateMediaItem(editingItem.id, editingItem)}>
                    Save Changes
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
