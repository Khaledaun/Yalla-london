import { MophyAdminLayout } from "@/components/admin/mophy";
import { SiteProvider } from "@/components/site-provider";

// Admin pages are client-rendered with interactive elements - prevent static generation
export const dynamic = "force-dynamic";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SiteProvider>
      <MophyAdminLayout>{children}</MophyAdminLayout>
    </SiteProvider>
  );
}
