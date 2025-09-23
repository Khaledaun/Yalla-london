'use client'

import { useState } from 'react'
import { Database, CheckCircle, XCircle, Loader2 } from 'lucide-react'

export default function TestDatabase() {
  const [testResult, setTestResult] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  const runDatabaseTest = async () => {
    setIsLoading(true)
    setTestResult(null)

    try {
      const response = await fetch('/api/test/article-creation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const result = await response.json()
      setTestResult(result)
    } catch (error) {
      setTestResult({
        success: false,
        error: 'Failed to connect to API',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex items-center gap-3 mb-6">
            <Database className="h-8 w-8 text-blue-500" />
            <h1 className="text-3xl font-bold text-gray-900">Database Connection Test</h1>
          </div>

          <p className="text-gray-600 mb-8">
            This page tests the database connection and article creation functionality.
            Click the button below to run a comprehensive test.
          </p>

          <button
            onClick={runDatabaseTest}
            disabled={isLoading}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Database className="h-5 w-5" />
            )}
            {isLoading ? 'Testing Database...' : 'Test Database Connection'}
          </button>

          {testResult && (
            <div className="mt-8">
              {testResult.success ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                    <h2 className="text-xl font-semibold text-green-800">Test Successful!</h2>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium text-green-800 mb-2">Article Created:</h3>
                      <div className="bg-white p-4 rounded border">
                        <p><strong>ID:</strong> {testResult.data.article.id}</p>
                        <p><strong>Title:</strong> {testResult.data.article.title}</p>
                        <p><strong>Slug:</strong> {testResult.data.article.slug}</p>
                        <p><strong>Status:</strong> {testResult.data.article.status}</p>
                        <p><strong>Created:</strong> {new Date(testResult.data.article.createdAt).toLocaleString()}</p>
                        <p><strong>Content Length:</strong> {testResult.data.article.contentLength} characters</p>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-medium text-green-800 mb-2">Database Status:</h3>
                      <div className="bg-white p-4 rounded border">
                        <p><strong>Connection:</strong> {testResult.data.database.connection}</p>
                        <p><strong>Total Articles:</strong> {testResult.data.database.totalArticles}</p>
                        <p><strong>Table Exists:</strong> {testResult.data.database.tableExists ? 'Yes' : 'No'}</p>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-medium text-green-800 mb-2">Generated URLs:</h3>
                      <div className="bg-white p-4 rounded border">
                        <p><strong>Public URL:</strong> 
                          <a href={testResult.data.publicUrl} target="_blank" rel="noopener noreferrer" 
                             className="text-blue-600 hover:underline ml-2">
                            {testResult.data.publicUrl}
                          </a>
                        </p>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-medium text-green-800 mb-2">Summary:</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white p-3 rounded border">
                          <p className="text-sm text-gray-600">Database Connection</p>
                          <p className="font-medium text-green-600">{testResult.data.summary.databaseConnection}</p>
                        </div>
                        <div className="bg-white p-3 rounded border">
                          <p className="text-sm text-gray-600">Article Creation</p>
                          <p className="font-medium text-green-600">{testResult.data.summary.articleCreation}</p>
                        </div>
                        <div className="bg-white p-3 rounded border">
                          <p className="text-sm text-gray-600">Data Persistence</p>
                          <p className="font-medium text-green-600">{testResult.data.summary.dataPersistence}</p>
                        </div>
                        <div className="bg-white p-3 rounded border">
                          <p className="text-sm text-gray-600">Article Retrieval</p>
                          <p className="font-medium text-green-600">{testResult.data.summary.articleRetrieval}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-green-100 rounded-lg">
                    <h3 className="font-medium text-green-800 mb-2">🎉 Dashboard Status: FULLY FUNCTIONAL</h3>
                    <p className="text-green-700">
                      Your dashboard is connected to the database and can create, save, and retrieve articles.
                      You can now use all the features including the AI Review, hero photo management, 
                      affiliate marketing, and SEO analytics.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <XCircle className="h-6 w-6 text-red-600" />
                    <h2 className="text-xl font-semibold text-red-800">Test Failed</h2>
                  </div>

                  <div className="space-y-2">
                    <p><strong>Error:</strong> {testResult.error}</p>
                    <p><strong>Details:</strong> {testResult.details}</p>
                  </div>

                  <div className="mt-4 p-4 bg-red-100 rounded-lg">
                    <h3 className="font-medium text-red-800 mb-2">💡 Troubleshooting:</h3>
                    <ul className="text-red-700 space-y-1">
                      <li>• Check if the development server is running</li>
                      <li>• Verify database connection settings</li>
                      <li>• Check environment variables in .env.local</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-blue-800 mb-2">Next Steps:</h3>
            <ul className="text-blue-700 space-y-1">
              <li>• <a href="/admin" className="hover:underline">Visit Admin Dashboard</a></li>
              <li>• <a href="/admin/editor" className="hover:underline">Create New Article</a></li>
              <li>• <a href="/admin/content" className="hover:underline">Manage Content</a></li>
              <li>• <a href="/admin/affiliate-marketing" className="hover:underline">Manage Affiliates</a></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
