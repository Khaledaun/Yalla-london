/**
 * Affiliate Tracking Module
 *
 * @example
 * ```ts
 * import { trackClick, recordConversion, getAffiliateStats } from '@/lib/domains/affiliate';
 *
 * // Track a click
 * const click = await trackClick({
 *   site_id: 'arabaldives',
 *   partner_id: 'booking-com',
 *   resort_id: 'resort-123',
 *   session_id: 's_abc123',
 * });
 *
 * // Record a conversion
 * const conversion = await recordConversion({
 *   click_id: click.id,
 *   booking_value: 350000, // $3,500 in cents
 *   commission: 17500,     // $175 in cents
 * });
 * ```
 */

export * from './types';
export * from './service';
