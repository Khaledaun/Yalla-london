'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PremiumAdminLayout } from '@/src/components/admin/premium-admin-layout';
import { ArticleEditor } from '@/src/components/admin/article-editor';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Eye } from 'lucide-react';

interface BlogPostAdmin {
  id: string;
  title_en: string;
  title_ar: string;
  slug: string;
  excerpt_en: string;
  excerpt_ar: string;
  content_en?: string;
  content_ar?: string;
  published: boolean;
  page_type: string;
  author: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
  category: {
    id: string;
    name_en: string;
    name_ar: string;
    slug: string;
  };
  place?: {
    id: string;
    name: string;
    slug: string;
    category: string;
  };
  seo_score: number;
  tags: string[];
  featured_image?: string;
  meta_title_en?: string;
  meta_title_ar?: string;
  meta_description_en?: string;
  meta_description_ar?: string;
  created_at: string;
  updated_at: string;
}

export default function EditArticlePage() {
  const params = useParams();
  const router = useRouter();
  const [article, setArticle] = useState<BlogPostAdmin | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const articleId = params.id as string;

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/admin/content?id=${articleId}`);
        const data = await response.json();
        
        if (data.success && data.data) {
          setArticle(data.data);
        } else {
          throw new Error(data.error || 'Article not found');
        }
      } catch (err) {
        console.error('Error fetching article:', err);
        setError('Failed to load article. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    if (articleId) {
      fetchArticle();
    }
  }, [articleId]);

  const handleSave = async () => {
    // This will be handled by the ArticleEditor component
    console.log('Save triggered from edit page');
  };

  const handlePublish = async () => {
    // This will be handled by the ArticleEditor component
    console.log('Publish triggered from edit page');
  };

  if (loading) {
    return (
      <PremiumAdminLayout 
        title="Edit Article"
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Articles', href: '/admin/articles' },
          { label: 'Edit Article' }
        ]}
      >
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-gray-200 rounded-lg"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="h-64 bg-gray-200 rounded-lg"></div>
              <div className="h-96 bg-gray-200 rounded-lg"></div>
            </div>
            <div className="space-y-4">
              <div className="h-40 bg-gray-200 rounded-lg"></div>
              <div className="h-60 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        </div>
      </PremiumAdminLayout>
    );
  }

  if (error) {
    return (
      <PremiumAdminLayout 
        title="Edit Article"
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Articles', href: '/admin/articles' },
          { label: 'Edit Article' }
        ]}
      >
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Article</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <div className="space-x-3">
            <Button 
              variant="outline" 
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
            <Button 
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
          </div>
        </div>
      </PremiumAdminLayout>
    );
  }

  if (!article) {
    return (
      <PremiumAdminLayout 
        title="Edit Article"
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Articles', href: '/admin/articles' },
          { label: 'Edit Article' }
        ]}
      >
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Article Not Found</h3>
          <p className="text-gray-500 mb-4">The article you're looking for doesn't exist or has been deleted.</p>
          <Button 
            variant="outline" 
            onClick={() => router.push('/admin/articles')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Articles
          </Button>
        </div>
      </PremiumAdminLayout>
    );
  }

  return (
    <PremiumAdminLayout 
      title={`Edit: ${article.title_en}`}
      breadcrumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'Articles', href: '/admin/articles' },
        { label: article.title_en }
      ]}
      actions={
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            onClick={() => router.push('/admin/articles')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Articles
          </Button>
          <Button 
            variant="outline"
            onClick={() => window.open(`/blog/${article.slug}`, '_blank')}
          >
            <Eye className="h-4 w-4 mr-2" />
            {article.published ? 'View Live' : 'Preview'}
          </Button>
          <Button 
            variant="outline"
            onClick={handleSave}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>
          <Button 
            className="bg-blue-600 hover:bg-blue-700"
            onClick={handlePublish}
          >
            {article.published ? 'Update' : 'Publish'}
          </Button>
        </div>
      }
    >
      <Suspense fallback={
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-gray-200 rounded-lg"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="h-64 bg-gray-200 rounded-lg"></div>
              <div className="h-96 bg-gray-200 rounded-lg"></div>
            </div>
            <div className="space-y-4">
              <div className="h-40 bg-gray-200 rounded-lg"></div>
              <div className="h-60 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        </div>
      }>
        <ArticleEditor 
          mode="edit" 
          initialData={article}
          onSave={handleSave}
          onPublish={handlePublish}
        />
      </Suspense>
    </PremiumAdminLayout>
  );
}

