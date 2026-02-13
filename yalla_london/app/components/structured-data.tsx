
import { brandConfig } from '@/config/brand-config';

interface StructuredDataProps {
  type?: 'website' | 'article' | 'event' | 'restaurant' | 'organization' | 'place' | 'review' | 'faq' | 'breadcrumb'
  data?: any
  language?: 'en' | 'ar'
}

export function StructuredData({ type = 'website', data, language = 'en' }: StructuredDataProps) {

  const getBaseStructuredData = () => {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : 'https://yalla-london.com')
    
    const organizationData = {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": language === 'en' ? brandConfig.siteName : brandConfig.siteNameAr,
      "url": baseUrl,
      "logo": `${baseUrl}/images/yalla-london-logo.svg`,
      "description": language === 'en' ? brandConfig.description : brandConfig.descriptionAr,
      "address": brandConfig.contact.address ? {
        "@type": "PostalAddress",
        "addressCountry": "GB",
        "addressLocality": "London",
        "streetAddress": language === 'en' ? brandConfig.contact.address.en : brandConfig.contact.address.ar
      } : {
        "@type": "PostalAddress",
        "addressCountry": "GB",
        "addressLocality": "London"
      },
      "contactPoint": {
        "@type": "ContactPoint",
        "email": brandConfig.contact.email,
        "telephone": brandConfig.contact.phone,
        "contactType": "customer service"
      },
      "sameAs": Object.values(brandConfig.contact.social).filter(Boolean)
    }

    const websiteData = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": language === 'en' ? brandConfig.siteName : brandConfig.siteNameAr,
      "url": baseUrl,
      "description": language === 'en' ? brandConfig.description : brandConfig.descriptionAr,
      "inLanguage": [language],
      "publisher": {
        "@type": "Organization",
        "name": brandConfig.seo.author,
        "logo": `${baseUrl}/images/yalla-london-logo.svg`
      }
    }

    return { organizationData, websiteData }
  }

  const getEventStructuredData = (eventData: any) => ({
    "@context": "https://schema.org",
    "@type": "Event",
    "name": eventData.title,
    "description": eventData.description,
    "startDate": eventData.date,
    "location": {
      "@type": "Place",
      "name": eventData.venue,
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "London",
        "addressCountry": "GB"
      }
    },
    "offers": {
      "@type": "Offer",
      "price": eventData.price,
      "priceCurrency": "GBP",
      "availability": "https://schema.org/InStock"
    }
  })

  const getArticleStructuredData = (articleData: any) => ({
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": articleData.title,
    "description": articleData.description,
    "author": {
      "@type": "Organization",
      "name": "Yalla London"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Yalla London",
      "logo": {
        "@type": "ImageObject",
        "url": "https://i.pinimg.com/736x/fc/41/c5/fc41c56045c5b08eb352453e0b891d97.jpg"
      }
    },
    "datePublished": articleData.publishDate,
    "dateModified": articleData.modifiedDate || articleData.publishDate,
    "mainEntityOfPage": articleData.url,
    "image": articleData.image
  })

  const getRestaurantStructuredData = (restaurantData: any) => ({
    "@context": "https://schema.org",
    "@type": "Restaurant",
    "name": restaurantData.name,
    "description": restaurantData.description,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": restaurantData.address,
      "addressLocality": "London",
      "addressCountry": "GB"
    },
    "telephone": restaurantData.phone,
    "priceRange": restaurantData.priceRange,
    "aggregateRating": restaurantData.rating ? {
      "@type": "AggregateRating",
      "ratingValue": restaurantData.rating,
      "bestRating": "5",
      "worstRating": "1"
    } : undefined,
    "servesCuisine": restaurantData.cuisine
  })

  // Enhanced schema types for AEO optimization
  const getPlaceStructuredData = (placeData: any) => ({
    "@context": "https://schema.org",
    "@type": placeData.type || "TouristAttraction",
    "name": placeData.name,
    "description": placeData.description,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": placeData.address,
      "addressLocality": "London",
      "addressCountry": "GB",
      "postalCode": placeData.postalCode
    },
    "geo": placeData.coordinates ? {
      "@type": "GeoCoordinates",
      "latitude": placeData.coordinates.lat,
      "longitude": placeData.coordinates.lng
    } : undefined,
    "telephone": placeData.phone,
    "url": placeData.website,
    "priceRange": placeData.priceRange,
    "aggregateRating": placeData.rating ? {
      "@type": "AggregateRating",
      "ratingValue": placeData.rating.value,
      "ratingCount": placeData.rating.count,
      "bestRating": "5",
      "worstRating": "1"
    } : undefined,
    "openingHoursSpecification": placeData.hours ? placeData.hours.map((day: any) => ({
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": day.dayOfWeek,
      "opens": day.opens,
      "closes": day.closes
    })) : undefined,
    "amenityFeature": placeData.amenities ? placeData.amenities.map((amenity: string) => ({
      "@type": "LocationFeatureSpecification",
      "name": amenity
    })) : undefined
  })

  const getReviewStructuredData = (reviewData: any) => ({
    "@context": "https://schema.org",
    "@type": "Review",
    "reviewBody": reviewData.text,
    "datePublished": reviewData.date,
    "author": {
      "@type": "Person",
      "name": reviewData.author.name,
      "image": reviewData.author.image
    },
    "reviewRating": {
      "@type": "Rating",
      "ratingValue": reviewData.rating,
      "bestRating": "5",
      "worstRating": "1"
    },
    "itemReviewed": {
      "@type": reviewData.itemType || "Thing",
      "name": reviewData.itemName,
      "image": reviewData.itemImage
    }
  })

  const getFAQStructuredData = (faqData: any) => ({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqData.questions.map((qa: any) => ({
      "@type": "Question",
      "name": qa.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": qa.answer
      }
    }))
  })

  const getBreadcrumbStructuredData = (breadcrumbData: any) => ({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": breadcrumbData.items.map((item: any, index: number) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.url
    }))
  })

  // Enhanced event schema with more details
  const getEnhancedEventStructuredData = (eventData: any) => ({
    "@context": "https://schema.org",
    "@type": "Event",
    "name": eventData.title || eventData.name,
    "description": eventData.description,
    "startDate": eventData.startDate || eventData.date,
    "endDate": eventData.endDate,
    "eventStatus": eventData.status || "https://schema.org/EventScheduled",
    "eventAttendanceMode": eventData.attendanceMode || "https://schema.org/OfflineEventAttendanceMode",
    "location": {
      "@type": "Place",
      "name": eventData.venue || eventData.location?.name,
      "address": {
        "@type": "PostalAddress",
        "streetAddress": eventData.location?.address,
        "addressLocality": "London",
        "addressCountry": "GB"
      },
      "geo": eventData.location?.coordinates ? {
        "@type": "GeoCoordinates",
        "latitude": eventData.location.coordinates.lat,
        "longitude": eventData.location.coordinates.lng
      } : undefined
    },
    "image": eventData.image ? [eventData.image] : undefined,
    "organizer": {
      "@type": "Organization",
      "name": eventData.organizer || brandConfig.siteName,
      "url": process.env.NEXT_PUBLIC_SITE_URL
    },
    "offers": eventData.price ? {
      "@type": "Offer",
      "price": eventData.price.toString(),
      "priceCurrency": eventData.currency || "GBP",
      "availability": eventData.availability || "https://schema.org/InStock",
      "url": eventData.ticketUrl,
      "validFrom": eventData.salesStart
    } : undefined,
    "performer": eventData.performers ? eventData.performers.map((performer: any) => ({
      "@type": performer.type || "Person",
      "name": performer.name
    })) : undefined
  })

  // Enhanced article schema for better AEO
  const getEnhancedArticleStructuredData = (articleData: any) => ({
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": articleData.title,
    "description": articleData.description || articleData.excerpt,
    "author": {
      "@type": "Organization",
      "name": brandConfig.seo.author,
      "url": process.env.NEXT_PUBLIC_SITE_URL
    },
    "publisher": {
      "@type": "Organization",
      "name": brandConfig.seo.author,
      "logo": {
        "@type": "ImageObject",
        "url": `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.yalla-london.com'}/images/yalla-london-logo.svg`
      }
    },
    "datePublished": articleData.publishDate || articleData.datePublished,
    "dateModified": articleData.modifiedDate || articleData.publishDate,
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": articleData.url
    },
    "image": articleData.image ? {
      "@type": "ImageObject",
      "url": articleData.image,
      "width": articleData.imageWidth || 1200,
      "height": articleData.imageHeight || 630
    } : undefined,
    "articleSection": articleData.category,
    "keywords": articleData.tags ? articleData.tags.join(', ') : undefined,
    "wordCount": articleData.wordCount,
    "articleBody": articleData.content,
    "inLanguage": language,
    "about": articleData.topics ? articleData.topics.map((topic: string) => ({
      "@type": "Thing",
      "name": topic
    })) : undefined
  })

  const generateStructuredData = () => {
    const { organizationData, websiteData } = getBaseStructuredData()
    
    switch (type) {
      case 'website':
        return [organizationData, websiteData]
      case 'event':
        return [organizationData, getEnhancedEventStructuredData(data)]
      case 'article':
        return [organizationData, getEnhancedArticleStructuredData(data)]
      case 'restaurant':
        return [organizationData, getRestaurantStructuredData(data)]
      case 'place':
        return [organizationData, getPlaceStructuredData(data)]
      case 'review':
        return [organizationData, getReviewStructuredData(data)]
      case 'faq':
        return [organizationData, getFAQStructuredData(data)]
      case 'breadcrumb':
        return [getBreadcrumbStructuredData(data)]
      case 'organization':
        return [organizationData]
      default:
        return [organizationData, websiteData]
    }
  }

  const structuredData = generateStructuredData()

  return (
    <>
      {structuredData.map((data, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
        />
      ))}
    </>
  )
}
