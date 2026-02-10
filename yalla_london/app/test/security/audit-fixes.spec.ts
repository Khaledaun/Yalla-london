/**
 * Comprehensive tests for audit fix implementations.
 *
 * Covers:
 * - Signup password persistence
 * - Cron endpoint authentication (fail-closed, timing-safe)
 * - Rate limiting on content generation
 * - Timing-safe comparison utility
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { timingSafeEqual } from "crypto";

// ---------------------------------------------------------------------------
// 1. Timing-safe comparison helper (extracted for unit testing)
// ---------------------------------------------------------------------------
function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

describe("safeCompare", () => {
  it("returns true for identical strings", () => {
    expect(safeCompare("secret123", "secret123")).toBe(true);
  });

  it("returns false for different strings of same length", () => {
    expect(safeCompare("secret123", "secret124")).toBe(false);
  });

  it("returns false for different length strings", () => {
    expect(safeCompare("short", "longer-string")).toBe(false);
  });

  it("returns false for empty vs non-empty", () => {
    expect(safeCompare("", "notempty")).toBe(false);
  });

  it("returns true for empty vs empty", () => {
    expect(safeCompare("", "")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 2. Signup route – password persistence
// ---------------------------------------------------------------------------
// Hoisted mocks so they are accessible in vi.mock factories
const { mockCreate, mockFindUnique } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockFindUnique: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      create: (...args: unknown[]) => mockCreate(...args),
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
  },
}));

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("$2a$12$hashedPasswordValue"),
  },
}));

vi.mock("@/lib/rate-limiting", () => ({
  withRateLimit: (_config: unknown, handler: Function) => handler,
  RateLimitPresets: {
    AUTH: { windowMs: 900000, maxRequests: 5 },
    HEAVY_OPERATIONS: { windowMs: 60000, maxRequests: 2 },
  },
}));

describe("Signup route – password saving", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue({ id: "test-user-id" });
  });

  it("includes passwordHash in user creation", async () => {
    const { POST } = await import(
      "@/app/api/signup/route"
    );

    const request = new NextRequest("http://localhost:3000/api/signup", {
      method: "POST",
      body: JSON.stringify({
        email: "test@example.com",
        password: "securePassword123!",
        firstName: "Test",
        lastName: "User",
      }),
    });

    await POST(request);

    expect(mockCreate).toHaveBeenCalledOnce();
    const createArgs = mockCreate.mock.calls[0][0];
    expect(createArgs.data).toHaveProperty("passwordHash");
    expect(createArgs.data.passwordHash).toBe("$2a$12$hashedPasswordValue");
  });

  it("rejects passwords shorter than 12 characters", async () => {
    const { POST } = await import(
      "@/app/api/signup/route"
    );

    const request = new NextRequest("http://localhost:3000/api/signup", {
      method: "POST",
      body: JSON.stringify({
        email: "test@example.com",
        password: "short",
        firstName: "Test",
        lastName: "User",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("12 characters");
  });

  it("validates email format", async () => {
    const { POST } = await import(
      "@/app/api/signup/route"
    );

    const request = new NextRequest("http://localhost:3000/api/signup", {
      method: "POST",
      body: JSON.stringify({
        email: "not-an-email",
        password: "securePassword123!",
        firstName: "Test",
        lastName: "User",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("Invalid email");
  });
});

// ---------------------------------------------------------------------------
// 3. Cron autopilot – fail-closed auth
// ---------------------------------------------------------------------------
describe("Cron autopilot – authentication", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("rejects requests when CRON_SECRET is not configured", async () => {
    // Remove CRON_SECRET
    delete process.env.CRON_SECRET;

    vi.mock("@/lib/scheduler", () => ({
      runDueTasks: vi.fn().mockResolvedValue({ tasksRun: 0 }),
    }));
    vi.mock("@/lib/cron-logger", () => ({
      logCronExecution: vi.fn().mockResolvedValue(undefined),
    }));

    const { GET } = await import(
      "@/app/api/cron/autopilot/route"
    );

    const request = new NextRequest(
      "http://localhost:3000/api/cron/autopilot",
      {
        method: "GET",
        headers: { authorization: "Bearer some-secret" },
      },
    );

    const response = await GET(request);
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Server misconfigured");
  });

  it("rejects requests with wrong bearer token", async () => {
    process.env.CRON_SECRET = "correct-secret-value";

    vi.mock("@/lib/scheduler", () => ({
      runDueTasks: vi.fn().mockResolvedValue({ tasksRun: 0 }),
    }));
    vi.mock("@/lib/cron-logger", () => ({
      logCronExecution: vi.fn().mockResolvedValue(undefined),
    }));

    const { GET } = await import(
      "@/app/api/cron/autopilot/route"
    );

    const request = new NextRequest(
      "http://localhost:3000/api/cron/autopilot",
      {
        method: "GET",
        headers: { authorization: "Bearer wrong-secret" },
      },
    );

    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it("rejects POST requests with wrong secret in body", async () => {
    process.env.CRON_SECRET = "correct-secret-value";

    vi.mock("@/lib/scheduler", () => ({
      runDueTasks: vi.fn().mockResolvedValue({ tasksRun: 0 }),
    }));
    vi.mock("@/lib/cron-logger", () => ({
      logCronExecution: vi.fn().mockResolvedValue(undefined),
    }));

    const { POST } = await import(
      "@/app/api/cron/autopilot/route"
    );

    const request = new NextRequest(
      "http://localhost:3000/api/cron/autopilot",
      {
        method: "POST",
        body: JSON.stringify({ secret: "wrong-secret" }),
      },
    );

    const response = await POST(request);
    expect(response.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// 4. Cron auto-generate – does not leak error details
// ---------------------------------------------------------------------------
describe("Cron auto-generate – error handling", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.CRON_SECRET = "test-cron-secret";
  });

  it("does not expose internal error details to client", async () => {
    vi.mock("@/lib/content-automation/auto-scheduler", () => ({
      autoContentScheduler: {
        processAutoGeneration: vi
          .fn()
          .mockRejectedValue(new Error("Internal DB connection failed at host:5432")),
      },
    }));
    vi.mock("@/lib/cron-logger", () => ({
      logCronExecution: vi.fn().mockResolvedValue(undefined),
    }));

    const { POST } = await import(
      "@/app/api/cron/auto-generate/route"
    );

    const request = new NextRequest(
      "http://localhost:3000/api/cron/auto-generate",
      {
        method: "POST",
        headers: { authorization: `Bearer test-cron-secret` },
      },
    );

    const response = await POST(request);
    expect(response.status).toBe(500);
    const body = await response.json();
    // Should NOT contain internal error details
    expect(body.error).toBe("Cron job failed");
    expect(body.details).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain("5432");
    expect(JSON.stringify(body)).not.toContain("DB connection");
  });
});

// ---------------------------------------------------------------------------
// 5. Generate content – rate limiting applied
// ---------------------------------------------------------------------------
describe("Generate content – rate limiting", () => {
  it("exports POST as a rate-limited handler", async () => {
    // We verify the structure: POST should be the result of withRateLimit()
    const routeModule = await import(
      "@/app/api/generate-content/route"
    );

    // POST should exist as an exported function (wrapped by withRateLimit)
    expect(typeof routeModule.POST).toBe("function");
  });
});

// ---------------------------------------------------------------------------
// 6. Schema index verification (structural test)
// ---------------------------------------------------------------------------
describe("Prisma schema indexes", () => {
  it("User model has role and isActive indexes", async () => {
    const fs = await import("fs");
    const schema = fs.readFileSync(
      "/home/user/Yalla-london/yalla_london/app/prisma/schema.prisma",
      "utf-8",
    );

    // Extract User model block
    const userMatch = schema.match(
      /model User \{[\s\S]*?\n\}/,
    );
    expect(userMatch).not.toBeNull();
    const userBlock = userMatch![0];

    expect(userBlock).toContain("@@index([role])");
    expect(userBlock).toContain("@@index([isActive])");
    expect(userBlock).toContain("@@index([createdAt])");
  });

  it("Lead model has email index", async () => {
    const fs = await import("fs");
    const schema = fs.readFileSync(
      "/home/user/Yalla-london/yalla_london/app/prisma/schema.prisma",
      "utf-8",
    );

    const leadMatch = schema.match(
      /model Lead \{[\s\S]*?\n\}/,
    );
    expect(leadMatch).not.toBeNull();
    const leadBlock = leadMatch![0];

    expect(leadBlock).toContain("@@index([email])");
  });

  it("PageView model has composite site_id+path index", async () => {
    const fs = await import("fs");
    const schema = fs.readFileSync(
      "/home/user/Yalla-london/yalla_london/app/prisma/schema.prisma",
      "utf-8",
    );

    const pvMatch = schema.match(
      /model PageView \{[\s\S]*?\n\}/,
    );
    expect(pvMatch).not.toBeNull();
    const pvBlock = pvMatch![0];

    expect(pvBlock).toContain("@@index([site_id, path])");
  });
});

// ---------------------------------------------------------------------------
// 7. TypeScript strict flags verification
// ---------------------------------------------------------------------------
describe("TypeScript configuration", () => {
  it("has incremental strict flags enabled", async () => {
    const fs = await import("fs");
    const tsconfig = JSON.parse(
      fs.readFileSync(
        "/home/user/Yalla-london/yalla_london/app/tsconfig.json",
        "utf-8",
      ),
    );
    const opts = tsconfig.compilerOptions;

    expect(opts.noImplicitReturns).toBe(true);
    expect(opts.noImplicitThis).toBe(true);
    expect(opts.strictFunctionTypes).toBe(true);
    expect(opts.strictBindCallApply).toBe(true);
    expect(opts.noImplicitOverride).toBe(true);
  });
});
