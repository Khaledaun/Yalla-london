/**
 * Test Content Generation Workflow
 * Verifies that the complete content creation pipeline works
 */

import { ContentGenerationService } from '@/lib/content-generation-service';

async function testContentWorkflow() {
  console.log('🧪 Testing Content Generation Workflow...\n');

  try {
    // Test 1: Generate content from prompt
    console.log('1️⃣ Testing content generation from prompt...');
    const promptContent = await ContentGenerationService.generateFromPrompt(
      'Best restaurants in London for tourists',
      { type: 'blog_post', language: 'en', category: 'food' }
    );
    
    console.log('✅ Generated content from prompt:');
    console.log(`   Title: ${promptContent.title}`);
    console.log(`   Slug: ${promptContent.slug}`);
    console.log(`   Tags: ${promptContent.tags.join(', ')}\n`);

    // Test 2: Save as blog post
    console.log('2️⃣ Testing blog post creation...');
    const blogPost = await ContentGenerationService.saveAsBlogPost(promptContent, {
      type: 'blog_post',
      language: 'en',
      category: 'food',
      authorId: 'test-user'
    });
    
    console.log('✅ Blog post created:');
    console.log(`   ID: ${blogPost.id}`);
    console.log(`   Title: ${blogPost.title_en}`);
    console.log(`   Published: ${blogPost.published}\n`);

    // Test 3: Test API endpoint
    console.log('3️⃣ Testing API endpoint...');
    const response = await fetch('http://localhost:3000/api/content/auto-generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'blog_post',
        category: 'attractions',
        language: 'en',
        customPrompt: 'Top 10 London attractions for first-time visitors',
        saveAsBlogPost: true
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ API endpoint working:');
      console.log(`   Success: ${result.success}`);
      console.log(`   Message: ${result.message}`);
      if (result.blogPost) {
        console.log(`   Blog Post ID: ${result.blogPost.id}`);
      }
    } else {
      console.log('❌ API endpoint failed:', response.status);
    }

    console.log('\n🎉 Content workflow test completed successfully!');
    console.log('\n📋 What you can do now:');
    console.log('   1. Go to /admin/articles to see your created articles');
    console.log('   2. Go to /admin/topics-pipeline to create articles from topics');
    console.log('   3. Use the ArticleEditor to manually create content');
    console.log('   4. All content will appear on the public website');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Make sure your database is running');
    console.log('   2. Check your environment variables');
    console.log('   3. Verify your API endpoints are working');
  }
}

// Run the test
if (require.main === module) {
  testContentWorkflow();
}

export { testContentWorkflow };

