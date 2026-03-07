/**
 * Zenitha Yachts — Client-side site constants.
 *
 * Client components ("use client") cannot call getSiteConfig() from
 * config/sites.ts (server-only). This file provides a single source of
 * truth for all Zenitha-specific values used in client components.
 *
 * If the domain changes, update ONLY this file.
 */

export const ZENITHA_DOMAIN = 'zenithayachts.com';

export const ZENITHA_CONTACT = {
  /** General inquiries / footer */
  email: `hello@${ZENITHA_DOMAIN}`,
  /** Charter-specific inquiries / contact page / inquiry form */
  charterEmail: `charters@${ZENITHA_DOMAIN}`,
  /** WhatsApp Business number (country code + number, no plus sign).
   *  Set to real number before production launch. */
  whatsapp: '',
  /** Phone number (with country code). Set before production launch. */
  phone: '',
  /** Instagram profile URL. Set before production launch. */
  instagram: '',
  /** LinkedIn profile URL. Set before production launch. */
  linkedin: '',
};
