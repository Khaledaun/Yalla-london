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
    // This allows the hook to work during development
    return {
      siteId: 'yalla-london',
      siteName: 'Yalla London',
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
