"use client";

import dynamic from "next/dynamic";
import { TabContainer } from "@/components/admin/tab-container";

const TopicsContent = dynamic(() => import("./topics-content"), { ssr: false });
const PipelineContent = dynamic(() => import("@/app/admin/pipeline/page"), { ssr: false });
const TopicsPipelineContent = dynamic(() => import("@/app/admin/topics-pipeline/page"), { ssr: false });

const tabs = [
  { id: "topics", label: "Topics" },
  { id: "pipeline", label: "Pipeline" },
  { id: "generation", label: "Generation" },
];

export default function TopicsHubPage() {
  return (
    <TabContainer tabs={tabs} defaultTab="topics" title="Topics & Pipeline">
      {(activeTab) => {
        switch (activeTab) {
          case "topics": return <TopicsContent />;
          case "pipeline": return <PipelineContent />;
          case "generation": return <TopicsPipelineContent />;
          default: return <TopicsContent />;
        }
      }}
    </TabContainer>
  );
}
