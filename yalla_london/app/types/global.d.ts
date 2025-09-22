/**
 * Global Type Definitions
 * Comprehensive type definitions for the Yalla London application
 */

// Global Prisma client type
declare global {
  // eslint-disable-next-line no-var
  var prisma: any;
}

// Prisma Client Types (fallback when not generated)
export interface PrismaClient {
  $connect(): Promise<void>;
  $disconnect(): Promise<void>;
  $executeRaw(...args: any[]): Promise<any>;
  $queryRaw(...args: any[]): Promise<any>;
  [key: string]: any;
}

// Database Models (fallback types)
export interface SeoMeta {
  id: string;
  pageId: string;
  url?: string;
  title: string;
  description: string;
  canonical?: string;
  metaKeywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  twitterCard: string;
  robotsMeta: string;
  schemaType?: string;
  structuredData?: any;
  hreflangAlternates?: any;
  seoScore: number;
  lastAuditAt?: Date;
  auditIssues: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface BlogPost {
  id: string;
  title_en: string;
  title_ar: string;
  content_en: string;
  content_ar: string;
  excerpt_en: string;
  excerpt_ar: string;
  slug: string;
  featured_image?: string;
  tags: string[];
  page_type: string;
  seo_score: number;
  published: boolean;
  created_at: Date;
  updated_at: Date;
  author_id: string;
  category_id: string;
  place_id?: string;
  author?: User;
  category?: Category;
  place?: Place;
}

export interface User {
  id: string;
  name?: string;
  email: string;
  emailVerified?: Date;
  image?: string;
  role: string;
  permissions: string[];
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  id: string;
  name_en: string;
  name_ar: string;
  slug: string;
  description_en?: string;
  description_ar?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Place {
  id: string;
  name_en: string;
  name_ar: string;
  description_en?: string;
  description_ar?: string;
  latitude?: number;
  longitude?: number;
  created_at: Date;
  updated_at: Date;
}

// Supabase Database Type
export interface Database {
  public: {
    Tables: {
      [key: string]: {
        Row: any;
        Insert: any;
        Update: any;
      };
    };
    Views: {
      [key: string]: {
        Row: any;
      };
    };
    Functions: {
      [key: string]: {
        Args: any;
        Returns: any;
      };
    };
    Enums: {
      [key: string]: string;
    };
  };
}

// Content Data Types
export interface ContentData {
  id: string;
  title: string;
  content: string;
  slug: string;
  excerpt: string;
  author: string;
  publishedAt: string;
  language: 'en' | 'ar';
  category: string;
  tags: string[];
  featuredImage?: string;
  pageType: 'article' | 'page' | 'event' | 'place';
  type: 'article' | 'place' | 'event' | 'page';
}

// Sitemap Types
export interface SitemapEntry {
  url: string;
  lastmod: Date;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: number;
  images?: Array<{
    loc: string;
    caption?: string;
    title?: string;
  }>;
}

export interface SitemapData {
  type: 'articles' | 'programmatic' | 'events' | 'places' | 'static';
  entries: SitemapEntry[];
  totalCount: number;
  lastGenerated: Date;
}

// SEO Types
export interface SEOAuditResult {
  id: string;
  pageId: string;
  score: number;
  issues: SEOIssue[];
  recommendations: SEORecommendation[];
  quickFixes: QuickFix[];
  lastAudited: Date;
}

export interface SEOIssue {
  type: 'error' | 'warning' | 'info';
  category: string;
  message: string;
  impact: 'high' | 'medium' | 'low';
  fixable: boolean;
  autoFixable: boolean;
}

export interface SEORecommendation {
  category: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
  effort: 'low' | 'medium' | 'high';
}

export interface QuickFix {
  id: string;
  title: string;
  description: string;
  action: string;
  automated: boolean;
}

// Environment Configuration
export interface EnvConfig {
  [key: string]: string;
}

// Health Check Types
export interface HealthCheckSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  results: HealthCheckResult[];
}

export interface HealthCheckResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message: string;
  duration?: number;
}

// Performance Monitoring Types
export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: Date;
  tags?: Record<string, string>;
  user?: string;
}

export interface ErrorEvent {
  error: Error;
  context?: Record<string, any>;
  user?: string;
  extra?: Record<string, any>;
  tags?: Record<string, string>;
  level?: 'fatal' | 'error' | 'warning' | 'info' | 'debug';
}

// Make types available globally
export {};
