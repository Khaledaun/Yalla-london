export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { Suspense } from 'react';
import { PremiumAdminLayout } from '@/src/components/admin/premium-admin-layout';
import { HomepageBuilder } from '@/src/components/admin/homepage-builder/homepage-builder';
import { HomepageBuilderSkeleton } from '@/src/components/admin/homepage-builder/homepage-builder-skeleton';

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
        <HomepageBuilder />
      </Suspense>
    </PremiumAdminLayout>
  );
}