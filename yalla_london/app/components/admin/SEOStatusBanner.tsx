'use client';

import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Settings, 
  ExternalLink,
  Info
} from 'lucide-react';
import { 
  isSEOEnabled, 
  isAISEOEnabled, 
  isAnalyticsEnabled,
  getFeatureFlagStatus,
  getAllFeatureFlags
} from '@/lib/flags';

interface MissingEnvVar {
  key: string;
  requiredFor: string;
  description: string;
}

interface SEOStatusBannerProps {
  className?: string;
}

export function SEOStatusBanner({ className = '' }: SEOStatusBannerProps) {
  const [missingEnvVars, setMissingEnvVars] = React.useState<MissingEnvVar[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    checkMissingEnvironmentVariables();
  }, []);

  const checkMissingEnvironmentVariables = () => {
    const missing: MissingEnvVar[] = [];
    const allFlags = getAllFeatureFlags();

    // Check each feature flag and its dependencies
    Object.entries(allFlags).forEach(([flagKey, flag]) => {
      if (flag.enabled && flag.requiredEnvVars) {
        flag.requiredEnvVars.forEach(envVar => {
          if (!process.env[envVar]) {
            missing.push({
              key: envVar,
              requiredFor: flagKey,
              description: flag.description
            });
          }
        });
      }
    });

    setMissingEnvVars(missing);
    setIsLoading(false);
  };

  const getStatusIcon = () => {
    if (isLoading) return <Info className="h-4 w-4" />;
    if (!isSEOEnabled()) return <XCircle className="h-4 w-4 text-red-500" />;
    if (missingEnvVars.length > 0) return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  const getStatusColor = () => {
    if (isLoading) return 'border-blue-200 bg-blue-50';
    if (!isSEOEnabled()) return 'border-red-200 bg-red-50';
    if (missingEnvVars.length > 0) return 'border-yellow-200 bg-yellow-50';
    return 'border-green-200 bg-green-50';
  };

  const getStatusTitle = () => {
    if (isLoading) return 'Checking SEO Configuration...';
    if (!isSEOEnabled()) return 'SEO Features Disabled';
    if (missingEnvVars.length > 0) return 'SEO Configuration Incomplete';
    return 'SEO System Ready';
  };

  const getStatusDescription = () => {
    if (isLoading) return 'Verifying environment variables and feature flags...';
    
    if (!isSEOEnabled()) {
      return (
        <div className="space-y-2">
          <p>SEO features are currently disabled. Enable them to access SEO tools and automation.</p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-xs">
              FEATURE_SEO=0
            </Badge>
            <Badge variant="outline" className="text-xs">
              NEXT_PUBLIC_FEATURE_SEO=0
            </Badge>
          </div>
        </div>
      );
    }

    if (missingEnvVars.length > 0) {
      return (
        <div className="space-y-3">
          <p>Some enabled features are missing required environment variables:</p>
          <div className="space-y-2">
            {missingEnvVars.map((envVar, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <XCircle className="h-3 w-3 text-red-500" />
                <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                  {envVar.key}
                </code>
                <span className="text-gray-600">
                  (required for {envVar.requiredFor})
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <p>All SEO features are properly configured and ready to use.</p>
        <div className="flex flex-wrap gap-2">
          <Badge variant="default" className="bg-green-500 text-xs">
            SEO Enabled
          </Badge>
          {isAISEOEnabled() && (
            <Badge variant="default" className="bg-blue-500 text-xs">
              AI SEO
            </Badge>
          )}
          {isAnalyticsEnabled() && (
            <Badge variant="default" className="bg-purple-500 text-xs">
              Analytics
            </Badge>
          )}
        </div>
      </div>
    );
  };

  // Don't show banner if everything is working perfectly
  if (!isLoading && isSEOEnabled() && missingEnvVars.length === 0) {
    return null;
  }

  return (
    <Alert className={`${getStatusColor()} ${className}`}>
      <div className="flex items-start gap-3">
        {getStatusIcon()}
        <div className="flex-1">
          <AlertTitle className="flex items-center gap-2">
            {getStatusTitle()}
            <Button
              variant="ghost"
              size="sm"
              onClick={checkMissingEnvironmentVariables}
              className="h-6 w-6 p-0"
            >
              <Settings className="h-3 w-3" />
            </Button>
          </AlertTitle>
          <AlertDescription className="mt-2">
            {getStatusDescription()}
          </AlertDescription>
          
          {/* Action buttons */}
          <div className="flex gap-2 mt-3">
            {!isSEOEnabled() && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open('/docs/seo-activation.md', '_blank')}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Enable SEO
              </Button>
            )}
            
            {missingEnvVars.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open('/docs/vercel-env-checklist.md', '_blank')}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                View Env Guide
              </Button>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('/api/seo/health', '_blank')}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Health Check
            </Button>
          </div>
        </div>
      </div>
    </Alert>
  );
}

export default SEOStatusBanner;



