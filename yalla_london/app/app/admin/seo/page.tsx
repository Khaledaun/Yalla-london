"use client";

import dynamic from "next/dynamic";
import { TabContainer } from "@/components/admin/tab-container";

// Lazy-load existing page components as tab panels
const IndexingContent = dynamic(() => import("./indexing-content"), { ssr: false });
const SEOAuditsContent = dynamic(() => import("@/app/admin/seo-audits/page"), { ssr: false });
const SiteHealthContent = dynamic(() => import("@/app/admin/site-health/page"), { ssr: false });
const SEOReportContent = dynamic(() => import("@/app/admin/seo/report/page"), { ssr: false });
const AuditContent = dynamic(() => import("./audit-content"), { ssr: false });

const tabs = [
  { id: "indexing", label: "Indexing" },
  { id: "audits", label: "SEO Audits" },
  { id: "health", label: "Site Health" },
  { id: "report", label: "Report" },
  { id: "master-audit", label: "Master Audit" },
];

export default function SEOHubPage() {
  return (
    <TabContainer tabs={tabs} defaultTab="indexing" title="Indexing & SEO">
      {(activeTab) => {
        switch (activeTab) {
          case "indexing": return <IndexingContent />;
          case "audits": return <SEOAuditsContent />;
          case "health": return <SiteHealthContent />;
          case "report": return <SEOReportContent />;
          case "master-audit": return <AuditContent />;
          default: return <IndexingContent />;
        }
      }}
    </TabContainer>
  );
}
