
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Save,
  Search,
  ArrowRight,
  AlertTriangle,
  CheckCircle,
  Link as LinkIcon,
  Download
} from 'lucide-react';
import { motion } from 'framer-motion';

interface Redirect {
  id: string;
  fromPath: string;
  toPath: string;
  statusCode: 301 | 302 | 307 | 308;
  isActive: boolean;
  hitCount: number;
  createdAt: string;
  lastHit?: string;
  notes?: string;
}

export function RedirectManager() {
  const [redirects, setRedirects] = useState<Redirect[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [newRedirect, setNewRedirect] = useState<Partial<Redirect>>({
    statusCode: 301,
    isActive: true
  });

  useEffect(() => {
    fetchRedirects();
  }, []);

  const fetchRedirects = async () => {
    try {
      const response = await fetch('/api/seo/redirects');
      const result = await response.json();
      if (result.success) {
        setRedirects(result.redirects);
      }
    } catch (error) {
      console.error('Failed to fetch redirects:', error);
    }
  };

  const saveRedirect = async (redirect: Partial<Redirect>) => {
    try {
      const url = redirect.id ? `/api/seo/redirects/${redirect.id}` : '/api/seo/redirects';
      const method = redirect.id ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(redirect)
      });

      const result = await response.json();
      
      if (result.success) {
        fetchRedirects();
        setIsEditing(null);
        setNewRedirect({ statusCode: 301, isActive: true });
      }
    } catch (error) {
      console.error('Failed to save redirect:', error);
    }
  };

  const deleteRedirect = async (id: string) => {
    try {
      const response = await fetch(`/api/seo/redirects/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchRedirects();
      }
    } catch (error) {
      console.error('Failed to delete redirect:', error);
    }
  };

  const testRedirect = async (fromPath: string) => {
    try {
      const response = await fetch(`/api/seo/redirects/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: fromPath })
      });
      
      const result = await response.json();
      alert(result.working ? 'Redirect is working correctly!' : 'Redirect is not working.');
    } catch (error) {
      console.error('Failed to test redirect:', error);
    }
  };

  const exportRedirects = () => {
    const csv = [
      'From Path,To Path,Status Code,Active,Hit Count,Created At',
      ...redirects.map(r => 
        `${r.fromPath},${r.toPath},${r.statusCode},${r.isActive},${r.hitCount},${r.createdAt}`
      )
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'redirects.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusBadge = (statusCode: number) => {
    const colors = {
      301: 'bg-green-100 text-green-800',
      302: 'bg-blue-100 text-blue-800', 
      307: 'bg-yellow-100 text-yellow-800',
      308: 'bg-purple-100 text-purple-800'
    };
    
    return (
      <Badge className={colors[statusCode as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>
        {statusCode}
      </Badge>
    );
  };

  const filteredRedirects = redirects.filter(redirect => {
    const matchesSearch = redirect.fromPath.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         redirect.toPath.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && redirect.isActive) ||
                         (filterStatus === 'inactive' && !redirect.isActive);
                         
    return matchesSearch && matchesStatus;
  });

  const renderRedirectForm = (redirect: Partial<Redirect>) => {
    const [formData, setFormData] = useState(redirect);

    const handleSave = () => {
      if (!formData.fromPath || !formData.toPath) return;
      saveRedirect(formData);
    };

    return (
      <Card>
        <CardHeader>
          <CardTitle>
            {redirect.id ? 'Edit Redirect' : 'New Redirect'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="from-path">From Path</Label>
              <Input
                id="from-path"
                value={formData.fromPath || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, fromPath: e.target.value }))}
                placeholder="/old-page"
              />
            </div>
            
            <div>
              <Label htmlFor="to-path">To Path</Label>
              <Input
                id="to-path"
                value={formData.toPath || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, toPath: e.target.value }))}
                placeholder="/new-page"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="status-code">Status Code</Label>
              <Select
                value={formData.statusCode?.toString()}
                onValueChange={(value) => setFormData(prev => ({ 
                  ...prev, 
                  statusCode: parseInt(value) as Redirect['statusCode']
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="301">301 - Permanent Redirect</SelectItem>
                  <SelectItem value="302">302 - Temporary Redirect</SelectItem>
                  <SelectItem value="307">307 - Temporary Redirect (POST preserved)</SelectItem>
                  <SelectItem value="308">308 - Permanent Redirect (POST preserved)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2 pt-6">
              <input
                type="checkbox"
                id="is-active"
                checked={formData.isActive}
                onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
              />
              <Label htmlFor="is-active">Active</Label>
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes (optional)</Label>
            <Input
              id="notes"
              value={formData.notes || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Why this redirect exists..."
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsEditing(null)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save Redirect
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-bold">Redirect Management</h3>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportRedirects}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => setIsEditing('new')}>
            <Plus className="h-4 w-4 mr-2" />
            Add Redirect
          </Button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search redirects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active Only</SelectItem>
            <SelectItem value="inactive">Inactive Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{redirects.length}</div>
            <div className="text-sm text-gray-500">Total Redirects</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {redirects.filter(r => r.isActive).length}
            </div>
            <div className="text-sm text-gray-500">Active</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">
              {redirects.filter(r => !r.isActive).length}
            </div>
            <div className="text-sm text-gray-500">Inactive</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {redirects.reduce((sum, r) => sum + r.hitCount, 0)}
            </div>
            <div className="text-sm text-gray-500">Total Hits</div>
          </CardContent>
        </Card>
      </div>

      {/* Form */}
      {isEditing && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {renderRedirectForm(
            isEditing === 'new' ? newRedirect : redirects.find(r => r.id === isEditing) || newRedirect
          )}
        </motion.div>
      )}

      {/* Redirects List */}
      <Card>
        <CardHeader>
          <CardTitle>Redirects</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredRedirects.map(redirect => (
              <motion.div
                key={redirect.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center space-x-4 flex-1">
                  <div className="flex items-center space-x-2">
                    {redirect.isActive ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    )}
                    {getStatusBadge(redirect.statusCode)}
                  </div>
                  
                  <div className="flex items-center space-x-2 flex-1">
                    <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                      {redirect.fromPath}
                    </code>
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                    <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                      {redirect.toPath}
                    </code>
                  </div>

                  <div className="text-sm text-gray-500">
                    {redirect.hitCount} hits
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => testRedirect(redirect.fromPath)}
                  >
                    <LinkIcon className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(redirect.id)}
                  >
                    <Edit3 className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteRedirect(redirect.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </motion.div>
            ))}

            {filteredRedirects.length === 0 && (
              <div className="text-center py-8">
                <LinkIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">No Redirects Found</h3>
                <p className="text-gray-500">
                  {searchTerm || filterStatus !== 'all' 
                    ? 'No redirects match your search criteria.' 
                    : 'Create your first redirect to manage URL changes.'
                  }
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
