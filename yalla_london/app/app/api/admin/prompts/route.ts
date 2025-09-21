import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

interface PromptTemplate {
  id?: string
  name: string
  description: string
  category: 'content' | 'seo' | 'social' | 'email' | 'translation'
  language: 'en' | 'ar' | 'both'
  contentType: string[]
  prompt: string
  variables: string[]
  version: number
  isActive: boolean
  usageCount?: number
  lastUsed?: Date
  createdAt?: Date
  updatedAt?: Date
}

// GET - List all prompt templates
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const category = searchParams.get('category')
    const language = searchParams.get('language')
    const search = searchParams.get('search')
    
    const skip = (page - 1) * limit

    // Build where clause
    const whereClause: any = {}
    if (category && category !== 'all') {
      whereClause.OR = [
        { key_name: { contains: `prompt_${category}_` } },
        { key_name: { contains: category } }
      ]
    }
    if (search) {
      whereClause.OR = [
        { key_name: { contains: search, mode: 'insensitive' } },
        { key_value: { contains: search, mode: 'insensitive' } }
      ]
    }

    // Get prompts from ApiSettings table where key_name starts with 'prompt_'
    const prompts = await prisma.apiSettings.findMany({
      where: {
        key_name: { startsWith: 'prompt_' },
        is_active: true,
        ...whereClause
      },
      orderBy: { updated_at: 'desc' },
      skip,
      take: limit
    })

    // Parse and format the prompts
    const formattedPrompts = prompts.map(prompt => {
      try {
        const promptData = JSON.parse(prompt.key_value)
        return {
          id: prompt.id,
          name: promptData.name || prompt.key_name.replace('prompt_', ''),
          description: promptData.description || '',
          category: promptData.category || 'content',
          language: promptData.language || 'en',
          contentType: promptData.contentType || [],
          prompt: promptData.prompt || '',
          variables: promptData.variables || [],
          version: promptData.version || 1,
          isActive: prompt.is_active,
          usageCount: promptData.usageCount || 0,
          lastUsed: promptData.lastUsed ? new Date(promptData.lastUsed) : null,
          createdAt: prompt.created_at,
          updatedAt: prompt.updated_at
        }
      } catch (error) {
        console.error('Error parsing prompt data:', error)
        return null
      }
    }).filter(Boolean)

    // Get total count
    const total = await prisma.apiSettings.count({
      where: {
        key_name: { startsWith: 'prompt_' },
        is_active: true,
        ...whereClause
      }
    })

    return NextResponse.json({
      success: true,
      data: formattedPrompts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    })
  } catch (error) {
    console.error('Error fetching prompts:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch prompts',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// POST - Create new prompt template
export async function POST(request: NextRequest) {
  try {
    const promptData: PromptTemplate = await request.json()
    
    // Validate required fields
    if (!promptData.name || !promptData.prompt) {
      return NextResponse.json(
        { success: false, error: 'Name and prompt are required' },
        { status: 400 }
      )
    }

    // Extract variables from prompt
    const variables = extractVariables(promptData.prompt)

    // Create the prompt data
    const newPrompt = {
      ...promptData,
      variables,
      version: 1,
      isActive: true,
      usageCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // Generate a unique key name
    const keyName = `prompt_${promptData.category}_${promptData.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`

    // Save to database
    const saved = await prisma.apiSettings.create({
      data: {
        key_name: keyName,
        key_value: JSON.stringify(newPrompt),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      data: { ...newPrompt, id: saved.id },
      message: 'Prompt template created successfully'
    })
  } catch (error) {
    console.error('Error creating prompt:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create prompt template',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Helper function to extract variables from prompt
function extractVariables(prompt: string): string[] {
  const matches = prompt.match(/\{\{(\w+)\}\}/g)
  return matches ? [...new Set(matches.map(match => match.slice(2, -2)))] : []
}