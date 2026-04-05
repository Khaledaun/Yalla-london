export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-middleware';
import { performanceMonitor, trackApiResponseTime } from '@/lib/performance-monitoring';
import { processPromptSafely, validateLLMOutput } from '@/lib/prompt-safety';

interface AIGenerateRequest {
  prompt: string;
  type?: 'content' | 'topic' | 'seo' | 'summary';
  language?: 'en' | 'ar';
  max_tokens?: number;
  temperature?: number;
  provider?: 'abacus' | 'openai' | 'auto';
}

interface AIGenerateResponse {
  status: 'success' | 'error' | 'streaming';
  content?: string;
  provider_used?: string;
  tokens_used?: number;
  response_time_ms?: number;
  error?: string;
  safety_check?: {
    passed: boolean;
    flags?: string[];
  };
}

// Safety limits for Phase 2
const PHASE2_SAFETY_LIMITS = {
  MAX_TOKENS: parseInt(process.env.PHASE2_MAX_CONTENT_GENERATION || '1000'),
  MAX_REQUESTS_PER_HOUR: 10,
  MANUAL_APPROVAL_REQUIRED: process.env.PHASE2_MANUAL_APPROVAL_REQUIRED === 'true',
  ALLOWED_TYPES: ['content', 'topic', 'seo', 'summary']
};

// Request tracking for rate limiting
const requestTracker = new Map<string, number[]>();

function checkRateLimit(clientId: string): boolean {
  const now = Date.now();
  const hourAgo = now - (60 * 60 * 1000);
  
  if (!requestTracker.has(clientId)) {
    requestTracker.set(clientId, []);
  }
  
  const requests = requestTracker.get(clientId)!;
  // Remove old requests
  const recentRequests = requests.filter(time => time > hourAgo);
  requestTracker.set(clientId, recentRequests);
  
  return recentRequests.length < PHASE2_SAFETY_LIMITS.MAX_REQUESTS_PER_HOUR;
}

function addRequest(clientId: string): void {
  const requests = requestTracker.get(clientId) || [];
  requests.push(Date.now());
  requestTracker.set(clientId, requests);
}

async function callAbacusAI(messages: any[], options: any): Promise<any> {
  const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.ABACUSAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4.1-mini',
      messages,
      max_tokens: Math.min(options.max_tokens, PHASE2_SAFETY_LIMITS.MAX_TOKENS),
      temperature: options.temperature,
      stream: false // Non-streaming for Phase 2 safety
    })
  });
  
  if (!response.ok) {
    throw new Error(`Abacus.AI API error: ${response.status}`);
  }
  
  return response.json();
}

async function callOpenAI(messages: any[], options: any): Promise<any> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: Math.min(options.max_tokens, PHASE2_SAFETY_LIMITS.MAX_TOKENS),
      temperature: options.temperature
    })
  });
  
  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }
  
  return response.json();
}

function performSafetyCheck(prompt: string, content: string): { passed: boolean; flags: string[] } {
  const flags: string[] = [];
  
  // Basic content safety checks
  const prohibitedPatterns = [
    /\b(hack|exploit|vulnerability)\b/i,
    /\b(illegal|fraud|scam)\b/i,
    /\b(violence|harm|dangerous)\b/i
  ];
  
  const textToCheck = `${prompt} ${content}`.toLowerCase();
  
  prohibitedPatterns.forEach((pattern, index) => {
    if (pattern.test(textToCheck)) {
      flags.push(`safety_pattern_${index}`);
    }
  });
  
  // Length check
  if (content.length > 5000) {
    flags.push('content_too_long');
  }
  
  return {
    passed: flags.length === 0,
    flags
  };
}

function createSystemPrompt(type: string, language: string): string {
  const prompts = {
    content: {
      en: "You are a professional content writer for Yalla London, a luxury travel guide. Create high-quality, engaging content about London experiences for affluent travelers. Keep content factual, helpful, and sophisticated.",
      ar: "أنت كاتب محتوى محترف لـ'يالا لندن'، دليل السفر الفاخر. أنشئ محتوى عالي الجودة وجذاب حول تجارب لندن للمسافرين الأثرياء. حافظ على المحتوى واقعياً ومفيداً ومتطوراً."
    },
    topic: {
      en: "You are a travel content strategist for Yalla London. Generate engaging topic ideas for luxury London travel content. Focus on unique experiences, high-end venues, and cultural insights.",
      ar: "أنت استراتيجي محتوى السفر لـ'يالا لندن'. أنشئ أفكار مواضيع جذابة لمحتوى السفر الفاخر في لندن. ركز على التجارب الفريدة والأماكن الراقية والرؤى الثقافية."
    },
    seo: {
      en: "You are an SEO specialist for Yalla London. Create SEO-optimized content that ranks well for luxury London travel keywords while maintaining high quality and readability.",
      ar: "أنت متخصص في تحسين محركات البحث لـ'يالا لندن'. أنشئ محتوى محسن لمحركات البحث يحتل مرتبة جيدة لكلمات السفر الفاخر في لندن مع الحفاظ على الجودة العالية وسهولة القراءة."
    },
    summary: {
      en: "You are a content editor for Yalla London. Create concise, informative summaries that capture the key points while maintaining the luxury travel focus.",
      ar: "أنت محرر محتوى لـ'يالا لندن'. أنشئ ملخصات موجزة ومفيدة تلتقط النقاط الرئيسية مع الحفاظ على التركيز على السفر الفاخر."
    }
  };
  
  return prompts[type as keyof typeof prompts]?.[language as keyof typeof prompts.content] || prompts.content.en;
}

/**
 * POST /api/ai/generate
 * Phase 2 AI content generation endpoint with safety controls
 */
export const POST = withAdminAuth(async (request: NextRequest) => {
  const startTime = Date.now();
  const transaction = performanceMonitor.startTransaction('AI Generate', 'ai.generation');
  
  try {
    // Check if AI features are enabled (accepts '1' or 'true')
    const pipelineFlag = process.env.FEATURE_CONTENT_PIPELINE;
    if (pipelineFlag !== 'true' && pipelineFlag !== '1') {
      return NextResponse.json(
        {
          status: 'error',
          error: 'AI content generation is not enabled. Set FEATURE_CONTENT_PIPELINE=1 to enable.'
        },
        { status: 403 }
      );
    }
    
    const body: AIGenerateRequest = await request.json();
    const { 
      prompt, 
      type = 'content', 
      language = 'en', 
      max_tokens = 500, 
      temperature = 0.7,
      provider = 'auto'
    } = body;
    
    // Validation
    if (!prompt?.trim()) {
      return NextResponse.json(
        { status: 'error', error: 'Prompt is required' },
        { status: 400 }
      );
    }
    
    if (!PHASE2_SAFETY_LIMITS.ALLOWED_TYPES.includes(type)) {
      return NextResponse.json(
        { status: 'error', error: `Type '${type}' not allowed in Phase 2` },
        { status: 400 }
      );
    }
    
    // Rate limiting
    const clientId = request.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(clientId)) {
      return NextResponse.json(
        { 
          status: 'error', 
          error: `Rate limit exceeded. Maximum ${PHASE2_SAFETY_LIMITS.MAX_REQUESTS_PER_HOUR} requests per hour.` 
        },
        { status: 429 }
      );
    }
    
    // SECURITY: Run prompt injection detection & build structured prompt
    const systemPrompt = createSystemPrompt(type, language);
    const safetyResult = processPromptSafely(systemPrompt, prompt, {
      maxInputLength: 4000,
      riskThreshold: 70,
      context: { type, language },
    });

    if (!safetyResult) {
      console.warn('Prompt injection detected:', { clientId, type, language });
      return NextResponse.json(
        {
          status: 'error',
          error: 'Your prompt was flagged by our safety system. Please rephrase your request.',
        },
        { status: 400 },
      );
    }

    const { prompt: structuredPrompt, safety: promptSafety } = safetyResult;

    // Create messages with structured prompt (clear delimiters)
    const messages = [
      { role: 'system', content: structuredPrompt.system },
      { role: 'user', content: structuredPrompt.user }
    ];
    
    const options = {
      max_tokens: Math.min(max_tokens, PHASE2_SAFETY_LIMITS.MAX_TOKENS),
      temperature: Math.max(0.1, Math.min(1.0, temperature))
    };
    
    let result: any;
    let providerUsed = '';
    
    // Try providers based on preference
    try {
      if (provider === 'abacus' || provider === 'auto') {
        result = await callAbacusAI(messages, options);
        providerUsed = 'abacus';
      } else if (provider === 'openai') {
        result = await callOpenAI(messages, options);
        providerUsed = 'openai';
      }
    } catch (error) {
      console.warn(`Primary provider (${provider}) failed:`, error);
      
      // Fallback logic
      if (provider === 'auto' || provider === 'abacus') {
        try {
          result = await callOpenAI(messages, options);
          providerUsed = 'openai-fallback';
        } catch (fallbackError) {
          throw new Error(`Both providers failed. Primary: ${error}. Fallback: ${fallbackError}`);
        }
      } else {
        throw error;
      }
    }
    
    const content = result.choices?.[0]?.message?.content || '';
    const tokensUsed = result.usage?.total_tokens || 0;

    // SECURITY: Validate LLM output for leaked prompts/sensitive data
    const outputValidation = validateLLMOutput(content);
    if (!outputValidation.valid) {
      console.warn('LLM output validation failed:', outputValidation.issues);
      return NextResponse.json(
        {
          status: 'error',
          error: 'Generated content failed output validation',
        },
        { status: 500 },
      );
    }

    // Safety check
    const safetyCheck = performSafetyCheck(prompt, content);
    
    if (!safetyCheck.passed) {
      await performanceMonitor.captureError({
        error: new Error('Content failed safety check'),
        context: { 
          prompt: prompt.substring(0, 100),
          flags: safetyCheck.flags,
          provider: providerUsed
        }
      });
      
      return NextResponse.json(
        { 
          status: 'error', 
          error: 'Generated content failed safety checks',
          safety_check: safetyCheck
        },
        { status: 400 }
      );
    }
    
    // Track request
    addRequest(clientId);
    
    const responseTime = Date.now() - startTime;
    
    // Track performance
    await trackApiResponseTime('/api/ai/generate', responseTime);
    
    // Log successful generation
    performanceMonitor.addBreadcrumb(
      `AI content generated successfully`,
      'ai.generation',
      {
        type,
        language,
        provider: providerUsed,
        tokens: tokensUsed,
        response_time: responseTime
      }
    );
    
    const response: AIGenerateResponse = {
      status: 'success',
      content,
      provider_used: providerUsed,
      tokens_used: tokensUsed,
      response_time_ms: responseTime,
      safety_check: safetyCheck
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    await performanceMonitor.captureError({
      error: error instanceof Error ? error : new Error('Unknown AI generation error'),
      context: {
        endpoint: '/api/ai/generate',
        response_time: responseTime
      }
    });
    
    console.error('AI generation error:', error);
    
    return NextResponse.json(
      {
        status: 'error',
        error: 'AI content generation failed',
        response_time_ms: responseTime
      },
      { status: 500 }
    );
    
  } finally {
    transaction.finish();
  }
});

/**
 * GET /api/ai/generate
 * Get AI generation status and configuration
 */
export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const status = {
      enabled: process.env.FEATURE_CONTENT_PIPELINE === 'true' || process.env.FEATURE_CONTENT_PIPELINE === '1',
      providers: {
        abacus: {
          configured: !!process.env.ABACUSAI_API_KEY,
          endpoint: process.env.ABACUSAI_ENDPOINT || 'https://apps.abacus.ai/v1/chat/completions'
        },
        openai: {
          configured: !!process.env.OPENAI_API_KEY,
          endpoint: 'https://api.openai.com/v1/chat/completions'
        }
      },
      safety_limits: PHASE2_SAFETY_LIMITS,
      supported_types: PHASE2_SAFETY_LIMITS.ALLOWED_TYPES,
      supported_languages: ['en', 'ar']
    };
    
    return NextResponse.json({
      status: 'success',
      configuration: status,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('AI status error:', error);
    return NextResponse.json(
      { status: 'error', error: 'Failed to get AI status' },
      { status: 500 }
    );
  }
});
