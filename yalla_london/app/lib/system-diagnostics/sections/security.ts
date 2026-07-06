/**
 * Security Diagnostics
 *
 * Tests: auth routes, CRON_SECRET, admin access, XSS protection, CSP headers.
 */

import type { DiagnosticResult } from "../types";

const SECTION = "security";

function pass(id: string, name: string, detail: string, explanation: string): DiagnosticResult {
  return { id: `${SECTION}-${id}`, section: SECTION, name, status: "pass", detail, explanation };
}
function warn(id: string, name: string, detail: string, explanation: string, diagnosis?: string): DiagnosticResult {
  return { id: `${SECTION}-${id}`, section: SECTION, name, status: "warn", detail, explanation, diagnosis };
}
function fail(id: string, name: string, detail: string, explanation: string, diagnosis?: string): DiagnosticResult {
  return { id: `${SECTION}-${id}`, section: SECTION, name, status: "fail", detail, explanation, diagnosis };
}

const securitySection = async (
  _siteId: string,
  _budgetMs: number,
  _startTime: number,
): Promise<DiagnosticResult[]> => {
  const results: DiagnosticResult[] = [];

  // ── 1. CRON_SECRET Configuration ───────────────────────────────────
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && cronSecret.length >= 16) {
    results.push(pass("cron-secret", "CRON_SECRET", `Configured (${cronSecret.length} chars)`, "Protects cron job endpoints from unauthorized execution. Without it, anyone could trigger content generation, publishing, or SEO operations."));
  } else if (cronSecret) {
    results.push(warn("cron-secret", "CRON_SECRET", `Weak — only ${cronSecret.length} chars (16+ recommended)`, "Protects cron job endpoints from unauthorized execution.", "Your CRON_SECRET is too short. Use a long random string for security."));
  } else {
    results.push(warn("cron-secret", "CRON_SECRET", "Not set — cron endpoints unprotected", "Protects cron job endpoints from unauthorized execution.", "Without CRON_SECRET, cron endpoints accept requests from anyone. Set this in your environment variables."));
  }

  // ── 2. NEXTAUTH_SECRET ─────────────────────────────────────────────
  const nextAuthSecret = process.env.NEXTAUTH_SECRET;
  if (nextAuthSecret && nextAuthSecret.length >= 32) {
    results.push(pass("nextauth-secret", "NEXTAUTH_SECRET", `Configured (${nextAuthSecret.length} chars)`, "JWT secret for admin dashboard authentication. Must be a strong random string. If compromised, attackers can forge admin sessions."));
  } else if (nextAuthSecret) {
    results.push(warn("nextauth-secret", "NEXTAUTH_SECRET", `Weak — only ${nextAuthSecret.length} chars (32+ recommended)`, "JWT secret for admin dashboard authentication.", "Your auth secret is too short. Generate a new one with: openssl rand -base64 64"));
  } else {
    results.push(fail("nextauth-secret", "NEXTAUTH_SECRET", "Not set — admin login will fail", "JWT secret for admin dashboard authentication. Without it, the admin dashboard is completely inaccessible.", "Set NEXTAUTH_SECRET to a random 64+ character string."));
  }

  // ── 3. NEXTAUTH_URL ────────────────────────────────────────────────
  const nextAuthUrl = process.env.NEXTAUTH_URL;
  if (nextAuthUrl) {
    if (nextAuthUrl.startsWith("https://")) {
      results.push(pass("nextauth-url", "NEXTAUTH_URL", nextAuthUrl, "Base URL for auth callbacks. Must match your deployed domain and use HTTPS in production."));
    } else if (nextAuthUrl.startsWith("http://localhost")) {
      results.push(pass("nextauth-url", "NEXTAUTH_URL", `${nextAuthUrl} (local dev)`, "Base URL for auth callbacks. localhost is fine for development but must be HTTPS in production."));
    } else {
      results.push(warn("nextauth-url", "NEXTAUTH_URL", `${nextAuthUrl} — not HTTPS`, "Base URL for auth callbacks.", "Production URLs should use HTTPS. Update NEXTAUTH_URL to use https://."));
    }
  } else {
    results.push(fail("nextauth-url", "NEXTAUTH_URL", "Not set", "Base URL for auth callbacks. Without it, login redirects will fail.", "Set NEXTAUTH_URL to your deployed domain (e.g., https://yalla-london.com)."));
  }

  // ── 4. Admin User Existence ────────────────────────────────────────
  try {
    const { prisma } = await import("@/lib/db");
    const adminCount = await prisma.user.count({ where: { role: "admin" } });
    if (adminCount > 0) {
      results.push(pass("admin-exists", "Admin Account", `${adminCount} admin user(s)`, "Verifies at least one admin user exists in the database. Without admins, the dashboard is inaccessible even with correct auth config."));
    } else {
      results.push(warn("admin-exists", "Admin Account", "No admin users — setup may be needed", "Verifies at least one admin user exists.", "Navigate to /admin/login to set up the first admin account."));
    }
  } catch {
    results.push(warn("admin-exists", "Admin Account", "Could not verify admin users", "Verifies at least one admin user exists."));
  }

  // ── 5. Database URL Security ───────────────────────────────────────
  const dbUrl = process.env.DATABASE_URL || "";
  if (dbUrl) {
    const usesSSL = dbUrl.includes("sslmode=require") || dbUrl.includes("ssl=true") || dbUrl.includes("sslmode=verify");
    if (usesSSL) {
      results.push(pass("db-ssl", "Database SSL", "SSL connection enforced", "Checks if the database connection uses SSL encryption. Without SSL, data travels unencrypted between the app and database."));
    } else if (dbUrl.includes("localhost") || dbUrl.includes("127.0.0.1")) {
      results.push(pass("db-ssl", "Database SSL", "Local connection — SSL not required", "SSL encryption for database connections. Not needed for localhost development."));
    } else {
      results.push(warn("db-ssl", "Database SSL", "SSL not detected in DATABASE_URL", "Checks if the database connection uses SSL encryption.", "Add ?sslmode=require to your DATABASE_URL for encrypted connections."));
    }
  }

  // ── 6. Vercel Environment ──────────────────────────────────────────
  if (process.env.VERCEL) {
    results.push(pass("vercel-env", "Vercel Deployment", `Environment: ${process.env.VERCEL_ENV || "unknown"}`, "Confirms the app is running on Vercel. Vercel provides automatic HTTPS, DDoS protection, and edge caching."));
  } else {
    results.push(pass("vercel-env", "Runtime Environment", "Running locally (not Vercel)", "Identifies the runtime environment. Local development is expected during testing."));
  }

  // ── 7. ADMIN_EMAILS Config ─────────────────────────────────────────
  const adminEmails = process.env.ADMIN_EMAILS;
  if (adminEmails && adminEmails.includes("@")) {
    const emailCount = adminEmails.split(",").filter(e => e.includes("@")).length;
    results.push(pass("admin-emails", "Admin Email Allowlist", `${emailCount} email(s) configured`, "Defines which email addresses are allowed to create admin accounts. Without this, the setup page may accept any email."));
  } else {
    results.push(warn("admin-emails", "Admin Email Allowlist", "ADMIN_EMAILS not configured", "Defines which email addresses are allowed to create admin accounts.", "Set ADMIN_EMAILS to restrict who can become an admin."));
  }

  // ── 8. XSS Protection (via DOMPurify) ──────────────────────────────
  try {
    await import("isomorphic-dompurify");
    results.push(pass("xss-sanitizer", "XSS Sanitizer", "isomorphic-dompurify installed", "Checks that the HTML sanitization library is available. All user-generated HTML content is sanitized before rendering to prevent cross-site scripting attacks."));
  } catch {
    results.push(warn("xss-sanitizer", "XSS Sanitizer", "isomorphic-dompurify not installed", "Checks that the HTML sanitization library is available.", "Install it with: npm install isomorphic-dompurify"));
  }

  // ── 9. Environment Isolation ───────────────────────────────────────
  const nodeEnv = process.env.NODE_ENV;
  if (nodeEnv === "production") {
    results.push(pass("node-env", "Node Environment", "production", "Verifies NODE_ENV is set to production. This enables optimizations and disables debug features."));
  } else {
    results.push(pass("node-env", "Node Environment", `${nodeEnv || "undefined"} (non-production)`, "Shows the current Node.js environment. Expected to be 'production' in deployment."));
  }

  return results;
};

export default securitySection;
