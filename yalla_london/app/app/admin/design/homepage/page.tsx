export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { Suspense } from 'react';
import { PremiumAdminLayout } from '@/src/components/admin/premium-admin-layout';
import { SimplifiedHomepageBuilder } from '@/src/components/admin/simplified-homepage-builder';

function HomepageBuilderSkeleton() {
  return (
    <div className="animate-pulse space-y-8">
      <div className="flex items-center justify-between">
        <div className="h-8 bg-gray-200 rounded w-64"></div>
        <div className="flex space-x-3">
          <div className="h-10 bg-gray-200 rounded w-24"></div>
          <div className="h-10 bg-gray-200 rounded w-32"></div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
        <div className="space-y-6">
          <div className="h-96 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    </div>
  );
}

export default function HomepageBuilderPage() {
  return (
    <PremiumAdminLayout 
      title="Homepage Builder"
      breadcrumbs={[
        { label: 'Design', href: '/admin/design' },
        { label: 'Homepage Builder' }
      ]}
    >
      <Suspense fallback={<HomepageBuilderSkeleton />}>
        <SimplifiedHomepageBuilder siteId="default" />
      </Suspense>
    </PremiumAdminLayout>
  );
}