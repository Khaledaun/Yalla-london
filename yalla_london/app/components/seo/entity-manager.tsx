
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  Search,
  Link,
  Building,
  User,
  MapPin,
  Star,
  Globe
} from 'lucide-react';
import { motion } from 'framer-motion';

interface Entity {
  id: string;
  name: string;
  type: 'Organization' | 'Person' | 'Place' | 'Product' | 'Event' | 'Article';
  description: string;
  url?: string;
  identifier: string; // @id for schema.org
  sameAs?: string[]; // Social media, Wikipedia, etc.
  properties: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  usageCount: number;
}

export function EntityManager() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [newEntity, setNewEntity] = useState<Partial<Entity>>({
    type: 'Organization',
    name: '',
    description: '',
    sameAs: []
  });

  useEffect(() => {
    fetchEntities();
  }, []);

  const fetchEntities = async () => {
    try {
      const response = await fetch('/api/seo/entities');
      const result = await response.json();
      if (result.success) {
        setEntities(result.entities);
      }
    } catch (error) {
      console.error('Failed to fetch entities:', error);
    }
  };

  const saveEntity = async (entity: Partial<Entity>) => {
    try {
      const url = entity.id ? `/api/seo/entities/${entity.id}` : '/api/seo/entities';
      const method = entity.id ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entity)
      });

      const result = await response.json();
      
      if (result.success) {
        fetchEntities();
        setIsEditing(null);
        setNewEntity({ type: 'Organization', name: '', description: '', sameAs: [] });
      }
    } catch (error) {
      console.error('Failed to save entity:', error);
    }
  };

  const deleteEntity = async (id: string) => {
    try {
      const response = await fetch(`/api/seo/entities/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchEntities();
      }
    } catch (error) {
      console.error('Failed to delete entity:', error);
    }
  };

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'Organization': return <Building className="h-4 w-4" />;
      case 'Person': return <User className="h-4 w-4" />;
      case 'Place': return <MapPin className="h-4 w-4" />;
      case 'Product': return <Star className="h-4 w-4" />;
      case 'Event': return <MapPin className="h-4 w-4" />;
      case 'Article': return <Globe className="h-4 w-4" />;
      default: return <Globe className="h-4 w-4" />;
    }
  };

  const filteredEntities = entities.filter(entity => {
    const matchesSearch = entity.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entity.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || entity.type === filterType;
    return matchesSearch && matchesType;
  });

  // Form rendering is handled by the EntityForm component below

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-bold">Entity Management</h3>
        <Button onClick={() => setIsEditing('new')}>
          <Plus className="h-4 w-4 mr-2" />
          Add Entity
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search entities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="Organization">Organizations</SelectItem>
            <SelectItem value="Person">People</SelectItem>
            <SelectItem value="Place">Places</SelectItem>
            <SelectItem value="Product">Products</SelectItem>
            <SelectItem value="Event">Events</SelectItem>
            <SelectItem value="Article">Articles</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* New/Edit Entity Form */}
      {isEditing && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <EntityForm
            entity={isEditing === 'new' ? newEntity : entities.find(e => e.id === isEditing) || newEntity}
            onSave={saveEntity}
            onCancel={() => setIsEditing(null)}
          />
        </motion.div>
      )}

      {/* Entities List */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEntities.map(entity => (
          <motion.div
            key={entity.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card className="h-full">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {getEntityIcon(entity.type)}
                    <div>
                      <CardTitle className="text-lg">{entity.name}</CardTitle>
                      <Badge variant="secondary" className="text-xs mt-1">
                        {entity.type}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditing(entity.id)}
                    >
                      <Edit3 className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteEntity(entity.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {entity.description}
                </p>

                {entity.url && (
                  <div className="flex items-center gap-2 mb-2">
                    <Link className="h-3 w-3 text-blue-600" />
                    <a 
                      href={entity.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm truncate"
                    >
                      {entity.url.replace(/^https?:\/\//, '')}
                    </a>
                  </div>
                )}

                {entity.sameAs && entity.sameAs.length > 0 && (
                  <div className="mb-2">
                    <div className="text-xs text-gray-500 mb-1">References:</div>
                    <div className="flex flex-wrap gap-1">
                      {entity.sameAs.slice(0, 3).map((url, index) => {
                        const domain = new URL(url).hostname.replace('www.', '');
                        return (
                          <Badge key={index} variant="outline" className="text-xs">
                            {domain}
                          </Badge>
                        );
                      })}
                      {entity.sameAs.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{entity.sameAs.length - 3}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center text-xs text-gray-500 mt-3">
                  <span>Used {entity.usageCount || 0} times</span>
                  <code className="bg-gray-100 px-1 rounded text-xs">
                    {entity.identifier}
                  </code>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {filteredEntities.length === 0 && (
        <div className="text-center py-12">
          <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">No Entities Found</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm || filterType !== 'all' 
              ? 'No entities match your search criteria.' 
              : 'Start by creating your first entity for structured data.'
            }
          </p>
          {!searchTerm && filterType === 'all' && (
            <Button onClick={() => setIsEditing('new')}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Entity
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// Extracted as a proper React component so hooks are called unconditionally
function EntityForm({ entity, onSave, onCancel }: {
  entity: Partial<Entity>;
  onSave: (entity: Partial<Entity>) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState(entity);
  const [sameAsText, setSameAsText] = useState(entity.sameAs?.join('\n') || '');

  const handleSaveClick = () => {
    const sameAsArray = sameAsText.split('\n').map(url => url.trim()).filter(Boolean);
    const entityToSave = {
      ...formData,
      sameAs: sameAsArray,
      identifier: formData.identifier || `#${formData.type?.toLowerCase()}-${Date.now()}`
    };
    onSave(entityToSave);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {entity.id ? 'Edit Entity' : 'New Entity'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="entity-name">Name</Label>
            <Input
              id="entity-name"
              value={formData.name || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Entity name"
            />
          </div>

          <div>
            <Label htmlFor="entity-type">Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as Entity['type'] }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Organization">Organization</SelectItem>
                <SelectItem value="Person">Person</SelectItem>
                <SelectItem value="Place">Place</SelectItem>
                <SelectItem value="Product">Product</SelectItem>
                <SelectItem value="Event">Event</SelectItem>
                <SelectItem value="Article">Article</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="entity-description">Description</Label>
          <Textarea
            id="entity-description"
            value={formData.description || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Brief description of this entity"
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="entity-url">Main URL</Label>
            <Input
              id="entity-url"
              value={formData.url || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
              placeholder="https://example.com"
            />
          </div>

          <div>
            <Label htmlFor="entity-identifier">Schema.org @id</Label>
            <Input
              id="entity-identifier"
              value={formData.identifier || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, identifier: e.target.value }))}
              placeholder="#organization-yalla-london"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="entity-sameas">SameAs URLs (one per line)</Label>
          <Textarea
            id="entity-sameas"
            value={sameAsText}
            onChange={(e) => setSameAsText(e.target.value)}
            placeholder={`https://www.instagram.com/yallalondon\nhttps://twitter.com/yallalondon\nhttps://en.wikipedia.org/wiki/London`}
            rows={4}
          />
          <div className="text-sm text-gray-500 mt-1">
            Add social media profiles, Wikipedia pages, and other authoritative references
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSaveClick}>
            <Save className="h-4 w-4 mr-2" />
            Save Entity
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
