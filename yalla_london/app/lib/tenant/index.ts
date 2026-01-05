/**
 * Tenant Module
 *
 * Multi-tenant utilities for the Arabaldives platform.
 *
 * Server-side usage:
 * ```ts
 * import { getTenantContext, getVisitorContext } from '@/lib/tenant';
 *
 * export default async function Page() {
 *   const tenant = await getTenantContext();
 *   const visitor = await getVisitorContext();
 *   // ...
 * }
 * ```
 *
 * Client-side usage:
 * ```tsx
 * import { useTenant, useSiteCheck } from '@/lib/tenant';
 *
 * function MyComponent() {
 *   const { siteId, isRTL } = useTenant();
 *   const { isArabaldives } = useSiteCheck();
 *   // ...
 * }
 * ```
 */

// Server-side utilities
export {
  getTenantContext,
  getVisitorContext,
  getTenantFromHeaders,
  getUTMFromCookies,
  type TenantContext,
  type VisitorContext,
} from './context';

// Client-side utilities
export { TenantProvider, useTenant, useSiteCheck, type TenantContextValue } from './provider';
