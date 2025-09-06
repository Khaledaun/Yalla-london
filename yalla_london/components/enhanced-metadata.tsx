
import { Metadata } from 'next';
import { SchemaGenerator } from '@/lib/seo/schema-generator';

interface EnhancedMetadataProps {
  title: string;
  description: string;
  slug: string;
  language?: 'en' | 'ar';
  type?: 'article' | 'website' | 'event' | 'place';
  publishedTime?: string;
  modifiedTime?: string;
  images?: string[];
  keywords?: string[];
  author?: string;
  section?: string;
  tags?: string[];
}

export function generateEnhancedMetadata({
  title,
  description,
  slug,
  language = 'en',
  type = 'website',
  publishedTime,
  modifiedTime,
  images = [],
  keywords = [],
  author,
  section,
  tags = []
}: EnhancedMetadataProps): Metadata {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://yalla-london.com';
  const currentUrl = `${baseUrl}${language === 'ar' ? '/ar' : ''}/${slug}`;
  const alternateUrl = `${baseUrl}${language === 'ar' ? '' : '/ar'}/${slug}`;
  
  const primaryImage = images[0] || `${baseUrl}/default-og-image.jpg`;

  return {
    title: {
      default: title,
      template: '%s | Yalla London'
    },
    description,
    keywords: keywords.join(', '),
    authors: author ? [{ name: author }] : [{ name: 'Yalla London' }],
    creator: 'Yalla London',
    publisher: 'Yalla London',
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    metadataBase: new URL(baseUrl),
    alternates: {
      canonical: currentUrl,
      languages: {
        'en-GB': currentUrl.replace('/ar/', '/'),
        'ar-SA': currentUrl.includes('/ar/') ? currentUrl : currentUrl.replace(baseUrl, `${baseUrl}/ar`),
      },
    },
    openGraph: {
      title,
      description,
      url: currentUrl,
      siteName: 'Yalla London',
      locale: language === 'ar' ? 'ar_SA' : 'en_GB',
      type: type === 'article' ? 'article' : 'website',
      publishedTime,
      modifiedTime,
      authors: author ? [author] : undefined,
      section,
      tags,
      images: images.map(image => ({
        url: image,
        width: 1200,
        height: 630,
        alt: title,
      })),
    },
    twitter: {
      card: 'summary_large_image',
      site: '@yallalondon',
      title,
      description,
      images: images.length > 0 ? images : [primaryImage],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    verification: {
      google: process.env.GOOGLE_SITE_VERIFICATION,
      yandex: process.env.YANDEX_VERIFICATION,
    },
    other: {
      'geo.region': 'GB-LND',
      'geo.placename': 'London',
      'geo.position': '51.5074;-0.1278',
      'ICBM': '51.5074, -0.1278',
    },
  };
}

// Generate article-specific metadata
export function generateArticleMetadata({
  title,
  description,
  slug,
  language = 'en',
  publishedTime,
  modifiedTime,
  images = [],
  keywords = [],
  author = 'Yalla London',
  readingTime,
  wordCount
}: EnhancedMetadataProps & {
  readingTime?: number;
  wordCount?: number;
}): Metadata {
  const baseMetadata = generateEnhancedMetadata({
    title,
    description,
    slug,
    language,
    type: 'article',
    publishedTime,
    modifiedTime,
    images,
    keywords,
    author,
    section: 'Travel',
    tags: keywords
  });

  // Add article-specific structured data
  if (typeof window === 'undefined') {
    // Server-side: prepare schema for injection
    const generator = new SchemaGenerator(
      process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com',
      { siteName: 'Yalla London', description: 'Your Guide to London' }
    );
    const articleSchema = generator.generateArticle({
      title,
      content: description,
      slug,
      excerpt: description,
      publishedAt: publishedTime || new Date().toISOString(),
      updatedAt: modifiedTime,
      author,
      tags: keywords,
      featuredImage: images[0]
    });

    // This would be injected into the page head
    // The actual injection happens in the page component
  }

  return baseMetadata;
}

// Generate event-specific metadata
export function generateEventMetadata({
  title,
  description,
  slug,
  language = 'en',
  startDate,
  endDate,
  location,
  price,
  images = [],
  keywords = []
}: EnhancedMetadataProps & {
  startDate: string;
  endDate?: string;
  location: {
    name: string;
    address: string;
  };
  price?: {
    currency: string;
    amount: number;
  };
}): Metadata {
  const baseMetadata = generateEnhancedMetadata({
    title,
    description,
    slug,
    language,
    type: 'event',
    publishedTime: startDate,
    images,
    keywords,
    section: 'Events'
  });

  // Add event-specific structured data
  if (typeof window === 'undefined') {
    const generator = new SchemaGenerator(
      process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com',
      { siteName: 'Yalla London', description: 'Your Guide to London' }
    );
    const eventSchema = generator.generateEvent({
      title,
      description,
      startDate,
      endDate,
      location: {
        name: location?.name || 'Location',
        address: location?.address || '',
        city: 'London',
        country: 'UK'
      },
      price: price ? {
        amount: price.amount?.toString() || '0',
        currency: price.currency || 'GBP'
      } : undefined,
      image: images[0],
      slug
    });

    // This would be injected into the page head
  }

  return baseMetadata;
}

// Generate place/recommendation metadata
export function generatePlaceMetadata({
  title,
  description,
  slug,
  language = 'en',
  address,
  phone,
  website,
  priceRange,
  cuisine,
  rating,
  images = [],
  keywords = []
}: EnhancedMetadataProps & {
  address: string;
  phone?: string;
  website?: string;
  priceRange?: string;
  cuisine?: string[];
  rating?: {
    ratingValue: number;
    ratingCount: number;
  };
}): Metadata {
  const baseMetadata = generateEnhancedMetadata({
    title,
    description,
    slug,
    language,
    images,
    keywords,
    section: 'Recommendations'
  });

  // Add place-specific structured data
  if (typeof window === 'undefined') {
    const generator = new SchemaGenerator(
      process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com',
      { siteName: 'Yalla London', description: 'Your Guide to London' }
    );
    const placeSchema = generator.generatePlace({
      name: title,
      description,
      type: 'TouristAttraction' as const,
      address,
      city: 'London',
      country: 'UK',
      phone,
      website,
      priceRange,
      rating: rating ? {
        value: rating.ratingValue,
        count: rating.ratingCount
      } : undefined,
      amenities: cuisine,
      slug
    });

    // This would be injected into the page head
  }

  return baseMetadata;
}
