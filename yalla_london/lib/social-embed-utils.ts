export interface EmbedInfo {
  platform: string
  embedId: string
  aspectRatio: string
  thumbnailUrl?: string
}

export function extractEmbedInfo(url: string): EmbedInfo | null {
  // Instagram
  const instagramMatch = url.match(/instagram\.com\/p\/([A-Za-z0-9_-]+)/)
  if (instagramMatch) {
    return {
      platform: 'instagram',
      embedId: instagramMatch[1],
      aspectRatio: '1:1',
      thumbnailUrl: `https://instagram.com/p/${instagramMatch[1]}/media/?size=m`
    }
  }

  // TikTok
  const tiktokMatch = url.match(/tiktok\.com\/.*\/video\/(\d+)/)
  if (tiktokMatch) {
    return {
      platform: 'tiktok',
      embedId: tiktokMatch[1],
      aspectRatio: '9:16'
    }
  }

  // YouTube
  const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]+)/)
  if (youtubeMatch) {
    return {
      platform: 'youtube',
      embedId: youtubeMatch[1],
      aspectRatio: '16:9',
      thumbnailUrl: `https://img.youtube.com/vi/${youtubeMatch[1]}/maxresdefault.jpg`
    }
  }

  // Facebook
  const facebookMatch = url.match(/facebook\.com\/.*\/videos\/(\d+)/)
  if (facebookMatch) {
    return {
      platform: 'facebook',
      embedId: facebookMatch[1],
      aspectRatio: '16:9'
    }
  }

  return null
}

export function generateEmbedCode(platform: string, embedId: string): string {
  switch (platform) {
    case 'instagram':
      return `<blockquote class="instagram-media" data-instgrm-permalink="https://www.instagram.com/p/${embedId}/" data-instgrm-version="14"></blockquote>`
    
    case 'tiktok':
      return `<blockquote class="tiktok-embed" cite="https://www.tiktok.com/@user/video/${embedId}" data-video-id="${embedId}"></blockquote>`
    
    case 'youtube':
      return `<iframe width="560" height="315" src="https://www.youtube.com/embed/${embedId}" frameborder="0" allowfullscreen></iframe>`
    
    case 'facebook':
      return `<div class="fb-video" data-href="https://www.facebook.com/video.php?v=${embedId}"></div>`
    
    default:
      return ''
  }
}

export function trackEmbedEvent(platform: string, action: string, embedId: string) {
  // GA4 Event tracking
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', action, {
      event_category: 'social_embed',
      event_label: `${platform}:${embedId}`,
      custom_parameter_1: platform
    })
  }
}
