import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET - Get specific prompt template
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const prompt = await prisma.apiSettings.findUnique({
      where: { id: params.id }
    })

    if (!prompt || !prompt.key_name.startsWith('prompt_')) {
      return NextResponse.json(
        { success: false, error: 'Prompt not found' },
        { status: 404 }
      )
    }

    const promptData = JSON.parse(prompt.key_value)

    return NextResponse.json({
      success: true,
      data: {
        id: prompt.id,
        ...promptData,
        createdAt: prompt.created_at,
        updatedAt: prompt.updated_at
      }
    })
  } catch (error) {
    console.error('Error fetching prompt:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch prompt',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// PATCH - Update prompt template
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const updates = await request.json()

    // Get current prompt
    const existingPrompt = await prisma.apiSettings.findUnique({
      where: { id: params.id }
    })

    if (!existingPrompt || !existingPrompt.key_name.startsWith('prompt_')) {
      return NextResponse.json(
        { success: false, error: 'Prompt not found' },
        { status: 404 }
      )
    }

    const currentData = JSON.parse(existingPrompt.key_value)

    // Update variables if prompt changed
    const updatedPrompt = { ...currentData, ...updates }
    if (updates.prompt) {
      updatedPrompt.variables = extractVariables(updates.prompt)
    }

    // Increment version if the prompt content changed
    if (updates.prompt && updates.prompt !== currentData.prompt) {
      updatedPrompt.version = (currentData.version || 1) + 1
    }

    updatedPrompt.updatedAt = new Date().toISOString()

    // Save to database
    const saved = await prisma.apiSettings.update({
      where: { id: params.id },
      data: {
        key_value: JSON.stringify(updatedPrompt),
        updated_at: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      data: { ...updatedPrompt, id: saved.id },
      message: 'Prompt template updated successfully'
    })
  } catch (error) {
    console.error('Error updating prompt:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update prompt template',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// DELETE - Delete prompt template
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if prompt exists
    const existingPrompt = await prisma.apiSettings.findUnique({
      where: { id: params.id }
    })

    if (!existingPrompt || !existingPrompt.key_name.startsWith('prompt_')) {
      return NextResponse.json(
        { success: false, error: 'Prompt not found' },
        { status: 404 }
      )
    }

    // Delete the prompt
    await prisma.apiSettings.delete({
      where: { id: params.id }
    })

    return NextResponse.json({
      success: true,
      message: 'Prompt template deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting prompt:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete prompt template',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// PUT - Record prompt usage
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { action } = await request.json()

    if (action === 'use') {
      // Get current prompt
      const existingPrompt = await prisma.apiSettings.findUnique({
        where: { id: params.id }
      })

      if (!existingPrompt || !existingPrompt.key_name.startsWith('prompt_')) {
        return NextResponse.json(
          { success: false, error: 'Prompt not found' },
          { status: 404 }
        )
      }

      const currentData = JSON.parse(existingPrompt.key_value)

      // Update usage stats
      const updatedData = {
        ...currentData,
        usageCount: (currentData.usageCount || 0) + 1,
        lastUsed: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      // Save to database
      await prisma.apiSettings.update({
        where: { id: params.id },
        data: {
          key_value: JSON.stringify(updatedData),
          updated_at: new Date()
        }
      })

      return NextResponse.json({
        success: true,
        data: { ...updatedData, id: existingPrompt.id },
        message: 'Prompt usage recorded'
      })
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error recording prompt usage:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to record prompt usage',
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