
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Test endpoint for content generation
export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing content generation...');
    
    // Test API key
    const apiKey = process.env.ABACUSAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'ABACUSAI_API_KEY not found'
      });
    }

    console.log('✅ API Key found:', apiKey.substring(0, 8) + '...');

    // Test AI API call
    const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant. Respond with a simple JSON object.'
          },
          {
            role: 'user',
            content: 'Generate a test response with title and content fields in JSON format.'
          }
        ],
        max_tokens: 200,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: `AI API error: ${response.status} ${response.statusText}`
      });
    }

    const result = await response.json();
    console.log('🤖 AI API response:', result);

    return NextResponse.json({
      success: true,
      message: 'Content generation test successful',
      apiKeyPresent: !!apiKey,
      aiResponse: result.choices?.[0]?.message?.content,
      fullResponse: result
    });

  } catch (error) {
    console.error('❌ Content generation test failed:', error);
    return NextResponse.json({
      success: false,
      error: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
}

// Test the auto-generate endpoint
export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Testing auto-generate endpoint...');
    
    const testResponse = await fetch(`${request.url.replace('/test-content-generation', '/content/auto-generate')}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'blog_post',
        category: 'london-guide',
        language: 'en',
        keywords: ['London', 'luxury', 'test'],
        customPrompt: 'Write a short test blog post about luxury London experiences.'
      })
    });

    const result = await testResponse.json();
    
    return NextResponse.json({
      success: testResponse.ok,
      message: 'Auto-generate test completed',
      result: result
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: `Auto-generate test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
}
