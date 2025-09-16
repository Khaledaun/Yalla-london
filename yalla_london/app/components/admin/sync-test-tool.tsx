/**
 * Real-time Sync Test Component for Admin Dashboard
 * Allows testing and verification of admin → database → public site sync
 */
'use client'

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle, Clock, ExternalLink, RefreshCw, Trash2, Zap } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SyncTestResult {
  success: boolean;
  synced: boolean;
  latency?: number;
  error?: string;
  testContent?: {
    id: string;
    title: string;
    slug: string;
    published: boolean;
    created_at: string;
  };
  publicUrls?: {
    blogPost: string;
    blogList: string;
    homepage: string;
  };
}

export function SyncTestTool() {
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [results, setResults] = useState<SyncTestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testContentId, setTestContentId] = useState<string | null>(null);

  const steps = [
    'Creating test blog post',
    'Triggering cache invalidation',
    'Verifying database sync',
    'Checking public API response',
    'Validating real-time updates'
  ];

  const runSyncTest = async () => {
    setIsRunning(true);
    setCurrentStep(0);
    setResults(null);
    setError(null);

    try {
      // Step 1: Create test content
      setCurrentStep(1);
      const createResponse = await fetch('/api/admin/sync-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-test-content',
          contentType: 'blog'
        })
      });

      if (!createResponse.ok) {
        throw new Error(`Failed to create test content: ${createResponse.status}`);
      }

      const createData = await createResponse.json();
      
      if (!createData.success) {
        throw new Error(createData.error || 'Failed to create test content');
      }

      setTestContentId(createData.testContent.id);

      // Step 2-3: Wait for cache invalidation and database sync
      setCurrentStep(2);
      await new Promise(resolve => setTimeout(resolve, 1000));

      setCurrentStep(3);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 4-5: Verify sync
      setCurrentStep(4);
      const verifyResponse = await fetch('/api/admin/sync-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify-sync',
          contentType: 'blog',
          contentId: createData.testContent.id,
          expectedData: {
            id: createData.testContent.id,
            title: createData.testContent.title,
            published: createData.testContent.published
          }
        })
      });

      if (!verifyResponse.ok) {
        throw new Error(`Sync verification failed: ${verifyResponse.status}`);
      }

      const verifyData = await verifyResponse.json();
      
      setCurrentStep(5);
      
      setResults({
        success: verifyData.success,
        synced: verifyData.synced,
        latency: verifyData.latency,
        testContent: createData.testContent,
        publicUrls: createData.publicUrls
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setResults({
        success: false,
        synced: false,
        error: errorMessage
      });
    } finally {
      setIsRunning(false);
      setCurrentStep(5);
    }
  };

  const cleanupTest = async () => {
    if (!testContentId) return;

    try {
      const response = await fetch('/api/admin/sync-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cleanup-test',
          contentType: 'blog',
          contentId: testContentId
        })
      });

      if (response.ok) {
        setTestContentId(null);
        setResults(null);
        setError(null);
      }
    } catch (err) {
      console.error('Cleanup failed:', err);
    }
  };

  const getSyncStatus = () => {
    if (error) return { color: 'bg-red-500', icon: AlertCircle, text: 'Failed' };
    if (!results) return { color: 'bg-gray-400', icon: Clock, text: 'Not Started' };
    if (results.synced) return { color: 'bg-green-500', icon: CheckCircle, text: 'Synced' };
    return { color: 'bg-yellow-500', icon: AlertCircle, text: 'Partial' };
  };

  const status = getSyncStatus();
  const StatusIcon = status.icon;

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-purple-600" />
          Real-time Sync Test
        </CardTitle>
        <p className="text-sm text-gray-600">
          Test the pipeline: Admin Dashboard → Database → Public Site
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Overview */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${status.color}`} />
            <span className="font-medium">Sync Status: {status.text}</span>
            <StatusIcon className="h-4 w-4" />
          </div>
          {results?.latency && (
            <Badge variant="outline">
              {results.latency}ms
            </Badge>
          )}
        </div>

        {/* Progress Steps */}
        {isRunning && (
          <div className="space-y-2">
            <Progress value={(currentStep / steps.length) * 100} className="w-full" />
            <p className="text-sm text-gray-600">
              {steps[currentStep - 1] || 'Preparing test...'}
            </p>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Results Display */}
        {results && !error && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-blue-900">Database Check</p>
                <p className="text-xs text-blue-700">
                  {results.success ? '✅ Content found' : '❌ Content missing'}
                </p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-sm font-medium text-green-900">Public API Check</p>
                <p className="text-xs text-green-700">
                  {results.synced ? '✅ Sync verified' : '❌ Not synced'}
                </p>
              </div>
            </div>

            {results.publicUrls && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Test the sync manually:</p>
                <div className="space-y-1">
                  {Object.entries(results.publicUrls).map(([key, url]) => (
                    <div key={key} className="flex items-center gap-2 text-sm">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-0 h-auto text-blue-600 hover:text-blue-700"
                        onClick={() => window.open(url, '_blank')}
                      >
                        {key === 'blogPost' ? 'Blog Post' : 
                         key === 'blogList' ? 'Blog List' : 'Homepage'}
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button 
            onClick={runSyncTest} 
            disabled={isRunning}
            className="flex-1"
          >
            {isRunning ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Zap className="h-4 w-4 mr-2" />
            )}
            {isRunning ? 'Testing...' : 'Run Sync Test'}
          </Button>
          
          {testContentId && (
            <Button 
              onClick={cleanupTest}
              variant="outline"
              disabled={isRunning}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Cleanup
            </Button>
          )}
        </div>

        {/* Instructions */}
        <div className="text-xs text-gray-500 space-y-1">
          <p><strong>What this test does:</strong></p>
          <ul className="list-disc ml-4 space-y-1">
            <li>Creates a test blog post via admin API</li>
            <li>Triggers automatic cache invalidation</li>
            <li>Verifies the post appears in public API responses</li>
            <li>Checks real-time sync latency</li>
            <li>Provides direct links to test manually</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}