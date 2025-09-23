import AdminNavigation from '../components/admin/navigation'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 bg-gray-50 z-50">
      <AdminNavigation />
      <div className="lg:ml-64 h-full overflow-auto">
        {children}
      </div>
    </div>
  )
}