'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';

interface HealthStatus {
  ok: boolean;
  timestamp: string;
  environment: string;
  version?: string;
  uptime?: number;
  memory?: {
    used: number;
    total: number;
  };
  services?: {
    database: string;
    seo: string;
  };
}

interface SEOHealthStatus {
  ok: boolean;
  timestamp: string;
  environment: string;
  seo: {
    enabled: boolean;
    aiEnabled: boolean;
    analyticsEnabled: boolean;
    databaseConnected: boolean;
  };
  featureFlags: Record<string, {
    enabled: boolean;
    hasDependencies: boolean;
    missingDependencies: string[];
  }>;
  reasons: string[];
  recommendations: string[];
}

export default function ReadyPage() {
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [seoHealthStatus, setSeoHealthStatus] = useState<SEOHealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkHealth = async () => {
    setLoading(true);
    try {
      // Check general health
      const healthResponse = await fetch('/api/health');
      const healthData = await healthResponse.json();
      setHealthStatus(healthData);

      // Check SEO health
      const seoHealthResponse = await fetch('/api/seo/health');
      const seoHealthData = await seoHealthResponse.json();
      setSeoHealthStatus(seoHealthData);

      setLastChecked(new Date());
    } catch (error) {
      console.error('Health check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  const getStatusIcon = (ok: boolean) => {
    return ok ? (
      <CheckCircle className="h-6 w-6 text-green-500" />
    ) : (
      <XCircle className="h-6 w-6 text-red-500" />
    );
  };

  const getStatusBadge = (ok: boolean) => {
    return ok ? (
      <Badge variant="default" className="bg-green-500">
        <CheckCircle className="h-3 w-3 mr-1" />
        Ready
      </Badge>
    ) : (
      <Badge variant="destructive">
        <XCircle className="h-3 w-3 mr-1" />
        Issues Found
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🚀 Deployment Status
          </h1>
          <p className="text-lg text-gray-600">
            Yalla London Application Health Check
          </p>
        </div>

        {/* Overall Status */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {healthStatus && getStatusIcon(healthStatus.ok)}
                Overall Status
              </CardTitle>
              <div className="flex items-center gap-2">
                {healthStatus && getStatusBadge(healthStatus.ok)}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={checkHealth}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-2 text-gray-600">Checking health status...</p>
              </div>
            ) : healthStatus ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Environment</p>
                  <p className="font-semibold capitalize">{healthStatus.environment}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Version</p>
                  <p className="font-semibold">{healthStatus.version || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Last Checked</p>
                  <p className="font-semibold">
                    {lastChecked?.toLocaleTimeString() || 'Never'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                <p className="text-red-600">Failed to load health status</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Health Endpoints */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ExternalLink className="h-5 w-5" />
                General Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => window.open('/api/health', '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  /api/health
                </Button>
                {healthStatus && (
                  <div className="text-sm text-gray-600">
                    <p>Status: {healthStatus.ok ? '✅ Healthy' : '❌ Issues'}</p>
                    {healthStatus.uptime && (
                      <p>Uptime: {Math.round(healthStatus.uptime)}s</p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ExternalLink className="h-5 w-5" />
                SEO Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => window.open('/api/seo/health', '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  /api/seo/health
                </Button>
                {seoHealthStatus && (
                  <div className="text-sm text-gray-600">
                    <p>Status: {seoHealthStatus.ok ? '✅ Ready' : '❌ Issues'}</p>
                    <p>SEO: {seoHealthStatus.seo.enabled ? '✅ Enabled' : '❌ Disabled'}</p>
                    <p>DB: {seoHealthStatus.seo.databaseConnected ? '✅ Connected' : '❌ Issues'}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* SEO Status Details */}
        {seoHealthStatus && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getStatusIcon(seoHealthStatus.ok)}
                SEO System Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Feature Flags */}
                <div>
                  <h4 className="font-semibold mb-2">Feature Flags</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {Object.entries(seoHealthStatus.featureFlags).map(([flag, status]) => (
                      <div key={flag} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm font-mono">{flag}</span>
                        <Badge variant={status.enabled ? 'default' : 'secondary'}>
                          {status.enabled ? 'ON' : 'OFF'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Issues */}
                {seoHealthStatus.reasons.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 text-red-600">Issues Found</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {seoHealthStatus.reasons.map((reason, index) => (
                        <li key={index} className="text-sm text-red-600">{reason}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommendations */}
                {seoHealthStatus.recommendations.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 text-blue-600">Recommendations</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {seoHealthStatus.recommendations.map((rec, index) => (
                        <li key={index} className="text-sm text-blue-600">{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center mt-8 text-gray-500">
          <p className="text-sm">
            Last updated: {lastChecked?.toLocaleString() || 'Never'} | 
            Environment: {healthStatus?.environment || 'Unknown'}
          </p>
        </div>
      </div>
    </div>
  );
}



