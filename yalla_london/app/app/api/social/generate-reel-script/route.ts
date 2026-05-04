export const dynamic = 'force-dynamic';
export const revalidate = 0;



import { NextRequest, NextResponse } from 'next/server'
import { aiLimiter } from '@/lib/rate-limit'
import { getDefaultSiteId, getSiteConfig } from '@/config/sites'

export async function POST(request: NextRequest) {
  const blocked = aiLimiter(request);
  if (blocked) return blocked;

  try {
    const { topic, language = 'en' } = await request.json()

    if (!topic) {
      return NextResponse.json(
        { error: 'Topic is required' },
        { status: 400 }
      )
    }

    // Generate Instagram reel script using OpenAI
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
              ? `You are a luxury travel content creator for Instagram Reels. Create engaging, short-form video scripts about London experiences for affluent travelers. Focus on luxury, exclusivity, and insider knowledge. Format: Hook, Main Content, Call to Action. Include relevant hashtags.`
              : `أنت منشئ محتوى سفر فاخر لمقاطع إنستغرام ريلز. أنشئ سكريبتات فيديو قصيرة وجذابة حول تجارب لندن للمسافرين الأثرياء. ركز على الفخامة والحصرية والمعرفة من الداخل. التنسيق: جاذب، المحتوى الرئيسي، دعوة للعمل. اشمل هاشتاغات ذات صلة.`
          },
          {
            role: "user",
            content: `Create an Instagram Reel script about: ${topic}`
          }
        ],
        max_tokens: 500,
        temperature: 0.8,
      }),
    })

    const data = await response.json()
    const scriptContent = data.choices?.[0]?.message?.content

    if (!scriptContent) {
      throw new Error('Failed to generate script content')
    }

    // Parse the response to extract components
    const lines = scriptContent.split('\n').filter((line: string) => line.trim())
    
    const script = {
      title: `Instagram Reel: ${topic}`,
      hook: lines.find((line: string) => line.toLowerCase().includes('hook')) || lines[0] || '',
      description: scriptContent,
      callToAction: lines.find((line: string) => line.toLowerCase().includes('call to action') || line.toLowerCase().includes('cta')) || `Visit ${getSiteConfig(getDefaultSiteId())?.domain || 'our website'} for more luxury London experiences`,
      hashtags: [
        '#YallaLondon',
        '#LuxuryLondon',
        '#LondonTravel',
        '#LuxuryTravel',
        '#LondonInsider',
        '#DiscoverLondon',
        language === 'en' ? '#LondonExperiences' : '#تجارب_لندن',
        language === 'en' ? '#TravelGuide' : '#دليل_السفر'
      ],
      language
    }

    return NextResponse.json({
      success: true,
      script: script
    })

  } catch (error) {
    console.error('Reel script generation error:', error)
    
    return NextResponse.json(
      { error: 'Failed to generate reel script' },
      { status: 500 }
    )
  }
}
