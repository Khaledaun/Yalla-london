
'use client';

import { brandConfig, getBrandTranslations, getNavigation, getCategories } from '@/config/brand-config';
import { useLanguage } from '@/components/language-provider';

export function useBrandConfig() {
  const { language } = useLanguage();
  
  const translations = getBrandTranslations(language);
  const navigation = getNavigation();
  const categories = getCategories();
  
  return {
    config: brandConfig,
    translations,
    navigation,
    categories,
    colors: brandConfig.colors,
    contact: brandConfig.contact,
    seo: brandConfig.seo,
    businessType: brandConfig.businessType,
  };
}

// Hook for getting category-specific translations
export function useCategoryTranslations() {
  const { language } = useLanguage();
  const categories = getCategories();
  
  const getCategoryName = (slug: string) => {
    const category = categories.find(cat => cat.slug === slug);
    return category ? (language === 'en' ? category.nameEn : category.nameAr) : slug;
  };
  
  const getCategoryDescription = (slug: string) => {
    const category = categories.find(cat => cat.slug === slug);
    return category ? (language === 'en' ? category.descriptionEn : category.descriptionAr) : '';
  };
  
  return {
    categories,
    getCategoryName,
    getCategoryDescription,
  };
}

// Hook for navigation translations
export function useNavigationTranslations() {
  const { language } = useLanguage();
  const navigation = getNavigation();
  
  const getNavLabel = (key: string) => {
    const navItem = navigation.find(item => item.key === key);
    return navItem ? (language === 'en' ? navItem.labelEn : navItem.labelAr) : key;
  };
  
  return {
    navigation,
    getNavLabel,
  };
}
