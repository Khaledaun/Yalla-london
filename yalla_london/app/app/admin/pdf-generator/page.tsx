'use client'

import { MophyAdminLayout } from '@/components/admin/mophy/mophy-admin-layout'
import { PDFWorkshop } from '@/components/admin/pdf-workshop'

export default function PDFGeneratorPage() {
  return (
    <MophyAdminLayout pageTitle="PDF Workshop">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">PDF Workshop</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Choose a template, fill in the details, generate, edit with AI prompts, then publish.
          </p>
        </div>
        <PDFWorkshop />
      </div>
    </MophyAdminLayout>
  )
}
