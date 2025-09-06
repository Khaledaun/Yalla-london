
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Search, 
  Globe, 
  Share2, 
  FileText, 
  Link2,
  BarChart3,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  RefreshCw,
  Download,
  Upload,
  Zap,
  Target,
  MapPin,
  Clock,
  TrendingUp
} from 'lucide-react';
import { motion } from 'framer-motion';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { SeoManagementDashboard } from './seo-dashboard';

interface SeoStats {
  seoScore: number;
  totalPages: number;
  indexedPages: number;
  organicTraffic: number;
  avgPosition: number;
  totalKeywords: number;
  brokenLinks: number;
  orphanedPages: number;
}

interface SitemapStatus {
  url: string;
  type: string;
  status: 'valid' | 'error' | 'warning';
  lastUpdated: string;
  urlCount: number;
}

interface InternalLinkIssue {
  type: 'orphaned' | 'broken' | 'suggestion';
  url: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
}

export function ComprehensiveSeoPanel() {
  if (!isFeatureEnabled('SEO')) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">SEO Features Disabled</h3>
          <p className="text-gray-600 mb-4">Enable SEO features by setting FEATURE_SEO=1</p>
          <Badge variant="outline">Feature Flag: SEO</Badge>
        </CardContent>
      </Card>
    );
  }

  const [activeTab, setActiveTab] = useState('overview');
  const [seoStats, setSeoStats] = useState<SeoStats>({
    seoScore: 87,
    totalPages: 156,
    indexedPages: 142,
    organicTraffic: 12456,
    avgPosition: 8.3,
    totalKeywords: 245,
    brokenLinks: 3,
    orphanedPages: 2
  });

  const [sitemapStatus, setSitemapStatus] = useState<SitemapStatus[]>([
    { url: '/sitemap-index.xml', type: 'Index', status: 'valid', lastUpdated: '2024-09-06T06:00:00Z', urlCount: 7 },
    { url: '/sitemap-pages.xml', type: 'Pages', status: 'valid', lastUpdated: '2024-09-06T06:00:00Z', urlCount: 25 },
    { url: '/sitemap-blog.xml', type: 'Blog', status: 'valid', lastUpdated: '2024-09-06T05:45:00Z', urlCount: 68 },
    { url: '/sitemap-events.xml', type: 'Events', status: 'warning', lastUpdated: '2024-09-05T18:30:00Z', urlCount: 15 },
    { url: '/sitemap-recommendations.xml', type: 'Recommendations', status: 'valid', lastUpdated: '2024-09-06T05:30:00Z', urlCount: 42 },
    { url: '/sitemap-images.xml', type: 'Images', status: 'valid', lastUpdated: '2024-09-06T05:15:00Z', urlCount: 234 },
    { url: '/sitemap-videos.xml', type: 'Videos', status: 'valid', lastUpdated: '2024-09-06T05:00:00Z', urlCount: 18 }
  ]);

  const [internalLinkIssues, setInternalLinkIssues] = useState<InternalLinkIssue[]>([
    {
      type: 'orphaned',
      url: '/hidden-gems-london',
      description: 'Page has no inbound internal links',
      severity: 'medium'
    },
    {
      type: 'broken',
      url: '/old-event-link',
      description: 'Link returns 404 error',
      severity: 'high'
    },
    {
      type: 'suggestion',
      url: '/blog/luxury-dining',
      description: 'Could link to restaurant recommendations',
      severity: 'low'
    }
  ]);

  const [isProcessing, setIsProcessing] = useState(false);

  const handleSitemapRegenerate = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/sitemap/enhanced-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'regenerate' })
      });
      
      if (response.ok) {
        // Refresh sitemap status
        console.log('Sitemaps regenerated successfully');
      }
    } catch (error) {
      console.error('Failed to regenerate sitemaps:', error);
    }
    setIsProcessing(false);
  };

  const handleSubmitToGSC = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/sitemap/enhanced-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submit-to-gsc' })
      });
      
      if (response.ok) {
        console.log('Sitemap submitted to Google Search Console');
      }
    } catch (error) {
      console.error('Failed to submit to GSC:', error);
    }
    setIsProcessing(false);
  };

  const handleInternalLinkScan = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/seo/internal-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'scan' })
      });
      
      if (response.ok) {
        // Refresh internal link issues
        console.log('Internal link scan completed');
      }
    } catch (error) {
      console.error('Failed to scan internal links:', error);
    }
    setIsProcessing(false);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      {/* SEO Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">SEO Score</p>
                  <p className={`text-3xl font-bold ${getScoreColor(seoStats.seoScore).split(' ')[0]}`}>
                    {seoStats.seoScore}
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${getScoreColor(seoStats.seoScore).split(' ')[1]}`}>
                  <BarChart3 className={`h-6 w-6 ${getScoreColor(seoStats.seoScore).split(' ')[0]}`} />
                </div>
              </div>
              <div className="mt-4">
                <Progress value={seoStats.seoScore} className="h-2" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Indexed Pages</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {seoStats.indexedPages}
                  </p>
                  <p className="text-sm text-gray-500">of {seoStats.totalPages} total</p>
                </div>
                <div className="p-3 rounded-lg bg-blue-100">
                  <Search className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Organic Traffic</p>
                  <p className="text-3xl font-bold text-green-600">
                    {seoStats.organicTraffic.toLocaleString()}
                  </p>
                  <p className="text-sm text-green-600">+12% vs last month</p>
                </div>
                <div className="p-3 rounded-lg bg-green-100">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg. Position</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {seoStats.avgPosition}
                  </p>
                  <p className="text-sm text-purple-600">{seoStats.totalKeywords} keywords</p>
                </div>
                <div className="p-3 rounded-lg bg-purple-100">
                  <Target className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="meta-editor">Meta Editor</TabsTrigger>
          <TabsTrigger value="sitemaps">Sitemaps</TabsTrigger>
          <TabsTrigger value="internal-links">Internal Links</TabsTrigger>
          <TabsTrigger value="redirects">Redirects</TabsTrigger>
          <TabsTrigger value="tools">Tools</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Issues Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  SEO Issues
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {seoStats.brokenLinks > 0 && (
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      <span className="text-sm font-medium text-red-800">
                        {seoStats.brokenLinks} Broken Links
                      </span>
                    </div>
                    <Badge variant="destructive">{seoStats.brokenLinks}</Badge>
                  </div>
                )}

                {seoStats.orphanedPages > 0 && (
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm font-medium text-yellow-800">
                        {seoStats.orphanedPages} Orphaned Pages
                      </span>
                    </div>
                    <Badge variant="secondary">{seoStats.orphanedPages}</Badge>
                  </div>
                )}

                {seoStats.brokenLinks === 0 && seoStats.orphanedPages === 0 && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium text-green-800">
                      No critical SEO issues found
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Recent SEO Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3 p-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Sitemap updated</p>
                    <p className="text-xs text-gray-500">2 hours ago</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Meta tags optimized</p>
                    <p className="text-xs text-gray-500">1 day ago</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Internal links added</p>
                    <p className="text-xs text-gray-500">3 days ago</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Meta Editor Tab */}
        <TabsContent value="meta-editor">
          <SeoManagementDashboard />
        </TabsContent>

        {/* Sitemaps Tab */}
        <TabsContent value="sitemaps" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                XML Sitemaps
              </CardTitle>
              <div className="flex gap-2">
                <Button onClick={handleSitemapRegenerate} disabled={isProcessing} variant="outline">
                  <RefreshCw className={`h-4 w-4 mr-2 ${isProcessing ? 'animate-spin' : ''}`} />
                  Regenerate All
                </Button>
                <Button onClick={handleSubmitToGSC} disabled={isProcessing}>
                  <Upload className="h-4 w-4 mr-2" />
                  Submit to GSC
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sitemapStatus.map((sitemap, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${
                        sitemap.status === 'valid' ? 'bg-green-500' :
                        sitemap.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                      }`}></div>
                      <div>
                        <p className="font-medium">{sitemap.type} Sitemap</p>
                        <p className="text-sm text-gray-500">{sitemap.urlCount} URLs</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-gray-600">
                          Updated: {new Date(sitemap.lastUpdated).toLocaleDateString()}
                        </p>
                        <Badge variant={sitemap.status === 'valid' ? 'default' : 
                                      sitemap.status === 'warning' ? 'secondary' : 'destructive'}>
                          {sitemap.status}
                        </Badge>
                      </div>
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Internal Links Tab */}
        <TabsContent value="internal-links" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5" />
                Internal Link Analysis
              </CardTitle>
              <Button onClick={handleInternalLinkScan} disabled={isProcessing} variant="outline">
                <RefreshCw className={`h-4 w-4 mr-2 ${isProcessing ? 'animate-spin' : ''}`} />
                Scan Links
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {internalLinkIssues.map((issue, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${
                        issue.type === 'broken' ? 'bg-red-100' :
                        issue.type === 'orphaned' ? 'bg-yellow-100' : 'bg-blue-100'
                      }`}>
                        {issue.type === 'broken' ? 
                          <AlertCircle className="h-4 w-4 text-red-600" /> :
                          issue.type === 'orphaned' ? 
                            <AlertCircle className="h-4 w-4 text-yellow-600" /> :
                            <Target className="h-4 w-4 text-blue-600" />
                        }
                      </div>
                      <div>
                        <p className="font-medium">{issue.url}</p>
                        <p className="text-sm text-gray-600">{issue.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getSeverityBadge(issue.severity)}>
                        {issue.severity}
                      </Badge>
                      <Button variant="ghost" size="sm">
                        Fix
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Redirects Tab */}
        <TabsContent value="redirects" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                301 Redirects Manager
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Zap className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 mb-4">Redirect management interface</p>
                <p className="text-sm text-gray-500">
                  Automatically creates 301 redirects when URLs change
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tools Tab */}
        <TabsContent value="tools" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6 text-center">
                <Search className="h-12 w-12 mx-auto text-blue-500 mb-4" />
                <h3 className="font-semibold mb-2">Google Rich Results Test</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Test your structured data for Rich Results
                </p>
                <Button variant="outline" size="sm">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Test Now
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <Globe className="h-12 w-12 mx-auto text-green-500 mb-4" />
                <h3 className="font-semibold mb-2">Hreflang Generator</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Generate hreflang tags for EN/AR versions
                </p>
                <Button variant="outline" size="sm">
                  Generate Tags
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <Share2 className="h-12 w-12 mx-auto text-purple-500 mb-4" />
                <h3 className="font-semibold mb-2">OG Image Generator</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Auto-generate Open Graph images
                </p>
                <Button variant="outline" size="sm">
                  Generate Images
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
