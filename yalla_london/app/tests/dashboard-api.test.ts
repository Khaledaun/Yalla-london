import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/admin/dashboard/route";

// Mock the admin middleware
vi.mock("@/lib/admin-middleware", () => ({
  withAdminAuth: (handler: any) => handler,
}));

// Mock the database
vi.mock("@/lib/db", () => ({
  prisma: {
    blogPost: {
      count: vi.fn(),
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
    apiSettings: {
      findFirst: vi.fn(),
    },
    auditLog: {
      findMany: vi.fn(),
    },
  },
}));

const mockPrisma = require("@/lib/db").prisma;

describe("/api/admin/dashboard", () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Setup default mock responses
    mockPrisma.blogPost.count.mockResolvedValue(10);
    mockPrisma.user.count.mockResolvedValue(5);
    mockPrisma.databaseBackup.findFirst.mockResolvedValue({
      created_at: new Date(),
    });
    mockPrisma.scheduledContent.count.mockResolvedValue(3);
    mockPrisma.apiSettings.findFirst.mockResolvedValue(null);
    mockPrisma.auditLog.findMany.mockResolvedValue([]);
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
    expect(data.data.metrics.publishedContent).toBe(10);
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
    mockPrisma.blogPost.count.mockRejectedValue(new Error("Database error"));

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
