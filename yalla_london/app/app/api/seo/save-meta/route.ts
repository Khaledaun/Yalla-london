export const dynamic = 'force-dynamic';
export const revalidate = 0;



import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { seoMetaService } from '@/lib/seo/seo-meta-service';
import { isSEOEnabled } from '@/lib/flags';
import { requireAdmin } from "@/lib/admin-middleware";
import { getBaseUrl } from '@/lib/url-utils';

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    // Check if SEO features are enabled
    if (!isSEOEnabled()) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'SEO features are disabled. Set FEATURE_SEO=1 and NEXT_PUBLIC_FEATURE_SEO=1 to enable.' 
        },
        { status: 403 }
      );
    }

    // Check if user is authenticated (implement your auth logic)
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const seoData = await request.json();

    // Validate required fields
    if (!seoData.title || !seoData.description) {
      return NextResponse.json(
        { success: false, error: 'Title and description are required' },
        { status: 400 }
      );
    }

    // Calculate SEO score
    const seoScore = seoMetaService.calculateSEOScore(seoData);
    seoData.seoScore = seoScore;

    // Save to database
    if (seoData.pageId) {
      await seoMetaService.saveSEOMeta(seoData.pageId, seoData);
    } else {
      throw new Error('Page ID is required to save SEO data');
    }

    console.log('SEO data saved successfully:', {
      pageId: seoData.pageId,
      title: seoData.title,
      seoScore: seoScore
    });

    // Generate XML sitemap entry if needed
    if (seoData.canonical) {
      await updateSitemap(seoData.canonical, seoData);
    }

    // Trigger search console submission if enabled
    if (process.env.GOOGLE_SEARCH_CONSOLE_API_KEY && seoData.canonical) {
      await submitToSearchConsole(seoData.canonical);
    }

    return NextResponse.json({
      success: true,
      message: 'SEO data saved successfully',
      data: {
        savedAt: new Date().toISOString(),
        seoScore: calculateSeoScore(seoData)
      }
    });

  } catch (error) {
    console.error('Error saving SEO data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save SEO data' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    // Check if SEO features are enabled
    if (!isSEOEnabled()) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'SEO features are disabled. Set FEATURE_SEO=1 and NEXT_PUBLIC_FEATURE_SEO=1 to enable.' 
        },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const pageId = searchParams.get('pageId');
    const url = searchParams.get('url');

    if (!pageId && !url) {
      return NextResponse.json(
        { success: false, error: 'pageId or url parameter required' },
        { status: 400 }
      );
    }

    // Get SEO data from database
    let seoData = null;
    
    if (pageId) {
      seoData = await seoMetaService.getSEOMeta(pageId);
    } else if (url) {
      seoData = await seoMetaService.getSEOMetaByURL(url);
    }

    // Return mock data if no SEO data found
    if (!seoData) {
      const siteBaseUrl = await getBaseUrl();
      const mockSeoData = {
        title: 'Sample Page Title - Yalla London',
        description: 'Sample page description that provides valuable information about this page content.',
        canonical: url || `${siteBaseUrl}/page/${pageId}`,
        metaKeywords: 'london, travel, guide',
        ogTitle: 'Sample Page Title',
        ogDescription: 'Sample OG description for social sharing',
        ogImage: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/London_Skyline_%28125508655%29.jpeg/960px-London_Skyline_%28125508655%29.jpeg',
        ogType: 'website',
        twitterTitle: 'Sample Page Title',
        twitterDescription: 'Sample Twitter description',
        twitterImage: 'https://i.ytimg.com/vi/JxsOdnn5Pzw/hq720.jpg?sqp=-oaymwEhCK4FEIIDSFryq4qpAxMIARUAAAAAGAElAADIQj0AgKJD&rs=AOn4CLCkiyRdjacs8ejcYmFqFf96Db2aWA',
        twitterCard: 'summary_large_image',
        robotsMeta: 'index,follow',
        schemaType: 'WebPage',
        hreflangAlternates: {
          en: `${siteBaseUrl}/en/page/${pageId}`,
          ar: `${siteBaseUrl}/ar/page/${pageId}`
        }
      };
      
      return NextResponse.json({
        success: true,
        data: mockSeoData
      });
    }

    return NextResponse.json({
      success: true,
      data: seoData
    });

  } catch (error) {
    console.error('Error fetching SEO data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch SEO data' },
      { status: 500 }
    );
  }
}

// Helper function to calculate SEO score
function calculateSeoScore(seoData: any): number {
  let score = 0;
  
  // Title check (20 points)
  if (seoData.title && seoData.title.length >= 30 && seoData.title.length <= 60) {
    score += 20;
  }
  
  // Description check (20 points)
  if (seoData.description && seoData.description.length >= 120 && seoData.description.length <= 160) {
    score += 20;
  }
  
  // Open Graph check (20 points)
  if (seoData.ogTitle && seoData.ogDescription && seoData.ogImage) {
    score += 20;
  }
  
  // Twitter Card check (15 points)
  if (seoData.twitterTitle && seoData.twitterDescription) {
    score += 15;
  }
  
  // Hreflang check (15 points)
  if (seoData.hreflangAlternates?.en && seoData.hreflangAlternates?.ar) {
    score += 15;
  }
  
  // Structured data check (10 points)
  if (seoData.schemaType && seoData.schemaType !== 'WebPage') {
    score += 10;
  }
  
  return score;
}

// Helper function to update sitemap
async function updateSitemap(url: string, seoData: any) {
  try {
    // TODO: Implement sitemap update logic
    console.log('Updating sitemap with URL:', url);
    
    // This would update your XML sitemap with the new/updated URL
    // You might use a database table to track all URLs and their metadata
    // Then regenerate the sitemap XML files periodically
    
  } catch (error) {
    console.error('Error updating sitemap:', error);
  }
}

// Helper function to submit URL to Google Search Console
async function submitToSearchConsole(url: string) {
  try {
    if (!process.env.GOOGLE_SEARCH_CONSOLE_API_KEY) {
      console.log('Google Search Console API key not configured');
      return;
    }

    // TODO: Implement Google Search Console URL submission
    console.log('Submitting URL to Search Console:', url);
    
    // Example implementation:
    // const response = await fetch('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${process.env.GOOGLE_SEARCH_CONSOLE_API_KEY}`,
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify({
    //     inspectionUrl: url,
    //     siteUrl: process.env.NEXT_PUBLIC_SITE_URL
    //   })
    // });
    
  } catch (error) {
    console.error('Error submitting to Search Console:', error);
  }
}
