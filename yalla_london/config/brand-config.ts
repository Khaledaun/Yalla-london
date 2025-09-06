
// Active Brand Configuration
// This file determines which brand template is currently active

import { brandTemplates, type BrandConfig, type BusinessType } from './brand-templates';

// Change this to switch between different brand configurations
const ACTIVE_BRAND: BusinessType = (process.env.NEXT_PUBLIC_BRAND_TYPE as BusinessType) || 'luxury-guide';

// Get the active brand configuration
export const getBrandConfig = (): BrandConfig => {
  const config = brandTemplates[ACTIVE_BRAND];
  
  if (!config) {
    console.warn(`Brand template '${ACTIVE_BRAND}' not found, falling back to luxury-guide`);
    return brandTemplates['luxury-guide'];
  }
  
  return config;
};

// Export active configuration
export const brandConfig = getBrandConfig();

// Utility functions for easy access
export const getColors = () => brandConfig.colors;
export const getNavigation = () => brandConfig.navigation;
export const getCategories = () => brandConfig.categories;
export const getContact = () => brandConfig.contact;
export const getSEO = () => brandConfig.seo;
export const getContentTypes = () => brandConfig.contentTypes;

// Helper function to get category by slug
export const getCategoryBySlug = (slug: string) => {
  return brandConfig.categories.find(cat => cat.slug === slug);
};

// Helper function to get navigation item by key
export const getNavItemByKey = (key: string) => {
  return brandConfig.navigation.find(item => item.key === key);
};

// CSS Custom Properties Generator
export const generateCSSVariables = () => {
  const colors = getColors();
  return `
    :root {
      --color-primary: ${colors.primary};
      --color-secondary: ${colors.secondary};
      --color-accent: ${colors.accent};
      --color-background: ${colors.background};
      --color-text: ${colors.text};
      --color-muted: ${colors.muted};
    }
  `;
};

// Brand-specific translations
export const getBrandTranslations = (language: 'en' | 'ar') => {
  return {
    siteName: language === 'en' ? brandConfig.siteName : brandConfig.siteNameAr,
    tagline: language === 'en' ? brandConfig.tagline : brandConfig.taglineAr,
    description: language === 'en' ? brandConfig.description : brandConfig.descriptionAr,
  };
};

export default brandConfig;
