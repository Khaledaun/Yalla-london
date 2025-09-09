export const dynamic = 'force-dynamic';
export const revalidate = 0;


import { NextRequest, NextResponse } from 'next/server';


// Get embed data for social media URLs
export async function POST(request: NextRequest) {
  try {
    const { url, type } = await request.json();

    if (!url || !type) {
      return NextResponse.json(
        { error: 'URL and type are required' },
        { status: 400 }
      );
    }

    let embedData;

    switch (type) {
      case 'youtube':
        embedData = await getYouTubeData(url);
        break;
      case 'instagram':
        embedData = await getInstagramData(url);
        break;
      case 'tiktok':
        embedData = await getTikTokData(url);
        break;
      case 'facebook':
        embedData = await getFacebookData(url);
        break;
      default:
        embedData = await getGenericOEmbed(url);
    }

    return NextResponse.json({
      success: true,
      data: embedData
    });

  } catch (error) {
    console.error('Embed data fetch failed:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch embed data'
      },
      { status: 500 }
    );
  }
}

async function getYouTubeData(url: string) {
  const videoId = extractYouTubeId(url);
  if (!videoId) throw new Error('Invalid YouTube URL');

  // Use YouTube Data API if available
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (apiKey) {
    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet,statistics,contentDetails&key=${apiKey}`
      );
      
      const data = await response.json();
      const video = data.items?.[0];
      
      if (video) {
        return {
          title: video.snippet.title,
          description: video.snippet.description,
          thumbnail: video.snippet.thumbnails.maxres?.url || video.snippet.thumbnails.high.url,
          author: video.snippet.channelTitle,
          duration: formatYouTubeDuration(video.contentDetails.duration),
          views: formatNumber(video.statistics.viewCount),
          publishedAt: video.snippet.publishedAt
        };
      }
    } catch (error) {
      console.warn('YouTube API failed, using fallback');
    }
  }

  // Fallback to oEmbed
  return await getOEmbedData(url, 'https://www.youtube.com/oembed');
}

async function getInstagramData(url: string) {
  // Instagram Basic Display API would be used here if available
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  
  if (accessToken) {
    try {
      // Extract Instagram post ID from URL
      const postId = extractInstagramId(url);
      if (postId) {
        const response = await fetch(
          `https://graph.instagram.com/${postId}?fields=id,caption,media_type,media_url,thumbnail_url,timestamp,permalink&access_token=${accessToken}`
        );
        
        const data = await response.json();
        
        return {
          title: data.caption?.substring(0, 100) + '...' || 'Instagram Post',
          description: data.caption,
          thumbnail: data.thumbnail_url || data.media_url,
          author: 'Instagram User',
          mediaType: data.media_type,
          publishedAt: data.timestamp
        };
      }
    } catch (error) {
      console.warn('Instagram API failed, using fallback');
    }
  }

  // Fallback to oEmbed
  return await getOEmbedData(url, 'https://api.instagram.com/oembed');
}

async function getTikTokData(url: string) {
  try {
    // TikTok oEmbed endpoint
    return await getOEmbedData(url, 'https://www.tiktok.com/oembed');
  } catch (error) {
    // Fallback data
    return {
      title: 'TikTok Video',
      description: 'TikTok video content',
      thumbnail: '/placeholder-tiktok.jpg',
      author: 'TikTok User'
    };
  }
}

async function getFacebookData(url: string) {
  const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
  
  if (accessToken) {
    try {
      // Facebook Graph API would be used here
      const response = await fetch(
        `https://graph.facebook.com/v18.0/oembed_video?url=${encodeURIComponent(url)}&access_token=${accessToken}`
      );
      
      const data = await response.json();
      return {
        title: data.title || 'Facebook Video',
        description: '',
        thumbnail: data.thumbnail_url,
        author: data.author_name
      };
    } catch (error) {
      console.warn('Facebook API failed');
    }
  }

  return {
    title: 'Facebook Video',
    description: 'Facebook video content',
    thumbnail: '/placeholder-facebook.jpg',
    author: 'Facebook User'
  };
}

async function getGenericOEmbed(url: string) {
  // Try common oEmbed providers
  const providers = [
    'https://oembed.com/providers.json'
  ];

  for (const provider of providers) {
    try {
      return await getOEmbedData(url, provider);
    } catch (error) {
      continue;
    }
  }

  throw new Error('No oEmbed provider found for this URL');
}

async function getOEmbedData(url: string, oembedUrl: string) {
  const response = await fetch(`${oembedUrl}?url=${encodeURIComponent(url)}&format=json`);
  
  if (!response.ok) {
    throw new Error(`oEmbed request failed: ${response.status}`);
  }
  
  const data = await response.json();
  
  return {
    title: data.title || 'Media Content',
    description: data.description || '',
    thumbnail: data.thumbnail_url || '',
    author: data.author_name || data.provider_name || '',
    width: data.width,
    height: data.height,
    html: data.html
  };
}

// Utility functions
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([^&\n?#]+)/,
    /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([^&\n?#]+)/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([^&\n?#]+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

function extractInstagramId(url: string): string | null {
  const pattern = /(?:https?:\/\/)?(?:www\.)?instagram\.com\/p\/([^\/\n?#]+)/;
  const match = url.match(pattern);
  return match ? match[1] : null;
}

function formatYouTubeDuration(duration: string): string {
  // Convert PT4M13S to 4:13
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return '';
  
  const hours = match[1] ? parseInt(match[1]) : 0;
  const minutes = match[2] ? parseInt(match[2]) : 0;
  const seconds = match[3] ? parseInt(match[3]) : 0;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}

function formatNumber(num: string | number): string {
  const n = typeof num === 'string' ? parseInt(num) : num;
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}
