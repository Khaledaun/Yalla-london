/**
 * Database Assertion Helpers
 *
 * Runtime assertions to prevent cross-tenant data access
 * and ensure data integrity.
 */

import { TenantMismatchError } from './tenant-queries';

/**
 * Assert that a resource belongs to the expected tenant
 *
 * @throws TenantMismatchError if tenant doesn't match
 */
export function assertTenantOwnership(
  expectedSiteId: string,
  resource: { site_id?: string | null } | null | undefined,
  resourceType: string = 'Resource'
): asserts resource is NonNullable<typeof resource> {
  if (!resource) {
    throw new ResourceNotFoundError(resourceType);
  }

  if (resource.site_id && resource.site_id !== expectedSiteId) {
    throw new TenantMismatchError(expectedSiteId, resource.site_id);
  }
}

/**
 * Assert that a resource exists
 *
 * @throws ResourceNotFoundError if resource is null/undefined
 */
export function assertExists<T>(
  resource: T | null | undefined,
  resourceType: string = 'Resource',
  resourceId?: string
): asserts resource is T {
  if (!resource) {
    throw new ResourceNotFoundError(resourceType, resourceId);
  }
}

/**
 * Assert that a user has permission to access a resource
 *
 * @throws UnauthorizedError if permission check fails
 */
export function assertPermission(
  allowed: boolean,
  action: string,
  resourceType: string
): asserts allowed is true {
  if (!allowed) {
    throw new UnauthorizedError(action, resourceType);
  }
}

/**
 * Assert that a value is one of the allowed values
 *
 * @throws ValidationError if value is not in allowed list
 */
export function assertOneOf<T>(
  value: T,
  allowedValues: readonly T[],
  fieldName: string
): asserts value is T {
  if (!allowedValues.includes(value)) {
    throw new ValidationError(
      `Invalid ${fieldName}: ${value}. Allowed values: ${allowedValues.join(', ')}`
    );
  }
}

/**
 * Assert that a date is in the future
 */
export function assertFutureDate(
  date: Date,
  fieldName: string
): void {
  if (date <= new Date()) {
    throw new ValidationError(`${fieldName} must be in the future`);
  }
}

/**
 * Assert that a string is a valid slug format
 */
export function assertValidSlug(
  slug: string,
  fieldName: string = 'slug'
): void {
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  if (!slugRegex.test(slug)) {
    throw new ValidationError(
      `Invalid ${fieldName}: must be lowercase alphanumeric with hyphens`
    );
  }
}

/**
 * Assert that a string is a valid email format
 */
export function assertValidEmail(
  email: string,
  fieldName: string = 'email'
): void {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ValidationError(`Invalid ${fieldName}: must be a valid email address`);
  }
}

/**
 * Assert array is not empty
 */
export function assertNotEmpty<T>(
  array: T[],
  fieldName: string
): asserts array is [T, ...T[]] {
  if (!array || array.length === 0) {
    throw new ValidationError(`${fieldName} cannot be empty`);
  }
}

/**
 * Assert value is within range
 */
export function assertInRange(
  value: number,
  min: number,
  max: number,
  fieldName: string
): void {
  if (value < min || value > max) {
    throw new ValidationError(`${fieldName} must be between ${min} and ${max}`);
  }
}

// ============================================================================
// ERROR CLASSES
// ============================================================================

/**
 * Error thrown when a resource is not found
 */
export class ResourceNotFoundError extends Error {
  public readonly code = 'RESOURCE_NOT_FOUND';
  public readonly statusCode = 404;

  constructor(resourceType: string, resourceId?: string) {
    const message = resourceId
      ? `${resourceType} with ID ${resourceId} not found`
      : `${resourceType} not found`;
    super(message);
    this.name = 'ResourceNotFoundError';
  }
}

/**
 * Error thrown for unauthorized access attempts
 */
export class UnauthorizedError extends Error {
  public readonly code = 'UNAUTHORIZED';
  public readonly statusCode = 403;

  constructor(action: string, resourceType: string) {
    super(`Not authorized to ${action} ${resourceType}`);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Error thrown for validation failures
 */
export class ValidationError extends Error {
  public readonly code = 'VALIDATION_ERROR';
  public readonly statusCode = 400;

  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Error thrown for duplicate resource attempts
 */
export class DuplicateError extends Error {
  public readonly code = 'DUPLICATE_RESOURCE';
  public readonly statusCode = 409;

  constructor(resourceType: string, field: string, value: string) {
    super(`${resourceType} with ${field} "${value}" already exists`);
    this.name = 'DuplicateError';
  }
}

/**
 * Error thrown when operation is not allowed in current state
 */
export class InvalidStateError extends Error {
  public readonly code = 'INVALID_STATE';
  public readonly statusCode = 409;

  constructor(message: string) {
    super(message);
    this.name = 'InvalidStateError';
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Safe JSON parse that returns null instead of throwing
 */
export function safeJsonParse<T>(json: string | null | undefined): T | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

/**
 * Convert database error to appropriate API error
 */
export function mapDatabaseError(error: unknown): Error {
  if (error instanceof Error) {
    // Prisma unique constraint violation
    if (error.message.includes('Unique constraint')) {
      const match = error.message.match(/fields: \(`([^`]+)`\)/);
      const field = match?.[1] || 'unknown';
      return new DuplicateError('Resource', field, 'value');
    }

    // Prisma record not found
    if (error.message.includes('Record to update not found') ||
        error.message.includes('Record to delete does not exist')) {
      return new ResourceNotFoundError('Resource');
    }

    // Foreign key constraint
    if (error.message.includes('Foreign key constraint')) {
      return new ValidationError('Referenced resource does not exist');
    }
  }

  return error as Error;
}

/**
 * Type guard to check if error is an API error with statusCode
 */
export function isApiError(error: unknown): error is Error & { statusCode: number; code: string } {
  return (
    error instanceof Error &&
    'statusCode' in error &&
    'code' in error &&
    typeof (error as any).statusCode === 'number'
  );
}
