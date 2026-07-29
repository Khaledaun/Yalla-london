/**
 * Internal traffic detection — blocks admin/preview/test visits from polluting GA4.
 *
 * Addresses Chrome Audit report cmo8u1qrk0000l804mrlppv9k, where 96% of GA4
 * sessions on yalla-london were internal (/admin/*, Vercel preview deploys,
 * /hassan test pages), making aggregate bounce/engagement unusable for UX decisions.
 *
 * Four conditions mark traffic as internal:
 *   1. Pathname starts with "/admin/"
 *   2. Pathname matches /^\/hassan/
 *   3. Hostname ends with ".vercel.app" (also localhost / 127.0.0.1)
 *   4. Cookie contains "internal=true" (set at admin login)
 *
 * All checks are client-side only — window/document are required.
 * Returns false on the server (where we can't know hostname or cookie state).
 */

export function isInternalTraffic(): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return false;
  }

  const pathname = window.location?.pathname ?? "";
  const hostname = window.location?.hostname ?? "";

  if (pathname.startsWith("/admin/") || pathname === "/admin") {
    return true;
  }

  if (/^\/hassan/i.test(pathname)) {
    return true;
  }

  if (
    hostname.endsWith(".vercel.app") ||
    hostname === "localhost" ||
    hostname === "127.0.0.1"
  ) {
    return true;
  }

  try {
    const cookies = document.cookie || "";
    if (/(?:^|;\s*)internal=true(?:;|$)/.test(cookies)) {
      return true;
    }
  } catch {
    // Reading cookies can throw in sandboxed iframes — treat as not internal
  }

  return false;
}

/**
 * Sets the internal=true cookie. Call in the admin login success handler so
 * staff browsing the public site (same browser session) are also excluded.
 * Cookie lasts 1 year; SameSite=Lax so it survives navigation from login.
 */
export function markBrowserInternal(): void {
  if (typeof document === "undefined") return;
  document.cookie = "internal=true; path=/; max-age=31536000; SameSite=Lax";
}

/**
 * Clears the internal=true cookie. Used by the "Unmark internal" button in
 * /admin/cockpit when staff want to test the real-user view.
 */
export function unmarkBrowserInternal(): void {
  if (typeof document === "undefined") return;
  document.cookie = "internal=true; path=/; max-age=0; SameSite=Lax";
}
