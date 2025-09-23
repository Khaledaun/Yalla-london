'use client'

import { PremiumAdminLayout } from '@/src/components/admin/premium-admin-layout'
import PipelineTab from '@/components/admin/PipelineTab'

export default function PipelinePage() {
  return (
    <PremiumAdminLayout 
      title="Automation Pipeline"
      breadcrumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'Pipeline' }
      ]}
    >
      <PipelineTab />
    </PremiumAdminLayout>
  )
}
