"use client";

import dynamic from "next/dynamic";
import { TabContainer } from "@/components/admin/tab-container";

const DesignContent = dynamic(() => import("./design-content"), { ssr: false });
const DesignStudioContent = dynamic(() => import("@/app/admin/design-studio/page"), { ssr: false });
const BrandAssetsContent = dynamic(() => import("@/app/admin/brand-assets/page"), { ssr: false });

const tabs = [
  { id: "gallery", label: "Gallery" },
  { id: "studio", label: "Studio" },
  { id: "brand", label: "Brand Assets" },
];

export default function DesignHubPage() {
  return (
    <TabContainer tabs={tabs} defaultTab="gallery" title="Design Hub">
      {(activeTab) => {
        switch (activeTab) {
          case "gallery": return <DesignContent />;
          case "studio": return <DesignStudioContent />;
          case "brand": return <BrandAssetsContent />;
          default: return <DesignContent />;
        }
      }}
    </TabContainer>
  );
}
