"use client";

import dynamic from "next/dynamic";
import { TabContainer } from "@/components/admin/tab-container";

const DeparturesContent = dynamic(() => import("./departures-content"), { ssr: false });
const CronLogsContent = dynamic(() => import("@/app/admin/cron-logs/page"), { ssr: false });
const CronMonitorContent = dynamic(() => import("@/app/admin/cron-monitor/page"), { ssr: false });

const tabs = [
  { id: "timeline", label: "Timeline" },
  { id: "logs", label: "Cron Logs" },
  { id: "health", label: "Health" },
];

export default function AutomationHubPage() {
  return (
    <TabContainer tabs={tabs} defaultTab="timeline" title="Timeline & Crons">
      {(activeTab) => {
        switch (activeTab) {
          case "timeline": return <DeparturesContent />;
          case "logs": return <CronLogsContent />;
          case "health": return <CronMonitorContent />;
          default: return <DeparturesContent />;
        }
      }}
    </TabContainer>
  );
}
