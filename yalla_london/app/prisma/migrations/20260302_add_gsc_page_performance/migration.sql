-- CreateTable
CREATE TABLE "gsc_page_performance" (
    "id" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "ctr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "position" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gsc_page_performance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "gsc_page_performance_site_id_url_date_key" ON "gsc_page_performance"("site_id", "url", "date");

-- CreateIndex
CREATE INDEX "gsc_page_performance_site_id_date_idx" ON "gsc_page_performance"("site_id", "date");

-- CreateIndex
CREATE INDEX "gsc_page_performance_site_id_url_idx" ON "gsc_page_performance"("site_id", "url");
