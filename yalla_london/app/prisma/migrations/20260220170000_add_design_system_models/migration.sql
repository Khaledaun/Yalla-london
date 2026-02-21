-- Design System Models Migration
-- Adds: designs, pdf_guides, pdf_downloads, email_templates, email_campaigns,
--        video_projects, content_pipelines, content_performance

-- CreateTable: designs
CREATE TABLE "designs" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "category" TEXT,
    "site" TEXT NOT NULL,
    "canvasData" JSONB NOT NULL,
    "thumbnail" TEXT,
    "exportedUrls" JSONB,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "tags" TEXT[],
    "isTemplate" BOOLEAN NOT NULL DEFAULT false,
    "templateId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "designs_pkey" PRIMARY KEY ("id")
);

-- CreateTable: pdf_guides
CREATE TABLE "pdf_guides" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "site" TEXT NOT NULL,
    "style" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "contentSections" JSONB NOT NULL,
    "htmlContent" TEXT,
    "pdfUrl" TEXT,
    "coverDesignId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "price" DOUBLE PRECISION DEFAULT 0,
    "isGated" BOOLEAN NOT NULL DEFAULT false,
    "downloads" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pdf_guides_pkey" PRIMARY KEY ("id")
);

-- CreateTable: pdf_downloads
CREATE TABLE "pdf_downloads" (
    "id" TEXT NOT NULL,
    "pdfGuideId" TEXT NOT NULL,
    "leadId" TEXT,
    "email" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "downloadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pdf_downloads_pkey" PRIMARY KEY ("id")
);

-- CreateTable: email_templates
CREATE TABLE "email_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "site" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "subject" TEXT,
    "htmlContent" TEXT NOT NULL,
    "jsonContent" JSONB,
    "thumbnail" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable: email_campaigns
CREATE TABLE "email_campaigns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "site" TEXT NOT NULL,
    "templateId" TEXT,
    "subject" TEXT NOT NULL,
    "htmlContent" TEXT NOT NULL,
    "recipientCount" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "openCount" INTEGER NOT NULL DEFAULT 0,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable: video_projects
CREATE TABLE "video_projects" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "site" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "scenes" JSONB NOT NULL,
    "compositionCode" TEXT,
    "prompt" TEXT,
    "duration" INTEGER NOT NULL,
    "fps" INTEGER NOT NULL DEFAULT 30,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "thumbnail" TEXT,
    "exportedUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "video_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable: content_pipelines
CREATE TABLE "content_pipelines" (
    "id" TEXT NOT NULL,
    "site" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'researching',
    "topic" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en',
    "researchData" JSONB,
    "contentAngles" JSONB,
    "scripts" JSONB,
    "analysisData" JSONB,
    "generatedPosts" JSONB,
    "generatedArticleId" TEXT,
    "generatedEmailId" TEXT,
    "generatedVideoIds" JSONB,
    "generatedDesignIds" JSONB,
    "feedForwardApplied" JSONB,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_pipelines_pkey" PRIMARY KEY ("id")
);

-- CreateTable: content_performance
CREATE TABLE "content_performance" (
    "id" TEXT NOT NULL,
    "pipelineId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "postUrl" TEXT,
    "publishedAt" TIMESTAMP(3),
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "engagements" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "saves" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "conversionRate" DOUBLE PRECISION,
    "grade" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_performance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "designs_site_type_idx" ON "designs"("site", "type");
CREATE INDEX "designs_status_idx" ON "designs"("status");
CREATE INDEX "designs_isTemplate_idx" ON "designs"("isTemplate");
CREATE INDEX "designs_createdAt_idx" ON "designs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "pdf_guides_slug_key" ON "pdf_guides"("slug");
CREATE INDEX "pdf_guides_site_idx" ON "pdf_guides"("site");
CREATE INDEX "pdf_guides_status_idx" ON "pdf_guides"("status");
CREATE INDEX "pdf_guides_slug_idx" ON "pdf_guides"("slug");

-- CreateIndex
CREATE INDEX "pdf_downloads_pdfGuideId_idx" ON "pdf_downloads"("pdfGuideId");
CREATE INDEX "pdf_downloads_email_idx" ON "pdf_downloads"("email");

-- CreateIndex
CREATE INDEX "email_templates_site_type_idx" ON "email_templates"("site", "type");
CREATE INDEX "email_templates_isDefault_idx" ON "email_templates"("isDefault");

-- CreateIndex
CREATE INDEX "email_campaigns_site_idx" ON "email_campaigns"("site");
CREATE INDEX "email_campaigns_status_idx" ON "email_campaigns"("status");
CREATE INDEX "email_campaigns_scheduledAt_idx" ON "email_campaigns"("scheduledAt");

-- CreateIndex
CREATE INDEX "video_projects_site_idx" ON "video_projects"("site");
CREATE INDEX "video_projects_status_idx" ON "video_projects"("status");
CREATE INDEX "video_projects_category_idx" ON "video_projects"("category");

-- CreateIndex
CREATE INDEX "content_pipelines_site_idx" ON "content_pipelines"("site");
CREATE INDEX "content_pipelines_status_idx" ON "content_pipelines"("status");
CREATE INDEX "content_pipelines_createdAt_idx" ON "content_pipelines"("createdAt");

-- CreateIndex
CREATE INDEX "content_performance_pipelineId_idx" ON "content_performance"("pipelineId");
CREATE INDEX "content_performance_platform_idx" ON "content_performance"("platform");
CREATE INDEX "content_performance_grade_idx" ON "content_performance"("grade");

-- AddForeignKey
ALTER TABLE "pdf_downloads" ADD CONSTRAINT "pdf_downloads_pdfGuideId_fkey" FOREIGN KEY ("pdfGuideId") REFERENCES "pdf_guides"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_performance" ADD CONSTRAINT "content_performance_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "content_pipelines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
