
'use client';

import React from 'react';
import { SchemaGenerator } from '@/lib/seo/schema-generator';
import { useLanguage } from '@/components/language-provider';

interface FAQItem {
  question: string;
  answer: string;
}

interface StructuredFAQProps {
  faqs: FAQItem[];
  className?: string;
}

export function StructuredFAQ({ faqs, className = '' }: StructuredFAQProps) {
  const { language } = useLanguage();

  React.useEffect(() => {
    if (faqs.length > 0) {
      const generator = new SchemaGenerator(
        process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com',
        { siteName: 'Yalla London', description: 'Your Guide to London' }
      );
      const faqSchema = generator.generateFAQ(faqs);
      
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(faqSchema);
      script.id = 'faq-schema';
      
      // Remove existing FAQ schema
      const existingScript = document.getElementById('faq-schema');
      if (existingScript) {
        existingScript.remove();
      }
      
      document.head.appendChild(script);
      
      return () => {
        const scriptToRemove = document.getElementById('faq-schema');
        if (scriptToRemove) {
          scriptToRemove.remove();
        }
      };
    }
    return undefined;
  }, [faqs]);

  return (
    <section className={`space-y-6 ${className}`}>
      <h2 className="text-2xl font-bold text-charcoal">
        {language === 'en' ? 'Frequently Asked Questions' : 'الأسئلة الشائعة'}
      </h2>

      <div className="space-y-4">
        {faqs.map((faq, index) => (
          <details
            key={index}
            className="group border border-sand rounded-lg p-4 hover:border-london-300 transition-colors"
            itemScope
            itemType="https://schema.org/Question"
          >
            <summary
              className="cursor-pointer font-medium text-charcoal group-open:text-london-600 list-none flex items-center justify-between"
              itemProp="name"
            >
              <span>{faq.question}</span>
              <svg
                className="w-5 h-5 text-stone group-open:rotate-45 transition-transform duration-200"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </summary>

            <div
              className="mt-4 text-stone leading-relaxed"
              itemScope 
              itemType="https://schema.org/Answer"
            >
              <div itemProp="text">
                {faq.answer}
              </div>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

interface HowToStep {
  name: string;
  text: string;
  image?: string;
}

interface StructuredHowToProps {
  title: string;
  description: string;
  steps: HowToStep[];
  totalTime?: string;
  className?: string;
}

export function StructuredHowTo({ 
  title, 
  description, 
  steps, 
  totalTime,
  className = ''
}: StructuredHowToProps) {
  React.useEffect(() => {
    // HowTo schema deprecated by Google (Sept 2023) — render as Article instead
    const howToSchema = {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": title,
      "description": description,
    };
    
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(howToSchema);
    script.id = 'howto-schema';
    
    // Remove existing HowTo schema
    const existingScript = document.getElementById('howto-schema');
    if (existingScript) {
      existingScript.remove();
    }
    
    document.head.appendChild(script);
    
    return () => {
      const scriptToRemove = document.getElementById('howto-schema');
      if (scriptToRemove) {
        scriptToRemove.remove();
      }
    };
  }, [title, description, steps, totalTime]);

  return (
    <section 
      className={`space-y-6 ${className}`}
      itemScope 
      itemType="https://schema.org/Article"
    >
      <div>
        <h2 className="text-2xl font-bold text-charcoal mb-2" itemProp="name">
          {title}
        </h2>
        <p className="text-stone" itemProp="description">
          {description}
        </p>
        {totalTime && (
          <p className="text-sm text-stone mt-2">
            <span className="font-medium">Total Time:</span> 
            <time itemProp="totalTime">{totalTime}</time>
          </p>
        )}
      </div>
      
      <ol className="space-y-4">
        {steps.map((step, index) => (
          <li 
            key={index}
            className="flex items-start space-x-4 p-4 bg-cream rounded-lg"
            itemProp="recipeInstructions"
            itemScope 
            itemType="https://schema.org/HowToStep"
          >
            <div className="flex-shrink-0 w-8 h-8 bg-london-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
              {index + 1}
            </div>
            
            <div className="flex-1">
              <h3 className="font-medium text-charcoal mb-1" itemProp="name">
                {step.name}
              </h3>
              <p className="text-stone" itemProp="text">
                {step.text}
              </p>
            </div>
            
            {step.image && (
              <div className="flex-shrink-0">
                <img 
                  src={step.image} 
                  alt={step.name}
                  className="w-16 h-16 rounded-lg object-cover"
                  itemProp="image"
                />
              </div>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

// AI-optimized content summary for AEO
interface ContentSummaryProps {
  title: string;
  keyFacts: string[];
  location?: string;
  price?: string;
  rating?: number;
  categories: string[];
  className?: string;
}

export function AEOContentSummary({
  title,
  keyFacts,
  location,
  price,
  rating,
  categories,
  className = ''
}: ContentSummaryProps) {
  React.useEffect(() => {
    const generator = new SchemaGenerator(
      process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com',
      { siteName: 'Yalla London', description: 'Your Guide to London' }
    );
    const summarySchema = generator.generateArticle({
      title,
      content: keyFacts.join(' '),
      author: 'Yalla London Team',
      publishedAt: new Date().toISOString(),
      tags: categories,
      slug: title.toLowerCase().replace(/\s+/g, '-')
    });
    
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(summarySchema);
    script.id = 'summary-schema';
    
    const existingScript = document.getElementById('summary-schema');
    if (existingScript) {
      existingScript.remove();
    }
    
    document.head.appendChild(script);
    
    return () => {
      const scriptToRemove = document.getElementById('summary-schema');
      if (scriptToRemove) {
        scriptToRemove.remove();
      }
    };
  }, [title, keyFacts, location, price, rating, categories]);

  return (
    <aside className={`bg-london-50 border border-london-200 rounded-lg p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-london-900 mb-4">Quick Facts</h3>

      <ul className="space-y-2">
        {keyFacts.map((fact, index) => (
          <li key={index} className="flex items-start space-x-2 text-sm">
            <div className="w-1.5 h-1.5 bg-london-600 rounded-full mt-2 flex-shrink-0" />
            <span className="text-stone">{fact}</span>
          </li>
        ))}
      </ul>
      
      <div className="mt-4 pt-4 border-t border-london-200 space-y-2 text-sm">
        {location && (
          <div className="flex items-center justify-between">
            <span className="font-medium text-stone">Location:</span>
            <span className="text-stone">{location}</span>
          </div>
        )}

        {price && (
          <div className="flex items-center justify-between">
            <span className="font-medium text-stone">Price:</span>
            <span className="text-stone">{price}</span>
          </div>
        )}

        {rating && (
          <div className="flex items-center justify-between">
            <span className="font-medium text-stone">Rating:</span>
            <div className="flex items-center space-x-1">
              {Array.from({ length: 5 }, (_, i) => (
                <svg
                  key={i}
                  className={`w-4 h-4 ${i < rating ? 'text-yalla-gold-400' : 'text-sand'}`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
              <span className="text-stone ml-1">{rating}/5</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
