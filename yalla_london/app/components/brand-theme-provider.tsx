
'use client';

import React, { useEffect } from 'react';
import { brandConfig, generateCSSVariables } from '@/config/brand-config';

interface BrandThemeProviderProps {
  children: React.ReactNode;
}

export function BrandThemeProvider({ children }: BrandThemeProviderProps) {
  useEffect(() => {
    // Inject brand-specific CSS variables (safe for all sites — Zenitha uses --z- prefix)
    const style = document.createElement('style');
    style.textContent = generateCSSVariables();
    document.head.appendChild(style);

    // NOTE: document.title and meta tags are NOT set here.
    // Next.js generateMetadata() handles per-site metadata correctly.
    // Overriding here would break multi-site support (Zenitha Yachts, etc.)

    // Cleanup function
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return <>{children}</>;
}
