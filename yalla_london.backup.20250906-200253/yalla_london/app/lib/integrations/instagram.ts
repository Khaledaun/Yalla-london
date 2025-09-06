
// Instagram API Integration
export interface InstagramPost {
  id: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_url: string;
  permalink: string;
  caption?: string;
  timestamp: string;
}

export interface InstagramReelScript {
  title: string;
  description: string;
  hashtags: string[];
  hook: string;
  callToAction: string;
  language: 'en' | 'ar';
}

export class InstagramAPI {
  private accessToken: string;
  private businessAccountId: string;

  constructor() {
    this.accessToken = process.env.INSTAGRAM_ACCESS_TOKEN || '';
    this.businessAccountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || '';
  }

  // Get recent posts for website feed
  async getRecentPosts(limit: number = 12): Promise<InstagramPost[]> {
    if (!this.accessToken || !this.businessAccountId) {
      console.warn('Instagram API credentials not configured');
      return [];
    }

    try {
      const response = await fetch(
        `https://graph.instagram.com/${this.businessAccountId}/media?fields=id,media_type,media_url,permalink,caption,timestamp&limit=${limit}&access_token=${this.accessToken}`
      );

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Failed to fetch Instagram posts:', error);
      return [];
    }
  }

  // Generate reel script using AI
  async generateReelScript(
    topic: string,
    language: 'en' | 'ar' = 'en'
  ): Promise<InstagramReelScript | null> {
    try {
      const response = await fetch('/api/generate-reel-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, language }),
      });

      return await response.json();
    } catch (error) {
      console.error('Failed to generate reel script:', error);
      return null;
    }
  }

  // Create media object for posting
  async createMediaObject(
    imageUrl: string,
    caption: string,
    isStory: boolean = false
  ) {
    if (!this.accessToken || !this.businessAccountId) {
      console.warn('Instagram API credentials not configured');
      return null;
    }

    try {
      const endpoint = isStory 
        ? `https://graph.instagram.com/${this.businessAccountId}/media`
        : `https://graph.instagram.com/${this.businessAccountId}/media`;

      const body = new URLSearchParams({
        image_url: imageUrl,
        caption: caption,
        access_token: this.accessToken,
      });

      if (isStory) {
        body.append('media_type', 'STORIES');
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        body: body,
      });

      const data = await response.json();
      return data.id;
    } catch (error) {
      console.error('Failed to create Instagram media object:', error);
      return null;
    }
  }

  // Publish media object
  async publishMedia(creationId: string) {
    if (!this.accessToken || !this.businessAccountId) {
      return null;
    }

    try {
      const response = await fetch(
        `https://graph.instagram.com/${this.businessAccountId}/media_publish`,
        {
          method: 'POST',
          body: new URLSearchParams({
            creation_id: creationId,
            access_token: this.accessToken,
          }),
        }
      );

      return await response.json();
    } catch (error) {
      console.error('Failed to publish Instagram media:', error);
      return null;
    }
  }

  // Get account insights
  async getInsights(metric: string = 'impressions,reach,profile_views') {
    if (!this.accessToken || !this.businessAccountId) {
      return null;
    }

    try {
      const response = await fetch(
        `https://graph.instagram.com/${this.businessAccountId}/insights?metric=${metric}&period=day&access_token=${this.accessToken}`
      );

      return await response.json();
    } catch (error) {
      console.error('Failed to get Instagram insights:', error);
      return null;
    }
  }
}

export const instagram = new InstagramAPI();
