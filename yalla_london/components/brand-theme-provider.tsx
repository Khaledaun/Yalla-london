
'use client';

import { useEffect } from 'react';
import { brandConfig, generateCSSVariables } from '@/config/brand-config';

interface BrandThemeProviderProps {
  children: React.ReactNode;
}

export function BrandThemeProvider({ children }: BrandThemeProviderProps) {
  useEffect(() => {
    // Inject brand-specific CSS variables
    const style = document.createElement('style');
    style.textContent = generateCSSVariables();
    document.head.appendChild(style);

    // Set document title dynamically
    document.title = `${brandConfig.siteName} - ${brandConfig.tagline}`;

    // Set meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', brandConfig.description);
    }

    // Set meta keywords
    const metaKeywords = document.querySelector('meta[name="keywords"]');
    if (metaKeywords) {
      metaKeywords.setAttribute('content', brandConfig.seo.keywords);
    }

    // Cleanup function
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return <>{children}</>;
}
