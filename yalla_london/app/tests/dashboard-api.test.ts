import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Create mock db object for tenant-scoped queries
const mockDb = {
  blogPost: {
    count: vi.fn(),
    aggregate: vi.fn(),
    findMany: vi.fn(),
  },
};

// Mock the admin middleware — route uses withTenantAuth, not withAdminAuth
vi.mock("@/lib/admin-middleware", () => ({
  withTenantAuth: (handler: any) => {
    return async (request: any) => {
      // Bypass auth and provide tenant context
      return handler(request, {
        db: mockDb,
        siteId: "yalla-london",
        locale: "en",
      });
    };
  },
  requireAdmin: vi.fn().mockResolvedValue(null),
  withAdminAuth: (handler: any) => handler,
}));

// Mock the database (for direct prisma imports in the route)
vi.mock("@/lib/db", () => ({
  prisma: {
    blogPost: {
      count: vi.fn(),
      aggregate: vi.fn(),
      findMany: vi.fn(),
    },
    user: {
      count: vi.fn(),
    },
    databaseBackup: {
      findFirst: vi.fn(),
    },
    scheduledContent: {
      count: vi.fn(),
    },
    topicProposal: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    apiSettings: {
      findFirst: vi.fn(),
    },
    auditLog: {
      findMany: vi.fn(),
    },
  },
}));

// Mock data modules
vi.mock("@/data/information-hub-content", () => ({
  informationArticles: [],
  informationSections: [],
}));

vi.mock("@/data/information-hub-articles-extended", () => ({
  extendedInformationArticles: [],
}));

import { prisma as _mockPrismaRaw } from "@/lib/db";
const mockPrisma = _mockPrismaRaw as any;

// Dynamic import to ensure mocks are in place
let GET: any;

describe("/api/admin/dashboard", () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    // Setup default mock responses for tenant-scoped db calls
    mockDb.blogPost.count.mockResolvedValue(10);
    mockDb.blogPost.aggregate.mockResolvedValue({ _avg: { seo_score: 75 } });
    mockDb.blogPost.findMany.mockResolvedValue([]);

    // Setup default mock responses for global prisma calls
    mockPrisma.user.count.mockResolvedValue(5);
    mockPrisma.databaseBackup.findFirst.mockResolvedValue({
      created_at: new Date(),
    });
    mockPrisma.scheduledContent.count.mockResolvedValue(3);
    mockPrisma.topicProposal.count.mockResolvedValue(2);
    mockPrisma.topicProposal.findMany.mockResolvedValue([]);
    mockPrisma.apiSettings.findFirst.mockResolvedValue(null);
    mockPrisma.auditLog.findMany.mockResolvedValue([]);

    // Import the route handler
    const routeModule = await import("@/app/api/admin/dashboard/route");
    GET = routeModule.GET;
  });

  it("should return dashboard data with default time range", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/admin/dashboard",
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe("success");
    expect(data.data).toHaveProperty("metrics");
    expect(data.data).toHaveProperty("taskSummary");
    expect(data.data).toHaveProperty("pipelineHealth");
    expect(data.data).toHaveProperty("connectionStates");
    // publishedContent comes from db.blogPost.count (tenant-scoped, published: true)
    // The first call returns published count, second returns draft count
    expect(data.data.metrics.publishedContent).toBeDefined();
    expect(data.data.metrics.totalUsers).toBe(5);
  });

  it("should handle time range parameter", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/admin/dashboard?timeRange=30d",
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.metrics.timeRange).toBe("30d");
  });

  it("should show connected status when analytics config exists", async () => {
    mockPrisma.apiSettings.findFirst
      .mockResolvedValueOnce({
        key_value: "GA4_ID_123",
        test_status: "success",
      })
      .mockResolvedValueOnce({
        key_value: "GSC_ID_456",
        test_status: "success",
      });

    const request = new NextRequest(
      "http://localhost:3000/api/admin/dashboard",
    );

    const response = await GET(request);
    const data = await response.json();

    expect(data.data.connectionStates.analytics.connected).toBe(true);
    expect(data.data.connectionStates.searchConsole.connected).toBe(true);
  });

  it("should show disconnected status when no analytics config", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/admin/dashboard",
    );

    const response = await GET(request);
    const data = await response.json();

    expect(data.data.connectionStates.analytics.connected).toBe(false);
    expect(data.data.connectionStates.searchConsole.connected).toBe(false);
    expect(data.data.connectionStates.wordpress.connected).toBe(false);
  });

  it("should return fallback data on error", async () => {
    // Make the first db call throw to trigger error handler
    mockDb.blogPost.count.mockRejectedValue(new Error("Database error"));

    const request = new NextRequest(
      "http://localhost:3000/api/admin/dashboard",
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.status).toBe("error");
    expect(data).toHaveProperty("fallback");
    expect(data.fallback.metrics.source).toBe("Error - Using Fallback");
  });
});
