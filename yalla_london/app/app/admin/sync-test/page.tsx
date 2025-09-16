/**
 * Admin Sync Test Page
 * Tests real-time sync between admin dashboard and public site
 */
'use client'

import { SyncTestTool } from '@/components/admin/sync-test-tool';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Database, Globe, Zap } from 'lucide-react';
import Link from 'next/link';

export default function SyncTestPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <div className="mb-8">
          <Link href="/admin">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Real-time Sync Testing
          </h1>
          <p className="text-lg text-gray-600">
            Test and verify the unified content pipeline between admin dashboard and public site
          </p>
        </div>

        {/* Pipeline Overview */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-blue-600" />
              Content Pipeline Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between py-4">
              <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-500 rounded-full" />
              <span className="text-sm font-medium">Admin Dashboard</span>
            </div>
            <div className="w-8 h-px bg-gray-300" />
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Database</span>
            </div>
            <div className="w-8 h-px bg-gray-300" />
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-medium">Cache Invalidation</span>
            </div>
            <div className="w-8 h-px bg-gray-300" />
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Public Site</span>
            </div>
              </div>
            </div>
            
            <div className="grid md:grid-cols-3 gap-4 mt-6">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-2">Single Source of Truth</h3>
                <p className="text-sm text-blue-700">
                  All content stored in PostgreSQL database with Prisma ORM
                </p>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg">
                <h3 className="font-medium text-yellow-900 mb-2">Instant Cache Invalidation</h3>
                <p className="text-sm text-yellow-700">
                  Next.js cache cleared immediately when content changes
                </p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <h3 className="font-medium text-green-900 mb-2">Real-time Updates</h3>
                <p className="text-sm text-green-700">
                  Public site reflects changes within seconds of admin actions
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sync Test Tool */}
        <SyncTestTool />

        {/* Instructions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>How to Use This Tool</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm font-bold">1</div>
                <div>
                  <p className="font-medium">Run Sync Test</p>
                <p className="text-sm text-gray-600">
                  Click &ldquo;Run Sync Test&rdquo; to create a test blog post and verify it appears on the public site
                </p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <div className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm font-bold">2</div>
                <div>
                  <p className="font-medium">Check Results</p>
                  <p className="text-sm text-gray-600">
                    The tool will show sync status, latency, and provide direct links to verify manually
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <div className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm font-bold">3</div>
                <div>
                  <p className="font-medium">Manual Verification</p>
                  <p className="text-sm text-gray-600">
                    Use the provided links to check the homepage, blog list, and individual post pages
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <div className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm font-bold">4</div>
                <div>
                  <p className="font-medium">Cleanup</p>
                <p className="text-sm text-gray-600">
                  Click &ldquo;Cleanup&rdquo; to remove the test content and keep your site clean
                </p>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>Expected Results:</strong> The sync test should complete in under 3 seconds with 
                all checks passing. If sync fails or takes longer than 5 seconds, there may be an issue 
                with the cache invalidation system or database connectivity.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}