'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArticleEditor } from '@/components/admin/article-editor';
import { Save, Eye, FileText, AlertTriangle } from 'lucide-react';
import {
  AdminPageHeader,
  AdminButton,
  AdminLoadingState,
  AdminEmptyState,
  AdminAlertBanner,
  AdminStatusBadge,
} from '@/components/admin/admin-ui';

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
    if (!article) return;
    try {
      const response = await fetch(`/api/admin/blog-posts/${article.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: false }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Save failed');
      }
      alert('Draft saved successfully');
    } catch (err) {
      alert('Save failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handlePublish = async () => {
    if (!article) return;
    try {
      const response = await fetch(`/api/admin/blog-posts/${article.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: article.published ? 'unpublish' : 'publish' }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Action failed');
      }
      const result = await response.json();
      alert(result.message || 'Success');
      setArticle(prev => prev ? { ...prev, published: !prev.published } : prev);
    } catch (err) {
      alert('Action failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  if (loading) {
    return (
      <div className="admin-page p-4 md:p-6">
        <AdminPageHeader
          title="Edit Article"
          subtitle="Loading article..."
          backHref="/admin/articles"
        />
        <AdminLoadingState label="Loading article..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-page p-4 md:p-6">
        <AdminPageHeader
          title="Edit Article"
          subtitle="Something went wrong"
          backHref="/admin/articles"
        />
        <AdminAlertBanner
          severity="critical"
          message="Error Loading Article"
          detail={error}
        />
        <AdminEmptyState
          icon={AlertTriangle}
          title="Could not load article"
          description={error}
          action={
            <div className="flex items-center gap-2">
              <AdminButton
                variant="secondary"
                size="sm"
                onClick={() => router.back()}
              >
                Go Back
              </AdminButton>
              <AdminButton
                variant="primary"
                size="sm"
                onClick={() => window.location.reload()}
              >
                Try Again
              </AdminButton>
            </div>
          }
        />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="admin-page p-4 md:p-6">
        <AdminPageHeader
          title="Edit Article"
          subtitle="Article not found"
          backHref="/admin/articles"
        />
        <AdminEmptyState
          icon={FileText}
          title="Article Not Found"
          description="The article you are looking for does not exist or has been deleted."
          action={
            <AdminButton
              variant="secondary"
              size="sm"
              onClick={() => router.push('/admin/articles')}
            >
              Back to Articles
            </AdminButton>
          }
        />
      </div>
    );
  }

  return (
    <div className="admin-page p-4 md:p-6">
      <AdminPageHeader
        title={`Edit: ${article.title_en}`}
        subtitle="Modify article content and settings"
        backHref="/admin/articles"
        action={
          <div className="flex items-center gap-2">
            <AdminStatusBadge status={article.published ? 'published' : 'draft'} />
            <AdminButton
              variant="ghost"
              size="sm"
              onClick={() => window.open(`/blog/${article.slug}`, '_blank')}
            >
              <Eye size={14} />
              {article.published ? 'View Live' : 'Preview'}
            </AdminButton>
            <AdminButton
              variant="secondary"
              size="sm"
              onClick={handleSave}
            >
              <Save size={14} />
              Save Draft
            </AdminButton>
            <AdminButton
              variant="primary"
              size="sm"
              onClick={handlePublish}
            >
              {article.published ? 'Update' : 'Publish'}
            </AdminButton>
          </div>
        }
      />

      <Suspense fallback={<AdminLoadingState label="Loading editor..." />}>
        <ArticleEditor
          mode="edit"
          initialData={article}
          onSave={handleSave}
          onPublish={handlePublish}
        />
      </Suspense>
    </div>
  );
}
