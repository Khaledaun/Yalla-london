-- CreateTable
CREATE TABLE IF NOT EXISTS "seo_meta" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "url" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "canonical" TEXT,
    "metaKeywords" TEXT,
    "ogTitle" TEXT,
    "ogDescription" TEXT,
    "ogImage" TEXT,
    "ogType" TEXT DEFAULT 'website',
    "twitterTitle" TEXT,
    "twitterDescription" TEXT,
    "twitterImage" TEXT,
    "twitterCard" TEXT DEFAULT 'summary_large_image',
    "robotsMeta" TEXT DEFAULT 'index,follow',
    "schemaType" TEXT,
    "structuredData" JSONB,
    "hreflangAlternates" JSONB,
    "seoScore" INTEGER DEFAULT 0,
    "lastAuditAt" TIMESTAMP(3),
    "auditIssues" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seo_meta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "seo_audit_results" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "auditType" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "issues" JSONB NOT NULL,
    "recommendations" JSONB NOT NULL,
    "auditedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seo_audit_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "seo_redirects" (
    "id" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "statusCode" INTEGER DEFAULT 301,
    "enabled" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seo_redirects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "seo_internal_links" (
    "id" TEXT NOT NULL,
    "sourcePageId" TEXT NOT NULL,
    "targetPageId" TEXT NOT NULL,
    "anchorText" TEXT NOT NULL,
    "context" TEXT,
    "relevanceScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seo_internal_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "seo_keywords" (
    "id" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "searchVolume" INTEGER,
    "competition" DOUBLE PRECISION,
    "difficulty" INTEGER,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seo_keywords_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "seo_content_analysis" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "readabilityScore" DOUBLE PRECISION,
    "keywordDensity" JSONB,
    "sentimentScore" DOUBLE PRECISION,
    "analysisResult" JSONB,
    "analyzedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seo_content_analysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "seo_reports" (
    "id" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data" JSONB NOT NULL,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),

    CONSTRAINT "seo_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "seo_health_metrics" (
    "id" TEXT NOT NULL,
    "pageId" TEXT,
    "url" TEXT,
    "metricName" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seo_health_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "seo_page_metrics" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "lcp" DOUBLE PRECISION,
    "fid" DOUBLE PRECISION,
    "cls" DOUBLE PRECISION,
    "fcp" DOUBLE PRECISION,
    "tti" DOUBLE PRECISION,
    "indexed" BOOLEAN,
    "lastCrawled" TIMESTAMP(3),
    "mobileFriendly" BOOLEAN,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seo_page_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "seo_sitemap_entries" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "lastModified" TIMESTAMP(3) NOT NULL,
    "changeFrequency" TEXT,
    "priority" DOUBLE PRECISION,
    "sitemapType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seo_sitemap_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "seo_hreflang_entries" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "lang" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "isDefault" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seo_hreflang_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "seo_structured_data" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "schemaType" TEXT NOT NULL,
    "jsonData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seo_structured_data_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "seo_meta_pageId_key" ON "seo_meta"("pageId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "seo_redirects_sourceUrl_key" ON "seo_redirects"("sourceUrl");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "seo_keywords_keyword_key" ON "seo_keywords"("keyword");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "seo_content_analysis_contentId_key" ON "seo_content_analysis"("contentId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "seo_sitemap_entries_url_key" ON "seo_sitemap_entries"("url");

-- AddForeignKey
ALTER TABLE "seo_audit_results" ADD CONSTRAINT "seo_audit_results_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "seo_meta"("pageId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seo_internal_links" ADD CONSTRAINT "seo_internal_links_sourcePageId_fkey" FOREIGN KEY ("sourcePageId") REFERENCES "seo_meta"("pageId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seo_internal_links" ADD CONSTRAINT "seo_internal_links_targetPageId_fkey" FOREIGN KEY ("targetPageId") REFERENCES "seo_meta"("pageId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seo_content_analysis" ADD CONSTRAINT "seo_content_analysis_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "seo_meta"("pageId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seo_health_metrics" ADD CONSTRAINT "seo_health_metrics_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "seo_meta"("pageId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seo_page_metrics" ADD CONSTRAINT "seo_page_metrics_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "seo_meta"("pageId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seo_hreflang_entries" ADD CONSTRAINT "seo_hreflang_entries_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "seo_meta"("pageId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seo_structured_data" ADD CONSTRAINT "seo_structured_data_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "seo_meta"("pageId") ON DELETE CASCADE ON UPDATE CASCADE;




