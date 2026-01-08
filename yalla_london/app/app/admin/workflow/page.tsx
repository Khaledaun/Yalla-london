'use client';

import { WorkflowControlDashboard } from '@/components/admin/workflow-control-dashboard';

export default function WorkflowPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Content Workflow</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your content generation pipeline from topics to publishing
        </p>
      </div>
      <WorkflowControlDashboard />
    </div>
  );
}
