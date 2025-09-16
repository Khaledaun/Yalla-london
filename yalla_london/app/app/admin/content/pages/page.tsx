export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { Suspense } from 'react';
import { PremiumAdminLayout } from '@/src/components/admin/premium-admin-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  FileText, 
  Eye, 
  Edit3, 
  Globe,
  Lock,
  Users,
  Calendar,
  MoreHorizontal
} from 'lucide-react';

interface PageInfo {
  id: string;
  title: string;
  slug: string;
  status: 'published' | 'draft' | 'archived';
  lastModified: string;
  author: string;
  type: 'static' | 'dynamic' | 'system';
  views?: number;
}

const mockPages: PageInfo[] = [
  {
    id: '1',
    title: 'Privacy Policy',
    slug: 'privacy',
    status: 'published',
    lastModified: '2024-01-15',
    author: 'Admin',
    type: 'system',
    views: 1234
  },
  {
    id: '2',
    title: 'Terms of Service',
    slug: 'terms',
    status: 'published',
    lastModified: '2024-01-10',
    author: 'Admin',
    type: 'system',
    views: 890
  },
  {
    id: '3',
    title: 'About Us',
    slug: 'about',
    status: 'draft',
    lastModified: '2024-01-20',
    author: 'Admin',
    type: 'static',
    views: 0
  },
  {
    id: '4',
    title: 'Contact Information',
    slug: 'contact',
    status: 'published',
    lastModified: '2024-01-12',
    author: 'Admin',
    type: 'static',
    views: 567
  }
];

function PagesList() {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'archived': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'system': return <Lock className="h-4 w-4" />;
      case 'dynamic': return <Globe className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pages</h1>
          <p className="text-gray-600 mt-1">
            Manage your website pages, privacy policy, terms, and static content
          </p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          New Page
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Pages</p>
                <p className="text-2xl font-bold text-gray-900">{mockPages.length}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Published</p>
                <p className="text-2xl font-bold text-green-600">
                  {mockPages.filter(p => p.status === 'published').length}
                </p>
              </div>
              <Globe className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Drafts</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {mockPages.filter(p => p.status === 'draft').length}
                </p>
              </div>
              <Edit3 className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Views</p>
                <p className="text-2xl font-bold text-purple-600">
                  {mockPages.reduce((sum, p) => sum + (p.views || 0), 0).toLocaleString()}
                </p>
              </div>
              <Eye className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pages List */}
      <Card>
        <CardHeader>
          <CardTitle>All Pages</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockPages.map((page) => (
              <div 
                key={page.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    {getTypeIcon(page.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {page.title}
                      </h3>
                      <Badge className={`text-xs ${getStatusColor(page.status)}`}>
                        {page.status}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                      <span>/{page.slug}</span>
                      <span>•</span>
                      <span className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {page.lastModified}
                      </span>
                      <span>•</span>
                      <span className="flex items-center">
                        <Users className="h-3 w-3 mr-1" />
                        {page.author}
                      </span>
                      {page.views !== undefined && (
                        <>
                          <span>•</span>
                          <span className="flex items-center">
                            <Eye className="h-3 w-3 mr-1" />
                            {page.views} views
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {page.status === 'published' && (
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                  
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      if (page.slug === 'privacy') {
                        window.location.href = '/admin/content/pages/privacy';
                      }
                    }}
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PagesPage() {
  return (
    <PremiumAdminLayout 
      title="Pages"
      breadcrumbs={[
        { label: 'Content', href: '/admin/content' },
        { label: 'Pages' }
      ]}
    >
      <Suspense fallback={
        <div className="animate-pulse space-y-6">
          <div className="h-20 bg-gray-200 rounded-lg"></div>
          <div className="grid grid-cols-4 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded-lg"></div>
        </div>
      }>
        <PagesList />
      </Suspense>
    </PremiumAdminLayout>
  );
}