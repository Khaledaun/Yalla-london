"use client";

import dynamic from "next/dynamic";
import { TabContainer } from "@/components/admin/tab-container";

const AffiliatesContent = dynamic(() => import("./affiliates-content"), { ssr: false });
const AffiliateLinksContent = dynamic(() => import("@/app/admin/affiliate-links/page"), { ssr: false });
const AffiliateMarketingContent = dynamic(() => import("@/app/admin/affiliate-marketing/page"), { ssr: false });
const AffiliatePoolContent = dynamic(() => import("@/app/admin/affiliate-pool/page"), { ssr: false });

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "links", label: "Links" },
  { id: "marketing", label: "Marketing" },
  { id: "pool", label: "Pool" },
];

export default function AffiliatesHubPage() {
  return (
    <TabContainer tabs={tabs} defaultTab="overview" title="Affiliates">
      {(activeTab) => {
        switch (activeTab) {
          case "overview": return <AffiliatesContent />;
          case "links": return <AffiliateLinksContent />;
          case "marketing": return <AffiliateMarketingContent />;
          case "pool": return <AffiliatePoolContent />;
          default: return <AffiliatesContent />;
        }
      }}
    </TabContainer>
  );
}
