/**
 * Schema Generator Tests
 */

import { describe, it, expect } from '@jest/globals';
import { SchemaGenerator } from '@/lib/seo/schema-generator';
import { brandConfig } from '@/config/brand-config';

describe('Schema Generator', () => {
  const baseUrl = 'https://example.com';
  const schemaGenerator = new SchemaGenerator(baseUrl, brandConfig);

  describe('generateSchemaForPageType', () => {
    it('should generate article schema correctly', () => {
      const articleData = {
        title: 'Test Article',
        content: 'This is test content for the article',
        slug: 'test-article',
        author: 'Test Author',
        publishedAt: '2024-01-15T10:00:00Z',
        url: 'https://example.com/test-article',
        image: 'https://example.com/test-image.jpg'
      };

      const schema = schemaGenerator.generateSchemaForPageType('article', articleData);

      expect(schema).toBeDefined();
      expect((schema as any)['@type']).toBe('Article');
      expect((schema as any)['@context']).toBe('https://schema.org');
      expect((schema as any).headline).toBe(articleData.title);
      expect((schema as any).author).toBeDefined();
      expect((schema as any).datePublished).toBe(articleData.publishedAt);
      expect((schema as any).image).toBe(articleData.image);
    });

    it('should generate event schema correctly', () => {
      const eventData = {
        title: 'Test Event',
        description: 'This is a test event',
        slug: 'test-event',
        startDate: '2024-02-15T18:00:00Z',
        endDate: '2024-02-15T22:00:00Z',
        location: 'Test Venue, London',
        url: 'https://example.com/test-event',
        image: 'https://example.com/event-image.jpg'
      };

      const schema = schemaGenerator.generateSchemaForPageType('event', eventData);

      expect(schema).toBeDefined();
      expect((schema as any)['@type']).toBe('Event');
      expect((schema as any)['@context']).toBe('https://schema.org');
      expect((schema as any).name).toBe(eventData.title);
      expect((schema as any).startDate).toBe(eventData.startDate);
      expect((schema as any).endDate).toBe(eventData.endDate);
      expect((schema as any).location).toBeDefined();
    });

    it('should generate place schema correctly', () => {
      const placeData = {
        title: 'Test Restaurant',
        description: 'A test restaurant in London',
        slug: 'test-restaurant',
        address: '123 Test Street, London',
        phone: '+44 20 1234 5678',
        url: 'https://example.com/test-restaurant',
        image: 'https://example.com/restaurant-image.jpg'
      };

      const schema = schemaGenerator.generateSchemaForPageType('place', placeData);

      expect(schema).toBeDefined();
      expect((schema as any)['@type']).toBe('Restaurant');
      expect((schema as any)['@context']).toBe('https://schema.org');
      expect((schema as any).name).toBe(placeData.title);
      expect((schema as any).address).toBeDefined();
      expect((schema as any).telephone).toBe(placeData.phone);
    });

    it('should generate website schema correctly', () => {
      const websiteData = {
        searchEnabled: true
      };

      const schema = schemaGenerator.generateWebsite(websiteData.searchEnabled);

      expect(schema).toBeDefined();
      expect((schema as any)['@type']).toBe('WebSite');
      expect((schema as any)['@context']).toBe('https://schema.org');
      expect((schema as any).url).toBe(baseUrl);
      
      if (websiteData.searchEnabled) {
        expect((schema as any).potentialAction).toBeDefined();
        expect((schema as any).potentialAction['@type']).toBe('SearchAction');
      }
    });
  });

  describe('generateFAQFromContent', () => {
    it('should generate FAQ schema from content', () => {
      const faqContent = `
        <h2>Frequently Asked Questions</h2>
        <h3>What is this service?</h3>
        <p>This is a test service for FAQ generation.</p>
        <h3>How does it work?</h3>
        <p>It works by parsing HTML content and extracting questions and answers.</p>
        <h3>Is it free?</h3>
        <p>Yes, it's completely free to use.</p>
      `;

      const schema = schemaGenerator.generateFAQFromContent(faqContent, 'https://example.com/faq');

      expect(schema).toBeDefined();
      expect((schema as any)['@type']).toBe('FAQPage');
      expect((schema as any)['@context']).toBe('https://schema.org');
      expect((schema as any).mainEntity).toBeDefined();
      expect((schema as any).mainEntity).toHaveLength(3);
      
      // Check first FAQ item
      const firstFAQ = (schema as any).mainEntity[0];
      expect(firstFAQ['@type']).toBe('Question');
      expect(firstFAQ.name).toBe('What is this service?');
      expect(firstFAQ.acceptedAnswer['@type']).toBe('Answer');
      expect(firstFAQ.acceptedAnswer.text).toBe('This is a test service for FAQ generation.');
    });

    it('should handle content without FAQ sections', () => {
      const regularContent = `
        <h1>Regular Article</h1>
        <p>This is just regular content without any FAQ sections.</p>
        <h2>Some Section</h2>
        <p>More regular content here.</p>
      `;

      const schema = schemaGenerator.generateFAQFromContent(regularContent, 'https://example.com/article');

      expect(schema).toBeNull();
    });

    it('should handle malformed HTML gracefully', () => {
      const malformedContent = `
        <h2>FAQ</h2>
        <h3>Question 1</h3>
        <p>Answer 1</p>
        <h3>Question 2</h3>
        <!-- Missing closing p tag -->
        <p>Answer 2
      `;

      const schema = schemaGenerator.generateFAQFromContent(malformedContent, 'https://example.com/faq');

      // Should still work with partial data
      expect(schema).toBeDefined();
      expect((schema as any)['@type']).toBe('FAQPage');
      expect((schema as any).mainEntity.length).toBeGreaterThan(0);
    });
  });

  describe('generateOrganization', () => {
    it('should generate organization schema correctly', () => {
      const orgData = {
        name: 'Test Organization',
        description: 'A test organization',
        url: 'https://example.com',
        logo: 'https://example.com/logo.png',
        sameAs: ['https://twitter.com/test', 'https://facebook.com/test']
      };

      const schema = schemaGenerator.generateOrganization(orgData);

      expect(schema).toBeDefined();
      expect((schema as any)['@type']).toBe('Organization');
      expect((schema as any)['@context']).toBe('https://schema.org');
      expect((schema as any).name).toBe(orgData.name);
      expect((schema as any).description).toBe(orgData.description);
      expect((schema as any).url).toBe(orgData.url);
      expect((schema as any).logo).toBe(orgData.logo);
      expect((schema as any).sameAs).toEqual(orgData.sameAs);
    });
  });

  describe('generateBreadcrumb', () => {
    it('should generate breadcrumb schema correctly', () => {
      const breadcrumbData = [
        { name: 'Home', url: 'https://example.com' },
        { name: 'Category', url: 'https://example.com/category' },
        { name: 'Article', url: 'https://example.com/category/article' }
      ];

      const schema = schemaGenerator.generateBreadcrumb(breadcrumbData);

      expect(schema).toBeDefined();
      expect((schema as any)['@type']).toBe('BreadcrumbList');
      expect((schema as any)['@context']).toBe('https://schema.org');
      expect((schema as any).itemListElement).toBeDefined();
      expect((schema as any).itemListElement).toHaveLength(3);
      
      // Check first breadcrumb item
      const firstItem = (schema as any).itemListElement[0];
      expect(firstItem['@type']).toBe('ListItem');
      expect(firstItem.position).toBe(1);
      expect(firstItem.name).toBe('Home');
      expect(firstItem.item).toBe('https://example.com');
    });
  });
});

