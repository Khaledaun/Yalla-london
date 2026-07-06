# Security Scan

On-demand security audit of the codebase. Covers OWASP Top 10 patterns specific to this project.

## Steps

1. **Auth boundary check** — Scan all `app/api/admin/` routes:
   - Verify each exports `requireAdmin` or `withAdminAuth` as the FIRST middleware
   - Flag routes where `requireAdmin` return value is discarded (must check: `const authError = await requireAdmin(request); if (authError) return authError;`)
   - Flag routes using only `aiLimiter()` or feature flags without auth

2. **Public mutation check** — Scan all `app/api/` routes (non-admin):
   - Flag any POST/PUT/DELETE handler without auth that writes to DB or triggers external APIs
   - Exception: `/api/affiliate/click` (redirect), `/api/gdpr/delete` (public by design), webhooks with signature verification

3. **XSS vectors** — Search for `dangerouslySetInnerHTML` across all components:
   - Verify each is wrapped with `sanitizeHtml()` from `@/lib/html-sanitizer`
   - Check SVG content uses `sanitizeSvg()`

4. **Information disclosure** — Check API error responses:
   - No `error.message` in public-facing API responses (use generic messages)
   - No credential prefixes, API keys, or internal paths in responses
   - No `console.log` of sensitive data (API keys, tokens, passwords)

5. **Injection patterns**:
   - SQL: Verify all DB access uses Prisma (parameterized) — no raw SQL with string interpolation
   - SSRF: Check any `fetch()` that accepts user-provided URLs has domain allowlists
   - Command injection: No `exec()` or `spawn()` with user input

6. **Credential exposure**:
   - No API keys, tokens, or secrets in committed code (check `.env.example` only has placeholder values)
   - No credentials in API response bodies (use `_configured: boolean` indicators)

7. **CSRF/Auth**:
   - Verify webhook endpoints have signature verification (Stripe: HMAC, WhatsApp: HMAC-SHA256, Resend: svix)
   - Verify admin login has rate limiting

8. **Report** — Output findings with severity:
   - 🔴 **CRITICAL**: Active vulnerability, fix immediately
   - 🟠 **HIGH**: Exploitable with effort, fix before next deploy
   - 🟡 **MEDIUM**: Defense-in-depth gap
   - ✅ **CLEAN**: No issues in this category

## Arguments
$ARGUMENTS (optional: `--quick` for auth-only check, `--full` for everything including dependency audit)
