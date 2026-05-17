/**
 * Admin Sync Test Page
 * Tests real-time sync between admin dashboard and public site
 */
'use client'

import { SyncTestTool } from '@/components/admin/sync-test-tool';
import {
  AdminCard,
  AdminPageHeader,
  AdminSectionLabel,
  AdminAlertBanner,
} from '@/components/admin/admin-ui';
import { Database, Globe, Zap } from 'lucide-react';

export default function SyncTestPage() {
  return (
    <div className="admin-page p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <AdminPageHeader
          title="Real-time Sync Testing"
          subtitle="Test and verify the unified content pipeline between admin and public site"
          backHref="/admin"
        />

        {/* Pipeline Overview */}
        <AdminCard className="mb-4">
          <div className="flex items-center gap-2 mb-4">
            <Database className="w-4 h-4" style={{ color: '#3B7EA1' }} />
            <AdminSectionLabel>Content Pipeline Overview</AdminSectionLabel>
          </div>

          {/* Flow visualization */}
          <div className="flex items-center justify-center gap-2 py-4 overflow-x-auto">
            {[
              { icon: <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#7C3AED' }} />, label: 'Admin Dashboard' },
              null,
              { icon: <Database className="w-3.5 h-3.5" style={{ color: '#3B7EA1' }} />, label: 'Database' },
              null,
              { icon: <Zap className="w-3.5 h-3.5" style={{ color: '#C49A2A' }} />, label: 'Cache Invalidation' },
              null,
              { icon: <Globe className="w-3.5 h-3.5" style={{ color: '#2D5A3D' }} />, label: 'Public Site' },
            ].map((item, i) =>
              item === null ? (
                <div key={`sep-${i}`} className="w-6 h-px" style={{ backgroundColor: 'rgba(214,208,196,0.6)' }} />
              ) : (
                <div key={i} className="flex items-center gap-1.5 flex-shrink-0">
                  {item.icon}
                  <span style={{ fontFamily: 'var(--font-system)', fontSize: 11, fontWeight: 600, color: '#44403C' }}>
                    {item.label}
                  </span>
                </div>
              )
            )}
          </div>

          {/* Feature cards */}
          <div className="grid md:grid-cols-3 gap-3 mt-4">
            {[
              {
                title: 'Single Source of Truth',
                desc: 'All content stored in PostgreSQL database with Prisma ORM',
                color: '#3B7EA1',
              },
              {
                title: 'Instant Cache Invalidation',
                desc: 'Next.js cache cleared immediately when content changes',
                color: '#C49A2A',
              },
              {
                title: 'Real-time Updates',
                desc: 'Public site reflects changes within seconds of admin actions',
                color: '#2D5A3D',
              },
            ].map((card) => (
              <div
                key={card.title}
                className="p-4 rounded-lg"
                style={{
                  backgroundColor: '#FAF8F4',
                  border: '1px solid rgba(214,208,196,0.6)',
                  borderTop: `3px solid ${card.color}`,
                }}
              >
                <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: '#1C1917', marginBottom: 6 }}>
                  {card.title}
                </p>
                <p style={{ fontFamily: 'var(--font-system)', fontSize: 11, color: '#78716C', lineHeight: 1.5 }}>
                  {card.desc}
                </p>
              </div>
            ))}
          </div>
        </AdminCard>

        {/* Sync Test Tool */}
        <SyncTestTool />

        {/* Instructions */}
        <AdminCard className="mt-4">
          <AdminSectionLabel>How to Use This Tool</AdminSectionLabel>

          <div className="space-y-3 mt-3">
            {[
              {
                step: '1',
                title: 'Run Sync Test',
                desc: 'Click "Run Sync Test" to create a test blog post and verify it appears on the public site',
              },
              {
                step: '2',
                title: 'Check Results',
                desc: 'The tool will show sync status, latency, and provide direct links to verify manually',
              },
              {
                step: '3',
                title: 'Manual Verification',
                desc: 'Use the provided links to check the homepage, blog list, and individual post pages',
              },
              {
                step: '4',
                title: 'Cleanup',
                desc: 'Click "Cleanup" to remove the test content and keep your site clean',
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-3 items-start">
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{
                    backgroundColor: '#C8322B',
                    fontFamily: 'var(--font-display)',
                    fontSize: 10,
                    fontWeight: 700,
                    color: '#FAF8F4',
                  }}
                >
                  {item.step}
                </span>
                <div>
                  <p style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: '#1C1917' }}>
                    {item.title}
                  </p>
                  <p style={{ fontFamily: 'var(--font-system)', fontSize: 11, color: '#78716C', marginTop: 2, lineHeight: 1.5 }}>
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <AdminAlertBanner
              severity="warning"
              message="Expected Results"
              detail="The sync test should complete in under 3 seconds with all checks passing. If sync fails or takes longer than 5 seconds, there may be an issue with the cache invalidation system or database connectivity."
            />
          </div>
        </AdminCard>
      </div>
    </div>
  );
}
