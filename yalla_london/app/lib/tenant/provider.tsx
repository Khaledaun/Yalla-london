'use client';

/**
 * Client-side Tenant Context Provider
 *
 * Provides tenant context to client components. The initial context
 * is passed from the server via a script tag or props.
 */

import React, { createContext, useContext, ReactNode } from 'react';

export interface TenantContextValue {
  siteId: string;
  siteName: string;
  locale: 'en' | 'ar';
  hostname: string;
  isRTL: boolean;
}

const TenantContext = createContext<TenantContextValue | null>(null);

interface TenantProviderProps {
  children: ReactNode;
  value: TenantContextValue;
}

export function TenantProvider({ children, value }: TenantProviderProps) {
  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

/**
 * Hook to access tenant context in client components
 *
 * @example
 * ```tsx
 * const { siteId, locale, isRTL } = useTenant();
 * ```
 */
export function useTenant(): TenantContextValue {
  const context = useContext(TenantContext);

  if (!context) {
    // Return default values if not in a TenantProvider
    // This allows the hook to work during development.
    // Uses dynamic config for correct multi-site default.
    let defaultId = 'yalla-london';
    let defaultName = 'Yalla London';
    try {
      const sites = require('@/config/sites');
      defaultId = sites.getDefaultSiteId();
      defaultName = sites.getDefaultSiteName?.() || defaultName;
    } catch { /* config not available in client bundle — use safe defaults */ }
    return {
      siteId: defaultId,
      siteName: defaultName,
      locale: 'en',
      hostname: 'localhost:3000',
      isRTL: false,
    };
  }

  return context;
}

/**
 * Hook to check if current tenant is a specific site
 */
export function useSiteCheck() {
  const { siteId } = useTenant();

  return {
    isYallaLondon: siteId === 'yalla-london',
    isArabaldives: siteId === 'arabaldives',
    isFrenchRiviera: siteId === 'french-riviera',
    isIstanbul: siteId === 'istanbul',
    isThailand: siteId === 'thailand',
  };
}
