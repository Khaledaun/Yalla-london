export const dynamic = 'force-dynamic';
export const revalidate = 0;



import { NextRequest, NextResponse } from 'next/server'
import { isAISEOEnabled } from '@/lib/flags'

export async function POST(request: NextRequest) {
  try {
    // Check if AI SEO features are enabled
    if (!isAISEOEnabled()) {
      return NextResponse.json(
        { 
          error: 'AI SEO features are disabled. Set FEATURE_AI_SEO_AUDIT=1 and ABACUSAI_API_KEY to enable.' 
        },
        { status: 403 }
      );
    }

    const { content, title, language = 'en' } = await request.json()

    if (!content || !title) {
      return NextResponse.json(
        { error: 'Content and title are required' },
        { status: 400 }
      )
    }

    // Generate meta description using AI
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
              ? `You are an SEO expert creating compelling meta descriptions for luxury London travel content. Create descriptions that are:
                - 150-160 characters long
                - Summarize the content effectively
                - Include a call-to-action
                - Appeal to affluent travelers
                - Encourage clicks from search results
                Format: Return only the meta description text, nothing else.`
              : `أنت خبير تحسين محركات البحث تنشئ أوصاف ميتا جذابة لمحتوى السفر الفاخر في لندن. أنشئ أوصاف:
                - طولها 150-160 حرفاً
                - تلخص المحتوى بشكل فعال
                - تتضمن دعوة للعمل
                - تجذب المسافرين الأثرياء
                - تشجع النقر من نتائج البحث
                التنسيق: أرجع نص وصف الميتا فقط، لا شيء آخر.`
          },
          {
            role: "user",
            content: `Create a meta description for this luxury London travel content. Title: "${title}". Content preview: ${content.substring(0, 400)}...`
          }
        ],
        max_tokens: 100,
        temperature: 0.7,
      }),
    })

    const data = await response.json()
    const description = data.choices?.[0]?.message?.content?.trim()

    if (!description) {
      throw new Error('Failed to generate meta description')
    }

    return NextResponse.json({
      success: true,
      description: description
    })

  } catch (error) {
    console.error('Meta description generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate meta description' },
      { status: 500 }
    )
  }
}
