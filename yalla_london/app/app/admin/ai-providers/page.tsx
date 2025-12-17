'use client';

import React from 'react';
import AIProviderManager from '@/components/admin/ai-provider-manager';

export default function AIProvidersPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Providers</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Manage and configure AI providers for content generation, topic research, and SEO audits.
        </p>
      </div>

      <AIProviderManager />
    </div>
  );
}
