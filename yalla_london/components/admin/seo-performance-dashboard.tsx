
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Search, 
  BarChart3, 
  Zap,
  Globe,
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  TrendingUp,
  Eye,
  Clock,
  Smartphone,
  Monitor,
  Settings
} from 'lucide-react';
import { motion } from 'framer-motion';

interface SEOMetrics {
  lighthouse: {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
    pwa?: number;
  };
  coreWebVitals: {
    lcp: number;
    fid: number;
    cls: number;
    fcp: number;
    tti: number;
  };
  technical: {
    metaTags: boolean;
    structuredData: boolean;
    sitemap: boolean;
    robotsTxt: boolean;
    canonicalTags: boolean;
    hreflang: boolean;
    httpsEnabled: boolean;
    mobileOptimized: boolean;
  };
  pages: {
    indexed: number;
    errors: number;
    warnings: number;
    total: number;
  };
}

export function SEOPerformanceDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [metrics, setMetrics] = useState<SEOMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    fetchSEOMetrics();
  }, []);

  const fetchSEOMetrics = async () => {
    setIsLoading(true);
    try {
      // Simulate API call - in real implementation, this would fetch from actual SEO tools
      setTimeout(() => {
        setMetrics({
          lighthouse: {
            performance: 92,
            accessibility: 95,
            bestPractices: 88,
            seo: 96,
            pwa: 85
          },
          coreWebVitals: {
            lcp: 1.2, // Largest Contentful Paint (seconds)
            fid: 8,   // First Input Delay (milliseconds)
            cls: 0.05, // Cumulative Layout Shift
            fcp: 0.9,  // First Contentful Paint (seconds)
            tti: 2.1   // Time to Interactive (seconds)
          },
          technical: {
            metaTags: true,
            structuredData: true,
            sitemap: true,
            robotsTxt: true,
            canonicalTags: true,
            hreflang: true,
            httpsEnabled: true,
            mobileOptimized: true
          },
          pages: {
            indexed: 28,
            errors: 2,
            warnings: 5,
            total: 35
          }
        });
        setLastUpdated(new Date());
        setIsLoading(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to fetch SEO metrics:', error);
      setIsLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBackground = (score: number) => {
    if (score >= 90) return 'bg-green-500';
    if (score >= 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getCoreWebVitalStatus = (metric: string, value: number) => {
    const thresholds = {
      lcp: { good: 2.5, poor: 4.0 },
      fid: { good: 100, poor: 300 },
      cls: { good: 0.1, poor: 0.25 },
      fcp: { good: 1.8, poor: 3.0 },
      tti: { good: 3.8, poor: 7.3 }
    };
    
    const threshold = thresholds[metric as keyof typeof thresholds];
    if (!threshold) return 'good';
    
    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
  };

  const runLighthouseAudit = async () => {
    setIsLoading(true);
    // In real implementation, this would trigger a Lighthouse audit
    setTimeout(() => {
      fetchSEOMetrics();
    }, 3000);
  };

  const generateSEOReport = () => {
    // Generate and download SEO report
    const report = {
      timestamp: new Date().toISOString(),
      metrics,
      recommendations: [
        'Optimize images for better performance',
        'Implement lazy loading for below-fold content',
        'Add more internal linking',
        'Optimize meta descriptions length'
      ]
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `seo-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading SEO metrics...</p>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="text-center p-8">
        <p>Failed to load SEO metrics. Please try again.</p>
        <Button onClick={fetchSEOMetrics} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">SEO & Performance</h2>
          {lastUpdated && (
            <p className="text-sm text-gray-600">
              Last updated: {lastUpdated.toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={runLighthouseAudit}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Run Audit
          </Button>
          <Button onClick={generateSEOReport}>
            <BarChart3 className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="technical">Technical SEO</TabsTrigger>
          <TabsTrigger value="pages">Pages</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {Object.entries(metrics.lighthouse).map(([key, score]) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 capitalize">
                          {key.replace(/([A-Z])/g, ' $1')}
                        </p>
                        <p className={`text-2xl font-bold ${getScoreColor(score)}`}>
                          {score}
                        </p>
                      </div>
                      <div className="w-16 h-16">
                        <svg className="w-16 h-16 transform -rotate-90">
                          <circle
                            cx="32"
                            cy="32"
                            r="28"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="transparent"
                            className="text-gray-200"
                          />
                          <circle
                            cx="32"
                            cy="32"
                            r="28"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="transparent"
                            strokeDasharray={`${2 * Math.PI * 28}`}
                            strokeDashoffset={`${2 * Math.PI * 28 * (1 - score / 100)}`}
                            className={getScoreColor(score)}
                          />
                        </svg>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Core Web Vitals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(metrics.coreWebVitals).map(([key, value]) => {
                    const status = getCoreWebVitalStatus(key, value);
                    const unit = key === 'lcp' || key === 'fcp' || key === 'tti' ? 's' : 
                                key === 'fid' ? 'ms' : '';
                    
                    return (
                      <div key={key} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium uppercase">{key}</span>
                          <Badge 
                            variant={status === 'good' ? 'default' : 
                                   status === 'needs-improvement' ? 'secondary' : 'destructive'}
                            className="text-xs"
                          >
                            {status === 'good' ? 'Good' : 
                             status === 'needs-improvement' ? 'Needs Improvement' : 'Poor'}
                          </Badge>
                        </div>
                        <span className="font-mono text-sm">
                          {value}{unit}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Page Indexing
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Total Pages</span>
                    <span className="font-bold">{metrics.pages.total}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Indexed
                    </span>
                    <span className="font-bold text-green-600">{metrics.pages.indexed}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      Warnings
                    </span>
                    <span className="font-bold text-yellow-600">{metrics.pages.warnings}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-500" />
                      Errors
                    </span>
                    <span className="font-bold text-red-600">{metrics.pages.errors}</span>
                  </div>
                  <Progress 
                    value={(metrics.pages.indexed / metrics.pages.total) * 100} 
                    className="mt-2"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="mt-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Loading Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">First Contentful Paint</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">{metrics.coreWebVitals.fcp}s</span>
                      <Badge variant={getCoreWebVitalStatus('fcp', metrics.coreWebVitals.fcp) === 'good' ? 'default' : 'secondary'}>
                        {getCoreWebVitalStatus('fcp', metrics.coreWebVitals.fcp)}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Largest Contentful Paint</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">{metrics.coreWebVitals.lcp}s</span>
                      <Badge variant={getCoreWebVitalStatus('lcp', metrics.coreWebVitals.lcp) === 'good' ? 'default' : 'secondary'}>
                        {getCoreWebVitalStatus('lcp', metrics.coreWebVitals.lcp)}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Time to Interactive</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">{metrics.coreWebVitals.tti}s</span>
                      <Badge variant={getCoreWebVitalStatus('tti', metrics.coreWebVitals.tti) === 'good' ? 'default' : 'secondary'}>
                        {getCoreWebVitalStatus('tti', metrics.coreWebVitals.tti)}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  User Experience
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">First Input Delay</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">{metrics.coreWebVitals.fid}ms</span>
                      <Badge variant={getCoreWebVitalStatus('fid', metrics.coreWebVitals.fid) === 'good' ? 'default' : 'secondary'}>
                        {getCoreWebVitalStatus('fid', metrics.coreWebVitals.fid)}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Cumulative Layout Shift</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">{metrics.coreWebVitals.cls}</span>
                      <Badge variant={getCoreWebVitalStatus('cls', metrics.coreWebVitals.cls) === 'good' ? 'default' : 'secondary'}>
                        {getCoreWebVitalStatus('cls', metrics.coreWebVitals.cls)}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t">
                  <h4 className="font-semibold mb-3">Device Performance</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <Monitor className="h-8 w-8 mx-auto mb-2 text-gray-600" />
                      <p className="text-sm font-medium">Desktop</p>
                      <p className={`text-lg font-bold ${getScoreColor(metrics.lighthouse.performance)}`}>
                        {metrics.lighthouse.performance}
                      </p>
                    </div>
                    <div className="text-center">
                      <Smartphone className="h-8 w-8 mx-auto mb-2 text-gray-600" />
                      <p className="text-sm font-medium">Mobile</p>
                      <p className={`text-lg font-bold ${getScoreColor(metrics.lighthouse.performance - 15)}`}>
                        {metrics.lighthouse.performance - 15}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="technical" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Technical SEO Checklist
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                {Object.entries(metrics.technical).map(([key, status]) => (
                  <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {status ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                      <span className="font-medium capitalize">
                        {key.replace(/([A-Z])/g, ' $1')}
                      </span>
                    </div>
                    <Badge variant={status ? 'default' : 'destructive'}>
                      {status ? 'Implemented' : 'Missing'}
                    </Badge>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t">
                <h4 className="font-semibold mb-3">Recommendations</h4>
                <div className="space-y-2">
                  {!metrics.technical.structuredData && (
                    <div className="flex items-center gap-2 text-sm text-red-600">
                      <AlertTriangle className="h-4 w-4" />
                      Add structured data markup for better search visibility
                    </div>
                  )}
                  {!metrics.technical.hreflang && (
                    <div className="flex items-center gap-2 text-sm text-yellow-600">
                      <AlertTriangle className="h-4 w-4" />
                      Implement hreflang tags for international SEO
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-blue-600">
                    <CheckCircle className="h-4 w-4" />
                    Consider implementing AMP for mobile performance
                  </div>
                  <div className="flex items-center gap-2 text-sm text-blue-600">
                    <CheckCircle className="h-4 w-4" />
                    Add breadcrumb navigation for better UX
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pages" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Page Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { url: '/', status: 'indexed', score: 96, issues: [] },
                  { url: '/blog', status: 'indexed', score: 94, issues: ['Long meta description'] },
                  { url: '/events', status: 'indexed', score: 92, issues: [] },
                  { url: '/recommendations', status: 'indexed', score: 90, issues: ['Missing alt tags'] },
                  { url: '/contact', status: 'warning', score: 88, issues: ['Slow loading', 'No schema'] }
                ].map((page, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {page.status === 'indexed' ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                      )}
                      <div>
                        <p className="font-medium">{page.url}</p>
                        {page.issues.length > 0 && (
                          <p className="text-sm text-gray-500">
                            Issues: {page.issues.join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${getScoreColor(page.score)}`}>
                        {page.score}/100
                      </p>
                      <Badge variant={page.status === 'indexed' ? 'default' : 'secondary'}>
                        {page.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
