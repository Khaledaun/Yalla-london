import { MophyAdminLayout } from '@/components/admin/mophy'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <MophyAdminLayout>{children}</MophyAdminLayout>
}
