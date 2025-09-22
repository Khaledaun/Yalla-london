/**
 * Type Utilities
 * Safe type casting and validation utilities
 */

// Safe type casting for Prisma results
export function safeCast<T>(value: any, fallback: T): T {
  return value ?? fallback;
}

// Safe array mapping with type safety
export function safeMap<T, U>(
  array: T[] | undefined | null,
  mapper: (item: T, index: number) => U,
  fallback: U[] = []
): U[] {
  if (!array || !Array.isArray(array)) {
    return fallback;
  }
  return array.map(mapper);
}

// Safe object property access
export function safeGet<T>(
  obj: any,
  path: string,
  fallback: T
): T {
  try {
    const keys = path.split('.');
    let result = obj;
    for (const key of keys) {
      if (result == null || typeof result !== 'object') {
        return fallback;
      }
      result = result[key];
    }
    return result ?? fallback;
  } catch {
    return fallback;
  }
}

// Type guard for checking if value is not null/undefined
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

// Safe string conversion
export function safeString(value: any, fallback: string = ''): string {
  if (typeof value === 'string') return value;
  if (value == null) return fallback;
  return String(value);
}

// Safe number conversion
export function safeNumber(value: any, fallback: number = 0): number {
  if (typeof value === 'number' && !isNaN(value)) return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    if (!isNaN(parsed)) return parsed;
  }
  return fallback;
}

// Safe boolean conversion
export function safeBoolean(value: any, fallback: boolean = false): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  return fallback;
}

// Safe date conversion
export function safeDate(value: any, fallback: Date = new Date()): Date {
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    if (!isNaN(date.getTime())) return date;
  }
  return fallback;
}

// Safe array conversion
export function safeArray<T>(value: any, fallback: T[] = []): T[] {
  if (Array.isArray(value)) return value;
  if (value == null) return fallback;
  return [value];
}

// Safe object conversion
export function safeObject<T extends Record<string, any>>(
  value: any,
  fallback: T
): T {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value;
  }
  return fallback;
}

// Type-safe environment variable access
export function getEnvVar(key: string, fallback: string = ''): string {
  return safeString(process.env[key], fallback);
}

export function getEnvBoolean(key: string, fallback: boolean = false): boolean {
  return safeBoolean(process.env[key], fallback);
}

export function getEnvNumber(key: string, fallback: number = 0): number {
  return safeNumber(process.env[key], fallback);
}

// Type-safe async operation wrapper
export async function safeAsync<T>(
  operation: () => Promise<T>,
  fallback: T
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    console.warn('Safe async operation failed:', error);
    return fallback;
  }
}

// Type-safe sync operation wrapper
export function safeSync<T>(
  operation: () => T,
  fallback: T
): T {
  try {
    return operation();
  } catch (error) {
    console.warn('Safe sync operation failed:', error);
    return fallback;
  }
}
