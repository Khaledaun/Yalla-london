'use client';

import { PremiumAdminLayout } from '@/components/admin/premium-admin-layout';
import { WorkflowControlDashboard } from '@/components/admin/workflow-control-dashboard';

export default function WorkflowPage() {
  return (
    <PremiumAdminLayout
      title="Content Workflow"
      breadcrumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'Content Workflow' }
      ]}
    >
      <WorkflowControlDashboard />
    </PremiumAdminLayout>
  );
}
