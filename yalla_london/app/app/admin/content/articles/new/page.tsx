export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { Suspense } from 'react';
import { ArticleEditor } from '@/components/admin/article-editor';

export default function NewArticlePage() {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create New Article</h1>
          <p className="text-sm text-gray-500 mt-1">Write and publish new content</p>
        </div>
        <div className="flex items-center space-x-2">
          <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
            Save Draft
          </button>
          <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700">
            Publish
          </button>
        </div>
      </div>
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
        <ArticleEditor />
      </Suspense>
    </div>
  );
}
