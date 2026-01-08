'use client'

import PipelineTab from '@/components/admin/PipelineTab'

export default function PipelinePage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Automation Pipeline</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your content automation workflow</p>
      </div>
      <PipelineTab />
    </div>
  )
}
