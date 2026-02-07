/**
 * Tests for Enterprise Analytics Service
 */

import { vi } from "vitest";

// Mock the database
vi.mock("@/lib/db", () => ({
  prisma: {
    analyticsEvent: {
      create: vi.fn(),
      findMany: vi.fn(),
      groupBy: vi.fn(),
    },
    systemMetrics: {
      create: vi.fn(),
      findMany: vi.fn(),
      aggregate: vi.fn(),
      deleteMany: vi.fn(),
    },
    user: {
      count: vi.fn(),
    },
    auditLog: {
      count: vi.fn(),
    },
  },
}));

import { analyticsService } from "@/lib/analytics";

describe("Enterprise Analytics Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment variables
    process.env.GA4_MEASUREMENT_ID = "G-TEST123";
    process.env.FEATURE_CONTENT_ANALYTICS = "true";
    process.env.ANALYTICS_ANONYMIZE_IP = "true";
  });

  describe("Configuration Management", () => {
    test("should load configuration from environment variables", () => {
      const config = analyticsService.getClientConfig();

      expect(config.enableAnalytics).toBe(true);
      expect(config.ga4MeasurementId).toBe("G-TEST123");
      expect(config.anonymizeIp).toBe(true);
    });

    test("should disable analytics when feature flag is false", () => {
      process.env.FEATURE_CONTENT_ANALYTICS = "false";

      // Create new instance to pick up env changes
      const config = analyticsService.getClientConfig();
      expect(config.enableAnalytics).toBe(false);
    });

    test("should handle missing environment variables gracefully", () => {
      delete process.env.GA4_MEASUREMENT_ID;

      const config = analyticsService.getClientConfig();
      expect(config.ga4MeasurementId).toBeUndefined();
    });
  });

  describe("Event Tracking", () => {
    test("should track basic analytics event", async () => {
      const { prisma } = require("@/lib/db");
      prisma.analyticsEvent.create.mockResolvedValue({});

      const event = {
        eventName: "page_view",
        category: "navigation",
        label: "/test-page",
        userId: "user-123",
        sessionId: "session-456",
      };

      await analyticsService.trackEvent(event);

      expect(prisma.analyticsEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventName: "page_view",
          category: "navigation",
          label: "/test-page",
          userId: "user-123",
          sessionId: "session-456",
        }),
      });
    });

    test("should track page view event", async () => {
      const { prisma } = require("@/lib/db");
      prisma.analyticsEvent.create.mockResolvedValue({});

      const pageView = {
        page: "/blog/test-article",
        title: "Test Article",
        userId: "user-123",
        sessionId: "session-456",
      };

      await analyticsService.trackPageView(pageView);

      expect(prisma.analyticsEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventName: "page_view",
          category: "navigation",
          label: "/blog/test-article",
          properties: expect.objectContaining({
            page: "/blog/test-article",
            title: "Test Article",
          }),
        }),
      });
    });

    test("should not track events when analytics is disabled", async () => {
      process.env.FEATURE_CONTENT_ANALYTICS = "false";
      const { prisma } = require("@/lib/db");

      const event = {
        eventName: "test_event",
        category: "test",
      };

      await analyticsService.trackEvent(event);

      expect(prisma.analyticsEvent.create).not.toHaveBeenCalled();
    });

    test("should anonymize IP addresses when enabled", async () => {
      const { prisma } = require("@/lib/db");
      prisma.analyticsEvent.create.mockResolvedValue({});

      const mockRequest = {
        ip: "192.168.1.100",
        headers: {
          get: vi.fn().mockReturnValue("test-user-agent"),
        },
      };

      const event = {
        eventName: "test_event",
        category: "test",
      };

      await analyticsService.trackEvent(event, mockRequest as any);

      expect(prisma.analyticsEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ipAddress: "192.168.1.0", // Anonymized IP
        }),
      });
    });
  });

  describe("Metrics Reporting", () => {
    test("should get user metrics", async () => {
      const { prisma } = require("@/lib/db");

      // Mock database responses
      prisma.user.count.mockResolvedValue(100);
      prisma.analyticsEvent.groupBy.mockResolvedValue([
        { userId: "user1" },
        { userId: "user2" },
        { userId: "user3" },
      ]);
      prisma.analyticsEvent.findMany.mockResolvedValue([
        { sessionId: "session1", timestamp: new Date(), userId: "user1" },
        { sessionId: "session1", timestamp: new Date(), userId: "user1" },
        { sessionId: "session2", timestamp: new Date(), userId: "user2" },
      ]);

      const startDate = new Date("2024-01-01");
      const endDate = new Date("2024-01-31");

      const metrics = await analyticsService.getUserMetrics(startDate, endDate);

      expect(metrics.totalUsers).toBe(100);
      expect(metrics.activeUsers).toBe(3);
      expect(prisma.user.count).toHaveBeenCalledWith({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      });
    });

    test("should get content metrics", async () => {
      const { prisma } = require("@/lib/db");

      const mockPageViews = [
        {
          properties: { page: "/blog/article1" },
          sessionId: "session1",
          timestamp: new Date(),
        },
        {
          properties: { page: "/blog/article2" },
          sessionId: "session2",
          timestamp: new Date(),
        },
        {
          properties: { page: "/blog/article1" },
          sessionId: "session3",
          timestamp: new Date(),
        },
      ];

      prisma.analyticsEvent.findMany.mockResolvedValue(mockPageViews);

      const startDate = new Date("2024-01-01");
      const endDate = new Date("2024-01-31");

      const metrics = await analyticsService.getContentMetrics(
        startDate,
        endDate,
      );

      expect(metrics.pageViews).toBe(3);
      expect(metrics.uniquePageViews).toBe(3); // 3 unique sessions
      expect(metrics.topPages).toHaveLength(2);
      expect(metrics.topPages[0]).toEqual({ page: "/blog/article1", views: 2 });
    });

    test("should get system metrics", async () => {
      const { prisma } = require("@/lib/db");

      const mockMetrics = [
        { metricName: "request_count", metricValue: 1000 },
        { metricName: "request_count", metricValue: 1500 },
        { metricName: "response_time", metricValue: 250 },
        { metricName: "response_time", metricValue: 300 },
        { metricName: "error_count", metricValue: 5 },
        { metricName: "uptime", metricValue: 99.5 },
      ];

      prisma.systemMetrics.findMany.mockResolvedValue(mockMetrics);

      const startDate = new Date("2024-01-01");
      const endDate = new Date("2024-01-31");

      const metrics = await analyticsService.getSystemMetrics(
        startDate,
        endDate,
      );

      expect(metrics.requestCount).toBe(2500); // Sum of request counts
      expect(metrics.averageResponseTime).toBe(275); // Average of response times
      expect(metrics.uptime).toBe(99.5);
    });
  });

  describe("System Performance Recording", () => {
    test("should record system metrics", async () => {
      const { prisma } = require("@/lib/db");
      prisma.systemMetrics.create.mockResolvedValue({});

      await analyticsService.recordSystemMetric(
        "request_count",
        100,
        "requests",
        { endpoint: "/api/test" },
      );

      expect(prisma.systemMetrics.create).toHaveBeenCalledWith({
        data: {
          metricName: "request_count",
          metricValue: 100,
          metricUnit: "requests",
          tags: { endpoint: "/api/test" },
        },
      });
    });
  });

  describe("Data Retention", () => {
    test("should clean up old analytics data", async () => {
      const { prisma } = require("@/lib/db");
      prisma.analyticsEvent.deleteMany.mockResolvedValue({ count: 50 });
      prisma.systemMetrics.deleteMany.mockResolvedValue({ count: 25 });

      // Mock retention period of 365 days
      process.env.ANALYTICS_RETENTION_DAYS = "365";

      await analyticsService.cleanupOldData();

      const expectedCutoffDate = new Date();
      expectedCutoffDate.setDate(expectedCutoffDate.getDate() - 365);

      expect(prisma.analyticsEvent.deleteMany).toHaveBeenCalledWith({
        where: {
          timestamp: {
            lt: expect.any(Date),
          },
        },
      });

      expect(prisma.systemMetrics.deleteMany).toHaveBeenCalledWith({
        where: {
          timestamp: {
            lt: expect.any(Date),
          },
        },
      });
    });
  });

  describe("Privacy Controls", () => {
    test("should anonymize IPv4 addresses correctly", () => {
      const service = analyticsService;
      // Access private method through type assertion
      const anonymizeMethod = (service as any).anonymizeIpAddress.bind(service);

      expect(anonymizeMethod("192.168.1.100")).toBe("192.168.1.0");
      expect(anonymizeMethod("10.0.0.50")).toBe("10.0.0.0");
      expect(anonymizeMethod("172.16.0.25")).toBe("172.16.0.0");
    });

    test("should anonymize IPv6 addresses correctly", () => {
      const service = analyticsService;
      const anonymizeMethod = (service as any).anonymizeIpAddress.bind(service);

      expect(anonymizeMethod("2001:db8:85a3:8d3:1319:8a2e:370:7348")).toBe(
        "2001:db8:85a3:8d3::",
      );
      expect(anonymizeMethod("fe80::1")).toBe("fe80::");
    });

    test("should handle unknown IP addresses", () => {
      const service = analyticsService;
      const anonymizeMethod = (service as any).anonymizeIpAddress.bind(service);

      expect(anonymizeMethod("unknown")).toBe("unknown");
      expect(anonymizeMethod("invalid-ip")).toBe("invalid-ip");
    });
  });

  describe("Error Handling", () => {
    test("should handle database errors gracefully", async () => {
      const { prisma } = require("@/lib/db");
      prisma.analyticsEvent.create.mockRejectedValue(
        new Error("Database error"),
      );

      const event = {
        eventName: "test_event",
        category: "test",
      };

      // Should not throw error
      await expect(analyticsService.trackEvent(event)).resolves.not.toThrow();
    });

    test("should return default metrics when database fails", async () => {
      const { prisma } = require("@/lib/db");
      prisma.user.count.mockRejectedValue(new Error("Database error"));

      const startDate = new Date("2024-01-01");
      const endDate = new Date("2024-01-31");

      const metrics = await analyticsService.getUserMetrics(startDate, endDate);

      expect(metrics.totalUsers).toBe(0);
      expect(metrics.activeUsers).toBe(0);
      expect(metrics.averageSessionDuration).toBe(0);
    });
  });

  describe("GA4 Integration", () => {
    test("should send events to GA4 when configured", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      });

      process.env.GA4_MEASUREMENT_ID = "G-TEST123";
      process.env.GA4_API_SECRET = "test-secret";

      const event = {
        eventName: "purchase",
        category: "ecommerce",
        value: 99.99,
        sessionId: "session-123",
      };

      await analyticsService.trackEvent(event);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("google-analytics.com/mp/collect"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("purchase"),
          headers: {
            "Content-Type": "application/json",
          },
        }),
      );
    });

    test("should skip GA4 when not configured", async () => {
      global.fetch = vi.fn();
      delete process.env.GA4_MEASUREMENT_ID;

      const event = {
        eventName: "test_event",
        category: "test",
      };

      await analyticsService.trackEvent(event);

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
});
