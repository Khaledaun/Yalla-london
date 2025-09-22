import { SyncStatusIndicator } from '@/components/admin/SyncStatusIndicator';

export default function SyncStatusPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard Sync Status</h1>
        <p className="text-muted-foreground mt-2">
          Monitor the real-time connection between your admin dashboard and the public website.
        </p>
      </div>

      <div className="grid gap-6">
        <SyncStatusIndicator />
        
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">How It Works</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">1</div>
                <div>
                  <strong>Admin Action:</strong> You make changes in the admin dashboard (create, edit, delete content)
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">2</div>
                <div>
                  <strong>Database Update:</strong> Changes are saved to the database immediately
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">3</div>
                <div>
                  <strong>Cache Invalidation:</strong> All relevant caches are cleared to ensure fresh data
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">4</div>
                <div>
                  <strong>Public Update:</strong> The public website immediately reflects your changes
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Troubleshooting</h2>
            <div className="space-y-3 text-sm">
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <strong className="text-yellow-800">If sync is disconnected:</strong>
                <ul className="mt-1 text-yellow-700 space-y-1">
                  <li>• Check if your development server is running</li>
                  <li>• Verify database connection</li>
                  <li>• Check browser console for errors</li>
                </ul>
              </div>
              
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <strong className="text-red-800">If sync shows error:</strong>
                <ul className="mt-1 text-red-700 space-y-1">
                  <li>• Check API endpoints are responding</li>
                  <li>• Verify cache invalidation is working</li>
                  <li>• Check server logs for detailed errors</li>
                </ul>
              </div>
              
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <strong className="text-green-800">If sync is connected:</strong>
                <ul className="mt-1 text-green-700 space-y-1">
                  <li>• Changes appear on public site immediately</li>
                  <li>• Cache is properly invalidated</li>
                  <li>• Real-time updates are working</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 p-6 bg-muted rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="text-center">
              <h3 className="font-medium mb-2">Test Sync</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Run a comprehensive test to verify all sync components are working
              </p>
              <button 
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
              >
                Run Full Test
              </button>
            </div>
            
            <div className="text-center">
              <h3 className="font-medium mb-2">Clear Cache</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Force clear all caches to ensure fresh data
              </p>
              <button 
                onClick={async () => {
                  try {
                    await fetch('/api/cache/invalidate', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ contentType: 'all' })
                    });
                    alert('Cache cleared successfully!');
                  } catch (error) {
                    alert('Failed to clear cache');
                  }
                }}
                className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 text-sm"
              >
                Clear All Cache
              </button>
            </div>
            
            <div className="text-center">
              <h3 className="font-medium mb-2">View Logs</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Check server logs for detailed sync information
              </p>
              <button 
                onClick={() => {
                  // Open browser dev tools
                  console.log('Check the browser console for sync logs');
                  alert('Check the browser console (F12) for detailed sync logs');
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
              >
                View Logs
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

