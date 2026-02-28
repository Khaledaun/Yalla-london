
/**
 * Advanced Schema.org Generator
 * Generates structured data for different content types
 */

export interface SchemaBaseProps {
  '@context': string;
  '@type': string;
  '@id'?: string;
  name?: string;
  description?: string;
  url?: string;
  image?: string | ImageObject;
  sameAs?: string[];
}

export interface ImageObject {
  '@type': 'ImageObject';
  url: string;
  width?: number;
  height?: number;
  caption?: string;
}

export interface PersonSchema extends SchemaBaseProps {
  '@type': 'Person';
  givenName?: string;
  familyName?: string;
  jobTitle?: string;
  worksFor?: OrganizationSchema;
  email?: string;
  telephone?: string;
}

export interface OrganizationSchema extends SchemaBaseProps {
  '@type': 'Organization';
  logo?: string | ImageObject;
  contactPoint?: ContactPoint[];
  address?: PostalAddress;
  founder?: PersonSchema;
  foundingDate?: string;
  numberOfEmployees?: number;
}

export interface ContactPoint {
  '@type': 'ContactPoint';
  telephone: string;
  contactType: string;
  email?: string;
  availableLanguage?: string[];
}

export interface PostalAddress {
  '@type': 'PostalAddress';
  streetAddress: string;
  addressLocality: string;
  addressRegion?: string;
  postalCode?: string;
  addressCountry: string;
}

export interface ArticleSchema extends SchemaBaseProps {
  '@type': 'Article';
  headline: string;
  author: PersonSchema | string;
  publisher: OrganizationSchema;
  datePublished: string;
  dateModified?: string;
  articleSection?: string;
  wordCount?: number;
  articleBody?: string;
  mainEntityOfPage?: string;
  keywords?: string;
  inLanguage?: string;
  isAccessibleForFree?: boolean;
}

export interface EventSchema extends SchemaBaseProps {
  '@type': 'Event';
  startDate: string;
  endDate?: string;
  location: PlaceSchema | string;
  organizer?: OrganizationSchema | PersonSchema;
  offers?: OfferSchema[];
  eventStatus?: 'EventScheduled' | 'EventPostponed' | 'EventCancelled';
  eventAttendanceMode?: 'OfflineEventAttendanceMode' | 'OnlineEventAttendanceMode' | 'MixedEventAttendanceMode';
  performer?: PersonSchema | OrganizationSchema;
}

export interface PlaceSchema extends SchemaBaseProps {
  '@type': 'Place' | 'Restaurant' | 'TouristAttraction' | 'Hotel' | 'TouristDestination';
  address: PostalAddress;
  geo?: GeoCoordinates;
  telephone?: string;
  priceRange?: string;
  aggregateRating?: AggregateRating;
  review?: ReviewSchema[];
  openingHoursSpecification?: OpeningHoursSpecification[];
  amenityFeature?: PropertyValue[];
}

export interface GeoCoordinates {
  '@type': 'GeoCoordinates';
  latitude: number;
  longitude: number;
}

export interface AggregateRating {
  '@type': 'AggregateRating';
  ratingValue: number;
  bestRating?: number;
  worstRating?: number;
  ratingCount: number;
}

export interface ReviewSchema extends SchemaBaseProps {
  '@type': 'Review';
  author: PersonSchema | string;
  datePublished: string;
  reviewRating: Rating;
  reviewBody: string;
  itemReviewed?: SchemaBaseProps;
}

export interface Rating {
  '@type': 'Rating';
  ratingValue: number;
  bestRating?: number;
  worstRating?: number;
}

export interface OfferSchema {
  '@type': 'Offer';
  name?: string;
  price?: string;
  priceCurrency?: string;
  availability?: string;
  validFrom?: string;
  validThrough?: string;
  url?: string;
}

export interface OpeningHoursSpecification {
  '@type': 'OpeningHoursSpecification';
  dayOfWeek: string[];
  opens: string;
  closes: string;
}

export interface PropertyValue {
  '@type': 'PropertyValue';
  name: string;
  value: string | number | boolean;
}

export interface FAQPageSchema extends SchemaBaseProps {
  '@type': 'FAQPage';
  mainEntity: QuestionSchema[];
}

export interface QuestionSchema {
  '@type': 'Question';
  name: string;
  acceptedAnswer: AnswerSchema;
}

export interface AnswerSchema {
  '@type': 'Answer';
  text: string;
  author?: PersonSchema | string;
  dateCreated?: string;
}

export interface HowToSchema extends SchemaBaseProps {
  '@type': 'HowTo';
  name: string;
  description: string;
  step: HowToStepSchema[];
  totalTime?: string;
  estimatedCost?: MonetaryAmount;
  supply?: string[];
  tool?: string[];
  inLanguage?: string;
}

export interface HowToStepSchema {
  '@type': 'HowToStep';
  name: string;
  text: string;
  image?: string | ImageObject;
  url?: string;
}

export interface MonetaryAmount {
  '@type': 'MonetaryAmount';
  currency: string;
  value: number;
}

export interface BreadcrumbListSchema extends SchemaBaseProps {
  '@type': 'BreadcrumbList';
  itemListElement: ListItemSchema[];
}

export interface ListItemSchema {
  '@type': 'ListItem';
  position: number;
  name: string;
  item: string;
}

export interface WebsiteSchema extends SchemaBaseProps {
  '@type': 'Website';
  potentialAction?: SearchActionSchema;
  inLanguage?: string[];
  publisher?: OrganizationSchema;
}

export interface SearchActionSchema {
  '@type': 'SearchAction';
  target: {
    '@type': 'EntryPoint';
    urlTemplate: string;
  };
  'query-input': string;
}

export interface VideoObjectSchema extends SchemaBaseProps {
  '@type': 'VideoObject';
  name: string;
  description: string;
  thumbnailUrl: string | string[];
  uploadDate: string;
  duration?: string;
  contentUrl?: string;
  embedUrl?: string;
  interactionStatistic?: InteractionCounterSchema[];
}

export interface InteractionCounterSchema {
  '@type': 'InteractionCounter';
  interactionType: string;
  userInteractionCount: number;
}

export class SchemaGenerator {
  private baseUrl: string;
  private defaultOrganization: OrganizationSchema;
  private defaultPerson: PersonSchema;

  constructor(baseUrl: string, brandConfig: any) {
    this.baseUrl = baseUrl;
    
    this.defaultOrganization = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': `${baseUrl}#organization`,
      name: brandConfig.siteName,
      url: baseUrl,
      description: brandConfig.description,
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/images/${(brandConfig.logoFileName as string) || 'logo.svg'}`,
        width: 300,
        height: 100
      },
      sameAs: Object.values(brandConfig.contact?.social || {}).filter(Boolean) as string[],
      contactPoint: brandConfig.contact?.email ? [{
        '@type': 'ContactPoint',
        telephone: brandConfig.contact.phone || '',
        contactType: 'Customer Support',
        email: brandConfig.contact.email,
        availableLanguage: ['English', 'Arabic']
      }] : []
    };

    this.defaultPerson = {
      '@context': 'https://schema.org',
      '@type': 'Person',
      '@id': `${baseUrl}#founder`,
      name: `${brandConfig.siteName || 'Editorial'} Team`,
      jobTitle: 'Content Creator',
      worksFor: this.defaultOrganization
    };
  }

  /** Returns the organization name for this site (used by schema injector for author fallbacks) */
  getOrganizationName(): string {
    return this.defaultOrganization.name;
  }

  generateWebsite(searchEnabled: boolean = true): WebsiteSchema {
    const schema: WebsiteSchema = {
      '@context': 'https://schema.org',
      '@type': 'Website',
      '@id': `${this.baseUrl}#website`,
      name: this.defaultOrganization.name,
      url: this.baseUrl,
      description: this.defaultOrganization.description,
      publisher: this.defaultOrganization,
      inLanguage: ['en', 'ar']
    };

    if (searchEnabled) {
      schema.potentialAction = {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${this.baseUrl}/search?q={search_term_string}`
        },
        'query-input': 'required name=search_term_string'
      };
    }

    return schema;
  }

  generateArticle(article: {
    title: string;
    content: string;
    slug: string;
    excerpt?: string;
    publishedAt: string;
    updatedAt?: string;
    author?: string;
    category?: string;
    tags?: string[];
    featuredImage?: string;
  }): ArticleSchema {
    return {
      '@context': 'https://schema.org',
      '@type': 'Article',
      '@id': `${this.baseUrl}/blog/${article.slug}#article`,
      headline: article.title,
      description: article.excerpt || article.content.substring(0, 160),
      articleBody: article.content,
      author: article.author ? {
        '@context': 'https://schema.org',
        '@type': 'Person',
        '@id': `${this.baseUrl}#author-${article.author.replace(/\s+/g, '-').toLowerCase()}`,
        name: article.author
      } : this.defaultPerson,
      publisher: this.defaultOrganization,
      datePublished: article.publishedAt,
      dateModified: article.updatedAt || article.publishedAt,
      mainEntityOfPage: `${this.baseUrl}/blog/${article.slug}`,
      url: `${this.baseUrl}/blog/${article.slug}`,
      image: article.featuredImage ? {
        '@type': 'ImageObject',
        url: article.featuredImage,
        width: 1200,
        height: 630
      } : undefined,
      articleSection: article.category,
      keywords: article.tags?.join(', '),
      inLanguage: 'en',
      isAccessibleForFree: true
    };
  }

  generateEvent(event: {
    title: string;
    description: string;
    startDate: string;
    endDate?: string;
    location: {
      name: string;
      address: string;
      city: string;
      country: string;
      latitude?: number;
      longitude?: number;
    };
    price?: {
      amount: string;
      currency: string;
    };
    organizer?: string;
    image?: string;
    slug: string;
  }): EventSchema {
    const locationSchema: PlaceSchema = {
      '@context': 'https://schema.org',
      '@type': 'Place',
      '@id': `${this.baseUrl}/locations/${event.location.name.replace(/\s+/g, '-').toLowerCase()}#place`,
      name: event.location.name,
      address: {
        '@type': 'PostalAddress',
        streetAddress: event.location.address,
        addressLocality: event.location.city,
        addressCountry: event.location.country
      },
      geo: event.location.latitude && event.location.longitude ? {
        '@type': 'GeoCoordinates',
        latitude: event.location.latitude,
        longitude: event.location.longitude
      } : undefined
    };

    const schema: EventSchema = {
      '@context': 'https://schema.org',
      '@type': 'Event',
      '@id': `${this.baseUrl}/events/${event.slug}#event`,
      name: event.title,
      description: event.description,
      startDate: event.startDate,
      endDate: event.endDate,
      location: locationSchema,
      organizer: this.defaultOrganization,
      eventStatus: 'EventScheduled',
      eventAttendanceMode: 'OfflineEventAttendanceMode',
      url: `${this.baseUrl}/events/${event.slug}`,
      image: event.image ? {
        '@type': 'ImageObject',
        url: event.image,
        width: 1200,
        height: 630
      } : undefined
    };

    if (event.price) {
      schema.offers = [{
        '@type': 'Offer',
        price: event.price.amount,
        priceCurrency: event.price.currency,
        availability: 'https://schema.org/InStock',
        url: `${this.baseUrl}/events/${event.slug}`
      }];
    }

    return schema;
  }

  generatePlace(place: {
    name: string;
    description: string;
    type: 'Restaurant' | 'TouristAttraction' | 'Hotel' | 'TouristDestination';
    address: string;
    city: string;
    country: string;
    phone?: string;
    website?: string;
    priceRange?: string;
    rating?: {
      value: number;
      count: number;
    };
    amenities?: string[];
    latitude?: number;
    longitude?: number;
    slug: string;
    /** For TouristDestination: type of tourism (e.g., "luxury", "cultural", "beach") */
    touristType?: string;
    /** For TouristDestination: notable attractions contained within */
    containsPlace?: Array<{ name: string; type: string; url?: string }>;
  }): PlaceSchema {
    const schema: PlaceSchema = {
      '@context': 'https://schema.org',
      '@type': place.type,
      '@id': `${this.baseUrl}/recommendations/${place.slug}#place`,
      name: place.name,
      description: place.description,
      url: place.website || `${this.baseUrl}/recommendations/${place.slug}`,
      address: {
        '@type': 'PostalAddress',
        streetAddress: place.address,
        addressLocality: place.city,
        addressCountry: place.country
      },
      telephone: place.phone,
      priceRange: place.priceRange,
      geo: place.latitude && place.longitude ? {
        '@type': 'GeoCoordinates',
        latitude: place.latitude,
        longitude: place.longitude
      } : undefined
    };

    if (place.rating) {
      schema.aggregateRating = {
        '@type': 'AggregateRating',
        ratingValue: place.rating.value,
        bestRating: 5,
        worstRating: 1,
        ratingCount: place.rating.count
      };
    }

    if (place.amenities && place.amenities.length > 0) {
      schema.amenityFeature = place.amenities.map(amenity => ({
        '@type': 'PropertyValue',
        name: amenity,
        value: true
      }));
    }

    // TouristDestination-specific properties (connects to Google Maps entities)
    if (place.type === 'TouristDestination') {
      if (place.touristType) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (schema as any).touristType = place.touristType;
      }
      if (place.containsPlace && place.containsPlace.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (schema as any).containsPlace = place.containsPlace.map(p => ({
          '@type': p.type || 'Place',
          name: p.name,
          ...(p.url ? { url: p.url } : {}),
        }));
      }
    }

    return schema;
  }

  /**
   * Generate ItemList schema for listicle-style articles.
   * Wraps H2 sections as list items — helps Google extract structured lists
   * for rich results and AI Overviews.
   */
  generateItemList(items: Array<{
    name: string;
    description?: string;
    url?: string;
    position: number;
    image?: string;
  }>): Record<string, unknown> {
    return {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      numberOfItems: items.length,
      itemListElement: items.map(item => ({
        '@type': 'ListItem',
        position: item.position,
        name: item.name,
        ...(item.description ? { description: item.description } : {}),
        ...(item.url ? { url: item.url } : {}),
        ...(item.image ? { image: item.image } : {}),
      })),
    };
  }

  generateFAQ(faqs: Array<{ question: string; answer: string }>): FAQPageSchema {
    return {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map(faq => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer
        }
      }))
    };
  }

  generateHowTo(howTo: {
    name: string;
    description: string;
    steps: Array<{
      name: string;
      text: string;
      image?: string;
    }>;
    totalTime?: string;
    supplies?: string[];
    tools?: string[];
  }): HowToSchema {
    return {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: howTo.name,
      description: howTo.description,
      step: howTo.steps.map(step => ({
        '@type': 'HowToStep',
        name: step.name,
        text: step.text,
        image: step.image ? {
          '@type': 'ImageObject',
          url: step.image
        } : undefined
      })),
      totalTime: howTo.totalTime,
      supply: howTo.supplies,
      tool: howTo.tools
    };
  }

  generateBreadcrumbs(breadcrumbs: Array<{ name: string; url: string }>): BreadcrumbListSchema {
    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbs.map((crumb, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: crumb.name,
        item: crumb.url
      }))
    };
  }

  generateVideoObject(video: {
    name: string;
    description: string;
    thumbnailUrl: string;
    uploadDate: string;
    duration?: string;
    contentUrl?: string;
    embedUrl?: string;
    viewCount?: number;
  }): VideoObjectSchema {
    const schema: VideoObjectSchema = {
      '@context': 'https://schema.org',
      '@type': 'VideoObject',
      name: video.name,
      description: video.description,
      thumbnailUrl: video.thumbnailUrl,
      uploadDate: video.uploadDate,
      duration: video.duration,
      contentUrl: video.contentUrl,
      embedUrl: video.embedUrl
    };

    if (video.viewCount) {
      schema.interactionStatistic = [{
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/WatchAction',
        userInteractionCount: video.viewCount
      }];
    }

    return schema;
  }

  // Utility method to combine multiple schemas
  combineSchemas(...schemas: SchemaBaseProps[]): SchemaBaseProps[] {
    return schemas;
  }

  // Generate JSON-LD script tag
  generateJsonLd(schema: SchemaBaseProps | SchemaBaseProps[]): string {
    return JSON.stringify(schema, null, 2);
  }

  /**
   * Auto-generate FAQ schema from content
   */
  generateFAQFromContent(content: string, url: string): FAQPageSchema | null {
    // Extract Q&A patterns from content
    const questions = this.extractQuestions(content);
    
    if (questions.length === 0) {
      return null;
    }

    return {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      '@id': `${url}#faq`,
      name: 'Frequently Asked Questions',
      url: url,
      mainEntity: questions
    };
  }

  /**
   * Auto-generate HowTo schema from content
   */
  generateHowToFromContent(title: string, content: string, url: string): HowToSchema | null {
    // Extract step-by-step instructions from content
    const steps = this.extractSteps(content);
    
    if (steps.length < 2) {
      return null;
    }

    // Extract time information if available
    const timeMatch = content.match(/(\d+)\s*(minutes?|hours?|min|hr)/i);
    const totalTime = timeMatch ? `PT${timeMatch[1]}${timeMatch[2].toLowerCase().startsWith('h') ? 'H' : 'M'}` : undefined;

    return {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      '@id': `${url}#howto`,
      name: title,
      description: content.substring(0, 160),
      url: url,
      step: steps,
      totalTime: totalTime,
      inLanguage: 'en'
    };
  }

  /**
   * Auto-generate Review schema from content
   */
  generateReviewFromContent(article: {
    title: string;
    content: string;
    author?: string;
    publishedAt: string;
    slug: string;
    rating?: number;
    reviewedItem?: {
      name: string;
      type: string;
    };
  }): ReviewSchema | null {
    // Check if content contains review indicators
    const hasReviewContent = /review|rating|stars|recommend|experience|verdict/i.test(article.content);
    
    if (!hasReviewContent && !article.rating) {
      return null;
    }

    // Extract or default rating
    const rating = article.rating || this.extractRatingFromContent(article.content) || 4;

    return {
      '@context': 'https://schema.org',
      '@type': 'Review',
      '@id': `${this.baseUrl}/blog/${article.slug}#review`,
      name: article.title,
      reviewBody: article.content.substring(0, 500),
      author: article.author ? {
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: article.author
      } : this.defaultPerson,
      datePublished: article.publishedAt,
      reviewRating: {
        '@type': 'Rating',
        ratingValue: rating,
        bestRating: 5,
        worstRating: 1
      },
      itemReviewed: article.reviewedItem ? {
        '@context': 'https://schema.org',
        '@type': article.reviewedItem.type,
        name: article.reviewedItem.name
      } : {
        '@context': 'https://schema.org',
        '@type': 'Thing',
        name: article.title
      }
    };
  }

  /**
   * Auto-generate schema based on page type
   *
   * NOTE (2025-2026 Standards Update):
   * - FAQPage: Restricted to authoritative government/health sites since Aug 2023.
   *   No longer generates rich results for travel content. Removed from auto-generation.
   * - HowTo: Fully deprecated Sept 2023. No longer generates rich results at all.
   *   Removed from auto-generation.
   * - Focus on Article + Review + BreadcrumbList — the evergreen types Google actively supports.
   */
  generateSchemaForPageType(pageType: string, data: any): SchemaBaseProps | SchemaBaseProps[] | null {
    switch (pageType.toLowerCase()) {
      case 'article':
      case 'blog':
        const schemas: SchemaBaseProps[] = [this.generateArticle(data)];

        // Add Review schema if review content detected (still fully supported)
        const reviewSchema = this.generateReviewFromContent(data);
        if (reviewSchema) schemas.push(reviewSchema);

        return schemas.length === 1 ? schemas[0] : schemas;

      case 'event':
        return this.generateEvent(data);

      case 'place':
      case 'restaurant':
      case 'hotel':
        return this.generatePlace(data);

      case 'review':
        return this.generateReviewFromContent(data);

      // FAQPage and HowTo deprecated — return Article schema instead
      case 'faq':
      case 'howto':
      case 'guide':
        return this.generateArticle(data);

      default:
        return null;
    }
  }

  /**
   * Extract questions from content
   */
  private extractQuestions(content: string): QuestionSchema[] {
    const questions: QuestionSchema[] = [];
    
    // Pattern 1: Q: ... A: format
    const qaPattern = /Q:\s*([^?]+\?)\s*A:\s*([^Q]+?)(?=Q:|$)/gi;
    let match;
    
    while ((match = qaPattern.exec(content)) !== null) {
      questions.push({
        '@type': 'Question',
        name: match[1].trim(),
        acceptedAnswer: {
          '@type': 'Answer',
          text: match[2].trim()
        }
      });
    }
    
    // Pattern 2: ## Question followed by answer paragraph
    const headingPattern = /#{2,3}\s*([^#\n]+\?)\s*\n\s*([^#]+?)(?=#{2,3}|\n\n|$)/gi;
    
    while ((match = headingPattern.exec(content)) !== null) {
      questions.push({
        '@type': 'Question',
        name: match[1].trim(),
        acceptedAnswer: {
          '@type': 'Answer',
          text: match[2].trim()
        }
      });
    }
    
    return questions;
  }

  /**
   * Extract steps from content
   */
  private extractSteps(content: string): HowToStepSchema[] {
    const steps: HowToStepSchema[] = [];
    
    // Pattern 1: Numbered steps (1. 2. 3.)
    const numberedPattern = /(\d+\.\s*)([^0-9]+?)(?=\d+\.|$)/gi;
    let match;
    
    while ((match = numberedPattern.exec(content)) !== null) {
      const stepText = match[2].trim();
      if (stepText.length > 10) { // Minimum step length
        steps.push({
          '@type': 'HowToStep',
          name: `Step ${steps.length + 1}`,
          text: stepText
        });
      }
    }
    
    // Pattern 2: Step headings
    if (steps.length === 0) {
      const stepPattern = /#{2,3}\s*(?:Step\s*\d+|Step)\s*:?\s*([^#\n]+)\s*\n\s*([^#]+?)(?=#{2,3}|\n\n|$)/gi;
      
      while ((match = stepPattern.exec(content)) !== null) {
        steps.push({
          '@type': 'HowToStep',
          name: match[1].trim(),
          text: match[2].trim()
        });
      }
    }
    
    return steps;
  }

  /**
   * Extract rating from content
   */
  private extractRatingFromContent(content: string): number | null {
    // Look for rating patterns like "4/5", "8/10", "4 out of 5", "★★★★☆"
    const ratingPatterns = [
      /(\d+)\/5/g,
      /(\d+)\s*out\s*of\s*5/gi,
      /(\d+)\s*\/\s*10/g,
      /(\d+)\s*out\s*of\s*10/gi
    ];
    
    for (const pattern of ratingPatterns) {
      const match = content.match(pattern);
      if (match) {
        const rating = parseInt(match[1]);
        return pattern.source.includes('10') ? Math.round(rating / 2) : rating;
      }
    }
    
    // Count star symbols
    const starMatch = content.match(/★+/);
    if (starMatch) {
      return Math.min(starMatch[0].length, 5);
    }
    
    return null;
  }
}

export default SchemaGenerator;
