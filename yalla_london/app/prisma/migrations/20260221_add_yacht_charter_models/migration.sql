-- Zenitha Yachts Charter Platform Models
-- Migration: add_yacht_charter_models
-- Date: 2026-02-21

-- Enums
CREATE TYPE "YachtType" AS ENUM ('SAILBOAT', 'CATAMARAN', 'MOTOR_YACHT', 'GULET', 'SUPERYACHT', 'POWER_CATAMARAN');
CREATE TYPE "YachtSource" AS ENUM ('NAUSYS', 'MMK', 'CHARTER_INDEX', 'MANUAL');
CREATE TYPE "InquiryStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'SENT_TO_BROKER', 'BOOKED', 'LOST');
CREATE TYPE "AvailabilityStatus" AS ENUM ('AVAILABLE', 'BOOKED', 'HOLD', 'MAINTENANCE');
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "DestinationRegion" AS ENUM ('MEDITERRANEAN', 'ARABIAN_GULF', 'RED_SEA', 'INDIAN_OCEAN', 'CARIBBEAN', 'SOUTHEAST_ASIA');
CREATE TYPE "SyncStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');
CREATE TYPE "ItineraryDifficulty" AS ENUM ('EASY', 'MODERATE', 'ADVANCED');

-- Model: Yacht
CREATE TABLE "yachts" (
    "id" TEXT NOT NULL,
    "externalId" TEXT,
    "source" "YachtSource" NOT NULL DEFAULT 'MANUAL',
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "YachtType" NOT NULL DEFAULT 'SAILBOAT',
    "length" DECIMAL(6,2),
    "beam" DECIMAL(5,2),
    "draft" DECIMAL(4,2),
    "yearBuilt" INTEGER,
    "builder" TEXT,
    "model" TEXT,
    "cabins" INTEGER NOT NULL DEFAULT 0,
    "berths" INTEGER NOT NULL DEFAULT 0,
    "bathrooms" INTEGER NOT NULL DEFAULT 0,
    "crewSize" INTEGER NOT NULL DEFAULT 0,
    "pricePerWeekLow" DECIMAL(10,2),
    "pricePerWeekHigh" DECIMAL(10,2),
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "description_en" TEXT,
    "description_ar" TEXT,
    "features" JSONB,
    "images" JSONB,
    "waterSports" JSONB,
    "halalCateringAvailable" BOOLEAN NOT NULL DEFAULT false,
    "familyFriendly" BOOLEAN NOT NULL DEFAULT false,
    "crewIncluded" BOOLEAN NOT NULL DEFAULT false,
    "homePort" TEXT,
    "cruisingArea" TEXT,
    "rating" DECIMAL(3,2),
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "siteId" TEXT NOT NULL,
    "destinationId" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "syncHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "yachts_pkey" PRIMARY KEY ("id")
);

-- Model: YachtDestination
CREATE TABLE "yacht_destinations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "region" "DestinationRegion" NOT NULL,
    "country" TEXT,
    "description_en" TEXT,
    "description_ar" TEXT,
    "seasonStart" TEXT,
    "seasonEnd" TEXT,
    "bestMonths" JSONB,
    "heroImage" TEXT,
    "galleryImages" JSONB,
    "averagePricePerWeek" DECIMAL(10,2),
    "highlights" JSONB,
    "weatherInfo" JSONB,
    "marinas" JSONB,
    "siteId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "yacht_destinations_pkey" PRIMARY KEY ("id")
);

-- Model: CharterInquiry
CREATE TABLE "charter_inquiries" (
    "id" TEXT NOT NULL,
    "referenceNumber" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "whatsappNumber" TEXT,
    "destination" TEXT,
    "preferredDates" JSONB,
    "guestCount" INTEGER NOT NULL DEFAULT 2,
    "childrenCount" INTEGER NOT NULL DEFAULT 0,
    "budget" DECIMAL(10,2),
    "budgetCurrency" TEXT NOT NULL DEFAULT 'EUR',
    "yachtTypePreference" "YachtType",
    "preferences" JSONB,
    "experienceLevel" TEXT NOT NULL DEFAULT 'first_time',
    "languagePreference" TEXT NOT NULL DEFAULT 'en',
    "contactPreference" TEXT NOT NULL DEFAULT 'email',
    "message" TEXT,
    "status" "InquiryStatus" NOT NULL DEFAULT 'NEW',
    "brokerAssigned" TEXT,
    "brokerNotes" TEXT,
    "source" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "yachtId" TEXT,
    "siteId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "charter_inquiries_pkey" PRIMARY KEY ("id")
);

-- Model: YachtAvailability
CREATE TABLE "yacht_availability" (
    "id" TEXT NOT NULL,
    "yachtId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "AvailabilityStatus" NOT NULL DEFAULT 'AVAILABLE',
    "priceForPeriod" DECIMAL(10,2),
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "source" "YachtSource" NOT NULL,
    "lastCheckedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "yacht_availability_pkey" PRIMARY KEY ("id")
);

-- Model: YachtReview
CREATE TABLE "yacht_reviews" (
    "id" TEXT NOT NULL,
    "yachtId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorEmail" TEXT,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "content_en" TEXT,
    "content_ar" TEXT,
    "charterDate" TIMESTAMP(3),
    "destination" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "siteId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "yacht_reviews_pkey" PRIMARY KEY ("id")
);

-- Model: CharterItinerary
CREATE TABLE "charter_itineraries" (
    "id" TEXT NOT NULL,
    "title_en" TEXT NOT NULL,
    "title_ar" TEXT,
    "slug" TEXT NOT NULL,
    "destinationId" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "difficulty" "ItineraryDifficulty" NOT NULL DEFAULT 'EASY',
    "description_en" TEXT,
    "description_ar" TEXT,
    "stops" JSONB NOT NULL,
    "recommendedYachtTypes" JSONB,
    "estimatedCost" DECIMAL(10,2),
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "bestSeason" TEXT,
    "heroImage" TEXT,
    "siteId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "charter_itineraries_pkey" PRIMARY KEY ("id")
);

-- Model: BrokerPartner
CREATE TABLE "broker_partners" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "contactName" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "website" TEXT,
    "commissionRate" DECIMAL(5,2),
    "destinations" JSONB,
    "status" TEXT NOT NULL DEFAULT 'active',
    "totalLeadsSent" INTEGER NOT NULL DEFAULT 0,
    "totalBookings" INTEGER NOT NULL DEFAULT 0,
    "siteId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "broker_partners_pkey" PRIMARY KEY ("id")
);

-- Model: YachtSyncLog
CREATE TABLE "yacht_sync_logs" (
    "id" TEXT NOT NULL,
    "source" "YachtSource" NOT NULL,
    "syncType" TEXT NOT NULL DEFAULT 'incremental',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "yachtsProcessed" INTEGER NOT NULL DEFAULT 0,
    "yachtsCreated" INTEGER NOT NULL DEFAULT 0,
    "yachtsUpdated" INTEGER NOT NULL DEFAULT 0,
    "yachtsDeactivated" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB,
    "status" "SyncStatus" NOT NULL DEFAULT 'RUNNING',
    "siteId" TEXT NOT NULL,

    CONSTRAINT "yacht_sync_logs_pkey" PRIMARY KEY ("id")
);

-- Unique Constraints
CREATE UNIQUE INDEX "yachts_externalId_source_key" ON "yachts"("externalId", "source");
CREATE UNIQUE INDEX "yacht_destinations_slug_siteId_key" ON "yacht_destinations"("slug", "siteId");
CREATE UNIQUE INDEX "charter_inquiries_referenceNumber_key" ON "charter_inquiries"("referenceNumber");
CREATE UNIQUE INDEX "charter_itineraries_slug_siteId_key" ON "charter_itineraries"("slug", "siteId");

-- Indexes: Yacht
CREATE INDEX "yachts_siteId_idx" ON "yachts"("siteId");
CREATE INDEX "yachts_destinationId_idx" ON "yachts"("destinationId");
CREATE INDEX "yachts_type_idx" ON "yachts"("type");
CREATE INDEX "yachts_status_siteId_idx" ON "yachts"("status", "siteId");
CREATE INDEX "yachts_slug_siteId_idx" ON "yachts"("slug", "siteId");
CREATE INDEX "yachts_pricePerWeekLow_idx" ON "yachts"("pricePerWeekLow");
CREATE INDEX "yachts_halalCateringAvailable_idx" ON "yachts"("halalCateringAvailable");

-- Indexes: YachtDestination
CREATE INDEX "yacht_destinations_siteId_idx" ON "yacht_destinations"("siteId");
CREATE INDEX "yacht_destinations_region_idx" ON "yacht_destinations"("region");

-- Indexes: CharterInquiry
CREATE INDEX "charter_inquiries_siteId_idx" ON "charter_inquiries"("siteId");
CREATE INDEX "charter_inquiries_status_idx" ON "charter_inquiries"("status");
CREATE INDEX "charter_inquiries_email_idx" ON "charter_inquiries"("email");
CREATE INDEX "charter_inquiries_createdAt_idx" ON "charter_inquiries"("createdAt");

-- Indexes: YachtAvailability
CREATE INDEX "yacht_availability_yachtId_idx" ON "yacht_availability"("yachtId");
CREATE INDEX "yacht_availability_startDate_endDate_idx" ON "yacht_availability"("startDate", "endDate");
CREATE INDEX "yacht_availability_status_idx" ON "yacht_availability"("status");

-- Indexes: YachtReview
CREATE INDEX "yacht_reviews_yachtId_idx" ON "yacht_reviews"("yachtId");
CREATE INDEX "yacht_reviews_siteId_idx" ON "yacht_reviews"("siteId");
CREATE INDEX "yacht_reviews_status_idx" ON "yacht_reviews"("status");

-- Indexes: CharterItinerary
CREATE INDEX "charter_itineraries_siteId_idx" ON "charter_itineraries"("siteId");
CREATE INDEX "charter_itineraries_destinationId_idx" ON "charter_itineraries"("destinationId");

-- Indexes: BrokerPartner
CREATE INDEX "broker_partners_siteId_idx" ON "broker_partners"("siteId");

-- Indexes: YachtSyncLog
CREATE INDEX "yacht_sync_logs_siteId_idx" ON "yacht_sync_logs"("siteId");
CREATE INDEX "yacht_sync_logs_source_idx" ON "yacht_sync_logs"("source");
CREATE INDEX "yacht_sync_logs_startedAt_idx" ON "yacht_sync_logs"("startedAt");

-- Foreign Keys
ALTER TABLE "yachts" ADD CONSTRAINT "yachts_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "yacht_destinations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "charter_inquiries" ADD CONSTRAINT "charter_inquiries_yachtId_fkey" FOREIGN KEY ("yachtId") REFERENCES "yachts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "yacht_availability" ADD CONSTRAINT "yacht_availability_yachtId_fkey" FOREIGN KEY ("yachtId") REFERENCES "yachts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "yacht_reviews" ADD CONSTRAINT "yacht_reviews_yachtId_fkey" FOREIGN KEY ("yachtId") REFERENCES "yachts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "charter_itineraries" ADD CONSTRAINT "charter_itineraries_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "yacht_destinations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
