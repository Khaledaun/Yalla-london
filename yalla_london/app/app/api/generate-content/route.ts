export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { withRateLimit, RateLimitPresets } from '@/lib/rate-limiting'

interface GenerateContentRequest {
  prompt: string
  type: 'blog_topic' | 'blog_content' | 'recommendation'
  language: 'en' | 'ar'
}

// SECURITY: Allowed content types to prevent injection via type field
const ALLOWED_TYPES = new Set(['blog_topic', 'blog_content', 'recommendation'])

/** SECURITY: Sanitize user prompt to mitigate prompt injection */
function sanitizePrompt(input: string): string {
  // Remove system-level instruction markers that could override prompts
  return input
    .replace(/\[SYSTEM\]/gi, '')
    .replace(/\[INST\]/gi, '')
    .replace(/<\|system\|>/gi, '')
    .replace(/<\|assistant\|>/gi, '')
    .replace(/<\|user\|>/gi, '')
    .replace(/```system/gi, '```')
    .trim()
    .slice(0, 2000) // Limit input length
}

async function generateContentHandler(request: NextRequest) {
  try {
    // SECURITY: Require authentication for content generation (costs money)
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body: GenerateContentRequest = await request.json()
    const { prompt, type, language } = body

    if (!prompt?.trim()) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    // SECURITY: Validate content type
    if (!ALLOWED_TYPES.has(type)) {
      return NextResponse.json(
        { error: 'Invalid content type' },
        { status: 400 }
      )
    }

    // SECURITY: Sanitize prompt input
    const cleanPrompt = sanitizePrompt(prompt)

    // Create system prompts based on content type and language
    let systemPrompt = ''
    
    if (type === 'blog_topic') {
      systemPrompt = language === 'en' 
        ? `You are a luxury travel content creator for "Yalla London", a bilingual London guide targeting affluent Arab tourists and English-speaking travelers. Generate 5-8 engaging blog topic ideas related to luxury London experiences. Focus on: high-end dining, exclusive shopping, cultural experiences, luxury accommodations, and premium entertainment. Each topic should be specific, engaging, and appeal to sophisticated travelers with significant disposable income.

Format as a numbered list with brief descriptions for each topic.`
        : `أنت منشئ محتوى سفر فاخر لـ"يالا لندن"، دليل لندن ثنائي اللغة يستهدف السياح العرب الأثرياء والمسافرين الناطقين بالإنجليزية. قم بإنشاء 5-8 أفكار مواضيع مدونة جذابة متعلقة بتجارب لندن الفاخرة. ركز على: تناول الطعام الراقي، والتسوق الحصري، والتجارب الثقافية، والإقامة الفاخرة، والترفيه المميز. يجب أن يكون كل موضوع محدداً وجذاباً ويجذب المسافرين المتطورين ذوي الدخل المرتفع.

قم بالتنسيق كقائمة مرقمة مع أوصاف موجزة لكل موضوع.`
    } else if (type === 'blog_content') {
      systemPrompt = language === 'en'
        ? `You are a sophisticated travel writer for "Yalla London". Write a detailed, engaging blog post about luxury London experiences. Your writing should be elegant, informative, and appeal to affluent travelers. Include specific venues, insider tips, practical information, and cultural insights. Structure the content with clear headings and maintain a luxurious, authoritative tone throughout.

Word count: 800-1200 words. Include practical details like addresses, price ranges, and booking tips where relevant.`
        : `أنت كاتب سفر متطور لـ"يالا لندن". اكتب مقالة مدونة مفصلة وجذابة حول تجارب لندن الفاخرة. يجب أن تكون كتابتك أنيقة ومفيدة وتجذب المسافرين الأثرياء. اشمل أماكن محددة ونصائح من الداخل ومعلومات عملية ورؤى ثقافية. قم بتنظيم المحتوى بعناوين واضحة وحافظ على نبرة فاخرة وموثوقة في جميع أنحاء النص.

عدد الكلمات: 800-1200 كلمة. اشمل تفاصيل عملية مثل العناوين ونطاقات الأسعار ونصائح الحجز عند الاقتضاء.`
    } else {
      systemPrompt = language === 'en'
        ? `You are a luxury travel consultant for "Yalla London". Generate detailed recommendations for premium London experiences. Include specific venue names, descriptions, unique features, price ranges, contact information, and insider tips. Focus on high-quality establishments that cater to affluent travelers seeking exclusive experiences.

Format each recommendation with: Name, type (hotel/restaurant/attraction), description, key features, price range, and practical tips.`
        : `أنت مستشار سفر فاخر لـ"يالا لندن". قم بإنشاء توصيات مفصلة لتجارب لندن المميزة. اشمل أسماء الأماكن المحددة والأوصاف والميزات الفريدة ونطاقات الأسعار ومعلومات الاتصال والنصائح من الداخل. ركز على المؤسسات عالية الجودة التي تلبي احتياجات المسافرين الأثرياء الباحثين عن التجارب الحصرية.

قم بتنسيق كل توصية مع: الاسم، النوع (فندق/مطعم/معلم)، الوصف، الميزات الرئيسية، نطاق السعر، والنصائح العملية.`
    }

    const messages = [
      {
        role: "system" as const,
        content: systemPrompt
      },
      {
        role: "user" as const,
        content: cleanPrompt
      }
    ]

    // Call the LLM API with streaming
    const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ABACUSAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: messages,
        stream: true,
        max_tokens: 3000,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`)
    }

    // Stream the response back to the client
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader()
        if (!reader) {
          controller.error(new Error('No response body'))
          return
        }

        const decoder = new TextDecoder()
        const encoder = new TextEncoder()
        let buffer = ''

        try {
          let partialRead = ''
          
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            partialRead += decoder.decode(value, { stream: true })
            let lines = partialRead.split('\n')
            partialRead = lines.pop() || ''

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6).trim()
                if (data === '[DONE]') {
                  // Send final content
                  const finalData = JSON.stringify({
                    status: 'completed',
                    content: buffer
                  })
                  controller.enqueue(encoder.encode(`data: ${finalData}\n\n`))
                  controller.close()
                  return
                }

                try {
                  const parsed = JSON.parse(data)
                  const content = parsed.choices?.[0]?.delta?.content || ''
                  
                  if (content) {
                    buffer += content
                    
                    // Send streaming update
                    const streamData = JSON.stringify({
                      status: 'streaming',
                      content: content
                    })
                    controller.enqueue(encoder.encode(`data: ${streamData}\n\n`))
                  }
                } catch (e) {
                  // Skip invalid JSON
                  console.warn('Failed to parse JSON:', data)
                }
              }
            }
          }
        } catch (error) {
          console.error('Stream error:', error)
          const errorData = JSON.stringify({
            status: 'error',
            message: 'Stream processing failed'
          })
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`))
          controller.error(error)
        } finally {
          reader.releaseLock()
        }
      },
    })

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

  } catch (error) {
    console.error('Content generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate content' },
      { status: 500 }
    )
  }
}

// SECURITY: Rate limit content generation — 2 requests per minute per IP (expensive LLM calls)
export const POST = withRateLimit(RateLimitPresets.HEAVY_OPERATIONS, generateContentHandler);
