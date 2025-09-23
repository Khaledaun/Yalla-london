import AdminNavigation from '../components/admin/navigation'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavigation />
      <div className="lg:ml-64">
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  )
}