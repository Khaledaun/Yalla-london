export const dynamic = 'force-dynamic';
export const revalidate = 0;



import { NextRequest, NextResponse } from 'next/server'
import { internalLinking } from '@/lib/seo/internal-linking'
import { requireAdmin } from "@/lib/admin-middleware";

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { content, title, keywords, language = 'en' } = await request.json()

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }

    // Step 1: Auto-add internal links
    const currentUrl = `/blog/${title?.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-')}`
    const linkedContent = internalLinking.autoLinkContent(content, currentUrl, language, 5)

    // Step 2: Improve content structure using AI
    const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ABACUSAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: [
          {
            role: "system",
            content: language === 'en' 
              ? `You are an SEO content optimizer for luxury London travel content. Your task is to:
                - Improve content structure with proper headings (H2, H3)
                - Add transitions between paragraphs
                - Include relevant keywords naturally (target: ${keywords?.join(', ')})
                - Add FAQ section if appropriate
                - Maintain the luxury, insider tone
                - Preserve any existing HTML tags and links
                - Return the improved content with proper HTML formatting`
              : `أنت محسن محتوى SEO لمحتوى السفر الفاخر في لندن. مهمتك:
                - تحسين هيكل المحتوى مع عناوين مناسبة (H2, H3)
                - إضافة انتقالات بين الفقرات
                - تضمين الكلمات المفتاحية ذات الصلة بشكل طبيعي: ${keywords?.join(', ')}
                - إضافة قسم أسئلة شائعة إذا كان مناسباً
                - الحفاظ على طابع الفخامة والخبرة الداخلية
                - الحفاظ على أي علامات HTML وروابط موجودة
                - إرجاع المحتوى المحسن مع تنسيق HTML مناسب`
          },
          {
            role: "user",
            content: `Optimize this luxury London travel content for better SEO and readability:\n\n${linkedContent}`
          }
        ],
        max_tokens: 1500,
        temperature: 0.3,
      }),
    })

    const data = await response.json()
    let optimizedContent = data.choices?.[0]?.message?.content

    if (!optimizedContent) {
      // Fallback: return content with internal links if AI optimization fails
      optimizedContent = linkedContent
    }

    // Step 3: Add structured data hints for AEO
    optimizedContent = addStructuredDataHints(optimizedContent, title, language)

    return NextResponse.json({
      success: true,
      optimizedContent: optimizedContent.trim()
    })

  } catch (error) {
    console.error('Content optimization error:', error)
    return NextResponse.json(
      { error: 'Failed to optimize content' },
      { status: 500 }
    )
  }
}

function addStructuredDataHints(content: string, title: string, language: 'en' | 'ar'): string {
  // Add FAQ schema hints if Q&A patterns are detected
  const faqPattern = /(?:What|How|When|Where|Why|Who)[^?]*\?/gi
  const questions = content.match(faqPattern) || []

  if (questions.length > 0) {
    const faqHint = language === 'en' 
      ? '\n\n<!-- FAQ Schema: This content contains Q&A patterns suitable for FAQ structured data -->'
      : '\n\n<!-- FAQ Schema: يحتوي هذا المحتوى على أنماط أسئلة وأجوبة مناسبة للبيانات المنظمة FAQ -->'
    content += faqHint
  }

  // Add How-To schema hints if step patterns are detected
  const stepPattern = /(?:Step \d|First|Second|Third|Next|Then|Finally|Lastly)/gi
  const steps = content.match(stepPattern) || []

  if (steps.length >= 3) {
    const howToHint = language === 'en'
      ? '\n\n<!-- HowTo Schema: This content contains step-by-step instructions suitable for HowTo structured data -->'
      : '\n\n<!-- HowTo Schema: يحتوي هذا المحتوى على تعليمات خطوة بخطوة مناسبة للبيانات المنظمة HowTo -->'
    content += howToHint
  }

  return content
}
