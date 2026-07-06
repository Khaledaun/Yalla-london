'use client';

import { WorkflowControlDashboard } from '@/components/admin/workflow-control-dashboard';

export default function WorkflowPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <div>
        <h1 style={{ fontFamily: "'Anybody',sans-serif", fontWeight: 800, fontSize: 24, color: "#1C1917", letterSpacing: -0.5 }}>
          Workflow Control
        </h1>
        <div style={{ fontFamily: "'IBM Plex Sans Arabic',sans-serif", fontSize: 12, color: "#78716C", letterSpacing: 0, marginTop: 2 }}>
          التحكم في سير العمل
        </div>
        <p style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: "#78716C", marginTop: 6, textTransform: "uppercase", letterSpacing: 1 }}>
          Manage content generation pipeline · topic → draft → publish → index
        </p>
      </div>
      <WorkflowControlDashboard />
    </div>
  );
}
