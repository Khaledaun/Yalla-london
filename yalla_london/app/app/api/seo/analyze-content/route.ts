export const dynamic = 'force-dynamic';
export const revalidate = 0;



import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from "@/lib/admin-middleware";

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { content, title, keywords, language } = await request.json()

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }

    // Analyze content
    const analysis = analyzeContent(content, title, keywords || [], language)

    return NextResponse.json({
      success: true,
      analysis
    })

  } catch (error) {
    console.error('Content analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze content' },
      { status: 500 }
    )
  }
}

function analyzeContent(content: string, title: string, keywords: string[], language: 'en' | 'ar') {
  const words = content.split(/\s+/).filter(w => w.length > 0)
  const wordCount = words.length
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0)
  const avgWordsPerSentence = wordCount / sentences.length

  // Calculate readability (simplified Flesch score)
  const readabilityScore = Math.max(0, Math.min(100, 
    206.835 - (1.015 * avgWordsPerSentence) - (84.6 * (countSyllables(content) / wordCount))
  ))

  // Calculate keyword density
  const keywordDensity: { [key: string]: number } = {}
  keywords.forEach(keyword => {
    const regex = new RegExp(keyword.toLowerCase(), 'gi')
    const matches = content.toLowerCase().match(regex) || []
    keywordDensity[keyword] = matches.length / wordCount
  })

  // Extract heading structure
  const headingStructure = extractHeadings(content)

  // Count links
  const internalLinks = (content.match(/href=["'][^"']*yalla-london[^"']*["']/g) || []).length
  const externalLinks = (content.match(/href=["']https?:\/\/[^"']*["']/g) || []).length - internalLinks

  // Generate suggestions
  const suggestions = generateSuggestions({
    wordCount,
    readabilityScore,
    keywordDensity,
    headingStructure,
    internalLinks,
    externalLinks,
    title,
    language
  })

  return {
    readabilityScore: Math.round(readabilityScore),
    keywordDensity,
    wordCount,
    internalLinks,
    externalLinks,
    headingStructure,
    suggestions
  }
}

function countSyllables(text: string): number {
  // Simplified syllable counting
  return text.toLowerCase()
    .replace(/[^a-z]/g, '')
    .replace(/[aeiou]{2,}/g, 'a')
    .replace(/[bcdfghjklmnpqrstvwxyz]{2,}/g, 'b')
    .replace(/[^aeiou]/g, '')
    .length || 1
}

function extractHeadings(content: string) {
  const headingRegex = /<h([1-6])[^>]*>(.*?)<\/h[1-6]>/gi
  const headings = []
  let match

  while ((match = headingRegex.exec(content)) !== null) {
    headings.push({
      level: parseInt(match[1]),
      text: match[2].replace(/<[^>]*>/g, '').trim()
    })
  }

  return headings
}

function generateSuggestions(analysis: any): string[] {
  const suggestions = []

  if (analysis.wordCount < 300) {
    suggestions.push('Content is too short. Aim for at least 300 words for better SEO.')
  }

  if (analysis.readabilityScore < 60) {
    suggestions.push('Content readability is low. Use shorter sentences and simpler words.')
  }

  if (analysis.headingStructure.length === 0) {
    suggestions.push('Add headings (H1, H2, H3) to structure your content better.')
  }

  if (analysis.internalLinks < 2) {
    suggestions.push('Add more internal links to related pages on your site.')
  }

  const totalKeywordDensity = Object.values(analysis.keywordDensity).reduce((sum: number, density: any) => sum + (density || 0), 0) as number
  if (totalKeywordDensity > 0.03) {
    suggestions.push('Keyword density is too high. Reduce keyword repetition to avoid over-optimization.')
  }

  if (totalKeywordDensity < 0.01) {
    suggestions.push('Include your target keywords more naturally throughout the content.')
  }

  if (!analysis.title) {
    suggestions.push('Add an SEO title to improve search visibility.')
  }

  return suggestions
}
