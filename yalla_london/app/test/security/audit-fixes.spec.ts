/**
 * Tests for Phase 1 audit fix implementations.
 *
 * Covers:
 * - Signup password persistence
 * - Cron endpoint authentication (allow if CRON_SECRET unset, reject if set and mismatch)
 * - Rate limiting on content generation
 * - Timing-safe comparison utility
 * - Database indexes
 * - TypeScript strict configuration
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { timingSafeEqual } from "crypto";

const read = (path: string) =>
  readFileSync(`/home/user/Yalla-london/yalla_london/app/${path}`, "utf-8");

// ---------------------------------------------------------------------------
// 1. Timing-safe comparison helper (unit test)
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
describe("Signup route – password saving", () => {
  const src = read("app/api/signup/route.ts");

  it("includes passwordHash in user creation", () => {
    expect(src).toContain("passwordHash: hashedPassword");
  });

  it("hashes password with bcrypt", () => {
    expect(src).toContain("bcrypt.hash(password, 12)");
  });

  it("validates email format", () => {
    expect(src).toContain("Invalid email");
    expect(src).toMatch(/emailRegex|email.*test|regex.*email/i);
  });

  it("enforces minimum 12-character password", () => {
    expect(src).toContain("12 characters");
    expect(src).toContain("password.length < 12");
  });

  it("is rate-limited", () => {
    expect(src).toContain("withRateLimit");
    expect(src).toContain("RateLimitPresets.AUTH");
  });
});

// ---------------------------------------------------------------------------
// 3. Cron autopilot – allow-if-unset auth pattern
// ---------------------------------------------------------------------------
describe("Cron autopilot – authentication", () => {
  const src = read("app/api/cron/autopilot/route.ts");

  it("allows requests when CRON_SECRET is not configured, rejects on mismatch", () => {
    // Standard cron auth pattern: allow if CRON_SECRET not set, reject if set and doesn't match
    expect(src).toContain("const cronSecret = process.env.CRON_SECRET");
    expect(src).toMatch(/if\s*\(cronSecret\s*&&/);
  });

  it("validates GET bearer token", () => {
    expect(src).toContain("Bearer");
    expect(src).toContain("authorization");
  });

  it("returns 401 Unauthorized on auth failure", () => {
    expect(src).toContain("Unauthorized");
    expect(src).toContain("status: 401");
  });

  it("does not leak error details in generic failure response", () => {
    // POST error handler uses a generic message
    expect(src).toContain("'Manual trigger failed'");
  });
});

// ---------------------------------------------------------------------------
// 4. Cron auto-generate – allow-if-unset auth, no error leak
// ---------------------------------------------------------------------------
describe("Cron auto-generate – security", () => {
  const src = read("app/api/cron/auto-generate/route.ts");

  it("uses standard cron auth pattern (allow if unset, reject on mismatch)", () => {
    expect(src).toContain("const cronSecret = process.env.CRON_SECRET");
    expect(src).toMatch(/if\s*\(cronSecret\s*&&/);
  });

  it("does not expose internal error details", () => {
    // Should only return generic error
    expect(src).toContain("{ error: 'Cron job failed' }");
    // Should NOT have 'details' in error response
    expect(src).not.toMatch(/error.*details.*error instanceof/);
  });

  it("logs cron execution results", () => {
    expect(src).toContain("logCronExecution");
  });
});

// ---------------------------------------------------------------------------
// 5. Generate content – rate limiting
// ---------------------------------------------------------------------------
describe("Generate content – rate limiting", () => {
  const src = read("app/api/generate-content/route.ts");

  it("applies rate limiting via withRateLimit", () => {
    expect(src).toContain("withRateLimit");
    expect(src).toContain("RateLimitPresets.HEAVY_OPERATIONS");
  });

  it("exports POST as wrapped handler", () => {
    expect(src).toContain("export const POST = withRateLimit");
  });
});

// ---------------------------------------------------------------------------
// 6. Schema index verification
// ---------------------------------------------------------------------------
describe("Prisma schema indexes", () => {
  const schema = readFileSync(
    "/home/user/Yalla-london/yalla_london/app/prisma/schema.prisma",
    "utf-8",
  );

  it("User model has role and isActive indexes", () => {
    const userBlock = schema.match(/model User \{[\s\S]*?\n\}/)![0];
    expect(userBlock).toContain("@@index([role])");
    expect(userBlock).toContain("@@index([isActive])");
    expect(userBlock).toContain("@@index([createdAt])");
  });

  it("Lead model has email index", () => {
    const leadBlock = schema.match(/model Lead \{[\s\S]*?\n\}/)![0];
    expect(leadBlock).toContain("@@index([email])");
  });

  it("PageView model has composite site_id+path index", () => {
    const pvBlock = schema.match(/model PageView \{[\s\S]*?\n\}/)![0];
    expect(pvBlock).toContain("@@index([site_id, path])");
  });
});

// ---------------------------------------------------------------------------
// 7. TypeScript strict flags
// ---------------------------------------------------------------------------
describe("TypeScript configuration", () => {
  it("has incremental strict flags enabled", () => {
    const tsconfig = JSON.parse(
      readFileSync(
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
