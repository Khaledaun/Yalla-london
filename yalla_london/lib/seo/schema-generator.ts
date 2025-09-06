
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
  '@type': 'Place' | 'Restaurant' | 'TouristAttraction' | 'Hotel';
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
        url: `${baseUrl}/logo.png`,
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
      name: 'Yalla London Team',
      jobTitle: 'Content Creator',
      worksFor: this.defaultOrganization
    };
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
    type: 'Restaurant' | 'TouristAttraction' | 'Hotel';
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
      schema.amenityFeature = place.amenities.map((amenity: any) => ({
        '@type': 'PropertyValue',
        name: amenity,
        value: true
      }));
    }

    return schema;
  }

  generateFAQ(faqs: Array<{ question: string; answer: string }>): FAQPageSchema {
    return {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map((faq: any) => ({
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
      step: howTo.steps.map((step: any) => ({
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
}

export default SchemaGenerator;
