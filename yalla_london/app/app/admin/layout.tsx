import { MophyAdminLayout } from '@/components/admin/mophy'
import { SiteProvider } from '@/components/site-provider'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SiteProvider>
      <MophyAdminLayout>{children}</MophyAdminLayout>
    </SiteProvider>
  )
}
