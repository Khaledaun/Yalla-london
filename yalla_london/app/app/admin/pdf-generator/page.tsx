'use client'

import { MophyAdminLayout } from '@/components/admin/mophy/mophy-admin-layout'
import { PDFGenerator } from '@/components/admin/pdf-generator'

export default function PDFGeneratorPage() {
  return (
    <MophyAdminLayout pageTitle="PDF Generator">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI PDF Generator</h1>
            <p className="text-gray-500 dark:text-gray-400">
              Create professional PDF guides using Claude AI
            </p>
          </div>
        </div>
        <PDFGenerator />
      </div>
    </MophyAdminLayout>
  )
}
