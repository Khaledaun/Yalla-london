"use client";

import OpsCenter from "@/components/admin/OpsCenter";

export default function OpsPage() {
  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Operations Center</h1>
        <p className="text-sm text-gray-500 mt-1">
          System health, pipeline status, cron schedule, and intelligent insights
        </p>
      </div>
      <OpsCenter />
    </div>
  );
}
