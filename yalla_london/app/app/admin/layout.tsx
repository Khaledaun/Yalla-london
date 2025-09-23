import AdminNavigation from '../components/admin/navigation'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>Yalla London Admin</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="font-tajawal antialiased" suppressHydrationWarning>
        <div className="min-h-screen bg-gray-50">
          <AdminNavigation />
          <div className="lg:ml-64">
            {children}
          </div>
        </div>
      </body>
    </html>
  )
}