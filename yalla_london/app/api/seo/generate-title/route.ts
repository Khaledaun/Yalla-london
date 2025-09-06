
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { content, language = 'en', keywords } = await request.json()

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }

    // Generate SEO title using AI
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
              ? `You are an SEO expert creating compelling titles for luxury London travel content. Create titles that are:
                - 50-60 characters long
                - Include target keywords naturally
                - Appeal to affluent travelers
                - Focus on luxury, exclusivity, and insider knowledge
                - Are click-worthy but not clickbait
                Format: Return only the title text, nothing else.`
              : `أنت خبير تحسين محركات البحث تنشئ عناوين جذابة لمحتوى السفر الفاخر في لندن. أنشئ عناوين:
                - طولها 50-60 حرفاً
                - تتضمن الكلمات المفتاحية المستهدفة بشكل طبيعي
                - تجذب المسافرين الأثرياء
                - تركز على الفخامة والحصرية والمعرفة من الداخل
                - جذابة ولكن ليست مضللة
                التنسيق: أرجع نص العنوان فقط، لا شيء آخر.`
          },
          {
            role: "user",
            content: `Create an SEO title for this content about luxury London experiences. Keywords: ${keywords}. Content preview: ${content.substring(0, 500)}...`
          }
        ],
        max_tokens: 100,
        temperature: 0.7,
      }),
    })

    const data = await response.json()
    const title = data.choices?.[0]?.message?.content?.trim()

    if (!title) {
      throw new Error('Failed to generate title')
    }

    return NextResponse.json({
      success: true,
      title: title
    })

  } catch (error) {
    console.error('Title generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate SEO title' },
      { status: 500 }
    )
  }
}
