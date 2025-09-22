'use client'

import { ReactNode } from 'react'
import { AdminNavigation } from './admin-navigation'

interface PremiumAdminLayoutProps {
  children: ReactNode
}

export function PremiumAdminLayout({ children }: PremiumAdminLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavigation />
      <main className="lg:ml-64">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
