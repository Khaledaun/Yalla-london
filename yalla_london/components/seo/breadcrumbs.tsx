
'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { useLanguage } from '@/components/language-provider';
import { internalLinking } from '@/lib/seo/internal-linking';
import { SchemaGenerator } from '@/lib/seo/schema-generator';

interface BreadcrumbProps {
  items?: Array<{
    name: string;
    url: string;
  }>;
}

export function Breadcrumbs({ items }: BreadcrumbProps) {
  const { language } = useLanguage();
  
  // Generate breadcrumbs from current path if no items provided
  const breadcrumbItems = items || internalLinking.generateBreadcrumbs(
    typeof window !== 'undefined' ? window.location.pathname : '/',
    language
  );

  // Generate structured data for breadcrumbs
  React.useEffect(() => {
    if (breadcrumbItems.length > 1) {
      const generator = new SchemaGenerator(
        process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com',
        { siteName: 'Yalla London', description: 'Your Guide to London' }
      );
      const breadcrumbSchema = generator.generateBreadcrumbs(breadcrumbItems);
      
      // Add breadcrumb schema to page
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(breadcrumbSchema);
      script.id = 'breadcrumb-schema';
      
      // Remove existing breadcrumb schema
      const existingScript = document.getElementById('breadcrumb-schema');
      if (existingScript) {
        existingScript.remove();
      }
      
      document.head.appendChild(script);
      
      return () => {
        const scriptToRemove = document.getElementById('breadcrumb-schema');
        if (scriptToRemove) {
          scriptToRemove.remove();
        }
      };
    }
  }, [breadcrumbItems]);

  if (breadcrumbItems.length <= 1) {
    return null;
  }

  return (
    <nav className="flex items-center space-x-1 text-sm text-gray-500 mb-6" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-1">
        {breadcrumbItems.map((item, index) => {
          const isLast = index === breadcrumbItems.length - 1;
          
          return (
            <li key={item.url} className="flex items-center">
              {index > 0 && (
                <ChevronRight className="w-4 h-4 mx-2 text-gray-400" aria-hidden="true" />
              )}
              
              {isLast ? (
                <span className="text-gray-900 font-medium" aria-current="page">
                  {index === 0 && <Home className="w-4 h-4 mr-1 inline" />}
                  {item.name}
                </span>
              ) : (
                <Link
                  href={item.url}
                  className="text-gray-500 hover:text-purple-600 transition-colors duration-200 flex items-center"
                >
                  {index === 0 && <Home className="w-4 h-4 mr-1" />}
                  {item.name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// Enhanced breadcrumbs with rich snippets support
export function EnhancedBreadcrumbs({ 
  items, 
  showHome = true,
  separator = 'chevron',
  className = ''
}: BreadcrumbProps & {
  showHome?: boolean;
  separator?: 'chevron' | 'slash' | 'arrow';
  className?: string;
}) {
  const { language } = useLanguage();
  
  const breadcrumbItems = items || internalLinking.generateBreadcrumbs(
    typeof window !== 'undefined' ? window.location.pathname : '/',
    language
  );

  const getSeparatorIcon = () => {
    switch (separator) {
      case 'slash':
        return <span className="mx-2 text-gray-400">/</span>;
      case 'arrow':
        return <span className="mx-2 text-gray-400">→</span>;
      default:
        return <ChevronRight className="w-4 h-4 mx-2 text-gray-400" />;
    }
  };

  // Microdata markup for better SEO
  return (
    <nav 
      className={`flex items-center space-x-1 text-sm ${className}`} 
      aria-label="Breadcrumb"
      itemScope 
      itemType="https://schema.org/BreadcrumbList"
    >
      <ol className="flex items-center space-x-1">
        {breadcrumbItems.map((item, index) => {
          const isLast = index === breadcrumbItems.length - 1;
          
          return (
            <li 
              key={item.url} 
              className="flex items-center"
              itemProp="itemListElement" 
              itemScope 
              itemType="https://schema.org/ListItem"
            >
              <meta itemProp="position" content={(index + 1).toString()} />
              
              {index > 0 && getSeparatorIcon()}
              
              {isLast ? (
                <span 
                  className="text-gray-900 font-medium" 
                  aria-current="page"
                  itemProp="name"
                >
                  {index === 0 && showHome && <Home className="w-4 h-4 mr-1 inline" />}
                  {item.name}
                </span>
              ) : (
                <Link
                  href={item.url}
                  className="text-gray-500 hover:text-purple-600 transition-colors duration-200 flex items-center"
                  itemProp="item"
                >
                  <span itemProp="name">
                    {index === 0 && showHome && <Home className="w-4 h-4 mr-1" />}
                    {item.name}
                  </span>
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
