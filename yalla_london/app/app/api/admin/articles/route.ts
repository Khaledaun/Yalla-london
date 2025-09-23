import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const fs = require('fs').promises
    const path = require('path')
    
    const articlesFile = path.join(process.cwd(), 'data', 'articles.json')
    
    let articles = []
    try {
      const data = await fs.readFile(articlesFile, 'utf8')
      articles = JSON.parse(data)
    } catch (error) {
      // File doesn't exist yet
      articles = []
    }
    
    return NextResponse.json({
      success: true,
      count: articles.length,
      articles: articles
    })
    
  } catch (error) {
    console.error('Error reading articles:', error)
    return NextResponse.json(
      { 
        error: 'Failed to read articles',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
