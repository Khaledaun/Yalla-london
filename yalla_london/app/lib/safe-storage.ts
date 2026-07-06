/**
 * Safe Storage Utilities
 *
 * Wraps sessionStorage/localStorage calls with try/catch to prevent
 * crashes in SSR, private browsing, and storage-restricted environments.
 */

// ── Session Storage ──

export function safeSessionGet(key: string): string | null {
  try {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSessionSet(key: string, value: string): void {
  try {
    if (typeof window === "undefined") return;
    sessionStorage.setItem(key, value);
  } catch {
    // Storage full or restricted — silently fail
  }
}

export function safeSessionRemove(key: string): void {
  try {
    if (typeof window === "undefined") return;
    sessionStorage.removeItem(key);
  } catch {
    // Storage restricted — silently fail
  }
}

// ── Local Storage ──

export function safeLocalGet(key: string): string | null {
  try {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeLocalSet(key: string, value: string): void {
  try {
    if (typeof window === "undefined") return;
    localStorage.setItem(key, value);
  } catch {
    // Storage full or restricted — silently fail
  }
}

export function safeLocalRemove(key: string): void {
  try {
    if (typeof window === "undefined") return;
    localStorage.removeItem(key);
  } catch {
    // Storage restricted — silently fail
  }
}

// ── JSON Helpers ──

export function safeSessionGetJSON<T>(key: string): T | null {
  const raw = safeSessionGet(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function safeSessionSetJSON(key: string, value: unknown): void {
  try {
    safeSessionSet(key, JSON.stringify(value));
  } catch {
    // Serialization failed — silently fail
  }
}

export function safeLocalGetJSON<T>(key: string): T | null {
  const raw = safeLocalGet(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function safeLocalSetJSON(key: string, value: unknown): void {
  try {
    safeLocalSet(key, JSON.stringify(value));
  } catch {
    // Serialization failed — silently fail
  }
}
