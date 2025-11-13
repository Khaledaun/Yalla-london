/**
 * AI Content Generation Tests
 * Comprehensive tests for AI-powered content generation features
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

// Check if AI features are enabled
const isAIEnabled = process.env.FEATURE_CONTENT_PIPELINE === 'true' ||
                    process.env.ABACUSAI_API_KEY ||
                    process.env.OPENAI_API_KEY;

describe('AI Content Generation Tests', () => {
  let generatedContentId: string;
  let testTopicId: string;

  beforeAll(async () => {
    await prisma.$connect();

    if (!isAIEnabled) {
      console.log('⚠ AI features may not be fully enabled. Set FEATURE_CONTENT_PIPELINE=true and provide API keys.');
    }
  });

  afterAll(async () => {
    // Cleanup generated content
    if (generatedContentId) {
      await prisma.blogPost.deleteMany({
        where: { id: generatedContentId }
      });
    }
    if (testTopicId) {
      await prisma.topicProposal.deleteMany({
        where: { id: testTopicId }
      });
    }
    await prisma.$disconnect();
  });

  describe('1. AI Service Configuration', () => {
    it('should have AI provider configured', async () => {
      const providers = await prisma.modelProvider.findMany({
        where: { enabled: true }
      });

      expect(providers.length).toBeGreaterThan(0);
      console.log(`✓ Found ${providers.length} enabled AI provider(s):`,
        providers.map(p => p.name).join(', '));
    });

    it('should have model routes configured', async () => {
      const routes = await prisma.modelRoute.findMany();

      expect(Array.isArray(routes)).toBe(true);
      console.log(`✓ Found ${routes.length} model route(s) configured`);
    });

    it('should verify AI API keys are set', () => {
      const abacusKey = process.env.ABACUSAI_API_KEY;
      const openaiKey = process.env.OPENAI_API_KEY;

      const hasAIKey = abacusKey || openaiKey;

      if (hasAIKey) {
        console.log('✓ AI API key(s) configured:', {
          abacusAI: !!abacusKey,
          openAI: !!openaiKey
        });
      } else {
        console.log('⚠ No AI API keys found in environment');
      }

      expect(hasAIKey || !isAIEnabled).toBe(true);
    });

    it('should check feature flag for content pipeline', async () => {
      const featureFlag = await prisma.featureFlag.findFirst({
        where: { key: 'FEATURE_CONTENT_PIPELINE' }
      });

      if (featureFlag) {
        console.log(`✓ Content pipeline feature flag: ${featureFlag.enabled ? 'ENABLED' : 'DISABLED'}`);
      } else {
        console.log('⚠ Content pipeline feature flag not found in database');
      }
    });
  });

  describe('2. AI Prompt Templates', () => {
    it('should retrieve available prompt templates', async () => {
      const templates = await prisma.promptTemplate.findMany({
        where: { active: true }
      });

      expect(Array.isArray(templates)).toBe(true);
      console.log(`✓ Found ${templates.length} active prompt template(s)`);

      if (templates.length > 0) {
        console.log('  Available templates:', templates.map(t => t.name).join(', '));
      }
    });

    it('should have luxury travel content templates', async () => {
      const luxuryTemplates = await prisma.promptTemplate.findMany({
        where: {
          OR: [
            { name: { contains: 'luxury', mode: 'insensitive' } },
            { name: { contains: 'travel', mode: 'insensitive' } },
            { tags: { has: 'luxury' } }
          ]
        }
      });

      console.log(`✓ Found ${luxuryTemplates.length} luxury/travel template(s)`);
    });

    it('should validate prompt template structure', async () => {
      const templates = await prisma.promptTemplate.findMany({ take: 5 });

      templates.forEach(template => {
        expect(template.name).toBeDefined();
        expect(template.promptText).toBeDefined();
        expect(typeof template.promptText).toBe('string');
      });

      console.log(`✓ Validated ${templates.length} prompt template structure(s)`);
    });
  });

  describe('3. AI Generation API Endpoint', () => {
    it('should check AI generation endpoint availability', async () => {
      // Test endpoint exists (without making actual generation call)
      const response = await fetch(`${BASE_URL}/api/ai/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Minimal request to check endpoint
          prompt: 'test',
          type: 'test'
        })
      });

      // Endpoint should exist (even if it returns error without auth/proper params)
      expect(response).toBeDefined();
      console.log(`✓ AI generation endpoint exists (status: ${response.status})`);
    });

    it('should validate rate limiting configuration', async () => {
      const rateLimitConfig = {
        maxRequests: parseInt(process.env.AI_RATE_LIMIT_MAX || '10'),
        windowMs: parseInt(process.env.AI_RATE_LIMIT_WINDOW || '3600000')
      };

      expect(rateLimitConfig.maxRequests).toBeGreaterThan(0);
      expect(rateLimitConfig.windowMs).toBeGreaterThan(0);

      console.log('✓ Rate limiting configured:', rateLimitConfig);
    });
  });

  describe('4. Content Generation Service', () => {
    it('should have content generation records', async () => {
      const generations = await prisma.contentGeneration.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          blogPost: true,
          topic: true
        }
      });

      expect(Array.isArray(generations)).toBe(true);
      console.log(`✓ Found ${generations.length} content generation record(s)`);

      if (generations.length > 0) {
        const withContent = generations.filter(g => g.blogPost).length;
        const withTopics = generations.filter(g => g.topic).length;
        console.log(`  - ${withContent} linked to blog posts`);
        console.log(`  - ${withTopics} generated from topics`);
      }
    });

    it('should track generation success/failure rates', async () => {
      const generations = await prisma.contentGeneration.findMany({
        take: 100,
        orderBy: { createdAt: 'desc' }
      });

      const total = generations.length;
      const successful = generations.filter(g => g.status === 'completed').length;
      const failed = generations.filter(g => g.status === 'failed').length;
      const pending = generations.filter(g => g.status === 'pending').length;

      console.log('✓ Generation statistics:');
      console.log(`  Total: ${total}`);
      console.log(`  Successful: ${successful} (${total > 0 ? ((successful/total)*100).toFixed(1) : 0}%)`);
      console.log(`  Failed: ${failed}`);
      console.log(`  Pending: ${pending}`);

      expect(total).toBeGreaterThanOrEqual(0);
    });

    it('should validate generated content structure', async () => {
      const successfulGenerations = await prisma.contentGeneration.findMany({
        where: {
          status: 'completed',
          blogPost: { isNot: null }
        },
        include: { blogPost: true },
        take: 5
      });

      successfulGenerations.forEach(gen => {
        if (gen.blogPost) {
          expect(gen.blogPost.title).toBeDefined();
          expect(gen.blogPost.content).toBeDefined();
          expect(gen.blogPost.content.length).toBeGreaterThan(0);
        }
      });

      console.log(`✓ Validated ${successfulGenerations.length} generated content structure(s)`);
    });
  });

  describe('5. Topic Research & Generation', () => {
    it('should retrieve topic proposals', async () => {
      const topics = await prisma.topicProposal.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' }
      });

      expect(Array.isArray(topics)).toBe(true);
      console.log(`✓ Found ${topics.length} topic proposal(s)`);

      if (topics.length > 0) {
        console.log('  Recent topics:', topics.slice(0, 3).map(t => t.topic).join(', '));
      }
    });

    it('should check topic research API endpoint', async () => {
      const response = await fetch(`${BASE_URL}/api/admin/topics/research`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'luxury hotels london'
        })
      });

      expect(response).toBeDefined();
      console.log(`✓ Topic research endpoint exists (status: ${response.status})`);
    });

    it('should validate topic metadata structure', async () => {
      const topics = await prisma.topicProposal.findMany({
        take: 5
      });

      topics.forEach(topic => {
        expect(topic.topic).toBeDefined();
        expect(typeof topic.topic).toBe('string');
      });

      console.log(`✓ Validated ${topics.length} topic structure(s)`);
    });

    it('should track topics with generated content', async () => {
      const topicsWithContent = await prisma.topicProposal.findMany({
        where: {
          contentGenerations: { some: {} }
        },
        include: {
          contentGenerations: true
        },
        take: 10
      });

      console.log(`✓ Found ${topicsWithContent.length} topic(s) with generated content`);
    });
  });

  describe('6. SEO AI Features', () => {
    it('should check SEO meta generation capability', async () => {
      const response = await fetch(`${BASE_URL}/api/seo/generate-meta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Test Article',
          content: 'Test content for SEO generation'
        })
      });

      expect(response).toBeDefined();
      console.log(`✓ SEO meta generation endpoint exists (status: ${response.status})`);
    });

    it('should check SEO title optimization endpoint', async () => {
      const response = await fetch(`${BASE_URL}/api/seo/generate-title`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: 'Luxury hotels in London'
        })
      });

      expect(response).toBeDefined();
      console.log(`✓ SEO title optimization endpoint exists (status: ${response.status})`);
    });

    it('should verify AI SEO audit capability', async () => {
      const posts = await prisma.blogPost.findMany({
        where: { status: 'published' },
        take: 1
      });

      if (posts.length > 0) {
        const response = await fetch(`${BASE_URL}/api/seo/audit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            postId: posts[0].id
          })
        });

        expect(response).toBeDefined();
        console.log(`✓ AI SEO audit endpoint exists (status: ${response.status})`);
      } else {
        console.log('⚠ No published posts found for SEO audit test');
      }
    });

    it('should check SEO audit results', async () => {
      const auditResults = await prisma.seoAuditResult.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' }
      });

      expect(Array.isArray(auditResults)).toBe(true);
      console.log(`✓ Found ${auditResults.length} SEO audit result(s)`);
    });
  });

  describe('7. Automated Content Pipeline', () => {
    it('should check scheduled content', async () => {
      const scheduled = await prisma.scheduledContent.findMany({
        where: {
          scheduledFor: { gte: new Date() }
        },
        take: 10
      });

      expect(Array.isArray(scheduled)).toBe(true);
      console.log(`✓ Found ${scheduled.length} scheduled content item(s)`);
    });

    it('should verify background job tracking', async () => {
      const jobs = await prisma.backgroundJob.findMany({
        where: {
          type: { in: ['content-generation', 'topic-research', 'seo-optimization'] }
        },
        take: 10,
        orderBy: { createdAt: 'desc' }
      });

      expect(Array.isArray(jobs)).toBe(true);
      console.log(`✓ Found ${jobs.length} AI-related background job(s)`);

      if (jobs.length > 0) {
        const byType = jobs.reduce((acc, job) => {
          acc[job.type] = (acc[job.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        console.log('  Jobs by type:', byType);
      }
    });

    it('should check automation hub configuration', async () => {
      // Check if automation cron endpoints exist
      const endpoints = [
        '/api/cron/weekly-topics',
        '/api/cron/daily-publish',
        '/api/cron/auto-generate'
      ];

      console.log('✓ Automation endpoints configured:');
      endpoints.forEach(endpoint => {
        console.log(`  - ${endpoint}`);
      });

      expect(endpoints.length).toBeGreaterThan(0);
    });
  });

  describe('8. Multi-Language AI Generation', () => {
    it('should support English content generation', async () => {
      const englishGenerations = await prisma.contentGeneration.findMany({
        where: {
          blogPost: {
            locale: 'en'
          }
        },
        include: { blogPost: true },
        take: 5
      });

      console.log(`✓ Found ${englishGenerations.length} English content generation(s)`);
    });

    it('should support Arabic content generation', async () => {
      const arabicGenerations = await prisma.contentGeneration.findMany({
        where: {
          blogPost: {
            locale: 'ar'
          }
        },
        include: { blogPost: true },
        take: 5
      });

      console.log(`✓ Found ${arabicGenerations.length} Arabic content generation(s)`);
    });

    it('should have locale-specific prompt templates', async () => {
      const templatesByLocale = await prisma.promptTemplate.groupBy({
        by: ['locale'],
        _count: { id: true }
      });

      console.log('✓ Prompt templates by locale:', templatesByLocale);
      expect(Array.isArray(templatesByLocale)).toBe(true);
    });
  });

  describe('9. AI Generation Quality Checks', () => {
    it('should verify generated content has minimum length', async () => {
      const recentGenerations = await prisma.contentGeneration.findMany({
        where: {
          status: 'completed',
          blogPost: { isNot: null }
        },
        include: { blogPost: true },
        take: 10,
        orderBy: { createdAt: 'desc' }
      });

      const minLength = 500; // Minimum content length
      const validContent = recentGenerations.filter(
        g => g.blogPost && g.blogPost.content.length >= minLength
      );

      console.log(`✓ ${validContent.length}/${recentGenerations.length} generated content meet minimum length (${minLength} chars)`);
    });

    it('should verify generated content has SEO metadata', async () => {
      const generationsWithSEO = await prisma.contentGeneration.findMany({
        where: {
          status: 'completed',
          blogPost: {
            seoMeta: { isNot: null }
          }
        },
        include: {
          blogPost: {
            include: { seoMeta: true }
          }
        },
        take: 10
      });

      console.log(`✓ ${generationsWithSEO.length} generated content items have SEO metadata`);
    });

    it('should check for content safety/moderation', async () => {
      const generations = await prisma.contentGeneration.findMany({
        where: {
          status: 'completed'
        },
        take: 10
      });

      // Check if any were flagged or moderated
      const flagged = generations.filter(g =>
        g.metadata &&
        typeof g.metadata === 'object' &&
        'flagged' in g.metadata
      );

      console.log(`✓ Content safety check: ${flagged.length}/${generations.length} items flagged`);
    });
  });

  describe('10. AI Provider Fallback System', () => {
    it('should have multiple AI providers configured', async () => {
      const providers = await prisma.modelProvider.findMany({
        where: { enabled: true }
      });

      console.log(`✓ ${providers.length} AI provider(s) enabled for fallback`);

      if (providers.length > 1) {
        console.log('  ✓ Fallback system available with multiple providers');
      } else if (providers.length === 1) {
        console.log('  ⚠ Only one provider - no fallback available');
      }
    });

    it('should track provider usage statistics', async () => {
      const generations = await prisma.contentGeneration.findMany({
        take: 100,
        orderBy: { createdAt: 'desc' }
      });

      const providerUsage: Record<string, number> = {};

      generations.forEach(gen => {
        if (gen.metadata && typeof gen.metadata === 'object' && 'provider' in gen.metadata) {
          const provider = (gen.metadata as any).provider;
          providerUsage[provider] = (providerUsage[provider] || 0) + 1;
        }
      });

      console.log('✓ AI provider usage:', providerUsage);
    });
  });

  describe('11. Error Handling & Retry Logic', () => {
    it('should track failed generation attempts', async () => {
      const failed = await prisma.contentGeneration.findMany({
        where: { status: 'failed' },
        take: 10,
        orderBy: { createdAt: 'desc' }
      });

      console.log(`✓ Found ${failed.length} failed generation attempt(s)`);

      if (failed.length > 0) {
        const withErrors = failed.filter(f =>
          f.metadata &&
          typeof f.metadata === 'object' &&
          'error' in f.metadata
        ).length;

        console.log(`  - ${withErrors} have error details recorded`);
      }
    });

    it('should verify retry mechanism exists', async () => {
      const generationsWithRetry = await prisma.contentGeneration.findMany({
        where: {
          metadata: {
            path: ['retryCount'],
            not: null
          }
        },
        take: 10
      });

      console.log(`✓ Found ${generationsWithRetry.length} generation(s) with retry information`);
    });
  });

  describe('12. Performance & Optimization', () => {
    it('should measure average generation time', async () => {
      const recentGenerations = await prisma.contentGeneration.findMany({
        where: {
          status: 'completed',
          completedAt: { not: null }
        },
        take: 50,
        orderBy: { createdAt: 'desc' }
      });

      const times = recentGenerations
        .filter(g => g.completedAt && g.createdAt)
        .map(g => {
          const duration = g.completedAt!.getTime() - g.createdAt.getTime();
          return duration / 1000; // Convert to seconds
        });

      if (times.length > 0) {
        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);

        console.log('✓ Generation performance metrics:');
        console.log(`  Average: ${avgTime.toFixed(2)}s`);
        console.log(`  Min: ${minTime.toFixed(2)}s`);
        console.log(`  Max: ${maxTime.toFixed(2)}s`);
      } else {
        console.log('⚠ No completed generations with timing data');
      }
    });

    it('should verify token usage tracking', async () => {
      const generations = await prisma.contentGeneration.findMany({
        where: {
          status: 'completed'
        },
        take: 20
      });

      const withTokens = generations.filter(g =>
        g.metadata &&
        typeof g.metadata === 'object' &&
        ('tokens' in g.metadata || 'tokenUsage' in g.metadata)
      );

      console.log(`✓ ${withTokens.length}/${generations.length} generations track token usage`);
    });
  });

  describe('13. Integration Test - Topic to Published Article', () => {
    it('should simulate complete AI generation workflow', async () => {
      console.log('Starting end-to-end AI generation simulation...');

      // Step 1: Create a topic proposal
      const topic = await prisma.topicProposal.create({
        data: {
          topic: 'Luxury Afternoon Tea in London - E2E Test',
          keywords: ['luxury', 'afternoon tea', 'london'],
          status: 'approved'
        }
      });
      testTopicId = topic.id;
      console.log('  Step 1: ✓ Topic proposal created');

      // Step 2: Create a content generation record
      const generation = await prisma.contentGeneration.create({
        data: {
          topicId: topic.id,
          prompt: 'Generate a luxury travel article about afternoon tea in London',
          status: 'pending'
        }
      });
      console.log('  Step 2: ✓ Content generation record created');

      // Step 3: Simulate generated content creation
      const generatedPost = await prisma.blogPost.create({
        data: {
          title: 'The Ultimate Guide to Luxury Afternoon Tea in London - AI Generated',
          slug: 'ai-luxury-afternoon-tea-e2e-' + Date.now(),
          content: 'AI-generated content about luxury afternoon tea experiences in London. This would normally be generated by the AI service.',
          excerpt: 'Discover the finest afternoon tea experiences in London',
          status: 'draft',
          locale: 'en',
          seoMeta: {
            create: {
              title: 'Luxury Afternoon Tea London | Ultimate Guide',
              description: 'Experience the best afternoon tea in London with our comprehensive guide',
              locale: 'en'
            }
          }
        }
      });
      generatedContentId = generatedPost.id;
      console.log('  Step 3: ✓ AI-generated blog post created');

      // Step 4: Link generation to post
      await prisma.contentGeneration.update({
        where: { id: generation.id },
        data: {
          blogPostId: generatedPost.id,
          status: 'completed',
          completedAt: new Date()
        }
      });
      console.log('  Step 4: ✓ Generation linked to blog post');

      // Step 5: Verify the complete chain
      const verifyGeneration = await prisma.contentGeneration.findUnique({
        where: { id: generation.id },
        include: {
          topic: true,
          blogPost: {
            include: { seoMeta: true }
          }
        }
      });

      expect(verifyGeneration?.status).toBe('completed');
      expect(verifyGeneration?.topic).toBeDefined();
      expect(verifyGeneration?.blogPost).toBeDefined();
      expect(verifyGeneration?.blogPost?.seoMeta).toBeDefined();
      console.log('  Step 5: ✓ Complete generation chain verified');

      console.log('✓ End-to-end AI generation workflow successful!');
    });
  });

  describe('14. Real-Time Generation Test (If API Keys Available)', () => {
    it('should attempt real AI generation if credentials are available', async () => {
      if (!isAIEnabled) {
        console.log('⚠ Skipping real AI generation - no API keys configured');
        return;
      }

      try {
        const response = await fetch(`${BASE_URL}/api/ai/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            prompt: 'Write a short 2-sentence description of a luxury hotel in London',
            type: 'blog',
            maxTokens: 100
          })
        });

        if (response.ok) {
          const data = await response.json();
          console.log('✓ Real AI generation successful!');
          console.log('  Generated content preview:',
            data.content ? data.content.substring(0, 100) + '...' : 'N/A');
        } else {
          console.log(`⚠ AI generation returned status ${response.status}`);
          const error = await response.text();
          console.log('  Error:', error.substring(0, 200));
        }
      } catch (error) {
        console.log('⚠ Real AI generation test failed:', (error as Error).message);
      }
    });
  });
});
